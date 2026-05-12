import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-shell";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  empresa_id: string | null;
  empresa_nombre: string;
}

interface Empresa {
  id: string;
  nombre: string;
  tipo_empresa: string;
  plan: string;
}

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [tab, setTab] = useState<"empresas" | "usuarios">("empresas");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Empresas
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nuevaEmpresa, setNuevaEmpresa] = useState({ nombre: "", tipo_empresa: "servicios", plan: "Basico" });
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);

  // Usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: "", password: "", empresa_id: "", rol: "admin" });
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  useEffect(() => {
    verificarRol();
  }, []);

  async function verificarRol() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (data?.role === "superadmin") {
      setIsSuperadmin(true);
      cargarEmpresas();
      cargarUsuarios();
    }
    setLoading(false);
  }

  async function cargarEmpresas() {
    const { data } = await supabase.from("empresa_config").select("id, nombre, tipo_empresa, plan").order("nombre");
    setEmpresas((data || []) as Empresa[]);
  }

  async function cargarUsuarios() {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role, empresa_id");
    const { data: authUsers } = await supabase.auth.admin?.listUsers() || { data: null };
    const { data: empresasData } = await supabase.from("empresa_config").select("id, nombre");

    const empresaMap: Record<string, string> = {};
    (empresasData || []).forEach((e: any) => { empresaMap[e.id] = e.nombre; });

    const lista: Usuario[] = (roles || []).map((r: any) => ({
      id: r.user_id,
      email: r.user_id.slice(0, 8) + "...",
      nombre: r.user_id.slice(0, 8),
      rol: r.role || "empleado",
      activo: true,
      empresa_id: r.empresa_id,
      empresa_nombre: r.empresa_id ? (empresaMap[r.empresa_id] || "Sin empresa") : "Sin empresa",
    }));

    setUsuarios(lista);
  }

  async function crearEmpresa() {
    if (!nuevaEmpresa.nombre) return toast.error("Ingresa el nombre de la empresa");
    setCreandoEmpresa(true);
    const { error } = await supabase.from("empresa_config").insert({
      nombre: nuevaEmpresa.nombre,
      tipo_empresa: nuevaEmpresa.tipo_empresa,
      plan: nuevaEmpresa.plan,
    });
    if (error) toast.error("Error al crear empresa");
    else {
      toast.success("Empresa creada");
      setNuevaEmpresa({ nombre: "", tipo_empresa: "servicios", plan: "Basico" });
      cargarEmpresas();
    }
    setCreandoEmpresa(false);
  }

  async function eliminarEmpresa(id: string) {
    if (!confirm("¿Eliminar esta empresa?")) return;
    await supabase.from("empresa_config").delete().eq("id", id);
    toast.success("Empresa eliminada");
    cargarEmpresas();
  }

  async function crearUsuario() {
    if (!nuevoUsuario.email || !nuevoUsuario.password || !nuevoUsuario.empresa_id) {
      return toast.error("Completa todos los campos");
    }
    setCreandoUsuario(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: nuevoUsuario.rol,
          empresa_id: nuevoUsuario.empresa_id,
        });
        toast.success("Usuario creado — debe verificar su correo");
        setNuevoUsuario({ email: "", password: "", empresa_id: "", rol: "admin" });
        cargarUsuarios();
      }
    } catch (e: any) {
      toast.error(e.message || "Error al crear usuario");
    }
    setCreandoUsuario(false);
  }

  async function cambiarEmpresaUsuario(userId: string, empresaId: string) {
    await supabase.from("user_roles").update({ empresa_id: empresaId }).eq("user_id", userId);
    toast.success("Empresa actualizada");
    cargarUsuarios();
  }

  if (loading) return <div style={{ padding: 40, color: "#94A3B8" }}>Cargando...</div>;

  if (!isSuperadmin) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ color: "#F87171", fontSize: 16, fontWeight: 600 }}>Acceso denegado</div>
      <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>Solo el superadmin puede acceder a esta página.</div>
    </div>
  );

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
    border: "1px solid #334155", background: "#0F172A", color: "#F1F5F9",
    fontFamily: "inherit", outline: "none",
  };

  const selectStyle = {
    ...inputStyle, cursor: "pointer",
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Panel Superadmin"
        description="Gestiona todas las empresas y usuarios del sistema"
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["empresas", "usuarios"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: "1px solid #334155",
            background: tab === t ? "#6366F1" : "#1E293B",
            color: tab === t ? "#fff" : "#94A3B8",
          }}>
            {t === "empresas" ? "🏢 Empresas" : "👤 Usuarios"}
          </button>
        ))}
      </div>

      {/* TAB EMPRESAS */}
      {tab === "empresas" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* Formulario nueva empresa */}
          <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", marginBottom: 16 }}>➕ Nueva empresa</div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>NOMBRE</label>
              <input value={nuevaEmpresa.nombre} onChange={e => setNuevaEmpresa({ ...nuevaEmpresa, nombre: e.target.value })}
                placeholder="Ej: Patitas Chic S.A." style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>TIPO DE EMPRESA</label>
              <select value={nuevaEmpresa.tipo_empresa} onChange={e => setNuevaEmpresa({ ...nuevaEmpresa, tipo_empresa: e.target.value })} style={selectStyle}>
                <option value="servicios">Servicios (peluquería, etc)</option>
                <option value="restaurante">Restaurante</option>
                <option value="retail">Retail / Tienda</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>PLAN</label>
              <select value={nuevaEmpresa.plan} onChange={e => setNuevaEmpresa({ ...nuevaEmpresa, plan: e.target.value })} style={selectStyle}>
                <option value="Basico">Básico</option>
                <option value="Empresa">Empresa</option>
                <option value="Corporativo">Corporativo</option>
              </select>
            </div>

            <button onClick={crearEmpresa} disabled={creandoEmpresa} style={{
              width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: creandoEmpresa ? "#334155" : "#6366F1", color: "#fff",
              border: "none", cursor: creandoEmpresa ? "not-allowed" : "pointer",
            }}>
              {creandoEmpresa ? "Creando..." : "Crear empresa"}
            </button>
          </div>

          {/* Lista empresas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", marginBottom: 4 }}>
              Empresas registradas ({empresas.length})
            </div>
            {empresas.map(e => (
              <div key={e.id} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>{e.nombre}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{e.tipo_empresa} · Plan {e.plan}</div>
                </div>
                <button onClick={() => eliminarEmpresa(e.id)} style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  border: "1px solid #450A0A", background: "#450A0A", color: "#F87171",
                }}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB USUARIOS */}
      {tab === "usuarios" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* Formulario nuevo usuario */}
          <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", marginBottom: 16 }}>➕ Nuevo usuario</div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>CORREO</label>
              <input type="email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                placeholder="correo@empresa.cl" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>CONTRASEÑA TEMPORAL</label>
              <input type="password" value={nuevoUsuario.password} onChange={e => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                placeholder="Mínimo 6 caracteres" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>EMPRESA</label>
              <select value={nuevoUsuario.empresa_id} onChange={e => setNuevoUsuario({ ...nuevoUsuario, empresa_id: e.target.value })} style={selectStyle}>
                <option value="">Selecciona empresa...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>ROL</label>
              <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })} style={selectStyle}>
                <option value="admin">Admin (dueño de empresa)</option>
                <option value="supervisor">Supervisor</option>
                <option value="empleado">Empleado</option>
              </select>
            </div>

            <button onClick={crearUsuario} disabled={creandoUsuario} style={{
              width: "100%", padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: creandoUsuario ? "#334155" : "#6366F1", color: "#fff",
              border: "none", cursor: creandoUsuario ? "not-allowed" : "pointer",
            }}>
              {creandoUsuario ? "Creando..." : "Crear usuario"}
            </button>
          </div>

          {/* Lista usuarios */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", marginBottom: 4 }}>
              Usuarios registrados ({usuarios.length})
            </div>
            {usuarios.map(u => (
              <div key={u.id} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>{u.id.slice(0, 12)}...</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Rol: {u.rol}</div>
                  </div>
                  <span style={{
                    background: u.rol === "superadmin" ? "#4C1D95" : u.rol === "admin" ? "#0C4A6E" : "#1E293B",
                    color: u.rol === "superadmin" ? "#C4B5FD" : u.rol === "admin" ? "#38BDF8" : "#94A3B8",
                    padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                  }}>{u.rol}</span>
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>Empresa actual: {u.empresa_nombre}</div>
                <select
                  value={u.empresa_id || ""}
                  onChange={e => cambiarEmpresaUsuario(u.id, e.target.value)}
                  style={{ ...selectStyle, fontSize: 12, padding: "6px 10px" }}
                >
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}