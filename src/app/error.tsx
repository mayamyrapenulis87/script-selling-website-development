"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="not-found"><Brand /><p className="eyebrow">SEBENTAR, KITA SAMBUNG CERITA</p><h1>Halaman belum dapat dibuka.</h1><p>Sambungan mungkin terganggu seketika. Sila cuba semula — karya dan pesanan anda masih disimpan.</p><button className="button" onClick={reset}><RefreshCw size={16} />Cuba semula</button><Link className="text-button" href="/"><ArrowLeft size={14} style={{ display: "inline", marginRight: 6 }} />Kembali ke katalog</Link></main>;
}
