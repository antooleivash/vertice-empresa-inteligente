import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Users, Clock, Timer, FileWarning, Receipt, CalendarDays,
  Wallet, TrendingUp, Target, Activity, Gauge, Sparkles, Bell, Megaphone,
  Briefcase, UserSearch, Store, Truck, LogOut, Building2, BarChart3, ArrowDownCircle, ArrowUpCircle,
  Shield, FileSignature, FileCheck2, ShieldAlert, Settings, Package, Scale, ShoppingCart, Lock, Upload, Landmark,
  Calendar, Contact, Star,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { cn } from "@/lib/utils";
import { usePlan, PLAN_INFO, MODULE_TIER, type PlanTier } from "@/lib/plan";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; module: string };
type Section = { title: string; items: Item[]; color: string; bg: string; dot: string };

const sections: Section[] = [
  {
    title: "General", color: "#6366F1", bg: "#EEF2FF", dot: "#6366F1",
    items: [{ to: "/dashboard", label: "Dashboard gerencial", icon: LayoutDashboard, module: "dashboard" }]
  },
  {
    title: "RRHH", color: "#0EA5E9", bg: "#E0F2FE", dot: "#0EA5E9",
    items: [
      { to: "/rrhh/empleados", label: "Empleados", icon: Users, module: "rrhh" },
      { to: "/rrhh/asistencia", label: "Asistencia", icon: Clock, module: "asistencia" },
      { to: "/rrhh/horas-extras", label: "Horas extras", icon: Timer, module: "horas-extras" },
      { to: "/rrhh/cartas", label: "Cartas amonestación", icon: FileWarning, module: "cartas" },
      { to: "/rrhh/liquidaciones", label: "Liquidaciones", icon: Receipt, module: "liquidaciones" },
      { to: "/rrhh/vacaciones", label: "Vacaciones", icon: CalendarDays, module: "vacaciones" },
    ],
  },
  {
    title: "Finanzas", color: "#10B981", bg: "#ECFDF5", dot: "#10B981",
    items: [
      { to: "/finanzas/dashboard", label: "Dashboard financiero", icon: BarChart3, module: "finanzas" },
      { to: "/caja", label: "Caja y ventas", icon: ShoppingCart, module: "caja" },
      { to: "/finanzas/costos", label: "Costos", icon: Wallet, module: "finanzas" },
      { to: "/finanzas/gastos", label: "Gastos", icon: ArrowDownCircle, module: "finanzas" },
      { to: "/finanzas/ingresos", label: "Ingresos", icon: ArrowUpCircle, module: "finanzas" },
      { to: "/finanzas/flujo-caja", label: "Flujo de caja", icon: TrendingUp, module: "finanzas" },
      { to: "/finanzas/presupuesto", label: "Presupuesto vs real", icon: Target, module: "finanzas" },
      { to: "/simulador", label: "Simulador financiero", icon: TrendingUp, module: "simulador" },
      { to: "/impuestos", label: "Impuestos (IVA / F29)", icon: Landmark, module: "impuestos" },
      { to: "/balance", label: "Balance (Activos y Pasivos)", icon: Scale, module: "balance" },
    ],
  },
  {
    title: "Clientes", color: "#F59E0B", bg: "#FFFBEB", dot: "#F59E0B",
    items: [
      { to: "/puntos-fidelizacion", label: "Puntos fidelización", icon: Star, module: "fidelizacion" },
    ],
  },
  {
    title: "Gestión", color: "#F59E0B", bg: "#FFFBEB", dot: "#F59E0B",
    items: [
      { to: "/agenda", label: "Agenda y calendario", icon: Calendar, module: "agenda" },
      { to: "/clientes", label: "Clientes y CRM", icon: Contact, module: "clientes" },
    ],
  },
  {
    title: "Cumplimiento Legal DT", color: "#EF4444", bg: "#FEF2F2", dot: "#EF4444",
    items: [
      { to: "/cumplimiento/contratos", label: "Contratos", icon: FileSignature, module: "cumplimiento" },
      { to: "/cumplimiento/documentos", label: "Documentos obligatorios", icon: FileCheck2, module: "cumplimiento" },
      { to: "/cumplimiento/jornada", label: "Control de jornada", icon: Shield, module: "cumplimiento" },
      { to: "/cumplimiento/alertas", label: "Alertas DT", icon: ShieldAlert, module: "cumplimiento" },
    ],
  },
  {
    title: "Operaciones", color: "#8B5CF6", bg: "#F5F3FF", dot: "#8B5CF6",
    items: [
      { to: "/operaciones/productividad", label: "Productividad", icon: Activity, module: "operaciones" },
      { to: "/operaciones/turnos", label: "Rendimiento por turno", icon: Gauge, module: "operaciones" },
      { to: "/inventario", label: "Inventario", icon: Package, module: "inventario" },
    ],
  },
  {
    title: "Inteligencia IA", color: "#EC4899", bg: "#FDF2F8", dot: "#EC4899",
    items: [
      { to: "/ia/alertas", label: "Alertas automáticas", icon: Bell, module: "ia" },
      { to: "/ia/predicciones", label: "Predicciones", icon: Sparkles, module: "ia" },
    ],
  },
  {
    title: "Reclutamiento", color: "#06B6D4", bg: "#ECFEFF", dot: "#06B6D4",
    items: [
      { to: "/reclutamiento/ofertas", label: "Ofertas", icon: Briefcase, module: "reclutamiento" },
      { to: "/reclutamiento/candidatos", label: "Candidatos", icon: UserSearch, module: "reclutamiento" },
    ],
  },
  {
    title: "Marketing IA", color: "#F97316", bg: "#FFF7ED", dot: "#F97316",
    items: [
      { to: "/marketing/campanas", label: "Campañas", icon: Megaphone, module: "marketing" },
      { to: "/marketing/contenido", label: "Contenido", icon: Sparkles, module: "marketing" },
    ],
  },
  {
    title: "Marketplace", color: "#0EA5E9", bg: "#F0F9FF", dot: "#0EA5E9",
    items: [
      { to: "/marketplace/servicios", label: "Servicios", icon: Store, module: "marketplace" },
      { to: "/marketplace/proveedores", label: "Proveedores", icon: Truck, module: "marketplace" },
    ],
  },
  {
    title: "Administración", color: "#64748B", bg: "#F8FAFC", dot: "#64748B",
    items: [
      { to: "/admin", label: "Usuarios y roles", icon: Users, module: "dashboard" },
    ],
  },
  {
    title: "Configuración", color: "#64748B", bg: "#F8FAFC", dot: "#64748B",
    items: [
      { to: "/configuracion/empresa", label: "Empresa", icon: Settings, module: "configuracion" },
      { to: "/configuracion/importar", label: "Importar datos", icon: Upload, module: "configuracion" },
      { to: "/configuracion/plan", label: "Plan y módulos", icon: Sparkles, module: "configuracion" },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { empresa } = useEmpresa();
  const { plan, isHidden, isLocked } = usePlan();
  const navigate = useNavigate();
  const [upgradeFor, setUpgradeFor] = useState<{ module: string; tier: PlanTier } | null>(null);

  return (
    <aside style={{ background: "#FFFFFF", borderRight: "1px solid #F1F5F9" }} className="flex h-screen w-64 shrink-0 flex-col text-gray-800">
      {/* Header */}
      <div style={{ borderBottom: "1px solid #F1F5F9", padding: "16px 20px" }} className="flex items-center gap-3">
        {empresa.logo_url
          ? <img src={empresa.logo_url} alt="Logo" className="h-9 w-9 rounded-xl object-contain" style={{ border: "1.5px solid #E2E8F0" }} />
          : <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              <Building2 className="h-5 w-5 text-white" />
            </div>}
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-gray-900 truncate">{empresa.nombre || "Vértice"}</span>
          <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 600 }}>Plan {PLAN_INFO[plan].label}</span>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 overflow-y-auto py-3" style={{ paddingLeft: 10, paddingRight: 10 }}>
          {sections.map((s) => {
            const items = s.items.filter((it) => !isHidden(it.module) || isLocked(it.module));
            if (items.length === 0) return null;
            return (
              <div key={s.title} style={{ marginBottom: 6 }}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 4px" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: s.color, textTransform: "uppercase" }}>
                    {s.title}
                  </span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {items.map((it) => {
                    const active = pathname === it.to || pathname.startsWith(it.to + "/");
                    const Icon = it.icon;
                    const locked = isLocked(it.module);
                    const tier = MODULE_TIER[it.module] ?? "basico";

                    const itemStyle: React.CSSProperties = {
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 13,
                      cursor: locked ? "pointer" : "default",
                      fontWeight: active ? 600 : 400,
                      color: active ? s.color : locked ? "#CBD5E1" : "#475569",
                      background: active ? s.bg : "transparent",
                      transition: "all 0.15s",
                      width: "100%",
                      border: "none",
                      textDecoration: "none",
                    };

                    const inner = (
                      <>
                        <Icon style={{ width: 15, height: 15, flexShrink: 0, color: active ? s.color : locked ? "#CBD5E1" : "#94A3B8" }} />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                        {locked && <Lock style={{ width: 11, height: 11, color: "#CBD5E1", flexShrink: 0 }} />}
                      </>
                    );

                    return (
                      <li key={it.to}>
                        {locked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button style={itemStyle} onClick={() => setUpgradeFor({ module: it.module, tier })}>
                                {inner}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Actualizar a {PLAN_INFO[tier].label}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Link to={it.to} style={itemStyle}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = s.bg; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #F1F5F9", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {(user?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email ?? "Invitado"}</div>
            <div style={{ fontSize: 10, color: "#10B981", fontWeight: 600 }}>● Sesión activa</div>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 13, color: "#EF4444", background: "transparent", border: "none", cursor: "pointer", fontWeight: 500 }}
          onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut style={{ width: 15, height: 15 }} />
          Cerrar sesión
        </button>
      </div>

      <Dialog open={!!upgradeFor} onOpenChange={(o) => !o && setUpgradeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Módulo bloqueado</DialogTitle>
          </DialogHeader>
          {upgradeFor && (
            <div className="space-y-2 text-sm">
              <p>Este módulo está disponible en el plan <strong>{PLAN_INFO[upgradeFor.tier].label}</strong>.</p>
              <p className="text-muted-foreground">{PLAN_INFO[upgradeFor.tier].descripcion}</p>
              <p>¿Deseas actualizar?</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeFor(null)}>Cancelar</Button>
            <Button onClick={() => { setUpgradeFor(null); navigate({ to: "/configuracion/plan" }); }}>Ver planes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

