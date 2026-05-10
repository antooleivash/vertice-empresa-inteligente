import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Printer } from "lucide-react";

export function QRMarcar() {
  const [dataUrl, setDataUrl] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = `${window.location.origin}/marcar`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 256, margin: 1 }).then(setDataUrl);
  }, []);

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>QR Marcar Asistencia · Vértice</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:48px;">
      <h1>Vértice — Marcar asistencia</h1>
      <p>Escanea con tu celular para marcar entrada o salida</p>
      <img src="${dataUrl}" style="width:320px;height:320px;" />
      <p style="font-family:monospace;font-size:14px;">${url}</p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Card className="p-5 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 self-start mb-3">
        <QrCode className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Marca de asistencia móvil</h3>
      </div>
      {dataUrl && <img src={dataUrl} alt="QR Marcar" className="w-40 h-40 rounded-md border" />}
      <p className="text-xs text-muted-foreground mt-3">Los trabajadores escanean este QR para marcar desde su celular.</p>
      <a href={url} className="text-xs text-primary mt-1 break-all">{url}</a>
      <Button size="sm" variant="outline" onClick={print} className="mt-3 gap-1.5">
        <Printer className="h-3.5 w-3.5" /> Imprimir QR
      </Button>
    </Card>
  );
}
