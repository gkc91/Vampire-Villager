#!/usr/bin/env bash
#
# Telefon çekimini Play'e yüklenebilir hâle getirir: sistem çubuklarını
# keser, 24-bit PNG (alfasız) yazar, sonra Play'in iki şartını doğrular.
#
# ŞART 1 (yükleme): en uzun kenar, en kısa kenarın iki katından fazla
#   olamaz. Ham 1080x2340 = 2,17:1 → REDDEDİLİR. Üstten durum çubuğu,
#   alttan gezinme çubuğu kesilince 1080x2123 = 1,97:1 → geçer.
# ŞART 2 (öne çıkarılma): dikey karede en az 1080x1920. 1080x2123 bunu
#   da aşıyor. Bilerek 9:16'ya zorlamıyoruz: zorlamak ya düğmeleri
#   kırpardı ya da yanlara şerit koymayı gerektirirdi — modern
#   telefonların hiçbiri zaten 9:16 değil.
#
# Kullanım: ./hazirla.sh raw/dosya.jpeg out/01-ad.png [ÜST] [ALT]
set -euo pipefail

IN=${1:?girdi}; OUT=${2:?çıktı}; TOP=${3:-90}; BOT=${4:-127}

ffmpeg -loglevel error -y -i "$IN" \
  -vf "crop=iw:ih-${TOP}-${BOT}:0:${TOP},format=rgb24" "$OUT"

read -r W H < <(ffprobe -loglevel error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$OUT" | tr ',' ' ')

# awk ile kontrol: bash tam sayı bölmesi oranı yuvarlar.
awk -v w="$W" -v h="$H" -v f="$OUT" 'BEGIN {
  long = (w>h ? w : h); short = (w>h ? h : w); ratio = long/short;
  ok = (ratio <= 2 && short >= 1080 && long >= 1920) ? "TAMAM" : "SORUN";
  printf "%-28s %dx%d  oran %.3f:1  %s\n", f, w, h, ratio, ok;
  if (ok == "SORUN") exit 1;
}'
