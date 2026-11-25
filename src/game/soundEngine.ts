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

    if (monsterId === 'shizu' || monsterId === 'megumi' || monsterId === 'kyogi') {
      // Unsettling detuned high hum / porcelain chime giggle cadence
      const base =
        monsterId === 'megumi'
          ? [659, 698, 622]
          : monsterId === 'kyogi'
            ? [493.88, 523.25, 466.16]
            : [587, 622, 554];
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
    } else if (monsterId === 'nagisa' || monsterId === 'nure') {
      // Deep-sea / serpent hollow wail
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(monsterId === 'nure' ? 392.0 : 329.63, now);
      osc.frequency.exponentialRampToValueAtTime(monsterId === 'nure' ? 246.94 : 220, now + 0.55);
      filter.type = 'lowpass';
      filter.frequency.value = 680;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.65, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.62);
    } else if (monsterId === 'hyakume') {
      // Giant cyclops heavy low thud + eerie shimmer
      [82.41, 61.74].forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.16);
        osc.frequency.exponentialRampToValueAtTime(32, now + i * 0.16 + 0.25);
        gain.gain.setValueAtTime(vol * 0.72, now + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.28);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.16);
        osc.stop(now + i * 0.16 + 0.3);
      });
    } else if (monsterId === 'jigoku_warden' || monsterId === 'senzai_fallen') {
      // Hollow spirit bell / tragic discordant chime
      const chord =
        monsterId === 'senzai_fallen' ? [293.66, 311.13, 440.0] : [220.0, 233.08, 329.63];
      chord.forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(vol * 0.45, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.42);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.45);
      });
    } else if (monsterId === 'kuishinbo') {
      // Heavy butcher cleaver metallic scrape + low growl
      [110, 740, 784].forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + i * 0.04 + 0.24);
        gain.gain.setValueAtTime(vol * (i === 0 ? 0.52 : 0.22), now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.26);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.28);
      });
    } else if (monsterId === 'rin_mio') {
      // Twin weeping minor-2nd duet
      [523.25, 493.88, 783.99, 739.99].forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(vol * 0.4, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.26);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.28);
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
    } else if (monsterId === 'saigomo' || monsterId === 'biwaki' || monsterId === 'enzukai') {
      // Dissonant traditional biwa / abyssal shrine gong sting
      const chord =
        monsterId === 'enzukai' ? [146.83, 207.65, 440.0] : [233.08, 246.94, 466.16];
      chord.forEach((freq, idx) => {
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

  // --- Scary Procedural Horror BGM & Combat SFX ---
  private bgmTimer: number | null = null;
  private bgmChapterId = 1;
  private bgmBossMode = false;
  private bgmChaseMode = false;
  private bgmNightmareMode = false;
  private bgmStep = 0;

  public startBgm(chapterId: number, bossMode = false, chaseMode = false, nightmareMode = false) {
    this.init();
    this.bgmChapterId = chapterId;
    this.bgmBossMode = bossMode;
    this.bgmChaseMode = chaseMode;
    this.bgmNightmareMode = nightmareMode;
    this.bgmStep = 0;
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    const baseInterval = chaseMode ? 270 : bossMode ? 380 : 920;
    const intervalMs = nightmareMode ? Math.round(baseInterval * 0.78) : baseInterval;
    this.bgmTimer = window.setInterval(() => {
      this.tickBgmNote();
    }, intervalMs);
    this.tickBgmNote();
  }

  public playFinalChaseAlarm() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Deep ominous shock boom + urgent rising horror siren sting
    [73.42, 110, 220, 440, 466.16].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * 0.92, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + 0.72);
      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.28 : 0.14, now + idx * 0.04 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.98);
    });
  }

  public stopBgm() {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private tickBgmNote() {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const step = this.bgmStep++;

    if (this.bgmBossMode || this.bgmChaseMode) {
      // Intense horror boss / final escape chase taiko & dissonant tritone ostinato
      const isStrongBeat = step % 4 === 0;
      const isOffBeat = step % 2 === 1;

      if (isStrongBeat || step % 4 === 2) {
        const drumOsc = this.ctx.createOscillator();
        const drumGain = this.ctx.createGain();
        drumOsc.type = 'sine';
        drumOsc.frequency.setValueAtTime(isStrongBeat ? 88 : 70, now);
        drumOsc.frequency.exponentialRampToValueAtTime(28, now + 0.22);
        drumGain.gain.setValueAtTime(
          (isStrongBeat ? 0.22 : 0.14) * (this.bgmChaseMode ? 1.2 : 1.0),
          now
        );
        drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        drumOsc.connect(drumGain);
        drumGain.connect(this.masterGain);
        drumOsc.start(now);
        drumOsc.stop(now + 0.26);
      }

      // Eerie dissonant low brass/string ostinato (D2, Eb2, F2, Ab1, B1)
      const bassNotes = [73.42, 77.78, 87.31, 61.74, 73.42, 103.83, 77.78, 69.3];
      const freq = bassNotes[step % bassNotes.length];
      const stringOsc = this.ctx.createOscillator();
      const stringFilter = this.ctx.createBiquadFilter();
      const stringGain = this.ctx.createGain();
      stringOsc.type = 'sawtooth';
      stringOsc.frequency.setValueAtTime(freq, now);
      stringFilter.type = 'lowpass';
      stringFilter.frequency.setValueAtTime(
        isStrongBeat ? (this.bgmChaseMode ? 580 : 460) : 340,
        now
      );
      stringGain.gain.setValueAtTime(0.001, now);
      stringGain.gain.linearRampToValueAtTime(this.bgmChaseMode ? 0.095 : 0.075, now + 0.04);
      stringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      stringOsc.connect(stringFilter);
      stringFilter.connect(stringGain);
      stringGain.connect(this.masterGain);
      stringOsc.start(now);
      stringOsc.stop(now + 0.37);

      // Haunting high shamisen/koto accent
      if (isOffBeat && step % 3 === 1) {
        const highNotes = [587.33, 622.25, 830.61, 466.16];
        const hf = highNotes[(step >> 1) % highNotes.length];
        const bell = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bell.type = 'triangle';
        bell.frequency.setValueAtTime(hf, now);
        bGain.gain.setValueAtTime(0.055, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        bell.connect(bGain);
        bGain.connect(this.masterGain);
        bell.start(now);
        bell.stop(now + 0.5);
      }
      return;
    }

    // Exploration Horror BGM (Ch1-3 & Ch5-7): eerie Japanese Hirajoshi / Miyako-bushi scales
    const scale =
      this.bgmChapterId === 7
        ? [174.61, 185.0, 261.63, 277.18, 349.23, 392.0] // F Jigoku underworld dread
        : this.bgmChapterId === 6
          ? [196.0, 207.65, 293.66, 311.13, 392.0, 415.3] // G Deep-Sea Sanctum abyss
          : this.bgmChapterId === 5
            ? [233.08, 246.94, 329.63, 369.99, 466.16, 493.88] // Bb Aogashima Island fog
            : this.bgmChapterId === 3
              ? [293.66, 311.13, 440.0, 466.16, 587.33, 622.25] // D Hirajoshi (haunting shrine)
              : this.bgmChapterId === 2
                ? [246.94, 261.63, 349.23, 392.0, 493.88, 523.25] // B minor-2nd palace
                : [220.0, 233.08, 311.13, 329.63, 440.0, 466.16]; // A eerie school tension

    // Eerie sparse melody pluck every 2nd or 3rd step (more frequent & lower in Nightmare Mode)
    if (step % 2 === 0 || Math.random() < (this.bgmNightmareMode ? 0.6 : 0.35)) {
      const f =
        scale[Math.floor(Math.random() * scale.length)] *
        (this.bgmNightmareMode ? 0.75 : Math.random() < 0.25 ? 0.5 : 1);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = this.bgmNightmareMode ? 'sawtooth' : Math.random() < 0.5 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * (Math.random() < 0.4 ? 0.98 : 1.01), now + 1.4);
      filter.type = 'lowpass';
      filter.frequency.value = this.bgmNightmareMode ? 900 : 1200;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.bgmNightmareMode ? 0.068 : 0.055, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.65);
    }

    // Occasional distant cavern/hallway deep rumble
    if (step % 6 === 0) {
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(48, now);
      sub.frequency.exponentialRampToValueAtTime(30, now + 1.2);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.11, now + 0.2);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(now);
      sub.stop(now + 1.55);
    }
  }

  public playSwordSwing() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.15);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  public playSwordHit(isStunned: boolean) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freqs = isStunned ? [220, 660, 1320] : [180, 520];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.18);
      gain.gain.setValueAtTime(idx === 0 ? 0.22 : 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.21);
    });
  }

  public playBossTelegraph(
    kind: 'lunge' | 'slam' | 'webShot' | 'crimsonSpikes' | 'bloodNova'
  ) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === 'slam' || kind === 'bloodNova' ? 'sawtooth' : 'triangle';
    const startF =
      kind === 'bloodNova'
        ? 92
        : kind === 'slam'
          ? 110
          : kind === 'lunge'
            ? 420
            : kind === 'crimsonSpikes'
              ? 180
              : 280;
    const endF =
      kind === 'bloodNova'
        ? 520
        : kind === 'slam'
          ? 58
          : kind === 'lunge'
            ? 840
            : kind === 'crimsonSpikes'
              ? 640
              : 540;
    const dur = kind === 'bloodNova' ? 0.95 : 0.52;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(endF, now + dur * 0.88);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(kind === 'bloodNova' ? 0.26 : 0.2, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  public playBarrierDeflect() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [340, 510].forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.48, now + 0.14);
      gain.gain.setValueAtTime(idx === 0 ? 0.14 : 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.17);
    });
  }

  public playParryCounter() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [880, 1318.5, 1760].forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.025);
      osc.frequency.exponentialRampToValueAtTime(f * 1.08, now + 0.32);
      gain.gain.setValueAtTime(0.22 / (idx + 1), now + idx * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.025);
      osc.stop(now + 0.47);
    });
  }

  public playBossExplosion(heavy = false) {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 115 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + (heavy ? 0.72 : 0.48));
    gain.gain.setValueAtTime(heavy ? 0.36 : 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.75 : 0.5));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (heavy ? 0.78 : 0.52));

    const dur = heavy ? 0.55 : 0.32;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = heavy ? 780 : 540;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(heavy ? 0.28 : 0.2, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
  }

  public playBossStun() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 783.99, 1046.5].forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);
      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.68);
    });
  }

  public playPlayerHit() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.32);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playKintoruControlStart() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    // Eerie dissonant whisper & low mind-grip swell
    [146.83, 155.56, 293.66, 622.25].forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(f * 1.04, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.86, now + 0.65);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(idx < 2 ? 0.14 : 0.1, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.75);
    });
  }

  public playHandBanish() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(860, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.14);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playKintoruControlEscape() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.045);
      gain.gain.setValueAtTime(0.16 / (idx * 0.4 + 1), now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.42);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.45);
    });
  }

  public playPoisonSplash() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.24);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    [293.66, 369.99, 554.37].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.055);
      g.gain.setValueAtTime(0.14, now + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.3);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.32);
    });
  }
}

export const soundEngine = new HorrorSoundEngine();
