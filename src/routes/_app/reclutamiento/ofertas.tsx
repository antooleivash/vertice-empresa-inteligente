import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/reclutamiento/ofertas")({
  component: () => <ComingSoon title="Ofertas laborales" description="Publicación y gestión de vacantes." fase={3} />,
});
