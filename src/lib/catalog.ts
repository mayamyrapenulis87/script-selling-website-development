import { cache } from "react";
import { db } from "@/db";
import { manuscripts, orders, siteState, writerSettings } from "@/db/schema";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { writerDefaults } from "./writer-defaults";
import type { PublicProfile, PublicWork, WorkFormat, WorkProgress, WorkStatus } from "./types";

type Example = { id: string; title: string; format: string; genre: string; price: number; pages: number; episodes: number; duration: number; status: string; image: string; featured: boolean; synopsis: string; excerpt: string; progress?: WorkProgress };
const examples: Example[] = [
  { id: "antara-dua-senja", title: "Antara Dua Senja", format: "Telemovie", genre: "Drama", price: 2800, pages: 86, episodes: 1, duration: 90, status: "available", image: "/images/senja.jpg", featured: true, synopsis: "Selepas dua puluh tahun meninggalkan kampung, seorang anak pulang untuk menjual rumah pusaka. Namun, sepucuk surat yang tidak pernah dihantar membawanya kembali kepada kisah cinta dan pengorbanan ibunya.", excerpt: "FADE IN:\n\nEXT. PANTAI — SENJA\n\nBunyi ombak memecah kesunyian. HANA, 32, berdiri dengan sebuah beg lusuh. Di tangannya, sepucuk surat yang belum dibuka.\n\nHANA (V.O.)\nAda tempat yang kita tinggalkan. Ada tempat yang tak pernah meninggalkan kita." },
  { id: "rumah-yang-menunggu", title: "Rumah yang Menunggu", format: "Drama bersiri", genre: "Keluarga", price: 18000, pages: 960, episodes: 30, duration: 45, status: "available", image: "/images/rumah.jpg", featured: true, synopsis: "Tiga beradik yang sudah lama terpisah terpaksa tinggal sebumbung demi memenuhi wasiat arwah ayah. Dalam rumah yang penuh kenangan, rahsia lama dan harapan baharu perlahan-lahan menemukan jalan pulang.", excerpt: "EPISOD 1 — PINTU YANG TERBUKA\n\nINT. RUMAH PUSAKA — MALAM\n\nLampu ruang tamu menyala buat pertama kalinya dalam lima tahun. AINA meletakkan tiga cawan di meja. Satu kerusi masih kosong.\n\nAINA\nDia akan datang. Kali ini, aku tahu dia akan datang." },
  { id: "sebelum-hujan", title: "Sebelum Hujan", format: "Telemovie", genre: "Romantik", price: 3200, pages: 92, episodes: 1, duration: 90, status: "hold", image: "/images/hujan.jpg", featured: false, synopsis: "Seorang jurugambar dan penjaga hutan bertemu di sebuah desa yang bakal ditenggelami pembangunan. Antara kenangan dan perubahan, mereka belajar bahawa cinta kadangkala bermaksud melepaskan.", excerpt: "EXT. HUTAN — PAGI\n\nKabus menyelubungi kanopi. LISA mengangkat kameranya. Di hujung laluan, seorang lelaki menunggu hujan yang belum turun.\n\nLISA\nAwak selalu datang ke sini?\n\nIMAN\nSaya tak pernah betul-betul pergi." },
  { id: "kota-tanpa-nama", title: "Kota Tanpa Nama", format: "Filem pendek", genre: "Thriller", price: 1800, pages: 28, episodes: 1, duration: 25, status: "sold", image: "/images/kota.jpg", featured: false, synopsis: "Seorang pemandu e-hailing menerima penumpang terakhir pada tengah malam. Destinasi yang diminta tidak wujud di peta, tetapi setiap simpang membawa mereka lebih dekat kepada kebenaran yang menakutkan.", excerpt: "INT. KERETA — MALAM\n\nTelefon bergetar. SATU TEMPAHAN BAHARU. FARIS melihat cermin belakang. Seorang penumpang sudah duduk di situ.\n\nFARIS\nKe mana, encik?\n\nPENUMPANG\nPulang. Awak tahu jalannya." },
  { id: "pulang-ke-akar", title: "Pulang ke Akar", format: "Telemovie", genre: "Drama", price: 4500, pages: 110, episodes: 1, duration: 100, status: "available", image: "/images/hujan.jpg", featured: false, synopsis: "Seorang chef ternama kembali ke ladang keluarga selepas kehilangan deria rasa. Bersama neneknya, dia menemui semula resipi yang menghubungkan makanan, ingatan dan makna sebuah keluarga.", excerpt: "INT. DAPUR NENEK — SUBUH\n\nWap naik dari periuk lama. NENEK menghulurkan sesudu kuah kepada DANIAL.\n\nNENEK\nJangan rasa dengan lidah saja. Cuba ingat." },
  { id: "kopi-kamu-dan-aku", title: "Kopi, Kamu & Aku", format: "Telemovie", genre: "Komedi", price: 2500, pages: 80, episodes: 1, duration: 90, status: "available", image: "/images/rumah.jpg", featured: false, synopsis: "Dua pemilik kafe yang bersaing terpaksa berkongsi satu ruang selepas banjir. Apa yang bermula dengan perang resipi menjadi persahabatan yang tidak pernah mereka rancangkan.", excerpt: "INT. KAFE — PAGI\n\nDua mesin kopi berbunyi serentak. MIRA dan ADAM saling berpandangan.\n\nMIRA\nPelanggan awak dah tersalah barisan.\n\nADAM\nAtau mungkin dia ada selera yang bagus." },
  { id: "jejak-di-hujung-jalan", title: "Jejak di Hujung Jalan", format: "Drama bersiri", genre: "Misteri", price: 12500, pages: 540, episodes: 16, duration: 45, status: "available", image: "/images/kota.jpg", featured: false, synopsis: "Seorang wartawan menyiasat kehilangan adiknya, hanya untuk menemukan rangkaian kisah yang menghubungkan enam keluarga di sebuah bandar kecil. Setiap episod membuka satu rahsia dan satu persoalan baharu.", excerpt: "INT. BILIK BERITA — MALAM\n\nNADIA menyusun enam gambar di dinding. Telefon berbunyi tanpa nombor pemanggil.\n\nSUARA (O.S.)\nJangan cari dia. Cari apa yang dia tinggalkan." },
  { id: "surat-untuk-esok", title: "Surat untuk Esok", format: "Filem pendek", genre: "Drama", price: 1500, pages: 22, episodes: 1, duration: 20, status: "available", image: "/images/senja.jpg", featured: false, synopsis: "Seorang posmen bersara menemui satu surat yang tidak pernah sampai kepada penerimanya. Perjalanan terakhirnya mengubah kehidupan dua orang asing dan dirinya sendiri.", excerpt: "EXT. PEJABAT POS — PETANG\n\nRAHIM mengunci pintu buat kali terakhir. Sekeping sampul jatuh dari celah begnya. Tarikh pada setem: dua puluh tahun yang lalu.\n\nRAHIM\nMasih belum terlambat." },
  { id: "langit-yang-belum-selesai", title: "Langit yang Belum Selesai", format: "Manuskrip novel", genre: "Romantik", price: 2400, pages: 140, episodes: 1, duration: 0, progress: "Separuh siap", status: "available", image: "/images/senja.jpg", featured: false, synopsis: "Selepas kehilangan ibunya, seorang pelukis menemukan diari yang mengubah cara dia melihat keluarga dan cinta. Draf novel ini mengandungi bahagian pertama cerita. Penyempurnaan bab seterusnya dan skop hak perlu dipersetujui dengan penulis sebelum pembelian.", excerpt: "BAB 1 — LANGIT DI DALAM BINGKAI\n\nLangit petang itu kelihatan seperti lukisan yang belum selesai. Mira membiarkan tingkap terbuka. Di atas meja, diari ibunya menunggu dengan satu halaman yang dilipat.\n\nDia tidak tahu bahawa sebuah nama boleh mengubah seluruh kenangan." },
  { id: "suara-di-hujung-talian", title: "Suara di Hujung Talian", format: "Drama radio", genre: "Misteri", price: 1200, pages: 24, episodes: 1, duration: 30, status: "available", image: "/images/rumah.jpg", featured: false, synopsis: "Seorang penyampai radio menerima panggilan daripada pendengar yang mendakwa berada pada malam yang sama, tiga puluh tahun dahulu. Kisah misteri yang dibina melalui dialog, muzik dan reka bentuk bunyi.", excerpt: "DRAMA RADIO — EPISOD TUNGGAL\n\nSFX: HUJAN RENYAI. DENGUNG RADIO PERLAHAN.\nMUZIK: TEMA PEMBUKA, FADE UNDER.\n\nNADIA: Selamat malam. Siapa bersama kami?\nPEMANGGIL: Saya cuma ingin tahu… adakah hujan itu sudah berhenti?\n\nSFX: BUNYI TALIAN BERDERAK." },
  { id: "sebuah-kota-dan-rahsia", title: "Sebuah Kota & Rahsia", format: "Skrip layar", genre: "Thriller", price: 7500, pages: 106, episodes: 1, duration: 110, status: "available", image: "/images/kota.jpg", featured: false, synopsis: "Seorang arkitek menemui ruang tersembunyi dalam pelan bangunan lama. Apabila rahsia itu mengancam keluarganya, dia terpaksa memilih antara keselamatan dan kebenaran. Skrip filem panjang untuk layar pawagam.", excerpt: "FADE IN:\n\nEXT. BANDAR — MALAM\n\nLampu bangunan memantul pada jalan yang basah. ARIF membuka gulungan pelan lama. Ada satu bilik yang tidak sepatutnya wujud.\n\nARIF\nKalau dinding ini boleh bercakap…" },
];

