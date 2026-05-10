import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/ia/alertas")({
  component: () => <ComingSoon title="Alertas automáticas" description="Detección de patrones anómalos en RRHH y operaciones." fase={2} />,
});
