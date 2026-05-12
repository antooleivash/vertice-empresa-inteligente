import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Sparkles, Copy, Download, Loader2, Instagram, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/_app/marketing/contenido")({ component: ContenidoPage });

const TIPOS = [
  { value: "instagram_promo", label: "📸 Promoción Instagram" },
  { value: "instagram_tips", label: "💡 Tips / Consejos" },
  { value: "instagram_empresa", label: "🏢 Contenido de empresa" },
  { value: "instagram_oferta", label: "🚀 Oferta laboral" },
];

const TONOS = [
  { value: "profesional", label: "Profesional" },
  { value: "cercano", label: "Cercano y directo" },
  { value: "motivador", label: "Motivador" },
  { value: "formal", label: "Formal" },
];

const ESTILOS = [
  { value: "moderno", gradient: "linear-gradient(135deg, #667eea, #764ba2)", label: "Moderno" },
  { value: "vibrante", gradient: "linear-gradient(135deg, #f093fb, #f5576c)", label: "Vibrante" },
  { value: "natural", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)", label: "Natural" },
  { value: "oscuro", gradient: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", label: "Oscuro" },
  { value: "sunset", gradient: "linear-gradient(135deg, #f7971e, #ffd200)", label: "Sunset" },
  { value: "verde", gradient: "linear-gradient(135deg, #11998e, #38ef7d)", label: "Verde" },
];

interface Resultado {
  titulo: string;
  cuerpo: string;
  hashtags: string;
  emoji_principal: string;
  cta: string;
}

function ContenidoPage() {
  const [tipo, setTipo] = useState("instagram_promo");
  const [tono, setTono] = useState("cercano");
  const [tema, setTema] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [estiloIdx, setEstiloIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [textoCompleto, setTextoCompleto] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const estilo = ESTILOS[estiloIdx];

  const generar = async () => {
    if (!tema) return toast.error("Ingresa el tema o descripción");
    setLoading(true);
    setResultado(null);
    setTextoCompleto("");

    try {
      const tipoLabel = TIPOS.find(t => t.value === tipo)?.label || tipo;
      const tonoLabel = TONOS.find(t => t.value === tono)?.label || tono;

      const prompt = `Eres un experto en marketing digital para empresas chilenas. 
Genera contenido para una publicación de Instagram.

Tipo: ${tipoLabel}
Tono: ${tonoLabel}
Tema/Descripción: ${tema}
${empresa ? `Empresa: ${empresa}` : ""}

Responde SOLO con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "titulo": "título llamativo máximo 8 palabras",
  "cuerpo": "texto principal de la publicación, máximo 150 palabras, con saltos de línea naturales usando \\n",
  "hashtags": "5-8 hashtags relevantes separados por espacio",
  "emoji_principal": "un solo emoji que represente el post",
  "cta": "llamado a la acción corto máximo 10 palabras"
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((i: any) => i.text || "").join("") || "";

      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed: Resultado = JSON.parse(clean);
        setResultado(parsed);
        const textoPost = `${parsed.emoji_principal} ${parsed.titulo}\n\n${parsed.cuerpo}\n\n${parsed.cta}\n\n${parsed.hashtags}`;
        setTextoCompleto(textoPost);
      } catch {
        setTextoCompleto(text);
        toast.error("No se pudo parsear la respuesta");
      }
    } catch (e) {
      toast.error("Error al conectar con la IA");
    } finally {
      setLoading(false);
    }
  };

  const copiarTexto = () => {
    navigator.clipboard.writeText(textoCompleto);
    toast.success("Texto copiado — listo para pegar en Instagram");
  };

  const descargarImagen = async () => {
    if (!cardRef.current) return;
    toast.info("Generando imagen...");
    try {
      const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 2 });
      const link = document.createElement("a");
      link.download = "instagram-post.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagen descargada");
    } catch {
      toast.error("No se pudo descargar la imagen");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Contenido IA para Instagram"
        description="Genera publicaciones listas para copiar y publicar, con diseño visual incluido."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", marginBottom: 20 }}>✍️ Describe tu publicación</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>TIPO DE CONTENIDO</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TIPOS.map(t => (
                <button key={t.value} onClick={() => setTipo(t.value)} style={{
                  padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", textAlign: "left",
                  border: tipo === t.value ? "2px solid #6366F1" : "1.5px solid #E2E8F0",
                  background: tipo === t.value ? "#EEF2FF" : "#fff",
                  color: tipo === t.value ? "#4338CA" : "#475569",
                  fontWeight: tipo === t.value ? 600 : 400,
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>TONO</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TONOS.map(t => (
                <button key={t.value} onClick={() => setTono(t.value)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: tono === t.value ? "2px solid #6366F1" : "1.5px solid #E2E8F0",
                  background: tono === t.value ? "#EEF2FF" : "#fff",
                  color: tono === t.value ? "#4338CA" : "#475569",
                  fontWeight: tono === t.value ? 600 : 400,
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>TEMA O DESCRIPCIÓN *</label>
            <textarea value={tema} onChange={e => setTema(e.target.value)}
              placeholder="Ej: Ofrecemos servicio de faenamiento de calidad para el sector salmonero en Puerto Montt"
              rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, border: "1.5px solid #E2E8F0", resize: "none", fontFamily: "inherit", color: "#1E293B", outline: "none" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 6 }}>NOMBRE DE EMPRESA (opcional)</label>
            <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ej: Multi X S.A."
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13, border: "1.5px solid #E2E8F0", fontFamily: "inherit", color: "#1E293B", outline: "none" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 8 }}>ESTILO DE TARJETA</label>
            <div style={{ display: "flex", gap: 8 }}>
              {ESTILOS.map((e, i) => (
                <button key={e.value} onClick={() => setEstiloIdx(i)} title={e.label} style={{
                  width: 36, height: 36, borderRadius: 8, cursor: "pointer",
                  background: e.gradient,
                  border: estiloIdx === i ? "3px solid #1E293B" : "3px solid transparent",
                  outline: "none",
                }} />
              ))}
            </div>
          </div>

          <button onClick={generar} disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: loading ? "#C7D2FE" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
            color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading
              ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Generando...</>
              : <><Sparkles style={{ width: 16, height: 16 }} /> Generar con IA</>}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10 }}>VISTA PREVIA — TARJETA INSTAGRAM</div>
            <div ref={cardRef} style={{
              width: "100%", aspectRatio: "1 / 1",
              background: resultado ? estilo.gradient : "#F8FAFC",
              borderRadius: 16, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: 32, textAlign: "center", position: "relative",
              overflow: "hidden", border: "1px solid #E2E8F0",
            }}>
              {!resultado && !loading && (
                <div style={{ color: "#CBD5E1", fontSize: 13 }}>
                  <Instagram style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.3 }} />
                  <div>La tarjeta aparecerá aquí</div>
                </div>
              )}
              {loading && (
                <div style={{ color: "#94A3B8", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite" }} />
                  <div>Generando contenido...</div>
                </div>
              )}
              {resultado && !loading && (
                <>
                  <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                  <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>{resultado.emoji_principal}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>{resultado.titulo}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 1.6, marginBottom: 16, whiteSpace: "pre-line" }}>
                      {resultado.cuerpo.slice(0, 200)}{resultado.cuerpo.length > 200 ? "..." : ""}
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 16px", fontSize: 11, color: "#fff", fontWeight: 600, display: "inline-block", marginBottom: 12 }}>{resultado.cta}</div>
                    {empresa && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>{empresa}</div>}
                  </div>
                </>
              )}
            </div>
          </div>

          {resultado && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copiarTexto} style={{
                flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#EEF2FF", color: "#4338CA", border: "1.5px solid #C7D2FE", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Copy style={{ width: 14, height: 14 }} /> Copiar texto
              </button>
              <button onClick={descargarImagen} style={{
                flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#F0FDF4", color: "#16A34A", border: "1.5px solid #BBF7D0", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <Download style={{ width: 14, height: 14 }} /> Descargar imagen
              </button>
              <button onClick={generar} style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 13,
                background: "#F8FAFC", color: "#64748B", border: "1.5px solid #E2E8F0", cursor: "pointer",
              }}>
                <RefreshCw style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}

          {textoCompleto && (
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>TEXTO COMPLETO PARA INSTAGRAM</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-line" }}>{textoCompleto}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </PageShell>
  );
}
