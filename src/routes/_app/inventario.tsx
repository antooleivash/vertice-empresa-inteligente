import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/status-pill";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCLP } from "@/lib/domain";
import { useLocalList, uid } from "@/lib/local-store";
import { Plus, AlertTriangle, History, Package, Boxes } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventario")({ component: InventarioPage });

type Producto = {
  id: string; codigo: string; nombre: string;
  categoria: "Materia prima" | "Insumo" | "Herramienta" | "Equipo" | "Otro";
  unidad: "Kg" | "Lt" | "Unidad" | "Caja" | "Otro";
  stock: number; stock_minimo: number; precio: number;
  proveedor: string; descripcion: string;
};

type Movimiento = {
  id: string; producto_id: string; tipo: "Entrada" | "Salida" | "Ajuste";
  cantidad: number; fecha: string; motivo: string;
};

type Activo = {
  id: string; nombre: string;
  tipo: "Maquinaria" | "Vehículo" | "Equipo tecnológico" | "Inmueble" | "Mobiliario" | "Otro";
  valor: number; fecha_compra: string; vida_util: number;
  estado: "En uso" | "En mantención" | "De baja";
  ubicacion: string; serie: string;
};

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function estadoStock(p: Producto): { label: string; variant: "default" | "destructive" | "secondary" } {
  if (p.stock <= 0) return { label: "Sin stock", variant: "destructive" };
  if (p.stock < p.stock_minimo) return { label: "Stock bajo", variant: "destructive" };
  return { label: "OK", variant: "default" };
}

function depreciacion(a: Activo) {
  const anios = Math.max(0, (Date.now() - new Date(a.fecha_compra).getTime()) / (365.25 * 86400000));
  const anual = a.vida_util > 0 ? a.valor / a.vida_util : 0;
  const acumulada = Math.min(a.valor, anual * anios);
  const actual = Math.max(0, a.valor - acumulada);
  return { anual, acumulada, actual };
}

