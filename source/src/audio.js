// =========================================================
// 사운드: WebAudio로 효과음과 BGM을 직접 합성 (외부 음원 없음)
// =========================================================
const SCALES = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11] };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const AU = {
  ctx: null, master: null, bgmG: null, sfxG: null, noiseBuf: null, vol: { master: 0.8, bgm: 0.5, sfx: 0.8 }, muted: false,
  track: null, trackName: "", timer: null, step: 0, nextT: 0, last: {}, dest: null, seqCache: {},
  init() {
    if (this.ctx) return true;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    try {
      this.ctx = new C(); const c = this.ctx;
      this.master = c.createGain(); this.bgmG = c.createGain(); this.sfxG = c.createGain();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      this.bgmG.connect(this.master); this.sfxG.connect(this.master); this.master.connect(comp); comp.connect(c.destination);
      const len = c.sampleRate * 1; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVol(); return true;
    } catch (e) { return false; }
  },
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  applyVol() { if (!this.ctx) return; const m = this.muted ? 0 : this.vol.master; this.master.gain.value = m; this.bgmG.gain.value = this.vol.bgm * 0.5; this.sfxG.gain.value = this.vol.sfx * 0.8; },
  setVol(k, v) { this.vol[k] = v; this.applyVol(); },
  setMuted(m) { this.muted = m; this.applyVol(); },
  // ---- 기본 음원 ----
  tone(f, t0, dur, type, vol, dest, o) {
    o = o || {}; const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = type || "square"; osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t0 + dur);
    const a = o.attack || 0.004, rel = o.release || Math.min(0.08, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + a); g.gain.setValueAtTime(vol, Math.max(t0 + a, t0 + dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc; if (o.lp) { const flt = c.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = o.lp; osc.connect(flt); node = flt; }
    node.connect(g); g.connect(dest || this.sfxG); osc.start(t0); osc.stop(t0 + dur + 0.02);
  },
  noise(t0, dur, vol, o) {
    o = o || {}; const c = this.ctx, src = c.createBufferSource(), g = c.createGain(), flt = c.createBiquadFilter();
    src.buffer = this.noiseBuf; src.loop = true; flt.type = o.type || "bandpass"; flt.frequency.setValueAtTime(o.f || 1500, t0); if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur); flt.Q.value = o.q || 0.8;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(g); g.connect(o.dest || this.sfxG); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
  },
  // ---- 효과음 ----
  MIN: { kill: 0.05, slash: 0.05, thud: 0.06, ehit: 0.07, arrow: 0.07, hurt: 0.1, dodge: 0.1, zap: 0.08, boom: 0.1, kill2: 0.08 },
  sfx(name) {
    if (!this.ctx || this.muted) return; const c = this.ctx, now = c.currentTime;
    const mi = this.MIN[name]; if (mi) { if (this.last[name] && now - this.last[name] < mi) return; this.last[name] = now; }
    const t = now + 0.005, T = (f, d, ty, v, o) => this.tone(f, t, d, ty, v, null, o), N = (d, v, o) => this.noise(t, d, v, o);
    switch (name) {
      case "slash": N(0.12, 0.22, { f: 3500, f2: 900, q: 0.7 }); T(260, 0.08, "sawtooth", 0.07, { slide: 0.4 }); break;
      case "thud": T(110, 0.16, "sine", 0.4, { slide: 0.5 }); N(0.08, 0.25, { f: 600, type: "lowpass" }); break;
      case "zap": for (let i = 0; i < 5; i++) this.tone(900 + Math.random() * 1500, t + i * 0.035, 0.05, "square", 0.08, null, { slide: 0.6 + Math.random() }); N(0.2, 0.12, { f: 5000, type: "highpass" }); break;
      case "boom": T(90, 0.35, "sine", 0.55, { slide: 0.3 }); N(0.35, 0.35, { f: 900, f2: 120, type: "lowpass" }); break;
      case "pierce": N(0.22, 0.2, { f: 700, f2: 4000, q: 1.2 }); T(500, 0.2, "triangle", 0.08, { slide: 3 }); break;
      case "snipe": N(0.06, 0.3, { f: 5000, type: "highpass" }); T(1200, 0.18, "square", 0.08, { slide: 0.2 }); break;
      case "fire": N(0.45, 0.3, { f: 600, f2: 2500, q: 0.5 }); T(140, 0.4, "sawtooth", 0.08, { slide: 1.6 }); break;
      case "buff": [392, 523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.06, 0.18, "triangle", 0.12)); break;
      case "frost": [1568, 1976, 2349, 2794].forEach((f, i) => this.tone(f, t + i * 0.04, 0.3, "sine", 0.09)); N(0.35, 0.12, { f: 6000, type: "highpass" }); break;
      case "heal": [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.07, 0.25, "sine", 0.13)); break;
      case "meteor": T(180, 0.5, "sawtooth", 0.1, { slide: 0.3 }); N(0.5, 0.2, { f: 2500, f2: 200, type: "lowpass" }); break;
      case "kill": T(520, 0.06, "square", 0.07, { slide: 0.4 }); N(0.05, 0.12, { f: 2000 }); break;
      case "kill2": T(220, 0.14, "square", 0.12, { slide: 0.35 }); T(330, 0.1, "triangle", 0.1, { slide: 0.5 }); N(0.12, 0.2, { f: 900 }); break;
      case "bossdie": for (let i = 0; i < 6; i++) { this.tone(300 - i * 30, t + i * 0.12, 0.3, "sawtooth", 0.12, null, { slide: 0.5 }); } this.noise(t, 1.2, 0.35, { f: 1000, f2: 80, type: "lowpass" }); break;
      case "roar": T(70, 0.9, "sawtooth", 0.2, { slide: 0.6, lp: 600 }); T(95, 0.9, "square", 0.1, { slide: 0.55, lp: 500 }); N(0.9, 0.2, { f: 400, f2: 100, type: "lowpass" }); break;
      case "alert": T(660, 0.12, "square", 0.08); this.tone(880, t + 0.12, 0.16, "square", 0.08); break;
      case "summon": T(220, 0.5, "sawtooth", 0.08, { slide: 2.5, lp: 1200 }); N(0.4, 0.15, { f: 300, f2: 1800 }); break;
      case "shatter": N(0.3, 0.3, { f: 4000, f2: 800, type: "highpass" }); T(1400, 0.2, "triangle", 0.1, { slide: 0.3 }); break;
      case "charge": T(100, 1.0, "sawtooth", 0.1, { slide: 3, lp: 900 }); break;
      case "debuff": T(330, 0.3, "sawtooth", 0.1, { slide: 0.5 }); this.tone(247, t + 0.15, 0.3, "sawtooth", 0.1, null, { slide: 0.5 }); break;
      case "dodge": T(900, 0.1, "triangle", 0.08, { slide: 1.6 }); break;
      case "hurt": T(160, 0.18, "sawtooth", 0.18, { slide: 0.5 }); N(0.12, 0.25, { f: 700 }); break;
      case "arrow": N(0.09, 0.18, { f: 3000, f2: 1500 }); break;
      case "ehit": T(150, 0.1, "square", 0.1, { slide: 0.6 }); N(0.06, 0.15, { f: 800 }); break;
      case "claw": N(0.1, 0.25, { f: 4500, f2: 1200, q: 0.6 }); this.tone(900, t + 0.04, 0.09, "sawtooth", 0.06, null, { slide: 0.4 }); this.tone(700, t + 0.09, 0.09, "sawtooth", 0.06, null, { slide: 0.4 }); break;
      case "whirl": for (let i = 0; i < 6; i++) this.noise(t + i * 0.06, 0.1, 0.12, { f: 2500 - i * 150, f2: 800, q: 1.2 }); T(200, 0.4, "sawtooth", 0.06, { slide: 1.8 }); break;
      case "volley": for (let i = 0; i < 5; i++) this.noise(t + i * 0.07, 0.07, 0.14, { f: 3200, f2: 1600 }); break;
      case "venom": for (let i = 0; i < 4; i++) { this.tone(1400 - i * 80, t + i * 0.08, 0.06, "square", 0.05, null, { slide: 0.5 }); } N(0.2, 0.08, { f: 6000, type: "highpass" }); break;
      case "shard": for (let i = 0; i < 4; i++) this.tone(2000 + i * 300, t + i * 0.06, 0.12, "triangle", 0.07, null, { slide: 0.6 }); break;
      case "orbit": T(440, 0.5, "sine", 0.08, { slide: 1.5 }); this.tone(660, t + 0.15, 0.4, "sine", 0.06, null, { slide: 1.4 }); break;
      case "trap": T(180, 0.1, "square", 0.1); this.tone(140, t + 0.12, 0.12, "square", 0.08); break;
      case "blizzard": N(0.9, 0.2, { f: 5000, f2: 1500, type: "highpass" }); [1200, 1500, 1800].forEach((f, i) => this.tone(f, t + i * 0.12, 0.4, "sine", 0.04)); break;
      case "inferno": N(0.8, 0.3, { f: 400, f2: 3000, q: 0.5 }); T(90, 0.7, "sawtooth", 0.1, { slide: 1.8, lp: 700 }); break;
      case "plague": T(120, 0.7, "sawtooth", 0.07, { slide: 0.6, lp: 500 }); N(0.6, 0.15, { f: 700, f2: 300, type: "lowpass" }); break;
      case "storm": N(0.5, 0.3, { f: 200, f2: 2500, type: "lowpass" }); for (let i = 0; i < 3; i++) this.noise(t + 0.3 + i * 0.3, 0.12, 0.3, { f: 4000, f2: 600, q: 0.5 }); break;
      case "summon2": [330, 494, 659].forEach((f, i) => this.tone(f, t + i * 0.1, 0.35, "triangle", 0.1, null, { slide: 1.1 })); N(0.3, 0.08, { f: 3000, type: "highpass" }); break;
      case "voidhole": T(60, 1.0, "sine", 0.4, { slide: 3 }); T(120, 1.0, "sawtooth", 0.06, { slide: 0.3, lp: 400 }); N(0.9, 0.15, { f: 2000, f2: 150, type: "lowpass" }); break;
      // UI
      case "click": T(700, 0.05, "square", 0.08, { slide: 0.7 }); break;
      case "hover": T(1100, 0.025, "square", 0.025); break;
      case "open": T(440, 0.08, "triangle", 0.1); this.tone(660, t + 0.06, 0.1, "triangle", 0.1); break;
      case "close": T(660, 0.08, "triangle", 0.1); this.tone(440, t + 0.06, 0.1, "triangle", 0.1); break;
      case "coin": T(1318, 0.07, "square", 0.08); this.tone(1760, t + 0.07, 0.18, "square", 0.08); break;
      case "equip": N(0.07, 0.2, { f: 1200 }); T(330, 0.1, "triangle", 0.12); break;
      case "drop": T(880, 0.1, "triangle", 0.1); this.tone(1175, t + 0.08, 0.2, "triangle", 0.1); break;
      case "legend": [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, t + i * 0.07, 0.4, "square", 0.08)); [262, 330, 392].forEach((f, i) => this.tone(f, t + i * 0.07, 0.6, "triangle", 0.12)); break;
      case "levelup": [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, t + i * 0.09, 0.3, "square", 0.1)); break;
      case "quest": [587, 740, 880].forEach((f, i) => this.tone(f, t + i * 0.1, 0.25, "triangle", 0.14)); break;
      case "error": T(160, 0.18, "square", 0.1); this.tone(130, t + 0.1, 0.2, "square", 0.1); break;
      case "win": [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.12, 0.35, "square", 0.1)); [262, 330, 392, 523].forEach((f, i) => this.tone(f, t + i * 0.12, 0.45, "triangle", 0.14)); break;
      case "lose": [392, 330, 262, 196].forEach((f, i) => this.tone(f, t + i * 0.18, 0.4, "triangle", 0.15)); break;
      case "enh_ok": N(0.1, 0.3, { f: 1500 }); [784, 988, 1319].forEach((f, i) => this.tone(f, t + 0.08 + i * 0.07, 0.2, "square", 0.1)); break;
      case "enh_fail": N(0.2, 0.3, { f: 300, type: "lowpass" }); T(200, 0.3, "sawtooth", 0.12, { slide: 0.4 }); break;
      case "unique": case "unique2": {
        const big = name === "unique2";
        T(58, 0.9, "sine", 0.6, { slide: 0.5 }); N(0.9, 0.22, { f: 300, f2: 9000, q: 0.6, attack: 0.5 });
        [392, 523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => { this.tone(f, t + 0.15 + i * 0.075, 0.5, "triangle", 0.11, null, { attack: 0.01 }); this.tone(f * 2, t + 0.15 + i * 0.075, 0.35, "sine", 0.05); });
        const ch = big ? [130.8, 196, 261.6, 329.6, 392, 523.3, 659.3] : [196, 261.6, 329.6, 392, 523.3];
        ch.forEach((f, i) => { for (const d of [-0.006, 0.006]) this.tone(f * (1 + d), t + 0.85, big ? 3.2 : 2.4, "sawtooth", 0.035, null, { attack: 0.25, release: 1.2, lp: 2200 }); });
        for (let i = 0; i < (big ? 14 : 9); i++) this.tone(1800 + Math.random() * 2800, t + 1.0 + i * 0.16 + Math.random() * 0.08, 0.7, "sine", 0.05 + Math.random() * 0.03, null, { slide: 0.9 });
        T(1568, 0.1, "square", 0.05); this.tone(2093, t + 0.85, 1.4, "sine", 0.09, null, { attack: 0.02 });
        break; }
      case "key": [988, 1319, 1760, 2349].forEach((f, i) => this.tone(f, t + i * 0.06, 0.4, "sine", 0.12)); N(0.3, 0.1, { f: 6000, type: "highpass" }); break;
      case "revive": T(80, 0.6, "sine", 0.5, { slide: 0.5 }); [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + 0.1 + i * 0.07, 0.5, "triangle", 0.12)); break;
      case "orb": T(660, 0.08, "sine", 0.1, { slide: 1.8 }); N(0.12, 0.1, { f: 3000, type: "highpass" }); break;
      case "buy": T(1100, 0.06, "square", 0.08); this.tone(1650, t + 0.06, 0.12, "square", 0.08); this.tone(2200, t + 0.12, 0.2, "triangle", 0.08); break;
      case "step": T(300, 0.04, "triangle", 0.06); break;
    }
  },
  // ---- BGM ----
  trackDef(name) {
    const A = (n) => ACTS[n].mus;
    if (name === "title") return { root: 2, mode: "min", bpm: 84, style: "title", seed: 1 };
    if (name === "town") return { root: 0, mode: "maj", bpm: 92, style: "town", seed: 2 };
    if (name === "boss") return { root: 6, mode: "phr", bpm: 148, style: "boss", seed: 3 };
    if (name === "rift") return { root: 1, mode: "min", bpm: 132, style: "boss", seed: 4 };
    if (name === "hell") return { root: 5, mode: "phr", bpm: 150, style: "boss", seed: 6 };
    if (name === "endless") return { root: 8, mode: "min", bpm: 140, style: "boss", seed: 7 };
    if (name === "void") return { root: 11, mode: "phr", bpm: 152, style: "boss", seed: 8 };
    if (name === "tutorial") return { root: 4, mode: "maj", bpm: 112, style: "battle", seed: 5 };
    const m = /^battle(\d+)$/.exec(name); if (m) { const a = +m[1], u = A(a - 1); return { root: u.root, mode: u.mode, bpm: u.bpm, style: "battle", seed: 10 + a }; }
    return { root: 0, mode: "min", bpm: 100, style: "battle", seed: 9 };
  },
  buildSeq(name) {
    if (this.seqCache[name]) return this.seqCache[name];
    const def = this.trackDef(name), rr = seeded(def.seed * 7919 + 17), sc = SCALES[def.mode], BARS = 8;
    const prog = def.mode === "maj" || def.mode === "lyd" ? [0, 4, 5, 3] : [0, 5, 2, 6];
    const deg = (d) => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return sc[i] + 12 * o; };
    const seq = []; let mel = 4;   // 멜로디 위치(스케일 인덱스)
    const motif = []; for (let i = 0; i < 8; i++) motif.push(rr() < 0.25 ? null : Math.floor(rr() * 5) - 2);
    for (let bar = 0; bar < BARS; bar++) {
      const ch = prog[(bar >> 1) % 4], chordTones = [ch, ch + 2, ch + 4];
      for (let s = 0; s < 16; s++) {
        const ev = {};
        // 베이스
        if (def.style === "title") { if (s === 0) ev.bass = [deg(ch) - 24, 1.9]; }
        else if (def.style === "town") { if (s % 8 === 0) ev.bass = [deg(ch) - 24, 0.9]; if (s % 8 === 4) ev.bass = [deg(ch + 4) - 24, 0.4]; }
        else { if (s % 2 === 0) ev.bass = [deg(ch) - 24 + (s % 8 === 6 ? 12 : 0), 0.22]; }
        // 아르페지오
        if (def.style === "title") { if (s % 4 === 0) ev.arp = [deg(chordTones[(s / 4) % 3]) + 12, 0.5]; }
        else if (def.style === "town") { if (s % 2 === 0) ev.arp = [deg(chordTones[(s / 2) % 3]) + 12, 0.3]; }
        else if (s % 2 === 1 || def.style === "boss") ev.arp = [deg(chordTones[(s >> 1) % 3]) + 12, 0.12];
        // 멜로디 (2마디마다 모티프 반복 + 변주)
        const mi = (bar % 2) * 8 + (s >> 1);
        if (s % 2 === 0 && (def.style !== "title" || s % 4 === 0)) {
          const m = motif[(s >> 1) % 8];
          if (m != null && ((bar % 4) < 3 || rr() < 0.5)) { mel = clamp(ch + 7 + m + (bar >= 4 && s >= 8 ? 1 : 0), 2, 15); ev.mel = [deg(mel) + 12, def.style === "title" ? 1.0 : def.style === "town" ? 0.45 : 0.28]; }
        }
        // 드럼
        if (def.style === "battle" || def.style === "boss") {
          if (s % 8 === 0 || (def.style === "boss" && (s === 6 || s === 14))) ev.kick = true;
          if (s % 8 === 4) ev.snare = true;
          if (s % 2 === 0) ev.hat = s % 4 === 2 ? 1 : 0.5;
        }
        seq.push(ev);
      }
    }
    return (this.seqCache[name] = { def, seq, root: def.root + 48 });
  },
  playStep(S, step, t) {
    const ev = S.seq[step % S.seq.length], r = S.root, st = S.def.style, d = this.bgmG;
    const sp = 60 / S.def.bpm / 4;
    if (ev.bass) this.tone(mtof(r + ev.bass[0]), t, ev.bass[1] * sp * 4 * 0.9, st === "title" || st === "town" ? "triangle" : "square", st === "boss" ? 0.13 : 0.11, d, { lp: 600 });
    if (ev.arp) this.tone(mtof(r + ev.arp[0]), t, Math.max(0.05, ev.arp[1] * sp * 4), st === "title" ? "sine" : "square", st === "title" ? 0.1 : st === "town" ? 0.07 : 0.05, d, { lp: 2400 });
    if (ev.mel) this.tone(mtof(r + ev.mel[0]), t, ev.mel[1] * sp * 4, st === "title" ? "triangle" : st === "town" ? "triangle" : "square", st === "title" ? 0.13 : 0.075, d, { attack: 0.01, lp: 3200 });
    if (ev.kick) { this.tone(130, t, 0.14, "sine", 0.45, d, { slide: 0.3 }); }
    if (ev.snare) { this.noise(t, 0.12, 0.2, { f: 2200, q: 0.6, dest: d }); this.tone(190, t, 0.07, "triangle", 0.12, d, { slide: 0.6 }); }
    if (ev.hat) this.noise(t, 0.04, 0.07 * ev.hat, { f: 7500, type: "highpass", dest: d });
  },
  schedule() {
    if (!this.ctx || !this.track) return; const c = this.ctx; const sp = 60 / this.track.def.bpm / 4;
    while (this.nextT < c.currentTime + 0.25) { this.playStep(this.track, this.step, this.nextT); this.step++; this.nextT += sp; }
  },
  bgm(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (name === this.trackName) return;
    this.trackName = name; this.pending = null;
    const c = this.ctx;
    this.bgmG.gain.cancelScheduledValues(c.currentTime); this.bgmG.gain.setValueAtTime(this.bgmG.gain.value, c.currentTime); this.bgmG.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.25);
    setTimeout(() => {
      if (this.trackName !== name) return;
      this.track = this.buildSeq(name); this.step = 0; this.nextT = c.currentTime + 0.05;
      this.bgmG.gain.cancelScheduledValues(c.currentTime); this.bgmG.gain.setValueAtTime(0.0001, c.currentTime); this.bgmG.gain.linearRampToValueAtTime(this.vol.bgm * 0.5, c.currentTime + 0.6);
      if (!this.timer) this.timer = setInterval(() => this.schedule(), 40);
    }, 260);
  },
  stopBgm() { this.trackName = ""; this.track = null; if (this.bgmG && this.ctx) { this.bgmG.gain.cancelScheduledValues(this.ctx.currentTime); this.bgmG.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3); } },
};
function playSfx(n) { AU.sfx(n); }
