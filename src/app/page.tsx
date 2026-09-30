import { getPublicProfile, getWorks } from "@/lib/catalog";
import { Marketplace } from "@/components/marketplace";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [works, profile] = await Promise.all([getWorks(), getPublicProfile()]);
  return <Marketplace initialWorks={works} profile={profile} />;
}
