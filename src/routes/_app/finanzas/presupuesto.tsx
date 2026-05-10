import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado, Liquidacion } from "@/lib/domain";
import { AREAS, formatCLP } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_app/finanzas/presupuesto")({ component: PresupuestoPage });

// Presupuesto mensual referencial por área (Fase 2 — editable en Fase 3)
const PRESUPUESTO_AREA: Record<string, number> = {
  Operaciones: 45_000_000,
  Producción: 38_000_000,
  Logística: 22_000_000,
  Administración: 18_000_000,
  Finanzas: 14_000_000,
  RRHH: 12_000_000,
  Mantenimiento: 16_000_000,
  Comercial: 20_000_000,
};

function PresupuestoPage() {
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

  const data = useMemo(() => {
    const realPorArea = new Map<string, number>();
    liqs.filter((l) => l.periodo === periodo).forEach((l) => {
      const a = empMap.get(l.empleado_id)?.area ?? "Sin área";
      realPorArea.set(a, (realPorArea.get(a) ?? 0) + Number(l.liquido || 0));
    });
    return AREAS.map((area) => {
      const real = realPorArea.get(area) ?? 0;
      const presupuesto = PRESUPUESTO_AREA[area] ?? 0;
      const desv = presupuesto > 0 ? ((real - presupuesto) / presupuesto) * 100 : 0;
      return { area, presupuesto, real, desviacion: desv };
    });
  }, [liqs, empMap, periodo]);

  const totalP = data.reduce((s, r) => s + r.presupuesto, 0);
  const totalR = data.reduce((s, r) => s + r.real, 0);
  const desvTotal = totalP > 0 ? ((totalR - totalP) / totalP) * 100 : 0;

  return (
    <PageShell>
      <PageHeader title="Presupuesto vs real" description="Comparativo del presupuesto mensual versus el ejecutado." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Presupuesto total</div><div className="text-2xl font-semibold">{formatCLP(totalP)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Ejecutado</div><div className="text-2xl font-semibold">{formatCLP(totalR)}</div></Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Desviación</div>
          <div className={`text-2xl font-semibold flex items-center gap-2 ${desvTotal > 0 ? "text-destructive" : "text-success"}`}>
            {desvTotal > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {desvTotal.toFixed(1)}%
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Comparativo por área</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="area" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => formatCLP(v)} />
              <Legend />
              <Bar dataKey="presupuesto" name="Presupuesto" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="real" name="Real" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Detalle por área</h3>
        <div className="space-y-4">
          {data.map((r) => {
            const pct = r.presupuesto > 0 ? Math.min(100, (r.real / r.presupuesto) * 100) : 0;
            const sobre = r.real > r.presupuesto;
            return (
              <div key={r.area}>
                <div className="flex justify-between items-center mb-1.5 text-sm">
                  <span className="font-medium">{r.area}</span>
                  <span className="text-muted-foreground">
                    {formatCLP(r.real)} / {formatCLP(r.presupuesto)}{" "}
                    <span className={sobre ? "text-destructive font-medium" : "text-success font-medium"}>
                      ({r.desviacion >= 0 ? "+" : ""}{r.desviacion.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <Progress value={pct} className={sobre ? "[&>div]:bg-destructive" : ""} />
              </div>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
}
