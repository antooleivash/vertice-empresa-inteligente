import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/reclutamiento/candidatos")({
  component: () => <ComingSoon title="Candidatos" description="Pipeline de postulantes y entrevistas." fase={3} />,
});
