"use client";

import { useCallback, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import type { PublicWork } from "@/lib/types";
import { OrderDialog, WorkContent } from "./work-dialogs";
import { Toast } from "./ui";

export function WorkPage({ initialWork }: { initialWork: PublicWork }) {
  const [work, setWork] = useState(initialWork);
  const [action, setAction] = useState<"buy" | "hold" | null>(null);
  const [toast, setToast] = useState("");
  const closeOrder = useCallback(() => setAction(null), []);
  const closeToast = useCallback(() => setToast(""), []);
  async function share() {
    const data = { title: work.title, text: `${work.format} oleh ${work.author}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); setToast("Pautan karya disalin. Kongsi dengan pembaca atau penerbit."); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setToast("Pautan boleh disalin terus daripada bar alamat pelayar anda.");
    }
  }
  return <>
    <div className="public-work-card"><WorkContent work={work} onOrder={(_work, type) => setAction(type)} /><div className="public-work-share"><span>Sinopsis untuk dibaca. Fail karya kekal peribadi.</span><button className="button button-outline" onClick={() => void share()}><Share2 size={14} />Kongsi karya <Copy size={13} /></button></div></div>
    {action && <OrderDialog work={work} type={action} onClose={closeOrder} onOrdered={() => setWork((current) => ({ ...current, status: "hold" }))} />}
    {toast && <Toast message={toast} onClose={closeToast} />}
  </>;
}
