import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/finanzas/presupuesto")({
  component: () => <ComingSoon title="Presupuesto vs real" description="Comparativo presupuestado contra ejecutado." fase={2} />,
});
