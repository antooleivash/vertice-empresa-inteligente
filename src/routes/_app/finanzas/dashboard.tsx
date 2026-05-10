import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCLP } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_app/finanzas/dashboard")({ component: FinDashboard });

type Fijo = { id: string; monto: number; activo: boolean; created_at?: string };
type Variable = { mes: string; monto: number };
type Gasto = { mes: string; monto: number };
type Ingreso = { mes: string; monto: number };

function FinDashboard() {
  const [fijos, setFijos] = useState<Fijo[]>([]);
  const [vars, setVars] = useState<Variable[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("costos_fijos").select("*"),
      supabase.from("costos_variables").select("mes,monto"),
      supabase.from("gastos").select("mes,monto"),
      supabase.from("ingresos").select("mes,monto"),
    ]).then(([f, v, g, i]) => {
      setFijos((f.data as Fijo[]) ?? []);
      setVars((v.data as Variable[]) ?? []);
      setGastos((g.data as Gasto[]) ?? []);
      setIngresos((i.data as Ingreso[]) ?? []);
    });
  }, []);

  const periodo = new Date().toISOString().slice(0, 7);
  const fijoMensual = fijos.filter((f) => f.activo).reduce((s, f) => s + f.monto, 0);

  const costosMes = fijoMensual + vars.filter((v) => v.mes === periodo).reduce((s, v) => s + v.monto, 0);
  const gastosMes = gastos.filter((g) => g.mes === periodo).reduce((s, g) => s + g.monto, 0);
  const ingresosMes = ingresos.filter((i) => i.mes === periodo).reduce((s, i) => s + i.monto, 0);
  const utilidad = ingresosMes - costosMes - gastosMes;

  // últimos 6 meses
  const evolucion = useMemo(() => {
    const out: { mes: string; ingresos: number; costos: number; gastos: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = d.toISOString().slice(0, 7);
      const cVar = vars.filter((v) => v.mes === p).reduce((s, v) => s + v.monto, 0);
      const cFij = fijos.filter((f) => f.activo && (!f.created_at || f.created_at.slice(0, 7) <= p)).reduce((s, f) => s + f.monto, 0);
      out.push({
        mes: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
        ingresos: ingresos.filter((x) => x.mes === p).reduce((s, x) => s + x.monto, 0),
        costos: cFij + cVar,
        gastos: gastos.filter((x) => x.mes === p).reduce((s, x) => s + x.monto, 0),
      });
    }
    return out;
  }, [fijos, vars, gastos, ingresos]);

  const distribucion = [
    { name: "Costos fijos", value: fijoMensual },
    { name: "Costos variables", value: vars.filter((v) => v.mes === periodo).reduce((s, v) => s + v.monto, 0) },
  ];
  const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)"];

  return (
    <PageShell>
      <PageHeader title="Dashboard financiero" description="Visión consolidada de ingresos, costos, gastos y utilidad del mes." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Ingresos mes" value={formatCLP(ingresosMes)} icon={<TrendingUp className="h-4 w-4" />} tone="success" />
        <KpiCard title="Costos mes" value={formatCLP(costosMes)} icon={<TrendingDown className="h-4 w-4" />} tone="destructive" />
        <KpiCard title="Gastos mes" value={formatCLP(gastosMes)} icon={<Wallet className="h-4 w-4" />} tone="warning" />
        <KpiCard
          title="Utilidad neta"
          value={formatCLP(utilidad)}
          icon={<BarChart3 className="h-4 w-4" />}
          tone={utilidad >= 0 ? "success" : "destructive"}
          subtitle={ingresosMes > 0 ? `Margen ${Math.round((utilidad / ingresosMes) * 100)}%` : "Sin ingresos"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-1">Evolución mensual</h3>
          <p className="text-xs text-muted-foreground mb-4">Ingresos, costos y gastos de los últimos 6 meses.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCLP(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="costos" name="Costos" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Costos fijos vs variables</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribución del mes en curso.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribucion} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {distribucion.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCLP(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function KpiCard({
  title, value, icon, tone, subtitle,
}: {
  title: string; value: string; icon: React.ReactNode;
  tone: "success" | "destructive" | "warning"; subtitle?: string;
}) {
  const toneBg = {
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneBg}`}>{icon}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </Card>
  );
}
