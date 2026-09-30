import { NextResponse } from "next/server";
import { db } from "@/db";
import { manuscripts, writerSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, getWriter, hashPassword, logout, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  const writer = await getWriter();
  const [owner] = await db.select({ id: writerSettings.id }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  return NextResponse.json({ authenticated: Boolean(writer), writer, needsSetup: !owner });
}
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    const previous = attempts.get(ip);
    if (previous && previous.until > Date.now() && previous.count >= 15) return NextResponse.json({ error: "Terlalu banyak cubaan. Cuba semula dalam 15 minit." }, { status: 429 });
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 128) return NextResponse.json({ error: "Masukkan kata laluan yang sah." }, { status: 400 });
    const [owner] = await db.select().from(writerSettings).where(eq(writerSettings.id, "owner"));
    if (body.action === "setup") {
      if (owner) return NextResponse.json({ error: "Akaun penulis sudah tersedia. Sila log masuk." }, { status: 409 });
      const displayName = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      if (password.length < 8 || displayName.length < 2 || displayName.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Isi nama, e-mel yang sah dan kata laluan sekurang-kurangnya 8 aksara." }, { status: 400 });
      const inserted = await db.insert(writerSettings).values({ id: "owner", displayName, email, blogUrl: "https://mayamyrapenulisblog.blogspot.com/", passwordHash: hashPassword(password) }).onConflictDoNothing().returning({ id: writerSettings.id });
      if (!inserted.length) return NextResponse.json({ error: "Akaun telah dicipta. Sila log masuk." }, { status: 409 });
      await db.update(manuscripts).set({ author: displayName });
    } else {
      if (!owner || !verifyPassword(password, owner.passwordHash)) {
        const active = previous && previous.until > Date.now() ? previous : { count: 0, until: Date.now() + 15 * 60000 };
        attempts.set(ip, { ...active, count: active.count + 1 });
        return NextResponse.json({ error: "Kata laluan tidak tepat. Sila cuba lagi." }, { status: 401 });
      }
    }
    attempts.delete(ip);
    await createSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Writer sign-in:", error);
    return NextResponse.json({ error: "Tidak dapat log masuk. Sila cuba lagi." }, { status: 500 });
  }
}
export async function DELETE() {
  await logout();
  return NextResponse.json({ ok: true });
}
