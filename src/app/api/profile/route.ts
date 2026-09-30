import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { manuscripts, writerSettings } from "@/db/schema";
import { getWriter } from "@/lib/auth";
import { getPublicProfile } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ profile: await getPublicProfile() }); }
export async function PATCH(request: Request) {
  if (!await getWriter()) return NextResponse.json({ error: "Sila log masuk sebagai penulis." }, { status: 401 });
  try {
    const body = await request.json();
    const displayName = String(body.displayName ?? "").trim();
    const bio = String(body.bio ?? "").trim();
    let blogUrl = String(body.blogUrl ?? "").trim();
    if (displayName.length < 2 || displayName.length > 80 || bio.length > 1200 || blogUrl.length > 600) return NextResponse.json({ error: "Semak nama penulis (2–80 aksara), bio (maksimum 1,200) dan pautan blog." }, { status: 400 });
    if (blogUrl) {
      let parsed: URL;
      try { parsed = new URL(blogUrl); } catch { return NextResponse.json({ error: "Masukkan pautan blog lengkap bermula dengan https://." }, { status: 400 }); }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname.includes(".")) return NextResponse.json({ error: "Pautan blog mestilah alamat HTTPS awam tanpa maklumat log masuk." }, { status: 400 });
      parsed.hash = "";
      blogUrl = parsed.toString();
    }
    await db.transaction(async (tx) => {
      await tx.update(writerSettings).set({ displayName, bio, blogUrl }).where(eq(writerSettings.id, "owner"));
      await tx.update(manuscripts).set({ author: displayName });
    });
    return NextResponse.json({ profile: { displayName, bio, blogUrl } });
  } catch (error) {
    console.error("Update writer profile:", error);
    return NextResponse.json({ error: "Profil tidak dapat disimpan. Sila cuba lagi." }, { status: 500 });
  }
}
