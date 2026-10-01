import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand${light ? " brand-light" : ""}`} aria-label="mayamyrastories — halaman utama">
      <img
        src="/images/logo-header.svg"
        alt="Lambang mayamyrastories"
        className="brand-mark"
        width={40}
        height={40}
      />
      <span className="brand-word">
        mayamyrastories
        <small>Where Stories Find You</small>
      </span>
    </Link>
  );
}
