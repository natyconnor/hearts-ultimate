// Sound effects utility using Web Audio API
// Generates synthesized sounds for game events

type SoundType =
  | 'cardPlay'
  | 'cardDeal'
  | 'trickWin'
  | 'heartsBroken'
  | 'shootTheMoon'
  | 'gameEnd'
  | 'buttonClick'
  | 'error';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

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
}

// Convenience function
export function playSound(type: SoundType): void {
  soundManager.play(type);
}

