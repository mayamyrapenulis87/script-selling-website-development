"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, BookOpen, Clock3, FileText, Headphones, LockKeyhole } from "lucide-react";
import { hasEpisodes, money, workLength, type PublicWork } from "@/lib/types";
import { StatusBadge } from "./ui";

export function WorkCard({ work, saved, onSave, onDetail, onOrder }: { work: PublicWork; saved: boolean; onSave: (id: string) => void; onDetail: (work: PublicWork) => void; onOrder: (work: PublicWork, type: "buy" | "hold") => void }) {
  return <article className="work-card">
    <div className="work-cover">
      <button className="cover-link" onClick={() => onDetail(work)} aria-label={`Lihat sinopsis ${work.title}`}>
        <img src={work.image} alt={`Kulit karya ${work.title}`} loading="lazy" />
        <span className="cover-shade" />
        <span className="cover-format">{hasEpisodes(work.format) ? `${work.format === "Drama radio" ? "RADIO · " : ""}${work.episodes} EPISOD` : work.format.toUpperCase()}</span>
        <span className="cover-caption"><span className="cover-small">NASKAH ORIGINAL</span><span className="cover-title">{work.title}</span><span className="cover-author">SEBUAH KARYA OLEH {work.author.toUpperCase()}</span></span>
      </button>
      <button className={`save-button${saved ? " is-saved" : ""}`} aria-label={saved ? `Buang ${work.title} daripada simpanan` : `Simpan ${work.title}`} aria-pressed={saved} onClick={() => onSave(work.id)}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button>
    </div>
    <div className="work-body">
      <div className="work-status-row"><StatusBadge status={work.status} /><span className="work-genre">{work.genre}{work.isDemo && <span className="demo-label">Contoh</span>}</span></div>
      <Link className="work-title-button" href={`/karya/${encodeURIComponent(work.id)}`}><h3>{work.title}</h3></Link>
      <p className="work-meta"><FileText size={13} /><span>{work.pages} halaman</span><span className="meta-dot">·</span>{work.format === "Manuskrip novel" ? <BookOpen size={13} /> : work.format === "Drama radio" ? <Headphones size={13} /> : <Clock3 size={13} />}<span>{workLength(work)}</span></p>
      <div className="work-footer"><div className="work-price"><span>{work.progress === "Separuh siap" ? "Harga draf karya" : "Harga eksklusif"}</span><strong>{money(work.price)}</strong></div>
        {work.status === "available" ? <div className="card-actions"><button className="button card-buy" onClick={() => onOrder(work, "buy")}>Buy <ArrowUpRight size={14} /></button><button className="card-hold" onClick={() => onOrder(work, "hold")}>Hold</button></div> : <button className={`unavailable-button unavailable-${work.status}`} disabled>{work.status === "hold" ? <Clock3 size={13} /> : <LockKeyhole size={13} />}{work.status === "hold" ? "On Hold" : "Sold Out"}</button>}
      </div>
    </div>
  </article>;
}
