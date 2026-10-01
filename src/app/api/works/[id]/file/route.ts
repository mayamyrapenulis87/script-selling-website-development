import { db } from "@/db";
import { manuscripts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWriter } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getWriter()) return Response.json({ error: "Sila log masuk sebagai penulis." }, { status: 401 });
  const { id } = await context.params;
  const [work] = await db.select({ fileData: manuscripts.fileData, fileName: manuscripts.fileName, fileMime: manuscripts.fileMime }).from(manuscripts).where(eq(manuscripts.id, id)).limit(1);
  if (!work?.fileData) return Response.json({ error: "Fail skrip tidak ditemui." }, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(work.fileData, "base64")), { headers: { "Content-Type": work.fileMime ?? "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(work.fileName ?? "karya.pdf")}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
