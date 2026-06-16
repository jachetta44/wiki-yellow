# Swing silhouettes

Looped down-the-line swing clips, silhouetted, served as a "clue 2" asset by
the daily puzzle.

## Conventions

- File format: **WebM (VP9)** preferred, with alpha if possible. Fallback:
  animated WebP. GIF only if nothing else works.
- Duration: **2-3 seconds**, seamless loop.
- Resolution: **720p max** (smaller is fine — 480p is usually plenty).
- Size: target **under 300 KB** per clip. Silhouettes compress extremely well.
- Naming: `<kebab-case-wikititle>.webm`, e.g. `scottie-scheffler.webm`.

## Adding a clip

1. Pick a clean down-the-line clip on YouTube (swing-analysis channel, PGA
   Tour short, etc).
2. Run the pipeline:
   ```
   python scripts/build-swings.py \
     --golfer "Scottie Scheffler" \
     --url "https://youtube.com/..." \
     --start 12.5 \
     --duration 2.5
   ```
   The script writes `public/swings/scottie-scheffler.webm`.
3. Register the asset in `src/data/swingSilhouettes.ts`:
   ```ts
   "Scottie Scheffler": "/swings/scottie-scheffler.webm",
   ```

## Why silhouettes

A raw swing clip would give the face and logos away. A silhouette preserves
the distinctive *shape* (Matsuyama's pause at the top, Bubba's gigantic
follow-through) without identifying the golfer at a glance — which is
exactly what you want in clue position 2 of 5.

## Licensing

The pipeline processes third-party video into a stylized derivative. For a
public-facing deployment, prefer clips from creators who explicitly allow
reuse, or commission your own recordings. For local development, fair use
is generally defensible for short silhouetted transforms, but that's not
legal advice.
