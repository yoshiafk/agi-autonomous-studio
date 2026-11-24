// Antigravity Studio - Procedural Chiptune 8-Bit Web Audio Engine
// 100% Zero-asset, zero-dependency synthesized audio via Web Audio API

class ChiptuneAudio {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('studio_audio_enabled') === 'true';
    this.lastSoundTime = {};
    this.hasUserInteracted = false;

    // Listen for the first user interaction to safely unlock AudioContext
    const unlockAudio = () => {
      this.hasUserInteracted = true;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  }

  init() {
    // Strictly require user gesture before instantiating or resuming AudioContext
    if (!this.hasUserInteracted) return false;

    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (err) {
        return false;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!(this.ctx && this.ctx.state === 'running');
  }

  toggle() {
    this.hasUserInteracted = true;
    this.enabled = !this.enabled;
    localStorage.setItem('studio_audio_enabled', this.enabled ? 'true' : 'false');
    if (this.enabled) {
      this.init();
      this.playChime();
    }
    return this.enabled;
  }

  // 8-bit mechanical typing blip (rate-limited)
  playKeyClick() {
    if (!this.enabled || !this.hasUserInteracted) return;
    const now = Date.now();
    if (this.lastSoundTime.key && now - this.lastSoundTime.key < 95) return;
    this.lastSoundTime.key = now;
    if (!this.init()) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const baseFreq = 400 + Math.random() * 260;
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }

  // 8-bit victory / milestone arpeggio (C5 -> E5 -> G5 -> C6)
  playChime() {
    if (!this.enabled || !this.hasUserInteracted) return;
    if (!this.init()) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        const st = this.ctx.currentTime + idx * 0.065;
        osc.frequency.setValueAtTime(freq, st);

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.07, st + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(st);
        osc.stop(st + 0.13);
      });
    } catch (e) {}
  }

  // 8-bit satellite radar ping for git push (B5 -> E6)
  playSatellitePing() {
    if (!this.enabled || !this.hasUserInteracted) return;
    const now = Date.now();
    if (this.lastSoundTime.ping && now - this.lastSoundTime.ping < 800) return;
    this.lastSoundTime.ping = now;
    if (!this.init()) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318.51, this.ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.23);
    } catch (e) {}
  }

  // 8-bit filtered noise steam burst for espresso lounge
  playCoffeeSteam() {
    if (!this.enabled || !this.hasUserInteracted) return;
    const now = Date.now();
    if (this.lastSoundTime.steam && now - this.lastSoundTime.steam < 1400) return;
    this.lastSoundTime.steam = now;
    if (!this.init()) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.14;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      noise.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  // 8-bit drift alert / warning boop
  playAlert() {
    if (!this.enabled || !this.hasUserInteracted) return;
    if (!this.init()) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.setValueAtTime(330, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.19);
    } catch (e) {}
  }
}

window.chiptuneAudio = new ChiptuneAudio();
