import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "danger" | "warning" | "info" | "neutral";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "#064E3B", fg: "#34D399" },
  danger:  { bg: "#450A0A", fg: "#F87171" },
  warning: { bg: "#451A03", fg: "#FBBF24" },
  info:    { bg: "#0C4A6E", fg: "#38BDF8" },
  neutral: { bg: "#1E293B", fg: "#94A3B8" },
};

const KEYWORDS: Array<[Tone, string[]]> = [
  ["success", ["activo","activa","presente","aprobado","aprobada","autorizado","autorizada","vigente","pagado","pagada","emitida","emitido","ok","puntual","a tiempo","declarado","declarada","abierta","cuadrado"]],
  ["danger",  ["inactivo","inactiva","ausente","rechazado","rechazada","vencido","vencida","atraso","critico","crítico","riesgo","sin autorizar","no autorizada","bajo meta","alerta","descuadrado"]],
  ["warning", ["pendiente","por vencer","advertencia","amonestacion","amonestación","pausada","pausado"]],
  ["info",    ["licencia","permiso","info","felicitacion","felicitación"]],
];

function detectTone(label: string): Tone {
  const s = label.toLowerCase().trim();
  for (const [tone, words] of KEYWORDS) {
    if (words.some((w) => s.includes(w))) return tone;
  }
  return "neutral";
}

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  tone?: Tone;
}

export function StatusPill({ label, tone, className, style, ...rest }: StatusPillProps) {
  const t = TONES[tone ?? detectTone(label)];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}
      style={{
        backgroundColor: t.bg,
        color: t.fg,
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.2,
        border: "none",
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: t.fg, display: "inline-block" }}
      />
      {label}
    </span>
  );
}
