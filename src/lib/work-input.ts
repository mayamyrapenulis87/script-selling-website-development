import { formats, genres, hasEpisodes, holdOptions, type WorkProgress, type WorkStatus } from "./types";

type WorkValues = {
  title: string; format: string; genre: string; synopsis: string; excerpt: string; author: string;
  price: number; pages: number; episodes: number; duration: number; progress: WorkProgress; holdHours: number;
  status: WorkStatus; image: string; featured: boolean;
  fileName?: string; fileMime?: string; fileData?: string;
};
type ParseResult = { ok: true; values: WorkValues } | { ok: false; error: string };

export async function parseWorkForm(form: FormData, author: string, requireFile: boolean): Promise<ParseResult> {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const title = text("title"), format = text("format"), genre = text("genre"), synopsis = text("synopsis"), excerpt = text("excerpt");
  const price = Number(text("price")), pages = Number(text("pages"));
  const episodes = hasEpisodes(format) ? Number(text("episodes") || "1") : 1;
  const duration = format === "Manuskrip novel" ? 0 : Number(text("duration"));
  const progress = (text("progress") || "Lengkap") as WorkProgress;
  const holdHours = Number(text("holdHours") || "48");
  const status = (text("status") || "available") as WorkStatus;
  if (title.length < 3 || title.length > 140) return { ok: false, error: "Tajuk perlu antara 3 hingga 140 aksara." };
  if (!formats.includes(format as typeof formats[number]) || !genres.includes(genre)) return { ok: false, error: "Pilih format dan genre yang sah." };
  if (synopsis.length < 20 || synopsis.length > 3000 || excerpt.length > 8000) return { ok: false, error: "Sinopsis perlu 20–3,000 aksara. Pratonton maksimum 8,000 aksara." };
  if (!Number.isInteger(price) || price < 1 || price > 1000000) return { ok: false, error: "Masukkan harga dalam Ringgit, antara RM1 dan RM1,000,000." };
  if (!Number.isInteger(pages) || pages < 1 || pages > 20000 || !Number.isInteger(episodes) || episodes < 1 || episodes > 200 || !Number.isInteger(duration) || duration < (format === "Manuskrip novel" ? 0 : 1) || duration > 600) return { ok: false, error: "Semak bilangan halaman, episod dan durasi." };
  if (!["Lengkap", "Separuh siap"].includes(progress)) return { ok: false, error: "Pilih tahap siap karya yang sah." };
  if (!holdOptions.includes(holdHours)) return { ok: false, error: "Pilih tempoh Hold antara pilihan yang tersedia." };
  if (!["available", "hold", "sold"].includes(status)) return { ok: false, error: "Status karya tidak sah." };
  let image = text("image") || "/images/senja.jpg";
  const cover = form.get("cover");
  if (cover instanceof File && cover.size) {
    if (cover.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(cover.type)) return { ok: false, error: "Kulit karya mestilah JPG, PNG atau WEBP, maksimum 2 MB." };
    image = `data:${cover.type};base64,${Buffer.from(await cover.arrayBuffer()).toString("base64")}`;
  } else if (!["/images/senja.jpg", "/images/rumah.jpg", "/images/hujan.jpg", "/images/kota.jpg"].includes(image) && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
    return { ok: false, error: "Pilih kulit karya atau muat naik imej sendiri." };
  }
  const values: WorkValues = { title, format, genre, synopsis, excerpt, author, price, pages, episodes, duration, progress, holdHours, status, image, featured: text("featured") === "true" };
  const file = form.get("script");
  if (file instanceof File && file.size) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeTypes: Record<string, string> = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword", txt: "text/plain; charset=utf-8" };
    if (!mimeTypes[ext] || file.size > 8 * 1024 * 1024) return { ok: false, error: "Fail karya mestilah PDF, DOC, DOCX atau TXT, maksimum 8 MB." };
    const bytes = Buffer.from(await file.arrayBuffer());
    if (ext === "pdf" && bytes.subarray(0, 4).toString() !== "%PDF") return { ok: false, error: "Fail PDF tidak sah. Cuba fail lain." };
    values.fileName = file.name.slice(0, 180).replace(/[\r\n]/g, "");
    values.fileMime = mimeTypes[ext];
    values.fileData = bytes.toString("base64");
  } else if (requireFile) return { ok: false, error: "Muat naik fail karya sebelum menerbitkan naskah." };
  return { ok: true, values };
}
