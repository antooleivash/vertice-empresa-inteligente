import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/_app/operaciones/productividad")({ component: ProductividadPage });

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function ProductividadPage() {
  const [emps, setEmps] = useState<Empleado[]>([]);
  useEffect(() => { supabase.from("empleados").select("*").eq("activo", true).then(({ data }) => setEmps((data as Empleado[]) ?? [])); }, []);

  const porArea = useMemo(() => {
    const m = new Map<string, { area: string; productividad: number; meta: number; n: number }>();
    emps.forEach((e) => {
      const r = m.get(e.area) ?? { area: e.area, productividad: 0, meta: 0, n: 0 };
      r.productividad += 70 + (hash(e.id + "p") % 30);
      r.meta += 85; r.n += 1; m.set(e.area, r);
    });
    return Array.from(m.values()).map((r) => ({ ...r, productividad: Math.round(r.productividad / r.n), meta: Math.round(r.meta / r.n) }));
  }, [emps]);

  const evolucion = useMemo(() => {
    const meses = ["Dic", "Ene", "Feb", "Mar", "Abr", "May"];
    const base = 78 + (emps.length % 5);
    return meses.map((m, i) => ({ mes: m, productividad: base + i * 1.5 + (i % 2 ? -1 : 1), meta: 85 }));
  }, [emps]);

  const promedio = porArea.length ? Math.round(porArea.reduce((s, r) => s + r.productividad, 0) / porArea.length) : 0;
  const cumplen = porArea.filter((r) => r.productividad >= r.meta).length;

  return (
    <PageShell>
      <PageHeader title="Productividad operacional" description="Indicadores de rendimiento por área frente a meta corporativa." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Productividad global</div><div className="text-2xl font-semibold mt-1">{promedio}%</div><Progress value={promedio} className="mt-3" /></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Áreas que cumplen meta</div><div className="text-2xl font-semibold mt-1">{cumplen} / {porArea.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Meta corporativa</div><div className="text-2xl font-semibold mt-1">85%</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="text-sm font-medium mb-3">Productividad por área</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porArea}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="area" /><YAxis domain={[0, 100]} /><Tooltip /><Legend />
              <Bar dataKey="productividad" fill="var(--color-chart-1)" /><Bar dataKey="meta" fill="var(--color-chart-3)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium mb-3">Evolución últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolucion}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="mes" /><YAxis domain={[60, 100]} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="productividad" stroke="var(--color-chart-1)" strokeWidth={2} /><Line type="monotone" dataKey="meta" stroke="var(--color-chart-3)" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-sm font-medium mb-3">Detalle por área</div>
        <div className="space-y-3">
          {porArea.map((r) => (
            <div key={r.area} className="flex items-center gap-3">
              <div className="w-40 text-sm">{r.area}</div>
              <Progress value={r.productividad} className="flex-1" />
              <div className="w-16 text-right text-sm font-medium">{r.productividad}%</div>
              <Badge variant={r.productividad >= r.meta ? "default" : "destructive"}>{r.productividad >= r.meta ? "OK" : "Bajo meta"}</Badge>
            </div>
          ))}
          {porArea.length === 0 && <div className="text-center text-muted-foreground py-6 text-sm">Sin empleados activos</div>}
        </div>
      </Card>
    </PageShell>
  );
}
