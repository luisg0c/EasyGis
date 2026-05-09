import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ICEV Remote Sensing Software",
    template: "%s · ICEV Remote Sensing",
  },
  description:
    "Plataforma web de sensoriamento remoto para agricultura de precisão. Processa imagens Sentinel-2 sobre talhões agrícolas e calcula índices de vegetação (NDVI, EVI, SAVI, NDWI, NDBI).",
  applicationName: "ICEV Remote Sensing Software",
  keywords: [
    "sensoriamento remoto",
    "Sentinel-2",
    "NDVI",
    "agricultura de precisão",
    "ICEV",
  ],
  authors: [{ name: "Equipe ICEV Remote Sensing" }],
  openGraph: {
    title: "ICEV Remote Sensing Software",
    description:
      "Plataforma de análise de imagens Sentinel-2 para agricultura de precisão.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2C7A4B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
