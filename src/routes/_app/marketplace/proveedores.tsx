import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/marketplace/proveedores")({
  component: () => <ComingSoon title="Proveedores" description="Red de proveedores certificados." fase={3} />,
});