function InventarioPage() {
  const [productos, setProductos] = useLocalList<Producto>("vertice.inventario.productos", []);
  const [movs, setMovs] = useLocalList<Movimiento>("vertice.inventario.movs", []);
  const [activos, setActivos] = useLocalList<Activo>("vertice.inventario.activos", []);

  return (
    <PageShell>
      <PageHeader title="Inventario" description="Gestión de productos, insumos y activos fijos." />
      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">Productos e insumos</TabsTrigger>
          <TabsTrigger value="activos">Activos fijos</TabsTrigger>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="productos" className="mt-5">
          <ProductosTab productos={productos} setProductos={setProductos} movs={movs} setMovs={setMovs} />
        </TabsContent>
        <TabsContent value="activos" className="mt-5">
          <ActivosTab activos={activos} setActivos={setActivos} />
        </TabsContent>
        <TabsContent value="resumen" className="mt-5">
          <ResumenTab productos={productos} activos={activos} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* ---------------- PRODUCTOS ---------------- */

function ProductosTab({
  productos, setProductos, movs, setMovs,
}: {
  productos: Producto[]; setProductos: (n: Producto[] | ((p: Producto[]) => Producto[])) => void;
  movs: Movimiento[]; setMovs: (n: Movimiento[] | ((p: Movimiento[]) => Movimiento[])) => void;
}) {
  const [openProd, setOpenProd] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [historialId, setHistorialId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <Dialog open={openMov} onOpenChange={setOpenMov}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={productos.length === 0}>
              <History className="h-4 w-4" /> Registrar movimiento
            </Button>
          </DialogTrigger>
          <MovimientoDialog
            productos={productos}
            onSave={(m) => {
              setMovs((prev) => [m, ...prev]);
              setProductos((prev) =>
                prev.map((p) => {
                  if (p.id !== m.producto_id) return p;
                  const delta = m.tipo === "Entrada" ? m.cantidad : m.tipo === "Salida" ? -m.cantidad : (m.cantidad - p.stock);
                  return { ...p, stock: m.tipo === "Ajuste" ? m.cantidad : p.stock + delta };
                }),
              );
              setOpenMov(false);
              toast.success("Movimiento registrado");
            }}
          />
        </Dialog>
        <Dialog open={openProd} onOpenChange={setOpenProd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Agregar producto</Button>
          </DialogTrigger>
          <ProductoDialog onSave={(p) => { setProductos((prev) => [p, ...prev]); setOpenProd(false); toast.success("Producto creado"); }} />
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Estado</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Sin productos registrados</TableCell></TableRow>
            )}
            {productos.map((p) => {
              const e = estadoStock(p);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell className="text-right">{p.stock} {p.unidad}</TableCell>
                  <TableCell className="text-right">{p.stock_minimo}</TableCell>
                  <TableCell>
                    <StatusPill label={e.label} tone={e.variant === "destructive" ? "danger" : e.variant === "secondary" ? "warning" : "success"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setHistorialId(p.id)}>Historial</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!historialId} onOpenChange={(o) => !o && setHistorialId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historial de movimientos</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {movs.filter((m) => m.producto_id === historialId).map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <div>
                  <Badge variant={m.tipo === "Salida" ? "destructive" : m.tipo === "Entrada" ? "default" : "secondary"}>{m.tipo}</Badge>
                  <span className="ml-2 font-medium">{m.cantidad}</span>
                  <span className="ml-2 text-muted-foreground">{m.motivo}</span>
                </div>
                <span className="text-xs text-muted-foreground">{m.fecha}</span>
              </div>
            ))}
            {movs.filter((m) => m.producto_id === historialId).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductoDialog({ onSave }: { onSave: (p: Producto) => void }) {
  const [f, setF] = useState<Producto>({
    id: uid(), codigo: "", nombre: "", categoria: "Insumo", unidad: "Unidad",
    stock: 0, stock_minimo: 0, precio: 0, proveedor: "", descripcion: "",
  });
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Agregar producto</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="Código / SKU"><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></Field>
        <Field label="Categoría">
          <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v as Producto["categoria"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(["Materia prima", "Insumo", "Herramienta", "Equipo", "Otro"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Unidad de medida">
          <Select value={f.unidad} onValueChange={(v) => setF({ ...f, unidad: v as Producto["unidad"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(["Kg", "Lt", "Unidad", "Caja", "Otro"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Stock actual"><Input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: Number(e.target.value) })} /></Field>
        <Field label="Stock mínimo"><Input type="number" value={f.stock_minimo} onChange={(e) => setF({ ...f, stock_minimo: Number(e.target.value) })} /></Field>
        <Field label="Precio unitario (CLP)"><Input type="number" value={f.precio} onChange={(e) => setF({ ...f, precio: Number(e.target.value) })} /></Field>
        <Field label="Proveedor"><Input value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} /></Field>
        <div className="col-span-2"><Field label="Descripción"><Textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Field></div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)} disabled={!f.nombre || !f.codigo}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}

function MovimientoDialog({ productos, onSave }: { productos: Producto[]; onSave: (m: Movimiento) => void }) {
  const [f, setF] = useState<Movimiento>({
    id: uid(), producto_id: productos[0]?.id ?? "", tipo: "Entrada",
    cantidad: 0, fecha: new Date().toISOString().slice(0, 10), motivo: "",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <Field label="Producto">
          <Select value={f.producto_id} onValueChange={(v) => setF({ ...f, producto_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Movimiento["tipo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["Entrada", "Salida", "Ajuste"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Cantidad"><Input type="number" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Fecha"><Input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
        <Field label="Motivo"><Textarea rows={2} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></Field>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)} disabled={!f.producto_id || !f.cantidad}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}

/* ---------------- ACTIVOS ---------------- */

function ActivosTab({ activos, setActivos }: { activos: Activo[]; setActivos: (n: Activo[] | ((p: Activo[]) => Activo[])) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Agregar activo</Button></DialogTrigger>
          <ActivoDialog onSave={(a) => { setActivos((prev) => [a, ...prev]); setOpen(false); toast.success("Activo agregado"); }} />
        </Dialog>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead><TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor original</TableHead>
              <TableHead className="text-right">Depreciación acum.</TableHead>
              <TableHead className="text-right">Valor actual</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Sin activos registrados</TableCell></TableRow>}
            {activos.map((a) => {
              const d = depreciacion(a);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nombre}</TableCell>
                  <TableCell>{a.tipo}</TableCell>
                  <TableCell className="text-right">{formatCLP(a.valor)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCLP(d.acumulada)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCLP(d.actual)}</TableCell>
                  <TableCell>
                    <StatusPill label={a.estado} tone={a.estado === "En uso" ? "success" : a.estado === "En mantención" ? "warning" : "danger"} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ActivoDialog({ onSave }: { onSave: (a: Activo) => void }) {
  const [f, setF] = useState<Activo>({
    id: uid(), nombre: "", tipo: "Maquinaria", valor: 0,
    fecha_compra: new Date().toISOString().slice(0, 10), vida_util: 5,
    estado: "En uso", ubicacion: "", serie: "",
  });
  const d = depreciacion(f);
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Agregar activo</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="Tipo">
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as Activo["tipo"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(["Maquinaria", "Vehículo", "Equipo tecnológico", "Inmueble", "Mobiliario", "Otro"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Valor compra (CLP)"><Input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} /></Field>
        <Field label="Fecha compra"><Input type="date" value={f.fecha_compra} onChange={(e) => setF({ ...f, fecha_compra: e.target.value })} /></Field>
        <Field label="Vida útil (años)"><Input type="number" value={f.vida_util} onChange={(e) => setF({ ...f, vida_util: Number(e.target.value) })} /></Field>
        <Field label="Estado">
          <Select value={f.estado} onValueChange={(v) => setF({ ...f, estado: v as Activo["estado"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(["En uso", "En mantención", "De baja"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Ubicación / área"><Input value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} /></Field>
        <Field label="N° de serie"><Input value={f.serie} onChange={(e) => setF({ ...f, serie: e.target.value })} /></Field>
        <div className="col-span-2 rounded-md bg-muted p-3 text-sm">
          Depreciación anual: <strong>{formatCLP(d.anual)}</strong> · Valor actual estimado: <strong>{formatCLP(d.actual)}</strong>
        </div>
      </div>
      <DialogFooter><Button onClick={() => onSave(f)} disabled={!f.nombre || !f.valor}>Guardar</Button></DialogFooter>
    </DialogContent>
  );
}

/* ---------------- RESUMEN ---------------- */

function ResumenTab({ productos, activos }: { productos: Producto[]; activos: Activo[] }) {
  const totalUnidades = productos.reduce((s, p) => s + p.stock, 0);
  const bajoMin = productos.filter((p) => p.stock < p.stock_minimo).length;
  const valorInv = productos.reduce((s, p) => s + p.stock * p.precio, 0);
  const valorActual = activos.reduce((s, a) => s + depreciacion(a).actual, 0);

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    productos.forEach((p) => m.set(p.categoria, (m.get(p.categoria) ?? 0) + p.stock));
    return Array.from(m, ([categoria, stock]) => ({ categoria, stock }));
  }, [productos]);

  const porTipoActivo = useMemo(() => {
    const m = new Map<string, number>();
    activos.forEach((a) => m.set(a.tipo, (m.get(a.tipo) ?? 0) + 1));
    return Array.from(m, ([tipo, n]) => ({ tipo, n }));
  }, [activos]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<Boxes className="h-4 w-4" />} label="Stock total" value={`${totalUnidades}`} />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Bajo mínimo" value={`${bajoMin}`} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Valor inventario" value={formatCLP(valorInv)} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Total activos" value={`${activos.length}`} />
        <Kpi icon={<Package className="h-4 w-4" />} label="Valor activos" value={formatCLP(valorActual)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-sm font-medium mb-3">Stock por categoría</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porCategoria}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="categoria" /><YAxis /><Tooltip />
              <Bar dataKey="stock" fill="var(--color-chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium mb-3">Activos por tipo</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={porTipoActivo} dataKey="n" nameKey="tipo" outerRadius={90} label>
                {porTipoActivo.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
