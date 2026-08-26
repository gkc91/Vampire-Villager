import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isNativeApp } from '../../util/platform';

/**
 * Android donanım geri tuşu.
 *
 * Varsayılan davranış uygulamadan çıkmaktır; oyunun ortasında bu felaket
 * olur, üstelik kurucu çıkarsa bütün oda dağılır. Tarayıcıda hiçbir şey
 * yapmaz — orada geri tuşu tarayıcının kendisine aittir.
 */
export function useBackButton(handler: () => void): void {
  useEffect(() => {
    if (!isNativeApp()) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    void CapacitorApp.addListener('backButton', handler).then((listener) => {
      // Bileşen, dinleyici kaydolmadan söküldüyse hemen kaldır.
      if (cancelled) void listener.remove();
      else remove = () => void listener.remove();
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [handler]);
}

/** Ana ekranda geri tuşu uygulamayı kapatır (Android'de beklenen davranış). */
export function exitApp(): void {
  if (!isNativeApp()) return;
  void CapacitorApp.exitApp();
}
