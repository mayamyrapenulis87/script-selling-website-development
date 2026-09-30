"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, FileText, Film, Headphones, Info, Loader2, ShieldCheck } from "lucide-react";
import { hasEpisodes, holdLabel, money, workLength, type PublicWork } from "@/lib/types";
import { errorMessage, requestJSON } from "@/lib/client";
import { Modal, StatusBadge } from "./ui";

export function WorkContent({ work, onOrder, pageLink = false }: { work: PublicWork; onOrder: (work: PublicWork, type: "buy" | "hold") => void; pageLink?: boolean }) {
  const [tab, setTab] = useState<"synopsis" | "excerpt">("synopsis");
  const novel = work.format === "Manuskrip novel";
  return <div className="detail-layout">
    <div className="detail-poster"><img src={work.image} alt={`Kulit ${work.title}`} /><div className="detail-poster-shade" /><span className="detail-poster-format">{work.format.toUpperCase()}</span><div className="detail-poster-title">{work.title}<span>SEBUAH KARYA OLEH<br />{work.author.toUpperCase()}</span></div></div>
    <div className="detail-content"><div className="detail-topline"><StatusBadge status={work.status} /><span>{work.genre}{work.progress === "Separuh siap" ? " · Separuh siap" : ""}</span></div><h3>{work.title}</h3><p className="detail-author">Ditulis oleh {work.author}</p>
      <div className="detail-facts"><div><FileText size={17} /><strong>{work.pages}</strong><span>halaman</span></div><div>{novel ? <BookOpen size={17} /> : work.format === "Drama radio" ? <Headphones size={17} /> : <Film size={17} />}<strong>{hasEpisodes(work.format) ? work.episodes : 1}</strong><span>{hasEpisodes(work.format) ? "episod" : "naskah"}</span></div><div>{novel ? <BookOpen size={17} /> : <Clock3 size={17} />}<strong>{novel ? work.progress : `${work.duration} min`}</strong><span>{novel ? "tahap siap" : `durasi${work.episodes > 1 ? " / episod" : ""}`}</span></div></div>
      <div className="detail-tabs" role="tablist" aria-label="Maklumat karya"><button role="tab" aria-selected={tab === "synopsis"} onClick={() => setTab("synopsis")} className={tab === "synopsis" ? "active" : ""}>Sinopsis</button><button role="tab" aria-selected={tab === "excerpt"} onClick={() => setTab("excerpt")} className={tab === "excerpt" ? "active" : ""}>Pratonton {novel ? "manuskrip" : "skrip"} <FileText size={13} /></button></div>
      <div className="detail-tab-content" role="tabpanel">{tab === "synopsis" ? <p>{work.synopsis}</p> : <pre className="script-excerpt">{work.excerpt || "Pratonton belum ditambah. Hubungi penulis melalui permintaan tempahan untuk maklumat lanjut."}</pre>}</div>
      {work.isDemo && <div className="info-note demo-work-note"><Info size={17} /><p><strong>Karya contoh untuk demonstrasi.</strong> Buy dan Hold boleh dicuba, tetapi ini bukan skrip sebenar milik penulis. Penulis boleh menggantikannya dengan fail karya sendiri.</p></div>}
      {work.progress === "Separuh siap" && <div className="info-note draft-note"><Info size={17} /><p><strong>Karya ini belum lengkap.</strong> Harga merujuk kepada draf yang tersedia. Bab atau bahagian yang akan disambung, tarikh siap dan skop hak perlu dipersetujui dengan penulis sebelum membeli.</p></div>}
      <div className="rights-note"><ShieldCheck size={18} /><p><strong>Satu naskah. Satu pemilik.</strong><span>Pemindahan hak eksklusif tertakluk kepada persetujuan bertulis dengan penulis.</span><span>Hold memberi masa {holdLabel(work.holdHours)} untuk membuat keputusan. Tiada caj automatik.</span></p></div>
      <div className="detail-purchase"><div><span>{work.progress === "Separuh siap" ? "Harga draf karya" : "Harga naskah"}</span><strong>{money(work.price)}</strong></div>{work.status === "available" ? <div><button className="button" onClick={() => onOrder(work, "buy")}>Buy <ArrowUpRight size={17} /></button><button className="button button-outline" onClick={() => onOrder(work, "hold")}>Hold <Clock3 size={16} /></button></div> : <button className="button button-muted" disabled>{work.status === "hold" ? "Sedang ditempah" : "Sold Out"}</button>}</div>
      {pageLink && <Link className="detail-page-link" href={`/karya/${encodeURIComponent(work.id)}`}>Buka halaman karya untuk dikongsi <ArrowUpRight size={13} /></Link>}
    </div>
  </div>;
}

