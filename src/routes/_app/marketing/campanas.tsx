import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCLP } from "@/lib/domain";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/marketing/campanas")({ component: CampanasPage });

type Camp = { id: string; nombre: string; canal: "Email" | "LinkedIn" | "Google Ads" | "Meta" | "Indeed"; objetivo: "Reclutamiento" | "Marca" | "Ventas"; estado: "activa" | "pausada" | "finalizada"; presupuesto: number; gastado: number; impresiones: number; clicks: number; conversiones: number };

const SEED: Camp[] = [
  { id: "1", nombre: "Reclutamiento Salmonera Q2", canal: "LinkedIn", objetivo: "Reclutamiento", estado: "activa", presupuesto: 1500000, gastado: 920000, impresiones: 84500, clicks: 2310, conversiones: 47 },
  { id: "2", nombre: "Marca empleadora Norte", canal: "Meta", objetivo: "Marca", estado: "activa", presupuesto: 800000, gastado: 410000, impresiones: 162000, clicks: 3840, conversiones: 21 },
  { id: "3", nombre: "Servicios B2B Logística", canal: "Google Ads", objetivo: "Ventas", estado: "pausada", presupuesto: 2200000, gastado: 1180000, impresiones: 51200, clicks: 1740, conversiones: 38 },
];

function CampanasPage() {
  const [items, setItems] = useState<Camp[]>(SEED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Camp>>({ canal: "LinkedIn", objetivo: "Reclutamiento", estado: "activa", presupuesto: 500000 });

  const generarIA = () => {
    const sugerencias = ["Atrae operadores expertos en Patagonia", "Únete al equipo logístico líder del país", "Crece con la mejor empresa salmonera"];
    setForm({ ...form, nombre: sugerencias[Math.floor(Math.random() * sugerencias.length)] });
    toast.success("Sugerencia IA generada");
  };

  const crear = () => {
    if (!form.nombre) return toast.error("Nombre requerido");
    setItems([{ id: crypto.randomUUID(), nombre: form.nombre!, canal: form.canal as Camp["canal"], objetivo: form.objetivo as Camp["objetivo"], estado: "activa", presupuesto: Number(form.presupuesto ?? 0), gastado: 0, impresiones: 0, clicks: 0, conversiones: 0 }, ...items]);
    setOpen(false); toast.success("Campaña creada");
  };

  const chart = items.map((c) => ({ name: c.nombre.slice(0, 18), conversiones: c.conversiones, clicks: c.clicks }));

  return (
    <PageShell>
      <PageHeader title="Campañas IA" description="Marketing y reclutamiento asistido por IA, con métricas en vivo." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva campaña</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear campaña</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nombre</Label>
                <div className="flex gap-2">
                  <Input value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  <Button type="button" variant="outline" size="icon" onClick={generarIA}><Sparkles className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Canal</Label>
                  <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v as Camp["canal"] })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Email", "LinkedIn", "Google Ads", "Meta", "Indeed"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Objetivo</Label>
                  <Select value={form.objetivo} onValueChange={(v) => setForm({ ...form, objetivo: v as Camp["objetivo"] })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Reclutamiento", "Marca", "Ventas"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div><Label>Presupuesto (CLP)</Label><Input type="number" value={form.presupuesto ?? 0} onChange={(e) => setForm({ ...form, presupuesto: Number(e.target.value) })} /></div>
            </div>
            <DialogFooter><Button onClick={crear}>Crear</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Activas</div><div className="text-2xl font-semibold mt-1">{items.filter((c) => c.estado === "activa").length}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Inversión total</div><div className="text-2xl font-semibold mt-1">{formatCLP(items.reduce((s, c) => s + c.gastado, 0))}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Conversiones</div><div className="text-2xl font-semibold mt-1">{items.reduce((s, c) => s + c.conversiones, 0)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">CTR promedio</div><div className="text-2xl font-semibold mt-1">{(items.reduce((s, c) => s + (c.impresiones ? c.clicks / c.impresiones : 0), 0) / Math.max(items.length, 1) * 100).toFixed(2)}%</div></Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="text-sm font-medium mb-3">Conversiones por campaña</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="conversiones" fill="var(--color-chart-1)" /></BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((c) => {
          const pct = c.presupuesto ? Math.round((c.gastado / c.presupuesto) * 100) : 0;
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold">{c.nombre}</div>
                  <div className="text-xs text-muted-foreground">{c.canal} · {c.objetivo}</div>
                </div>
                <Badge variant={c.estado === "activa" ? "default" : c.estado === "pausada" ? "secondary" : "outline"}>{c.estado}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-1">Presupuesto {formatCLP(c.gastado)} / {formatCLP(c.presupuesto)}</div>
              <Progress value={pct} className="mb-3" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="font-semibold text-sm">{c.impresiones.toLocaleString()}</div><div className="text-muted-foreground">Impr.</div></div>
                <div><div className="font-semibold text-sm">{c.clicks.toLocaleString()}</div><div className="text-muted-foreground">Clicks</div></div>
                <div><div className="font-semibold text-sm">{c.conversiones}</div><div className="text-muted-foreground">Conv.</div></div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
