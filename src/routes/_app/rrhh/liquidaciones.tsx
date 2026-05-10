import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Liquidacion } from "@/lib/domain";
import { formatCLP } from "@/lib/domain";
import { useEmpleados } from "@/hooks/use-empleados";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rrhh/liquidaciones")({ component: LiquidacionesPage });

const empty: Partial<Liquidacion> = {
  empleado_id: "", periodo: new Date().toISOString().slice(0, 7),
  sueldo_base: 0, bonos: 0, descuentos: 0, liquido: 0,
};

function LiquidacionesPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const [items, setItems] = useState<Liquidacion[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Liquidacion>>(empty);

  const load = async () => {
    const { data } = await supabase.from("liquidaciones").select("*").order("periodo", { ascending: false });
    setItems((data as Liquidacion[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const recalc = (p: Partial<Liquidacion>) => ({
    ...p, liquido: (Number(p.sueldo_base) || 0) + (Number(p.bonos) || 0) - (Number(p.descuentos) || 0),
  });

  const submit = async () => {
    if (!form.empleado_id) return toast.error("Selecciona un empleado");
    const payload = recalc(form);
    const { error } = await supabase.from("liquidaciones").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Liquidación creada"); setOpen(false); setForm(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("liquidaciones").delete().eq("id", id); load();
  };

  const print = (id: string) => window.open(`/print/liquidacion/${id}`, "_blank");

  return (
    <PageShell>
      <PageHeader
        title="Liquidaciones"
        description="Remuneraciones mensuales del personal."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva liquidación</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva liquidación</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => {
                    const e = empleados.find((x) => x.id === v);
                    setForm(recalc({ ...form, empleado_id: v, sueldo_base: e?.sueldo_base ?? 0 }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Periodo</Label><Input type="month" value={form.periodo ?? ""} onChange={(e) => setForm({ ...form, periodo: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Sueldo base</Label><Input type="number" value={form.sueldo_base ?? 0} onChange={(e) => setForm(recalc({ ...form, sueldo_base: Number(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label>Bonos</Label><Input type="number" value={form.bonos ?? 0} onChange={(e) => setForm(recalc({ ...form, bonos: Number(e.target.value) }))} /></div>
                <div className="space-y-1.5"><Label>Descuentos</Label><Input type="number" value={form.descuentos ?? 0} onChange={(e) => setForm(recalc({ ...form, descuentos: Number(e.target.value) }))} /></div>
                <div className="col-span-2 rounded-md bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Líquido a pagar:</span>{" "}
                  <span className="font-semibold">{formatCLP(form.liquido ?? 0)}</span>
                </div>
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
              <TableHead>Periodo</TableHead><TableHead>Empleado</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Bonos</TableHead>
              <TableHead className="text-right">Descuentos</TableHead>
              <TableHead className="text-right">Líquido</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.periodo}</TableCell>
                <TableCell>{empleadosMap.get(l.empleado_id)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCLP(l.sueldo_base)}</TableCell>
                <TableCell className="text-right">{formatCLP(l.bonos)}</TableCell>
                <TableCell className="text-right">{formatCLP(l.descuentos)}</TableCell>
                <TableCell className="text-right font-medium">{formatCLP(l.liquido)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => print(l.id)}><Printer className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin liquidaciones.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
