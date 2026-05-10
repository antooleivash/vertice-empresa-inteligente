import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Asistencia } from "@/lib/domain";
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

export const Route = createFileRoute("/_app/rrhh/asistencia")({ component: AsistenciaPage });

const empty: Partial<Asistencia> = {
  empleado_id: "", fecha: new Date().toISOString().slice(0, 10),
  entrada: "08:00", salida: "17:00", estado: "presente",
};

const ESTADOS: Asistencia["estado"][] = ["presente", "ausente", "atraso", "licencia"];

function AsistenciaPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [items, setItems] = useState<Asistencia[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Asistencia>>(empty);

  const load = async () => {
    const { data } = await supabase.from("asistencia").select("*").order("fecha", { ascending: false }).limit(200);
    setItems((data as Asistencia[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.empleado_id) return toast.error("Selecciona un empleado");
    const { error } = await supabase.from("asistencia").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Registro de asistencia creado");
    setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar registro?")) return;
    await supabase.from("asistencia").delete().eq("id", id);
    load();
  };

  const tone = (s: Asistencia["estado"]) => ({
    presente: "bg-success/15 text-success",
    ausente: "bg-destructive/15 text-destructive",
    atraso: "bg-warning/20 text-warning-foreground",
    licencia: "bg-info/15 text-info",
  }[s]);

  return (
    <PageShell>
      <PageHeader
        title="Asistencia"
        description="Registro diario de marcas y estado por empleado."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar asistencia</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v: Asistencia["estado"]) => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Entrada</Label><Input type="time" value={form.entrada ?? ""} onChange={(e) => setForm({ ...form, entrada: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Salida</Label><Input type="time" value={form.salida ?? ""} onChange={(e) => setForm({ ...form, salida: e.target.value })} /></div>
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
              <TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Entrada</TableHead>
              <TableHead>Salida</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDate(a.fecha)}</TableCell>
                <TableCell>{empleadosMap.get(a.empleado_id)?.nombre ?? "—"}</TableCell>
                <TableCell>{a.entrada ?? "—"}</TableCell>
                <TableCell>{a.salida ?? "—"}</TableCell>
                <TableCell><Badge className={tone(a.estado)}>{a.estado}</Badge></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Sin registros.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
