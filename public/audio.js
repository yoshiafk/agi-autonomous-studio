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
        // Master Dynamics Compressor to prevent digital clipping across simultaneous sounds
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);
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
      gain.connect(this.compressor || this.ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (err) {}
      };

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
        gain.connect(this.compressor || this.ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (err) {}
        };

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
      gain.connect(this.compressor || this.ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (err) {}
      };

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
      gain.connect(this.compressor || this.ctx.destination);

      noise.onended = () => {
        try {
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (err) {}
      };

      noise.start();
      noise.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  // 8-bit descending glitch buzz for errors, failures, and breaks
  playErrorGlitch() {
    if (!this.enabled || !this.hasUserInteracted) return;
    const now = Date.now();
    if (this.lastSoundTime.error && now - this.lastSoundTime.error < 600) return;
    this.lastSoundTime.error = now;
    if (!this.init()) return;

    try {
      // Dual-oscillator descending sawtooth buzz
      const freqs = [293.66, 220.00, 164.81, 110.00]; // D4 -> A3 -> E3 -> A2
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = (idx % 2 === 0) ? 'sawtooth' : 'square';
        const st = this.ctx.currentTime + idx * 0.055;
        osc.frequency.setValueAtTime(freq, st);
        osc.frequency.linearRampToValueAtTime(freq * 0.82, st + 0.05);

        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.08, st + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.06);

        osc.connect(gain);
        gain.connect(this.compressor || this.ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (err) {}
        };

        osc.start(st);
        osc.stop(st + 0.065);
      });
    } catch (e) {}
  }
}

window.chiptuneAudio = new ChiptuneAudio();
