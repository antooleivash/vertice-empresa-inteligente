import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpleado } from "@/hooks/use-current-empleado";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, LogIn, LogOut, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/asistencia")({ component: PortalAsistencia });

type Marca = { id: string; fecha: string; entrada: string | null; salida: string | null };

function PortalAsistencia() {
  const { empleado } = useCurrentEmpleado();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [hoy, setHoy] = useState<Marca | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const mes = today.slice(0, 7);

  const load = async () => {
    if (!empleado) return;
    const { data } = await supabase
      .from("asistencia").select("id,fecha,entrada,salida")
      .eq("empleado_id", empleado.id)
      .gte("fecha", `${mes}-01`)
      .order("fecha", { ascending: false });
    const list = (data as Marca[]) ?? [];
    setMarcas(list);
    setHoy(list.find((m) => m.fecha === today) ?? null);
  };
  useEffect(() => { load(); return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }; }, [empleado?.id]);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    setCameraOn(true);
  };

  const captureFoto = async (): Promise<Blob | null> => {
    const v = videoRef.current; if (!v) return null;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.7));
  };

  const obtenerGPS = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS no disponible"));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });

  const marcar = async (tipo: "entrada" | "salida") => {
    if (!empleado) return;
    setLoading(true); setSuccess(null);
    try {
      if (!cameraOn) await startCamera();
      await new Promise((r) => setTimeout(r, 600));
      const fotoBlob = await captureFoto();
      const pos = await obtenerGPS();
      const { latitude: lat, longitude: lon } = pos.coords;

      let foto_url: string | null = null;
      if (fotoBlob) {
        const path = `${empleado.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("asistencia-fotos").upload(path, fotoBlob, { contentType: "image/jpeg", upsert: false });
        if (!upErr) {
          foto_url = supabase.storage.from("asistencia-fotos").getPublicUrl(path).data.publicUrl;
        }
      }

      const hora = new Date().toTimeString().slice(0, 8);
      const payload: Record<string, unknown> = {
        empleado_id: empleado.id, fecha: today, latitud: lat, longitud: lon, foto_url, estado: "presente",
      };
      if (tipo === "entrada") payload.entrada = hora; else payload.salida = hora;

      if (hoy) await supabase.from("asistencia").update(payload).eq("id", hoy.id);
      else await supabase.from("asistencia").insert(payload);

      setSuccess(`${tipo === "entrada" ? "Entrada" : "Salida"} registrada a las ${hora.slice(0, 5)}`);
      streamRef.current?.getTracks().forEach((t) => t.stop()); setCameraOn(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al marcar");
    } finally { setLoading(false); }
  };

  const yaEntrada = !!hoy?.entrada;
  const yaSalida = !!hoy?.salida;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="text-xs text-muted-foreground mb-1">Hoy</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground">Entrada</div>
            <div className="text-lg font-semibold">{hoy?.entrada?.slice(0,5) ?? "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Salida</div>
            <div className="text-lg font-semibold">{hoy?.salida?.slice(0,5) ?? "—"}</div>
          </div>
        </div>
      </Card>

      <div className="rounded-xl overflow-hidden bg-muted aspect-video relative flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {!cameraOn && (
          <div className="absolute text-muted-foreground text-xs flex items-center gap-2">
            <Camera className="h-4 w-4" /> Cámara se activará al marcar
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <Button onClick={() => marcar("entrada")} disabled={loading || !empleado || yaEntrada} className="h-16 text-base gap-2">
          <LogIn className="h-5 w-5" /> {yaEntrada ? `Entrada: ${hoy?.entrada?.slice(0,5)}` : "Marcar entrada"}
        </Button>
        <Button onClick={() => marcar("salida")} disabled={loading || !empleado || !yaEntrada || yaSalida} variant="outline" className="h-16 text-base gap-2">
          <LogOut className="h-5 w-5" /> {yaSalida ? `Salida: ${hoy?.salida?.slice(0,5)}` : "Marcar salida"}
        </Button>
      </div>

      {success && (
        <div className="rounded-lg border border-success/40 bg-success/10 text-success p-3 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
        <MapPin className="h-3 w-3" /> Se registra ubicación y foto de validación
      </p>

      <Card className="overflow-hidden">
        <div className="px-4 py-2.5 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mes en curso
        </div>
        <div className="divide-y">
          {marcas.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="font-medium">{new Date(m.fecha).toLocaleDateString("es-CL", { weekday:"short", day:"2-digit", month:"short" })}</div>
              <div className="text-muted-foreground tabular-nums">
                {m.entrada?.slice(0,5) ?? "—"} → {m.salida?.slice(0,5) ?? "—"}
              </div>
            </div>
          ))}
          {marcas.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">Sin marcas este mes.</div>}
        </div>
      </Card>
    </div>
  );
}
