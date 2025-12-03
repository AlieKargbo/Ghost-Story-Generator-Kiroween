import * as Tone from 'tone';

export interface AudioSettings {
  masterVolume: number;
  ambientVolume: number;
  effectsVolume: number;
  muted: boolean;
}

export interface SoundLayer {
  type: 'ambient' | 'effect';
  source: Tone.Player | Tone.Synth | Tone.Noise;
  gain: Tone.Gain;
  intensity: number;
  id: string;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: Tone.Gain | null = null;
  private ambientGain: Tone.Gain | null = null;
  private effectsGain: Tone.Gain | null = null;
  private initialized: boolean = false;
  private soundLayers: Map<string, SoundLayer> = new Map();
  private settings: AudioSettings = {
    masterVolume: 0.7,
    ambientVolume: 0.5,
    effectsVolume: 0.8,
    muted: false,
  };
  private currentMood: string[] = [];
  private currentLocation: string | null = null;

  /**
   * Initialize the Audio Engine with browser compatibility checks
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check browser compatibility
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        console.warn('Web Audio API not supported in this browser');
        return;
      }

      // Start Tone.js (this creates the AudioContext)
      await Tone.start();
      
      this.audioContext = Tone.getContext().rawContext as AudioContext;

      // Create master gain node
      this.masterGain = new Tone.Gain(this.settings.masterVolume);
      this.masterGain.toDestination();

      // Create separate gain nodes for ambient and effects
      this.ambientGain = new Tone.Gain(this.settings.ambientVolume);
      this.ambientGain.connect(this.masterGain);

      this.effectsGain = new Tone.Gain(this.settings.effectsVolume);
      this.effectsGain.connect(this.masterGain);

      this.initialized = true;

      // Load settings from session storage
      this.loadSettings();

      console.log('Audio Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Audio Engine:', error);
    }
  }

  /**
   * Resume audio context on user interaction (required by browsers)
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await Tone.start();
      console.log('Audio context resumed');
    }
  }

  /**
   * Check if the audio engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from session storage
   */
  private loadSettings(): void {
    try {
      const stored = sessionStorage.getItem('audioSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...this.settings, ...parsed };
        this.applySettings();
      }
    } catch (error) {
      console.error('Failed to load audio settings:', error);
    }
  }

