import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/db";
import { manuscripts, orders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { expireReservations } from "@/lib/catalog";
import { isFreeFormat } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim(), email = String(body.email ?? "").trim().toLowerCase(), phone = String(body.phone ?? "").trim(), notes = String(body.notes ?? "").trim();
    if (name.length < 2 || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length > 40 || notes.length > 1500 || !["buy", "hold"].includes(body.type) || typeof body.manuscriptId !== "string" || body.manuscriptId.length > 160) return NextResponse.json({ error: "Semak nama, alamat e-mel dan maklumat tempahan anda." }, { status: 400 });
    await expireReservations();
    const accessToken = randomUUID(), reference = `NKS-${randomBytes(4).toString("hex").toUpperCase()}`;
    const result = await db.transaction(async (tx) => {
      const [work] = await tx.select({ id: manuscripts.id, title: manuscripts.title, format: manuscripts.format, price: manuscripts.price, holdHours: manuscripts.holdHours }).from(manuscripts).where(and(eq(manuscripts.id, body.manuscriptId), eq(manuscripts.status, "available"), eq(manuscripts.active, true))).for("update").limit(1);
      if (!work) return { type: "missing" as const };
      if (isFreeFormat(work.format)) return { type: "free" as const };
      const expiresAt = new Date(Date.now() + work.holdHours * 3600000);
      await tx.update(manuscripts).set({ status: "hold", reservedUntil: expiresAt }).where(eq(manuscripts.id, work.id));
      await tx.insert(orders).values({ id: randomUUID(), reference, manuscriptId: work.id, customerName: name, email, phone, notes, type: body.type, amount: work.price, accessToken, expiresAt });
      return { type: "ok" as const, ...work, reference, accessToken, expiresAt };
    });
    if (result.type === "free") return NextResponse.json({ error: "Ini bahan Perpustakaan Percuma. Gunakan butang Baca Percuma." }, { status: 400 });
    if (result.type === "missing") return NextResponse.json({ error: "Maaf, karya ini sudah ditempah atau terjual. Sila pilih karya lain." }, { status: 409 });
    return NextResponse.json({ ok: true, reference: result.reference, accessToken: result.accessToken, title: result.title, amount: result.price, holdHours: result.holdHours, expiresAt: result.expiresAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Create order:", error);
    return NextResponse.json({ error: "Tempahan tidak berjaya. Sila cuba semula." }, { status: 500 });
  }
}
