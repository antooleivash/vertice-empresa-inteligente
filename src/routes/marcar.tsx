import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Empleado } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Camera, MapPin, CheckCircle2, AlertTriangle, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/marcar")({ component: MarcarPage });

// Coordenadas configurables (Puerto Montt por defecto)
const EMPRESA_LAT = -41.4689;
const EMPRESA_LON = -72.9411;
const RANGO_METROS = 200;

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function MarcarPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    supabase.from("empleados").select("*").eq("activo", true).order("nombre")
      .then(({ data }) => setEmpleados((data as Empleado[]) ?? []));
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      toast.error("No se pudo acceder a la cámara");
      throw new Error("camera");
    }
  };

  const captureFoto = async (): Promise<Blob | null> => {
    const v = videoRef.current;
    if (!v) return null;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.7));
  };

  const obtenerGPS = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocalización no soportada"));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
      });
    });

  const marcar = async (tipo: "entrada" | "salida") => {
    if (!empleadoId) return toast.error("Selecciona tu nombre");
    setLoading(true); setSuccess(null); setWarning(null);
    try {
      if (!cameraOn) await startCamera();
      // breve espera a que el frame se estabilice
      await new Promise((r) => setTimeout(r, 600));
      const fotoBlob = await captureFoto();
      const pos = await obtenerGPS();
      const { latitude: lat, longitude: lon } = pos.coords;

      const dist = distanciaMetros(lat, lon, EMPRESA_LAT, EMPRESA_LON);
      if (dist > RANGO_METROS) {
        setWarning(`Estás fuera del rango de la empresa (${Math.round(dist)} m). Igual se registró la marca.`);
      }

      let foto_url: string | null = null;
      if (fotoBlob) {
        const path = `${empleadoId}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("asistencia-fotos").upload(path, fotoBlob, { contentType: "image/jpeg", upsert: false });
        if (!upErr) {
          const { data } = supabase.storage.from("asistencia-fotos").getPublicUrl(path);
          foto_url = data.publicUrl;
        }
      }

      const now = new Date();
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8);

      // Buscar marca existente del día
      const { data: existente } = await supabase.from("asistencia")
        .select("*").eq("empleado_id", empleadoId).eq("fecha", fecha).maybeSingle();

      const payload: Record<string, unknown> = {
        empleado_id: empleadoId, fecha,
        latitud: lat, longitud: lon, foto_url,
        estado: "presente",
      };
      if (tipo === "entrada") payload.entrada = hora;
      else payload.salida = hora;

      if (existente) {
        await supabase.from("asistencia").update(payload).eq("id", existente.id);
      } else {
        await supabase.from("asistencia").insert(payload);
      }

      setSuccess(`${tipo === "entrada" ? "Entrada" : "Salida"} registrada a las ${hora.slice(0, 5)}`);
      toast.success("Marca registrada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg !== "camera") toast.error("Error: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-5 py-8">
      <div className="w-full max-w-md">
        <header className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-3">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Vértice</h1>
          <p className="text-sm text-muted-foreground">Marcar asistencia</p>
        </header>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-base">¿Quién eres?</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger className="h-14 text-base"><SelectValue placeholder="Selecciona tu nombre" /></SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id} className="text-base py-3">
                    {e.nombre} <span className="text-muted-foreground">· {e.cargo}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!cameraOn && (
              <div className="absolute text-muted-foreground text-sm flex items-center gap-2">
                <Camera className="h-5 w-5" /> La cámara se activará al marcar
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => marcar("entrada")}
              disabled={loading || !empleadoId}
              className="h-16 text-lg gap-2"
            >
              <LogIn className="h-6 w-6" />
              {loading ? "Registrando…" : "Marcar entrada"}
            </Button>
            <Button
              onClick={() => marcar("salida")}
              disabled={loading || !empleadoId}
              variant="outline"
              className="h-16 text-lg gap-2"
            >
              <LogOut className="h-6 w-6" />
              Marcar salida
            </Button>
          </div>

          {success && (
            <div className="rounded-lg border border-success/40 bg-success/10 text-success p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">¡Listo!</div>
                <div className="text-sm">{success}</div>
              </div>
            </div>
          )}
          {warning && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-warning-foreground" />
              <div className="text-sm">{warning}</div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
            <MapPin className="h-3.5 w-3.5" /> Se registrará tu ubicación y una foto de validación
          </p>
        </div>
      </div>
    </div>
  );
}
