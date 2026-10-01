"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, BookOpen, Clock3, FileText, Headphones, LibraryBig, LockKeyhole } from "lucide-react";
import { hasEpisodes, money, workLength, type PublicWork } from "@/lib/types";
import { StatusBadge } from "./ui";

export function WorkCard({ work, saved, onSave, onDetail, onOrder }: { work: PublicWork; saved: boolean; onSave: (id: string) => void; onDetail: (work: PublicWork) => void; onOrder: (work: PublicWork, type: "buy" | "hold") => void }) {
  return <article className={`work-card${work.isFree ? " free-work-card" : ""}`}>
    <div className="work-cover">
      <button className="cover-link" onClick={() => onDetail(work)} aria-label={`Lihat sinopsis ${work.title}`}>
        <img src={work.image} alt={`Kulit karya ${work.title}`} loading="lazy" />
        <span className="cover-shade" />
        <span className="cover-format">{work.isFree ? "BACAAN PERCUMA" : hasEpisodes(work.format) ? `${work.episodes} EPISOD` : work.format.toUpperCase()}</span>
        <span className="cover-caption"><span className="cover-small">{work.isFree ? "PERPUSTAKAAN MAYA MYRA" : "KARYA ORIGINAL"}</span><span className="cover-title">{work.title}</span><span className="cover-author">SEBUAH KARYA OLEH {work.author.toUpperCase()}</span></span>
      </button>
      <button className={`save-button${saved ? " is-saved" : ""}`} aria-label={saved ? `Buang ${work.title} daripada simpanan` : `Simpan ${work.title}`} aria-pressed={saved} onClick={() => onSave(work.id)}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button>
    </div>
    <div className="work-body">
      <div className="work-status-row"><StatusBadge status={work.status} isFree={work.isFree} /><span className="work-genre">{work.genre}</span></div>
      <Link className="work-title-button" href={`/karya/${encodeURIComponent(work.id)}`}><h3>{work.title}</h3></Link>
      <p className="work-meta"><FileText size={13} /><span>{work.pages} halaman</span><span className="meta-dot">·</span>{work.section === "ebook" ? <BookOpen size={13} /> : work.format === "Drama Radio" ? <Headphones size={13} /> : work.isFree ? <LibraryBig size={13} /> : <Clock3 size={13} />}<span>{workLength(work)}</span></p>
      <div className="work-footer">{work.isFree ? <div className="work-price"><span>Untuk pembaca</span><strong>PERCUMA</strong></div> : <div className="work-price"><span>{work.progress === "Separuh siap" ? "Harga draf karya" : "Harga eksklusif"}</span><strong>{money(work.price)}</strong></div>}
        {work.isFree ? <a className="button card-read" href={`/api/free/${encodeURIComponent(work.id)}`} target="_blank" rel="noopener noreferrer">Baca Percuma <ArrowUpRight size={14} /></a> : work.status === "available" ? <div className="card-actions"><button className="button card-buy" onClick={() => onOrder(work, "buy")}>BUY NOW <ArrowUpRight size={14} /></button><button className="card-hold" onClick={() => onOrder(work, "hold")}>HOLD</button></div> : <button className={`unavailable-button unavailable-${work.status}`} disabled>{work.status === "hold" ? <Clock3 size={13} /> : <LockKeyhole size={13} />}{work.status === "hold" ? "HOLD" : "SOLD OUT"}</button>}
      </div>
    </div>
  </article>;
}
