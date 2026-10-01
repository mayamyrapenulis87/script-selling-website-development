import { cache } from "react";
import { db } from "@/db";
import { manuscripts, orders, siteState, writerSettings } from "@/db/schema";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { writerDefaults } from "./writer-defaults";
import { displayFormat, displayGenre, isFreeFormat, sectionForFormat, type PublicProfile, type PublicWork, type WorkFormat, type WorkProgress, type WorkStatus } from "./types";

type Example = { id: string; title: string; format: WorkFormat; genre: string; price: number; pages: number; episodes: number; duration: number; status: WorkStatus; image: string; featured: boolean; synopsis: string; excerpt: string; progress?: WorkProgress; holdHours?: number };

const examples: Example[] = [
  { id: "teater-tun-teja", title: "Teater Tun Teja", format: "Skrip Teater", genre: "Naskah Khas Musim Perayaan", price: 3800, pages: 94, episodes: 1, duration: 110, status: "available", image: "/images/tun-teja.jpg", featured: true, holdHours: 48, synopsis: "Sebuah adaptasi bebas yang menemukan Tun Teja bukan sebagai watak latar belakang sejarah, tetapi seorang perempuan berjiwa besar yang memilih suara dan maruahnya sendiri tatkala istana menuntut lebih daripada apa yang hatinya rela beri.", excerpt: "BABAK 1 — BALAI ISTANA\n\nTUN TEJA berdiri di hadapan tirai emas. Di luar, bunyi paluan kompang semakin jauh.\n\nTUN TEJA\nJika sejarah mahu menyebut nama aku, biarlah ia menyebut pilihan aku, bukan penyerahan aku." },
  { id: "kota-yang-menunggu", title: "Kota yang Menunggu", format: "Drama Bersiri Perdana", genre: "Pengorbanan & Realiti Kota", price: 18000, pages: 960, episodes: 30, duration: 45, status: "available", image: "/images/kota-menunggu.jpg", featured: true, holdHours: 72, synopsis: "Tiga beradik yang lama terpisah terpaksa tinggal sebumbung demi memenuhi wasiat arwah ayah. Di tengah hiruk-pikuk Kuala Lumpur yang tidak pernah tidur, mereka menemukan bahawa pulang ke pangkuan keluarga juga satu perjuangan.", excerpt: "EPISOD 1 — PINTU YANG TERBUKA\n\nINT. RUMAH PUSAKA — MALAM\n\nLampu ruang tamu menyala buat pertama kali dalam lima tahun. AINA meletakkan tiga cawan di meja. Satu kerusi masih kosong.\n\nAINA\nDia akan datang. Kali ini, aku tahu dia akan datang." },
  { id: "antara-dua-senja-telemovie", title: "Antara Dua Senja", format: "Telefilem / Telemovie", genre: "Drama Ringan & Santai", price: 2800, pages: 86, episodes: 1, duration: 90, status: "available", image: "/images/dua-senja.jpg", featured: true, holdHours: 48, synopsis: "Selepas dua puluh tahun meninggalkan kampung halaman, seorang anak pulang untuk menjual rumah pusaka ibunya. Namun, sepucuk surat lama yang tidak pernah dikirim membawanya kembali kepada rahsia pengorbanan yang tak terucap.", excerpt: "FADE IN:\n\nEXT. PANTAI — SENJA\n\nBunyi deruan ombak memecah kesunyian petang. HANA, 32, berdiri dengan sebuah beg lusuh dan sepucuk surat yang belum dibuka.\n\nHANA (V.O.)\nAda tempat yang kita tinggalkan. Ada tempat yang tak pernah meninggalkan kita." },
  { id: "sebuah-kota-dan-rahsia-filem", title: "Sebuah Kota & Rahsia", format: "Filem Cereka", genre: "Misteri & Thriller", price: 7500, pages: 106, episodes: 1, duration: 110, status: "available", image: "/images/kota-rahsia.jpg", featured: false, holdHours: 48, synopsis: "Seorang arkitek menemui ruang tersembunyi dalam pelan asal sebuah bangunan warisan bandar raya. Apabila rahsia itu mula mengancam keselamatan keluarganya, dia terpaksa memilih antara kebenaran dan keselamatan orang yang disayangi.", excerpt: "FADE IN:\n\nEXT. BANDAR RAYA — MALAM\n\nLampu bangunan memantul pada jalan basah. ARIF membuka gulungan pelan lama. Ada satu bilik yang tidak sepatutnya wujud.\n\nARIF\nKalau dinding ini boleh bercakap…" },
  { id: "sebelum-hujan-digital", title: "Sebelum Hujan", format: "Skrip Siri Pendek (Digital)", genre: "Bebas & Adaptasi Novel", price: 3600, pages: 168, episodes: 8, duration: 12, status: "hold", image: "/images/sebelum-hujan.jpg", featured: false, holdHours: 24, synopsis: "Seorang jurugambar dan penjaga hutan bertemu di sebuah desa pedalaman yang bakal ditenggelami pembangunan empangan. Antara rakaman lensa dan perubahan masa, mereka belajar bahawa cinta kadangkala bermaksud merelakan.", excerpt: "EPISOD 1 — KABUS\n\nEXT. HUTAN SIMPAN — PAGI\n\nKabus tebal menyelubungi kanopi hijau. LISA mengangkat kameranya. Di hujung laluan denai, seorang lelaki berdiri menatap langit yang kian mendung." },
  { id: "surat-di-ruang-kecil", title: "Surat di Ruang Kecil", format: "Drama Radio", genre: "Kerohanian & Motivasi", price: 1500, pages: 30, episodes: 1, duration: 35, status: "available", image: "/images/ruang-kecil.jpg", featured: false, holdHours: 24, synopsis: "Seorang penyampai radio malam menerima panggilan daripada seorang pendengar misteri yang membaca surat-surat lama tanpa penerima. Melalui satu malam siaran yang penuh emosi, dua jiwa belajar berdamai dengan luka silam.", excerpt: "SFX: DERUAN HUJAN RENYAI. DENGUNG PERALATAN STUDIO PERLAHAN.\n\nPENYAMPAI\nSelamat malam pendengar setia. Siapa bersama kami di talian?\n\nPEMANGGIL\nSaya cuma ingin tahu… adakah masih sempat untuk kita meminta maaf pada orang yang telah tiada?" },
  { id: "langit-yang-belum-selesai-novel", title: "Langit yang Belum Selesai", format: "Novel / Manuskrip E-Book", genre: "Romance (Romantis)", price: 24, pages: 280, episodes: 1, duration: 0, progress: "Lengkap", status: "available", image: "/images/langit-novel.jpg", featured: true, holdHours: 48, synopsis: "Selepas kehilangan ibunya, seorang pelukis muda menemukan buku catatan harian yang membuka kisah cinta tersembunyi di tanah seberang. Sebuah naskah e-book tentang kemaafan, harapan dan warna kehidupan yang baru.", excerpt: "BAB 1 — LANGIT DI DALAM BINGKAI\n\nLangit petang itu kelihatan seperti lukisan kanvas yang belum selesai. Mira membiarkan daun tingkap studio terbuka luas. Di atas meja kayu jati, diari bersampul kain ungu itu menunggu untuk diselak." },
  { id: "bilik-dalam-kepala", title: "Bilik Dalam Kepala", format: "Fiksyen (Cerita Rekaan)", genre: "Seram (Horror)", price: 18, pages: 148, episodes: 1, duration: 0, progress: "Lengkap", status: "available", image: "/images/bilik-kepala.jpg", featured: false, holdHours: 24, synopsis: "Sebuah novel fiksyen seram psikologi tentang seorang penulis yang menyewa rumah lama di pinggir bukit. Setiap tengah malam, bunyi ketukan di bilik paling hujung memaksanya menulis cerita yang bukan miliknya.", excerpt: "BAB 1\n\nAnak kunci berkarat itu tiada dalam senarai penyerahan rumah. Namun ia terbaring di dasar laci meja tulis, sejuk seperti ais ketika jari jemari menyentuhnya." },
  { id: "catatan-seorang-penulis", title: "Catatan Seorang Penulis", format: "Panduan & Penulisan (How-To)", genre: "Motivasi & Pembangunan Diri", price: 15, pages: 96, episodes: 1, duration: 0, progress: "Lengkap", status: "available", image: "/images/catatan-penulis.jpg", featured: false, holdHours: 24, synopsis: "Sebuah panduan praktikal dan refleksi ikhlas daripada Maya Myra tentang seni menyiapkan manuskrip, membina plot yang memikat jiwa pembaca, dan mendisiplinkan diri mengharungi cabaran dunia penulisan.", excerpt: "MULA DENGAN SATU HALAMAN\n\nDraf pertama tulisan anda tidak perlu sempurna. Ia cuma perlu wujud. Jangan biarkan rasa ragu membunuh cerita yang sedang menanti untuk dilahirkan." },
  { id: "bab-pertama-senja", title: "Antara Dua Senja — 3 Bab Pertama", format: "Pratonton E-Book (3 Bab Pertama)", genre: "Romance (Romantis)", price: 0, pages: 32, episodes: 1, duration: 0, progress: "Lengkap", status: "available", image: "/images/pratonton-senja.jpg", featured: false, synopsis: "Nikmati pembacaan tiga bab terawal daripada naskah novel Antara Dua Senja secara percuma sebelum mendapatkan edisi penuh.", excerpt: "BAB 1\n\nLangit senja di hujung jeti itu seakan-akan menyimpan sejuta kenangan yang tidak pernah luput ditelan masa. Hana menghela nafas panjang, menyedari bahawa takdir telah membawanya kembali." },
  { id: "draf-pitching-kota", title: "Kota yang Menunggu — Draf Pitching", format: "Draf Pitching (Skrip Pilihan)", genre: "Pengorbanan & Realiti Kota", price: 0, pages: 12, episodes: 1, duration: 0, progress: "Lengkap", status: "available", image: "/images/pitching-kota.jpg", featured: false, synopsis: "Dokumen sinopsis penuh, logline dan profil watak untuk produksi atau penerbit yang ingin menilai konsep drama bersiri ini.", excerpt: "LOGLINE:\n\nTiga beradik yang renggang bertembung semula di rumah pusaka keluarga, membongkar rahsia lama yang menguji erti sebenar sebuah pengorbanan." },
  { id: "surat-dari-gerabak-3", title: "Surat dari Gerabak 3", format: "Cerpen Mingguan", genre: "Romance (Romantis)", price: 0, pages: 10, episodes: 1, duration: 0, progress: "Lengkap", status: "available", image: "/images/gerabak-3.jpg", featured: false, synopsis: "Dalam kesesakan KTM Komuter setiap pagi, Izzat jatuh hati pada Zara yang sentiasa berdiri di sudut Gerabak 3. Sebuah lakaran potret dan nota kecil memulakan kisah yang manis tanpa suara.", excerpt: "GERABAK 3\n\nIzzat meninggalkan lakaran potret Zara dengan nota kecil di kerusi itu sebelum dia turun di stesen KL Sentral. Keesokan harinya, sekeping nota balasan menanti di tempat yang sama." },
];

