import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Liquidacion } from "@/lib/domain";
import { formatCLP } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Legend } from "recharts";

export const Route = createFileRoute("/_app/ia/predicciones")({ component: PrediccionesPage });

function PrediccionesPage() {
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);
  useEffect(() => {
    supabase.from("liquidaciones").select("*").then(({ data }) => setLiqs((data as Liquidacion[]) ?? []));
  }, []);

  const serie = useMemo(() => {
    const out: { periodo: string; real: number | null; proyeccion: number | null }[] = [];
    const now = new Date();
    const reales: { p: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = d.toISOString().slice(0, 7);
      const total = liqs.filter((l) => l.periodo === p).reduce((s, l) => s + Number(l.liquido || 0), 0);
      reales.push({ p, total });
      out.push({
        periodo: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
        real: total, proyeccion: null,
      });
    }

    // Tendencia lineal simple (regresión sobre los últimos 6 meses con datos > 0)
    const validos = reales.filter((r) => r.total > 0).map((r, i) => ({ x: i, y: r.total }));
    let slope = 0, intercept = reales[reales.length - 1]?.total ?? 0;
    if (validos.length >= 2) {
      const n = validos.length;
      const sumX = validos.reduce((s, v) => s + v.x, 0);
      const sumY = validos.reduce((s, v) => s + v.y, 0);
      const sumXY = validos.reduce((s, v) => s + v.x * v.y, 0);
      const sumX2 = validos.reduce((s, v) => s + v.x * v.x, 0);
      slope = (n * sumXY - sumX * sumY) / Math.max(1, n * sumX2 - sumX * sumX);
      intercept = (sumY - slope * sumX) / n;
    }
    const lastIdx = validos.length ? validos[validos.length - 1].x : 0;
    // último punto real también funciona como inicio de proyección
    if (out.length) out[out.length - 1].proyeccion = out[out.length - 1].real;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const proy = Math.max(0, intercept + slope * (lastIdx + i));
      out.push({
        periodo: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
        real: null, proyeccion: Math.round(proy),
      });
    }
    return out;
  }, [liqs]);

  const ultimoReal = serie.filter((s) => s.real != null).at(-1)?.real ?? 0;
  const proyMaxima = Math.max(...serie.filter((s) => s.proyeccion != null).map((s) => s.proyeccion ?? 0));
  const variacionEsperada = ultimoReal > 0 ? ((proyMaxima - ultimoReal) / ultimoReal) * 100 : 0;

  return (
    <PageShell>
      <PageHeader title="Predicciones IA" description="Proyecciones a 3 meses basadas en tendencias de los datos reales." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiInsight icon={<Sparkles className="h-4 w-4" />} label="Costo proyectado a 3 meses" value={formatCLP(proyMaxima)} tone="primary" />
        <KpiInsight icon={<TrendingUp className="h-4 w-4" />} label="Variación esperada" value={`${variacionEsperada >= 0 ? "+" : ""}${variacionEsperada.toFixed(1)}%`} tone={variacionEsperada > 5 ? "destructive" : "info"} />
        <KpiInsight icon={<AlertTriangle className="h-4 w-4" />} label="Alerta presupuestaria" value={variacionEsperada > 10 ? "Atención" : "Estable"} tone={variacionEsperada > 10 ? "warning" : "success"} />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">Proyección de costo RRHH</h3>
        <p className="text-xs text-muted-foreground mb-4">Tendencia lineal sobre los últimos 6 meses, proyectada a 3 meses.</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="periodo" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatCLP(v)} />
              <Legend />
              <ReferenceLine x={serie.find((s) => s.proyeccion != null && s.real != null)?.periodo} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" label={{ value: "Hoy", position: "top", fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <Line type="monotone" dataKey="real" name="Real" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="proyeccion" name="Proyección IA" stroke="var(--color-chart-3)" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </PageShell>
  );
}

function KpiInsight({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "info" | "warning" | "destructive" | "success" }) {
  const cls = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${cls}`}>{icon}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </Card>
  );
}
