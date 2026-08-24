/**
 * Derin link: `https://.../#/join/ODA123` ve `vampirkoylu://join/ODA123`.
 * Web'de hash yeterli; native kabukta Capacitor App eklentisi olayı hash'e
 * çevirir. Capacitor yoksa (saf web) sessizce atlanır.
 */
export async function listenForDeepLinks(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', ({ url }) => {
      const code = url.match(/join\/([A-Za-z0-9]{6})/)?.[1];
      if (code) window.location.hash = `#/join/${code.toUpperCase()}`;
    });
  } catch {
    // Capacitor çalışma zamanı yok → web modunda hash zaten çalışıyor.
  }
}
