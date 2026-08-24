import { create } from 'zustand';

/** Cihaz-yerel tercihler (odaya gitmez). */
export interface DeviceSettings {
  music: boolean;
  sfx: boolean;
  tts: boolean;
}

const STORAGE_KEY = 'vk_device_settings';

function load(): DeviceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { music: true, sfx: true, tts: false, ...JSON.parse(raw) };
  } catch {
    // bozuk kayıt → varsayılana dön
  }
  return { music: true, sfx: true, tts: false };
}

interface SettingsStore extends DeviceSettings {
  set: (patch: Partial<DeviceSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch);
    const { music, sfx, tts } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ music, sfx, tts }));
  },
}));
