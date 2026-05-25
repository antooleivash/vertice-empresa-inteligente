import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/page-shell";
import { PuntosFidelizacionPanel } from "@/components/puntos-fidelizacion-panel";

export const Route = createFileRoute("/_app/puntos-fidelizacion")({ component: PuntosFidelizacionPage });

function PuntosFidelizacionPage() {
  return (
    <PageShell>
      <PageHeader
        title="Puntos fidelización"
        description="Programa de fidelización para clientes recurrentes."
      />
      <PuntosFidelizacionPanel showHeaderActions />
    </PageShell>
  );
}
