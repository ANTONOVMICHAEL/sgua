"""Split the self-contained atlas into lazily loaded static assets for the site."""
from __future__ import annotations

import base64
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OFFLINE = ROOT / "downloads/CIVILIST_V7_working.html"
OUT = ROOT
ASSETS = OUT / "assets"


def write_asset(name: str, encoded: str) -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / name).write_bytes(base64.b64decode(encoded, validate=True))


def main() -> None:
    html = OFFLINE.read_text()
    opening = '<script type="module" crossorigin>'
    start = html.index(opening) + len(opening)
    end = html.index("</script>", start)
    style_start = html.index("<style", end)
    style_open_end = html.index(">", style_start) + 1
    style_end = html.index("</style>", style_open_end)
    script = html[start:end]
    css = html[style_open_end:style_end]
    counts: dict[str, int] = {}
    manifest: dict[str, str] = {}

    def replace_media(match: re.Match[str]) -> str:
        kind, encoded = match.groups()
        ext = {"image/webp": "webp", "image/jpeg": "jpg", "model/gltf-binary": "glb"}[kind]
        counts[ext] = counts.get(ext, 0) + 1
        name = f"scene-{counts[ext]:02d}.{ext}"
        write_asset(name, encoded)
        manifest[name] = hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()
        return f"assets/{name}"

    script = re.sub(
        r"data:(image/webp|image/jpeg|model/gltf-binary);base64,([A-Za-z0-9+/=]+)",
        replace_media,
        script,
    )

    def replace_font(match: re.Match[str]) -> str:
        encoded = match.group(1)
        counts["woff2"] = counts.get("woff2", 0) + 1
        name = f"font-{counts['woff2']:02d}.woff2"
        write_asset(name, encoded)
        manifest[name] = hashlib.sha256((ASSETS / name).read_bytes()).hexdigest()
        return f"./{name}"

    css = re.sub(r"data:font/woff2;base64,([A-Za-z0-9+/=]+)", replace_font, css)
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "app.js").write_text(script)
    (ASSETS / "style.css").write_text(css)
    page = html[: html.index(opening)]
    page += '<script type="module" src="./assets/app.js"></script>\n'
    page += '<link rel="stylesheet" href="./assets/style.css">\n'
    page += html[style_end + len("</style>") :]
    (OUT / "index.html").write_text(page)
    (OUT / "release.json").write_text(
        json.dumps({"offline_sha256": hashlib.sha256(OFFLINE.read_bytes()).hexdigest(),
                    "assets": manifest}, ensure_ascii=False, indent=2) + "\n"
    )
    print(f"{len(manifest)} binary assets; HTML {len(page)} chars; JS {len(script)} chars")


if __name__ == "__main__":
    main()
