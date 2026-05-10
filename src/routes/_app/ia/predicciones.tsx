import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/ia/predicciones")({
  component: () => <ComingSoon title="Predicciones IA" description="Modelos predictivos de costo, ausentismo y rotación." fase={2} />,
});
