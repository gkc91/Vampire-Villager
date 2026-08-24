import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { NarrationEvent } from '../game/types';
import { useSettingsStore } from '../store/settingsStore';
import { speak, stopSpeaking } from '../audio/tts';

/** Anlatım olayını cihazın diline çevirir (rol adı da yerelleşir). */
export function useNarrationText(): (event: NarrationEvent) => string {
  const { t } = useTranslation();
  return useCallback(
    (event: NarrationEvent) =>
      t(`narration:${event.key}`, {
        name: event.params?.name ?? '',
        role: event.params?.roleKey ? t(`roles:${event.params.roleKey}.name`) : '',
      }),
    [t],
  );
}

/** En yeni anlatımı (ayar açıksa) sesli okur. */
export function useNarrationSpeech(log: NarrationEvent[]): void {
  const tts = useSettingsStore((s) => s.tts);
  const { i18n } = useTranslation();
  const toText = useNarrationText();
  const spokenCount = useRef(log.length);

  useEffect(() => {
    if (!tts) {
      stopSpeaking();
      spokenCount.current = log.length;
      return;
    }
    if (log.length <= spokenCount.current) {
      spokenCount.current = log.length;
      return;
    }
    for (const event of log.slice(spokenCount.current)) {
      speak(toText(event), i18n.language);
    }
    spokenCount.current = log.length;
  }, [log, tts, i18n.language, toText]);

  useEffect(() => stopSpeaking, []);
}
