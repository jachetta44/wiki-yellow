#!/usr/bin/env python3
"""
Build a silhouette swing clip from a YouTube URL.

Usage:
  python scripts/build-swings.py \
      --golfer "Scottie Scheffler" \
      --url    "https://youtube.com/watch?v=..." \
      --start  12.5 \
      --duration 2.5

What it does:
  1. Downloads the source clip with yt-dlp (best quality video only).
  2. Trims to [--start, --start + --duration].
  3. Runs every frame through rembg (U^2-Net) to get an alpha mask.
  4. Composites the mask onto a flat background (#f6f3e8 matches the app).
  5. Encodes the result as a seamless WebM (VP9) loop under
     public/swings/<slug>.webm.
  6. Prints the one-line manifest entry to paste into
     src/data/swingSilhouettes.ts.

Deps:
  pip install yt-dlp rembg[cpu] opencv-python pillow numpy
  ffmpeg must be on PATH.

Tips:
  - Pick a clip with a stable camera and clean background. Noisy swing-
    analysis overlays (draw-lines, arrows) will end up inside the
    silhouette if they're drawn over the golfer.
  - Start/duration refer to the *source* clip, in seconds. Decimals OK.
  - If rembg struggles on a given frame (poor contrast), try a slightly
    different start time or a different source clip.
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


BACKGROUND = (246, 243, 232)  # #f6f3e8 — matches the app's cream body.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "public" / "swings"


def slugify(name: str) -> str:
    # "Scottie Scheffler" → "scottie-scheffler"
    # "Cameron Smith (golfer)" → "cameron-smith"
    name = re.sub(r"\s*\(.*?\)\s*", "", name)
    name = name.lower()
    name = re.sub(r"[^a-z0-9]+", "-", name).strip("-")
    return name


def require(binary: str) -> None:
    if shutil.which(binary) is None:
        sys.exit(f"error: required binary '{binary}' not on PATH")


def download_source(url: str, tmp: Path) -> Path:
    require("yt-dlp")
    out = tmp / "source.mp4"
    subprocess.check_call(
        [
            "yt-dlp",
            "-f",
            "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "-o",
            str(out),
            url,
        ]
    )
    return out


def extract_frames(source: Path, start: float, duration: float, tmp: Path) -> Path:
    require("ffmpeg")
    frames_dir = tmp / "frames"
    frames_dir.mkdir()
    subprocess.check_call(
        [
            "ffmpeg",
            "-ss",
            str(start),
            "-i",
            str(source),
            "-t",
            str(duration),
            "-vf",
            "fps=30,scale=-2:480",  # 30fps, 480p tall.
            "-start_number",
            "0",
            str(frames_dir / "%04d.png"),
        ]
    )
    return frames_dir


def silhouette_frames(frames_dir: Path, tmp: Path) -> Path:
    """Convert every frame to a black silhouette on BACKGROUND using rembg."""
    try:
        from rembg import remove  # type: ignore
        from PIL import Image
        import numpy as np
    except ImportError:
        sys.exit(
            "error: install deps with `pip install rembg[cpu] pillow numpy opencv-python`"
        )

    out_dir = tmp / "silhouette"
    out_dir.mkdir()

    for path in sorted(frames_dir.glob("*.png")):
        src = Image.open(path).convert("RGBA")
        cut = remove(src)  # returns RGBA with bg stripped
        alpha = np.array(cut.split()[-1])
        h, w = alpha.shape
        out = np.zeros((h, w, 3), dtype=np.uint8)
        out[:, :, 0] = BACKGROUND[0]
        out[:, :, 1] = BACKGROUND[1]
        out[:, :, 2] = BACKGROUND[2]
        mask = alpha > 20
        out[mask] = (20, 20, 24)  # near-black silhouette
        Image.fromarray(out).save(out_dir / path.name)

    return out_dir


def encode_webm(frames_dir: Path, dest: Path) -> None:
    require("ffmpeg")
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            "30",
            "-i",
            str(frames_dir / "%04d.png"),
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuv420p",
            "-b:v",
            "0",
            "-crf",
            "36",
            "-row-mt",
            "1",
            "-an",
            str(dest),
        ]
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Build a silhouette swing clip.")
    p.add_argument("--golfer", required=True, help="Wikipedia title, e.g. 'Scottie Scheffler'")
    p.add_argument("--url", required=True, help="Source video URL")
    p.add_argument("--start", type=float, required=True, help="Start time in seconds")
    p.add_argument("--duration", type=float, default=2.5, help="Clip duration in seconds")
    args = p.parse_args()

    slug = slugify(args.golfer)
    dest = OUTPUT_DIR / f"{slug}.webm"
    print(f"→ building {dest.relative_to(PROJECT_ROOT)} for '{args.golfer}'")

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        source = download_source(args.url, tmp)
        frames = extract_frames(source, args.start, args.duration, tmp)
        sil = silhouette_frames(frames, tmp)
        encode_webm(sil, dest)

    size_kb = dest.stat().st_size // 1024
    print(f"✓ wrote {dest} ({size_kb} KB)")
    print("")
    print("Paste this into src/data/swingSilhouettes.ts:")
    print(f'  "{args.golfer}": "/swings/{slug}.webm",')


if __name__ == "__main__":
    main()
