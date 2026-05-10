import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, RefreshCw, Minus } from "lucide-react";
import { useIndicadores, tiempoTranscurrido, formatIndicador, type IndicadorKey } from "@/hooks/use-indicadores";

const ORDER: IndicadorKey[] = ["uf", "utm", "ipc", "dolar", "euro", "tasa_interes", "sueldo_minimo"];

export function IndicadoresBar() {
  const { data, fetchedAt, loading, refresh } = useIndicadores();
  const items = ORDER.map((k) => data[k]).filter(Boolean);

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">Indicadores económicos Chile</div>
          <div className="text-xs text-muted-foreground">
            Fuente: mindicador.cl · Actualizado {tiempoTranscurrido(fetchedAt)}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {loading && items.length === 0
          ? Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-20 min-w-[160px] rounded-md" />
            ))
          : items.map((ind) => {
              const variacion = ind.variacion;
              const up = (variacion ?? 0) > 0;
              const down = (variacion ?? 0) < 0;
              return (
                <div key={ind.codigo} className="min-w-[160px] flex-shrink-0 rounded-md border border-border p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{ind.nombre}</div>
                  <div className="text-lg font-bold tabular-nums">{formatIndicador(ind)}</div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <span>{ind.fecha?.slice(0, 10)}</span>
                    <span className={`flex items-center gap-0.5 ${up ? "text-emerald-600" : down ? "text-red-600" : ""}`}>
                      {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {variacion !== null ? `${Math.abs(variacion).toFixed(2)}%` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
}
