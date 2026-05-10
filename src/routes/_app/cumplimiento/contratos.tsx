import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleados } from "@/hooks/use-empleados";
import { formatCLP, formatDate } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cumplimiento/contratos")({ component: ContratosPage });

const TIPOS = ["Indefinido", "Plazo fijo", "Obra y faena"] as const;

type Contrato = {
  id: string; empleado_id: string; tipo: string;
  fecha_inicio: string; fecha_vencimiento: string | null;
  cargo: string; sueldo_base: number; estado: string; created_at?: string;
};

function estadoContrato(c: Contrato): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; days: number | null } {
  if (!c.fecha_vencimiento) return { label: "Vigente", variant: "default", days: null };
  const days = Math.ceil((new Date(c.fecha_vencimiento).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Vencido", variant: "destructive", days };
  if (days < 30) return { label: "Por vencer", variant: "outline", days };
  return { label: "Vigente", variant: "default", days };
}

function ContratosPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [items, setItems] = useState<Contrato[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Contrato>>({
    tipo: TIPOS[0], fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: "", cargo: "", sueldo_base: 0,
  });

  const load = async () => {
    const { data } = await supabase.from("contratos").select("*").order("fecha_inicio", { ascending: false });
    setItems((data as Contrato[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    let vencidos = 0, porVencer = 0, vigentes = 0;
    items.forEach((c) => {
      const e = estadoContrato(c);
      if (e.label === "Vencido") vencidos++;
      else if (e.label === "Por vencer") porVencer++;
      else vigentes++;
    });
    return { vencidos, porVencer, vigentes };
  }, [items]);

  const submit = async () => {
    if (!form.empleado_id || !form.fecha_inicio) return toast.error("Empleado y fecha inicio requeridos");
    const payload = { ...form, fecha_vencimiento: form.fecha_vencimiento || null };
    const { error } = await supabase.from("contratos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Contrato registrado"); setOpen(false);
    setForm({ tipo: TIPOS[0], fecha_inicio: new Date().toISOString().slice(0, 10), fecha_vencimiento: "", cargo: "", sueldo_base: 0 });
    load();
  };
  const remove = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("contratos").delete().eq("id", id); load(); };

  return (
    <PageShell>
      <PageHeader
        title="Contratos de trabajo"
        description="Gestión de contratos según normativa de la Dirección del Trabajo."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar contrato</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo contrato</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Cargo</Label><Input value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio ?? ""} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Fecha vencimiento</Label><Input type="date" value={form.fecha_vencimiento ?? ""} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Sueldo base</Label><Input inputMode="numeric" value={form.sueldo_base ? new Intl.NumberFormat("es-CL").format(form.sueldo_base) : ""} onChange={(e) => setForm({ ...form, sueldo_base: parseInt(e.target.value.replace(/\D/g, "")) || 0 })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Vigentes</div><div className="text-2xl font-semibold">{stats.vigentes}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Por vencer (&lt;30 días)</div><div className="text-2xl font-semibold text-amber-600">{stats.porVencer}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground mb-1">Vencidos</div><div className="text-2xl font-semibold text-destructive">{stats.vencidos}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Tipo</TableHead><TableHead>Cargo</TableHead><TableHead>Inicio</TableHead><TableHead>Vencimiento</TableHead><TableHead className="text-right">Sueldo</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((c) => {
              const est = estadoContrato(c);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{empleadosMap.get(c.empleado_id)?.nombre ?? "—"}</TableCell>
                  <TableCell>{c.tipo}</TableCell>
                  <TableCell>{c.cargo || "—"}</TableCell>
                  <TableCell>{formatDate(c.fecha_inicio)}</TableCell>
                  <TableCell>{c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : "Indefinido"}</TableCell>
                  <TableCell className="text-right">{formatCLP(c.sueldo_base)}</TableCell>
                  <TableCell>
                    <Badge variant={est.variant}>{est.label}{est.days !== null && est.label === "Por vencer" ? ` (${est.days}d)` : ""}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => window.open(`/print/contrato/${c.id}`, "_blank")} title="Descargar contrato PDF"><FileDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground"><FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />Sin contratos registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
