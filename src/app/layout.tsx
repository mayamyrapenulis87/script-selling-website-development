import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "mayamyrastories — Karya peribadi, cerita untuk ditemukan",
  description: "Koleksi karya peribadi penulis: manuskrip novel lengkap atau separuh siap, skrip drama TV, telemovie, skrip layar, filem pendek dan drama radio. Baca sinopsis, pilih Buy atau tempah dengan Hold.",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#234c3b" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ms"><body className="antialiased">{children}</body></html>;
}
