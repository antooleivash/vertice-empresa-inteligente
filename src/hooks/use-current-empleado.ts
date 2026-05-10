import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Empleado, Rol } from "@/lib/domain";

export function useCurrentEmpleado() {
  const { user, loading: authLoading } = useAuth();
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEmpleado(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // 1) Por user_id
      let { data } = await supabase
        .from("empleados")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // 2) Si no, intentar por email y autovincular
      if (!data && user.email) {
        const { data: porEmail } = await supabase
          .from("empleados")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();
        if (porEmail) {
          await supabase.from("empleados").update({ user_id: user.id }).eq("id", porEmail.id);
          data = { ...porEmail, user_id: user.id };
        }
      }

      if (!cancelled) {
        setEmpleado((data as Empleado) ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const rol: Rol = (empleado?.rol as Rol) || (empleado ? "empleado" : "admin");
  // Si el usuario está autenticado pero no tiene empleado vinculado → admin (acceso total)
  const isAdmin = !empleado || rol === "admin" || rol === "supervisor";

  return { empleado, rol, isAdmin, loading };
}
