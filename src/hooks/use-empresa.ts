import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EmpresaConfig = {
  id?: string;
  nombre: string;
  rut: string | null;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  ciudad: string | null;
  logo_url: string | null;
};

const DEFAULT: EmpresaConfig = {
  nombre: "Mi Empresa S.A.",
  rut: "76.000.000-0",
  direccion: "Av. Principal 1234, Puerto Montt",
  telefono: null, web: null, ciudad: "Puerto Montt", logo_url: null,
};

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<EmpresaConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    const { data } = await supabase.from("empresa_config").select("*").limit(1).maybeSingle();
    if (data) setEmpresa(data as EmpresaConfig);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);
  return { empresa, loading, reload };
}
