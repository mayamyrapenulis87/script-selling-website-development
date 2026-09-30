import { db } from "@/db";
import { manuscripts, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[a-f0-9-]{36}$/i.test(token)) return Response.json({ error: "Pautan tidak sah." }, { status: 404 });
  const [order] = await db.select({ fileData: manuscripts.fileData, fileName: manuscripts.fileName, fileMime: manuscripts.fileMime }).from(orders).innerJoin(manuscripts, eq(orders.manuscriptId, manuscripts.id)).where(and(eq(orders.accessToken, token), eq(orders.status, "completed"))).limit(1);
  if (!order) return Response.json({ error: "Muat turun tersedia selepas penulis mengesahkan bayaran." }, { status: 403 });
  if (!order.fileData) return Response.json({ error: "Fail belum tersedia. Sila hubungi penulis." }, { status: 404 });
  return new Response(new Uint8Array(Buffer.from(order.fileData, "base64")), { headers: { "Content-Type": order.fileMime ?? "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(order.fileName ?? "naskah.pdf")}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
