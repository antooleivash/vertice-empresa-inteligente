import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HoraExtra } from "@/lib/domain";
import { formatDate } from "@/lib/domain";
import { useEmpleados } from "@/hooks/use-empleados";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rrhh/horas-extras")({ component: HorasExtrasPage });

const empty: Partial<HoraExtra> = {
  empleado_id: "", fecha: new Date().toISOString().slice(0, 10), horas: 1, autorizadas: true, motivo: "",
};

function HorasExtrasPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [items, setItems] = useState<HoraExtra[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<HoraExtra>>(empty);

  const load = async () => {
    const { data } = await supabase.from("horas_extras").select("*").order("fecha", { ascending: false }).limit(200);
    setItems((data as HoraExtra[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.empleado_id) return toast.error("Selecciona un empleado");
    const { error } = await supabase.from("horas_extras").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Registro creado"); setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("horas_extras").delete().eq("id", id); load();
  };

  return (
    <PageShell>
      <PageHeader
        title="Horas extras"
        description="Control de tiempo extraordinario y autorización."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar horas extras</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Horas</Label><Input type="number" step="0.5" value={form.horas ?? 0} onChange={(e) => setForm({ ...form, horas: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Autorizadas</Label>
                  <Select value={String(form.autorizadas)} onValueChange={(v) => setForm({ ...form, autorizadas: v === "true" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Motivo</Label><Input value={form.motivo ?? ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
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
              <TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Horas</TableHead>
              <TableHead>Autorización</TableHead><TableHead>Motivo</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{formatDate(h.fecha)}</TableCell>
                <TableCell>{empleadosMap.get(h.empleado_id)?.nombre ?? "—"}</TableCell>
                <TableCell>{h.horas}</TableCell>
                <TableCell>{h.autorizadas
                  ? <Badge className="bg-success/15 text-success">Autorizada</Badge>
                  : <Badge className="bg-destructive/15 text-destructive">Sin autorizar</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{h.motivo ?? "—"}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin registros.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
