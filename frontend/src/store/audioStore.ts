import { create } from 'zustand';
import type { AudioSettings } from '../../../shared/types';

interface AudioStore {
  settings: AudioSettings;
  setMasterVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
  toggleMute: () => void;
  setSettings: (settings: AudioSettings) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  settings: {
    masterVolume: 0.7,
    ambientVolume: 0.5,
    effectsVolume: 0.8,
    muted: false,
  },
  setMasterVolume: (volume) =>
    set((state) => ({
      settings: { ...state.settings, masterVolume: volume },
    })),
  setAmbientVolume: (volume) =>
    set((state) => ({
      settings: { ...state.settings, ambientVolume: volume },
    })),
  setEffectsVolume: (volume) =>
    set((state) => ({
      settings: { ...state.settings, effectsVolume: volume },
    })),
  toggleMute: () =>
    set((state) => ({
      settings: { ...state.settings, muted: !state.settings.muted },
    })),
  setSettings: (settings) => set({ settings }),
}));
