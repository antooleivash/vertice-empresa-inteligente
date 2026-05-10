import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AFP_LIST, calcular, type ItemMonto, type LiqInput } from "@/lib/payroll";
import { useIndicadores } from "@/hooks/use-indicadores";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/rrhh/liquidaciones")({ component: LiquidacionesPage });

type Liq = {
  id: string; empleado_id: string; periodo: string;
  sueldo_base: number; bonos: number; descuentos: number; liquido: number;
  total_haberes?: number; total_descuentos?: number;
  afp?: string; salud?: string;
};

type Form = {
  empleado_id: string;
  periodo: string;
  sueldo_base: number;
  dias_trabajados: number;
  dias_inasistencia: number;
  horas_extras: number;
  asignacion_familiar: number;
  afp: string;
  salud: string;
  salud_monto: number;
  anticipo: number;
  uf_valor: number;
  otros_bonos: ItemMonto[];
  otros_descuentos: ItemMonto[];
};

const empty: Form = {
  empleado_id: "", periodo: new Date().toISOString().slice(0, 7),
  sueldo_base: 0, dias_trabajados: 30, dias_inasistencia: 0, horas_extras: 0,
  asignacion_familiar: 0, afp: "Habitat", salud: "Fonasa", salud_monto: 0,
  anticipo: 0, uf_valor: 39000, otros_bonos: [], otros_descuentos: [],
};

