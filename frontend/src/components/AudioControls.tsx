import { useState, useEffect, type ChangeEvent } from 'react';
import { useAudioStore } from '../store/audioStore';
import { audioEngine } from '../services/AudioEngine';

function AudioControls() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { settings, setMasterVolume, setAmbientVolume, setEffectsVolume, toggleMute, setSettings } = useAudioStore();

  // Sync audio engine settings with store on mount
  useEffect(() => {
    if (audioEngine.isInitialized()) {
      const engineSettings = audioEngine.getSettings();
      setSettings(engineSettings);
    }
  }, [setSettings]);

  const handleMasterVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setMasterVolume(volume);
    // Update audio engine immediately
    audioEngine.setVolume({ masterVolume: volume });
  };

  const handleAmbientVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setAmbientVolume(volume);
    // Update audio engine immediately
    audioEngine.setVolume({ ambientVolume: volume });
  };

  const handleEffectsVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setEffectsVolume(volume);
    // Update audio engine immediately
    audioEngine.setVolume({ effectsVolume: volume });
  };

  const handleMuteToggle = () => {
    toggleMute();
    // Toggle mute in audio engine
    audioEngine.toggleMute();
  };

  return (
    <div className="audio-controls">
      <div className="basic-controls">
        <button onClick={handleMuteToggle} className={`mute-button ${settings.muted ? 'muted' : ''}`} title={settings.muted ? 'Unmute' : 'Mute'}>
          {settings.muted ? '🔇' : '🔊'}
        </button>

        <div className="volume-control">
          <label htmlFor="master-volume">Volume:</label>
          <input
            id="master-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.masterVolume}
            onChange={handleMasterVolumeChange}
            disabled={settings.muted}
          />
          <span className="volume-value">{Math.round(settings.masterVolume * 100)}%</span>
        </div>

        <button onClick={() => setShowAdvanced(!showAdvanced)} className="advanced-toggle">
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-controls">
          <div className="volume-control">
            <label htmlFor="ambient-volume">Ambient:</label>
            <input
              id="ambient-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.ambientVolume}
              onChange={handleAmbientVolumeChange}
              disabled={settings.muted}
            />
            <span className="volume-value">{Math.round(settings.ambientVolume * 100)}%</span>
          </div>

          <div className="volume-control">
            <label htmlFor="effects-volume">Effects:</label>
            <input
              id="effects-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.effectsVolume}
              onChange={handleEffectsVolumeChange}
              disabled={settings.muted}
            />
            <span className="volume-value">{Math.round(settings.effectsVolume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioControls;
