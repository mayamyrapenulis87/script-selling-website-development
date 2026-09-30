import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, Download, Info, Mail, ShieldCheck, XCircle } from "lucide-react";
import { db } from "@/db";
import { manuscripts, orders, writerSettings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { expireReservations } from "@/lib/catalog";
import { holdLabel, money } from "@/lib/types";
import { Brand } from "@/components/brand";
import { RefreshOrder } from "@/components/refresh-order";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Status Pesanan — Naskah", robots: { index: false, follow: false } };
const date = (value: Date) => new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(value);
export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(token)) notFound();
  await expireReservations();
  const [order] = await db.select({ reference: orders.reference, customerName: orders.customerName, type: orders.type, status: orders.status, amount: orders.amount, expiresAt: orders.expiresAt, createdAt: orders.createdAt, title: manuscripts.title, format: manuscripts.format, genre: manuscripts.genre, image: manuscripts.image, pages: manuscripts.pages, episodes: manuscripts.episodes, progress: manuscripts.progress, fileName: manuscripts.fileName, hasFile: sql<boolean>`${manuscripts.fileData} is not null` }).from(orders).innerJoin(manuscripts, eq(orders.manuscriptId, manuscripts.id)).where(eq(orders.accessToken, token)).limit(1);
  if (!order) notFound();
  const [writer] = await db.select({ name: writerSettings.displayName, email: writerSettings.email }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  const completed = order.status === "completed", pending = order.status === "pending";
  const duration = holdLabel(Math.max(1, Math.round((order.expiresAt.getTime() - order.createdAt.getTime()) / 3600000)));
  const titles: Record<string, string> = { pending: "Cerita anda sedang ditempah.", completed: "Naskah anda sedia dimuat turun.", cancelled: "Tempahan ini telah dibatalkan.", expired: "Tempoh tempahan telah berakhir." };
  const statusLabels: Record<string, string> = { pending: "Menunggu pengesahan penulis", completed: "Jualan disahkan", cancelled: "Dibatalkan", expired: "Tamat tempoh" };
  return <div className="order-page">
    <header className="order-page-header"><div className="container"><Brand /><Link className="studio-back" href="/"><ArrowLeft size={14} />Kembali ke katalog</Link></div></header>
    <main className="order-page-main"><div className="order-page-intro"><div className="order-page-icon">{completed ? <CheckCircle2 size={27} /> : pending ? <Clock3 size={27} /> : <XCircle size={27} />}</div><p className="eyebrow">PERJALANAN NASKAH ANDA</p><h1>{titles[order.status] || "Status permintaan anda."}</h1><p>{completed ? `Terima kasih, ${order.customerName}. Penulis telah mengesahkan jualan. Anda kini boleh memuat turun fail karya di bawah.` : pending ? `Terima kasih, ${order.customerName}. Naskah ini ditahan selama ${duration} sementara penulis menyemak permintaan, bayaran dan persetujuan hak anda.` : "Naskah mungkin telah dibuka semula untuk pembeli lain. Semak katalog atau hubungi penulis jika anda masih berminat."}</p></div>
      <section className="order-page-card"><div className="order-summary"><img src={order.image} alt={`Kulit ${order.title}`} /><div><span>{order.format} · {order.genre}</span><h3>{order.title}</h3><p>{order.pages} halaman{order.episodes > 1 ? ` · ${order.episodes} episod` : ""}{order.progress === "Separuh siap" ? " · Separuh siap" : ""}</p></div><strong>{money(order.amount)}</strong></div>
        <div className="order-info-grid"><div><span>Nombor rujukan</span><strong>{order.reference}</strong></div><div><span>Status</span><strong>{statusLabels[order.status]}</strong></div><div><span>Nama pemohon</span><strong>{order.customerName}</strong></div><div><span>Jenis permintaan</span><strong>{order.type === "buy" ? "Buy — pembelian" : `Hold — tempahan ${duration}`}</strong></div><div><span>Permintaan diterima</span><strong>{date(order.createdAt)} MYT</strong></div><div><span>{completed ? "Pengesahan" : "Tempahan tamat"}</span><strong>{completed ? "Disahkan oleh penulis" : `${date(order.expiresAt)} MYT`}</strong></div></div>
        <div className="info-note">{completed ? <ShieldCheck size={18} /> : <Info size={18} />}<p>{completed ? "Simpan fail dan persetujuan hak anda. Skop adaptasi, kredit penulis dan pemindahan hak adalah mengikut perjanjian bertulis anda dengan penulis." : "Tiada bayaran diproses melalui laman ini. Sila selaraskan bayaran secara terus dengan penulis. Muat turun hanya diaktifkan selepas penulis mengesahkan jualan."}{order.progress === "Separuh siap" && " Karya ini ditandakan separuh siap. Penyempurnaan tidak termasuk secara automatik; rujuk persetujuan anda dengan penulis."}{order.fileName?.endsWith("-contoh.txt") && " Karya ini ialah bahan demonstrasi katalog, bukan karya penuh untuk jualan sebenar."}</p></div>
        <div className="order-page-actions">{completed && order.hasFile ? <a className="button" href={`/api/download/${token}`}><Download size={15} />Muat turun karya</a> : pending ? <button className="button button-muted" disabled><Download size={15} />Menunggu pengesahan</button> : <Link className="button" href="/">Terokai cerita lain <ArrowUpRight size={16} /></Link>}<RefreshOrder pending={pending} />{writer?.email && <a className="button button-outline" href={`mailto:${writer.email}?subject=${encodeURIComponent(`Permintaan ${order.reference} — ${order.title}`)}`}><Mail size={14} />Hubungi penulis</a>}</div>
      </section><p className="order-page-footnote">Simpan pautan peribadi ini untuk menyemak pesanan anda. Jangan kongsikan kepada umum.<br />{pending ? "Status disemak secara automatik setiap 20 saat. " : ""}<Link href="/#soalan">Ada pertanyaan? Baca soalan lazim.</Link></p>
    </main>
  </div>;
}
