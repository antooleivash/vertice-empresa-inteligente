import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AREAS, formatCLP } from "@/lib/domain";
import { Briefcase, MapPin, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reclutamiento/ofertas")({ component: OfertasPage });

type Oferta = { id: string; titulo: string; area: string; ubicacion: string; sueldo: number; descripcion: string; estado: "abierta" | "cerrada" | "pausada"; postulantes: number; creada: string };

const SEED: Oferta[] = [
  { id: "1", titulo: "Operador Salmonera Senior", area: "Producción", ubicacion: "Puerto Montt", sueldo: 950000, descripcion: "Operación de centros de cultivo, manejo de redes y alimentación.", estado: "abierta", postulantes: 24, creada: "2026-04-12" },
  { id: "2", titulo: "Encargado de Bodega", area: "Logística", ubicacion: "Quintero", sueldo: 780000, descripcion: "Control de inventario, despachos y recepción de carga.", estado: "abierta", postulantes: 12, creada: "2026-04-20" },
  { id: "3", titulo: "Analista de Mantenimiento", area: "Mantenimiento", ubicacion: "Antofagasta", sueldo: 1200000, descripcion: "Mantenimiento preventivo y correctivo de equipos industriales.", estado: "pausada", postulantes: 7, creada: "2026-03-30" },
];

function OfertasPage() {
  const [items, setItems] = useState<Oferta[]>(SEED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Oferta>>({ area: AREAS[0], estado: "abierta", sueldo: 0 });

  const crear = () => {
    if (!form.titulo) return toast.error("Título requerido");
    setItems([{ id: crypto.randomUUID(), titulo: form.titulo!, area: form.area!, ubicacion: form.ubicacion ?? "—", sueldo: Number(form.sueldo ?? 0), descripcion: form.descripcion ?? "", estado: (form.estado as Oferta["estado"]) ?? "abierta", postulantes: 0, creada: new Date().toISOString().slice(0, 10) }, ...items]);
    setOpen(false); setForm({ area: AREAS[0], estado: "abierta", sueldo: 0 });
    toast.success("Oferta publicada");
  };

  return (
    <PageShell>
      <PageHeader title="Ofertas laborales" description="Publicación y gestión de vacantes activas." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva oferta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Publicar oferta</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Título</Label><Input value={form.titulo ?? ""} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Área</Label>
                  <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Ubicación</Label><Input value={form.ubicacion ?? ""} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
              </div>
              <div><Label>Sueldo bruto (CLP)</Label><Input type="number" value={form.sueldo ?? 0} onChange={(e) => setForm({ ...form, sueldo: Number(e.target.value) })} /></div>
              <div><Label>Descripción</Label><Textarea rows={4} value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={crear}>Publicar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Ofertas activas</div><div className="text-2xl font-semibold mt-1">{items.filter((i) => i.estado === "abierta").length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Postulantes totales</div><div className="text-2xl font-semibold mt-1">{items.reduce((s, i) => s + i.postulantes, 0)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Sueldo promedio</div><div className="text-2xl font-semibold mt-1">{formatCLP(items.reduce((s, i) => s + i.sueldo, 0) / Math.max(items.length, 1))}</div></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((o) => (
          <Card key={o.id} className="p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold leading-tight">{o.titulo}</div>
              <Badge variant={o.estado === "abierta" ? "default" : o.estado === "pausada" ? "secondary" : "outline"}>{o.estado}</Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{o.area}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{o.ubicacion}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{o.descripcion}</p>
            <div className="flex items-center justify-between mt-auto pt-3 border-t">
              <div className="text-sm font-medium">{formatCLP(o.sueldo)}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{o.postulantes} postulantes</div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
