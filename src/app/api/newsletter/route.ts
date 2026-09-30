import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const { email: input } = await request.json();
    const email = String(input ?? "").trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Masukkan alamat e-mel yang sah." }, { status: 400 });
    await db.insert(subscriptions).values({ email }).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tidak dapat melanggan. Sila cuba lagi." }, { status: 500 });
  }
}
