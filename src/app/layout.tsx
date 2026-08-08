import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Zilla_Slab } from "next/font/google";
import "./globals.css";

const zilla = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-zilla",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simmer",
  description: "Samen een weekmenu opstellen, met wat er al in huis is.",
};

export const viewport: Viewport = {
  themeColor: "#F6F5F1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${zilla.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-zand text-inkt">{children}</body>
    </html>
  );
}
