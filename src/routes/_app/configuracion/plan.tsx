import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatCLP } from "@/lib/domain";
import { usePlan, PLAN_INFO, PLAN_RANK, MODULE_TIER, type PlanTier, isUnlockedByPlan } from "@/lib/plan";
import { Check, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracion/plan")({ component: PlanPage });

const TIER_LABEL: Record<PlanTier, string> = { basico: "Básico", empresa: "Empresa", corporativo: "Corporativo" };

const MODULE_LABEL: Record<string, string> = {
  dashboard: "Dashboard gerencial",
  rrhh: "RRHH (empleados, contratos)",
  asistencia: "Asistencia y marcajes",
  cartas: "Cartas amonestación",
  liquidaciones: "Liquidaciones de sueldo",
  vacaciones: "Vacaciones",
  "horas-extras": "Horas extras",
  finanzas: "Finanzas (costos, gastos, ingresos)",
  caja: "Caja y ventas",
  inventario: "Inventario y activos",
  balance: "Balance financiero",
  simulador: "Simulador financiero",
  cumplimiento: "Cumplimiento Legal DT",
  operaciones: "Operaciones y productividad",
  reclutamiento: "Reclutamiento",
  marketing: "Marketing IA",
  ia: "Inteligencia IA",
  marketplace: "Marketplace",
  configuracion: "Configuración",
};

function PlanPage() {
  const { plan, setPlan, hidden, isHidden, toggleHidden } = usePlan();

  const choose = (next: PlanTier) => {
    setPlan(next);
    toast.success(`Plan actualizado a ${TIER_LABEL[next]}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="Plan y módulos"
        description="Configura el plan de suscripción y activa o desactiva módulos visibles en el sidebar."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(Object.keys(PLAN_INFO) as PlanTier[]).map((tier) => {
          const info = PLAN_INFO[tier];
          const active = plan === tier;
          return (
            <Card key={tier} className={`p-6 relative ${active ? "border-primary border-2 shadow-md" : ""}`}>
              {active && <Badge className="absolute top-3 right-3">Plan actual</Badge>}
              <div className="flex items-center gap-2 mb-1"><Sparkles className="h-4 w-4 text-primary" /><h3 className="text-lg font-semibold">{info.label}</h3></div>
              <div className="text-3xl font-bold mb-1">{formatCLP(info.precio)}<span className="text-sm font-normal text-muted-foreground">/mes</span></div>
              <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{info.descripcion}</p>
              <ul className="space-y-1.5 text-sm mb-5">
                {Object.entries(MODULE_TIER)
                  .filter(([, t]) => PLAN_RANK[t] <= PLAN_RANK[tier])
                  .map(([k]) => (
                    <li key={k} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" />{MODULE_LABEL[k] ?? k}</li>
                  ))}
              </ul>
              <Button
                className="w-full" variant={active ? "outline" : "default"}
                disabled={active} onClick={() => choose(tier)}
              >{active ? "Plan activo" : "Seleccionar este plan"}</Button>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-1">Módulos activos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Oculta módulos que no necesites en el sidebar. Los módulos no incluidos en tu plan aparecen bloqueados.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(MODULE_LABEL).map(([key, label]) => {
            const locked = !isUnlockedByPlan(key, plan);
            const visible = !isHidden(key);
            return (
              <div key={key} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={locked ? "text-muted-foreground" : ""}>{label}</span>
                  <Badge variant="secondary" className="text-[10px]">{TIER_LABEL[MODULE_TIER[key]]}</Badge>
                </div>
                <Switch checked={visible && !locked} disabled={locked} onCheckedChange={() => toggleHidden(key)} />
              </div>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground mt-3">
          {hidden.length} módulo(s) ocultos manualmente.
        </div>
      </Card>
    </PageShell>
  );
}