export function WorkDetail({ work, onClose, onOrder }: { work: PublicWork; onClose: () => void; onOrder: (work: PublicWork, type: "buy" | "hold") => void }) {
  return <Modal title="Di sebalik cerita." eyebrow="KENALI NASKAH INI" onClose={onClose} wide><WorkContent work={work} onOrder={onOrder} pageLink /></Modal>;
}

type OrderResult = { reference: string; accessToken: string; expiresAt: string; holdHours: number };
export function OrderDialog({ work, type, onClose, onOrdered }: { work: PublicWork; type: "buy" | "hold"; onClose: () => void; onOrdered: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await requestJSON<OrderResult>("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manuscriptId: work.id, type, name: data.get("name"), email: data.get("email"), phone: data.get("phone"), notes: data.get("notes") }) });
      setResult(response); onOrdered(work.id);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }
  return <Modal title={result ? "Cerita ini selangkah lebih dekat." : type === "buy" ? "Jadikan cerita ini milik anda." : "Simpan tempat untuk cerita ini."} eyebrow={result ? "PERMINTAAN DITERIMA" : type === "buy" ? "PERMINTAAN PEMBELIAN" : `TEMPAHAN ${holdLabel(work.holdHours).toUpperCase()}`} onClose={onClose}>
    {result ? <div className="order-success"><div className="success-icon"><CheckCircle2 size={38} strokeWidth={1.5} /></div><h3>Terima kasih atas minat anda.</h3><p><strong>{work.title}</strong> ditempah untuk anda selama {holdLabel(result.holdHours)}. Penulis akan menyemak permintaan anda di ruang pengurusan.</p><div className="order-reference"><span>Nombor rujukan</span><strong>{result.reference}</strong></div><div className="info-note"><Info size={17} /><p>Tiada bayaran dikenakan melalui laman ini. Sila selaraskan bayaran dan perjanjian hak dengan penulis sebelum jualan disahkan.</p></div><Link className="button full-width" href={`/pesanan/${result.accessToken}`}>Lihat status pesanan <ArrowRight size={17} /></Link><button className="text-button" onClick={onClose}>Kembali ke katalog</button></div> : <form onSubmit={submit} className="order-form">
      <div className="order-summary"><img src={work.image} alt="" /><div><span>{work.format} · {work.genre}</span><h3>{work.title}</h3><p>{workLength(work)} · {work.pages} halaman</p></div><strong>{money(work.price)}</strong></div>
      <div className="info-note"><Clock3 size={18} /><p>{type === "hold" ? `Karya ditahan selama ${holdLabel(work.holdHours)} tanpa caj untuk anda berfikir atau berbincang dengan penulis. Selepas tamat, karya tersedia semula jika jualan belum disahkan.` : `Hantar permintaan pembelian kepada penulis. Karya ditahan selama ${holdLabel(work.holdHours)} sementara bayaran dan hak penggunaan diselaraskan.`}</p></div>
      {work.progress === "Separuh siap" && <div className="info-note draft-note"><Info size={17} /><p>Anda sedang menempah <strong>karya separuh siap</strong>, bukan naskah lengkap. Bincangkan skop penyerahan dan penyempurnaan sebelum membayar.</p></div>}
      <div className="form-grid"><label className="field">Nama penuh <span>*</span><input name="name" autoComplete="name" placeholder="Nama anda atau syarikat" minLength={2} maxLength={80} required /></label><label className="field">Alamat e-mel <span>*</span><input name="email" type="email" autoComplete="email" placeholder="anda@contoh.com" maxLength={254} required /></label></div>
      <label className="field">Nombor telefon <small>(pilihan)</small><input name="phone" type="tel" autoComplete="tel" placeholder="Contoh: 012-345 6789" maxLength={40} /></label>
      <label className="field">Nota kepada penulis <small>(pilihan)</small><textarea name="notes" placeholder="Kongsikan sedikit tentang projek atau pertanyaan anda…" rows={3} maxLength={1500} /></label>
      <label className="checkbox-field"><input type="checkbox" required /><span>Saya faham bahawa ini ialah permintaan {type === "hold" ? "tempahan" : "pembelian"}, bukan bayaran automatik. Hak karya belum dipindahkan.{work.progress === "Separuh siap" ? " Saya juga maklum bahawa karya ini belum lengkap." : ""}</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button full-width" disabled={loading}>{loading ? <><Loader2 className="spin" size={17} /> Menghantar…</> : <>Hantar permintaan {type === "hold" ? "Hold" : "Buy"} <ArrowUpRight size={17} /></>}</button>
      <p className="form-security"><ShieldCheck size={13} /> Maklumat anda hanya boleh dilihat oleh penulis.</p>
    </form>}
  </Modal>;
}
