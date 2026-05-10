// Tipos del dominio Vértice — alineados con tablas Supabase
export type Rol = "admin" | "supervisor" | "empleado";

export type Empleado = {
  id: string;
  rut: string;
  nombre: string;
  cargo: string;
  area: string;
  fecha_ingreso: string;
  sueldo_base: number;
  activo: boolean;
  rol?: Rol | null;
  email?: string | null;
  user_id?: string | null;
  foto_url?: string | null;
  created_at?: string;
};

export type SolicitudPermiso = {
  id: string;
  empleado_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  estado: "Pendiente" | "Aprobado" | "Rechazado";
  created_at?: string;
};

export type Asistencia = {
  id: string;
  empleado_id: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
  estado: "presente" | "ausente" | "atraso" | "licencia";
  created_at?: string;
};

export type HoraExtra = {
  id: string;
  empleado_id: string;
  fecha: string;
  horas: number;
  autorizadas: boolean;
  motivo: string | null;
  created_at?: string;
};

export type Carta = {
  id: string;
  empleado_id: string;
  fecha: string;
  tipo: "amonestacion" | "felicitacion" | "advertencia";
  motivo: string;
  contenido: string;
  created_at?: string;
};

export type Liquidacion = {
  id: string;
  empleado_id: string;
  periodo: string; // YYYY-MM
  sueldo_base: number;
  bonos: number;
  descuentos: number;
  liquido: number;
  created_at?: string;
};

export type VacacionPermiso = {
  id: string;
  empleado_id: string;
  tipo: "vacaciones" | "permiso" | "licencia_medica";
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: "pendiente" | "aprobado" | "rechazado";
  created_at?: string;
};

export const AREAS = [
  "Operaciones",
  "Producción",
  "Logística",
  "Administración",
  "Finanzas",
  "RRHH",
  "Mantenimiento",
  "Comercial",
] as const;

export const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);

export const formatDate = (s?: string | null) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("es-CL"); } catch { return s; }
};
