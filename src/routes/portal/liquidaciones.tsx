import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpleado } from "@/hooks/use-current-empleado";
import type { Liquidacion } from "@/lib/domain";
import { formatCLP } from "@/lib/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_portal/liquidaciones")({ component: PortalLiquidaciones });

function PortalLiquidaciones() {
  const { empleado } = useCurrentEmpleado();
  const [items, setItems] = useState<Liquidacion[]>([]);

  useEffect(() => {
    if (!empleado) return;
    supabase.from("liquidaciones").select("*").eq("empleado_id", empleado.id)
      .order("periodo", { ascending: false })
      .then(({ data }) => setItems((data as Liquidacion[]) ?? []));
  }, [empleado?.id]);

  return (
    <div className="space-y-3">
      {items.map((l) => (
        <Card key={l.id} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-muted-foreground uppercase">{l.periodo}</div>
              <div className="text-lg font-semibold">{formatCLP(l.liquido)}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.open(`/print/liquidacion/${l.id}`, "_blank")}>
              <Printer className="h-4 w-4 mr-1.5" /> PDF
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><div className="text-muted-foreground">Base</div><div>{formatCLP(l.sueldo_base)}</div></div>
            <div><div className="text-muted-foreground">Bonos</div><div>+{formatCLP(l.bonos)}</div></div>
            <div><div className="text-muted-foreground">Descuentos</div><div>-{formatCLP(l.descuentos)}</div></div>
          </div>
        </Card>
      ))}
      {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-10">Sin liquidaciones aún.</div>}
    </div>
  );
}
