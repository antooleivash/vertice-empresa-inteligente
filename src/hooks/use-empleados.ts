import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado } from "@/lib/domain";

export function useEmpleados() {
  const [data, setData] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("empleados").select("*").order("nombre").then(({ data }) => {
      setData((data as Empleado[]) ?? []);
      setLoading(false);
    });
  }, []);
  const map = new Map<string, Empleado>();
  data.forEach((e) => map.set(e.id, e));
  return { empleados: data, empleadosMap: map, loading };
}
