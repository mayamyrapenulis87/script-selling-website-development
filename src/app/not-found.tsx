import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="not-found"><Brand /><p className="eyebrow">HALAMAN BELUM DITULIS</p><h1>Cerita ini tiada di sini.</h1><p>Halaman atau pautan pesanan tidak ditemui. Semak semula pautan anda, atau temui cerita lain dalam katalog.</p><Link className="button" href="/"><ArrowLeft size={16} />Kembali ke Naskah</Link></main>;
}
