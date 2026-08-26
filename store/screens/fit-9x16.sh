#!/usr/bin/env bash
#
# Telefon ekran görüntüsünü Play'in istediği 1080x1920'ye (tam 9:16) getirir.
#
# NEDEN GEREKLİ: Play, "en uzun kenar en kısa kenarın iki katından fazla
# olamaz" diyor. Telefonun ürettiği 1080x2400 görüntü 2,22:1 — yüklerken
# REDDEDİLİYOR. Ayrıca öne çıkarılma (tanıtım) için en az 3 kare tam 9:16
# ve en az 1080 piksel olmalı. 1080x1920 iki şartı birden karşılıyor.
#
# Kullanım:
#   ./fit-9x16.sh raw/gece.png out/03-gece.png [ÜST_KIRP] [ALT_KIRP]
#
# ÜST_KIRP  saat/pil çubuğunu kesmek için (Samsung'da ~85 px)
# ALT_KIRP  ||| O < gezinme çubuğunu kesmek için (~140 px)
#
# Kalan yükseklik 16:9'dan uzunsa görüntü küçültülüp yanlardan oyunun
# arka plan rengiyle doldurulur — böylece hiçbir içerik kırpılmaz.
set -euo pipefail

IN=${1:?girdi dosyası}
OUT=${2:?çıktı dosyası}
TOP=${3:-0}
BOT=${4:-0}

# Alfa kanalı olmayan 24-bit PNG şart (Play alfa kabul etmiyor).
ffmpeg -loglevel error -y -i "$IN" -vf "\
crop=iw:ih-${TOP}-${BOT}:0:${TOP},\
scale=1080:1920:force_original_aspect_ratio=decrease,\
pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#0a0713,\
format=rgb24" "$OUT"

printf '%s  →  %s  (%s)\n' "$IN" "$OUT" \
  "$(ffprobe -loglevel error -select_streams v:0 -show_entries stream=width,height \
     -of csv=p=0:s=x "$OUT")"
