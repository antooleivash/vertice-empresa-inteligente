import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleados } from "@/hooks/use-empleados";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/cumplimiento/jornada")({ component: JornadaPage });

const LIMITE_SEMANAL = 42;
const LIMITE_HE_DIA = 2;
const LIMITE_HE_SEMANA = 10;
const DESCANSO_MIN_HORAS = 12;

type Asistencia = { id: string; empleado_id: string; fecha: string; entrada: string | null; salida: string | null };
type HoraExtra = { id: string; empleado_id: string; fecha: string; horas: number; autorizadas: boolean };

function semanaISO(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function horasEntreTimestamps(entrada: string | null, salida: string | null): number {
  if (!entrada || !salida) return 0;
  const a = new Date(entrada).getTime();
  const b = new Date(salida).getTime();
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  return (b - a) / 3600000;
}

function JornadaPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([]);

  useEffect(() => {
    const desde = new Date(); desde.setDate(desde.getDate() - 14);
    supabase.from("asistencia").select("*").gte("fecha", desde.toISOString().slice(0, 10)).then(({ data }) => setAsistencias((data as Asistencia[]) ?? []));
    supabase.from("horas_extras").select("*").gte("fecha", desde.toISOString().slice(0, 10)).then(({ data }) => setHorasExtras((data as HoraExtra[]) ?? []));
  }, []);

  const reporte = useMemo(() => {
    const semanaActual = semanaISO(new Date());
    return empleados.map((e) => {
      const asistEmp = asistencias.filter((a) => a.empleado_id === e.id);
      const heEmp = horasExtras.filter((h) => h.empleado_id === e.id);

      const horasSemana = asistEmp
        .filter((a) => semanaISO(new Date(a.fecha)) === semanaActual)
        .reduce((s, a) => s + horasEntreTimestamps(a.entrada, a.salida), 0);

      const heSemana = heEmp
        .filter((h) => semanaISO(new Date(h.fecha)) === semanaActual)
        .reduce((s, h) => s + (h.horas || 0), 0);

      const heDiaMax = Math.max(0, ...heEmp.filter((h) => semanaISO(new Date(h.fecha)) === semanaActual).map((h) => h.horas || 0));

      // descanso entre turnos
      const sorted = [...asistEmp].filter((a) => a.salida && a.entrada).sort((a, b) => (a.entrada! > b.entrada! ? 1 : -1));
      let descansoMin = Infinity;
      for (let i = 1; i < sorted.length; i++) {
        const prevSal = new Date(sorted[i - 1].salida!).getTime();
        const currEnt = new Date(sorted[i].entrada!).getTime();
        const diff = (currEnt - prevSal) / 3600000;
        if (diff > 0 && diff < descansoMin) descansoMin = diff;
      }
      if (!isFinite(descansoMin)) descansoMin = 0;

      const alertas: string[] = [];
      if (horasSemana > LIMITE_SEMANAL) alertas.push(`Excede ${LIMITE_SEMANAL}h semanales (Ley 21.561)`);
      if (heDiaMax > LIMITE_HE_DIA) alertas.push(`HE diaria ${heDiaMax.toFixed(1)}h > ${LIMITE_HE_DIA}h`);
      if (heSemana > LIMITE_HE_SEMANA) alertas.push(`HE semanal ${heSemana.toFixed(1)}h > ${LIMITE_HE_SEMANA}h`);
      if (descansoMin > 0 && descansoMin < DESCANSO_MIN_HORAS) alertas.push(`Descanso ${descansoMin.toFixed(1)}h < ${DESCANSO_MIN_HORAS}h`);

      return { empleado: e, horasSemana, heSemana, heDiaMax, descansoMin, alertas };
    });
  }, [empleados, asistencias, horasExtras, empleadosMap]);

  const conAlertas = reporte.filter((r) => r.alertas.length > 0);

  return (
    <PageShell>
      <PageHeader
        title="Control de jornada · Ley 21.561"
        description="Límite legal: 42 hrs semanales · Máx HE: 2h/día y 10h/semana · Descanso mínimo entre turnos: 12h."
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Trabajadores</div><div className="text-2xl font-semibold">{empleados.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Con alertas</div><div className="text-2xl font-semibold text-destructive">{conAlertas.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Cumple normativa</div><div className="text-2xl font-semibold text-success">{reporte.length - conAlertas.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Límite legal</div><div className="text-2xl font-semibold">42h<span className="text-sm text-muted-foreground"> /sem</span></div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Reporte semana actual</div>
        <Table>
          <TableHeader><TableRow><TableHead>Trabajador</TableHead><TableHead className="text-right">Horas semana</TableHead><TableHead className="text-right">HE día (máx)</TableHead><TableHead className="text-right">HE semana</TableHead><TableHead className="text-right">Descanso mín</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            {reporte.map((r) => (
              <TableRow key={r.empleado.id}>
                <TableCell className="font-medium">{r.empleado.nombre}</TableCell>
                <TableCell className={`text-right font-mono ${r.horasSemana > LIMITE_SEMANAL ? "text-destructive font-semibold" : ""}`}>{r.horasSemana.toFixed(1)}</TableCell>
                <TableCell className={`text-right font-mono ${r.heDiaMax > LIMITE_HE_DIA ? "text-destructive" : ""}`}>{r.heDiaMax.toFixed(1)}</TableCell>
                <TableCell className={`text-right font-mono ${r.heSemana > LIMITE_HE_SEMANA ? "text-destructive" : ""}`}>{r.heSemana.toFixed(1)}</TableCell>
                <TableCell className={`text-right font-mono ${r.descansoMin > 0 && r.descansoMin < DESCANSO_MIN_HORAS ? "text-destructive" : ""}`}>{r.descansoMin > 0 ? `${r.descansoMin.toFixed(1)}h` : "—"}</TableCell>
                <TableCell>
                  {r.alertas.length === 0
                    ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />OK</Badge>
                    : <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{r.alertas.length} alerta{r.alertas.length > 1 ? "s" : ""}</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {reporte.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin datos.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {conAlertas.length > 0 && (
        <Card className="mt-6 p-5 border-destructive/30 bg-destructive/5">
          <div className="font-medium mb-3 flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Detalle de incumplimientos</div>
          <ul className="space-y-2 text-sm">
            {conAlertas.flatMap((r) => r.alertas.map((a, i) => (
              <li key={`${r.empleado.id}-${i}`}><span className="font-medium">{r.empleado.nombre}:</span> <span className="text-muted-foreground">{a}</span></li>
            )))}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}
