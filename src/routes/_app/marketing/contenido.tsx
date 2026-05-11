import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Loader2, Instagram } from "lucide-react";
import { toast } from "sonner";
import { generarContenidoInstagram } from "@/lib/contenido-ia.functions";

export const Route = createFileRoute("/_app/marketing/contenido")({ component: ContenidoPage });

const TIPOS = ["Promoción Instagram", "Tips/Consejos", "Contenido de empresa", "Oferta laboral"] as const;
const TONOS = ["Profesional", "Cercano y directo", "Motivador", "Formal"] as const;

const ESTILOS = [
  { id: "rosa",     label: "Rosa",     gradient: "linear-gradient(135deg,#f472b6,#a855f7)" },
  { id: "naranja",  label: "Naranja",  gradient: "linear-gradient(135deg,#fb923c,#ef4444)" },
  { id: "azul",     label: "Azul",     gradient: "linear-gradient(135deg,#38bdf8,#1e3a8a)" },
  { id: "verde",    label: "Verde",    gradient: "linear-gradient(135deg,#34d399,#0f766e)" },
  { id: "violeta",  label: "Violeta",  gradient: "linear-gradient(135deg,#8b5cf6,#3b0764)" },
  { id: "oscuro",   label: "Oscuro",   gradient: "linear-gradient(135deg,#1f2937,#000000)" },
];

type Resultado = {
  titulo: string;
  cuerpo: string;
  hashtags: string;
  emoji_principal: string;
  cta: string;
};

function ContenidoPage() {
  const generar = useServerFn(generarContenidoInstagram);
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [tono, setTono] = useState<string>(TONOS[1]);
  const [empresa, setEmpresa] = useState("");
  const [tema, setTema] = useState("");
  const [estilo, setEstilo] = useState(ESTILOS[0]);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);

  const onGenerar = async () => {
    if (!tema.trim()) return toast.error("Describe el tema de la publicación");
    setLoading(true);
    try {
      const r = await generar({ data: { tipo, tono, tema, empresa } });
      setRes(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error generando contenido");
    } finally {
      setLoading(false);
    }
  };

  const textoCompleto = res
    ? `${res.emoji_principal} ${res.titulo}\n\n${res.cuerpo}\n\n${res.cta}\n\n${res.hashtags}`
    : "";

  const copiar = () => {
    if (!textoCompleto) return;
    navigator.clipboard.writeText(textoCompleto);
    toast.success("Texto copiado");
  };

  return (
    <PageShell>
      <PageHeader title="Contenido IA para Instagram" description="Genera publicaciones reales con IA en segundos." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de contenido</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tono</Label>
              <Select value={tono} onValueChange={setTono}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TONOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tema o descripción de la publicación</Label>
            <Textarea
              rows={5}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ej: Lanzamos nuevo servicio de mantenimiento industrial 24/7 en Puerto Montt con descuento de 20% el primer mes."
            />
          </div>

          <div>
            <Label>Nombre de empresa (opcional)</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ej: Vértice" />
          </div>

          <div>
            <Label className="mb-2 block">Estilo visual de la tarjeta</Label>
            <div className="grid grid-cols-6 gap-2">
              {ESTILOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setEstilo(s)}
                  title={s.label}
                  className={`h-10 rounded-md border-2 transition ${estilo.id === s.id ? "border-foreground scale-105" : "border-transparent"}`}
                  style={{ background: s.gradient }}
                />
              ))}
            </div>
          </div>

          <Button onClick={onGenerar} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generar con IA
          </Button>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Instagram className="h-4 w-4" /> Vista previa
            </div>
            <div
              className="aspect-square w-full rounded-lg p-6 flex flex-col justify-between text-white shadow-lg overflow-hidden"
              style={{ background: estilo.gradient }}
            >
              <div className="text-5xl">{res?.emoji_principal ?? "✨"}</div>
              <div className="space-y-3">
                <div className="text-2xl font-bold leading-tight drop-shadow">
                  {res?.titulo || "Tu título aparecerá aquí"}
                </div>
                <div className="text-sm leading-snug opacity-95 line-clamp-4 whitespace-pre-line">
                  {res?.cuerpo || "El cuerpo de la publicación se mostrará aquí cuando generes el contenido con IA."}
                </div>
                {res?.cta && (
                  <div className="inline-block bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold">
                    {res.cta}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {res && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Texto completo</div>
                <Button size="sm" variant="ghost" onClick={copiar}><Copy className="h-3 w-3 mr-1" />Copiar</Button>
              </div>
              <Textarea readOnly rows={10} value={textoCompleto} className="font-mono text-xs" />
              <div className="text-xs text-muted-foreground">{res.hashtags}</div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
