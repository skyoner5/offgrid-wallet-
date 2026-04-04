"use client";
import { useEffect, useRef } from "react";

interface Props {
  onScan: (data: string) => void;
  onError?: (err: string) => void;
}

export default function QRScanner({ onScan, onError }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!divRef.current) return;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode("qr-scanner-div");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
          },
          (err) => {
            // scanning frames — ignore routine errors
          }
        )
        .catch((err: any) => {
          onError?.(String(err));
        });
    });

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div
      style={{
        border: "2px solid #00ff6a",
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 0 30px rgba(0,255,106,0.2)",
        width: 260,
        height: 260,
        position: "relative",
      }}
    >
      <div id="qr-scanner-div" ref={divRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
