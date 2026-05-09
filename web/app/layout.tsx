import type { Metadata, Viewport } from "next";
import { Geist, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Geist Sans — body / UI. Clean, geometric humanist sans.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Manrope — display font. Modern, technical, geometric sans with a slight
 * humanist edge. Heavier weights work as confident agritech display.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * JetBrains Mono — technical/data font. Used for stats, coordinates, and
 * numeric metadata.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EasyGis — Remote Sensing for Precision Agriculture",
    template: "%s · EasyGis",
  },
  description:
    "Plataforma web de sensoriamento remoto para agricultura de precisão. Processa imagens Sentinel-2 sobre talhões agrícolas e calcula índices de vegetação (NDVI, EVI, SAVI, NDWI, NDBI).",
  applicationName: "EasyGis",
  keywords: [
    "sensoriamento remoto",
    "Sentinel-2",
    "NDVI",
    "agricultura de precisão",
    "EasyGis",
  ],
  authors: [{ name: "EasyGis" }],
  openGraph: {
    title: "EasyGis — Remote Sensing",
    description:
      "Plataforma de análise de imagens Sentinel-2 para agricultura de precisão.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B3A2F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
