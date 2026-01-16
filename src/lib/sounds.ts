// Sound effects utility using Web Audio API
// Generates synthesized sounds for game events

type SoundType =
  | 'cardPlay'
  | 'cardDeal'
  | 'trickWin'
  | 'heartsBroken'
  | 'shootTheMoon'
  | 'queenOfSpades'
  | 'gameEnd'
  | 'buttonClick'
  | 'error';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        console.warn('Web Audio API not supported');
        return null;
      }
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  // Load an audio file and cache it
  private async loadAudioFile(url: string): Promise<AudioBuffer | null> {
    // Return cached buffer if available
    if (this.audioBuffers.has(url)) {
      return this.audioBuffers.get(url)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return null;

    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(url, audioBuffer);
        return audioBuffer;
      } catch (error) {
        console.warn(`Failed to load audio file: ${url}`, error);
        return null;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  // Play a loaded audio buffer
  private playAudioBuffer(buffer: AudioBuffer): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = this.volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
  }

  // Preload audio files for instant playback
  preloadAudio(urls: string[]): void {
    urls.forEach(url => this.loadAudioFile(url));
  }

  play(type: SoundType): void {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      switch (type) {
        case 'cardPlay':
          this.playCardSound(ctx);
          break;
        case 'cardDeal':
          this.playDealSound(ctx);
          break;
        case 'trickWin':
          this.playTrickWinSound(ctx);
          break;
        case 'heartsBroken':
          this.playHeartsBrokenSound(ctx);
          break;
        case 'shootTheMoon':
          this.playShootTheMoonSound(ctx);
          break;
        case 'queenOfSpades':
          this.playQueenOfSpadesSound(ctx);
          break;
        case 'gameEnd':
          this.playGameEndSound(ctx);
          break;
        case 'buttonClick':
          this.playButtonClickSound(ctx);
          break;
        case 'error':
          this.playErrorSound(ctx);
          break;
      }
    } catch {
      // Silently fail - sound effects are non-critical
    }
  }

  // Quick card snap/slap sound
  private playCardSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // White noise burst for card slap
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for more realistic card sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.6, now);
    gain.gain.setTargetAtTime(0.001, now, 0.02);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Softer deal sound
  private playDealSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Success sound for winning trick
  private playTrickWinSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Two-tone chime
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  // Dramatic sound for hearts breaking
  private playHeartsBrokenSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Descending dramatic tone
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.setValueAtTime(this.volume * 0.4, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Triumphant fanfare for shooting the moon
  private playShootTheMoonSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Ascending triumphant notes
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, startTime + 0.02);
      gain.gain.setValueAtTime(this.volume * 0.35, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // Ominous sound for Queen of Spades - uses audio file
  private playQueenOfSpadesSound(_ctx: AudioContext): void {
    // Try to play audio file, fall back to synthesized if not available
    this.loadAudioFile('/sounds/queen-of-spades.mp3').then(buffer => {
      if (buffer) {
        this.playAudioBuffer(buffer);
      } else {
        // Fallback: simple low thud
        this.playQueenOfSpadesFallback();
      }
    });
  }

  // Fallback synthesized sound if audio file isn't available
  private playQueenOfSpadesFallback(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Play 3 deep drum hits
    [0, 0.18, 0.36].forEach((delay) => {
      const hitTime = now + delay;

      // Deep bass drum
      const kick = ctx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(60, hitTime);
      kick.frequency.exponentialRampToValueAtTime(25, hitTime + 0.2);

      const kickGain = ctx.createGain();
      kickGain.gain.setValueAtTime(this.volume * 0.6, hitTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.3);

      kick.connect(kickGain);
      kickGain.connect(ctx.destination);

      kick.start(hitTime);
      kick.stop(hitTime + 0.35);
    });
  }

  // Game over celebration/finale sound
  private playGameEndSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Major chord arpeggio
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.05);
      gain.gain.setValueAtTime(this.volume * 0.3, startTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }

  // Quick click for buttons
  private playButtonClickSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Error/invalid action sound
  private playErrorSound(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(150, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.setValueAtTime(this.volume * 0.2, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  const storedEnabled = localStorage.getItem('hearts-sound-enabled');
  const storedVolume = localStorage.getItem('hearts-sound-volume');

  if (storedEnabled !== null) {
    soundManager.setEnabled(storedEnabled === 'true');
  }

  if (storedVolume !== null) {
    const volume = parseFloat(storedVolume);
    if (!isNaN(volume) && volume >= 0 && volume <= 1) {
      soundManager.setVolume(volume);
    }
  }

  // Preload audio files
  soundManager.preloadAudio(['/sounds/queen-of-spades.mp3']);
}

// Convenience function
export function playSound(type: SoundType): void {
  soundManager.play(type);
}

