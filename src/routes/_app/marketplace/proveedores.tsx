import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/marketplace/proveedores")({ component: ProveedoresPage });

type Prov = { id: string; nombre: string; rubro: string; ciudad: string; rating: number; trabajos: number; certificado: boolean; telefono: string };

const RUBROS = ["Mantenimiento", "Logística", "Seguridad", "Alimentación", "EPP", "Transporte", "TI"] as const;

const SEED: Prov[] = [
  { id: "1", nombre: "Servicios Marinos del Sur SpA", rubro: "Mantenimiento", ciudad: "Puerto Montt", rating: 4.8, trabajos: 142, certificado: true, telefono: "+56 65 222 3344" },
  { id: "2", nombre: "Logística Andina Ltda.", rubro: "Logística", ciudad: "Antofagasta", rating: 4.6, trabajos: 98, certificado: true, telefono: "+56 55 244 1100" },
  { id: "3", nombre: "Securitas Norte", rubro: "Seguridad", ciudad: "Iquique", rating: 4.4, trabajos: 76, certificado: true, telefono: "+56 57 233 5511" },
  { id: "4", nombre: "EPP Chile Distribuidora", rubro: "EPP", ciudad: "Santiago", rating: 4.7, trabajos: 210, certificado: true, telefono: "+56 2 2333 4455" },
  { id: "5", nombre: "Transportes Patagonia", rubro: "Transporte", ciudad: "Punta Arenas", rating: 4.2, trabajos: 54, certificado: false, telefono: "+56 61 222 7788" },
  { id: "6", nombre: "Casino Industrial Pacífico", rubro: "Alimentación", ciudad: "Valparaíso", rating: 4.5, trabajos: 88, certificado: true, telefono: "+56 32 244 9988" },
  { id: "7", nombre: "TI Operacional Chile", rubro: "TI", ciudad: "Concepción", rating: 4.9, trabajos: 36, certificado: true, telefono: "+56 41 233 1122" },
];

function ProveedoresPage() {
  const [items] = useState<Prov[]>(SEED);
  const [q, setQ] = useState("");
  const [rubro, setRubro] = useState<string>("todos");

  const filtered = useMemo(() => items.filter((p) =>
    (rubro === "todos" || p.rubro === rubro) && (!q || p.nombre.toLowerCase().includes(q.toLowerCase()) || p.ciudad.toLowerCase().includes(q.toLowerCase()))
  ), [items, q, rubro]);

  return (
    <PageShell>
      <PageHeader title="Red de proveedores" description="Marketplace de proveedores certificados para empresas operacionales." actions={
        <div className="flex gap-2">
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
          <Select value={rubro} onValueChange={setRubro}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos los rubros</SelectItem>{RUBROS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Proveedores</div><div className="text-2xl font-semibold mt-1">{items.length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Certificados</div><div className="text-2xl font-semibold mt-1">{items.filter((i) => i.certificado).length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Rating promedio</div><div className="text-2xl font-semibold mt-1">{(items.reduce((s, i) => s + i.rating, 0) / items.length).toFixed(1)}</div></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold leading-tight">{p.nombre}</div>
              {p.certificado && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <Badge variant="outline" className="w-fit">{p.rubro}</Badge>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.ciudad}</div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{p.rating}</span>
              <span className="text-muted-foreground text-xs">· {p.trabajos} trabajos</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefono}</div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => toast.success("Solicitud de cotización enviada")}>Solicitar cotización</Button>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12 text-sm">Sin resultados</div>}
      </div>
    </PageShell>
  );
}
