import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Instrument Serif — display font: characterful editorial serif with a beautiful
 * italic. Used for headings, eyebrow titles, and quote-like callouts.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * JetBrains Mono — technical/data font. Used for stats, labels (small caps),
 * coordinates, and code-like surfaces.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
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
        className={`${geistSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
