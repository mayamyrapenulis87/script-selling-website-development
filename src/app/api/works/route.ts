import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { manuscripts } from "@/db/schema";
import { getWriter } from "@/lib/auth";
import { getWorks, publicWork } from "@/lib/catalog";
import { parseWorkForm } from "@/lib/work-input";

export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ works: await getWorks() }); }
export async function POST(request: Request) {
  const writer = await getWriter();
  if (!writer) return NextResponse.json({ error: "Sila log masuk sebagai penulis." }, { status: 401 });
  try {
    const parsed = await parseWorkForm(await request.formData(), writer.displayName, true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const [work] = await db.insert(manuscripts).values({ id: randomUUID(), ...parsed.values }).returning();
    return NextResponse.json({ work: publicWork(work) }, { status: 201 });
  } catch (error) {
    console.error("Upload manuscript:", error);
    return NextResponse.json({ error: "Muat naik tidak berjaya. Sila cuba lagi." }, { status: 500 });
  }
}
