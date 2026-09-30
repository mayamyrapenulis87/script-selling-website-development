"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Check, Clock3, X } from "lucide-react";
import { statusLabels, type WorkStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: WorkStatus }) {
  return <span className={`status-badge status-${status}`}>{status === "hold" ? <Clock3 size={11} /> : <span className="status-dot" />}{statusLabels[status]}</span>;
}

export function Modal({ title, eyebrow, children, onClose, wide = false }: { title: string; eyebrow?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => ref.current?.querySelector<HTMLElement>("button, input, select, textarea, a[href]")?.focus(), 30);
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && ref.current) {
        const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex="0"]')).filter((el) => el.offsetParent !== null);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => { clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener("keydown", handler); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal${wide ? " modal-wide" : ""}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modal-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Tutup dialog"><X size={21} /></button></div>
      {children}
    </div>
  </div>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 4200); return () => clearTimeout(timer); }, [message, onClose]);
  return <div className="toast" role="status"><span className="toast-icon"><Check size={16} /></span>{message}<button onClick={onClose} aria-label="Tutup notis"><X size={16} /></button></div>;
}
