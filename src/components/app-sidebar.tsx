import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Clock, Timer, FileWarning, Receipt, CalendarDays,
  Wallet, TrendingUp, Target, Activity, Gauge, Sparkles, Bell, Megaphone,
  Briefcase, UserSearch, Store, Truck, LogOut, Building2, BarChart3, ArrowDownCircle, ArrowUpCircle,
  Shield, FileSignature, FileCheck2, ShieldAlert, Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Section = { title: string; items: Item[] };

const sections: Section[] = [
  { title: "General", items: [{ to: "/", label: "Dashboard gerencial", icon: LayoutDashboard }] },
  {
    title: "RRHH",
    items: [
      { to: "/rrhh/empleados", label: "Empleados", icon: Users },
      { to: "/rrhh/asistencia", label: "Asistencia", icon: Clock },
      { to: "/rrhh/horas-extras", label: "Horas extras", icon: Timer },
      { to: "/rrhh/cartas", label: "Cartas amonestación", icon: FileWarning },
      { to: "/rrhh/liquidaciones", label: "Liquidaciones", icon: Receipt },
      { to: "/rrhh/vacaciones", label: "Vacaciones", icon: CalendarDays },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { to: "/finanzas/dashboard", label: "Dashboard financiero", icon: BarChart3 },
      { to: "/finanzas/costos", label: "Costos", icon: Wallet },
      { to: "/finanzas/gastos", label: "Gastos", icon: ArrowDownCircle },
      { to: "/finanzas/ingresos", label: "Ingresos", icon: ArrowUpCircle },
      { to: "/finanzas/flujo-caja", label: "Flujo de caja", icon: TrendingUp },
      { to: "/finanzas/presupuesto", label: "Presupuesto vs real", icon: Target },
    ],
  },
  {
    title: "Cumplimiento Legal DT",
    items: [
      { to: "/cumplimiento/contratos", label: "Contratos", icon: FileSignature },
      { to: "/cumplimiento/documentos", label: "Documentos obligatorios", icon: FileCheck2 },
      { to: "/cumplimiento/jornada", label: "Control de jornada", icon: Shield },
      { to: "/cumplimiento/alertas", label: "Alertas DT", icon: ShieldAlert },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { to: "/operaciones/productividad", label: "Productividad", icon: Activity },
      { to: "/operaciones/turnos", label: "Rendimiento por turno", icon: Gauge },
    ],
  },
  {
    title: "Inteligencia IA",
    items: [
      { to: "/ia/alertas", label: "Alertas automáticas", icon: Bell },
      { to: "/ia/predicciones", label: "Predicciones", icon: Sparkles },
    ],
  },
  {
    title: "Reclutamiento",
    items: [
      { to: "/reclutamiento/ofertas", label: "Ofertas", icon: Briefcase },
      { to: "/reclutamiento/candidatos", label: "Candidatos", icon: UserSearch },
    ],
  },
  {
    title: "Marketing IA",
    items: [
      { to: "/marketing/campanas", label: "Campañas", icon: Megaphone },
      { to: "/marketing/contenido", label: "Contenido", icon: Sparkles },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/marketplace/servicios", label: "Servicios", icon: Store },
      { to: "/marketplace/proveedores", label: "Proveedores", icon: Truck },
    ],
  },
  {
    title: "Configuración",
    items: [
      { to: "/configuracion/empresa", label: "Empresa", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        {empresa.logo_url
          ? <img src={empresa.logo_url} alt="Logo" className="h-9 w-9 rounded-md object-contain bg-white p-0.5" />
          : <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>}
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight truncate">{empresa.nombre || "Vértice"}</span>
          <span className="text-[11px] text-muted-foreground">Plataforma Empresarial</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((s) => (
          <div key={s.title}>
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.title}
            </div>
            <ul className="space-y-0.5">
              {s.items.map((it) => {
                const active = pathname === it.to;
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 px-2 text-xs">
          <div className="font-medium truncate">{user?.email ?? "Invitado"}</div>
          <div className="text-muted-foreground">Sesión activa</div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
