import { useLocalList } from "@/lib/local-store";

export type ClienteTag = "VIP" | "Regular" | "Nuevo" | "Inactivo";
export type ClienteTipo = "Persona" | "Empresa";

export interface Cliente {
  id: string;
  nombre: string;
  rut?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  tipo: ClienteTipo;
  notas?: string;
  tag: ClienteTag;
  created_at: string;
}

export type EventoTipo = "Cita con cliente" | "Vencimiento" | "Recordatorio" | "Reunión" | "Otro";
export type EventoEstado = "Pendiente" | "Completado" | "Cancelado";
export type EventoRecordatorio = "15 min" | "30 min" | "1 hora" | "1 día";
export type EventoRepetir = "No repetir" | "Diario" | "Semanal" | "Mensual";

export interface EventoAgenda {
  id: string;
  titulo: string;
  tipo: EventoTipo;
  fecha_inicio: string; // ISO
  fecha_fin?: string;
  cliente_id?: string;
  descripcion?: string;
  recordatorio: EventoRecordatorio;
  repetir: EventoRepetir;
  estado: EventoEstado;
  created_at: string;
}

export const TIPO_COLOR: Record<EventoTipo, string> = {
  "Cita con cliente": "#3B82F6",
  "Vencimiento": "#EF4444",
  "Recordatorio": "#F59E0B",
  "Reunión": "#10B981",
  "Otro": "#94A3B8",
};

export const useClientes = () => useLocalList<Cliente>("vertice.clientes", []);
export const useEventos = () => useLocalList<EventoAgenda>("vertice.agenda.eventos", []);
