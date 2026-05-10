import { useEffect, useState } from "react";

export type IndicadorKey = "uf" | "utm" | "ipc" | "dolar" | "euro" | "tasa_interes" | "sueldo_minimo";

export type IndicadorSerie = {
  fecha: string;
  valor: number;
};

export type IndicadorData = {
  codigo: IndicadorKey;
  nombre: string;
  unidad_medida: string;
  fecha: string;
  valor: number;
  /** % variation vs previous available data point in the historical serie */
  variacion: number | null;
  fetchedAt: number;
};

const ENDPOINTS: Record<IndicadorKey, { url: string; nombre: string }> = {
  uf: { url: "https://mindicador.cl/api/uf", nombre: "UF" },
  utm: { url: "https://mindicador.cl/api/utm", nombre: "UTM" },
  ipc: { url: "https://mindicador.cl/api/ipc", nombre: "IPC" },
  dolar: { url: "https://mindicador.cl/api/dolar", nombre: "Dólar" },
  euro: { url: "https://mindicador.cl/api/euro", nombre: "Euro" },
  tasa_interes: { url: "https://mindicador.cl/api/tasa_interes", nombre: "Tasa interés" },
  sueldo_minimo: { url: "https://mindicador.cl/api/sueldo_minimo", nombre: "Salario mínimo" },
};

const CACHE_KEY = "vertice.indicadores.cache.v1";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

type CacheShape = { fetchedAt: number; data: Record<string, IndicadorData> };

function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(c: CacheShape) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

async function fetchOne(key: IndicadorKey): Promise<IndicadorData | null> {
  try {
    const r = await fetch(ENDPOINTS[key].url);
    if (!r.ok) return null;
    const j = await r.json();
    const serie: IndicadorSerie[] = j.serie ?? [];
    const ultimo = serie[0];
    const previo = serie[1];
    const variacion = ultimo && previo && previo.valor
      ? ((ultimo.valor - previo.valor) / previo.valor) * 100
      : null;
    return {
      codigo: key,
      nombre: j.nombre ?? ENDPOINTS[key].nombre,
      unidad_medida: j.unidad_medida ?? "",
      fecha: ultimo?.fecha ?? "",
      valor: ultimo?.valor ?? 0,
      variacion,
      fetchedAt: Date.now(),
    };
  } catch { return null; }
}

let inFlight: Promise<Record<string, IndicadorData>> | null = null;

async function fetchAll(): Promise<Record<string, IndicadorData>> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const keys = Object.keys(ENDPOINTS) as IndicadorKey[];
    const arr = await Promise.all(keys.map(fetchOne));
    const out: Record<string, IndicadorData> = {};
    arr.forEach((d) => { if (d) out[d.codigo] = d; });
    writeCache({ fetchedAt: Date.now(), data: out });
    return out;
  })();
  try { return await inFlight; } finally { inFlight = null; }
}

export function useIndicadores() {
  const [data, setData] = useState<Record<string, IndicadorData>>(() => readCache()?.data ?? {});
  const [fetchedAt, setFetchedAt] = useState<number>(() => readCache()?.fetchedAt ?? 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = readCache();
    if (cached && Object.keys(cached.data).length >= 5) {
      setData(cached.data); setFetchedAt(cached.fetchedAt);
      return;
    }
    setLoading(true);
    fetchAll().then((d) => {
      setData(d); setFetchedAt(Date.now());
    }).finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    setLoading(true);
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    const d = await fetchAll();
    setData(d); setFetchedAt(Date.now()); setLoading(false);
  };

  return { data, fetchedAt, loading, refresh };
}

export function tiempoTranscurrido(ts: number): string {
  if (!ts) return "—";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "hace menos de un minuto";
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

export function formatIndicador(ind: IndicadorData | undefined): string {
  if (!ind) return "—";
  if (ind.codigo === "uf" || ind.codigo === "utm" || ind.codigo === "dolar" || ind.codigo === "euro" || ind.codigo === "sueldo_minimo") {
    return "$" + new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(ind.valor);
  }
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(ind.valor) + (ind.unidad_medida === "Porcentaje" ? "%" : "");
}
