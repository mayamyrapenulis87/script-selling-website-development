import { db } from "@/db";
import { manuscripts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isFreeFormat } from "@/lib/types";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-z0-9-]{2,160}$/i.test(id)) return Response.json({ error: "Bahan bacaan tidak ditemui." }, { status: 404 });
  const [work] = await db.select({ format: manuscripts.format, status: manuscripts.status, active: manuscripts.active, fileData: manuscripts.fileData, fileName: manuscripts.fileName, fileMime: manuscripts.fileMime }).from(manuscripts).where(and(eq(manuscripts.id, id), eq(manuscripts.active, true))).limit(1);
  if (!work || !isFreeFormat(work.format) || work.status !== "available") return Response.json({ error: "Bahan bacaan percuma tidak tersedia." }, { status: 404 });
  if (!work.fileData) return Response.json({ error: "Fail bacaan belum dimuat naik." }, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(work.fileData, "base64")), { headers: { "Content-Type": work.fileMime ?? "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(work.fileName ?? "bacaan-percuma.pdf")}`, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
