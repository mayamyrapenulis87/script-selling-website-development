import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { manuscripts } from "@/db/schema";
import { ensureCatalog } from "@/lib/catalog";
import { siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureCatalog();
  const [origin, works] = await Promise.all([siteOrigin(), db.select({ id: manuscripts.id }).from(manuscripts).where(eq(manuscripts.active, true))]);
  return [{ url: origin, changeFrequency: "weekly", priority: 1 }, ...works.map((work) => ({ url: `${origin}/karya/${encodeURIComponent(work.id)}`, changeFrequency: "weekly" as const, priority: 0.8 }))];
}
