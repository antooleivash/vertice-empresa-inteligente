import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/marketing/contenido")({
  component: () => <ComingSoon title="Contenido IA" description="Generación de contenido empresarial." fase={3} />,
});
