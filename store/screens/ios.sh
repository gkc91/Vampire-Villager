#!/usr/bin/env bash
#
# Play için hazırlanmış kareleri App Store ölçülerine çevirir.
#
# APPLE'IN ŞARTI PLAY'DEN KATI: Play "oran 2:1'i geçmesin" diyor ve
# aradaki her boyutu kabul ediyor; Apple SAYILI ölçüler istiyor, bir
# piksel şaşarsa yüklemiyor.
#
# İKİ BOYUT ÜRETİLİYOR:
#
#   medium 1206x2622 — ZORUNLU olan. App Store Connect'te "iPhone with
#     Dynamic Island (medium display)" yuvası, 6,1"/6,3" ekranlar.
#     Önce 1290x2796 üretmiştim; o yuva kabul etmedi, çünkü 1290x2796
#     "large display" ölçüsü ve o yuva İSTEĞE BAĞLI.
#
#   large 1290x2796 — isteğe bağlı 6,7"/6,9" yuvası. Zorunlu değil ama
#     büyük telefonlarda ölçeklenmiş yerine net kare görünsün diye.
#
# 1080x2122'lik kaynak önce hedef genişliğe ölçekleniyor, kalan yükseklik
# üste ve alta şerit olarak ekleniyor.
#
# ŞERİT RENGİ UYDURMA DEĞİL: oyunun arka planı dikey bir gradyan, tepesi
# #070413, dibi #110B1F. Şeritler o iki renkten alınıyor, böylece ek
# yerleri görünmüyor. Tek renkle doldurmak bir uçta çizgi bırakıyordu.
#
# KIRPMA YERİNE ŞERİT: doldurup kırpmak her yandan ~50 orijinal piksel
# götürüyordu; sağ üstteki ayarlar ve alttaki düğmeler oraya denk geliyor.
#
# Kullanım: ./ios.sh          (out/*.png → ios/medium/*.png, ios/large/*.png)
set -euo pipefail

cd "$(dirname "$0")"

UST=#070413
ALT=#110B1F

# ad genişlik yükseklik üst-şerit
HEDEFLER="
medium 1206 2622 126
large  1290 2796 130
"

echo "$HEDEFLER" | while read -r ad W H UST_PAD; do
  [ -z "${ad:-}" ] && continue
  mkdir -p "ios/$ad"

  for girdi in out/*.png; do
    cikti="ios/$ad/$(basename "$girdi")"

    ffmpeg -loglevel error -y -i "$girdi" -vf "\
scale=${W}:-1,\
pad=iw:ih+${UST_PAD}:0:${UST_PAD}:${UST},\
pad=iw:${H}:0:0:${ALT},\
format=rgb24" "$cikti"

    # ffprobe Windows'ta satır sonuna CR ekliyor. Rakam dışı her şey
    # atılıyor; yoksa 2622 ile "2622 + CR" karşılaştırması sessizce
    # tutmuyor ve ölçü doğruyken bile SORUN basıyordu.
    olcu=$(ffprobe -loglevel error -select_streams v:0 \
      -show_entries stream=width,height -of csv=p=0 "$cikti")
    GW=$(echo "$olcu" | cut -d, -f1 | tr -cd '0-9')
    GH=$(echo "$olcu" | cut -d, -f2 | tr -cd '0-9')

    if [ "$GW" -ne "$W" ] || [ "$GH" -ne "$H" ]; then
      echo "SORUN $cikti -> ${GW}x${GH}, olmasi gereken ${W}x${H}"
      exit 1
    fi
  done
  echo "$ad: 7 kare ${W}x${H} TAMAM"
done
