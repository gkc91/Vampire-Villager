import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Her dil, İngilizceyle AYNI anahtarları taşımak zorunda.
 *
 * i18next eksik anahtarda sessizce yedek dile düşmez — ad alanı eksikse
 * anahtarın kendisini ekrana basar ("lobby.setupMismatch" gibi). On dil
 * elle tutulurken bunun gözden kaçması an meselesi; bu yüzden denetim
 * testte.
 *
 * İkinci kontrol daha ince: `{{name}}` gibi yer tutucular. Çevirmen
 * (insan ya da makine) bunu düşürürse metin düzgün görünür ama oyuncunun
 * adı hiç yazılmaz — "… bir daha uyanmayacak" cümlesi kimin öldüğünü
 * söylemez. Derleme bunu yakalamaz, kullanıcı yakalar.
 */

const KOK = join(process.cwd(), 'src/i18n/locales');
const AD_ALANLARI = ['ui', 'roles', 'narration'] as const;
const KAYNAK = 'en';

const diller = readdirSync(KOK).filter((d) => d !== KAYNAK);

function oku(lang: string, ad: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(KOK, lang, `${ad}.json`), 'utf8')) as Record<string, unknown>;
}

/** İç içe nesneyi "a.b.c" düz anahtarlarına açar. */
function duzle(o: Record<string, unknown>, onek = ''): Record<string, string> {
  const cikti: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    const yol = onek ? `${onek}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(cikti, duzle(v as Record<string, unknown>, yol));
    } else {
      cikti[yol] = String(v);
    }
  }
  return cikti;
}

const yerTutucular = (s: string): string[] =>
  [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();

describe('çeviri dosyaları', () => {
  it('on dil de yerinde', () => {
    expect(readdirSync(KOK).sort()).toEqual(
      ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'tr'].sort(),
    );
  });

  for (const ad of AD_ALANLARI) {
    const kaynak = duzle(oku(KAYNAK, ad));

    for (const lang of diller) {
      describe(`${lang}/${ad}.json`, () => {
        const hedef = duzle(oku(lang, ad));

        it('eksik anahtar yok', () => {
          const eksik = Object.keys(kaynak).filter((k) => !(k in hedef));
          expect(eksik, `eksik: ${eksik.join(', ')}`).toEqual([]);
        });

        it('fazladan anahtar yok', () => {
          const fazla = Object.keys(hedef).filter((k) => !(k in kaynak));
          expect(fazla, `fazla: ${fazla.join(', ')}`).toEqual([]);
        });

        it('yer tutucular korunmuş', () => {
          const bozuk = Object.keys(kaynak)
            .filter((k) => k in hedef)
            .filter((k) => yerTutucular(kaynak[k]).join() !== yerTutucular(hedef[k]).join());
          expect(bozuk, `yer tutucusu tutmayan: ${bozuk.join(', ')}`).toEqual([]);
        });

        it('boş çeviri yok', () => {
          const bos = Object.keys(hedef).filter((k) => hedef[k].trim() === '');
          expect(bos, `boş: ${bos.join(', ')}`).toEqual([]);
        });
      });
    }
  }
});
