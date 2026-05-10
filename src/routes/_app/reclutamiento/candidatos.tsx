import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/reclutamiento/candidatos")({ component: CandidatosPage });

const ETAPAS = ["Postulado", "Filtrado", "Entrevista", "Oferta", "Contratado"] as const;
type Etapa = typeof ETAPAS[number];
type Cand = { id: string; nombre: string; cargo: string; score: number; etapa: Etapa; experiencia: number; ubicacion: string };

const SEED: Cand[] = [
  { id: "1", nombre: "Carolina Pérez", cargo: "Operador Salmonera Senior", score: 92, etapa: "Entrevista", experiencia: 6, ubicacion: "Puerto Montt" },
  { id: "2", nombre: "José Muñoz", cargo: "Operador Salmonera Senior", score: 78, etapa: "Filtrado", experiencia: 4, ubicacion: "Castro" },
  { id: "3", nombre: "María Soto", cargo: "Encargado de Bodega", score: 85, etapa: "Oferta", experiencia: 8, ubicacion: "Quintero" },
  { id: "4", nombre: "Pedro Rojas", cargo: "Encargado de Bodega", score: 64, etapa: "Postulado", experiencia: 2, ubicacion: "Valparaíso" },
  { id: "5", nombre: "Ana Vergara", cargo: "Analista de Mantenimiento", score: 95, etapa: "Contratado", experiencia: 10, ubicacion: "Antofagasta" },
  { id: "6", nombre: "Luis Hernández", cargo: "Analista de Mantenimiento", score: 71, etapa: "Postulado", experiencia: 3, ubicacion: "Calama" },
  { id: "7", nombre: "Sofía Díaz", cargo: "Operador Salmonera Senior", score: 88, etapa: "Entrevista", experiencia: 5, ubicacion: "Puerto Varas" },
];

function CandidatosPage() {
  const [items, setItems] = useState<Cand[]>(SEED);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => items.filter((c) => !q || c.nombre.toLowerCase().includes(q.toLowerCase()) || c.cargo.toLowerCase().includes(q.toLowerCase())), [items, q]);

  const avanzar = (id: string) => setItems((xs) => xs.map((c) => {
    if (c.id !== id) return c; const i = ETAPAS.indexOf(c.etapa); return i < ETAPAS.length - 1 ? { ...c, etapa: ETAPAS[i + 1] } : c;
  }));

  return (
    <PageShell>
      <PageHeader title="Pipeline de candidatos" description="Postulantes por etapa con score IA de afinidad al cargo." actions={
        <Input placeholder="Buscar candidato o cargo…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      } />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {ETAPAS.map((etapa) => {
          const cs = filtered.filter((c) => c.etapa === etapa);
          return (
            <div key={etapa} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-semibold">{etapa}</div>
                <Badge variant="outline">{cs.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {cs.map((c) => (
                  <Card key={c.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm leading-tight">{c.nombre}</div>
                      <Badge variant={c.score >= 85 ? "default" : c.score >= 70 ? "secondary" : "outline"}>{c.score}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{c.cargo}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.experiencia} años · {c.ubicacion}</div>
                    {c.etapa !== "Contratado" && (
                      <Button size="sm" variant="ghost" className="w-full mt-2 h-7 text-xs" onClick={() => avanzar(c.id)}>
                        Avanzar etapa <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </Card>
                ))}
                {cs.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Sin candidatos</div>}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
