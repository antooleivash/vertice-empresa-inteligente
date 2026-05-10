import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleados } from "@/hooks/use-empleados";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/cumplimiento/alertas")({ component: AlertasDTPage });

const LIMITE_SEMANAL = 42;

type Contrato = { id: string; empleado_id: string; fecha_vencimiento: string | null };
type Doc = { empleado_id: string; tipo_documento: string; entregado: boolean };
type Asistencia = { empleado_id: string; fecha: string; entrada: string | null; salida: string | null };
type HoraExtra = { empleado_id: string; horas: number; autorizadas: boolean; fecha: string };
type Liq = { id: string; empleado_id: string };

function AlertasDTPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [asist, setAsist] = useState<Asistencia[]>([]);
  const [he, setHe] = useState<HoraExtra[]>([]);
  const [liqs, setLiqs] = useState<Liq[]>([]);

  useEffect(() => {
    const desde = new Date(); desde.setDate(desde.getDate() - 7);
    const dStr = desde.toISOString().slice(0, 10);
    supabase.from("contratos").select("id,empleado_id,fecha_vencimiento").then(({ data }) => setContratos((data as Contrato[]) ?? []));
    supabase.from("documentos_legales").select("empleado_id,tipo_documento,entregado").then(({ data }) => setDocs((data as Doc[]) ?? []));
    supabase.from("asistencia").select("empleado_id,fecha,entrada,salida").gte("fecha", dStr).then(({ data }) => setAsist((data as Asistencia[]) ?? []));
    supabase.from("horas_extras").select("empleado_id,fecha,horas,autorizadas").gte("fecha", dStr).then(({ data }) => setHe((data as HoraExtra[]) ?? []));
    supabase.from("liquidaciones").select("id,empleado_id").then(({ data }) => setLiqs((data as Liq[]) ?? []));
  }, []);

  // Críticas
  const vencidos = contratos.filter((c) => c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date());
  const sinODI = empleados.filter((e) => !docs.find((d) => d.empleado_id === e.id && d.tipo_documento === "ODI firmada" && d.entregado));
  const heSinPacto = he.filter((h) => !h.autorizadas);

  const horasPorEmp = new Map<string, number>();
  asist.forEach((a) => {
    if (!a.entrada || !a.salida) return;
    const h = (new Date(a.salida).getTime() - new Date(a.entrada).getTime()) / 3600000;
    if (h > 0) horasPorEmp.set(a.empleado_id, (horasPorEmp.get(a.empleado_id) ?? 0) + h);
  });
  const excedenLimite = Array.from(horasPorEmp.entries()).filter(([, h]) => h > LIMITE_SEMANAL);

  // Advertencias
  const porVencer = contratos.filter((c) => {
    if (!c.fecha_vencimiento) return false;
    const days = (new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86400000;
    return days >= 0 && days < 30;
  });
  const sinReglamento = empleados.filter((e) => !docs.find((d) => d.empleado_id === e.id && d.tipo_documento === "Reglamento interno" && d.entregado));
  const sinLiqAlDia = empleados.filter((e) => !docs.find((d) => d.empleado_id === e.id && d.tipo_documento === "Liquidaciones al día" && d.entregado));

  const criticas = [
    vencidos.length > 0 && { titulo: `${vencidos.length} trabajador(es) con contrato vencido`, detalle: vencidos.map((v) => empleadosMap.get(v.empleado_id)?.nombre).filter(Boolean).join(", ") },
    ...excedenLimite.map(([id, h]) => ({ titulo: `${empleadosMap.get(id)?.nombre ?? "Trabajador"}: ${h.toFixed(1)} horas trabajadas esta semana`, detalle: `Excede límite legal de ${LIMITE_SEMANAL} horas (Ley 21.561)` })),
    sinODI.length > 0 && { titulo: `${sinODI.length} trabajador(es) sin ODI firmada`, detalle: sinODI.slice(0, 5).map((e) => e.nombre).join(", ") + (sinODI.length > 5 ? "…" : "") },
    heSinPacto.length > 0 && { titulo: `${heSinPacto.length} registro(s) de horas extras sin pacto escrito`, detalle: "Requieren autorización formal según Código del Trabajo" },
  ].filter(Boolean) as { titulo: string; detalle: string }[];

  const advertencias = [
    porVencer.length > 0 && { titulo: `${porVencer.length} contrato(s) vencen en menos de 30 días`, detalle: porVencer.map((v) => empleadosMap.get(v.empleado_id)?.nombre).filter(Boolean).join(", ") },
    sinReglamento.length > 0 && { titulo: `${sinReglamento.length} trabajador(es) sin reglamento interno firmado`, detalle: sinReglamento.slice(0, 5).map((e) => e.nombre).join(", ") + (sinReglamento.length > 5 ? "…" : "") },
    sinLiqAlDia.length > 0 && { titulo: `${sinLiqAlDia.length} liquidación(es) pendientes de firma`, detalle: `Total liquidaciones registradas: ${liqs.length}` },
  ].filter(Boolean) as { titulo: string; detalle: string }[];

  return (
    <PageShell>
      <PageHeader title="Alertas DT automáticas" description="Detección automática de riesgos de incumplimiento ante la Dirección del Trabajo." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border-destructive/30 bg-destructive/5"><div className="text-xs text-muted-foreground mb-1">Críticas</div><div className="text-2xl font-semibold text-destructive">{criticas.length}</div></Card>
        <Card className="p-5 border-amber-500/30 bg-amber-500/5"><div className="text-xs text-muted-foreground mb-1">Advertencias</div><div className="text-2xl font-semibold text-amber-600">{advertencias.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Trabajadores monitoreados</div><div className="text-2xl font-semibold">{empleados.length}</div></Card>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Críticas</h2>
        <div className="grid gap-3">
          {criticas.length === 0 && <Card className="p-5 text-sm text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Sin alertas críticas detectadas.</Card>}
          {criticas.map((a, i) => (
            <Card key={i} className="p-5 border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-destructive">{a.titulo}</div>
                  {a.detalle && <div className="text-sm text-muted-foreground mt-0.5">{a.detalle}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Advertencias</h2>
        <div className="grid gap-3">
          {advertencias.length === 0 && <Card className="p-5 text-sm text-muted-foreground">Sin advertencias.</Card>}
          {advertencias.map((a, i) => (
            <Card key={i} className="p-5 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-700 dark:text-amber-500">{a.titulo}</div>
                  {a.detalle && <div className="text-sm text-muted-foreground mt-0.5">{a.detalle}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
