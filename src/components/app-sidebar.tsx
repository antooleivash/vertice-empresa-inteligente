import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Users, Clock, Timer, FileWarning, Receipt, CalendarDays,
  Wallet, TrendingUp, Target, Activity, Gauge, Sparkles, Bell, Megaphone,
  Briefcase, UserSearch, Store, Truck, LogOut, Building2, BarChart3, ArrowDownCircle, ArrowUpCircle,
  Shield, FileSignature, FileCheck2, ShieldAlert, Settings, Package, Scale, ShoppingCart, Lock, Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { cn } from "@/lib/utils";
import { usePlan, PLAN_INFO, MODULE_TIER, type PlanTier } from "@/lib/plan";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; module: string };
type Section = { title: string; items: Item[] };

const sections: Section[] = [
  { title: "General", items: [{ to: "/dashboard", label: "Dashboard gerencial", icon: LayoutDashboard, module: "dashboard" }] },
  {
    title: "RRHH",
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
    title: "Finanzas",
    items: [
      { to: "/finanzas/dashboard", label: "Dashboard financiero", icon: BarChart3, module: "finanzas" },
      { to: "/caja", label: "Caja y ventas", icon: ShoppingCart, module: "caja" },
      { to: "/finanzas/costos", label: "Costos", icon: Wallet, module: "finanzas" },
      { to: "/finanzas/gastos", label: "Gastos", icon: ArrowDownCircle, module: "finanzas" },
      { to: "/finanzas/ingresos", label: "Ingresos", icon: ArrowUpCircle, module: "finanzas" },
      { to: "/finanzas/flujo-caja", label: "Flujo de caja", icon: TrendingUp, module: "finanzas" },
      { to: "/finanzas/presupuesto", label: "Presupuesto vs real", icon: Target, module: "finanzas" },
      { to: "/simulador", label: "Simulador financiero", icon: TrendingUp, module: "simulador" },
      { to: "/balance", label: "Balance (Activos y Pasivos)", icon: Scale, module: "balance" },
    ],
  },
  {
    title: "Cumplimiento Legal DT",
    items: [
      { to: "/cumplimiento/contratos", label: "Contratos", icon: FileSignature, module: "cumplimiento" },
      { to: "/cumplimiento/documentos", label: "Documentos obligatorios", icon: FileCheck2, module: "cumplimiento" },
      { to: "/cumplimiento/jornada", label: "Control de jornada", icon: Shield, module: "cumplimiento" },
      { to: "/cumplimiento/alertas", label: "Alertas DT", icon: ShieldAlert, module: "cumplimiento" },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { to: "/operaciones/productividad", label: "Productividad", icon: Activity, module: "operaciones" },
      { to: "/operaciones/turnos", label: "Rendimiento por turno", icon: Gauge, module: "operaciones" },
      { to: "/inventario", label: "Inventario", icon: Package, module: "inventario" },
    ],
  },
  {
    title: "Inteligencia IA",
    items: [
      { to: "/ia/alertas", label: "Alertas automáticas", icon: Bell, module: "ia" },
      { to: "/ia/predicciones", label: "Predicciones", icon: Sparkles, module: "ia" },
    ],
  },
  {
    title: "Reclutamiento",
    items: [
      { to: "/reclutamiento/ofertas", label: "Ofertas", icon: Briefcase, module: "reclutamiento" },
      { to: "/reclutamiento/candidatos", label: "Candidatos", icon: UserSearch, module: "reclutamiento" },
    ],
  },
  {
    title: "Marketing IA",
    items: [
      { to: "/marketing/campanas", label: "Campañas", icon: Megaphone, module: "marketing" },
      { to: "/marketing/contenido", label: "Contenido", icon: Sparkles, module: "marketing" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/marketplace/servicios", label: "Servicios", icon: Store, module: "marketplace" },
      { to: "/marketplace/proveedores", label: "Proveedores", icon: Truck, module: "marketplace" },
    ],
  },
  {
    title: "Configuración",
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
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        {empresa.logo_url
          ? <img src={empresa.logo_url} alt="Logo" className="h-9 w-9 rounded-md object-contain bg-white p-0.5" />
          : <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>}
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight truncate">{empresa.nombre || "Vértice"}</span>
          <span className="text-[11px] text-muted-foreground">Plan {PLAN_INFO[plan].label}</span>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((s) => {
            const items = s.items.filter((it) => !isHidden(it.module) || isLocked(it.module));
            if (items.length === 0) return null;
            return (
              <div key={s.title}>
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </div>
                <ul className="space-y-0.5">
                  {items.map((it) => {
                    const active = pathname === it.to;
                    const Icon = it.icon;
                    const locked = isLocked(it.module);
                    const tier = MODULE_TIER[it.module] ?? "basico";
                    const className = cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors w-full",
                      active && !locked
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : locked
                          ? "text-muted-foreground/70 cursor-pointer hover:bg-sidebar-accent/40"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                    );
                    const inner = (
                      <>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{it.label}</span>
                        {locked && <Lock className="h-3 w-3 shrink-0" />}
                      </>
                    );
                    return (
                      <li key={it.to}>
                        {locked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className={className} onClick={() => setUpgradeFor({ module: it.module, tier })}>
                                {inner}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Actualizar plan a {PLAN_INFO[tier].label}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Link to={it.to} className={className}>{inner}</Link>
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
