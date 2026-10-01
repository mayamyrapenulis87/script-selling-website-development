import { getPublicProfile, getWorks } from "@/lib/catalog";
import { getWriter } from "@/lib/auth";
import { Marketplace } from "@/components/marketplace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [works, profile, writer] = await Promise.all([
    getWorks(),
    getPublicProfile(),
    getWriter(),
  ]);

  // Only the authenticated site's owner sees management links.
  // API routes independently enforce ownership for every write operation.
  return <Marketplace initialWorks={works} profile={profile} isOwner={Boolean(writer)} />;
}
