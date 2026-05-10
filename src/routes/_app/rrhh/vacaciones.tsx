import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VacacionPermiso } from "@/lib/domain";
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
import { Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rrhh/vacaciones")({ component: VacacionesPage });

const TIPOS: VacacionPermiso["tipo"][] = ["vacaciones", "permiso", "licencia_medica"];
const today = () => new Date().toISOString().slice(0, 10);
const empty: Partial<VacacionPermiso> = {
  empleado_id: "", tipo: "vacaciones", fecha_inicio: today(), fecha_fin: today(), dias: 1, estado: "pendiente",
};

const diasEntre = (a: string, b: string) => {
  const d1 = new Date(a).getTime(); const d2 = new Date(b).getTime();
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
};

function VacacionesPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [items, setItems] = useState<VacacionPermiso[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VacacionPermiso>>(empty);

  const load = async () => {
    const { data } = await supabase.from("vacaciones_permisos").select("*").order("fecha_inicio", { ascending: false });
    setItems((data as VacacionPermiso[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.empleado_id) return toast.error("Selecciona un empleado");
    const payload = { ...form, dias: diasEntre(form.fecha_inicio!, form.fecha_fin!) };
    const { error } = await supabase.from("vacaciones_permisos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Solicitud creada"); setOpen(false); setForm(empty); load();
  };

  const setEstado = async (id: string, estado: VacacionPermiso["estado"]) => {
    const { error } = await supabase.from("vacaciones_permisos").update({ estado }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("vacaciones_permisos").delete().eq("id", id); load();
  };

  const tone = (e: VacacionPermiso["estado"]) => ({
    pendiente: "bg-warning/20 text-warning-foreground",
    aprobado: "bg-success/15 text-success",
    rechazado: "bg-destructive/15 text-destructive",
  }[e]);

  return (
    <PageShell>
      <PageHeader
        title="Vacaciones y permisos"
        description="Gestión de ausencias justificadas del personal."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva solicitud</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva solicitud</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v: VacacionPermiso["tipo"]) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v: VacacionPermiso["estado"]) => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Inicio</Label><Input type="date" value={form.fecha_inicio ?? ""} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={form.fecha_fin ?? ""} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></div>
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
              <TableHead>Empleado</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Inicio</TableHead><TableHead>Fin</TableHead>
              <TableHead>Días</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{empleadosMap.get(v.empleado_id)?.nombre ?? "—"}</TableCell>
                <TableCell className="capitalize">{v.tipo.replace("_", " ")}</TableCell>
                <TableCell>{formatDate(v.fecha_inicio)}</TableCell>
                <TableCell>{formatDate(v.fecha_fin)}</TableCell>
                <TableCell>{v.dias}</TableCell>
                <TableCell><Badge className={tone(v.estado)}>{v.estado}</Badge></TableCell>
                <TableCell className="text-right">
                  {v.estado === "pendiente" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => setEstado(v.id, "aprobado")} title="Aprobar"><Check className="h-4 w-4 text-success" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEstado(v.id, "rechazado")} title="Rechazar"><X className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin solicitudes.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
