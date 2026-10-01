import { Studio } from "@/components/studio";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Upload Skrip & Ruang Penulis — mayamyrastories",
  robots: { index: false, follow: false },
};

export default async function StudioPage({ searchParams }: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const params = await searchParams;
  const startUpload = params.upload === "1";
  return <Studio key={startUpload ? "upload" : "studio"} startUpload={startUpload} />;
}
