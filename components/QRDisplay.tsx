"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface Props {
  data: string;
  size?: number;
}

export default function QRDisplay({ data, size = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 1,
      color: {
        dark: "#00ff6a",
        light: "#080c0a",
      },
    });
  }, [data, size]);

  return (
    <div
      style={{
        border: "2px solid #00ff6a",
        borderRadius: 4,
        padding: 8,
        boxShadow: "0 0 30px rgba(0,255,106,0.2), inset 0 0 20px rgba(0,255,106,0.05)",
        display: "inline-flex",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
