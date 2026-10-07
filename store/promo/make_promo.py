"""
Bite Club tanıtım videosu — yalnız ffmpeg, ücretsiz.

Dikey 1080x1920 (Reels / Shorts / TikTok). Sinematik akış: tam ekran rol
çizimleri ve sahne arka planları, araya gerçek oyun ekranları; film greni,
kenar kararması, ölümde kırmızı parlama. Her sahnenin bir anlatım cümlesi
var: ekranda altyazı olarak hep görünür (videoların çoğu sessiz izleniyor),
seslendirme dosyası varsa da okunur.

İlk sürüm yalnız oyun ekranlarından oluşuyordu ve sahneler 2,7 sn'de
geçiyordu; izlerken hem hızlı hem "estetik değil" bulundu. Bu sürüm
çizimlerle ekranları dönüşümlü kullanıyor, sahneler en az 3 sn.

Kullanım:
    python store/promo/make_promo.py          # İngilizce
    python store/promo/make_promo.py tr       # Türkçe

SESLENDİRME (ElevenLabs)
    Her çalıştırmada store/promo/voice/<dil>/SATIRLAR.txt yazılır: hangi
    dosyaya hangi cümle. ElevenLabs'te her satırı ayrı üretip aynı klasöre
    01.mp3, 02.mp3 ... diye koy, betiği tekrar çalıştır. Ses varsa sahne
    süresi cümlenin süresine göre uzar, müzik konuşma altında kısılır.
    Ses yoksa video altyazıyla aynen çıkar.

Çıktı: store/promo/out/biteclub-promo-<dil>.mp4
Ara dosyalar: store/promo/build/<dil>/ (git'e girmez)
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

DIL = (sys.argv[1] if len(sys.argv) > 1 else 'en').lower()
KOK = Path(__file__).resolve().parents[2]
PROMO = KOK / 'store' / 'promo'
B = PROMO / 'build' / DIL
OUT = PROMO / 'out'
SES = PROMO / 'voice' / DIL
A = KOK / 'public' / 'assets'
SHOTS = KOK / 'store' / 'screens' / ('ios/en' if DIL == 'en' else 'out')

W, H, FPS = 1080, 1920, 30
GECIS = 0.6

AY = '0xF4ECDC'      # moon — ana metin
KAN = '0xE0485A'     # blood — vurgu
GOLGE = '0x070413'   # en koyu gece


@dataclass
class Sahne:
    tur: str              # 'arka' | 'cizim' | 'ekran' | 'baslik' | 'kapanis'
    gorsel: str = ''      # arka: bg/<ad>, cizim: roles/<ad>, ekran: kare adı
    soz: str = ''         # anlatım = altyazı
    gecis: str = 'fade'   # bu sahneye GİRİŞ geçişi (xfade türü)
    efekt: str = ''       # sahne başında ses efekti (public/assets/audio/sfx/<ad>.mp3)
    kizil: bool = False   # vampir tonu
    kan_flas: bool = False
    gunduz: bool = False  # ekran sahnesinde gündüz arka planı
    en_az: float = 3.0


def senaryo() -> list[Sahne]:
    if DIL == 'tr':
        s = {
            'sir': 'Her köyün bir sırrı vardır.', 'kan': 'Aranızdan biri kan içiyor.',
            'bu': 'Burası Bite Club.', 'topla': 'Arkadaşlarını topla.\nTek bir kod yeter.',
            'rol': 'Herkese gizli bir rol düşer…', 'kimse': '…ve seninkini kimse bilmez.',
            'gece': 'Gece çökünce\nvampirler avlanır.', 'kahin': 'Kâhin her gece\nbir kimlik okur.',
            'sabah': 'Sabah olduğunda\nbiri yok olur.', 'konus': 'Konuş. Suçla. Blöf yap.',
            'sag': 'Köy hayatta kalacak mı?',
            'son': 'Ücretsiz. Anlatıcı yok, kart yok.\nSadece telefonlarınız.',
        }
        k = {'lobi': '02-lobi-oda-kodu', 'kart': '01-rol-karti-kahin', 'not': '06-notlar-gunduz',
             'gun': '05-tartisma', 'son': '07-oyun-sonu'}
    else:
        s = {
            'sir': 'Every village has a secret.', 'kan': 'One of you drinks blood.',
            'bu': 'This is Bite Club.', 'topla': 'Gather your friends.\nShare one code.',
            'rol': 'Everyone gets a secret role…', 'kimse': '…and no one knows yours.',
            'gece': 'When night falls,\nthe vampires hunt.', 'kahin': 'The seer reads\none identity a night.',
            'sabah': 'By morning,\nsomeone is gone.', 'konus': 'So talk. Accuse. Bluff.',
            'sag': 'Will the village survive?',
            'son': 'Free to play. No moderator, no cards.\nJust your phones.',
        }
        k = {'lobi': '02-lobby-room-code', 'kart': '01-role-card-seer', 'not': '06-notes-day',
             'gun': '05-discussion', 'son': '07-game-over'}
    return [
        Sahne('arka', 'bg/night', s['sir'], gecis='fadeblack', efekt='wolf_howl', en_az=3.6),
        Sahne('cizim', 'roles/vampire', s['kan'], kizil=True, efekt='heartbeat', en_az=3.4),
        Sahne('baslik', soz=s['bu'], gecis='fadeblack', en_az=3.0),
        Sahne('ekran', k['lobi'], s['topla'], en_az=3.8),
        Sahne('cizim', 'roles/seer', s['rol'], en_az=3.0),
        Sahne('ekran', k['kart'], s['kimse'], en_az=3.4),
        Sahne('cizim', 'roles/vampireLord', s['gece'], gecis='fadeblack', kizil=True, en_az=3.4),
        Sahne('ekran', k['not'], s['kahin'], en_az=3.8),
        Sahne('arka', 'bg/death', s['sabah'], kan_flas=True, efekt='death', en_az=3.4),
        Sahne('ekran', k['gun'], s['konus'], efekt='bell', gunduz=True, en_az=3.8),
        Sahne('ekran', k['son'], s['sag'], gunduz=True, en_az=3.6),
        Sahne('kapanis', soz=s['son'], gecis='fadeblack', en_az=4.6),
    ]


def ff(*args: str) -> None:
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *args], check=True, cwd=B)


def sure_al(p: Path | str) -> float:
    r = subprocess.run(['ffprobe', '-loglevel', 'error', '-show_entries', 'format=duration',
                        '-of', 'csv=p=0', str(p)], cwd=B, capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def yazi(ad: str, metin: str) -> str:
    # newline='' ŞART: Windows'ta satır sonu CRLF yazılıyor, drawtext CR'yi
    # ayrı satır sayıp iki satırın arasına boşluk koyuyordu.
    (B / f'{ad}.txt').write_text(metin, encoding='utf-8', newline='')
    return f'{ad}.txt'


def dt(dosya: str, font: str, boyut: int, y: str, renk: str = AY, gir: float = 0.0) -> str:
    alfa = f"if(lt(t,{gir}),0,min(1,(t-{gir})/0.5))"
    return (f"drawtext=fontfile={font}:textfile={dosya}:fontsize={boyut}:fontcolor={renk}"
            f":x=(w-text_w)/2:y={y}:text_align=C:line_spacing={int(boyut * 0.25)}"
            f":shadowcolor={GOLGE}@0.9:shadowx=0:shadowy=5:alpha='{alfa}'")


# Her sahnenin sonunda: kenar kararması + film greni. Gren zamanla değişiyor
# (allf=t), donuk bir doku gibi durmasın.
SON_DOKUNUS = "vignette=angle=PI/4.2,noise=alls=9:allf=t,format=yuv420p"


def ken_burns(sure: float, bas: float, bit: float) -> str:
    return f"scale=w='{W}*({bas}+{bit - bas}*t/{sure})':h=-2:eval=frame,crop={W}:{H}"


KIZIL = "colorbalance=rs=0.18:gs=-0.06:bs=-0.04:rm=0.10,eq=saturation=1.1"


def render(i: int, s: Sahne, sure: float) -> str:
    cikti = f's{i:02d}.mp4'
    soz = yazi(f'soz{i}', s.soz) if s.soz else ''
    girdi: list[str] = []

    def ekle(p: Path | str) -> int:
        girdi.extend(['-loop', '1', '-t', f'{sure:.3f}', '-i', str(p)])
        return len(girdi) // 6 - 1

    f: list[str] = []
    if s.tur == 'arka':
        a = ekle(A / f'{s.gorsel}.webp')
        f.append(f"[{a}]{ken_burns(sure, 1.0, 1.12)},eq=brightness=-0.08,setsar=1"
                 + (',' + KIZIL if s.kizil else '') + '[v0]')
        alt = dt(soz, 'serif.ttf', 74, '1380', gir=0.35)
    elif s.tur == 'cizim':
        # Çizimler 512x768: tam ekrana gerince bulanıklaşıyor. Onun yerine
        # kendi bulanık kopyası arka plan, çizim ortada büyük, yavaş yakınlaşan.
        a = ekle(A / f'{s.gorsel}.webp')
        b = ekle(A / f'{s.gorsel}.webp')
        f.append(f"[{a}]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                 f"gblur=sigma=30,eq=brightness=-0.30,setsar=1[bg]")
        # Keskinleştirme ölçeklemeden ÖNCE: boyutu her karede değişen akışta
        # unsharp ffmpeg'i çökertiyordu (0xC0000005).
        f.append(f"[{b}]unsharp=5:5:0.8,scale=w='980*(1+0.07*t/{sure})':h=-2:eval=frame,format=rgba[c]")
        f.append("[bg][c]overlay=x=(W-w)/2:y=170-(h-1470)/2:eval=frame"
                 + (',' + KIZIL if s.kizil else '') + '[v0]')
        alt = dt(soz, 'serif.ttf', 70, '1600', gir=0.35)
    elif s.tur == 'ekran':
        a = ekle(A / 'bg' / ('day.webp' if s.gunduz else 'night.webp'))
        g = ekle(f'{s.gorsel}-golge.png')
        k = ekle(f'{s.gorsel}-kart.png')
        y = "380+80*pow(max(0,1-t/0.7),2)"
        f.append(f"[{a}]{ken_burns(sure, 1.0, 1.06)},eq=brightness=-0.30:saturation=0.85,"
                 f"gblur=sigma=10,vignette=angle=PI/4.2,setsar=1[bg]")
        f.append(f"[bg][{g}]overlay=x=(W-w)/2:y='{y}-80+30':eval=frame[x]")
        f.append(f"[x][{k}]overlay=x=(W-w)/2:y='{y}':eval=frame[v0]")
        alt = dt(soz, 'serif.ttf', 64, '110', gir=0.25)
    elif s.tur == 'baslik':
        a = ekle(A / 'bg' / 'night.webp')
        ik = ekle('ikon.png')
        f.append(f"[{a}]{ken_burns(sure, 1.04, 1.12)},eq=brightness=-0.22,gblur=sigma=6,setsar=1[bg]")
        f.append(f"[{ik}]scale=w='460*min(1,0.6+0.4*t/0.5)':h=-1:eval=frame[ik]")
        f.append(f"[bg][ik]overlay=x=(W-w)/2:y=720-h/2:eval=frame,"
                 f"{dt(yazi('marka', 'BITE CLUB'), 'brand.ttf', 150, '1030', gir=0.4)}[v0]")
        alt = dt(soz, 'serif.ttf', 60, '1240', renk=KAN, gir=0.9)
    else:  # kapanis
        a = ekle(A / 'bg' / 'night.webp')
        ik = ekle('ikon.png')
        f.append(f"[{a}]{ken_burns(sure, 1.0, 1.08)},eq=brightness=-0.32,gblur=sigma=8,setsar=1[bg]")
        f.append(f"[{ik}]scale=380:-1[ik]")
        f.append(f"[bg][ik]overlay=x=(W-w)/2:y=400,"
                 f"{dt(yazi('kmarka', 'BITE CLUB'), 'brand.ttf', 128, '840')},"
                 f"{dt(yazi('adres', 'biteclub.lampwickgames.com'), 'brand.ttf', 50, '1560', gir=1.2)}[v0]")
        alt = dt(soz, 'serif.ttf', 58, '1080', gir=0.5)

    son = '[v0]'
    if s.kan_flas:
        n = len(girdi) // 6
        girdi.extend(['-f', 'lavfi', '-t', f'{sure:.3f}', '-i', f'color=c=0xB0102A:s={W}x{H}:r={FPS}'])
        f.append(f"[{n}]format=rgba,fade=t=out:st=0.05:d=0.7:alpha=1[kf]")
        f.append(f"{son}[kf]overlay[v1]")
        son = '[v1]'

    # Ekran sahnelerinde kenar kararması yalnız arka planda (yukarıda): bütün
    # kareye uygulanınca telefonun köşelerini de karartıyordu.
    dokunus = "noise=alls=7:allf=t,format=yuv420p" if s.tur == 'ekran' else SON_DOKUNUS
    zincir = ';'.join(f) + f";{son}{(alt + ',') if soz else ''}{dokunus}[v]"
    ff(*girdi, '-filter_complex', zincir, '-map', '[v]', '-r', str(FPS),
       '-t', f'{sure:.3f}', cikti)
    return cikti


def yuvarla(girdi: str, cikti: str, gen: str, r: int) -> None:
    a = (f"if(gt(abs(X-W/2),W/2-{r})*gt(abs(Y-H/2),H/2-{r}),"
         f"if(lte(hypot(abs(X-W/2)-(W/2-{r}),abs(Y-H/2)-(H/2-{r})),{r}),255,0),255)")
    ff('-i', girdi, '-vf',
       f"{gen}format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='{a}'", cikti)


def kart_hazirla(ad: str) -> None:
    yuvarla(str(SHOTS / f'{ad}.png'), f'{ad}-kart.png', 'scale=660:-1,', 40)
    ff('-i', f'{ad}-kart.png', '-vf',
       "pad=iw+160:ih+160:80:80:color=black@0,"
       "colorchannelmixer=rr=0:gg=0:bb=0:aa=0.8,boxblur=30:3",
       f'{ad}-golge.png')


def main() -> None:
    if B.exists():
        shutil.rmtree(B)
    B.mkdir(parents=True)
    OUT.mkdir(exist_ok=True)
    SES.mkdir(parents=True, exist_ok=True)
    fonts = Path('C:/Windows/Fonts')
    shutil.copy(fonts / 'trebucbd.ttf', B / 'brand.ttf')   # oyunun font-display'i
    shutil.copy(fonts / 'georgiai.ttf', B / 'serif.ttf')   # anlatım: sinematik serif
    yuvarla(str(A / 'icon' / 'app-icon.png'), 'ikon.png', '', 226)  # iOS köşe oranı ~%22

    sahneler = senaryo()

    # Seslendirme listesi — her çalıştırmada senaryodan yeniden yazılır, kayma olmaz.
    satirlar = [f"{i + 1:02d}.mp3  {s.soz.replace(chr(10), ' ')}"
                for i, s in enumerate(sahneler) if s.soz]
    (SES / 'SATIRLAR.txt').write_text('\n'.join(satirlar) + '\n', encoding='utf-8', newline='')

    sesler: dict[int, Path] = {}
    sureler: list[float] = []
    for i, s in enumerate(sahneler):
        v = SES / f'{i + 1:02d}.mp3'
        if v.exists():
            sesler[i] = v
            # Ses geçişin yarısında başlıyor; arkasında nefes payı kalıyor.
            sureler.append(max(s.en_az, sure_al(v) + GECIS + 0.7))
        else:
            sureler.append(s.en_az)

    parcalar = []
    for i, s in enumerate(sahneler):
        if s.tur == 'ekran':
            kart_hazirla(s.gorsel)
        parcalar.append(render(i, s, sureler[i]))

    # Görüntü: sahneleri geçişlerle zincirle.
    girdi: list[str] = []
    for p in parcalar:
        girdi += ['-i', p]
    zincir, onceki, ofset, bas = [], '[0:v]', 0.0, [0.0]
    for i in range(1, len(parcalar)):
        ofset += sureler[i - 1] - GECIS
        bas.append(ofset)
        zincir.append(f"{onceki}[{i}:v]xfade=transition={sahneler[i].gecis}:"
                      f"duration={GECIS}:offset={ofset:.3f}[x{i}]")
        onceki = f'[x{i}]'
    toplam = ofset + sureler[-1]

    # Ses: müzik yatağı + efektler + (varsa) anlatım; anlatım müziği kısar.
    n = len(parcalar)
    ses_girdi = ['-i', str(A / 'audio' / 'music' / 'night.mp3')]
    katman = [f"[{n}:a]atrim=0:{toplam:.3f},afade=t=in:d=1.0,"
              f"afade=t=out:st={toplam - 2.0:.3f}:d=2.0,volume=0.75[muzik]"]
    efektler, anlatim = [], []
    k = n + 1
    for i, s in enumerate(sahneler):
        if s.efekt:
            ms = int((bas[i] + (0.1 if i else 0.3)) * 1000)
            ses_girdi += ['-i', str(A / 'audio' / 'sfx' / f'{s.efekt}.mp3')]
            katman.append(f"[{k}:a]atrim=0:3.0,afade=t=out:st=2.2:d=0.8,"
                          f"adelay={ms}|{ms},volume=0.5[e{i}]")
            efektler.append(f'[e{i}]')
            k += 1
        if i in sesler:
            ms = int((bas[i] + GECIS * 0.5) * 1000)
            ses_girdi += ['-i', str(sesler[i])]
            katman.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,"
                          f"adelay={ms}|{ms}[a{i}]")
            anlatim.append(f'[a{i}]')
            k += 1

    if anlatim:
        katman.append(f"{''.join(anlatim)}amix=inputs={len(anlatim)}:duration=longest:normalize=0,"
                      f"apad=whole_dur={toplam:.3f},asplit=2[anl][yan]")
        katman.append("[muzik][yan]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=500[mk]")
        govde = ['[mk]', '[anl]']
    else:
        govde = ['[muzik]']
    hepsi = govde + efektler
    katman.append(f"{''.join(hepsi)}amix=inputs={len(hepsi)}:duration=first:normalize=0,"
                  f"alimiter=limit=0.95[a]")

    cikti = OUT / f'biteclub-promo-{DIL}.mp4'
    ff(*girdi, *ses_girdi, '-filter_complex', ';'.join(zincir + katman),
       '-map', onceki, '-map', '[a]',
       # Film greni sıkıştırmayı zorluyor: sınırsız crf 19'da 36 sn = 70 MB.
       # Sosyal platformlar zaten yeniden kodluyor; 6 Mbit/sn tavanı yeterli.
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '6M', '-bufsize', '12M',
       '-tune', 'grain', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
       '-t', f'{toplam:.3f}', str(cikti))
    print(f'{cikti.relative_to(KOK)}  {toplam:.1f} sn  |  seslendirme: {len(sesler)}/{len(satirlar)} satır')


if __name__ == '__main__':
    main()