function LiquidacionesPage() {
  const { empleados, empleadosMap } = useEmpleados();
  const { data: indicadores } = useIndicadores();
  const ufActual = indicadores.uf?.valor;
  const utmActual = indicadores.utm?.valor;
  const salarioMinimo = indicadores.sueldo_minimo?.valor;
  const [items, setItems] = useState<Liq[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  // Sincroniza UF actual en el formulario apenas se carga
  useEffect(() => {
    if (ufActual && form.uf_valor !== Math.round(ufActual)) {
      setForm((f) => ({ ...f, uf_valor: Math.round(ufActual) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ufActual]);

  const bajoMinimo = salarioMinimo && form.sueldo_base > 0 && form.sueldo_base < salarioMinimo;
  const gratifMensualUTM = utmActual ? Math.round((utmActual * 4.75) / 12) : null;

  const load = async () => {
    const { data } = await supabase.from("liquidaciones").select("*").order("periodo", { ascending: false });
    setItems((data as Liq[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const calc = useMemo(() => {
    const input: LiqInput = {
      sueldo_base: form.sueldo_base, horas_extras: form.horas_extras,
      asignacion_familiar: form.asignacion_familiar, afp: form.afp,
      salud: form.salud, salud_monto: form.salud_monto, anticipo: form.anticipo,
      otros_bonos: form.otros_bonos, otros_descuentos: form.otros_descuentos,
    };
    return calcular(input);
  }, [form]);

  const submit = async () => {
    if (!form.empleado_id) return toast.error("Selecciona un empleado");
    const payload = {
      empleado_id: form.empleado_id, periodo: form.periodo,
      sueldo_base: form.sueldo_base,
      bonos: calc.gratificacion + form.horas_extras + (Array.isArray(form.otros_bonos) ? form.otros_bonos : []).reduce((s, b) => s + (b.monto || 0), 0),
      descuentos: calc.total_descuentos,
      liquido: calc.liquido,
      dias_trabajados: form.dias_trabajados,
      dias_inasistencia: form.dias_inasistencia,
      horas_extras: form.horas_extras,
      asignacion_familiar: form.asignacion_familiar,
      gratificacion: calc.gratificacion,
      afp: form.afp, salud: form.salud, salud_monto: form.salud_monto,
      anticipo: form.anticipo, uf_valor: form.uf_valor,
      cotiz_prevision: calc.cotiz_prevision, cotiz_salud: calc.cotiz_salud,
      seguro_cesantia: calc.seguro_cesantia, impuesto_unico: calc.impuesto_unico,
      total_haberes: calc.total_haberes, total_descuentos: calc.total_descuentos,
      otros_bonos: form.otros_bonos, otros_descuentos: form.otros_descuentos,
    };
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
        description="Remuneraciones mensuales con cálculos previsionales chilenos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nueva liquidación</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nueva liquidación</DialogTitle></DialogHeader>

              <Section title="Datos básicos">
                <div className="col-span-2">
                  <Label>Empleado</Label>
                  <Select value={form.empleado_id} onValueChange={(v) => {
                    const e = empleados.find((x) => x.id === v);
                    setForm({ ...form, empleado_id: v, sueldo_base: e?.sueldo_base ?? 0 });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Num label="Periodo" type="month" value={form.periodo} onChange={(v) => setForm({ ...form, periodo: v as string })} />
                <Num label="Sueldo base" value={form.sueldo_base} onChange={(v) => setForm({ ...form, sueldo_base: +v })} />
              </Section>

              <Section title="Asistencia">
                <Num label="Días trabajados" value={form.dias_trabajados} onChange={(v) => setForm({ ...form, dias_trabajados: +v })} />
                <Num label="Días inasistencia" value={form.dias_inasistencia} onChange={(v) => setForm({ ...form, dias_inasistencia: +v })} />
                <Num label="Horas extras (CLP)" value={form.horas_extras} onChange={(v) => setForm({ ...form, horas_extras: +v })} />
                <Num label="Asig. familiar" value={form.asignacion_familiar} onChange={(v) => setForm({ ...form, asignacion_familiar: +v })} />
              </Section>

              <Section title="Previsión y salud">
                <div>
                  <Label>AFP</Label>
                  <Select value={form.afp} onValueChange={(v) => setForm({ ...form, afp: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AFP_LIST.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Salud</Label>
                  <Select value={form.salud} onValueChange={(v) => setForm({ ...form, salud: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fonasa">Fonasa</SelectItem>
                      <SelectItem value="Isapre">Isapre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.salud === "Isapre" && (
                  <Num label="Monto Isapre" value={form.salud_monto} onChange={(v) => setForm({ ...form, salud_monto: +v })} />
                )}
                <Num label="Valor UF mes" value={form.uf_valor} onChange={(v) => setForm({ ...form, uf_valor: +v })} />
              </Section>

              <ListEditor
                title="Otros bonos imponibles"
                items={form.otros_bonos}
                onChange={(otros_bonos) => setForm({ ...form, otros_bonos })}
              />

              <Section title="Descuentos">
                <Num label="Anticipo de sueldo" value={form.anticipo} onChange={(v) => setForm({ ...form, anticipo: +v })} />
              </Section>

              <ListEditor
                title="Otros descuentos"
                items={form.otros_descuentos}
                onChange={(otros_descuentos) => setForm({ ...form, otros_descuentos })}
              />

              <div className="rounded-md bg-muted p-4 text-sm grid grid-cols-3 gap-3 mt-2">
                <div><div className="text-muted-foreground text-xs">Total haberes</div><div className="font-semibold">{formatCLP(calc.total_haberes)}</div></div>
                <div><div className="text-muted-foreground text-xs">Total descuentos</div><div className="font-semibold">{formatCLP(calc.total_descuentos)}</div></div>
                <div><div className="text-muted-foreground text-xs">Líquido a pagar</div><div className="font-bold text-base">{formatCLP(calc.liquido)}</div></div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  Gratificación: {formatCLP(calc.gratificacion)} · AFP: {formatCLP(calc.cotiz_prevision)} · Salud: {formatCLP(calc.cotiz_salud)} · Cesantía: {formatCLP(calc.seguro_cesantia)} · Impto Único: {formatCLP(calc.impuesto_unico)}
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
              <TableHead>Periodo</TableHead><TableHead>Empleado</TableHead><TableHead>AFP</TableHead><TableHead>Salud</TableHead>
              <TableHead className="text-right">Haberes</TableHead>
              <TableHead className="text-right">Descuentos</TableHead>
              <TableHead className="text-right">Líquido</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.periodo}</TableCell>
                <TableCell>{empleadosMap.get(l.empleado_id)?.nombre ?? "—"}</TableCell>
                <TableCell>{l.afp ?? "—"}</TableCell>
                <TableCell>{l.salud ?? "—"}</TableCell>
                <TableCell className="text-right">{formatCLP(l.total_haberes ?? l.sueldo_base + l.bonos)}</TableCell>
                <TableCell className="text-right">{formatCLP(l.total_descuentos ?? l.descuentos)}</TableCell>
                <TableCell className="text-right font-medium">{formatCLP(l.liquido)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => print(l.id)}><Printer className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Sin liquidaciones.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Num({ label, value, onChange, type = "number" }: { label: string; value: number | string; onChange: (v: string | number) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} />
    </div>
  );
}

function ListEditor({ title, items, onChange }: { title: string; items: ItemMonto[]; onChange: (i: ItemMonto[]) => void }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{title}</div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { concepto: "", monto: 0 }])}>
          <Plus className="h-3 w-3 mr-1" />Agregar
        </Button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 mb-1.5">
          <Input placeholder="Concepto" value={it.concepto} onChange={(e) => {
            const arr = [...items]; arr[i] = { ...arr[i], concepto: e.target.value }; onChange(arr);
          }} />
          <Input type="number" placeholder="Monto" className="w-32" value={it.monto} onChange={(e) => {
            const arr = [...items]; arr[i] = { ...arr[i], monto: Number(e.target.value) }; onChange(arr);
          }} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
