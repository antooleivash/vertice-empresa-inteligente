import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/operaciones/productividad")({
  component: () => <ComingSoon title="Productividad" description="Rendimiento operacional por área." fase={3} />,
});
