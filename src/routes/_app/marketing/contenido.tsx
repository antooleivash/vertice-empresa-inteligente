import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Sparkles, Copy, Loader2, Instagram, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/marketing/contenido")({ component: ContenidoPage });

const TIPOS = [
  "📸 Promoción Instagram",
  "💡 Tips / Consejos",
  "🏢 Contenido de empresa",
  "🚀 Oferta laboral",
] as const;

const TONOS = ["Profesional", "Cercano y directo", "Motivador", "Formal"] as const;

const ESTILOS = [
  { id: "rosa",    label: "Rosa",    gradient: "linear-gradient(135deg,#f472b6,#a855f7)" },
  { id: "naranja", label: "Naranja", gradient: "linear-gradient(135deg,#fb923c,#ef4444)" },
  { id: "azul",    label: "Azul",    gradient: "linear-gradient(135deg,#38bdf8,#1e3a8a)" },
  { id: "verde",   label: "Verde",   gradient: "linear-gradient(135deg,#34d399,#0f766e)" },
  { id: "violeta", label: "Violeta", gradient: "linear-gradient(135deg,#8b5cf6,#3b0764)" },
  { id: "oscuro",  label: "Oscuro",  gradient: "linear-gradient(135deg,#1f2937,#000000)" },
];

type Resultado = {
  titulo: string;
  cuerpo: string;
  hashtags: string;
  emoji_principal: string;
  cta: string;
};

function ContenidoPage() {
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [tono, setTono] = useState<string>(TONOS[1]);
  const [empresa, setEmpresa] = useState("");
  const [tema, setTema] = useState("");
  const [estilo, setEstilo] = useState(ESTILOS[0]);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const lastReqRef = useRef<{ tipo: string; tono: string; empresa: string; tema: string } | null>(null);

  const generar = async (regen = false) => {
    const payload = regen && lastReqRef.current ? lastReqRef.current : { tipo, tono, empresa, tema };
    if (!payload.tema.trim()) {
      toast.error("Describe el tema de la publicación");
      return;
    }
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
    if (!apiKey) {
      toast.error("Falta VITE_ANTHROPIC_API_KEY en las variables de entorno.");
      return;
    }
    lastReqRef.current = payload;
    setLoading(true);
    try {
      const system = `Eres un experto creador de contenido para Instagram, especializado en empresas chilenas. Escribes en español de Chile, con tono ${payload.tono}.
Responde SIEMPRE y SOLO con un objeto JSON válido (sin markdown, sin texto extra, sin backticks) con estos campos exactos:
{
  "titulo": "título corto y potente (máx 60 caracteres)",
  "cuerpo": "cuerpo de la publicación, 2-4 párrafos cortos con saltos de línea",
  "hashtags": "string con 6-10 hashtags separados por espacio, todos comenzando con #",
  "emoji_principal": "un solo emoji representativo",
  "cta": "llamada a la acción corta (máx 50 caracteres)"
}`;

      const user = `Tipo de contenido: ${payload.tipo}
${payload.empresa ? `Empresa: ${payload.empresa}` : ""}
Tema/descripción: ${payload.tema}

Genera la publicación en formato JSON.`;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });

      if (!r.ok) {
        const txt = await r.text();
        console.error("Anthropic error", r.status, txt);
        throw new Error(`Error ${r.status}: ${txt.slice(0, 200)}`);
      }
      const json = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
      const raw = json.content?.find((c) => c.type === "text")?.text?.trim() ?? "{}";
      let parsed: Partial<Resultado>;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : {};
      }
      setRes({
        titulo: parsed.titulo ?? "",
        cuerpo: parsed.cuerpo ?? "",
        hashtags: parsed.hashtags ?? "",
        emoji_principal: parsed.emoji_principal ?? "✨",
        cta: parsed.cta ?? "",
      });
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
      <PageHeader
        title="Contenido IA para Instagram"
        description="Genera publicaciones reales con Claude en segundos."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel de configuración */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo de contenido</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tono</label>
              <select
                value={tono}
                onChange={(e) => setTono(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {TONOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tema o descripción de la publicación</label>
            <textarea
              rows={5}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ej: Lanzamos nuevo servicio de mantenimiento industrial 24/7 en Puerto Montt con 20% de descuento el primer mes."
              className="w-full rounded-md border border-input bg-transparent p-3 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Nombre de empresa (opcional)</label>
            <input
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej: Vértice"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Estilo visual de la tarjeta</label>
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

          <div className="flex gap-2">
            <button
              onClick={() => generar(false)}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generar con IA
            </button>
            {res && (
              <button
                onClick={() => generar(true)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-input text-sm font-medium disabled:opacity-50"
                title="Regenerar con los mismos datos"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Vista previa */}
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-4">
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
          </div>

          {res && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Texto completo</div>
                <button
                  onClick={copiar}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md hover:bg-accent"
                >
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              </div>
              <textarea
                readOnly
                rows={10}
                value={textoCompleto}
                className="w-full rounded-md border border-input bg-transparent p-3 font-mono text-xs"
              />
              <div className="text-xs text-muted-foreground break-words">{res.hashtags}</div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
