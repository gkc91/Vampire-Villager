"""
Bite Club tanıtım videosu — yalnız ffmpeg, ücretsiz.

Dikey 1080x1920, ~25 sn, sosyal medya (Reels / Shorts / TikTok) için.
Malzemenin hepsi depoda: mağaza kareleri, rol çizimleri, arka planlar,
oyunun kendi müziği ve efektleri. Dışarıdan hiçbir şey indirilmiyor.

Kullanım:
    python store/promo/make_promo.py          # İngilizce
    python store/promo/make_promo.py tr       # Türkçe

Çıktı: store/promo/out/biteclub-promo-<dil>.mp4
Ara dosyalar: store/promo/build/<dil>/ (git'e girmez)

AKIŞ
  1. Açılış     — gece arka planı, simge "pop", BITE CLUB + slogan, kurt ulu­ması
  2. Roller     — beş rol kartı, hızlı kesmeler, adlarıyla
  3. 6 sahne    — gerçek oyun ekranı + üstte tek cümle
  4. Kapanış    — simge, "Ücretsiz", adres
Geçişler 0,3 sn çapraz kararma. Müzik oyunun gece teması; gündüz
sahnesine çan sesi düşüyor.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

DIL = (sys.argv[1] if len(sys.argv) > 1 else 'en').lower()
KOK = Path(__file__).resolve().parents[2]
PROMO = KOK / 'store' / 'promo'
B = PROMO / 'build' / DIL
OUT = PROMO / 'out'
ASSETS = KOK / 'public' / 'assets'
SHOTS = KOK / 'store' / 'screens' / ('ios/en' if DIL == 'en' else 'out')

W, H, FPS = 1080, 1920, 30
GECIS = 0.3  # xfade süresi

# Oyunun renkleri (tailwind teması)
AY = '0xF4ECDC'      # moon — ana metin
KAN = '0xE0485A'     # blood — vurgu
GOLGE = '0x070413'   # en koyu gece

METIN = {
    'en': {
        'slogan': 'One of you drinks blood.',
        'sahneler': [
            ('02-lobby-room-code', 'Share one code.\nUp to 24 friends.', 'night'),
            ('01-role-card-seer', 'Everyone gets\na secret role.', 'night'),
            ('04-night', 'Night falls.\nThe vampires hunt.', 'night'),
            ('06-notes-day', 'Read identities.\nKeep your notes.', 'night'),
            ('05-discussion', 'Day breaks.\nAccuse. Bluff. Vote.', 'day'),
            ('07-game-over', 'Will the village\nsurvive?', 'day'),
        ],
        'roller': [('vampire', 'VAMPIRE', True), ('seer', 'SEER', False),
                   ('vampireLord', 'VAMPIRE LORD', True), ('doctor', 'DOCTOR', False),
                   ('hunter', 'HUNTER', False)],
        'kapanis1': 'Free to play',
        'kapanis2': 'No moderator. No cards.\nJust your phones.',
    },
    'tr': {
        'slogan': 'Aranızda kan içen biri var.',
        'sahneler': [
            ('02-lobi-oda-kodu', 'Tek bir kod paylaş.\n24 kişiye kadar.', 'night'),
            ('01-rol-karti-kahin', 'Herkese gizli\nbir rol.', 'night'),
            ('04-gece', 'Gece çöker.\nVampirler avlanır.', 'night'),
            ('06-notlar-gunduz', 'Kimlikleri oku.\nNotlarını tut.', 'night'),
            ('05-tartisma', 'Gün doğar.\nSuçla. Blöf yap. Oyla.', 'day'),
            ('07-oyun-sonu', 'Köy hayatta\nkalacak mı?', 'day'),
        ],
        'roller': [('vampire', 'VAMPİR', True), ('seer', 'KÂHİN', False),
                   ('vampireLord', 'VAMPİR LORDU', True), ('doctor', 'DOKTOR', False),
                   ('hunter', 'AVCI', False)],
        'kapanis1': 'Ücretsiz',
        'kapanis2': 'Anlatıcı yok. Kart yok.\nSadece telefonlarınız.',
    },
}[DIL]

ADRES = 'biteclub.lampwickgames.com'


def ff(*args: str) -> None:
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *args], check=True, cwd=B)


def yazi(ad: str, metin: str) -> str:
    """drawtext'e textfile ile veriyoruz: tırnak/iki nokta kaçışı derdi yok."""
    # newline='' ŞART: Windows'ta satır sonu CRLF yazılıyor, drawtext CR'yi
    # ayrı satır sayıp iki satırın arasına boşluk koyuyordu.
    (B / f'{ad}.txt').write_text(metin, encoding='utf-8', newline='')
    return f'{ad}.txt'


