import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalValue, uid } from "@/lib/local-store";
import { formatCLP } from "@/lib/domain";
import { Star, Plus, Search, Settings as SettingsIcon, Gift, History, Trash2, Trophy, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/puntos-fidelizacion")({ component: PuntosFidelizacionPage });

type Beneficio = { nombre: string; puntos: number };
type Config = { montoPorPunto: number; minCanje: number; beneficios: Beneficio[] };
type Cliente = { nombre: string; puntos: number; totalGastado: number; ultimoServicio: string };
type Mov = { id: string; tipo: "compra" | "canje"; cliente: string; detalle: string; puntos: number; monto?: number; fecha: string };

const SERVICIOS = [
  "Baño y corte básico", "Baño y corte completo", "Corte de uñas",
  "Limpieza dental", "Peluquería completa", "Spa canino", "Otro",
];

const CONFIG_DEFAULT: Config = {
  montoPorPunto: 1000,
  minCanje: 100,
  beneficios: [
    { nombre: "Corte de uñas gratis", puntos: 100 },
    { nombre: "Baño básico gratis", puntos: 250 },
    { nombre: "Peluquería completa gratis", puntos: 500 },
    { nombre: "Spa canino premium", puntos: 1000 },
  ],
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");

function nivelOf(puntos: number) {
  if (puntos >= 1000) return { name: "Diamante", color: "#06B6D4", bg: "#ECFEFF", next: null as number | null };
  if (puntos >= 500) return { name: "Oro", color: "#F59E0B", bg: "#FFFBEB", next: 1000 };
  if (puntos >= 200) return { name: "Plata", color: "#64748B", bg: "#F1F5F9", next: 500 };
  if (puntos >= 50) return { name: "Bronce", color: "#B45309", bg: "#FEF3C7", next: 200 };
  return { name: "Nuevo", color: "#10B981", bg: "#ECFDF5", next: 50 };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
}

function PuntosFidelizacionPage() {
  const [config, setConfig] = useLocalValue<Config>("pc_config", CONFIG_DEFAULT);
  const [clientes, setClientes] = useLocalValue<Record<string, Cliente>>("pc_clientes", {});
  const [historial, setHistorial] = useLocalValue<Mov[]>("pc_historial", []);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | "canjeables">("todos");
  const [openCompra, setOpenCompra] = useState(false);
  const [openCanje, setOpenCanje] = useState<string | null>(null);
  const [openConfig, setOpenConfig] = useState(false);
  const [openHistCliente, setOpenHistCliente] = useState<string | null>(null);

  const clientesList = useMemo(() =>
    Object.entries(clientes).map(([id, c]) => ({ id, ...c })),
    [clientes]
  );

  const puntosActivos = clientesList.reduce((s, c) => s + c.puntos, 0);
  const puntosCanjeados = historial.filter(h => h.tipo === "canje").reduce((s, h) => s + h.puntos, 0);
  const top = [...clientesList].sort((a, b) => b.puntos - a.puntos)[0];
  const ventas = historial.filter(h => h.tipo === "compra");
  const ventasTotal = ventas.reduce((s, h) => s + (h.monto ?? 0), 0);

  const filtered = clientesList
    .filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()))
    .filter(c => tab === "todos" || c.puntos >= config.minCanje)
    .sort((a, b) => b.puntos - a.puntos);

  const ranking = [...clientesList].sort((a, b) => b.puntos - a.puntos).slice(0, 7);
  const ultimosMov = [...historial].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);

  return (
    <PageShell>
      <PageHeader
        title="Puntos fidelización"
        description="Programa de fidelización para clientes recurrentes."
        actions={
          <>
            <Button variant="outline" onClick={() => setOpenConfig(true)}>
              <SettingsIcon className="h-4 w-4" /> Configuración
            </Button>
            <Button onClick={() => setOpenCompra(true)}>
              <Plus className="h-4 w-4" /> Registrar compra
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Puntos activos" value={puntosActivos.toLocaleString("es-CL")} icon={<Star className="h-4 w-4" />} color="#F59E0B" />
        <KPI label="Puntos canjeados" value={puntosCanjeados.toLocaleString("es-CL")} icon={<Gift className="h-4 w-4" />} color="#EC4899" />
        <KPI label="Cliente top" value={top?.nombre ?? "—"} sub={top ? `${top.puntos} pts` : ""} icon={<Trophy className="h-4 w-4" />} color="#6366F1" />
        <KPI label="Ventas registradas" value={formatCLP(ventasTotal)} sub={`${ventas.length} transacciones`} icon={<ShoppingBag className="h-4 w-4" />} color="#10B981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla principal */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Tabs value={tab} onValueChange={v => setTab(v as "todos" | "canjeables")}>
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="canjeables">Canjeables</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Último servicio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin clientes registrados</TableCell></TableRow>
              )}
              {filtered.map(c => {
                const niv = nivelOf(c.puntos);
                const pct = niv.next ? Math.min(100, (c.puntos / niv.next) * 100) : 100;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                          {initials(c.nombre)}
                        </div>
                        <span className="font-medium">{c.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">{c.puntos.toLocaleString("es-CL")} pts</span>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: niv.bg, color: niv.color }}>
                        {niv.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.ultimoServicio || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setOpenHistCliente(c.id)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" disabled={c.puntos < config.minCanje} onClick={() => setOpenCanje(c.id)}>
                          <Gift className="h-3.5 w-3.5" /> Canjear
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Panel lateral */}
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Ranking</h3>
            {ranking.length === 0 && <p className="text-sm text-muted-foreground">Sin datos.</p>}
            <ul className="space-y-2">
              {ranking.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-muted-foreground">{i + 1}</span>}</span>
                    <span className="font-medium">{c.nombre}</span>
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">{c.puntos} pts</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Movimientos recientes</h3>
            {ultimosMov.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos.</p>}
            <ul className="space-y-2.5">
              {ultimosMov.map(m => (
                <li key={m.id} className="flex items-start justify-between text-xs gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{m.cliente}</div>
                    <div className="text-muted-foreground">{m.detalle}</div>
                  </div>
                  <span className={`font-semibold whitespace-nowrap ${m.tipo === "compra" ? "text-emerald-600" : "text-amber-600"}`}>
                    {m.tipo === "compra" ? "+" : "−"}{m.puntos} pts
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Modal Registrar compra */}
      <CompraDialog
        open={openCompra}
        onClose={() => setOpenCompra(false)}
        config={config}
        onSave={(nombre, monto, servicio, fecha) => {
          const id = normalize(nombre);
          const puntos = Math.floor(monto / config.montoPorPunto);
          const prev = clientes[id];
          const nuevoCliente: Cliente = {
            nombre: prev?.nombre ?? nombre.trim(),
            puntos: (prev?.puntos ?? 0) + puntos,
            totalGastado: (prev?.totalGastado ?? 0) + monto,
            ultimoServicio: servicio,
          };
          setClientes({ ...clientes, [id]: nuevoCliente });
          setHistorial([
            { id: uid(), tipo: "compra", cliente: nuevoCliente.nombre, detalle: servicio, puntos, monto, fecha },
            ...historial,
          ]);
          toast.success(`+${puntos} pts para ${nuevoCliente.nombre}`);
          setOpenCompra(false);
        }}
      />

      {/* Modal Canjear */}
      {openCanje && clientes[openCanje] && (
        <CanjeDialog
          cliente={clientes[openCanje]}
          config={config}
          onClose={() => setOpenCanje(null)}
          onConfirm={(puntos, detalle) => {
            const id = openCanje;
            const c = clientes[id];
            if (puntos > c.puntos) { toast.error("Puntos insuficientes"); return; }
            setClientes({ ...clientes, [id]: { ...c, puntos: c.puntos - puntos } });
            setHistorial([
              { id: uid(), tipo: "canje", cliente: c.nombre, detalle, puntos, fecha: new Date().toISOString().slice(0, 10) },
              ...historial,
            ]);
            toast.success(`Canjeados ${puntos} pts`);
            setOpenCanje(null);
          }}
        />
      )}

      {/* Modal Config */}
      <ConfigDialog
        open={openConfig}
        onClose={() => setOpenConfig(false)}
        config={config}
        onSave={(c) => { setConfig(c); toast.success("Configuración guardada"); setOpenConfig(false); }}
      />

      {/* Modal historial cliente */}
      <Dialog open={!!openHistCliente} onOpenChange={(o) => !o && setOpenHistCliente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial — {openHistCliente && clientes[openHistCliente]?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {openHistCliente && historial.filter(h => normalize(h.cliente) === openHistCliente).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin movimientos.</p>
            )}
            {openHistCliente && historial.filter(h => normalize(h.cliente) === openHistCliente).map(m => (
              <div key={m.id} className="flex justify-between items-center text-sm border-b pb-2">
                <div>
                  <div className="font-medium">{m.detalle}</div>
                  <div className="text-xs text-muted-foreground">{m.fecha} · {m.tipo}</div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${m.tipo === "compra" ? "text-emerald-600" : "text-amber-600"}`}>
                    {m.tipo === "compra" ? "+" : "−"}{m.puntos} pts
                  </div>
                  {m.monto && <div className="text-xs text-muted-foreground">{formatCLP(m.monto)}</div>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function KPI({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${color}1A`, color }}>{icon}</span>
      </div>
      <div className="text-xl font-bold truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function CompraDialog({ open, onClose, config, onSave }: {
  open: boolean; onClose: () => void; config: Config;
  onSave: (nombre: string, monto: number, servicio: string, fecha: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [servicio, setServicio] = useState(SERVICIOS[0]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const m = Number(monto) || 0;
  const puntos = Math.floor(m / config.montoPorPunto);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar compra</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div>
            <Label>Monto ($)</Label>
            <Input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Servicio</Label>
            <Select value={servicio} onValueChange={setServicio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICIOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="rounded-lg p-3 text-sm" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <span className="text-amber-900">Puntos a otorgar: </span>
            <span className="font-bold text-amber-900">{puntos} pts</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!nombre.trim() || m <= 0} onClick={() => onSave(nombre, m, servicio, fecha)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CanjeDialog({ cliente, config, onClose, onConfirm }: {
  cliente: Cliente; config: Config; onClose: () => void;
  onConfirm: (puntos: number, detalle: string) => void;
}) {
  const [manual, setManual] = useState("");
  const beneficiosAlcanzables = config.beneficios.filter(b => b.puntos <= cliente.puntos);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canjear puntos — {cliente.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg p-3 text-center" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <div className="text-xs text-amber-900 font-medium">Puntos disponibles</div>
            <div className="text-2xl font-bold text-amber-900">{cliente.puntos.toLocaleString("es-CL")}</div>
          </div>

          <div>
            <Label className="mb-2 block">Beneficios disponibles</Label>
            {beneficiosAlcanzables.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no alcanza ningún beneficio configurado.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {beneficiosAlcanzables.map(b => (
                <button
                  key={b.nombre}
                  onClick={() => onConfirm(b.puntos, b.nombre)}
                  className="text-left rounded-lg border p-3 hover:border-primary hover:bg-accent transition"
                >
                  <div className="text-sm font-medium">{b.nombre}</div>
                  <div className="text-xs text-amber-600 font-semibold">{b.puntos} pts</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Canje manual (pts)</Label>
            <Input type="number" value={manual} onChange={e => setManual(e.target.value)} placeholder={`Mínimo ${config.minCanje}`} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!manual || Number(manual) < config.minCanje || Number(manual) > cliente.puntos}
            onClick={() => onConfirm(Number(manual), "Canje manual")}
          >
            Confirmar canje manual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigDialog({ open, onClose, config, onSave }: {
  open: boolean; onClose: () => void; config: Config; onSave: (c: Config) => void;
}) {
  const [draft, setDraft] = useState<Config>(config);
  const [newNombre, setNewNombre] = useState("");
  const [newPuntos, setNewPuntos] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setDraft(config); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Configuración</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>$ por 1 punto</Label>
              <Input type="number" value={draft.montoPorPunto}
                onChange={e => setDraft({ ...draft, montoPorPunto: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Mínimo de canje (pts)</Label>
              <Input type="number" value={draft.minCanje}
                onChange={e => setDraft({ ...draft, minCanje: Number(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Beneficios</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {draft.beneficios.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={b.nombre} onChange={e => {
                    const arr = [...draft.beneficios];
                    arr[i] = { ...arr[i], nombre: e.target.value };
                    setDraft({ ...draft, beneficios: arr });
                  }} />
                  <Input type="number" className="w-24" value={b.puntos} onChange={e => {
                    const arr = [...draft.beneficios];
                    arr[i] = { ...arr[i], puntos: Number(e.target.value) || 0 };
                    setDraft({ ...draft, beneficios: arr });
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => setDraft({ ...draft, beneficios: draft.beneficios.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <Input placeholder="Nombre beneficio" value={newNombre} onChange={e => setNewNombre(e.target.value)} />
              <Input type="number" className="w-24" placeholder="Pts" value={newPuntos} onChange={e => setNewPuntos(e.target.value)} />
              <Button size="sm" disabled={!newNombre.trim() || !newPuntos} onClick={() => {
                setDraft({ ...draft, beneficios: [...draft.beneficios, { nombre: newNombre.trim(), puntos: Number(newPuntos) }] });
                setNewNombre(""); setNewPuntos("");
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDraft(config); onClose(); }}>Cancelar</Button>
          <Button onClick={() => onSave(draft)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
