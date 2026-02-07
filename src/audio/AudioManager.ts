import { Howl, Howler } from 'howler';

/** Sound effect identifiers */
export type SoundId =
  | 'mine_hit'
  | 'mine_break'
  | 'enemy_hit'
  | 'enemy_death'
  | 'player_hurt'
  | 'buy'
  | 'sell'
  | 'teleport'
  | 'pickup'
  | 'ladder_place'
  | 'enhance_success'
  | 'enhance_fail'
  | 'bgm';

interface SoundEntry {
  howl: Howl;
  volume: number;
}

/**
 * Game audio manager using Howler.js.
 *
 * Uses procedurally generated audio buffers since no external audio files
 * are bundled yet. Swap the data URIs for real audio file paths when available.
 */
export class AudioManager {
  private sounds: Map<SoundId, SoundEntry> = new Map();
  private bgmId: number | undefined;
  private masterVolume = 0.5;
  private sfxVolume = 0.7;
  private bgmVolume = 0.3;
  private muted = false;

  constructor() {
    this.initSounds();
  }

  private initSounds(): void {
    const ctx = Howler.ctx;
    if (!ctx) return;

    // Generate procedural audio buffers as data URIs
    this.registerSound('mine_hit', this.generateTone(ctx, 220, 0.08, 'square', 0.5), 0.4);
    this.registerSound('mine_break', this.generateNoise(ctx, 0.15, 0.6), 0.5);
    this.registerSound('enemy_hit', this.generateTone(ctx, 180, 0.1, 'sawtooth', 0.8), 0.5);
    this.registerSound('enemy_death', this.generateSweep(ctx, 300, 80, 0.3), 0.5);
    this.registerSound('player_hurt', this.generateTone(ctx, 120, 0.15, 'sawtooth', 0.6), 0.6);
    this.registerSound('buy', this.generateChime(ctx, [523, 659, 784], 0.12), 0.5);
    this.registerSound('sell', this.generateChime(ctx, [784, 659, 523], 0.12), 0.5);
    this.registerSound('teleport', this.generateSweep(ctx, 200, 800, 0.4), 0.4);
    this.registerSound('pickup', this.generateTone(ctx, 660, 0.08, 'sine', 0.4), 0.4);
    this.registerSound('ladder_place', this.generateTone(ctx, 280, 0.1, 'triangle', 0.5), 0.4);
    this.registerSound('enhance_success', this.generateChime(ctx, [523, 659, 784, 1047], 0.15), 0.6);
    this.registerSound('enhance_fail', this.generateTone(ctx, 100, 0.3, 'sawtooth', 0.5), 0.5);

    // BGM: looping chiptune-style pattern
    this.registerBGM(ctx);
  }

  /** Register a sound effect from an AudioBuffer */
  private registerSound(id: SoundId, buffer: AudioBuffer, volume: number): void {
    const blob = this.bufferToWavBlob(buffer);
    const url = URL.createObjectURL(blob);
    const howl = new Howl({
      src: [url],
      format: ['wav'],
      volume: volume * this.sfxVolume,
    });
    this.sounds.set(id, { howl, volume });
  }

  /** Register BGM as a looping sound */
  private registerBGM(ctx: AudioContext): void {
    const buffer = this.generateBGM(ctx);
    const blob = this.bufferToWavBlob(buffer);
    const url = URL.createObjectURL(blob);
    const howl = new Howl({
      src: [url],
      format: ['wav'],
      loop: true,
      volume: this.bgmVolume,
    });
    this.sounds.set('bgm', { howl, volume: this.bgmVolume });
  }

  /** Play a sound effect */
  play(id: SoundId): void {
    if (this.muted) return;
    const entry = this.sounds.get(id);
    if (entry) {
      entry.howl.play();
    }
  }

  /** Play a sound at a 3D position (simplified spatial) */
  playAt(id: SoundId, x: number, y: number, z: number, listenerX: number, listenerY: number, listenerZ: number): void {
    if (this.muted) return;
    const entry = this.sounds.get(id);
    if (!entry) return;

    // Simple distance-based attenuation
    const dx = x - listenerX;
    const dy = y - listenerY;
    const dz = z - listenerZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const maxDist = 20;
    const vol = Math.max(0, 1 - dist / maxDist) * entry.volume * this.sfxVolume;

    if (vol > 0.01) {
      const playId = entry.howl.play();
      entry.howl.volume(vol, playId);
      // Simple stereo panning based on X offset
      const pan = Math.max(-1, Math.min(1, dx / 10));
      entry.howl.stereo(pan, playId);
    }
  }

