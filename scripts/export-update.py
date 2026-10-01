"""Export a safe, downloadable source update from the current project root.

Run: python scripts/export-update.py
Writes: public/downloads/naskah-maya-update.zip
Uses only Python's standard library. Never includes .env, .git, database rows,
private uploaded manuscripts, node_modules or .next build output.
"""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "downloads" / "naskah-maya-update.zip"
ROOT_FILES = (
    ".gitignore", "KEMAS-KINI-WINDOWS.md", "package.json", "package-lock.json",
    "tsconfig.json", "next.config.ts", "postcss.config.mjs", "eslint.config.mjs",
    "drizzle.config.json", "next-env.d.ts",
)
SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json"}
ASSET_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg", ".ttf", ".otf", ".woff", ".woff2"}
REQUIRED_COVERS = (
    "tun-teja.jpg", "kota-menunggu.jpg", "dua-senja.jpg", "kota-rahsia.jpg",
    "sebelum-hujan.jpg", "ruang-kecil.jpg", "langit-novel.jpg", "bilik-kepala.jpg",
    "catatan-penulis.jpg", "pratonton-senja.jpg", "pitching-kota.jpg", "gerabak-3.jpg",
)
REQUIRED_FONTS = ("dm-sans.ttf", "dm-sans-semibold.ttf", "dm-serif.ttf", "dm-serif-italic.ttf")
EXCLUDED_PARTS = {".git", ".next", ".vercel", "node_modules", ".artifacts", "downloads", "__pycache__"}


def main():
    required = [ROOT / "public" / "images" / name for name in REQUIRED_COVERS]
    required += [ROOT / "public" / "fonts" / name for name in REQUIRED_FONTS]
    missing = [path.relative_to(ROOT).as_posix() for path in required if not path.is_file() or path.stat().st_size == 0]
    if missing:
        raise SystemExit("Required cover/font files are missing: " + ", ".join(missing))

    files = [ROOT / name for name in ROOT_FILES if (ROOT / name).is_file()]
    for folder in (ROOT / "src", ROOT / "scripts", ROOT / "public" / "images", ROOT / "public" / "fonts"):
        files.extend(path for path in folder.rglob("*") if path.is_file() and not path.is_symlink())
    favicon = ROOT / "public" / "favicon.svg"
    if favicon.is_file():
        files.append(favicon)

    unique = {}
    for path in files:
        relative = path.relative_to(ROOT)
        parts = relative.parts
        if any(part in EXCLUDED_PARTS or part.startswith(".env") for part in parts):
            continue
        if path.parent.name == "scripts" and path.suffix not in {".mjs", ".py"}:
            continue
        if path.parent.name in {"images", "fonts"} and path.suffix.lower() not in ASSET_EXTENSIONS:
            continue
        unique[relative.as_posix()] = path

    manifest = []
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED, compresslevel=6) as archive:
        for name, path in sorted(unique.items()):
            content = path.read_bytes()
            archive.writestr(name, content)
            manifest.append({"path": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
        archive.writestr("UPDATE-MANIFEST.json", json.dumps({
            "format": "source-update",
            "instructions": "KEMAS-KINI-WINDOWS.md",
            "excluded": [".env", ".git", ".next", "node_modules", "database rows", "private manuscript uploads"],
            "files": manifest,
        }, ensure_ascii=False, indent=2))

    with ZipFile(OUTPUT, "r") as archive:
        corrupt = archive.testzip()
        names = set(archive.namelist())
    if corrupt:
        raise SystemExit(f"ZIP integrity check failed at: {corrupt}")
    for path in required:
        if path.relative_to(ROOT).as_posix() not in names:
            raise SystemExit(f"ZIP is missing required asset: {path.relative_to(ROOT)}")
    if any(part.startswith(".env") or part in EXCLUDED_PARTS for name in names for part in Path(name).parts):
        raise SystemExit("Refusing to include secret, private or generated files")
    print(f"Created {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")
    print(f"Verified {len(manifest)} project files, all 12 covers and all 4 local fonts.")
    print("No .env secrets, Git history, build output, database content or private uploads included.")


if __name__ == "__main__":
    main()
