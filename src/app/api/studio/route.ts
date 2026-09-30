import { NextResponse } from "next/server";
import { db } from "@/db";
import { manuscripts, orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getWriter } from "@/lib/auth";
import { getWorks } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export async function GET() {
  const writer = await getWriter();
  if (!writer) return NextResponse.json({ error: "Sila log masuk." }, { status: 401 });
  const works = await getWorks();
  const requests = await db.select({ id: orders.id, reference: orders.reference, manuscriptId: orders.manuscriptId, title: manuscripts.title, customerName: orders.customerName, email: orders.email, phone: orders.phone, notes: orders.notes, type: orders.type, status: orders.status, amount: orders.amount, accessToken: orders.accessToken, createdAt: orders.createdAt, expiresAt: orders.expiresAt }).from(orders).innerJoin(manuscripts, eq(orders.manuscriptId, manuscripts.id)).orderBy(desc(orders.createdAt));
  return NextResponse.json({ writer, works, orders: requests.map((order) => ({ ...order, createdAt: order.createdAt.toISOString(), expiresAt: order.expiresAt.toISOString() })) });
}
