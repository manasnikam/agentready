#!/bin/bash
# Convert raw .webm captures to H.264 MP4 at 1920x1080 30fps, then ffprobe them.
set -u
RAW="/Users/manasnikam/project/prescale-systems/agentready/video/record/raw"
OUT="/Users/manasnikam/project/prescale-systems/agentready/video/public/recordings"
mkdir -p "$OUT"
for name in "$@"; do
  src="$RAW/$name.webm"
  dst="$OUT/$name.mp4"
  if [ ! -f "$src" ]; then echo "MISSING $src"; continue; fi
  ffmpeg -y -loglevel error -i "$src" -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 -an "$dst" || { echo "FFMPEG FAIL $name"; continue; }
  info=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -show_entries format=duration,size -of csv=p=0 "$dst")
  echo "$name: $info"
done
