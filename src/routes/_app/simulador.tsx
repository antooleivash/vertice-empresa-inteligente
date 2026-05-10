import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCLP } from "@/lib/domain";
import { useLocalList, uid } from "@/lib/local-store";
import { Plus, Pencil, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/simulador")({ component: SimuladorPage });

type Item = {
  id: string;
  nombre: string;
  tipo: "Producto" | "Servicio";
  precio_venta: number;
  costo_variable: number;
  unidad: string;
};

const UNIDADES = ["Unidad", "Hora", "Mes", "Kg", "Lt", "Caja", "Servicio"];

function SimuladorPage() {
  const [items, setItems] = useLocalList<Item>("vertice.simulador.items", []);
  const [ingresos] = useLocalList<{ valor: number; fecha: string }>("vertice.balance.ingresos", []);
  const [costos] = useLocalList<{ valor: number; fecha: string }>("vertice.balance.costos", []);

  return (
    <PageShell>
      <PageHeader
        title="Simulador financiero"
        description="Proyecta precios, escenarios, flujo de caja y punto de equilibrio con IA."
      />

      <ProductosSection items={items} setItems={setItems} />

      <Tabs defaultValue="precios" className="mt-6">
        <TabsList>
          <TabsTrigger value="precios">Proyección de precios</TabsTrigger>
          <TabsTrigger value="escenarios">Escenarios de ventas</TabsTrigger>
          <TabsTrigger value="flujo">Flujo de caja</TabsTrigger>
          <TabsTrigger value="equilibrio">Punto de equilibrio</TabsTrigger>
        </TabsList>

        <TabsContent value="precios" className="mt-5">
          <ProyeccionPreciosTab items={items} />
        </TabsContent>
        <TabsContent value="escenarios" className="mt-5">
          <EscenariosTab items={items} />
        </TabsContent>
        <TabsContent value="flujo" className="mt-5">
          <FlujoCajaTab ingresos={ingresos} costos={costos} />
        </TabsContent>
        <TabsContent value="equilibrio" className="mt-5">
          <EquilibrioTab items={items} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* -------------------- Productos / Servicios -------------------- */

function ProductosSection({ items, setItems }: { items: Item[]; setItems: (v: Item[] | ((p: Item[]) => Item[])) => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);

  const empty: Item = { id: "", nombre: "", tipo: "Servicio", precio_venta: 0, costo_variable: 0, unidad: "Unidad" };
  const [form, setForm] = useState<Item>(empty);

  const openNew = () => { setEdit(null); setForm({ ...empty, id: uid() }); setOpen(true); };
  const openEdit = (it: Item) => { setEdit(it); setForm(it); setOpen(true); };

  const save = () => {
    if (!form.nombre.trim()) { toast.error("Nombre requerido"); return; }
    setItems((prev) => {
      const exists = prev.some((p) => p.id === form.id);
      return exists ? prev.map((p) => (p.id === form.id ? form : p)) : [...prev, form];
    });
    toast.success(edit ? "Actualizado" : "Agregado");
    setOpen(false);
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("Eliminado");
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Mis productos y servicios</h2>
          <p className="text-sm text-muted-foreground">Estos ítems alimentan todas las simulaciones.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> Agregar producto/servicio</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{edit ? "Editar" : "Nuevo"} producto/servicio</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Item["tipo"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Producto">Producto</SelectItem>
                      <SelectItem value="Servicio">Servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidad de medida</Label>
                  <Select value={form.unidad} onValueChange={(v) => setForm({ ...form, unidad: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio de venta (CLP)</Label>
                  <Input type="number" value={form.precio_venta}
                    onChange={(e) => setForm({ ...form, precio_venta: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Costo variable unitario (CLP)</Label>
                  <Input type="number" value={form.costo_variable}
                    onChange={(e) => setForm({ ...form, costo_variable: Number(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay productos ni servicios. Agrega el primero para comenzar a simular.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Precio actual</TableHead>
              <TableHead className="text-right">Costo unitario</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const margen = it.precio_venta > 0 ? ((it.precio_venta - it.costo_variable) / it.precio_venta) * 100 : 0;
              return (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.nombre}</TableCell>
                  <TableCell><Badge variant="secondary">{it.tipo}</Badge></TableCell>
                  <TableCell className="text-right">{formatCLP(it.precio_venta)}</TableCell>
                  <TableCell className="text-right">{formatCLP(it.costo_variable)}</TableCell>
                  <TableCell>{it.unidad}</TableCell>
                  <TableCell className="text-right">
                    <span className={margen >= 30 ? "text-emerald-600" : margen >= 10 ? "text-amber-600" : "text-red-600"}>
                      {margen.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(it)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(it.id)}>Eliminar</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* -------------------- AI Card -------------------- */

function AICard({ tone, title, children }: { tone: "good" | "bad" | "warn"; title: string; children: React.ReactNode }) {
  const styles = {
    good: { bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" /> },
    bad: { bg: "bg-red-50 border-red-200", icon: <AlertTriangle className="h-5 w-5 text-red-600" /> },
    warn: { bg: "bg-amber-50 border-amber-200", icon: <Sparkles className="h-5 w-5 text-amber-600" /> },
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${styles.bg}`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div>
          <div className="font-semibold text-sm mb-1">{title}</div>
          <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function NoItems() {
  return (
    <Card className="p-8 text-center text-sm text-muted-foreground">
      Agrega al menos un producto o servicio arriba para usar el simulador.
    </Card>
  );
}

/* -------------------- Tab 1: Proyección de precios -------------------- */

function ProyeccionPreciosTab({ items }: { items: Item[] }) {
  const [selId, setSelId] = useState<string>("");
  const sel = items.find((i) => i.id === selId) ?? items[0];
  const [clientes, setClientes] = useState(100);
  const [aumento, setAumento] = useState(10);
  const [perdida, setPerdida] = useState(15);
  const [costosFijos, setCostosFijos] = useState(500000);

  if (items.length === 0) return <NoItems />;
  if (!sel) return null;

  const precioActual = sel.precio_venta;
  const costoUnit = sel.costo_variable;
  const precioNuevo = precioActual * (1 + aumento / 100);
  const clientesNuevos = clientes * (1 - perdida / 100);

  const ingresoActual = precioActual * clientes;
  const ingresoProy = precioNuevo * clientesNuevos;
  const utilidadActual = (precioActual - costoUnit) * clientes - costosFijos;
  const utilidadProy = (precioNuevo - costoUnit) * clientesNuevos - costosFijos;
  const margenProy = ingresoProy > 0 ? (utilidadProy / ingresoProy) * 100 : 0;
  const delta = utilidadProy - utilidadActual;

  const recomienda = delta > 0;
  const aiTitle = recomienda ? `Subir el precio ${aumento}% es conveniente` : `No se recomienda subir el precio ${aumento}%`;
  const aiBody = recomienda
    ? `La ganancia neta aumentaría en ${formatCLP(delta)} aunque pierdas el ${perdida}% de los clientes. El nuevo margen sería ${margenProy.toFixed(1)}%.`
    : `La pérdida del ${perdida}% de clientes reduce la utilidad en ${formatCLP(Math.abs(delta))}. Considera un aumento menor o mejorar la retención antes.`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card className="p-5 space-y-5">
        <div>
          <Label>Producto / servicio</Label>
          <Select value={sel.id} onValueChange={setSelId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SliderField label="Cantidad de clientes/ventas mensuales" value={clientes} min={1} max={2000} step={1} onChange={setClientes} suffix="" />
        <SliderField label="% de aumento de precio" value={aumento} min={-30} max={50} step={1} onChange={setAumento} suffix="%" />
        <SliderField label="% clientes que se perderían" value={perdida} min={0} max={80} step={1} onChange={setPerdida} suffix="%" />
        <SliderField label="Costos fijos mensuales (CLP)" value={costosFijos} min={0} max={10000000} step={50000} onChange={setCostosFijos} suffix="" format={formatCLP} />
      </Card>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <KPI title="Ingreso actual" value={formatCLP(ingresoActual)} />
          <KPI title="Ingreso proyectado" value={formatCLP(ingresoProy)} accent={ingresoProy >= ingresoActual ? "good" : "bad"} />
          <KPI title="Ganancia neta" value={formatCLP(utilidadProy)} accent={utilidadProy >= 0 ? "good" : "bad"} />
          <KPI title="Margen" value={`${margenProy.toFixed(1)}%`} />
        </div>
        <AICard tone={recomienda ? "good" : "bad"} title={aiTitle}>{aiBody}</AICard>
      </div>
    </div>
  );
}

/* -------------------- Tab 2: Escenarios -------------------- */

function EscenariosTab({ items }: { items: Item[] }) {
  const [selId, setSelId] = useState<string>("");
  const sel = items.find((i) => i.id === selId) ?? items[0];
  const [ventas, setVentas] = useState(100);
  const [costosFijos, setCostosFijos] = useState(500000);

  if (items.length === 0) return <NoItems />;
  if (!sel) return null;

  const calc = (factor: number) => {
    const v = Math.round(ventas * factor);
    const ingreso = v * sel.precio_venta;
    const variable = v * sel.costo_variable;
    const neto = ingreso - variable - costosFijos;
    const margen = ingreso > 0 ? (neto / ingreso) * 100 : 0;
    return { v, ingreso, neto, margen };
  };

  const escenarios = [
    { key: "pesimista", label: "Pesimista −30%", factor: 0.7, tone: "warn" as const },
    { key: "base", label: "Base actual", factor: 1, tone: "good" as const },
    { key: "optimista", label: "Optimista +30%", factor: 1.3, tone: "good" as const },
    { key: "crisis", label: "Crisis −60%", factor: 0.4, tone: "bad" as const },
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5 grid gap-5 md:grid-cols-2">
        <div>
          <Label>Producto / servicio</Label>
          <Select value={sel.id} onValueChange={setSelId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <SliderField label="Ventas base mensuales (unidades)" value={ventas} min={1} max={2000} step={1} onChange={setVentas} suffix="" />
        <SliderField label="Costos fijos mensuales (CLP)" value={costosFijos} min={0} max={10000000} step={50000} onChange={setCostosFijos} suffix="" format={formatCLP} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {escenarios.map((e) => {
          const r = calc(e.factor);
          const tone = r.neto > 0 ? "good" : r.neto === 0 ? "warn" : "bad";
          return (
            <Card key={e.key} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{e.label}</div>
                {r.neto >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              </div>
              <div className="space-y-1 text-sm">
                <Row label="Ventas" v={`${r.v} ${sel.unidad}`} />
                <Row label="Ingreso" v={formatCLP(r.ingreso)} />
                <Row label="Resultado neto" v={formatCLP(r.neto)} accent={r.neto >= 0 ? "good" : "bad"} />
                <Row label="Margen" v={`${r.margen.toFixed(1)}%`} />
              </div>
              <AICard tone={tone}
                title={r.neto >= 0 ? "Escenario sostenible" : "Escenario en riesgo"}>
                {r.neto >= 0
                  ? `Cubres costos fijos y generas ${formatCLP(r.neto)} de utilidad.`
                  : `Faltan ${formatCLP(Math.abs(r.neto))} para cubrir costos fijos. Reduce gastos o aumenta ventas.`}
              </AICard>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- Tab 3: Flujo de caja -------------------- */

function FlujoCajaTab({ ingresos, costos }: { ingresos: { valor: number }[]; costos: { valor: number }[] }) {
  const [crecimiento, setCrecimiento] = useState(5);

  const ingresoMes = (ingresos ?? []).reduce((a, b) => a + (Number(b.valor) || 0), 0) || 3000000;
  const costoMes = (costos ?? []).reduce((a, b) => a + (Number(b.valor) || 0), 0) || 2000000;

  const meses = ["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5", "Mes 6"];
  const data = meses.map((m, i) => {
    const factor = Math.pow(1 + crecimiento / 100, i);
    const ing = ingresoMes * factor;
    const cos = costoMes * (1 + (crecimiento / 200) * i);
    return { mes: m, ingresos: Math.round(ing), costos: Math.round(cos), flujo: Math.round(ing - cos) };
  });

  const flujoFinal = data[data.length - 1].flujo;
  const flujoInicial = data[0].flujo;
  const positivo = flujoFinal > 0;

  return (
    <div className="space-y-5">
      <Card className="p-5 grid gap-5 md:grid-cols-2">
        <div className="text-sm">
          <div className="text-muted-foreground">Ingresos mensuales (datos reales)</div>
          <div className="text-2xl font-bold">{formatCLP(ingresoMes)}</div>
        </div>
        <div className="text-sm">
          <div className="text-muted-foreground">Costos mensuales (datos reales)</div>
          <div className="text-2xl font-bold">{formatCLP(costoMes)}</div>
        </div>
        <div className="md:col-span-2">
          <SliderField label="% de crecimiento mensual proyectado" value={crecimiento} min={-20} max={30} step={1} onChange={setCrecimiento} suffix="%" />
        </div>
      </Card>

      <Card className="p-5">
        <div className="font-semibold mb-3">Proyección a 6 meses</div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatCLP(v)} />
              <Legend />
              <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="costos" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="flujo" stroke="#185FA5" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <AICard tone={positivo ? "good" : "bad"}
        title={positivo ? "Flujo de caja saludable" : "Riesgo de liquidez"}>
        {positivo
          ? `Con un crecimiento del ${crecimiento}% mensual, el flujo pasa de ${formatCLP(flujoInicial)} a ${formatCLP(flujoFinal)} en 6 meses. Mantén la disciplina en costos.`
          : `Con la tendencia actual (${crecimiento}%), el flujo terminaría en ${formatCLP(flujoFinal)}. Recorta gastos variables o impulsa ventas para evitar caja negativa.`}
      </AICard>
    </div>
  );
}

/* -------------------- Tab 4: Punto de equilibrio -------------------- */

function EquilibrioTab({ items }: { items: Item[] }) {
  const [selId, setSelId] = useState<string>("");
  const sel = items.find((i) => i.id === selId) ?? items[0];
  const [costosFijos, setCostosFijos] = useState(500000);

  if (items.length === 0) return <NoItems />;
  if (!sel) return null;

  const margenContrib = sel.precio_venta - sel.costo_variable;
  const equilibrio = margenContrib > 0 ? Math.ceil(costosFijos / margenContrib) : 0;
  const ingresoEq = equilibrio * sel.precio_venta;

  const max = Math.max(equilibrio * 2, 10);
  const data = Array.from({ length: 11 }, (_, i) => {
    const u = Math.round((max / 10) * i);
    return {
      unidades: u,
      ingresos: u * sel.precio_venta,
      costos: costosFijos + u * sel.costo_variable,
    };
  });

  const viable = margenContrib > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card className="p-5 space-y-5">
        <div>
          <Label>Producto / servicio</Label>
          <Select value={sel.id} onValueChange={setSelId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Precio</div>
            <div className="text-lg font-semibold">{formatCLP(sel.precio_venta)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Costo variable</div>
            <div className="text-lg font-semibold">{formatCLP(sel.costo_variable)}</div>
          </div>
        </div>
        <SliderField label="Costos fijos mensuales (CLP)" value={costosFijos} min={0} max={10000000} step={50000} onChange={setCostosFijos} suffix="" format={formatCLP} />

        <div className="rounded-lg bg-[#185FA5]/5 border border-[#185FA5]/20 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Punto de equilibrio</div>
          <div className="text-3xl font-bold text-[#185FA5]">
            {viable ? `${equilibrio} ${sel.unidad}` : "No viable"}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {viable ? `Ingreso necesario: ${formatCLP(ingresoEq)}` : "El precio no cubre el costo variable."}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="font-semibold mb-3">Ingresos vs Costos totales</div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="unidades" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCLP(v)} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="costos" stroke="#ef4444" strokeWidth={2} dot={false} />
                {viable && <ReferenceDot x={equilibrio} y={ingresoEq} r={6} fill="#185FA5" stroke="white" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <AICard tone={viable ? "good" : "bad"}
          title={viable ? "Punto de equilibrio alcanzable" : "Modelo no rentable"}>
          {viable
            ? `Necesitas vender ${equilibrio} ${sel.unidad.toLowerCase()} al mes para cubrir tus costos fijos de ${formatCLP(costosFijos)}. A partir de la unidad ${equilibrio + 1} comienzas a ganar ${formatCLP(margenContrib)} por cada venta adicional.`
            : `El costo variable (${formatCLP(sel.costo_variable)}) es mayor o igual al precio (${formatCLP(sel.precio_venta)}). Cada venta genera pérdida — sube el precio o reduce costos antes de seguir vendiendo.`}
        </AICard>
      </div>
    </div>
  );
}

/* -------------------- Helpers -------------------- */

function SliderField({
  label, value, min, max, step, onChange, suffix, format,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string; format?: (n: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-semibold tabular-nums">
          {format ? format(value) : `${value}${suffix ?? ""}`}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function KPI({ title, value, accent }: { title: string; value: string; accent?: "good" | "bad" }) {
  const color = accent === "good" ? "text-emerald-600" : accent === "bad" ? "text-red-600" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </Card>
  );
}

function Row({ label, v, accent }: { label: string; v: string; accent?: "good" | "bad" }) {
  const color = accent === "good" ? "text-emerald-600 font-semibold" : accent === "bad" ? "text-red-600 font-semibold" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${color}`}>{v}</span>
    </div>
  );
}
