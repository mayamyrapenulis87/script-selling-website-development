import { headers } from "next/headers";

// Set SITE_URL to the final public domain when deploying.
export async function siteOrigin(): Promise<string> {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (configured) {
    try {
      const url = new URL(configured);
      if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.origin;
    } catch { /* Fall back to the current request host. */ }
  }
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(host)) return "http://localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return new URL(`${local ? "http" : "https"}://${host}`).origin;
}
