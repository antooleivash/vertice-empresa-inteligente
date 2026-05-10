import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/marketplace/servicios")({
  component: () => <ComingSoon title="Marketplace de servicios" description="Servicios disponibles para tu empresa." fase={3} />,
});
