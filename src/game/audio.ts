export class GameAudio {
  private ctx: AudioContext | null = null;
  private lastStep = 0;

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, hp = 400): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = n;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = hp;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t);
  }

  scratch(hard: boolean): void {
    this.noise(hard ? 0.12 : 0.06, hard ? 0.16 : 0.07, hard ? 900 : 1400);
    this.tone(hard ? 180 : 320, 0.05, "square", 0.03, -60);
  }

  shatter(kind: string): void {
    if (kind === "стекло" || kind === "керамика") {
      this.noise(0.18, 0.22, 1800);
      this.tone(740, 0.12, "triangle", 0.05, -400);
    } else if (kind === "металл") {
      this.tone(220, 0.16, "square", 0.06, -80);
      this.noise(0.1, 0.12, 500);
    } else {
      this.noise(0.14, 0.14, 400);
      this.tone(140, 0.1, "sine", 0.05, -40);
    }
  }

  thud(): void {
    this.noise(0.08, 0.1, 180);
    this.tone(90, 0.08, "sine", 0.06);
  }

  step(now: number): void {
    if (now - this.lastStep < 0.28) return;
    this.lastStep = now;
    this.noise(0.04, 0.03, 200);
  }

  jump(): void {
    this.tone(280, 0.07, "sine", 0.035, 60);
  }

  meow(): void {
    this.tone(420, 0.18, "sine", 0.05, -90);
    this.tone(640, 0.12, "triangle", 0.03, -120);
  }
}