export const demoIds = examples.map((work) => work.id);
export const demoWorkFlag = sql<boolean>`coalesce((${inArray(manuscripts.id, demoIds)} and ${manuscripts.fileName} = ${manuscripts.id} || '-contoh.txt'), false)`;

export async function ensureCatalog() {
  const marker = await db.select().from(siteState).where(eq(siteState.id, "catalog_formats_v2")).limit(1);
  if (marker.length) return;
  const [writer] = await db.select({ name: writerSettings.displayName }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  await db.transaction(async (tx) => {
    await tx.insert(manuscripts).values(examples.map((work, index) => ({
      ...work, author: writer?.name || "Alya Rahman", createdAt: new Date(Date.now() - index * 86400000),
      fileName: `${work.id}-contoh.txt`, fileMime: "text/plain; charset=utf-8",
      fileData: Buffer.from(`NASKAH CONTOH KATALOG\n${work.title.toUpperCase()}\n\n${work.synopsis}\n\n${work.excerpt}\n\nIni ialah fail demonstrasi, bukan karya penuh untuk jualan sebenar.`).toString("base64"),
    }))).onConflictDoNothing();
    await tx.insert(siteState).values({ id: "catalog_formats_v2", value: "1" }).onConflictDoNothing();
  });
}

export async function expireReservations() {
  await db.transaction(async (tx) => {
    const expired = await tx.update(manuscripts).set({ status: "available", reservedUntil: null }).where(and(eq(manuscripts.status, "hold"), lte(manuscripts.reservedUntil, new Date()))).returning({ id: manuscripts.id });
    if (expired.length) await tx.update(orders).set({ status: "expired" }).where(and(inArray(orders.manuscriptId, expired.map((work) => work.id)), eq(orders.status, "pending"), lte(orders.expiresAt, new Date())));
  });
}

const publicFields = { id: manuscripts.id, title: manuscripts.title, format: manuscripts.format, genre: manuscripts.genre, synopsis: manuscripts.synopsis, excerpt: manuscripts.excerpt, author: manuscripts.author, price: manuscripts.price, pages: manuscripts.pages, episodes: manuscripts.episodes, duration: manuscripts.duration, progress: manuscripts.progress, holdHours: manuscripts.holdHours, status: manuscripts.status, image: manuscripts.image, featured: manuscripts.featured, createdAt: manuscripts.createdAt, hasFile: sql<boolean>`${manuscripts.fileData} is not null`, isDemo: demoWorkFlag };

export function publicWork(work: typeof manuscripts.$inferSelect): PublicWork {
  return { id: work.id, title: work.title, format: work.format as WorkFormat, genre: work.genre, synopsis: work.synopsis, excerpt: work.excerpt, author: work.author, price: work.price, pages: work.pages, episodes: work.episodes, duration: work.duration, progress: work.progress as WorkProgress, holdHours: work.holdHours, status: work.status as WorkStatus, image: work.image, featured: work.featured, createdAt: work.createdAt.toISOString(), hasFile: Boolean(work.fileData), isDemo: demoIds.includes(work.id) && work.fileName === `${work.id}-contoh.txt` };
}

export async function getWorks(): Promise<PublicWork[]> {
  await ensureCatalog();
  await expireReservations();
  const rows = await db.select(publicFields).from(manuscripts).where(eq(manuscripts.active, true)).orderBy(asc(demoWorkFlag), desc(manuscripts.featured), desc(manuscripts.createdAt));
  return rows.map((work) => ({ ...work, format: work.format as WorkFormat, progress: work.progress as WorkProgress, status: work.status as WorkStatus, createdAt: work.createdAt.toISOString() }));
}

export const getWork = cache(async (id: string): Promise<PublicWork | null> => {
  if (id.length > 160) return null;
  await ensureCatalog();
  await expireReservations();
  const [work] = await db.select(publicFields).from(manuscripts).where(and(eq(manuscripts.id, id), eq(manuscripts.active, true))).limit(1);
  return work ? { ...work, format: work.format as WorkFormat, progress: work.progress as WorkProgress, status: work.status as WorkStatus, createdAt: work.createdAt.toISOString() } : null;
});

export async function getPublicProfile(): Promise<PublicProfile> {
  const [profile] = await db.select({ displayName: writerSettings.displayName, bio: writerSettings.bio, blogUrl: writerSettings.blogUrl }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  return profile ?? { ...writerDefaults };
}
