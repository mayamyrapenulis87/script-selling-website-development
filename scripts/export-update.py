"""Build a source update ZIP with public images/fonts but no secrets or Git state.

Run from the project root: python scripts/export-update.py
The archive retains paths such as src/app/page.tsx and public/images/tun-teja.jpg.
"""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / "public" / "downloads" / "naskah-maya-update.zip"
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


def build():
    required = [ROOT / "public" / "images" / name for name in REQUIRED_COVERS]
    required += [ROOT / "public" / "fonts" / name for name in REQUIRED_FONTS]
    missing = [path.relative_to(ROOT).as_posix() for path in required if not path.is_file() or path.stat().st_size == 0]
    if missing:
        raise RuntimeError("Required assets are missing: " + ", ".join(missing))

    files = [ROOT / name for name in ROOT_FILES if (ROOT / name).is_file()]
    files += [path for path in (ROOT / "src").rglob("*") if path.is_file() and not path.is_symlink() and path.suffix in SOURCE_EXTENSIONS]
    for folder in (ROOT / "public" / "images", ROOT / "public" / "fonts"):
        files += [path for path in folder.rglob("*") if path.is_file() and not path.is_symlink() and path.suffix.lower() in ASSET_EXTENSIONS]
    favicon = ROOT / "public" / "favicon.svg"
    if favicon.is_file():
        files.append(favicon)
    files += [path for path in (ROOT / "scripts").glob("*") if path.is_file() and not path.is_symlink() and path.suffix in {".mjs", ".py"}]
    files = sorted(set(files), key=lambda path: path.relative_to(ROOT).as_posix())
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)

    manifest = []
    with ZipFile(DESTINATION, "w", ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in files:
            relative = path.relative_to(ROOT).as_posix()
            if any(part in {".git", ".next", "node_modules", ".vercel", ".artifacts"} or part.startswith(".env") for part in path.relative_to(ROOT).parts):
                raise RuntimeError("Refusing to package a sensitive or generated path")
            content = path.read_bytes()
            bundle.writestr(relative, content)
            manifest.append({"path": relative, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
        bundle.writestr("UPDATE-MANIFEST.json", json.dumps({
            "format": "source-update",
            "instructions": "KEMAS-KINI-WINDOWS.md",
            "excluded": [".env", ".git", ".next", "node_modules", "database contents", "private uploaded manuscripts"],
            "files": manifest,
        }, ensure_ascii=False, indent=2))

    with ZipFile(DESTINATION) as bundle:
        if bundle.testzip() is not None:
            raise RuntimeError("Archive verification failed")
        names = set(bundle.namelist())
        for path in required:
            if path.relative_to(ROOT).as_posix() not in names:
                raise RuntimeError("Required asset not included")
    print(f"Created {DESTINATION.relative_to(ROOT)}")
    print(f"Verified {len(files)} files, 12 required covers and 4 local fonts.")
    print("No environment secrets, Git history, database or private upload data included.")


if __name__ == "__main__":
    build()