def drawtext(dosya: str, boyut: int, y: str, renk: str = AY, gir: float = 0.0, golge: bool = True) -> str:
    alfa = f"if(lt(t,{gir}),0,min(1,(t-{gir})/0.35))"
    g = f":shadowcolor={GOLGE}@0.85:shadowx=0:shadowy=6" if golge else ''
    return (f"drawtext=fontfile=font.ttf:textfile={dosya}:fontsize={boyut}:fontcolor={renk}"
            f":x=(w-text_w)/2:y={y}:text_align=C:line_spacing={int(boyut * 0.22)}"
            f":alpha='{alfa}'{g}")


def arka(ad: str, sure: float, karart: float = -0.22, bulanik: float = 12) -> str:
    """Arka plan: yavaş yakınlaşma (Ken Burns), karartma, bulanıklık."""
    return (f"scale=w='{W}*(1+0.07*t/{sure})':h=-2:eval=frame,"
            f"crop={W}:{H},eq=brightness={karart}:saturation=0.9,gblur=sigma={bulanik},setsar=1")


def kart_hazirla(png: Path, ad: str, gen: int = 680, r: int = 38) -> None:
    """Ekran görüntüsünü yuvarlak köşeli karta ve gölgesine çevirir (bir kez)."""
    a = (f"if(gt(abs(X-W/2),W/2-{r})*gt(abs(Y-H/2),H/2-{r}),"
         f"if(lte(hypot(abs(X-W/2)-(W/2-{r}),abs(Y-H/2)-(H/2-{r})),{r}),255,0),255)")
    ff('-i', str(png), '-vf',
       f"scale={gen}:-1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='{a}'",
       f'{ad}-kart.png')
    ff('-i', f'{ad}-kart.png', '-vf',
       "pad=iw+160:ih+160:80:80:color=black@0,"
       "colorchannelmixer=rr=0:gg=0:bb=0:aa=0.75,boxblur=28:3",
       f'{ad}-golge.png')


def sahne(i: int, ad: str, metin: str, bg: str, sure: float = 2.7) -> str:
    kart_hazirla(SHOTS / f'{ad}.png', ad)
    cikti = f's{i}.mp4'
    y_kart = "360+70*pow(max(0,1-t/0.55),2)"
    ff('-loop', '1', '-t', str(sure), '-i', str(ASSETS / 'bg' / f'{bg}.webp'),
       '-loop', '1', '-t', str(sure), '-i', f'{ad}-golge.png',
       '-loop', '1', '-t', str(sure), '-i', f'{ad}-kart.png',
       '-filter_complex',
       f"[0]{arka(ad, sure)}[bg];"
       f"[bg][1]overlay=x=(W-w)/2:y='{y_kart}-80+26':eval=frame[a];"
       f"[a][2]overlay=x=(W-w)/2:y='{y_kart}':eval=frame,"
       f"{drawtext(yazi(f'c{i}', metin), 66, '96', gir=0.15)},format=yuv420p[v]",
       '-map', '[v]', '-r', str(FPS), '-t', str(sure), cikti)
    return cikti


def acilis(sure: float = 2.8) -> str:
    ikon = "scale=w='440*min(1,0.62+0.38*t/0.45)':h=-1:eval=frame"
    ff('-loop', '1', '-t', str(sure), '-i', str(ASSETS / 'bg' / 'night.webp'),
       '-loop', '1', '-t', str(sure), '-i', 'ikon.png',
       '-filter_complex',
       f"[0]{arka('acilis', sure, karart=-0.12, bulanik=4)}[bg];"
       f"[1]format=rgba,{ikon}[ik];"
       f"[bg][ik]overlay=x=(W-w)/2:y=700-h/2:eval=frame,"
       f"{drawtext(yazi('baslik', 'BITE CLUB'), 140, '1000', gir=0.35)},"
       f"{drawtext(yazi('slogan', METIN['slogan']), 58, '1190', renk=KAN, gir=0.85)},"
       f"fade=t=in:st=0:d=0.35,format=yuv420p[v]",
       '-map', '[v]', '-r', str(FPS), '-t', str(sure), 'acilis.mp4')
    return 'acilis.mp4'


def roller(her: float = 0.62) -> str:
    parcalar = []
    for i, (rol, ad, vampir) in enumerate(METIN['roller']):
        p = f'r{i}.mp4'
        ff('-loop', '1', '-t', str(her), '-i', str(ASSETS / 'bg' / 'night.webp'),
           '-loop', '1', '-t', str(her), '-i', str(ASSETS / 'roles' / f'{rol}.webp'),
           '-filter_complex',
           f"[0]{arka(rol, her, karart=-0.32, bulanik=18)}[bg];"
           f"[1]scale=w='780*(1.0+0.05*t/{her})':h=-1:eval=frame,format=rgba[r];"
           f"[bg][r]overlay=x=(W-w)/2:y=330:eval=frame,"
           f"{drawtext(yazi(f'rol{i}', ad), 96, '1560', renk=KAN if vampir else AY)},"
           f"format=yuv420p[v]",
           '-map', '[v]', '-r', str(FPS), '-t', str(her), p)
        parcalar.append(p)
    (B / 'roller.txt').write_text(''.join(f"file '{p}'\n" for p in parcalar), encoding='utf-8')
    ff('-f', 'concat', '-safe', '0', '-i', 'roller.txt', '-c', 'copy', 'roller.mp4')
    return 'roller.mp4'


