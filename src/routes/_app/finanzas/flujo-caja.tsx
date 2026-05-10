import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Liquidacion } from "@/lib/domain";
import { formatCLP } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_app/finanzas/flujo-caja")({ component: FlujoCajaPage });

// Ingresos simulados estables por mes (Fase 2 — datos reales en Fase 3)
const INGRESO_BASE_MENSUAL = 280_000_000;
const VARIACION = [1.0, 1.05, 0.97, 1.10, 1.08, 1.12];

function FlujoCajaPage() {
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);
  useEffect(() => {
    supabase.from("liquidaciones").select("*").then(({ data }) => setLiqs((data as Liquidacion[]) ?? []));
  }, []);

  const data = useMemo(() => {
    const out: { periodo: string; ingresos: number; egresos: number; neto: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = d.toISOString().slice(0, 7);
      const egresosRRHH = liqs.filter((l) => l.periodo === p).reduce((s, l) => s + Number(l.liquido || 0), 0);
      // Asumimos egresos totales = RRHH * 2.4 (operacionales + insumos), si no hay datos usamos un baseline
      const egresos = egresosRRHH > 0 ? egresosRRHH * 2.4 : INGRESO_BASE_MENSUAL * 0.78;
      const ingresos = INGRESO_BASE_MENSUAL * (VARIACION[5 - i] ?? 1);
      out.push({
        periodo: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
        ingresos: Math.round(ingresos),
        egresos: Math.round(egresos),
        neto: Math.round(ingresos - egresos),
      });
    }
    return out;
  }, [liqs]);

  const totIng = data.reduce((s, r) => s + r.ingresos, 0);
  const totEgr = data.reduce((s, r) => s + r.egresos, 0);

  return (
    <PageShell>
      <PageHeader title="Flujo de caja" description="Ingresos, egresos y resultado neto últimos 6 meses." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Ingresos 6m</div><div className="text-2xl font-semibold text-success">{formatCLP(totIng)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Egresos 6m</div><div className="text-2xl font-semibold text-destructive">{formatCLP(totEgr)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Resultado neto</div><div className="text-2xl font-semibold">{formatCLP(totIng - totEgr)}</div></Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Evolución mensual</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEgr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="periodo" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => formatCLP(v)} />
              <Legend />
              <Area type="monotone" dataKey="ingresos" stroke="var(--color-success)" fill="url(#gIng)" strokeWidth={2} />
              <Area type="monotone" dataKey="egresos" stroke="var(--color-destructive)" fill="url(#gEgr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Los ingresos son simulados (módulo de Facturación llega en Fase 3). Los egresos consideran las liquidaciones reales × factor operacional 2.4.
        </p>
      </Card>
    </PageShell>
  );
}
