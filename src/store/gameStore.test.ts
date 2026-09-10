import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Ödüllü reklamın "bir oyunluk" hakkı gerçekten bir oyunluk mu?
 *
 * Gerçek cihazda çıktı (10 Eylül 2026): kullanıcı reklamı izledi, roller
 * açıldı, oyun oynandı, oyun bitip lobiye dönüldü — roller AÇIK kaldı.
 * Sebep `clearOneGamePremium()` fonksiyonunun tanımlı olup HİÇBİR YERDEN
 * çağrılmamasıydı.
 *
 * Motor testleri bu hatayı yakalayamaz, çünkü motor satın alma bilmez ve
 * kendi açısından doğru çalışıyordu. Yakalanabileceği tek yer bağlantının
 * kurulduğu yer: gameStore. Bu dosya orayı tutuyor.
 *
 * `environment: 'node'` olduğu için tarayıcıya dokunan her şey taklit
 * ediliyor (localStorage, ağ). Motor ve hak hesabı GERÇEK çalışıyor —
 * asıl ölçmek istediğimiz onlar.
 */

/** Ödüllü reklamın açtığı bir oyunluk hak. Testler bunu doğrudan okur. */
let birOyunluk = false;

vi.mock('../util/platform', () => ({ isNativeApp: () => true }));
vi.mock('../monetization/billing', () => ({
  hasPremium: () => false,
  buyPremium: async () => false,
}));
vi.mock('../monetization/adGate', () => ({
  hasOneGamePremium: () => birOyunluk,
  clearOneGamePremium: () => {
    birOyunluk = false;
  },
  watchRewardedForPremium: async () => {
    birOyunluk = true;
    return true;
  },
  initAds: async () => undefined,
  showPreResultAd: async () => undefined,
}));
vi.mock('../util/identity', () => ({
  colorForToken: () => '#fff',
  createRoomCode: () => 'TEST01',
  getPlayerToken: () => 'host-token',
  resetPlayerToken: () => 'host-token',
  saveName: () => undefined,
}));
vi.mock('../net', () => ({
  createAdapter: () => ({
    kind: 'sahte',
    createRoom: async () => undefined,
    joinRoom: async () => undefined,
    sendToHost: () => undefined,
    sendToPlayer: () => undefined,
    broadcast: () => undefined,
    onMessage: () => undefined,
    onPeerJoin: () => undefined,
    onPeerLeave: () => undefined,
    isPeerConnected: () => false,
    onStateChange: () => undefined,
    onDiagnostics: () => undefined,
    leave: async () => undefined,
  }),
}));

import { useGameStore } from './gameStore';

const havuz = () => useGameStore.getState().view?.settings.allowedRoles ?? [];

beforeEach(async () => {
  birOyunluk = false;
  await useGameStore.getState().createRoom('Kurucu', true);
});

afterEach(async () => {
  await useGameStore.getState().leave();
});

describe('bir oyunluk premium', () => {
  it('reklam izlenince masanın havuzu genişler', async () => {
    expect(havuz(), 'ücretsiz uygulama').toHaveLength(8);

    const oldu = await useGameStore.getState().unlockByAd();

    expect(oldu).toBe(true);
    expect(havuz(), 'premium roller masaya girdi').toHaveLength(11);
  });

  it('oyun bitip yeniden başlayınca havuz geri daralır', async () => {
    await useGameStore.getState().unlockByAd();
    expect(havuz()).toHaveLength(11);

    useGameStore.getState().restart();

    expect(birOyunluk, 'hak tüketildi').toBe(false);
    expect(havuz(), 'premium roller geri kilitlendi').toHaveLength(8);
  });

  it('yeni masa kurmak da hakkı devretmez', async () => {
    await useGameStore.getState().unlockByAd();
    expect(havuz()).toHaveLength(11);

    await useGameStore.getState().createRoom('Kurucu', true);

    expect(birOyunluk, 'hak tüketildi').toBe(false);
    expect(havuz(), 'yeni masa ücretsiz havuzla açıldı').toHaveLength(8);
  });

  it('havuz daralırken kilitli rol seçili kalmaz', async () => {
    // Kurucu ödülle Büyücü'yü masaya koydu, sonra oyun bitti. Kurulum
    // olduğu gibi kalsaydı START_GAME `lockedRole` ile sessizce
    // reddedecekti: düğmeye basılıyor, hiçbir şey olmuyor.
    await useGameStore.getState().unlockByAd();
    useGameStore
      .getState()
      .updateSettings({ roleSetup: ['vampire', 'seer', 'doctor', 'wizard'] });
    expect(useGameStore.getState().view?.settings.roleSetup).toContain('wizard');

    useGameStore.getState().restart();

    expect(useGameStore.getState().view?.settings.roleSetup, 'kurulum sıfırlandı').toEqual([]);
  });
});

describe('ödülün kapsamı: masa geneli', () => {
  /**
   * Kullanıcı sorusu (10 Eylül 2026): "kurucu sadece reklam izlese yeterli
   * mi, diğerlerinin de izlemesi gerekiyor mu?"
   *
   * Cevap: KURUCU YETER. Masanın rol havuzunu host belirliyor
   * (host-otoriter), katılan oyuncunun platformu ya da hakkı masayı
   * etkilemiyor — webden katılan biri de premium rolle oynuyor.
   *
   * Bu testler o vaadi tutuyor. Kanıt START_GAME'in kabul etmesi:
   * `validateRoleSetup` havuzda olmayan bir rol görürse `lockedRole` ile
   * reddediyor, yani oyun başlıyorsa premium roller gerçekten masada.
   */
  const masayiDoldur = () => {
    const s = useGameStore.getState();
    s.addBot('Bot 1');
    s.addBot('Bot 2');
    s.addBot('Bot 3');
  };

  it('reklamdan ÖNCE premium rolle oyun başlamaz', () => {
    masayiDoldur();
    useGameStore
      .getState()
      .updateSettings({ roleSetup: ['vampire', 'seer', 'wizard', 'bloodWizard'] });
    useGameStore.getState().startGame();

    expect(useGameStore.getState().view?.phase, 'kilitli rol reddedildi').toBe('LOBBY');
  });

  it('kurucu reklamı izleyince masa premium rollerle başlıyor', async () => {
    await useGameStore.getState().unlockByAd();
    masayiDoldur();
    useGameStore
      .getState()
      .updateSettings({ roleSetup: ['vampire', 'seer', 'wizard', 'bloodWizard'] });
    useGameStore.getState().startGame();

    expect(useGameStore.getState().view?.phase, 'oyun başladı').not.toBe('LOBBY');
  });
});
