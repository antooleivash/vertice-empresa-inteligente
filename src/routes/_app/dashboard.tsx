import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado, Asistencia, Liquidacion, HoraExtra } from "@/lib/domain";
import { formatCLP } from "@/lib/domain";
import { detectarAlertas, alertaTone, type AlertaIA } from "@/lib/ia-engine";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QRMarcar } from "@/components/qr-marcar";
import { IndicadoresBar } from "@/components/indicadores-bar";
import { Users, Clock, AlertTriangle, Wallet } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

type KPIKey = "empleados" | "asistencia" | "alertas" | "costo";

function Dashboard() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [asistenciaHoy, setAsistenciaHoy] = useState<Asistencia[]>([]);
  const [, setHorasExtras] = useState<HoraExtra[]>([]);
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);
  const [alertas, setAlertas] = useState<AlertaIA[]>([]);
  const [open, setOpen] = useState<KPIKey | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const [{ data: e }, { data: a }, { data: h }, { data: l }, alerts] = await Promise.all([
        supabase.from("empleados").select("*"),
        supabase.from("asistencia").select("*").eq("fecha", today),
        supabase.from("horas_extras").select("*"),
        supabase.from("liquidaciones").select("*"),
        detectarAlertas(),
      ]);
      setEmpleados((e as Empleado[]) ?? []);
      setAsistenciaHoy((a as Asistencia[]) ?? []);
      setHorasExtras((h as HoraExtra[]) ?? []);
      setLiqs((l as Liquidacion[]) ?? []);
      setAlertas(alerts);
    })();
  }, []);

  const empleadosActivos = empleados.filter((e) => e.activo);
  const presentes = asistenciaHoy.filter((a) => a.estado === "presente").length;
  const ausentes = asistenciaHoy.filter((a) => a.estado === "ausente");
  const atrasos = asistenciaHoy.filter((a) => a.estado === "atraso");
  const totalRef = empleadosActivos.length || 1;
  const pctAsistencia = Math.round((presentes / totalRef) * 100);

  const empMap = useMemo(() => {
    const m = new Map<string, Empleado>();
    empleados.forEach((e) => m.set(e.id, e));
    return m;
  }, [empleados]);

  const alertasCriticas = alertas.filter((a) => a.severidad === "critica").length;

  // Costo RRHH del mes actual
  const periodoActual = new Date().toISOString().slice(0, 7);
  const liqsMes = liqs.filter((l) => l.periodo === periodoActual);
  const costoMes = liqsMes.reduce((s, l) => s + (l.liquido || 0), 0);

  // Costo por área (mes actual)
  const costoPorArea = useMemo(() => {
    const map = new Map<string, number>();
    liqsMes.forEach((l) => {
      const area = empMap.get(l.empleado_id)?.area ?? "Sin área";
      map.set(area, (map.get(area) ?? 0) + (l.liquido || 0));
    });
    return Array.from(map, ([area, total]) => ({ area, total }));
  }, [liqsMes, empMap]);

  // Evolución últimos 6 meses
  const evolucion = useMemo(() => {
    const out: { periodo: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const p = d.toISOString().slice(0, 7);
      const total = liqs.filter((l) => l.periodo === p).reduce((s, l) => s + (l.liquido || 0), 0);
      out.push({ periodo: d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" }), total });
    }
    return out;
  }, [liqs]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard gerencial</h1>
        <p className="text-sm text-muted-foreground">Visión consolidada del estado operacional y financiero del día.</p>
      </header>

      <IndicadoresBar />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Empleados activos" value={String(empleadosActivos.length)}
          icon={<Users className="h-4 w-4" />} tone="primary"
          onClick={() => setOpen("empleados")}
        />
        <KpiCard
          title="Asistencia hoy" value={`${pctAsistencia}%`}
          icon={<Clock className="h-4 w-4" />} tone="success"
          subtitle={`${presentes} de ${empleadosActivos.length} presentes`}
          onClick={() => setOpen("asistencia")}
        />
        <KpiCard
          title="Alertas críticas IA" value={String(alertasCriticas)}
          icon={<AlertTriangle className="h-4 w-4" />} tone="destructive"
          onClick={() => setOpen("alertas")}
        />
        <KpiCard
          title="Costo RRHH mes" value={formatCLP(costoMes)}
          icon={<Wallet className="h-4 w-4" />} tone="info"
          onClick={() => setOpen("costo")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold mb-1">Evolución del costo RRHH (últimos 6 meses)</h3>
          <p className="text-xs text-muted-foreground mb-4">Total mensual de liquidaciones líquidas pagadas.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="periodo" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCLP(v)} />
                <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Alertas IA</h3>
          <p className="text-xs text-muted-foreground mb-4">Detección automática del motor de inteligencia.</p>
          <div className="space-y-2">
            {alertas.slice(0, 4).map((a) => <AlertCard key={a.id} {...a} />)}
            {alertas.length === 0 && (
              <AlertCard severidad="info" titulo="Sin alertas detectadas" detalle="El motor IA no encontró patrones anómalos en los últimos 60 días." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold mb-1">Costo por área (mes actual)</h3>
        <p className="text-xs text-muted-foreground mb-4">Distribución del gasto de remuneraciones según área operativa.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costoPorArea}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="area" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatCLP(v)} />
              <Legend />
              <Bar dataKey="total" name="Costo" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
        <QRMarcar />
      </div>


      <Sheet open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {open === "empleados" && "Empleados activos"}
              {open === "asistencia" && "Asistencia de hoy"}
              {open === "alertas" && "Alertas críticas"}
              {open === "costo" && "Detalle de costo RRHH"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 text-sm">
            {open === "empleados" && empleadosActivos.map((e) => (
              <DetailRow key={e.id} title={e.nombre} subtitle={`${e.cargo} · ${e.area}`} />
            ))}
            {open === "asistencia" && (
              <>
                <SectionTitle>Ausentes ({ausentes.length})</SectionTitle>
                {ausentes.map((a) => {
                  const e = empMap.get(a.empleado_id);
                  return <DetailRow key={a.id} title={e?.nombre ?? a.empleado_id} subtitle={e?.area ?? ""} tag="Ausente" tone="destructive" />;
                })}
                <SectionTitle>Atrasos ({atrasos.length})</SectionTitle>
                {atrasos.map((a) => {
                  const e = empMap.get(a.empleado_id);
                  return <DetailRow key={a.id} title={e?.nombre ?? a.empleado_id} subtitle={e?.area ?? ""} tag="Atraso" tone="warning" />;
                })}
              </>
            )}
            {open === "alertas" && alertas.map((a) => <AlertCard key={a.id} {...a} />)}
            {open === "costo" && costoPorArea.map((c) => (
              <DetailRow key={c.area} title={c.area} subtitle="Total mes" tag={formatCLP(c.total)} />
            ))}
            {((open === "empleados" && empleadosActivos.length === 0) ||
              (open === "alertas" && alertas.length === 0)) && (
                <p className="text-muted-foreground">Sin registros.</p>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({
  title, value, icon, tone, subtitle, onClick,
}: {
  title: string; value: string; icon: React.ReactNode;
  tone: "primary" | "success" | "destructive" | "info";
  subtitle?: string; onClick?: () => void;
}) {
  const toneBg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  }[tone];
  return (
    <button onClick={onClick} className="text-left">
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneBg}`}>{icon}</span>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </Card>
    </button>
  );
}

function AlertCard({ severidad, titulo, detalle }: { severidad: "critica" | "warning" | "info"; titulo: string; detalle: string }) {
  const styles = {
    critica: "border-destructive/30 bg-destructive/5",
    warning: "border-warning/40 bg-warning/10",
    info: "border-info/30 bg-info/5",
  }[severidad];
  const dot = {
    critica: "bg-destructive",
    warning: "bg-warning",
    info: "bg-info",
  }[severidad];
  return (
    <div className={`rounded-md border p-3 ${styles}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-sm font-medium">{titulo}</span>
      </div>
      <p className="text-xs text-muted-foreground">{detalle}</p>
    </div>
  );
}

function DetailRow({ title, subtitle, tag, tone }: { title: string; subtitle?: string; tag?: string; tone?: "destructive" | "warning" }) {
  const tagCls = tone === "destructive"
    ? "bg-destructive/10 text-destructive"
    : tone === "warning"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {tag && <span className={`text-[11px] px-2 py-0.5 rounded ${tagCls}`}>{tag}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{children}</div>;
}
