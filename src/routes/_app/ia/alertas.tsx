import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { detectarAlertas, alertaTone, type AlertaIA } from "@/lib/ia-engine";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, RefreshCw, Filter } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/ia/alertas")({ component: AlertasPage });

function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaIA[]>([]);
  const [loading, setLoading] = useState(true);
  const [sev, setSev] = useState<"todas" | AlertaIA["severidad"]>("todas");
  const [cat, setCat] = useState<"todas" | AlertaIA["categoria"]>("todas");

  const load = async () => {
    setLoading(true);
    setAlertas(await detectarAlertas());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtradas = useMemo(() => alertas.filter((a) =>
    (sev === "todas" || a.severidad === sev) && (cat === "todas" || a.categoria === cat),
  ), [alertas, sev, cat]);

  const counts = {
    critica: alertas.filter((a) => a.severidad === "critica").length,
    warning: alertas.filter((a) => a.severidad === "warning").length,
    info: alertas.filter((a) => a.severidad === "info").length,
  };

  return (
    <PageShell>
      <PageHeader
        title="Alertas automáticas IA"
        description="Patrones detectados automáticamente sobre datos de RRHH en los últimos 60 días."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard tone="destructive" icon={<AlertTriangle className="h-4 w-4" />} label="Críticas" count={counts.critica} />
        <SummaryCard tone="warning" icon={<AlertCircle className="h-4 w-4" />} label="Advertencias" count={counts.warning} />
        <SummaryCard tone="info" icon={<Info className="h-4 w-4" />} label="Informativas" count={counts.info} />
      </div>

      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Select value={sev} onValueChange={(v) => setSev(v as typeof sev)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las severidades</SelectItem>
            <SelectItem value="critica">Críticas</SelectItem>
            <SelectItem value="warning">Advertencias</SelectItem>
            <SelectItem value="info">Informativas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cat} onValueChange={(v) => setCat(v as typeof cat)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            <SelectItem value="ausentismo">Ausentismo</SelectItem>
            <SelectItem value="atrasos">Atrasos</SelectItem>
            <SelectItem value="horas_extras">Horas extras</SelectItem>
            <SelectItem value="licencias">Licencias médicas</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtradas.map((a) => {
          const t = alertaTone(a.severidad);
          return (
            <Card key={a.id} className={`p-5 border ${t.card}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                  <span className="font-medium text-sm">{a.titulo}</span>
                </div>
                <Badge className={t.badge}>{a.metrica}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{a.detalle}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{a.empleado_nombre} · {a.area}</span>
                <span className="capitalize text-muted-foreground">{a.categoria.replace("_", " ")}</span>
              </div>
            </Card>
          );
        })}
        {!loading && filtradas.length === 0 && (
          <Card className="p-10 col-span-full text-center text-sm text-muted-foreground">
            No hay alertas con los filtros seleccionados.
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function SummaryCard({ tone, icon, label, count }: { tone: "destructive" | "warning" | "info"; icon: React.ReactNode; label: string; count: number }) {
  const cls = {
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
    info: "bg-info/10 text-info",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${cls}`}>{icon}</span>
      </div>
      <div className="text-2xl font-semibold">{count}</div>
    </Card>
  );
}
