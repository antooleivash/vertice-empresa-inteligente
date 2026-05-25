import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/status-pill";
import { useClientes, useEventos, type Cliente, type ClienteTag, type ClienteTipo } from "@/lib/crm-store";
import { uid, useLocalList } from "@/lib/local-store";
import { formatCLP } from "@/lib/domain";
import { Plus, Search, ArrowLeft, TrendingUp, Star } from "lucide-react";
import { toast } from "sonner";
import { PuntosFidelizacionPanel } from "@/components/puntos-fidelizacion-panel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/clientes")({ component: ClientesPage });

const TAGS: ClienteTag[] = ["VIP", "Regular", "Nuevo", "Inactivo"];
const TIPOS: ClienteTipo[] = ["Persona", "Empresa"];

type Venta = { id: string; numero: number; fecha: string; cliente: string; items: { descripcion: string; cantidad: number; precio: number }[]; total: number; metodo: string; cliente_id?: string };

function ClientesPage() {
  const [clientes, setClientes] = useClientes();
  const [eventos] = useEventos();
  const [ventas] = useLocalList<Venta>("vertice.caja.ventas", []);
  const [tab, setTab] = useState("listado");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const goPerfil = (id: string) => { setSelectedId(id); setTab("perfil"); };

  return (
    <PageShell>
      <PageHeader
        title="Clientes y CRM"
        description="Gestión de clientes, historial y análisis."
        actions={<NuevoClienteDialog onCreate={(c) => setClientes((p) => [c, ...p])} />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="listado">Clientes</TabsTrigger>
          <TabsTrigger value="perfil" disabled={!selectedId}>Perfil del cliente</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
          <TabsTrigger value="puntos"><Star className="h-3.5 w-3.5 mr-1" />Puntos fidelización</TabsTrigger>
        </TabsList>

        <TabsContent value="listado">
          <ListadoTab clientes={clientes} setClientes={setClientes} ventas={ventas} onSelect={goPerfil} />
        </TabsContent>

        <TabsContent value="perfil">
          {selectedId && (
            <PerfilTab
              cliente={clientes.find((c) => c.id === selectedId)!}
              ventas={ventas}
              eventos={eventos}
              onBack={() => setTab("listado")}
              onSaveNotas={(notas) =>
                setClientes((p) => p.map((c) => c.id === selectedId ? { ...c, notas } : c))
              }
            />
          )}
        </TabsContent>

        <TabsContent value="analisis">
          <AnalisisTab clientes={clientes} ventas={ventas} />
        </TabsContent>

        <TabsContent value="puntos" className="mt-4">
          <PuntosFidelizacionPanel showHeaderActions />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* ---------- helpers ---------- */

function statsCliente(c: Cliente, ventas: Venta[]) {
  const propias = ventas.filter((v) => v.cliente_id === c.id || (v.cliente && v.cliente.toLowerCase() === c.nombre.toLowerCase()));
  const total = propias.reduce((s, v) => s + v.total, 0);
  const visitas = propias.length;
  const ultima = propias.length ? propias.map((v) => v.fecha).sort().slice(-1)[0] : null;
  return { propias, total, visitas, ultima };
}

/* ---------- Listado ---------- */

function ListadoTab({
  clientes, setClientes, ventas, onSelect,
}: {
  clientes: Cliente[];
  setClientes: (n: Cliente[] | ((p: Cliente[]) => Cliente[])) => void;
  ventas: Venta[];
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return clientes
      .filter((c) => !s || c.nombre.toLowerCase().includes(s) || (c.telefono ?? "").includes(s) || (c.email ?? "").toLowerCase().includes(s))
      .map((c) => ({ ...c, ...statsCliente(c, ventas) }));
  }, [clientes, ventas, q]);

  return (
    <Card className="p-4 mt-2">
      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, teléfono o email…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Última visita</TableHead>
            <TableHead className="text-right">Total compras</TableHead>
            <TableHead>Tag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin clientes.</TableCell></TableRow>
          )}
          {filtered.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => onSelect(c.id)}>
              <TableCell className="font-medium">{c.nombre}</TableCell>
              <TableCell className="text-xs">{c.telefono ?? "—"}</TableCell>
              <TableCell className="text-xs">{c.email ?? "—"}</TableCell>
              <TableCell className="text-xs">{c.ultima ? new Date(c.ultima).toLocaleDateString("es-CL") : "—"}</TableCell>
              <TableCell className="text-right text-xs">{formatCLP(c.total)}</TableCell>
              <TableCell><StatusPill label={c.tag} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ---------- Perfil ---------- */

function PerfilTab({
  cliente, ventas, eventos, onBack, onSaveNotas,
}: {
  cliente: Cliente;
  ventas: Venta[];
  eventos: { id: string; titulo: string; fecha_inicio: string; cliente_id?: string }[];
  onBack: () => void;
  onSaveNotas: (n: string) => void;
}) {
  const { propias, total, visitas, ultima } = statsCliente(cliente, ventas);
  const [notas, setNotas] = useState(cliente.notas ?? "");

  const favorito = useMemo(() => {
    const cnt: Record<string, number> = {};
    propias.forEach((v) => v.items?.forEach((it) => { cnt[it.descripcion] = (cnt[it.descripcion] ?? 0) + (it.cantidad || 1); }));
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    return top?.[0] ?? "—";
  }, [propias]);

  const eventosCli = eventos.filter((e) => e.cliente_id === cliente.id).sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));

  return (
    <div className="mt-2 space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{cliente.nombre}</h2>
            <div className="text-sm text-muted-foreground">
              {[cliente.telefono, cliente.email].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="mt-2 flex gap-1.5"><StatusPill label={cliente.tag} /><StatusPill label={cliente.tipo} tone="info" /></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total visitas</div><div className="text-2xl font-semibold">{visitas}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total gastado</div><div className="text-2xl font-semibold">{formatCLP(total)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Última visita</div><div className="text-lg font-medium">{ultima ? new Date(ultima).toLocaleDateString("es-CL") : "—"}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Servicio favorito</div><div className="text-sm font-medium truncate">{favorito}</div></Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Historial</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Servicio / Producto</TableHead>
              <TableHead>Método pago</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propias.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sin compras registradas.</TableCell></TableRow>
            )}
            {propias.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="text-xs">{new Date(v.fecha).toLocaleDateString("es-CL")}</TableCell>
                <TableCell className="text-xs">{v.items?.map((i) => i.descripcion).join(", ")}</TableCell>
                <TableCell className="text-xs">{v.metodo}</TableCell>
                <TableCell className="text-right text-xs">{formatCLP(v.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {eventosCli.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Próximas citas y eventos</h3>
          <ul className="text-sm space-y-1">
            {eventosCli.slice(0, 5).map((e) => (
              <li key={e.id}>· {new Date(e.fecha_inicio).toLocaleString("es-CL")} — {e.titulo}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-medium mb-2">Notas</h3>
        <Textarea rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Alergias, preferencias, nombre de mascota, etc." />
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={() => { onSaveNotas(notas); toast.success("Notas guardadas"); }}>Guardar notas</Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Análisis ---------- */

function AnalisisTab({ clientes, ventas }: { clientes: Cliente[]; ventas: Venta[] }) {
  const [diasInactivo, setDiasInactivo] = useState("30");

  const conStats = clientes.map((c) => ({ c, ...statsCliente(c, ventas) }));
  const top10 = [...conStats].sort((a, b) => b.total - a.total).slice(0, 10).filter((x) => x.total > 0);

  const limite = Date.now() - parseInt(diasInactivo) * 86400000;
  const inactivos = conStats.filter((x) => x.ultima && new Date(x.ultima).getTime() < limite);

  const nuevosPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    clientes.forEach((c) => {
      const k = c.created_at.slice(0, 7);
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).sort().map(([mes, n]) => ({ mes, nuevos: n }));
  }, [clientes]);

  return (
    <div className="mt-2 grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" />Top 10 clientes por gasto</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Visitas</TableHead></TableRow></TableHeader>
          <TableBody>
            {top10.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sin datos.</TableCell></TableRow>}
            {top10.map((x) => (
              <TableRow key={x.c.id}>
                <TableCell className="text-sm">{x.c.nombre}</TableCell>
                <TableCell className="text-right text-sm">{formatCLP(x.total)}</TableCell>
                <TableCell className="text-right text-sm">{x.visitas}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Clientes a recuperar</h3>
          <Select value={diasInactivo} onValueChange={setDiasInactivo}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">+30 días</SelectItem>
              <SelectItem value="60">+60 días</SelectItem>
              <SelectItem value="90">+90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Última visita</TableHead><TableHead>Teléfono</TableHead></TableRow></TableHeader>
          <TableBody>
            {inactivos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Ninguno.</TableCell></TableRow>}
            {inactivos.map((x) => (
              <TableRow key={x.c.id}>
                <TableCell className="text-sm">{x.c.nombre}</TableCell>
                <TableCell className="text-xs">{x.ultima ? new Date(x.ultima).toLocaleDateString("es-CL") : "—"}</TableCell>
                <TableCell className="text-xs">{x.c.telefono ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4 lg:col-span-2">
        <h3 className="font-medium mb-3">Nuevos clientes por mes</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nuevosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="nuevos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Nuevo Cliente ---------- */

function NuevoClienteDialog({ onCreate }: { onCreate: (c: Cliente) => void }) {
  const [open, setOpen] = useState(false);
  const empty = (): Omit<Cliente, "id" | "created_at"> => ({
    nombre: "", rut: "", telefono: "", email: "", direccion: "",
    tipo: "Persona", notas: "", tag: "Nuevo",
  });
  const [f, setF] = useState(empty());

  const submit = () => {
    if (!f.nombre.trim()) return toast.error("Ingresa nombre o razón social");
    onCreate({ ...f, id: uid(), created_at: new Date().toISOString() });
    setOpen(false);
    setF(empty());
    toast.success("Cliente creado");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1.5" />Nuevo cliente</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nombre completo o razón social</Label>
            <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>RUT</Label><Input value={f.rut} onChange={(e) => setF({ ...f, rut: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as ClienteTipo })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Teléfono</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>
          <div><Label>Dirección</Label><Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></div>
          <div>
            <Label>Tag</Label>
            <Select value={f.tag} onValueChange={(v) => setF({ ...f, tag: v as ClienteTag })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas (alergias, preferencias, nombre de mascota, etc.)</Label>
            <Textarea rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
