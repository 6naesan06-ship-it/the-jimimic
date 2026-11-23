import { MonsterId } from '../data/lore';

class HorrorSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private muted = false;
  private initialized = false;

  private heartbeatTimer = 0;
  private monsterCueTimer = 0;

  public init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.72;
    this.masterGain.connect(this.ctx.destination);

    // Low eerie ambient drone
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.14;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    this.ambientGain.connect(filter);
    filter.connect(this.masterGain);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.value = 41.2; // E1 eerie sub-drone

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.value = 61.74; // B1 dissonant fifth

    this.droneOsc1.connect(this.ambientGain);
    this.droneOsc2.connect(this.ambientGain);
    this.droneOsc1.start();
    this.droneOsc2.start();

    this.initialized = true;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setAmbientIntensity(level: number) {
    if (!this.ambientGain || !this.ctx) return;
    const clamped = Math.max(0.08, Math.min(0.32, level));
    this.ambientGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.25);
  }

  public playFlashlightToggle() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playFootstep(sprinting: boolean, crouching: boolean) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = crouching ? 0.04 : sprinting ? 0.16 : 0.095;

    // Short filtered noise burst for wooden floorboard step
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = sprinting ? 320 + Math.random() * 80 : 210 + Math.random() * 50;
    filter.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  public playPickup(kind: 'key' | 'battery' | 'diary') {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freqs =
      kind === 'key'
        ? [523.25, 659.25, 783.99]
        : kind === 'battery'
          ? [440, 587.33]
          : [349.23, 440];

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = kind === 'key' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.065);
      gain.gain.setValueAtTime(0.001, now + idx * 0.065);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.065 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.36);
    });
  }

  public playDoorOpen() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(92, now + 0.38);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.43);
  }

  public playPortalUnlock() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    // Deep temple gong + ominous chime
    [110, 164.81, 220, 329.63].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.85);
    });
  }

  public playHeartbeat(intensity: number) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.45, 0.08 + intensity * 0.35);

    [0, 0.16].forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 64 : 52, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.13);
      gain.gain.setValueAtTime(vol * (idx === 0 ? 1 : 0.72), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  public playMonsterCue(monsterId: MonsterId, distanceRatio: number) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.max(0.03, Math.min(0.28, (1 - distanceRatio) * 0.28));

    if (monsterId === 'shizu' || monsterId === 'megumi') {
      // Unsettling detuned high hum / porcelain chime giggle cadence
      const base = monsterId === 'megumi' ? [659, 698, 622] : [587, 622, 554];
      base.forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 18, now + i * 0.12);
        gain.gain.setValueAtTime(0.001, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(vol * 0.55, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.24);
      });
    } else if (monsterId === 'oomukade') {
      // Rapid centipede chitin clicks
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900 + i * 240, now + i * 0.055);
        osc.frequency.exponentialRampToValueAtTime(180, now + i * 0.055 + 0.03);
        gain.gain.setValueAtTime(vol * 0.5, now + i * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.035);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.055);
        osc.stop(now + i * 0.055 + 0.04);
      }
    } else if (monsterId === 'saigomo' || monsterId === 'biwaki') {
      // Dissonant traditional biwa / shrine bell sting
      [233.08, 246.94, 466.16].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 2 ? 'sine' : 'sawtooth';
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 950;
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(vol * 0.45, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.05);
        osc.stop(now + 0.8);
      });
    } else {
      // Keiko hollow grieving wind whisper
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(196, now);
      osc.frequency.linearRampToValueAtTime(138, now + 0.6);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.6, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.68);
    }
  }

  public updateProximityAudio(
    minMonsterDist: number,
    closestMonster: MonsterId | null,
    isChasing: boolean,
    dt: number
  ) {
    if (!this.initialized || this.muted) return;

    const dangerRadius = 20;
    if (minMonsterDist < dangerRadius && closestMonster) {
      const intensity = Math.max(0, Math.min(1, 1 - minMonsterDist / dangerRadius));
      const beatInterval = isChasing ? 0.36 : 0.85 - intensity * 0.42;

      this.heartbeatTimer += dt;
      if (this.heartbeatTimer >= beatInterval) {
        this.heartbeatTimer = 0;
        this.playHeartbeat(intensity);
      }

      this.monsterCueTimer += dt;
      const cueInterval = isChasing ? 1.45 : 3.2;
      if (this.monsterCueTimer >= cueInterval) {
        this.monsterCueTimer = 0;
        this.playMonsterCue(closestMonster, minMonsterDist / dangerRadius);
      }

      this.setAmbientIntensity(0.14 + intensity * 0.14);
    } else {
      this.heartbeatTimer = 0;
      this.setAmbientIntensity(0.12);
    }
  }

  public playJumpscare() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Layered screeching horror chord + white noise burst
    const freqs = [185, 277.18, 392, 587.33, 830.61];
    freqs.forEach((f) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 1.15, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, now + 0.95);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    });

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.85);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1150;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
  }
}

export const soundEngine = new HorrorSoundEngine();
