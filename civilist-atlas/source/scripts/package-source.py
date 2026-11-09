#!/usr/bin/env python3
"""Package the frozen Civilist source and record exact release file hashes.

Run only after the final build and QA. Both expected hashes are mandatory so a
later source edit or rebuild cannot silently enter an already accepted release.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parent.parent
RELEASE = ROOT / "release"
SOURCE_NAME = "CIVILIST_atlas_source.zip"
OFFLINE_NAME = "CIVILIST_atlas_offline.html"
PREFIX = "civilist-atlas-source"
TOP_FILES = (
    "index.html",
    "package.json",
    "pnpm-lock.yaml",
    "vite.config.js",
    "README.md",
    "INSTRUCTOR_GUIDE.md",
    "LEGAL_NOTES.md",
    "PROGRESS.md",
)
SOURCE_DIRS = ("src", "public", "scripts")
DENIED_PART = re.compile(
    r"(^\.env(?:\.|$)|private|secret|teacher[_-]?key|answer[_-]?key|"
    r"instructor[_-]?key|закрыт.{0,12}ключ|ключ.{0,12}преподават)",
    re.IGNORECASE,
)
ZIP_TIME = (1980, 1, 1, 0, 0, 0)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def entry(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": digest(data)}


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def add(zf: ZipFile, name: str, data: bytes) -> None:
    info = ZipInfo(name, ZIP_TIME)
    info.compress_type = ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    info.create_system = 3
    zf.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=9)


def source_files() -> list[Path]:
    files = [ROOT / name for name in TOP_FILES]
    for directory in SOURCE_DIRS:
        base = ROOT / directory
        if not base.is_dir():
            raise SystemExit(f"Required source directory missing: {base}")
        files.extend(
            path for path in base.rglob("*")
            if (path.is_file() or path.is_symlink())
            and "__pycache__" not in path.parts
            and path.suffix not in {".pyc", ".pyo"}
        )
    for path in files:
        rel = path.relative_to(ROOT)
        if not path.is_file() or path.is_symlink():
            raise SystemExit(f"Unsafe or missing source file: {rel}")
        if any(DENIED_PART.search(part) for part in rel.parts):
            raise SystemExit(f"Private-looking path refused: {rel}")
    return sorted(files, key=lambda path: path.relative_to(ROOT).as_posix())


def tree_digest(files: list[Path]) -> str:
    h = hashlib.sha256()
    for path in files:
        rel = path.relative_to(ROOT).as_posix().encode("utf-8")
        h.update(rel + b"\0" + hashlib.sha256(path.read_bytes()).digest() + b"\0")
    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hash-source", action="store_true", help="Print source tree hash without packaging")
    parser.add_argument("--source-tree-sha256", help="Accepted complete source tree SHA-256")
    parser.add_argument("--scene-sha256", help="Accepted src/scene.js SHA-256")
    parser.add_argument("--offline-sha256", help="Accepted offline HTML SHA-256")
    args = parser.parse_args()
    files = source_files()
    current_tree = tree_digest(files)
    if args.hash_source:
        print(current_tree)
        return
    if not all((args.source_tree_sha256, args.scene_sha256, args.offline_sha256)):
        parser.error("--source-tree-sha256, --scene-sha256 and --offline-sha256 are required")
    if current_tree != args.source_tree_sha256.lower():
        raise SystemExit("Source tree changed after freeze; do not package")
    scene = ROOT / "src/scene.js"
    offline = RELEASE / OFFLINE_NAME
    dist = ROOT / "dist"
    if not scene.is_file() or not offline.is_file() or not (dist / "index.html").is_file():
        raise SystemExit("Frozen source, offline HTML, or dist/index.html is missing")
    if entry(scene)["sha256"] != args.scene_sha256.lower():
        raise SystemExit("Scene hash changed after freeze; do not package")
    if entry(offline)["sha256"] != args.offline_sha256.lower():
        raise SystemExit("Offline HTML hash changed after freeze; do not package")

    file_manifest = {
        path.relative_to(ROOT).as_posix(): entry(path) for path in files
    }
    RELEASE.mkdir(exist_ok=True)
    source_zip = RELEASE / SOURCE_NAME
    with ZipFile(source_zip, "w") as zf:
        for path in files:
            rel = path.relative_to(ROOT).as_posix()
            add(zf, f"{PREFIX}/{rel}", path.read_bytes())
        add(zf, f"{PREFIX}/SOURCE_FILES.json", json_bytes(file_manifest))

    dist_files = sorted(
        (path for path in dist.rglob("*") if path.is_file()),
        key=lambda path: path.relative_to(dist).as_posix(),
    )
    if any(path.is_symlink() for path in dist_files):
        raise SystemExit("Symlink in dist; release manifest refused")
    release_manifest = {
        "format": 1,
        "product": "ЦИВИЛИСТ. Правовая лаборатория",
        "public_path": "civilist-atlas/",
        "source_tree_sha256": current_tree,
        "source_zip": {"name": SOURCE_NAME, **entry(source_zip)},
        "offline_html": {"name": OFFLINE_NAME, **entry(offline)},
        "site_files": {
            path.relative_to(dist).as_posix(): entry(path) for path in dist_files
        },
    }
    (RELEASE / "RELEASE_MANIFEST.json").write_bytes(json_bytes(release_manifest))
    print(json.dumps({
        "source_zip": release_manifest["source_zip"],
        "offline_html": release_manifest["offline_html"],
        "site_file_count": len(dist_files),
        "manifest": "release/RELEASE_MANIFEST.json",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
