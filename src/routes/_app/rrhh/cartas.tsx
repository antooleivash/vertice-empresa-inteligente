import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Carta } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import { useEmpleados } from "@/hooks/use-empleados";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/status-pill";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rrhh/cartas")({ component: CartasPage });

const TIPOS: Carta["tipo"][] = ["amonestacion", "advertencia", "felicitacion"];
const empty: Partial<Carta> = {
  empleado_id: "", fecha: new Date().toISOString().slice(0, 10), tipo: "amonestacion", motivo: "", contenido: "",
};

function CartasPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [items, setItems] = useState<Carta[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Carta>>(empty);

  const load = async () => {
    const { data } = await supabase.from("cartas").select("*").order("fecha", { ascending: false });
    setItems((data as Carta[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.empleado_id || !form.motivo) return toast.error("Empleado y motivo son obligatorios");
    const { error } = await supabase.from("cartas").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Carta registrada"); setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("cartas").delete().eq("id", id); load();
  };

  const print = (id: string) => window.open(`/print/carta/${id}`, "_blank");

  const tone = (t: Carta["tipo"]) => ({
    amonestacion: "bg-destructive/15 text-destructive",
    advertencia: "bg-warning/20 text-warning-foreground",
    felicitacion: "bg-success/15 text-success",
  }[t]);

  return (
    <PageShell>
      <PageHeader
        title="Cartas de amonestación"
        description="Documentos formales emitidos al personal."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva carta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva carta</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v: Carta["tipo"]) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Motivo</Label><Input value={form.motivo ?? ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Contenido</Label><Textarea rows={5} value={form.contenido ?? ""} onChange={(e) => setForm({ ...form, contenido: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Motivo</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{formatDate(c.fecha)}</TableCell>
                <TableCell>{empleadosMap.get(c.empleado_id)?.nombre ?? "—"}</TableCell>
                <TableCell><StatusPill label={c.tipo} /></TableCell>
                <TableCell className="max-w-md truncate">{c.motivo}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => print(c.id)}><Printer className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Sin cartas.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
