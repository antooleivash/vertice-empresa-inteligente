// Cálculos de liquidación de sueldo (Chile)
export const AFP_TASAS: Record<string, number> = {
  Habitat: 0.1127,
  Capital: 0.1144,
  Cuprum: 0.1144,
  Planvital: 0.1116,
  Provida: 0.1145,
  Uno: 0.1069,
};

export const AFP_LIST = Object.keys(AFP_TASAS);

export type ItemMonto = { concepto: string; monto: number };

export type LiqInput = {
  sueldo_base: number;
  horas_extras: number; // monto en CLP de horas extras (50%)
  asignacion_familiar: number;
  afp: string;
  salud: string; // Fonasa | Isapre
  salud_monto: number; // si Isapre, monto fijo CLP
  anticipo: number;
  otros_bonos: ItemMonto[];
  otros_descuentos: ItemMonto[];
};

export type LiqResult = {
  gratificacion: number;
  total_imponible: number;
  cotiz_prevision: number;
  cotiz_salud: number;
  seguro_cesantia: number;
  impuesto_unico: number;
  total_haberes: number;
  total_descuentos: number;
  base_tributable: number;
  liquido: number;
};

const TOPE_GRATIF = 209396; // tope mensual referencial 2025
const r = Math.round;

// Tabla impuesto único 2025 simplificada (CLP mensual)
function impuestoUnico(base: number): number {
  if (base <= 926000) return 0;
  if (base <= 2058000) return r(base * 0.04 - 37040);
  if (base <= 3430000) return r(base * 0.08 - 119360);
  if (base <= 4802000) return r(base * 0.135 - 308010);
  if (base <= 6174000) return r(base * 0.23 - 764200);
  if (base <= 8232000) return r(base * 0.304 - 1221080);
  if (base <= 21266000) return r(base * 0.35 - 1599800);
  return r(base * 0.4 - 2663100);
}

export function calcular(input: LiqInput): LiqResult {
  const bonosImp = input.otros_bonos.reduce((s, b) => s + (Number(b.monto) || 0), 0);
  const gratificacion = Math.min(r(input.sueldo_base * 0.25), TOPE_GRATIF);
  const total_imponible = input.sueldo_base + gratificacion + (input.horas_extras || 0) + bonosImp;

  const tasaAFP = AFP_TASAS[input.afp] ?? 0.1127;
  const cotiz_prevision = r(total_imponible * tasaAFP);
  const cotiz_salud =
    input.salud === "Isapre"
      ? Math.max(input.salud_monto || 0, r(total_imponible * 0.07))
      : r(total_imponible * 0.07);
  const seguro_cesantia = r(total_imponible * 0.006);

  const base_tributable = total_imponible - cotiz_prevision - cotiz_salud - seguro_cesantia;
  const impuesto_unico = impuestoUnico(base_tributable);

  const total_haberes = total_imponible + (input.asignacion_familiar || 0);
  const otrosDesc = input.otros_descuentos.reduce((s, d) => s + (Number(d.monto) || 0), 0);
  const total_descuentos =
    cotiz_prevision + cotiz_salud + seguro_cesantia + impuesto_unico + (input.anticipo || 0) + otrosDesc;

  return {
    gratificacion,
    total_imponible,
    cotiz_prevision,
    cotiz_salud,
    seguro_cesantia,
    impuesto_unico,
    total_haberes,
    total_descuentos,
    base_tributable,
    liquido: total_haberes - total_descuentos,
  };
}
