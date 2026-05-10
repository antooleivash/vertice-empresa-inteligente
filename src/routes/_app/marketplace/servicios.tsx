import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCLP } from "@/lib/domain";
import { ShoppingCart, Tag } from "lucide-react";
import { toast } from "sonner">

export const Route = createFileRoute("/_app/marketplace/servicios")({ component: ServiciosPage });

type Serv = { id: string; nombre: string; categoria: string; proveedor: string; precio: number; unidad: string; descripcion: string };

const CATS = ["Capacitación", "Consultoría", "Outsourcing", "Software", "Auditoría", "Salud ocupacional"] as const;

const SEED: Serv[] = [
  { id: "1", nombre: "Capacitación Ley Karin", categoria: "Capacitación", proveedor: "Centro de Formación Norte", precio: 280000, unidad: "/grupo 20 pers.", descripcion: "Programa SENCE de prevención de acoso laboral y sexual." },
  { id: "2", nombre: "Asesoría Compliance Operacional", categoria: "Consultoría", proveedor: "Consultora Andina", precio: 1800000, unidad: "/mes", descripcion: "Cumplimiento normativo SUSESO, DT y SEC." },
  { id: "3", nombre: "Externalización de Remuneraciones", categoria: "Outsourcing", proveedor: "Payroll Chile", precio: 4500, unidad: "/colaborador/mes", descripcion: "Procesamiento de liquidaciones, F30 y previred." },
  { id: "4", nombre: "Sistema de Seguridad SST", categoria: "Software", proveedor: "SafeOps SpA", precio: 350000, unidad: "/mes", descripcion: "Reportabilidad de incidentes y near-miss." },
  { id: "5", nombre: "Auditoría Financiera Anual", categoria: "Auditoría", proveedor: "BDO Chile", precio: 8500000, unidad: "/proyecto", descripcion: "Auditoría externa según normas IFRS." },
  { id: "6", nombre: "Exámenes Pre-ocupacionales", categoria: "Salud ocupacional", proveedor: "Mutual de Seguridad", precio: 45000, unidad: "/persona", descripcion: "Batería completa según riesgo ocupacional." },
];

function ServiciosPage() {
  const [items] = useState<Serv[]>(SEED);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("todas");

  const filtered = useMemo(() => items.filter((s) =>
    (cat === "todas" || s.categoria === cat) && (!q || s.nombre.toLowerCase().includes(q.toLowerCase()) || s.proveedor.toLowerCase().includes(q.toLowerCase()))
  ), [items, q, cat]);

  return (
    <PageShell>
      <PageHeader title="Marketplace de servicios" description="Servicios B2B contratables para tu operación." actions={
        <div className="flex gap-2">
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
          <Select value={cat} onValueChange={setCat}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas las categorías</SelectItem>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Card key={s.id} className="p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold leading-tight">{s.nombre}</div>
              <Badge variant="outline"><Tag className="h-3 w-3 mr-1" />{s.categoria}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{s.proveedor}</div>
            <p className="text-sm text-muted-foreground line-clamp-2">{s.descripcion}</p>
            <div className="flex items-center justify-between mt-auto pt-3 border-t">
              <div>
                <div className="text-lg font-semibold">{formatCLP(s.precio)}</div>
                <div className="text-xs text-muted-foreground">{s.unidad}</div>
              </div>
              <Button size="sm" onClick={() => toast.success("Servicio agregado a solicitudes")}><ShoppingCart className="h-3 w-3 mr-1" />Contratar</Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12 text-sm">Sin resultados</div>}
      </div>
    </PageShell>
  );
}
