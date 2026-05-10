import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleados } from "@/hooks/use-empleados";
import { formatDate } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, FileCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cumplimiento/documentos")({ component: DocumentosPage });

const DOCS = ["Contrato firmado", "Reglamento interno", "ODI firmada", "Liquidaciones al día"] as const;
type Doc = { id: string; empleado_id: string; tipo_documento: string; entregado: boolean; fecha_entrega: string | null };

function DocumentosPage() {
  const { empleados } = useEmpleados();
  const [docs, setDocs] = useState<Doc[]>([]);

  const load = async () => {
    const { data } = await supabase.from("documentos_legales").select("*");
    setDocs((data as Doc[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const has = (empId: string, tipo: string) => docs.find((d) => d.empleado_id === empId && d.tipo_documento === tipo && d.entregado);

  const toggle = async (empId: string, tipo: string) => {
    const existing = docs.find((d) => d.empleado_id === empId && d.tipo_documento === tipo);
    if (existing) {
      const { error } = await supabase.from("documentos_legales").update({
        entregado: !existing.entregado,
        fecha_entrega: !existing.entregado ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("documentos_legales").insert({
        empleado_id: empId, tipo_documento: tipo, entregado: true,
        fecha_entrega: new Date().toISOString().slice(0, 10),
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Actualizado"); load();
  };

  const stats = useMemo(() => {
    if (!empleados.length) return { promedio: 0, completos: 0 };
    let total = 0, completos = 0;
    empleados.forEach((e) => {
      const cnt = DOCS.filter((d) => has(e.id, d)).length;
      total += cnt;
      if (cnt === DOCS.length) completos++;
    });
    return { promedio: Math.round((total / (empleados.length * DOCS.length)) * 100), completos };
  }, [empleados, docs]);

  return (
    <PageShell>
      <PageHeader title="Documentos obligatorios" description="Checklist de documentación legal por trabajador." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Cumplimiento promedio</div><div className="text-2xl font-semibold">{stats.promedio}%</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Trabajadores 100% al día</div><div className="text-2xl font-semibold">{stats.completos} / {empleados.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Documentos requeridos</div><div className="text-2xl font-semibold">{DOCS.length}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b text-sm font-medium flex items-center gap-2"><FileCheck className="h-4 w-4" />Estado por trabajador</div>
        <div className="divide-y">
          {empleados.map((e) => {
            const cnt = DOCS.filter((d) => has(e.id, d)).length;
            const pct = Math.round((cnt / DOCS.length) * 100);
            return (
              <div key={e.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">{e.nombre}</div>
                    <div className="text-xs text-muted-foreground">{e.cargo} · {e.area}</div>
                  </div>
                  <div className="text-sm font-medium">{pct}%</div>
                </div>
                <Progress value={pct} className="mb-3 h-1.5" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {DOCS.map((d) => {
                    const doc = has(e.id, d);
                    return (
                      <Button key={d} variant={doc ? "default" : "outline"} size="sm" className="justify-start text-xs h-auto py-2" onClick={() => toggle(e.id, d)}>
                        {doc ? <Check className="h-3.5 w-3.5 mr-1.5 shrink-0" /> : <X className="h-3.5 w-3.5 mr-1.5 shrink-0 opacity-50" />}
                        <div className="text-left">
                          <div>{d}</div>
                          {doc && <div className="text-[10px] opacity-80">{formatDate(doc.fecha_entrega)}</div>}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {empleados.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">Sin empleados registrados.</div>}
        </div>
      </Card>
    </PageShell>
  );
}
