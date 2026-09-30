import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { manuscripts, orders } from "@/db/schema";
import { getWriter } from "@/lib/auth";
import { demoWorkFlag, expireReservations } from "@/lib/catalog";

export async function DELETE() {
  if (!await getWriter()) return NextResponse.json({ error: "Sila log masuk sebagai penulis." }, { status: 401 });
  try {
    await expireReservations();
    const result = await db.transaction(async (tx) => {
      const samples = await tx.select({ id: manuscripts.id }).from(manuscripts).where(and(eq(manuscripts.active, true), demoWorkFlag)).for("update");
      if (!samples.length) return { blocked: false, count: 0 };
      const ids = samples.map((sample) => sample.id);
      const [pending] = await tx.select({ id: orders.id }).from(orders).where(and(inArray(orders.manuscriptId, ids), eq(orders.status, "pending"))).limit(1);
      if (pending) return { blocked: true, count: 0 };
      const updated = await tx.update(manuscripts).set({ active: false }).where(inArray(manuscripts.id, ids)).returning({ id: manuscripts.id });
      return { blocked: false, count: updated.length };
    });
    if (result.blocked) return NextResponse.json({ error: "Ada tempahan aktif pada karya contoh. Selesaikan atau batalkan tempahan itu dahulu." }, { status: 409 });
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("Archive demo works:", error);
    return NextResponse.json({ error: "Karya contoh belum dapat disorok. Sila cuba lagi." }, { status: 500 });
  }
}
