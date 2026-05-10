import { supabase } from "@/integrations/supabase/client";
import type { Asistencia, Empleado, HoraExtra, VacacionPermiso } from "@/lib/domain";

export type AlertaIA = {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  area: string;
  severidad: "critica" | "warning" | "info";
  categoria: "ausentismo" | "atrasos" | "horas_extras" | "licencias";
  titulo: string;
  detalle: string;
  metrica: string;
};

const HORAS_EXTRA_LIMITE_SEMANAL = 12; // Código del Trabajo CL: máx 2h/día
const VENTANA_DIAS = 60;

export async function detectarAlertas(): Promise<AlertaIA[]> {
  const desde = new Date();
  desde.setDate(desde.getDate() - VENTANA_DIAS);
  const desdeStr = desde.toISOString().slice(0, 10);

  const [{ data: emps }, { data: asis }, { data: he }, { data: vac }] = await Promise.all([
    supabase.from("empleados").select("*").eq("activo", true),
    supabase.from("asistencia").select("*").gte("fecha", desdeStr),
    supabase.from("horas_extras").select("*").gte("fecha", desdeStr),
    supabase.from("vacaciones_permisos").select("*").gte("fecha_inicio", desdeStr),
  ]);

  const empleados = (emps as Empleado[]) ?? [];
  const asistencia = (asis as Asistencia[]) ?? [];
  const horasExtras = (he as HoraExtra[]) ?? [];
  const vacaciones = (vac as VacacionPermiso[]) ?? [];

  const alertas: AlertaIA[] = [];

  for (const e of empleados) {
    const aEmp = asistencia.filter((a) => a.empleado_id === e.id);

    // 1) 2+ ausencias en lunes
    const lunesAusentes = aEmp.filter((a) => a.estado === "ausente" && new Date(a.fecha).getDay() === 1);
    if (lunesAusentes.length >= 2) {
      alertas.push({
        id: `aus-lun-${e.id}`, empleado_id: e.id, empleado_nombre: e.nombre, area: e.area,
        severidad: "critica", categoria: "ausentismo",
        titulo: "Patrón de ausentismo los lunes",
        detalle: `${e.nombre} registra ${lunesAusentes.length} ausencias en día lunes en los últimos ${VENTANA_DIAS} días.`,
        metrica: `${lunesAusentes.length} lunes`,
      });
    }

    // 2) 3+ atrasos
    const atrasos = aEmp.filter((a) => a.estado === "atraso").length;
    if (atrasos >= 3) {
      alertas.push({
        id: `atr-${e.id}`, empleado_id: e.id, empleado_nombre: e.nombre, area: e.area,
        severidad: atrasos >= 5 ? "critica" : "warning", categoria: "atrasos",
        titulo: "Atrasos reiterados",
        detalle: `${e.nombre} acumula ${atrasos} atrasos en los últimos ${VENTANA_DIAS} días.`,
        metrica: `${atrasos} atrasos`,
      });
    }

    // 3) Horas extras sobre límite semanal autorizado
    const heEmp = horasExtras.filter((h) => h.empleado_id === e.id);
    const totalHE = heEmp.reduce((s, h) => s + Number(h.horas || 0), 0);
    const noAutorizadas = heEmp.filter((h) => !h.autorizadas).reduce((s, h) => s + Number(h.horas || 0), 0);
    if (totalHE > HORAS_EXTRA_LIMITE_SEMANAL) {
      alertas.push({
        id: `he-tot-${e.id}`, empleado_id: e.id, empleado_nombre: e.nombre, area: e.area,
        severidad: totalHE > HORAS_EXTRA_LIMITE_SEMANAL * 2 ? "critica" : "warning", categoria: "horas_extras",
        titulo: "Horas extras sobre límite",
        detalle: `${e.nombre} acumula ${totalHE.toFixed(1)}h extras (límite referencial ${HORAS_EXTRA_LIMITE_SEMANAL}h/sem).`,
        metrica: `${totalHE.toFixed(1)}h`,
      });
    }
    if (noAutorizadas > 0) {
      alertas.push({
        id: `he-noaut-${e.id}`, empleado_id: e.id, empleado_nombre: e.nombre, area: e.area,
        severidad: "critica", categoria: "horas_extras",
        titulo: "Horas extras sin autorizar",
        detalle: `${e.nombre} registró ${noAutorizadas.toFixed(1)}h extras sin autorización formal.`,
        metrica: `${noAutorizadas.toFixed(1)}h`,
      });
    }

    // 4) Licencias médicas repetidas
    const lic = vacaciones.filter((v) => v.empleado_id === e.id && v.tipo === "licencia_medica");
    if (lic.length >= 2) {
      const totalDias = lic.reduce((s, v) => s + (v.dias || 0), 0);
      alertas.push({
        id: `lic-${e.id}`, empleado_id: e.id, empleado_nombre: e.nombre, area: e.area,
        severidad: lic.length >= 3 ? "critica" : "warning", categoria: "licencias",
        titulo: "Licencias médicas repetidas",
        detalle: `${e.nombre} presenta ${lic.length} licencias médicas (${totalDias} días) en ${VENTANA_DIAS} días.`,
        metrica: `${lic.length} licencias`,
      });
    }
  }

  return alertas.sort((a, b) => {
    const order = { critica: 0, warning: 1, info: 2 };
    return order[a.severidad] - order[b.severidad];
  });
}

export function alertaTone(s: AlertaIA["severidad"]) {
  return {
    critica: { card: "border-destructive/40 bg-destructive/5", dot: "bg-destructive", badge: "bg-destructive/15 text-destructive" },
    warning: { card: "border-warning/40 bg-warning/10", dot: "bg-warning", badge: "bg-warning/20 text-warning-foreground" },
    info: { card: "border-info/30 bg-info/5", dot: "bg-info", badge: "bg-info/15 text-info" },
  }[s];
}
