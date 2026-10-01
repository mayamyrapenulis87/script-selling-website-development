import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { writerSessions, writerSettings } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

const COOKIE = "mayamyrastories_writer";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function getWriter() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.select().from(writerSessions).where(and(eq(writerSessions.tokenHash, digest(token)), gt(writerSessions.expiresAt, new Date()))).limit(1);
  if (!session.length) return null;
  const [writer] = await db.select({ displayName: writerSettings.displayName, email: writerSettings.email }).from(writerSettings).where(eq(writerSettings.id, "owner"));
  return writer ?? null;
}
export async function createSession() {
  const token = randomBytes(32).toString("hex");
  await db.insert(writerSessions).values({ tokenHash: digest(token), expiresAt: new Date(Date.now() + 7 * 86400000) });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(writerSessions).where(eq(writerSessions.tokenHash, digest(token)));
  jar.delete(COOKIE);
}
