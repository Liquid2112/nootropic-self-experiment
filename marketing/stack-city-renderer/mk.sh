#!/bin/bash
# usage: mk.sh ep
e=$1; cd "$(dirname "$0")"; rm -rf fr_$e; node render2.js $e fr_$e 30 >/dev/null 2>&1
ffmpeg -loglevel error -y -framerate 30 -i fr_$e/f%05d.png -i vo/$e.wav -filter_complex "[1:a]apad,loudnorm=I=-14:TP=-1.5[a]" -map 0:v -map "[a]" -shortest -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart out_$e.mp4 && rm -rf fr_$e && echo done $e
