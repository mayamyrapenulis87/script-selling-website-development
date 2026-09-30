import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand${light ? " brand-light" : ""}`} aria-label="Naskah — halaman utama">
    <svg className="brand-mark" width="31" height="34" viewBox="0 0 31 34" fill="none" aria-hidden="true">
      <path d="M7 6.5 4 8v21a2 2 0 0 0 2 2h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 3h13l5 5v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M21 3v6h6M12 14h10M12 18h10M12 22h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span>naskah<span className="brand-dot">.</span></span>
  </Link>;
}