def kapanis(sure: float = 3.6) -> str:
    ff('-loop', '1', '-t', str(sure), '-i', str(ASSETS / 'bg' / 'night.webp'),
       '-loop', '1', '-t', str(sure), '-i', 'ikon.png',
       '-filter_complex',
       f"[0]{arka('kapanis', sure, karart=-0.3, bulanik=10)}[bg];"
       f"[1]format=rgba,scale=360:-1[ik];"
       f"[bg][ik]overlay=x=(W-w)/2:y=420,"
       f"{drawtext(yazi('k0', 'BITE CLUB'), 120, '840')},"
       f"{drawtext(yazi('k1', METIN['kapanis1']), 84, '1030', renk=KAN, gir=0.25)},"
       f"{drawtext(yazi('k2', METIN['kapanis2']), 56, '1170', gir=0.6)},"
       f"{drawtext(yazi('k3', ADRES), 48, '1500', gir=1.0)},"
       f"fade=t=out:st={sure - 0.6}:d=0.6,format=yuv420p[v]",
       '-map', '[v]', '-r', str(FPS), '-t', str(sure), 'kapanis.mp4')
    return 'kapanis.mp4'


def sure_al(p: str) -> float:
    r = subprocess.run(['ffprobe', '-loglevel', 'error', '-show_entries', 'format=duration',
                        '-of', 'csv=p=0', p], cwd=B, capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def birlestir(parcalar: list[str], gun_index: int) -> None:
    sureler = [sure_al(p) for p in parcalar]
    girdi: list[str] = []
    for p in parcalar:
        girdi += ['-i', p]
    zincir, onceki, ofset = [], '[0:v]', 0.0
    baslangic = [0.0]
    for i in range(1, len(parcalar)):
        ofset += sureler[i - 1] - GECIS
        baslangic.append(ofset)
        cik = f'[x{i}]'
        zincir.append(f"{onceki}[{i}:v]xfade=transition=fade:duration={GECIS}:offset={ofset:.3f}{cik}")
        onceki = cik
    toplam = ofset + sureler[-1]

    muzik = ASSETS / 'audio' / 'music' / 'night.mp3'
    kurt = ASSETS / 'audio' / 'sfx' / 'wolf_howl.mp3'
    can = ASSETS / 'audio' / 'sfx' / 'bell.mp3'
    n = len(parcalar)
    can_ms = int(baslangic[gun_index] * 1000)
    ses = (f"[{n}:a]atrim=0:{toplam:.3f},afade=t=in:d=0.6,afade=t=out:st={toplam - 1.6:.3f}:d=1.6,volume=0.85[m];"
           f"[{n + 1}:a]adelay=150|150,volume=0.55[k];"
           f"[{n + 2}:a]atrim=0:2.5,afade=t=out:st=1.8:d=0.7,adelay={can_ms}|{can_ms},volume=0.5[c];"
           f"[m][k][c]amix=inputs=3:duration=first:normalize=0[a]")
    cikti = OUT / f'biteclub-promo-{DIL}.mp4'
    ff(*girdi, '-i', str(muzik), '-i', str(kurt), '-i', str(can),
       '-filter_complex', ';'.join(zincir) + ';' + ses,
       '-map', onceki, '-map', '[a]',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
       '-t', f'{toplam:.3f}', str(cikti))
    print(f'{cikti.relative_to(KOK)}  {toplam:.1f} sn')


def main() -> None:
    if B.exists():
        shutil.rmtree(B)
    B.mkdir(parents=True)
    OUT.mkdir(exist_ok=True)
    # Başlıklar oyunun kendi yazı tipiyle: tailwind `font-display` = Trebuchet MS.
    shutil.copy(Path('C:/Windows/Fonts/trebucbd.ttf'), B / 'font.ttf')

    # Simge telefondaki gibi yuvarlak köşeli (iOS köşe oranı ~%22).
    rk = 226
    a = (f"if(gt(abs(X-W/2),W/2-{rk})*gt(abs(Y-H/2),H/2-{rk}),"
         f"if(lte(hypot(abs(X-W/2)-(W/2-{rk}),abs(Y-H/2)-(H/2-{rk})),{rk}),255,0),255)")
    ff('-i', str(ASSETS / 'icon' / 'app-icon.png'), '-vf',
       f"format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='{a}'", 'ikon.png')

    parcalar = [acilis(), roller()]
    gun_index = None
    for i, (ad, metin, bg) in enumerate(METIN['sahneler']):
        if bg == 'day' and gun_index is None:
            gun_index = len(parcalar)
        parcalar.append(sahne(i, ad, metin, bg))
    parcalar.append(kapanis())
    birlestir(parcalar, gun_index or 2)


if __name__ == '__main__':
    main()
