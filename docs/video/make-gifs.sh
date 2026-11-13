#!/usr/bin/env bash
# Turns the master clips from record.mjs into the README GIFs and stills in docs/media/.
# Crops are in px of the recorded 1280x800 editor window (1280x720 for the hero).
set -euo pipefail
cd "$(dirname "$0")"
MEDIA=../media
mkdir -p "$MEDIA"

# gif <clip> <name> <x> <y> <w> <h> <output width> <fps> [start] [length]
gif()
{
    local clip=$1 name=$2 x=$3 y=$4 w=$5 h=$6 width=$7 fps=$8 start=${9:-0} length=${10:-999}
    local filters="crop=$w:$h:$x:$y,fps=$fps,scale=$width:-1:flags=lanczos"
    ffmpeg -loglevel error -y -ss "$start" -t "$length" -i "out/$clip.mp4" \
        -vf "$filters,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
        "$MEDIA/$name.gif"
    echo "$name.gif $(du -h "$MEDIA/$name.gif" | cut -f1)"
}

# The hero clip is 1280x720: crop to the clock and the flip to the full hour.
gif hero  clock      240 180 800 360 800 20 2.6 4.5
gif add   add-block  240 160 710 630 710 15
gif group group      410 300 440 340 440 15
gif inspector inspector 240 0 1040 800 1040 15
gif grid  grid-undo  240 0 1040 800 1040 15

# Stills, cropped to the interesting part and squeezed.
ffmpeg -loglevel error -y -i out/time.png -vf "crop=1280:550:0:0" "$MEDIA/time-page.png"
