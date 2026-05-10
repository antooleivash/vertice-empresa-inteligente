import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpleado } from "@/hooks/use-current-empleado";
import { formatDate } from "@/lib/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, FileText, Check, X } from "lucide-react";

export const Route = createFileRoute("/portal/documentos")({ component: PortalDocumentos });

const DOCS = ["Contrato firmado", "Reglamento interno", "ODI firmada", "Liquidaciones al día"];

type Contrato = { id: string; tipo: string; fecha_inicio: string; fecha_vencimiento: string | null };
type Doc = { id: string; tipo_documento: string; entregado: boolean; fecha_entrega: string | null };

function PortalDocumentos() {
  const { empleado } = useCurrentEmpleado();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!empleado) return;
    supabase.from("contratos").select("id,tipo,fecha_inicio,fecha_vencimiento")
      .eq("empleado_id", empleado.id)
      .order("fecha_inicio", { ascending: false })
      .then(({ data }) => setContratos((data as Contrato[]) ?? []));
    supabase.from("documentos_legales").select("id,tipo_documento,entregado,fecha_entrega")
      .eq("empleado_id", empleado.id)
      .then(({ data }) => setDocs((data as Doc[]) ?? []));
  }, [empleado?.id]);

  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Mis contratos</h2>
        <div className="space-y-2">
          {contratos.map((c) => (
            <Card key={c.id} className="p-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.tipo}</div>
                <div className="text-[11px] text-muted-foreground">
                  Desde {formatDate(c.fecha_inicio)} {c.fecha_vencimiento ? `· hasta ${formatDate(c.fecha_vencimiento)}` : "· indefinido"}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.open(`/print/contrato/${c.id}`, "_blank")}>
                <FileDown className="h-4 w-4" />
              </Button>
            </Card>
          ))}
          {contratos.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">Sin contrato registrado.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Mis documentos</h2>
        <Card className="divide-y">
          {DOCS.map((tipo) => {
            const d = docs.find((x) => x.tipo_documento === tipo && x.entregado);
            return (
              <div key={tipo} className="flex items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {d ? <Check className="h-4 w-4 text-success shrink-0" /> : <X className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="text-sm">{tipo}</div>
                </div>
                {d
                  ? <Badge className="bg-success/15 text-success">Firmado · {formatDate(d.fecha_entrega)}</Badge>
                  : <Badge variant="outline">Pendiente</Badge>}
              </div>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
