import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description, fase = 2 }: { title: string; description: string; fase?: number }) {
  return (
    <PageShell>
      <PageHeader title={title} description={description} />
      <Card className="p-12 text-center bg-primary-soft/40 border-dashed">
        <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
        <h3 className="text-lg font-semibold">Próximamente — Fase {fase}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
          Este módulo se entrega en la Fase {fase} del MVP de Vértice. Ya puedes navegar la estructura completa.
        </p>
      </Card>
    </PageShell>
  );
}
