import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/operaciones/turnos")({
  component: () => <ComingSoon title="Rendimiento por turno" description="Análisis de productividad por turno." fase={3} />,
});
