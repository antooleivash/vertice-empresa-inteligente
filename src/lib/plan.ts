import { useLocalValue } from "./local-store";

export type PlanTier = "basico" | "empresa" | "corporativo";

export const PLAN_RANK: Record<PlanTier, number> = {
  basico: 1,
  empresa: 2,
  corporativo: 3,
};

export const PLAN_INFO: Record<PlanTier, { label: string; precio: number; descripcion: string }> = {
  basico:      { label: "Básico",      precio: 49990,  descripcion: "RRHH, Asistencia y Cartas amonestación." },
  empresa:     { label: "Empresa",     precio: 99990,  descripcion: "Todo Básico + Finanzas, Caja, Inventario, Cumplimiento DT y Simulador." },
  corporativo: { label: "Corporativo", precio: 199990, descripcion: "Todo Empresa + Reclutamiento, Marketing IA, IA conversacional y soporte prioritario." },
};

/** Each module belongs to one tier — the minimum plan that unlocks it. */
export const MODULE_TIER: Record<string, PlanTier> = {
  // Always available
  dashboard: "basico",
  configuracion: "basico",
  // Básico
  rrhh: "basico",
  asistencia: "basico",
  cartas: "basico",
  liquidaciones: "basico",
  vacaciones: "basico",
  "horas-extras": "basico",
  // Empresa
  finanzas: "empresa",
  caja: "empresa",
  inventario: "empresa",
  balance: "empresa",
  simulador: "empresa",
  cumplimiento: "empresa",
  operaciones: "empresa",
  agenda: "basico",
  clientes: "basico",
  // Corporativo
  reclutamiento: "corporativo",
  marketing: "corporativo",
  ia: "corporativo",
  marketplace: "corporativo",
};

export function isUnlockedByPlan(moduleKey: string, plan: PlanTier) {
  const tier = MODULE_TIER[moduleKey] ?? "basico";
  return PLAN_RANK[tier] <= PLAN_RANK[plan];
}

export function usePlan() {
  const [plan, setPlan] = useLocalValue<PlanTier>("vertice.empresa.plan", "empresa");
  const [hidden, setHidden] = useLocalValue<string[]>("vertice.empresa.modulos_ocultos", []);
  const isHidden = (key: string) => hidden.includes(key);
  const toggleHidden = (key: string) =>
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const isLocked = (key: string) => !isUnlockedByPlan(key, plan);
  return { plan, setPlan, hidden, isHidden, toggleHidden, isLocked };
}