  /**
   * Save settings to session storage
   */
  private saveSettings(): void {
    try {
      sessionStorage.setItem('audioSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  /**
   * Apply current settings to gain nodes
   */
  private applySettings(): void {
    if (!this.initialized) return;

    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    }
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.settings.ambientVolume;
    }
    if (this.effectsGain) {
      this.effectsGain.gain.value = this.settings.effectsVolume;
    }
  }

  /**
   * Get active sound layers
   */
  getActiveLayers(): SoundLayer[] {
    return Array.from(this.soundLayers.values());
  }

  /**
   * Get current mood tags
   */
  getCurrentMood(): string[] {
    return [...this.currentMood];
  }

  /**
   * Set current mood (used internally)
   */
  private setCurrentMood(mood: string[]): void {
    this.currentMood = mood;
  }

  /**
   * Get current location
   */
  getCurrentLocation(): string | null {
    return this.currentLocation;
  }

  /**
   * Analyze text for mood indicators and return mood tags
   */
  analyzeMood(text: string): string[] {
    const lowerText = text.toLowerCase();
    const moodTags: Set<string> = new Set();

    // Mood keyword dictionary
    const moodKeywords = {
      horror: ['terror', 'horror', 'fear', 'dread', 'nightmare', 'evil', 'sinister', 'malevolent'],
      calm: ['peaceful', 'calm', 'quiet', 'serene', 'tranquil', 'gentle', 'soft'],
      tense: ['tense', 'nervous', 'anxious', 'uneasy', 'worried', 'suspicious', 'cautious'],
      dark: ['dark', 'darkness', 'shadow', 'black', 'dim', 'gloomy', 'murky'],
      violent: ['violent', 'blood', 'death', 'kill', 'murder', 'attack', 'strike'],
      mysterious: ['mysterious', 'strange', 'odd', 'peculiar', 'unusual', 'eerie', 'uncanny'],
      urgent: ['run', 'hurry', 'quick', 'fast', 'rush', 'escape', 'flee'],
    };

    // Check for mood keywords
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          moodTags.add(mood);
          break;
        }
      }
    }

    // Update current mood
    const tags = Array.from(moodTags);
    this.setCurrentMood(tags);

    return tags;
  }

  /**
   * Detect sound effect keywords in text
   */
  detectSoundEffects(text: string): string[] {
    const lowerText = text.toLowerCase();
    const effects: string[] = [];

    // Sound effect keywords
    const effectKeywords = {
      scream: ['scream', 'shriek', 'yell', 'cry out'],
      thunder: ['thunder', 'lightning', 'storm'],
      creak: ['creak', 'cracking', 'groan', 'squeak'],
      footsteps: ['footsteps', 'walking', 'steps', 'footfall'],
      door: ['door slam', 'door creak', 'door open', 'door close'],
      wind: ['wind', 'howl', 'gust', 'breeze'],
      heartbeat: ['heartbeat', 'heart pound', 'pulse'],
      whisper: ['whisper', 'murmur', 'hiss'],
      crash: ['crash', 'smash', 'shatter', 'break'],
      bell: ['bell', 'chime', 'toll'],
    };

    // Check for effect keywords
    for (const [effect, keywords] of Object.entries(effectKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          effects.push(effect);
          break;
        }
      }
    }

    return effects;
  }

  /**
   * Detect location keywords in text
   */
  detectLocation(text: string): string | null {
    const lowerText = text.toLowerCase();

    // Location keywords (prioritized by specificity)
    const locationKeywords = {
      forest: ['forest', 'woods', 'trees', 'wilderness'],
      basement: ['basement', 'cellar', 'underground'],
      ocean: ['ocean', 'sea', 'water', 'waves', 'shore', 'beach'],
      mansion: ['mansion', 'manor', 'estate', 'castle'],
      graveyard: ['graveyard', 'cemetery', 'tomb', 'crypt'],
      attic: ['attic', 'loft', 'upper floor'],
      cave: ['cave', 'cavern', 'tunnel'],
      church: ['church', 'chapel', 'cathedral'],
      hospital: ['hospital', 'asylum', 'ward'],
      street: ['street', 'road', 'alley', 'path'],
    };

    // Find first matching location
    for (const [location, keywords] of Object.entries(locationKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          this.currentLocation = location;
          return location;
        }
      }
    }

    return null;
  }

  /**
   * Create ambient sound generators for a specific mood
   */
  private createAmbientLayer(mood: string, intensity: number = 0.5): SoundLayer | null {
    if (!this.initialized || !this.ambientGain) return null;

    try {
      let source: Tone.Synth | Tone.Noise;
      const layerId = `ambient-${mood}-${Date.now()}`;

      // Create different ambient sounds based on mood
      switch (mood) {
        case 'horror':
        case 'dark':
          // Low rumbling drone
          source = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
          });
          source.triggerAttack('C1');
          break;

        case 'tense':
          // High-pitched tension
          source = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 1, decay: 0, sustain: 1, release: 1 },
          });
          source.triggerAttack('C6');
          break;

        case 'calm':
          // Soft white noise
          source = new Tone.Noise('pink');
          source.start();
          break;

        default:
          // Default ambient noise
          source = new Tone.Noise('brown');
          source.start();
      }

      // Create gain node for this layer
      const gain = new Tone.Gain(intensity * 0.3);
      source.connect(gain);
      gain.connect(this.ambientGain);

      const layer: SoundLayer = {
        type: 'ambient',
        source,
        gain,
        intensity,
        id: layerId,
      };

      this.soundLayers.set(layerId, layer);
      return layer;
    } catch (error) {
      console.error('Failed to create ambient layer:', error);
      return null;
    }
  }

  /**
   * Create location-specific soundscape
   */
  private createLocationSoundscape(location: string): void {
    if (!this.initialized || !this.ambientGain) return;

    try {
      const layerId = `location-${location}-${Date.now()}`;
      let source: Tone.Noise | Tone.Synth;

      // Create location-specific ambient sounds
      switch (location) {
        case 'forest':
          source = new Tone.Noise('pink');
          source.start();
          break;

        case 'ocean':
          source = new Tone.Noise('white');
          source.start();
          break;

        case 'basement':
        case 'cave':
          source = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 3, decay: 0, sustain: 1, release: 3 },
          });
          source.triggerAttack('C2');
          break;

        case 'graveyard':
        case 'church':
          source = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
          });
          source.triggerAttack('C4');
          break;

        default:
          source = new Tone.Noise('brown');
          source.start();
      }

      const gain = new Tone.Gain(0.2);
      source.connect(gain);
      gain.connect(this.ambientGain);

      const layer: SoundLayer = {
        type: 'ambient',
        source,
        gain,
        intensity: 0.5,
        id: layerId,
      };

      this.soundLayers.set(layerId, layer);
    } catch (error) {
      console.error('Failed to create location soundscape:', error);
    }
  }

  /**
   * Update soundscape based on mood tags
   */
  updateSoundscape(moodTags: string[]): void {
    if (!this.initialized) return;

    // Remove old ambient layers
    const ambientLayers = Array.from(this.soundLayers.values()).filter(
      layer => layer.type === 'ambient'
    );

    for (const layer of ambientLayers) {
      this.removeSoundLayer(layer.id);
    }

    // Create new ambient layers for each mood
    for (const mood of moodTags) {
      const intensity = this.calculateIntensity();
      this.createAmbientLayer(mood, intensity);
    }

    // If no mood tags, create a default ambient layer
    if (moodTags.length === 0) {
      this.createAmbientLayer('calm', 0.3);
    }
  }

  /**
   * Remove a sound layer
   */
  private removeSoundLayer(layerId: string): void {
    const layer = this.soundLayers.get(layerId);
    if (!layer) return;

    try {
      // Fade out and dispose
      if (layer.source) {
        if ('stop' in layer.source) {
          layer.source.stop();
        }
        layer.source.dispose();
      }
      if (layer.gain) {
        layer.gain.dispose();
      }
      this.soundLayers.delete(layerId);
    } catch (error) {
      console.error('Failed to remove sound layer:', error);
    }
  }

  /**
   * Calculate current audio intensity based on narrative progression
   */
  private calculateIntensity(): number {
    // Base intensity
    let intensity = 0.5;

    // Increase intensity based on mood
    if (this.currentMood.includes('horror')) intensity += 0.2;
    if (this.currentMood.includes('tense')) intensity += 0.15;
    if (this.currentMood.includes('violent')) intensity += 0.15;
    if (this.currentMood.includes('calm')) intensity -= 0.2;

    // Clamp between 0.2 and 1.0
    return Math.max(0.2, Math.min(1.0, intensity));
  }

  /**
   * Transition soundscape smoothly when location changes
   */
  transitionToLocation(location: string): void {
    if (!this.initialized) return;

    // Remove old location layers
    const locationLayers = Array.from(this.soundLayers.values()).filter(
      layer => layer.id.startsWith('location-')
    );

    for (const layer of locationLayers) {
      this.removeSoundLayer(layer.id);
    }

    // Create new location soundscape
    this.createLocationSoundscape(location);
  }

  /**
   * Trigger a sound effect based on keyword
   */
  triggerEffect(keyword: string): void {
    if (!this.initialized || !this.effectsGain) return;

    try {
      const layerId = `effect-${keyword}-${Date.now()}`;
      let source: Tone.Synth | Tone.Noise;
      let duration = 1;

      // Create sound effects based on keyword
      switch (keyword.toLowerCase()) {
        case 'scream':
          source = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
          });
          source.triggerAttackRelease('A5', '0.8');
          duration = 0.8;
          break;

        case 'thunder':
          source = new Tone.Noise('brown');
          source.start();
          setTimeout(() => {
            if ('stop' in source) source.stop();
          }, 1500);
          duration = 1.5;
          break;

        case 'creak':
          source = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 0.4 },
          });
          source.triggerAttackRelease('C3', '1');
          duration = 1;
          break;

        case 'footsteps':
          source = new Tone.Noise('white');
          source.start();
          setTimeout(() => {
            if ('stop' in source) source.stop();
          }, 300);
          duration = 0.3;
          break;

        case 'door':
          source = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 0.3 },
          });
          source.triggerAttackRelease('G2', '0.6');
          duration = 0.6;
          break;

        case 'wind':
          source = new Tone.Noise('pink');
          source.start();
          setTimeout(() => {
            if ('stop' in source) source.stop();
          }, 2000);
          duration = 2;
          break;

        case 'heartbeat':
          source = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
          });
          source.triggerAttackRelease('C2', '0.1');
          duration = 0.1;
          break;

        case 'whisper':
          source = new Tone.Noise('white');
          source.start();
          setTimeout(() => {
            if ('stop' in source) source.stop();
          }, 800);
          duration = 0.8;
          break;

        case 'crash':
          source = new Tone.Noise('white');
          source.start();
          setTimeout(() => {
            if ('stop' in source) source.stop();
          }, 600);
          duration = 0.6;
          break;

        case 'bell':
          source = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 1, sustain: 0, release: 1 },
          });
          source.triggerAttackRelease('C5', '2');
          duration = 2;
          break;

        default:
          // Generic effect
          source = new Tone.Synth();
          source.triggerAttackRelease('C4', '0.5');
          duration = 0.5;
      }

      // Create gain node for this effect
      const gain = new Tone.Gain(0.5);
      source.connect(gain);
      gain.connect(this.effectsGain);

      const layer: SoundLayer = {
        type: 'effect',
        source,
        gain,
        intensity: 0.5,
        id: layerId,
      };

      this.soundLayers.set(layerId, layer);

      // Auto-cleanup after effect duration
      setTimeout(() => {
        this.removeSoundLayer(layerId);
      }, duration * 1000 + 100);
    } catch (error) {
      console.error('Failed to trigger sound effect:', error);
    }
  }

  /**
   * Trigger multiple effects with prioritization
   */
  triggerEffects(keywords: string[]): void {
    if (!this.initialized || keywords.length === 0) return;

    // Priority order for effects
    const priorityOrder = [
      'scream',
      'thunder',
      'crash',
      'bell',
      'creak',
      'door',
      'footsteps',
      'wind',
      'whisper',
      'heartbeat',
    ];

    // Sort keywords by priority
    const sortedKeywords = keywords.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.toLowerCase());
      const bPriority = priorityOrder.indexOf(b.toLowerCase());
      return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
    });

    // Trigger up to 3 effects to avoid overwhelming
    const effectsToTrigger = sortedKeywords.slice(0, 3);
    effectsToTrigger.forEach((keyword, index) => {
      setTimeout(() => this.triggerEffect(keyword), index * 200);
    });
  }

  /**
   * Set volume levels
   */
  setVolume(settings: Partial<AudioSettings>): void {
    // Update settings
    if (settings.masterVolume !== undefined && !isNaN(settings.masterVolume)) {
      this.settings.masterVolume = Math.max(0, Math.min(1, settings.masterVolume));
    }
    if (settings.ambientVolume !== undefined && !isNaN(settings.ambientVolume)) {
      this.settings.ambientVolume = Math.max(0, Math.min(1, settings.ambientVolume));
    }
    if (settings.effectsVolume !== undefined && !isNaN(settings.effectsVolume)) {
      this.settings.effectsVolume = Math.max(0, Math.min(1, settings.effectsVolume));
    }
    if (settings.muted !== undefined) {
      this.settings.muted = settings.muted;
    }

    // Apply settings immediately if initialized
    if (this.initialized) {
      this.applySettings();
    }

    // Persist to session storage
    this.saveSettings();
  }

  /**
   * Mute all audio
   */
  mute(): void {
    this.settings.muted = true;
    
    if (this.initialized && this.masterGain) {
      this.masterGain.gain.value = 0;
    }

    this.saveSettings();
  }

  /**
   * Unmute audio (restore previous volume)
   */
  unmute(): void {
    this.settings.muted = false;
    
    if (this.initialized && this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume;
    }

    this.saveSettings();
  }

  /**
   * Toggle mute state
   */
  toggleMute(): void {
    if (this.settings.muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /**
   * Handle segment addition event
   * This is the main entry point for story events
   */
  onSegmentAdded(content: string): void {
    if (!this.initialized) return;

    try {
      // Analyze mood
      const moodTags = this.analyzeMood(content);

      // Update soundscape based on mood
      if (moodTags.length > 0) {
        this.updateSoundscape(moodTags);
      }

      // Detect and trigger sound effects
      const effects = this.detectSoundEffects(content);
      if (effects.length > 0) {
        this.triggerEffects(effects);
      }

      // Detect location changes
      const location = this.detectLocation(content);
      if (location && location !== this.currentLocation) {
        this.transitionToLocation(location);
      }
    } catch (error) {
      console.error('Error processing segment:', error);
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Stop and dispose all sound layers
    this.soundLayers.forEach(layer => {
      if (layer.source) {
        layer.source.dispose();
      }
      if (layer.gain) {
        layer.gain.dispose();
      }
    });
    this.soundLayers.clear();

    // Dispose gain nodes
    if (this.masterGain) {
      this.masterGain.dispose();
    }
    if (this.ambientGain) {
      this.ambientGain.dispose();
    }
    if (this.effectsGain) {
      this.effectsGain.dispose();
    }

    this.initialized = false;
  }
}

// Export singleton instance
export const audioEngine = new AudioEngine();
