import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/finanzas/costos")({
  component: () => <ComingSoon title="Costos por área" description="Distribución de gastos por área operativa." fase={2} />,
});
