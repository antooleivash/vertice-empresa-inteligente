import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/finanzas/flujo-caja")({
  component: () => <ComingSoon title="Flujo de caja" description="Entradas y salidas mensuales proyectadas." fase={2} />,
});
