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
  tipo_empresa: string | null;
};

const DEFAULT: EmpresaConfig = {
  nombre: "Mi Empresa S.A.",
  rut: "76.000.000-0",
  direccion: "Av. Principal 1234, Puerto Montt",
  telefono: null, web: null, ciudad: "Puerto Montt", logo_url: null,
  tipo_empresa: "servicios",
};

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<EmpresaConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: rol } = await supabase
      .from("user_roles")
      .select("empresa_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (rol?.empresa_id) {
      const { data } = await supabase
        .from("empresa_config")
        .select("*")
        .eq("id", rol.empresa_id)
        .maybeSingle();
      if (data) setEmpresa(data as EmpresaConfig);
    }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);
  return { empresa, loading, reload };
}