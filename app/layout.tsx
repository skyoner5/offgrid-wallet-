import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OffGrid Wallet",
  description: "Offline crypto transactions via QR, Bluetooth, and SMS. Syncs when signal returns.",
  manifest: "/manifest.json",
  themeColor: "#080c0a",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#080c0a" }}>
        {children}
      </body>
    </html>
  );
}
