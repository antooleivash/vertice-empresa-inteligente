import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Building2 } from "lucide-react";
import type { EmpresaConfig } from "@/hooks/use-empresa";

export const Route = createFileRoute("/_app/configuracion/empresa")({ component: EmpresaPage });

function EmpresaPage() {
  const [form, setForm] = useState<EmpresaConfig>({
    nombre: "", rut: "", direccion: "", telefono: "", web: "", ciudad: "", logo_url: null, tipo_empresa: "servicios",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("empresa_config").select("*").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setForm(data as EmpresaConfig); });
  }, []);

  const save = async () => {
    const payload = { ...form };
    const { error } = form.id
      ? await supabase.from("empresa_config").update(payload).eq("id", form.id)
      : await supabase.from("empresa_config").insert(payload).select().single().then((r) => {
          if (r.data) setForm(r.data as EmpresaConfig);
          return r;
        });
    if (error) return toast.error(error.message);
    toast.success("Configuración guardada");
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("empresa-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("empresa-assets").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: data.publicUrl }));
      toast.success("Logo subido — recuerda guardar.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title="Configuración de empresa" description="Datos que aparecen en contratos, liquidaciones y PDFs." />
      <Card className="p-6 max-w-3xl space-y-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
            {form.logo_url
              ? <img src={form.logo_url} alt="Logo" className="object-contain h-full w-full" />
              : <Building2 className="h-10 w-10 text-muted-foreground" />}
          </div>
          <div>
            <Label className="block mb-1.5">Logo de la empresa</Label>
            <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Subir logo (PNG/JPG)"}
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre empresa" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
          <Field label="RUT" value={form.rut ?? ""} onChange={(v) => setForm({ ...form, rut: v })} placeholder="76.000.000-0" />
          <Field label="Dirección" value={form.direccion ?? ""} onChange={(v) => setForm({ ...form, direccion: v })} />
          <Field label="Ciudad" value={form.ciudad ?? ""} onChange={(v) => setForm({ ...form, ciudad: v })} />
          <Field label="Teléfono" value={form.telefono ?? ""} onChange={(v) => setForm({ ...form, telefono: v })} />
          <Field label="Sitio web" value={form.web ?? ""} onChange={(v) => setForm({ ...form, web: v })} />
        </div>
        <Button onClick={save}>Guardar configuración</Button>
      </Card>
    </PageShell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
