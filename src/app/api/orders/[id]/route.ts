import { NextResponse } from "next/server";
import { db } from "@/db";
import { manuscripts, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getWriter } from "@/lib/auth";
import { expireReservations } from "@/lib/catalog";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getWriter()) return NextResponse.json({ error: "Sila log masuk." }, { status: 401 });
  const { id } = await context.params;
  try {
    const { action } = await request.json();
    if (!["complete", "cancel"].includes(action)) return NextResponse.json({ error: "Tindakan tidak sah." }, { status: 400 });
    await expireReservations();
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.status, "pending"))).limit(1);
      if (!order) return false;
      const [work] = await tx.update(manuscripts).set({ status: action === "complete" ? "sold" : "available", reservedUntil: null }).where(and(eq(manuscripts.id, order.manuscriptId), eq(manuscripts.status, "hold"), eq(manuscripts.reservedUntil, order.expiresAt))).returning({ id: manuscripts.id });
      if (!work) return false;
      const [updated] = await tx.update(orders).set({ status: action === "complete" ? "completed" : "cancelled" }).where(and(eq(orders.id, id), eq(orders.status, "pending"))).returning({ id: orders.id });
      if (!updated) throw new Error("Order changed during confirmation");
      return true;
    });
    return result ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Tempahan ini telah selesai atau tamat tempoh." }, { status: 409 });
  } catch (error) {
    console.error("Confirm order:", error);
    return NextResponse.json({ error: "Tempahan tidak dapat dikemas kini. Sila cuba lagi." }, { status: 500 });
  }
}
