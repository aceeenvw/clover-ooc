#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# CLOVER OOC — outfit PNG → WebP converter
# Reads outfits/*.png, writes assets/outfits/*.webp
# cwebp -q 82, resized so max(width,height) = 1200
# aceenvw
# ═══════════════════════════════════════════════
set -euo pipefail

SRC_DIR="outfits"
DST_DIR="assets/outfits"
QUALITY=82
MAX_DIM=1200

if ! command -v cwebp >/dev/null 2>&1; then
  echo "ERROR: cwebp not found. Install with: brew install webp" >&2
  exit 1
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "ERROR: source dir '$SRC_DIR' missing" >&2
  exit 1
fi

mkdir -p "$DST_DIR"

shopt -s nullglob
files=( "$SRC_DIR"/*.png )
total=${#files[@]}
if [[ $total -eq 0 ]]; then
  echo "No PNGs found in $SRC_DIR" >&2
  exit 1
fi

echo "Converting $total PNG(s) -> webp (q=$QUALITY, max dim=$MAX_DIM)"

i=0
ok=0
skipped=0
failed=0
for src in "${files[@]}"; do
  i=$((i+1))
  base=$(basename "$src" .png)
  dst="$DST_DIR/$base.webp"
  if [[ -f "$dst" ]]; then
    skipped=$((skipped+1))
    printf "[%3d/%3d] skip (exists): %s\n" "$i" "$total" "$base.webp"
    continue
  fi
  # Read width/height; resize only if the larger side exceeds MAX_DIM.
  dims=$(cwebp -quiet -progress "$src" -o /dev/null 2>&1 || true)
  # Simpler: always pass -resize <MAX_DIM> 0; cwebp keeps aspect if one dim=0
  # and won't upscale when source is smaller, BUT it WILL downscale only the
  # width. To avoid forcing a width on already-narrow tall images, use python? no.
  # Safer: cwebp's -resize only handles width/height pairs; one=0 means auto.
  # That CAN upscale narrow images; to prevent that, peek at dimensions first.
  if command -v sips >/dev/null 2>&1; then
    w=$(sips -g pixelWidth  "$src" | awk '/pixelWidth/{print $2}')
    h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
  else
    w=0; h=0
  fi
  resize_args=()
  if [[ "$w" -gt 0 && "$h" -gt 0 ]]; then
    if (( w >= h )); then
      if (( w > MAX_DIM )); then resize_args=(-resize "$MAX_DIM" 0); fi
    else
      if (( h > MAX_DIM )); then resize_args=(-resize 0 "$MAX_DIM"); fi
    fi
  fi
  if cwebp -quiet -q "$QUALITY" "${resize_args[@]}" "$src" -o "$dst"; then
    ok=$((ok+1))
    sz=$(stat -f%z "$dst")
    printf "[%3d/%3d] ok  %s.webp  %sKB\n" "$i" "$total" "$base" "$((sz/1024))"
  else
    failed=$((failed+1))
    printf "[%3d/%3d] FAIL %s\n" "$i" "$total" "$base" >&2
  fi
done

echo
echo "Done: $ok ok, $skipped skipped, $failed failed (of $total)"
total_sz=$(du -sh "$DST_DIR" | awk '{print $1}')
echo "Total size of $DST_DIR: $total_sz"
