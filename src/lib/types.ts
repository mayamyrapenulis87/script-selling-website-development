export type WorkStatus = "available" | "hold" | "sold";
export type WorkFormat = "Manuskrip novel" | "Telemovie" | "Drama bersiri" | "Skrip layar" | "Drama radio" | "Filem pendek";
export type WorkProgress = "Lengkap" | "Separuh siap";
export type PublicWork = {
  id: string;
  title: string;
  format: WorkFormat;
  genre: string;
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
export type StudioOrder = {
  id: string;
  reference: string;
  title: string;
  manuscriptId: string;
  customerName: string;
  email: string;
  phone: string;
  notes: string;
  type: string;
  status: string;
  amount: number;
  accessToken: string;
  createdAt: string;
  expiresAt: string;
};
export const formats: WorkFormat[] = ["Manuskrip novel", "Telemovie", "Drama bersiri", "Skrip layar", "Drama radio", "Filem pendek"];
export const genres = ["Drama", "Keluarga", "Romantik", "Thriller", "Misteri", "Komedi", "Seram", "Fantasi", "Fiksyen sains", "Sejarah"];
export const holdOptions = [6, 12, 24, 48, 72, 168];
export const statusLabels: Record<WorkStatus, string> = { available: "Tersedia", hold: "On Hold", sold: "Sold Out" };
export function hasEpisodes(format: string) { return format === "Drama bersiri" || format === "Drama radio"; }
export function workLength(work: Pick<PublicWork, "format" | "progress" | "episodes" | "duration">) {
  if (work.format === "Manuskrip novel") return work.progress;
  return hasEpisodes(work.format) ? `${work.episodes} episod` : `${work.duration} min`;
}
export function holdLabel(hours: number) { return hours === 168 ? "7 hari" : `${hours} jam`; }
export function money(amount: number) { return `RM${new Intl.NumberFormat("en-MY").format(amount)}`; }
export function dateLabel(value: string) { return new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
