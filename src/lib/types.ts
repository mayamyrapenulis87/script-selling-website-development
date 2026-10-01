export type WorkStatus = "available" | "hold" | "sold";
export type StoreSection = "script" | "ebook" | "library";
export type WorkProgress = "Lengkap" | "Separuh siap";

export const scriptFormats = [
  "Drama Bersiri Perdana",
  "Telefilem / Telemovie",
  "Filem Cereka",
  "Skrip Siri Pendek (Digital)",
  "Skrip Teater",
  "Drama Radio",
] as const;
export const ebookFormats = [
  "Fiksyen (Cerita Rekaan)",
  "Bukan Fiksyen (Fakta & Biografi)",
  "Panduan & Penulisan (How-To)",
  "Novel / Manuskrip E-Book",
  "Cerpen & Novelet",
] as const;
export const libraryFormats = [
  "Pratonton E-Book (3 Bab Pertama)",
  "Draf Pitching (Skrip Pilihan)",
  "Cerpen Mingguan",
] as const;

// Legacy values are mapped cleanly so any existing records remain fully readable.
export type WorkFormat = typeof scriptFormats[number] | typeof ebookFormats[number] | typeof libraryFormats[number] | "Telemovie" | "Drama bersiri" | "Skrip layar" | "Drama radio" | "Filem pendek" | "Manuskrip novel" | "Skrip Contoh (Draf Pitching)";

export const formatSections: Record<StoreSection, { label: string; eyebrow: string; formats: readonly string[] }> = {
  script: { label: "Kedai Skrip", eyebrow: "UNTUK PRODUKSI", formats: scriptFormats },
  ebook: { label: "Kedai E-Book", eyebrow: "UNTUK PEMBACA", formats: ebookFormats },
  library: { label: "Perpustakaan Percuma", eyebrow: "ZON BACAAN FREE", formats: libraryFormats },
};

export const scriptGenres = [
  "Bebas & Adaptasi Novel",
  "Drama Ringan & Santai",
  "Naskah Khas Musim Perayaan",
  "Kerohanian & Motivasi",
  "Pengorbanan & Realiti Kota",
  "Misteri & Thriller",
  "Seram (Horror)",
] as const;
export const ebookGenres = [
  "Romance (Romantis)",
  "Sains Fiksyen & Fantasi",
  "Misteri & Thriller",
  "Seram (Horror)",
  "Biografi & Memoir",
  "Motivasi & Pembangunan Diri",
] as const;
export const libraryGenres = [
  "Romance (Romantis)",
  "Misteri & Thriller",
  "Seram (Horror)",
  "Inspirasi & Motivasi",
  "Pelbagai Genre",
] as const;
export const genres = [...new Set([...scriptGenres, ...ebookGenres, ...libraryGenres])] as string[];

const legacyFormatMap: Record<string, WorkFormat> = {
  "Telemovie": "Telefilem / Telemovie",
  "Drama bersiri": "Drama Bersiri Perdana",
  "Skrip layar": "Filem Cereka",
  "Filem pendek": "Skrip Siri Pendek (Digital)",
  "Drama radio": "Drama Radio",
  "Manuskrip novel": "Novel / Manuskrip E-Book",
  "Skrip Contoh (Draf Pitching)": "Draf Pitching (Skrip Pilihan)",
};
const legacyGenreMap: Record<string, string> = {
  "Drama": "Pengorbanan & Realiti Kota",
  "Keluarga": "Drama Ringan & Santai",
  "Romantik": "Romance (Romantis)",
  "Thriller": "Misteri & Thriller",
  "Misteri": "Misteri & Thriller",
  "Komedi": "Drama Ringan & Santai",
  "Seram": "Seram (Horror)",
  "Fantasi": "Sains Fiksyen & Fantasi",
  "Fiksyen sains": "Sains Fiksyen & Fantasi",
  "Sejarah": "Bebas & Adaptasi Novel",
};

export function displayFormat(format: string): WorkFormat { return legacyFormatMap[format] ?? format as WorkFormat; }
export function displayGenre(genre: string): string { return legacyGenreMap[genre] ?? genre; }
export function sectionForFormat(format: string): StoreSection {
  const displayed = displayFormat(format);
  if ((libraryFormats as readonly string[]).includes(displayed)) return "library";
  if ((ebookFormats as readonly string[]).includes(displayed)) return "ebook";
  return "script";
}
export function formatsForSection(section: StoreSection): readonly string[] { return formatSections[section].formats; }
export function isFreeFormat(format: string) { return sectionForFormat(format) === "library"; }
export function isScreenFormat(format: string) { return sectionForFormat(format) === "script"; }
export function hasEpisodes(format: string) {
  const displayed = displayFormat(format);
  return displayed === "Drama Bersiri Perdana" || displayed === "Skrip Siri Pendek (Digital)" || displayed === "Drama Radio";
}
export function genresForFormat(format: string): readonly string[] {
  const section = sectionForFormat(format);
  return section === "script" ? scriptGenres : section === "ebook" ? ebookGenres : libraryGenres;
}

export type PublicWork = {
  id: string;
  title: string;
  format: WorkFormat;
  genre: string;
  section: StoreSection;
  isFree: boolean;
  synopsis: string;
  excerpt: string;
  author: string;
  price: number;
  pages: number;
  episodes: number;
  duration: number;
  progress: WorkProgress;
  holdHours: number;
  status: WorkStatus;
  image: string;
  featured: boolean;
  createdAt: string;
  hasFile: boolean;
  isDemo: boolean;
};
export type PublicProfile = { displayName: string; bio: string; blogUrl: string };
export type StudioOrder = { id: string; reference: string; title: string; manuscriptId: string; customerName: string; email: string; phone: string; notes: string; type: string; status: string; amount: number; accessToken: string; createdAt: string; expiresAt: string };

export const formats: WorkFormat[] = [...scriptFormats, ...ebookFormats, ...libraryFormats];
export const holdOptions = [6, 12, 24, 48, 72, 168];
export const statusLabels: Record<WorkStatus, string> = { available: "BUY NOW", hold: "HOLD", sold: "SOLD OUT" };
export function workLength(work: Pick<PublicWork, "section" | "format" | "progress" | "episodes" | "duration">) {
  if (work.section !== "script") return work.progress;
  return hasEpisodes(work.format) ? `${work.episodes} episod` : `${work.duration} min`;
}
export function holdLabel(hours: number) { return hours === 168 ? "7 hari" : `${hours} jam`; }
export function money(amount: number) { return `RM${new Intl.NumberFormat("en-MY").format(amount)}`; }
export function dateLabel(value: string) { return new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
