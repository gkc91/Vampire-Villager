#!/usr/bin/env bash
#
# Play için hazırlanmış kareleri App Store ölçüsüne çevirir.
#
# APPLE'IN ŞARTI PLAY'DEN KATI: Play "oran 2:1'i geçmesin" diyor ve
# aradaki her boyutu kabul ediyor; Apple TEK BİR ölçü istiyor —
# 6,9" iPhone için 1290x2796. Bir piksel şaşarsa yükleme reddediliyor.
#
# 1080x2122 → genişlik 1290'a ölçekleniyor (×1,194), yükseklik 2535
# kalıyor, kalan 261 piksel üste ve alta şerit olarak ekleniyor.
#
# ŞERİT RENGİ UYDURMA DEĞİL: oyunun arka planı dikey bir gradyan,
# tepesi #070413, dibi #110B1F. Şeritler o iki renkten alınıyor, böylece
# ek yerleri görünmüyor. Tek renkle doldurmak üstte ya da altta çizgi
# bırakıyordu.
#
# KIRPMA YERİNE ŞERİT: doldurup kırpmak (2796/2122 ×1,318) her yandan
# 50 orijinal piksel götürüyordu; sağ üstteki ayarlar ve alttaki
# düğmeler oraya denk geliyor.
#
# Kullanım: ./ios.sh            (out/*.png → ios/*.png)
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p ios

GENISLIK=1290
YUKSEKLIK=2796
UST=#070413
ALT=#110B1F

for girdi in out/*.png; do
  ad=$(basename "$girdi")
  cikti="ios/$ad"

  ffmpeg -loglevel error -y -i "$girdi" -vf "\
scale=${GENISLIK}:-1,\
pad=iw:ih+130:0:130:${UST},\
pad=iw:${YUKSEKLIK}:0:0:${ALT},\
format=rgb24" "$cikti"

  # ffprobe Windows'ta satır sonuna CR ekliyor. Rakam dışı her şey
  # atılıyor; yoksa 2796 ile "2796 + CR" karşılaştırması sessizce
  # tutmuyor ve ölçü doğruyken bile SORUN basıyordu.
  olcu=$(ffprobe -loglevel error -select_streams v:0 \
    -show_entries stream=width,height -of csv=p=0 "$cikti")
  W=$(echo "$olcu" | cut -d, -f1 | tr -cd '0-9')
  H=$(echo "$olcu" | cut -d, -f2 | tr -cd '0-9')

  if [ "$W" -ne "$GENISLIK" ] || [ "$H" -ne "$YUKSEKLIK" ]; then
    echo "SORUN $cikti -> ${W}x${H}, olmasi gereken ${GENISLIK}x${YUKSEKLIK}"
    exit 1
  fi
  printf '%-34s %dx%d TAMAM\n' "$cikti" "$W" "$H"
done