  /** Start background music */
  startBGM(): void {
    if (this.muted) return;
    const entry = this.sounds.get('bgm');
    if (entry && this.bgmId === undefined) {
      this.bgmId = entry.howl.play();
    }
  }

  /** Stop background music */
  stopBGM(): void {
    const entry = this.sounds.get('bgm');
    if (entry && this.bgmId !== undefined) {
      entry.howl.stop(this.bgmId);
      this.bgmId = undefined;
    }
  }

  /** Toggle mute */
  toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    return this.muted;
  }

  /** Set master volume (0-1) */
  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    Howler.volume(this.masterVolume);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  // --- Procedural audio generation ---

  /** Generate a simple tone */
  private generateTone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType,
    decay: number,
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay / duration * 5);
      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * freq * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * ((freq * t) % 1) - 1;
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
          break;
      }
      data[i] = sample * envelope * 0.3;
    }
    return buffer;
  }

  /** Generate white noise burst */
  private generateNoise(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * decay / duration * 5);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.2;
    }
    return buffer;
  }

  /** Generate frequency sweep (for teleport, death sounds) */
  private generateSweep(ctx: AudioContext, startFreq: number, endFreq: number, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const freq = startFreq + (endFreq - startFreq) * progress;
      const envelope = Math.exp(-progress * 3);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.25;
    }
    return buffer;
  }

  /** Generate a multi-note chime (for buy/sell/enhance) */
  private generateChime(ctx: AudioContext, freqs: number[], noteDuration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const totalDuration = freqs.length * noteDuration;
    const length = Math.floor(sampleRate * totalDuration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let n = 0; n < freqs.length; n++) {
      const start = Math.floor(n * noteDuration * sampleRate);
      const noteLen = Math.floor(noteDuration * sampleRate);
      for (let i = 0; i < noteLen; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t / noteDuration * 4);
        data[start + i] += Math.sin(2 * Math.PI * freqs[n] * t) * envelope * 0.2;
      }
    }
    return buffer;
  }

  /** Generate a simple chiptune BGM loop */
  private generateBGM(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bpm = 140;
    const beatDuration = 60 / bpm;
    const bars = 4;
    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;
    const duration = totalBeats * beatDuration;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Simple melody (pentatonic scale: C, D, E, G, A)
    const melody = [262, 294, 330, 392, 440, 392, 330, 294, 262, 330, 392, 440, 523, 440, 392, 330];
    // Bass pattern
    const bass = [131, 131, 165, 165, 196, 196, 165, 165, 131, 131, 165, 165, 196, 196, 262, 196];

    for (let beat = 0; beat < totalBeats; beat++) {
      const startSample = Math.floor(beat * beatDuration * sampleRate);
      const beatSamples = Math.floor(beatDuration * sampleRate);

      const melodyFreq = melody[beat % melody.length];
      const bassFreq = bass[beat % bass.length];

      for (let i = 0; i < beatSamples; i++) {
        const t = i / sampleRate;
        const melodyEnv = Math.exp(-t / beatDuration * 3);
        const bassEnv = Math.exp(-t / beatDuration * 2);

        // Square wave melody (chiptune style)
        const mel = (Math.sin(2 * Math.PI * melodyFreq * t) > 0 ? 1 : -1) * melodyEnv * 0.08;
        // Triangle wave bass
        const bas = (2 * Math.abs(2 * ((bassFreq * t) % 1) - 1) - 1) * bassEnv * 0.06;

        if (startSample + i < length) {
          data[startSample + i] += mel + bas;
        }
      }
    }
    return buffer;
  }

  /** Convert AudioBuffer to WAV Blob for Howler */
  private bufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, headerSize + dataSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += bytesPerSample;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  dispose(): void {
    for (const [, entry] of this.sounds) {
      entry.howl.unload();
    }
    this.sounds.clear();
    this.bgmId = undefined;
  }
}
