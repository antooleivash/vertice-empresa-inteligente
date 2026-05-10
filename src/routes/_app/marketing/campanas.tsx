import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/marketing/campanas")({
  component: () => <ComingSoon title="Campañas IA" description="Campañas de marketing asistidas por IA." fase={3} />,
});
