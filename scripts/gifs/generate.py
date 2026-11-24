"""
Gera os GIFs animados (e as imagens estáticas de fallback) da biblioteca de exercícios.

Uso:
    python3 scripts/gifs/generate.py              # gera todos
    python3 scripts/gifs/generate.py supino-reto  # gera apenas os informados
    python3 scripts/gifs/generate.py --sheet      # gera também uma folha de conferência

Saída: assets/exercises/<pasta>/<slug>.gif e <slug>.png
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))

from exercises import EXERCISES  # noqa: E402
from rig import build_frames  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "exercises"


def to_palette(frames: list[Image.Image]) -> list[Image.Image]:
    # Paleta global (todas as cenas usam as mesmas cores) -> GIF menor e sem "piscar".
    sample = Image.new("RGB", (frames[0].width, frames[0].height * 3))
    for i, idx in enumerate([0, len(frames) // 3, (2 * len(frames)) // 3]):
        sample.paste(frames[idx], (0, frames[0].height * i))
    pal = sample.quantize(colors=48, method=Image.Quantize.MEDIANCUT)
    return [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]


def write_registry() -> None:
    """Gera src/constants/exerciseMedia.ts associando cada slug aos arquivos."""
    lines = ["/* Arquivo gerado por scripts/gifs/generate.py — não edite manualmente. */", "",
             "export type ExerciseMediaAsset = { gif: number; poster: number };", "",
             "export const EXERCISE_MEDIA: Record<string, ExerciseMediaAsset> = {"]
    for folder in sorted(p for p in OUT.iterdir() if p.is_dir()):
        for gif in sorted(folder.glob("*.gif")):
            slug, rel = gif.stem, f"../../assets/exercises/{folder.name}/{gif.stem}"
            lines.append(f"  '{slug}': {{\n    gif: require('{rel}.gif'),\n"
                         f"    poster: require('{rel}.png'),\n  }},")
    lines.append("};\n")
    (ROOT / "src" / "constants" / "exerciseMedia.ts").write_text("\n".join(lines))


def main(argv: list[str]) -> None:
    sheet = "--sheet" in argv
    only = [a for a in argv if not a.startswith("--")]
    selected = [e for e in EXERCISES if not only or e.slug in only]
    posters = []
    for ex in selected:
        frames = build_frames(ex)
        folder = OUT / ex.folder
        folder.mkdir(parents=True, exist_ok=True)
        pal_frames = to_palette(frames)
        gif = folder / f"{ex.slug}.gif"
        pal_frames[0].save(gif, save_all=True, append_images=pal_frames[1:], loop=0,
                           duration=ex.frame_ms, optimize=True, disposal=1)
        poster_idx = ex.hold_frames + ex.frames_per_move  # segundo keyframe
        poster = frames[min(poster_idx, len(frames) - 1)]
        poster.save(folder / f"{ex.slug}.png", optimize=True)
        posters.append((ex.slug, frames[0], poster))
        print(f"{ex.slug:28s} {len(frames):3d} frames  {gif.stat().st_size / 1024:6.1f} KB")
    write_registry()
    if sheet:
        w = 180
        img = Image.new("RGB", (w * 2 * 4, w * ((len(posters) + 3) // 4)), (0, 0, 0))
        for i, (_, a, b) in enumerate(posters):
            x, y = (i % 4) * w * 2, (i // 4) * w
            img.paste(a.resize((w, w)), (x, y))
            img.paste(b.resize((w, w)), (x + w, y))
        path = ROOT / "scripts" / "gifs" / "contact-sheet.png"
        img.save(path)
        print("folha:", path)


if __name__ == "__main__":
    main(sys.argv[1:])
