#!/usr/bin/env bash
# Renders the showreel (reel/, Remotion) to out/fliq-showreel.mp4. Needs the dev server for
# missing clips (npm run dev in the repo root).
# Usage: ./render-reel.sh            everything missing, then render
#        ./render-reel.sh --record   record the reel clips again first
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out

# Music: "The Glide Path", made by David with Google Gemini (see README.md). It is not in the
# repository; put the file at out/the-glide-path.mp3.
if [[ ! -f out/the-glide-path.mp3 ]]
then
    echo "Missing out/the-glide-path.mp3 (the soundtrack, see README.md)." >&2
    exit 1
fi

if [[ ${1:-} == --record || ! -f out/reel-clock.mp4 ]]
then
    node record.mjs reel-clock reel-looks reel-add reel-group reel-style reel-grid reel-data reel-stills
fi

# Four workers at low priority, so the desktop stays usable while it renders.
nice -n 19 npx remotion render Showreel out/fliq-showreel-raw.mp4 --codec h264 --crf 17 --audio-codec aac --audio-bitrate 192k --concurrency=4 --timeout=120000

# Loudness to -16 LUFS (two passes), the picture untouched.
measured=$(ffmpeg -hide_banner -i out/fliq-showreel-raw.mp4 -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
value() { echo "$measured" | sed -n "s/.*\"$1\" : \"\([^\"]*\)\".*/\1/p"; }
ffmpeg -loglevel error -y -i out/fliq-showreel-raw.mp4 -c:v copy \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(value input_i):measured_TP=$(value input_tp):measured_LRA=$(value input_lra):measured_thresh=$(value input_thresh):offset=$(value target_offset):linear=true,aresample=48000" \
    -c:a aac -b:a 192k -movflags +faststart out/fliq-showreel.mp4
echo "-> out/fliq-showreel.mp4"