const legacyDemoIds = ["antara-dua-senja", "rumah-yang-menunggu", "sebelum-hujan", "kota-tanpa-nama", "pulang-ke-akar", "kopi-kamu-dan-aku", "jejak-di-hujung-jalan", "surat-untuk-esok", "langit-yang-belum-selesai", "suara-di-hujung-talian", "sebuah-kota-dan-rahsia"];
export const demoIds = [...new Set([...legacyDemoIds, ...examples.map((work) => work.id)])];
export const demoWorkFlag = sql<boolean>`coalesce((${inArray(manuscripts.id, demoIds)} and ${manuscripts.fileName} = ${manuscripts.id} || '-naskah.pdf'), false)`;

export async function ensureCatalog() {
  const marker = await db.select().from(siteState).where(eq(siteState.id, "catalog_clean_v5")).limit(1);
  const existingExamples = await db.select({ id: manuscripts.id }).from(manuscripts).where(and(inArray(manuscripts.id, examples.map((work) => work.id)), eq(manuscripts.active, true)));
  if (marker.length && existingExamples.length === examples.length) return;
  const [writer] = await db.select({ name: writerSettings.displayName }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  await db.transaction(async (tx) => {
    await tx.update(manuscripts).set({ active: false }).where(inArray(manuscripts.id, legacyDemoIds));
    for (const [index, work] of examples.entries()) {
      await tx.insert(manuscripts).values({
        ...work,
        author: writer?.name || writerDefaults.displayName,
        createdAt: new Date(Date.now() - index * 86400000),
        fileName: `${work.id}-naskah.pdf`,
        fileMime: "application/pdf",
        fileData: Buffer.from(`%PDF-1.4\n% ${work.title.toUpperCase()}\n% KARYA OLEH ${writer?.name || writerDefaults.displayName}\n1 0 obj\n<< /Title (${work.title}) >>\nendobj\n%%EOF`).toString("base64"),
      }).onConflictDoUpdate({
        target: manuscripts.id,
        set: {
          title: work.title,
          format: work.format,
          genre: work.genre,
          price: work.price,
          pages: work.pages,
          episodes: work.episodes,
          duration: work.duration,
          progress: work.progress || "Lengkap",
          holdHours: work.holdHours || 48,
          image: work.image,
          featured: work.featured,
          synopsis: work.synopsis,
          excerpt: work.excerpt,
          active: true,
        },
      });
    }
    await tx.insert(siteState).values({ id: "catalog_clean_v5", value: "1" }).onConflictDoNothing();
  });
}

export async function expireReservations() {
  await db.transaction(async (tx) => {
    const expired = await tx.update(manuscripts).set({ status: "available", reservedUntil: null }).where(and(eq(manuscripts.status, "hold"), lte(manuscripts.reservedUntil, new Date()))).returning({ id: manuscripts.id });
    if (expired.length) await tx.update(orders).set({ status: "expired" }).where(and(inArray(orders.manuscriptId, expired.map((work) => work.id)), eq(orders.status, "pending"), lte(orders.expiresAt, new Date())));
  });
}

const publicFields = { id: manuscripts.id, title: manuscripts.title, format: manuscripts.format, genre: manuscripts.genre, synopsis: manuscripts.synopsis, excerpt: manuscripts.excerpt, author: manuscripts.author, price: manuscripts.price, pages: manuscripts.pages, episodes: manuscripts.episodes, duration: manuscripts.duration, progress: manuscripts.progress, holdHours: manuscripts.holdHours, status: manuscripts.status, image: manuscripts.image, featured: manuscripts.featured, createdAt: manuscripts.createdAt, hasFile: sql<boolean>`${manuscripts.fileData} is not null`, isDemo: demoWorkFlag };
type PublicRow = { id: string; title: string; format: string; genre: string; synopsis: string; excerpt: string; author: string; price: number; pages: number; episodes: number; duration: number; progress: string; holdHours: number; status: string; image: string; featured: boolean; createdAt: Date; hasFile: boolean; isDemo: boolean };

function asPublicWork(work: PublicRow): PublicWork {
  const format = displayFormat(work.format);
  return { ...work, format, genre: displayGenre(work.genre), section: sectionForFormat(format), isFree: isFreeFormat(format), progress: work.progress as WorkProgress, status: work.status as WorkStatus, createdAt: work.createdAt.toISOString() };
}

export function publicWork(work: typeof manuscripts.$inferSelect): PublicWork {
  const format = displayFormat(work.format);
  return { id: work.id, title: work.title, format, genre: displayGenre(work.genre), section: sectionForFormat(format), isFree: isFreeFormat(format), synopsis: work.synopsis, excerpt: work.excerpt, author: work.author, price: work.price, pages: work.pages, episodes: work.episodes, duration: work.duration, progress: work.progress as WorkProgress, holdHours: work.holdHours, status: work.status as WorkStatus, image: work.image, featured: work.featured, createdAt: work.createdAt.toISOString(), hasFile: Boolean(work.fileData), isDemo: demoIds.includes(work.id) && work.fileName === `${work.id}-naskah.pdf` };
}

export async function getWorks(): Promise<PublicWork[]> {
  await ensureCatalog();
  await expireReservations();
  const rows = await db.select(publicFields).from(manuscripts).where(eq(manuscripts.active, true)).orderBy(asc(demoWorkFlag), desc(manuscripts.featured), desc(manuscripts.createdAt));
  return rows.map(asPublicWork);
}

export const getWork = cache(async (id: string): Promise<PublicWork | null> => {
  if (id.length > 160) return null;
  await ensureCatalog();
  await expireReservations();
  const [work] = await db.select(publicFields).from(manuscripts).where(and(eq(manuscripts.id, id), eq(manuscripts.active, true))).limit(1);
  return work ? asPublicWork(work) : null;
});

export async function getPublicProfile(): Promise<PublicProfile> {
  const [profile] = await db.select({ displayName: writerSettings.displayName, bio: writerSettings.bio, blogUrl: writerSettings.blogUrl }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  return profile ?? { ...writerDefaults };
}
