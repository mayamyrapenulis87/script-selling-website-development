import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { WorkPage } from "@/components/work-page";
import { getPublicProfile, getWork } from "@/lib/catalog";
import { siteOrigin } from "@/lib/site-url";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const work = await getWork(id);
  if (!work) return { title: "Karya tidak ditemui — mayamyrastories", robots: { index: false, follow: false } };
  const origin = await siteOrigin();
  const url = `${origin}/karya/${encodeURIComponent(work.id)}`;
  const title = `${work.title} — ${work.format} | mayamyrastories`;
  const description = `${work.format} ${work.genre.toLowerCase()} oleh ${work.author}${work.progress === "Separuh siap" ? ", draf separuh siap" : ""}. ${work.synopsis}`.slice(0, 180);
  const image = new URL(work.image.startsWith("/images/") ? work.image : "/images/senja.jpg", origin).toString();
  return { title, description, authors: [{ name: work.author }], alternates: { canonical: url }, openGraph: { title, description, type: "website", locale: "ms_MY", siteName: "mayamyrastories", url, images: [{ url: image, width: 1400, height: 800, alt: `Kulit ${work.title}` }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default async function PublicWorkPage({ params }: Props) {
  const { id } = await params;
  const work = await getWork(id);
  if (!work) notFound();
  const [profile, origin] = await Promise.all([getPublicProfile(), siteOrigin()]);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "CreativeWork", name: work.title, description: work.synopsis,
    author: { "@type": "Person", name: work.author }, inLanguage: "ms", genre: work.genre, creativeWorkStatus: work.progress,
    url: `${origin}/karya/${encodeURIComponent(work.id)}`,
    offers: { "@type": "Offer", price: work.price.toString(), priceCurrency: "MYR", availability: `https://schema.org/${work.status === "available" ? "InStock" : work.status === "sold" ? "SoldOut" : "OutOfStock"}`, url: `${origin}/karya/${encodeURIComponent(work.id)}` },
  };
  return <div className="public-work-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><header className="order-page-header"><div className="container"><Brand /><Link className="studio-back" href="/#karya"><ArrowLeft size={14} />Kembali ke koleksi</Link></div></header><main className="public-work-main"><nav className="work-breadcrumb" aria-label="Jejak halaman"><Link href="/">mayamyrastories</Link><span>/</span><Link href="/#karya">Koleksi karya</Link><span>/</span><span>{work.format}</span></nav><div className="public-work-heading"><p className="eyebrow">{work.format.toUpperCase()} · KARYA PERIBADI</p><h1>{work.title}</h1><p>Sebuah karya oleh {work.author}.</p></div><WorkPage initialWork={work} key={`${work.id}-${work.status}-${work.holdHours}`} />{profile.blogUrl && <div className="public-work-blog"><p>Ingin membaca catatan dan cerita lain daripada penulis?</p><a href={profile.blogUrl} target="_blank" rel="noopener noreferrer" className="section-link">Singgah ke blog saya <ArrowUpRight size={15} /></a></div>}<p className="order-page-footnote">Membaca sinopsis atau menempah karya tidak memindahkan hak cipta.<br />Bayaran dan skop penyerahan perlu dipersetujui secara bertulis dengan penulis.</p></main></div>;
}
