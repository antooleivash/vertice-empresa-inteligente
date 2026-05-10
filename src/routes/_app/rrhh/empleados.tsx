import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado } from "@/lib/domain";
import { AREAS, formatCLP, formatDate } from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/status-pill";
import { Pencil, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useIndicadores } from "@/hooks/use-indicadores";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/rrhh/empleados")({ component: EmpleadosPage });

const empty: Partial<Empleado> = {
  rut: "", nombre: "", cargo: "", area: AREAS[0], fecha_ingreso: new Date().toISOString().slice(0, 10),
  sueldo_base: 0, activo: true, rol: "empleado", email: "",
};

function EmpleadosPage() {
  const [items, setItems] = useState<Empleado[]>([]);
  const { data: indicadores } = useIndicadores();
  const salarioMinimo = indicadores.sueldo_minimo?.valor;
  const bajoMinimo = salarioMinimo
    ? items.filter((e) => e.activo && e.sueldo_base > 0 && e.sueldo_base < salarioMinimo)
    : [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Empleado>>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("empleados").select("*").order("nombre");
    if (error) toast.error(error.message);
    setItems((data as Empleado[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.nombre || !form.rut) return toast.error("RUT y nombre son obligatorios");
    if (editing) {
      const { error } = await supabase.from("empleados").update(form).eq("id", editing);
      if (error) return toast.error(error.message);
      toast.success("Empleado actualizado");
    } else {
      const { error } = await supabase.from("empleados").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Empleado creado");
    }
    setOpen(false); setForm(empty); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar empleado?")) return;
    const { error } = await supabase.from("empleados").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Empleado eliminado"); load();
  };

  const edit = (e: Empleado) => {
    setForm(e); setEditing(e.id); setOpen(true);
  };

  return (
    <PageShell>
      <PageHeader
        title="Empleados"
        description="Catálogo maestro de la dotación activa e histórica."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditing(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Nuevo empleado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar empleado" : "Nuevo empleado"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RUT"><Input value={form.rut ?? ""} onChange={(e) => setForm({ ...form, rut: e.target.value })} placeholder="12.345.678-9" /></Field>
                <Field label="Nombre"><Input value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
                <Field label="Cargo"><Input value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Field>
                <Field label="Área">
                  <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha ingreso"><Input type="date" value={form.fecha_ingreso ?? ""} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} /></Field>
                <Field label="Sueldo base">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.sueldo_base ? new Intl.NumberFormat("es-CL").format(form.sueldo_base) : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, sueldo_base: digits ? parseInt(digits, 10) : 0 });
                    }}
                    placeholder="550.000"
                  />
                </Field>
                <Field label="Activo">
                  <Select value={form.activo === false ? "false" : "true"} onValueChange={(v) => setForm({ ...form, activo: v === "true" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Email (acceso al portal)">
                  <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="empleado@empresa.cl" />
                </Field>
                <Field label="Rol">
                  <Select value={form.rol ?? "empleado"} onValueChange={(v) => setForm({ ...form, rol: v as Empleado["rol"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Admin / RRHH</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit}>{editing ? "Guardar" : "Crear"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {bajoMinimo.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>ALERTA: Empleados con sueldo bajo el mínimo legal ({formatCLP(salarioMinimo!)})</AlertTitle>
          <AlertDescription>
            {bajoMinimo.map((e) => e.nombre).join(", ")} — Riesgo de multa de la Dirección del Trabajo. Ajusta el sueldo base al mínimo vigente.
          </AlertDescription>
        </Alert>
      )}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RUT</TableHead><TableHead>Nombre</TableHead><TableHead>Cargo</TableHead>
              <TableHead>Área</TableHead><TableHead>Ingreso</TableHead>
              <TableHead className="text-right">Sueldo base</TableHead>
              <TableHead>Estado</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.rut}</TableCell>
                <TableCell className="font-medium">{e.nombre}</TableCell>
                <TableCell>{e.cargo}</TableCell>
                <TableCell>{e.area}</TableCell>
                <TableCell>{formatDate(e.fecha_ingreso)}</TableCell>
                <TableCell className="text-right">{formatCLP(e.sueldo_base)}</TableCell>
                <TableCell>
                  <StatusPill label={e.activo ? "Activo" : "Inactivo"} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => edit(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Sin empleados registrados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
