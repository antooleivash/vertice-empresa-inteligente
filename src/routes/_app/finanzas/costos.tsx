import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado, Liquidacion } from "@/lib/domain";
import { formatCLP } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/_app/finanzas/costos")({ component: CostosPage });

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function CostosPage() {
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("empleados").select("*"),
      supabase.from("liquidaciones").select("*"),
    ]).then(([{ data: e }, { data: l }]) => {
      setEmps((e as Empleado[]) ?? []);
      setLiqs((l as Liquidacion[]) ?? []);
    });
  }, []);

  const periodo = new Date().toISOString().slice(0, 7);
  const empMap = useMemo(() => new Map(emps.map((e) => [e.id, e])), [emps]);

  const porArea = useMemo(() => {
    const m = new Map<string, number>();
    liqs.filter((l) => l.periodo === periodo).forEach((l) => {
      const a = empMap.get(l.empleado_id)?.area ?? "Sin área";
      m.set(a, (m.get(a) ?? 0) + Number(l.liquido || 0));
    });
    return Array.from(m, ([area, total]) => ({ area, total })).sort((a, b) => b.total - a.total);
  }, [liqs, empMap, periodo]);

  const total = porArea.reduce((s, r) => s + r.total, 0);

  return (
    <PageShell>
      <PageHeader title="Costos por área" description="Distribución del costo de remuneraciones del mes en curso." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Total mes</div><div className="text-2xl font-semibold">{formatCLP(total)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Áreas con gasto</div><div className="text-2xl font-semibold">{porArea.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Mayor área</div><div className="text-2xl font-semibold truncate">{porArea[0]?.area ?? "—"}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold mb-4">Costo por área</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="area" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCLP(v)} />
                <Bar dataKey="total" name="Costo" radius={[6, 6, 0, 0]}>
                  {porArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Distribución</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porArea} dataKey="total" nameKey="area" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {porArea.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
