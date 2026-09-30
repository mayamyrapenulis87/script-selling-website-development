import { NextResponse } from "next/server";
import { db } from "@/db";
import { manuscripts, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getWriter } from "@/lib/auth";
import { expireReservations, publicWork } from "@/lib/catalog";
import { parseWorkForm } from "@/lib/work-input";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const writer = await getWriter();
  if (!writer) return NextResponse.json({ error: "Sila log masuk sebagai penulis." }, { status: 401 });
  const { id } = await context.params;
  try {
    await expireReservations();
    let values: Partial<typeof manuscripts.$inferInsert>;
    if (request.headers.get("content-type")?.includes("application/json")) {
      const { status } = await request.json();
      if (!["available", "hold", "sold"].includes(status)) return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
      values = { status };
    } else {
      const parsed = await parseWorkForm(await request.formData(), writer.displayName, false);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      values = parsed.values;
    }
    const work = await db.transaction(async (tx) => {
      const [current] = await tx.select({ status: manuscripts.status, reservedUntil: manuscripts.reservedUntil }).from(manuscripts).where(and(eq(manuscripts.id, id), eq(manuscripts.active, true))).for("update").limit(1);
      if (!current) return null;
      const reservedUntil = values.status === "hold" && current.status === "hold" ? current.reservedUntil : null;
      const [updated] = await tx.update(manuscripts).set({ ...values, reservedUntil }).where(eq(manuscripts.id, id)).returning();
      if (values.status === "available" || values.status === "sold") await tx.update(orders).set({ status: values.status === "sold" ? "completed" : "cancelled" }).where(and(eq(orders.manuscriptId, id), eq(orders.status, "pending")));
      return updated;
    });
    return work ? NextResponse.json({ work: publicWork(work) }) : NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
  } catch (error) {
    console.error("Update manuscript:", error);
    return NextResponse.json({ error: "Karya tidak dapat dikemas kini." }, { status: 500 });
  }
}
export async function DELETE(_request: Request, context: Context) {
  if (!await getWriter()) return NextResponse.json({ error: "Sila log masuk." }, { status: 401 });
  const { id } = await context.params;
  const result = await db.transaction(async (tx) => {
    const [work] = await tx.select({ id: manuscripts.id }).from(manuscripts).where(and(eq(manuscripts.id, id), eq(manuscripts.active, true))).for("update").limit(1);
    if (!work) return "missing";
    const [pending] = await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.manuscriptId, id), eq(orders.status, "pending"))).limit(1);
    if (pending) return "pending";
    await tx.update(manuscripts).set({ active: false }).where(eq(manuscripts.id, id));
    return "ok";
  });
  if (result === "pending") return NextResponse.json({ error: "Selesaikan atau batalkan tempahan aktif sebelum mengarkibkan karya." }, { status: 409 });
  if (result === "missing") return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
