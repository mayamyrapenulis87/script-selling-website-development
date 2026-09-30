"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function RefreshOrder({ pending }: { pending: boolean }) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => startTransition(() => router.refresh()), 20000);
    return () => clearInterval(timer);
  }, [pending, router]);
  return <button className="button button-outline" disabled={loading} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={14} className={loading ? "spin" : ""} />{loading ? "Menyemak…" : "Semak status"}</button>;
}
