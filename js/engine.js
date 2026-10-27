/* Symbiont 0.5 — sound engine.
   SymEngine is self-contained: app.js serialises it with toString() into an AudioWorklet
   module (or runs it on the main thread through a ScriptProcessor fallback).
   Do not reference anything outside the class body. */

class SymEngine {
  constructor(sr, emit) {
    this.sr = sr; this.emit = emit;
    this.memLen = Math.floor(sr * 8); this.mem = new Float32Array(this.memLen); this.memW = 0;
    this.ovN = 240; this.ov = new Float32Array(this.ovN); this.ovBin = 0;
    this.win = new Float32Array(1025);
    for (let i = 0; i <= 1024; i++) this.win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / 1024);
    this.samples = [null, null, null, null];
    this.SC = { hira:[0,2,3,7,8], lyd:[0,2,4,6,7,9,11], harm:[0,2.04,3.86,5.51,7.02,8.41,9.69,10.88],
      pelog:[0,1.2,2.7,6.8,7.9], whole:[0,2,4,6,8,10], pent:[0,3,5,7,10], rast:[0,2,3.5,5,7,9,10.5], phryg:[0,1,3,5,7,8,10] };
    this.VOW = [[730,1090],[570,840],[530,1840],[300,870],[400,1700]];
    this.SYNC = [32, 16, 8, 4, 2, 1, 0.5, 0.25];  // beats per filter-LFO cycle when synced
    this.g = { bpm:74, mutate:0.25, drift:0.3, scale:'hira', root:45, width:1.15, memFeed:0.5, freeze:0,
      pressure:1, eco:0.3, ecoRate:0.3, motion:1, doppler:0.4 };
    this.stir = { x:0, y:0, a:0, vx:0, vy:0, spd:0 };
    // Four-species competitive Lotka–Volterra system in its chaotic regime (Vano et al. 2006)
    this.eco = { x:[0.31,0.42,0.53,0.38], r:[1,0.72,1.53,1.27],
      A:[[1,1.09,1.52,0],[0,1,0.44,1.36],[2.33,0,1,0.47],[1.21,0.51,0.35,1]] };
    this.V = [];
    for (let i = 0; i < 4; i++) this.V.push(this.mkV(i));
    this.T = [];
    for (let i = 0; i < 4; i++) this.T.push({ rate:0.05, shape:0, target:0, depth:0, spread:0.5, mask:[1,1,1,1],
      ph:Math.random(), last:[-9,-9,-9,-9], prev:[0,0,0,0], next:[0,0,0,0], val:[0,0,0,0], lx:[0.31,0.52,0.73,0.24] });
    this.G = [];
    for (let i = 0; i < 192; i++) this.G.push({ on:0 });
    this.bL = []; this.bR = [];
    for (let i = 0; i < 4; i++) { this.bL.push(new Float32Array(2048)); this.bR.push(new Float32Array(2048)); }
    this.dL = new Float32Array(2048); this.dR = new Float32Array(2048);
    this.wL = new Float32Array(2048); this.wR = new Float32Array(2048);
    this.stC = 0; this.stEvery = Math.floor(sr / 30); this.gEv = []; this.trEv = []; this.ovT = 0;
    this.dcx = 0; this.dcy = 0; this.mlp = 0; this.menv = 0; this.mgain = 1; this.time = 0;
    for (let i = 0; i < 4; i++) this.euclid(i);
  }

  mkV(i) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    return { i, p:{ gate:1, gain:0.7, bx:Math.sin(a)*0.55, by:-Math.cos(a)*0.55, oct:0, tune:0, glide:0.2,
        body:0.45, fold:0.2, fb:0.1, ratio:2, index:0, fm:[0,0,0,0],
        fmFb:0, fmEnv:0, fbTime:0, bondAmt:1, dType:0, leap:0,
        roar:0, ring:0, hum:0, sing:0, crush:0,
        fmode:0, tone:0.6, res:0.2, keyTrk:0, flRate:0.3, flSync:0, flDepth:0, flShape:0, flEnv:0, flSpace:0, flFM:0,
        orbShape:0, orbAround:0, orbSpeed:0, orbDir:1, orbX:0.25, orbY:0.15, orbTilt:0, orbSwing:0, orbBreath:0, orbJump:0,
        src:0, cloud:0.5, density:10, size:0.35, pos:0.3, spray:0.3, trans:0, scatter:4, rev:0.15, width:0.6, track:1,
        pulse:1, steps:16, hits:5, rot:0, div:1, prob:0.9, attack:0.004, decay:0.4, wander:0.4 },
      pat:[], ph:Math.random(), ph2:Math.random(), ph3:Math.random(), phs:0, pht:Math.random(), sx:0, sxp:0, nsx:0,
      deg:0, freq:110, inc:0, inc0:0, env:0, att:0, velo:1, burst:0, step:-1, clk:0,
      s:[0,0,0,0], fs:new Float32Array(4), fa:[0,0,0,0,0,0], fsg:[0,0],
      cb:new Float32Array(4096), cw:0, cl:100, lp:0, chc:0, chv:0,
      dlL:new Float32Array(128), dlR:new Float32Array(128), dw:0, itdL:0, itdR:0, nitdL:0, nitdR:0, hsL:0, hsR:0, haL:1, haR:1, nhaL:1, nhaR:1,
      orbPh:Math.random(), wpx:0, wpy:0, wnx:0, wny:0, wc:-1,
      swPh:Math.random(), swC:-1, swPrev:0, swNext:0, flip:1, brPh:Math.random(), octOff:0,
      fbBuf:new Float32Array(1024), fbW:0, mo:0, rdx:0, rdy:0,
      flPh:Math.random(), flC:-1, flPrev:0, flNext:0, flX:0.37, fl:0, lfs:0, fnorm:0.5,
      ex:0, ey:0, pan:0, dist:0.5, prevR:-1, dop:0, vibPh:Math.random(), vowPh:Math.random(), prox:0,
      gL:0.7, gR:0.7, dG:0, wG:0, ngL:0.7, ngR:0.7, ndG:0, nwG:0, lvl:0, gacc:0,
      dr:{ th:0, r:0, pos:0, tone:0, fold:0 }, m:new Float32Array(20) };
  }

  euclid(i) {
    const v = this.V[i], p = v.p, n = Math.max(1, p.steps | 0), k = Math.min(p.hits | 0, n), r = p.rot | 0;
    const a = [];
    for (let s = 0; s < n; s++) { const j = ((s - r) % n + n) % n; a.push(Math.floor((j + 1) * k / n) - Math.floor(j * k / n) > 0 ? 1 : 0); }
    v.pat = a; if (v.step >= n) v.step = -1;
    this.emit({ t:'pat', i, pat:a.slice(), hits:p.hits, rot:p.rot });
  }

  semi(deg) {
    const sc = this.SC[this.g.scale] || this.SC.hira, L = sc.length, o = Math.floor(deg / L);
    return sc[deg - o * L] + 12 * o;
  }

  handle(m) {
    if (m.t === 'v') {
      const v = this.V[m.i];
      if (m.k === 'fm') v.p.fm[m.j] = m.val;
      else if (m.k === 'patStep') { v.pat[m.j] = v.pat[m.j] ? 0 : 1; this.emit({ t:'pat', i:m.i, pat:v.pat.slice(), hits:v.p.hits, rot:v.p.rot }); }
      else { v.p[m.k] = m.val; if (m.k === 'steps' || m.k === 'hits' || m.k === 'rot') this.euclid(m.i); }
    } else if (m.t === 'g') { this.g[m.k] = m.val; }
    else if (m.t === 'stir') { Object.assign(this.stir, m); }
    else if (m.t === 'tide') { const t = this.T[m.i]; t[m.k] = Array.isArray(m.val) ? m.val.slice() : m.val; }
    else if (m.t === 'sample') { this.samples[m.i] = m.data; }
    else if (m.t === 'clearMem') { this.mem.fill(0); this.ov.fill(0); }
    else if (m.t === 'state') {
      for (let i = 0; i < 4; i++) { const src = m.voices[i]; Object.assign(this.V[i].p, src); this.V[i].p.fm = src.fm.slice(); this.euclid(i); }
      Object.assign(this.g, m.g);
      for (let i = 0; i < 4; i++) { const s = m.tides[i], t = this.T[i];
        t.rate = s.rate; t.shape = s.shape; t.target = s.target; t.depth = s.depth; t.spread = s.spread; t.mask = s.mask.slice(); }
    }
  }

  advance(i) {
    const v = this.V[i], p = v.p, n = v.pat.length || 1;
    v.step = (v.step + 1) % n;
    if (v.step === 0) {
      if (Math.random() < this.g.mutate * 0.6) this.mutate(i);
      if (!p.pulse && Math.random() < p.wander * 0.5) this.walk(v, 1);
    }
    if (p.pulse && v.pat[v.step] && Math.random() < p.prob) this.trigger(i, p.wander);
  }
  trigger(i, wander) {
    const v = this.V[i];
    this.walk(v, wander); v.att = 1; v.burst = 1; v.velo = 0.55 + 0.45 * Math.random(); this.trEv.push(i);
    if (v.p.orbJump > 0 && Math.random() < v.p.orbJump) { v.orbPh += 0.15 + Math.random() * 0.7; v.wc = -1; }
  }
  walk(v, pr) {
    if (Math.random() >= pr) return;
    const st = [-2, -1, -1, 1, 1, 2, 3, -3];
    let d = v.deg + st[(Math.random() * st.length) | 0];
    if (Math.random() < 0.14) d = 0;
    v.deg = Math.max(-5, Math.min(12, d));
    const L = Math.round(v.p.leap);
    if (L > 0 && Math.random() < 0.5) v.octOff = Math.round((Math.random() * 2 - 1) * L);
  }
  mutate(i) {
    const v = this.V[i], p = v.p, r = Math.random(), n = v.pat.length;
    if (r < 0.3) { p.hits = Math.max(1, Math.min(n - 1, p.hits + (Math.random() < 0.5 ? -1 : 1))); this.euclid(i); }
    else if (r < 0.55) { p.rot = (p.rot + (Math.random() < 0.5 ? n - 1 : 1)) % n; this.euclid(i); }
    else { const j = (Math.random() * n) | 0; v.pat[j] = v.pat[j] ? 0 : 1; this.emit({ t:'pat', i, pat:v.pat.slice(), hits:p.hits, rot:p.rot }); }
  }

  spawn(i, wait, dens) {
    const v = this.V[i], p = v.p, m = v.m;
    let gr = null;
    for (let k = 0; k < this.G.length; k++) if (!this.G[k].on) { gr = this.G[k]; break; }
    if (!gr) return;
    const sr = this.sr, R = Math.random;
    const sizeN = Math.max(0, Math.min(1, p.size + m[5] * 0.5));
    const durS = 0.008 * Math.pow(200, sizeN) * (0.8 + 0.4 * R());
    const dur = Math.max(64, Math.floor(durS * sr));
    const L = (this.SC[this.g.scale] || this.SC.hira).length;
    const k = Math.round((R() * 2 - 1) * p.scatter * L / 12);
    const semis = p.trans + this.semi((p.track ? v.deg : 0) + k) + (p.track ? v.octOff * 12 : 0) + m[2] * 12 + p.tune + v.dop + (R() - 0.5) * 0.12;
    let rate = Math.pow(2, semis / 12);
    if (R() < p.rev) rate = -rate;
    const ar = Math.abs(rate);
    const posBase = Math.max(0, Math.min(1, p.pos + m[6] * 0.5 + v.dr.pos));
    const smp = this.samples[i];
    let buf, len, start, posN;
    if (p.src === 1 && smp && smp.length > dur * ar + 8) {
      buf = smp; len = smp.length;
      let pp = posBase + (R() - 0.5) * p.spray;
      pp = ((pp % 1) + 1) % 1;
      start = pp * len; posN = -1;
      if (rate < 0) start += dur * ar;
    } else {
      buf = this.mem; len = this.memLen;
      const need = dur * ar + 512;
      let back = need + posBase * Math.max(0, len * 0.82 - need) + R() * p.spray * len * 0.18;
      back = Math.min(back, len - 2);
      start = this.memW - back; if (start < 0) start += len;
      posN = start / len;
      if (rate < 0) start += dur * ar;
    }
    while (start >= len) start -= len;
    const w = Math.max(0, Math.min(1, p.width + m[8]));
    const pan = Math.max(-1, Math.min(1, v.pan + (R() * 2 - 1) * w * 1.3));
    const a = (pan + 1) * Math.PI / 4;
    const overlap = dens * durS;
    let amp = p.cloud * 1.15 / Math.sqrt(Math.max(1, overlap));
    if (p.pulse) amp *= 0.3 + 0.7 * v.env;
    gr.on = 1; gr.v = i; gr.buf = buf; gr.len = len; gr.pos = start; gr.rate = rate; gr.dur = dur; gr.t = 0;
    gr.winK = 1024 / dur; gr.amp = amp; gr.gl = Math.cos(a); gr.gr = Math.sin(a); gr.wait = wait;
    if (this.gEv.length < 26) this.gEv.push([i, pan, posN, durS, semis]);
  }

  process(inL, inR, o0, o1, o2, o3, n) {
    const sr = this.sr, g = this.g, V = this.V, TAU = Math.PI * 2, M = g.motion, eco = this.eco;
    const cl = (x, a, b) => x < a ? a : x > b ? b : x;
    const ftanh = x => x < -3 ? -1 : x > 3 ? 1 : x * (27 + x * x) / (27 + 9 * x * x);
    this.time += n / sr;
    const bdt = n / sr;

    // ---- ecology
    const edt = (0.0004 + g.ecoRate * g.ecoRate * 0.05) * n / 128;
    const ex = eco.x, nx = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      let s = 0; for (let j = 0; j < 4; j++) s += eco.A[i][j] * ex[j];
      nx[i] = ex[i] + edt * eco.r[i] * ex[i] * (1 - s) + 0.00002 + V[i].prox * 0.004;
    }
    for (let i = 0; i < 4; i++) ex[i] = cl(nx[i], 0.0005, 1.4);

    // ---- tides
    for (const t of this.T) {
      t.ph += t.rate * bdt; if (t.ph > 1e5) t.ph -= 1e5;
      for (let i = 0; i < 4; i++) {
        const p = t.ph + i * t.spread * 0.25, c = Math.floor(p), f = p - c;
        if (c !== t.last[i]) {
          t.last[i] = c; t.prev[i] = t.next[i];
          if (t.shape === 5) { let x = 3.93 * t.lx[i] * (1 - t.lx[i]); if (x < 0.002 || x > 0.998) x = Math.random(); t.lx[i] = x; t.next[i] = x * 2 - 1; }
          else t.next[i] = Math.random() * 2 - 1;
        }
        let val;
        switch (t.shape) {
          case 0: val = Math.sin(TAU * f); break;
          case 1: val = 1 - 4 * Math.abs(f - 0.5); break;
          case 2: val = f * 2 - 1; break;
          case 4: val = t.next[i]; break;
          case 6: val = cl(ex[i] * 2 - 1, -1, 1); break;
          case 7: val = cl(V[i].lvl * 4 - 1, -1, 1); break;
          default: val = t.prev[i] + (t.next[i] - t.prev[i]) * (0.5 - 0.5 * Math.cos(Math.PI * f));
        }
        t.val[i] = val;
      }
    }
    for (const v of V) v.m.fill(0);
    for (const t of this.T) if (t.depth) for (let i = 0; i < 4; i++) if (t.mask[i]) V[i].m[t.target] += t.val[i] * t.depth;

    // ---- per-voice block setup
    const step16 = 60 / Math.max(10, g.bpm) / 4 * sr;
    const dk = g.drift * 0.03;
    const st = this.stir;
    for (let i = 0; i < 4; i++) {
      const v = V[i], p = v.p, m = v.m, d = v.dr;
      for (const k in d) d[k] += (Math.random() * 2 - 1) * dk - d[k] * 0.004;

      v.prox = 0;
      if (st.a > 0) { const dx = v.ex - st.x, dy = v.ey - st.y; v.prox = st.a * Math.exp(-(dx * dx + dy * dy) / 0.1); }
      const prox = v.prox;
      if (p.pulse && prox > 0.35 && Math.random() < prox * 0.05 * (1 + st.spd)) this.trigger(i, 0.6);

      v.clk += n; const sl = step16 * p.div;
      let guard = 0; while (v.clk >= sl && guard++ < 8) { v.clk -= sl; this.advance(i); }

      const roar = cl(p.roar + m[10] + prox * 0.3, 0, 1), ring = cl(p.ring + m[11], 0, 1);
      const hum = cl(p.hum + m[12], 0, 1), sing = cl(p.sing + m[13], 0, 1), crush = cl(p.crush + m[16], 0, 1);
      v.roar = roar; v.ringA = ring; v.hum = hum; v.sing = sing; v.crush = crush;

      // ---- space: each organism travels its own path
      let spd = p.orbSpeed > 0 ? 0.004 * Math.pow(2000, p.orbSpeed) * Math.pow(2, m[14] * 2) : 0;
      // swing: the orbit keeps speeding up, slowing down and, when strong, turning back
      if (p.orbSwing > 0) {
        v.swPh += (0.08 + spd * 0.25) * bdt;
        const c = Math.floor(v.swPh), f = v.swPh - c;
        if (c !== v.swC) { v.swC = c; v.swPrev = v.swNext; v.swNext = Math.random() * 2 - 1; if (p.orbSwing > 0.4 && Math.random() < (p.orbSwing - 0.4) * 0.9) v.flip = -v.flip; }
        const sw = v.swPrev + (v.swNext - v.swPrev) * (0.5 - 0.5 * Math.cos(Math.PI * f));
        spd *= Math.pow(2, p.orbSwing * 2.5 * sw);
      } else v.flip = 1;
      v.orbPh += spd * p.orbDir * v.flip * bdt;
      v.brPh += (0.04 + spd * 0.37) * bdt; if (v.brPh > 1e4) v.brPh -= Math.floor(v.brPh);
      const brK = 1 - p.orbBreath * 0.88 * (0.5 + 0.5 * Math.sin(TAU * v.brPh)); if (v.orbPh > 1e4 || v.orbPh < -1e4) { v.orbPh -= Math.floor(v.orbPh); v.wc = -1; }
      const ph = TAU * v.orbPh, ax = p.orbX, ay = p.orbY;
      let lx, ly;
      switch (p.orbShape) {
        case 1: lx = ax * Math.sin(ph); ly = ay * Math.sin(2 * ph); break;
        case 2: lx = ax * Math.sin(ph); ly = ay * (0.5 - 0.5 * Math.cos(2 * ph)) - ay * 0.5; break;
        case 3: { const k = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(ph * 0.23)); lx = ax * k * Math.cos(ph); ly = ay * k * Math.sin(ph); break; }
        case 4: {
          const c = Math.floor(v.orbPh), f = v.orbPh - c;
          if (c !== v.wc) {
            v.wc = c; v.wpx = v.wnx; v.wpy = v.wny;
            const an = Math.random() * TAU, rr = Math.sqrt(Math.random());
            v.wnx = Math.cos(an) * rr; v.wny = Math.sin(an) * rr;
          }
          const e = 0.5 - 0.5 * Math.cos(Math.PI * f);
          lx = ax * (v.wpx + (v.wnx - v.wpx) * e); ly = ay * (v.wpy + (v.wny - v.wpy) * e); break;
        }
        default: lx = ax * Math.cos(ph); ly = ay * Math.sin(ph);
      }
      lx *= brK; ly *= brK;
      const tc = Math.cos(p.orbTilt), ts = Math.sin(p.orbTilt);
      const rx = lx * tc - ly * ts, ry = lx * ts + ly * tc;
      let px, py;
      if (p.orbAround) { const k = Math.min(1, M); px = p.bx + (rx - p.bx) * k; py = p.by + (ry - p.by) * k; }
      else { px = p.bx + rx * M; py = p.by + ry * M; }
      let r0 = Math.hypot(px, py); if (r0 > 1) { px /= r0; py /= r0; r0 = 1; }
      const th0 = Math.atan2(px, -py);
      const r = cl(r0 + (m[1] * 0.6 + d.r * 0.4) * M, 0.03, 1);
      const th = th0 + (m[0] * Math.PI + d.th * 1.5) * M;
      v.ex = r * Math.sin(th); v.ey = -r * Math.cos(th);
      if (v.prevR >= 0) { const vel = (r - v.prevR) / bdt; v.dop += (cl(-vel * g.doppler * 1.2, -3, 3) - v.dop) * 0.2; }
      v.prevR = r; v.dist = r;
      v.pan = cl(v.ex * 1.5, -1, 1);
      const a = (v.pan + 1) * Math.PI / 4, front = Math.cos(th);
      v.ngL = Math.cos(a); v.ngR = Math.sin(a);
      const maxItd = 0.00075 * sr;
      v.nitdL = Math.max(0, v.pan) * maxItd; v.nitdR = Math.max(0, -v.pan) * maxItd;
      // head shadow: the far ear loses its top end
      const sh = fc => 1 - Math.exp(-TAU * fc / sr);
      v.nhaL = v.pan > 0 ? sh(20000 * Math.pow(0.08, v.pan)) : 1;
      v.nhaR = v.pan < 0 ? sh(20000 * Math.pow(0.08, -v.pan)) : 1;
      const ecoG = 1 + g.eco * (0.25 + 1.2 * ex[i] - 1);
      const lv = p.gain * p.gate * Math.max(0, ecoG) * cl(1 + m[15], 0, 2);
      v.ndG = (1 - 0.88 * Math.pow(r, 1.1)) * lv;
      v.nwG = (0.08 + 1.0 * r) * lv;
      v.bright = (0.4 + 0.6 * (front * 0.5 + 0.5)) * (1 - 0.4 * r);

      // ---- pitch
      v.vibPh += (4.6 + i * 0.37) * bdt; if (v.vibPh > 1) v.vibPh -= 1;
      const vib = Math.sin(TAU * v.vibPh) * sing * 0.22;
      const bend = cl(-st.vy * prox * 1.5, -2, 2);
      const midi = g.root + 12 * (p.oct + v.octOff) + p.tune + this.semi(v.deg) + m[2] * 12 + v.dop + vib + bend;
      const tf = 440 * Math.pow(2, (cl(midi, 0, 130) - 69) / 12);
      v.freq += (tf - v.freq) * (1 - Math.exp(-n / (sr * (0.002 + p.glide * p.glide * 3))));
      v.inc0 = v.inc || v.freq / sr; v.inc = v.freq / sr;

      // ---- core: sine carrier bent by itself, its bonds and one harmonic operator
      const fold = cl(p.fold + m[9] + d.fold * 0.4, 0, 1);
      v.drive = 1 + Math.pow(fold, 1.5) * 14; v.norm = 1 / Math.sin(Math.min(v.drive, Math.PI / 2));
      const bs = cl(1 + m[3], 0, 3) * g.pressure * (1 + prox * 1.5) * (1 + g.eco * ex[i] * 0.5);
      v.fk = [0, 0, 0, 0];
      for (let j = 0; j < 4; j++) if (j !== i) v.fk[j] = Math.pow(p.fm[j], 1.5) * 6 * bs * p.bondAmt;
      v.fbk = Math.pow(cl(p.fb + m[19], 0, 1), 1.2) * 3.2;
      v.fbD = p.fbTime > 0.002 ? 1 + p.fbTime * p.fbTime * 960 : 0;
      v.rat = p.ratio; v.idx0 = Math.pow(cl(p.index + m[18], 0, 1), 1.3) * 8; v.fmEnv = p.fmEnv;
      v.mfb = Math.pow(p.fmFb, 1.2) * 1.7;
      v.bell = ring * 2.4; v.bellFloor = 0.25;
      v.humOn = hum > 0.002; v.twR = Math.pow(2, (4 + hum * 9) / 1200); v.twG = hum * 0.75; v.subG = hum * 0.55; v.humN = 1 / (1 + hum * 0.55);
      v.roarOn = roar > 0.002; v.dType = p.dType | 0; v.drv = 1 + Math.pow(roar, 1.3) * (v.dType === 0 ? 14 : 24);
      v.bias = v.dType === 0 || v.dType === 1 ? roar * 0.35 : 0; v.tb = v.dType === 0 ? ftanh(v.bias) : 0;
      v.roarN = v.dType === 0 ? 1 / Math.max(0.3, ftanh(v.drv + v.bias) - v.tb) * 0.9 : v.dType === 3 ? 3.2 : 0.85;
      v.ringOn = ring > 0.002; v.cfb = 0.6 + ring * 0.35; v.cDamp = 0.35 + ring * 0.35; v.cl = cl(sr / v.freq, 2, 4090);
      v.cWet = ring * 0.55; v.cN = (1 - v.cfb) * 1.8;
      v.crushOn = crush > 0.002; v.chN = 1 + Math.floor(crush * crush * 48); v.chQ = Math.pow(2, 14 - crush * 11); v.crushMix = Math.min(1, crush * 4);
      v.singOn = sing > 0.002;
      if (v.singOn) {
        v.vowPh += 0.05 * bdt;
        let vp = (v.vowPh + m[7] * 0.3 + i * 0.27) * 5; vp = ((vp % 5) + 5) % 5;
        const a0 = Math.floor(vp), b0 = (a0 + 1) % 5, fr = vp - a0, kq = 1 / 4.5;
        for (let k = 0; k < 2; k++) {
          const fc = cl(this.VOW[a0][k] + (this.VOW[b0][k] - this.VOW[a0][k]) * fr, 80, sr * 0.45);
          const gg = Math.tan(Math.PI * fc / sr), a1 = 1 / (1 + gg * (gg + kq));
          v.fa[k * 3] = a1; v.fa[k * 3 + 1] = gg * a1; v.fa[k * 3 + 2] = gg * gg * a1; v.fsg[k] = kq * (k ? 0.6 : 1);
        }
        v.sWet = sing * 0.6;
      }
      v.bodyG = p.body;
      v.attC = 1 - Math.exp(-1 / (sr * Math.max(0.002, p.attack)));
      v.decC = Math.exp(-1 / (sr * Math.max(0.01, p.decay)));

      if (p.gate && p.cloud > 0.001) {
        const dens = Math.max(0.2, p.density * Math.pow(2, m[4] * 3) * (p.pulse ? 0.3 + v.env * 2.4 : 1) * (1 + prox * 5) * (1 + g.eco * ex[i] * 0.6));
        v.gacc += dens * bdt;
        let c = 0; while (v.gacc >= 1 && c++ < 14) { v.gacc -= 1; this.spawn(i, (Math.random() * n) | 0, dens); }
        if (v.burst) { v.burst = 0; const b = 2 + Math.min(6, (p.density / 10) | 0); for (let q = 0; q < b; q++) this.spawn(i, (Math.random() * n) | 0, dens + 10); }
      } else { v.gacc = 0; v.burst = 0; }
    }

    // ---- organisms, sample by sample
    for (let s = 0; s < n; s++) {
      const q0 = V[0].sx, q1 = V[1].sx, q2 = V[2].sx, q3 = V[3].sx, f = s / n;
      for (let i = 0; i < 4; i++) {
        const v = V[i], fk = v.fk;
        const inc = v.inc0 + (v.inc - v.inc0) * f;
        // averaging the last two outputs keeps strong self-feedback from hunting into noise
        let fbs;
        if (v.fbD) { let rp = v.fbW - v.fbD; if (rp < 0) rp += 1024; const ri = rp | 0, rf = rp - ri; fbs = v.fbBuf[ri] + (v.fbBuf[(ri + 1) & 1023] - v.fbBuf[ri]) * rf; }
        else fbs = (v.sx + v.sxp) * 0.5;
        let pm = v.fbk * fbs + fk[0] * q0 + fk[1] * q1 + fk[2] * q2 + fk[3] * q3;
        const idx = v.idx0 * (1 - v.fmEnv + v.fmEnv * v.env);
        if (idx > 0.0005 || v.mfb > 0) {
          const mo = Math.sin(TAU * v.ph2 + v.mfb * v.mo); v.mo = mo;
          pm += idx * mo; v.ph2 += inc * v.rat; if (v.ph2 >= 1) v.ph2 -= Math.floor(v.ph2);
        }
        if (v.bell > 0) { pm += v.bell * (v.bellFloor + v.env) * Math.sin(TAU * v.ph3); v.ph3 += inc * 3.5; if (v.ph3 >= 1) v.ph3 -= Math.floor(v.ph3); }
        const x = Math.sin(TAU * v.ph + pm);
        v.ph += inc; if (v.ph >= 1) v.ph -= 1;
        v.nsx = x; v.fbBuf[v.fbW] = x; v.fbW = (v.fbW + 1) & 1023;
        let c = Math.sin(x * v.drive) * v.norm;
        if (v.humOn) {
          c = (c + Math.sin(TAU * v.pht + pm * 0.5) * v.twG + Math.sin(TAU * v.phs) * v.subG) * v.humN;
          v.pht += inc * v.twR; if (v.pht >= 1) v.pht -= 1;
          v.phs += inc * 0.5; if (v.phs >= 1) v.phs -= 1;
        }
        if (v.ringOn) {
          const b = v.cb, w = v.cw;
          let rp = w - v.cl; if (rp < 0) rp += 4096; const ri = rp | 0, rf = rp - ri;
          const dd = b[ri] + (b[(ri + 1) & 4095] - b[ri]) * rf;
          v.lp += (dd - v.lp) * v.cDamp;
          b[w] = c * 0.5 + v.lp * v.cfb; v.cw = (w + 1) & 4095;
          c = c * (1 - v.cWet * 0.5) + v.lp * v.cWet * v.cN * 2;
        }
        if (v.singOn) {
          const fs = v.fs, fa = v.fa; let sum = 0;
          for (let k = 0; k < 2; k++) {
            const i1 = fs[k * 2], i2 = fs[k * 2 + 1], v3 = c - i2;
            const v1 = fa[k * 3] * i1 + fa[k * 3 + 1] * v3, v2 = i2 + fa[k * 3 + 1] * i1 + fa[k * 3 + 2] * v3;
            fs[k * 2] = 2 * v1 - i1; fs[k * 2 + 1] = 2 * v2 - i2; sum += v1 * v.fsg[k];
          }
          c = c * (1 - v.sWet) + sum * v.sWet * 3.2;
        }
        if (v.roarOn) {
          const z = c * v.drv + v.bias; let zz;
          switch (v.dType) {
            case 1: zz = z > 1 ? 1 : z < -1 ? -1 : z; break;                                   // fuzz: hard clip
            case 2: zz = Math.sin(z * 1.2); break;                                              // fold: wraps back on itself
            case 3: { const t = Math.abs(c) * (1.5 + v.roar * 6); zz = t > 3 ? 1 : t * (27 + t * t) / (27 + 9 * t * t); break; } // rectify: octave up
            default: zz = z < -3 ? -1 : z > 3 ? 1 : z * (27 + z * z) / (27 + 9 * z * z);       // tube
          }
          const dz = (zz - v.tb) * v.roarN, hp = dz - v.rdx + 0.997 * v.rdy; v.rdx = dz; v.rdy = hp;
          c = c + (hp - c) * Math.min(1, v.roar * 3);
        }
        if (v.crushOn) {
          if (++v.chc >= v.chN) { v.chc = 0; v.chv = Math.round(c * v.chQ) / v.chQ; }
          c = c + (v.chv - c) * v.crushMix;
        }
        if (v.p.pulse) {
          if (v.att) { v.env += (v.velo * 1.04 - v.env) * v.attC; if (v.env >= v.velo) v.att = 0; }
          else v.env *= v.decC;
        } else v.env += (1 - v.env) * v.attC * 0.25;
        const o = c * v.env * v.bodyG;
        const gl = v.gL + (v.ngL - v.gL) * f, gr = v.gR + (v.ngR - v.gR) * f;
        this.bL[i][s] = o * gl; this.bR[i][s] = o * gr;
      }
      for (let i = 0; i < 4; i++) { V[i].sxp = V[i].sx; V[i].sx = V[i].nsx; }
    }

    // ---- grains
    const win = this.win;
    for (const gr of this.G) {
      if (!gr.on) continue;
      const bl = this.bL[gr.v], br = this.bR[gr.v], buf = gr.buf, len = gr.len;
      let s = gr.wait; gr.wait = 0;
      let pos = gr.pos, t = gr.t;
      const rate = gr.rate, dur = gr.dur, wk = gr.winK, al = gr.amp * gr.gl, ar = gr.amp * gr.gr;
      for (; s < n; s++) {
        if (t >= dur) { gr.on = 0; break; }
        const i0 = pos | 0; let i1 = i0 + 1; if (i1 >= len) i1 = 0;
        const x = buf[i0] + (buf[i1] - buf[i0]) * (pos - i0);
        const w = win[(t * wk) | 0];
        bl[s] += x * w * al; br[s] += x * w * ar;
        t++; pos += rate; if (pos >= len) pos -= len; else if (pos < 0) pos += len;
      }
      gr.pos = pos; gr.t = t;
    }

    // ---- moving filter, interaural delay, head shadow, distance, buses
    const dL = this.dL, dR = this.dR, wL = this.wL, wR = this.wR, L30 = Math.log2(30);
    dL.fill(0, 0, n); dR.fill(0, 0, n); wL.fill(0, 0, n); wR.fill(0, 0, n);
    for (let i = 0; i < 4; i++) {
      const v = V[i], p = v.p, m = v.m, bl = this.bL[i], br = this.bR[i], stt = v.s;
      const DL = v.dlL, DR = v.dlR, mode = p.fmode;
      const res = cl(p.res + m[17] * 0.5, 0, 1), kk = 2 - 1.98 * Math.pow(res, 0.8);
      const flRate = p.flSync ? (g.bpm / 60) / this.SYNC[Math.round(cl(p.flRate, 0, 1) * 7)] : 0.02 * Math.pow(2000, cl(p.flRate, 0, 1));
      const baseOct = L30 + cl(p.tone + m[7] * 0.5 + v.dr.tone * 0.5, 0, 1) * 9.5 + Math.log2(v.bright)
        - v.hum * 0.6 + v.sing * 0.3 + p.flSpace * (1 - v.dist * 2) * 2.5 + p.keyTrk * Math.log2(v.freq / 110);
      const fmA = p.flFM * p.flFM * 5, perSample = fmA > 0.001; const bpG = Math.sqrt(kk);
      let a1 = 0, a2 = 0, a3 = 0, pk = 0, oct = baseOct;
      for (let s = 0; s < n; s++) {
        if ((s & 7) === 0) {
          const ph = v.flPh + flRate * s / sr, c = Math.floor(ph), fr = ph - c;
          if (c !== v.flC) {
            v.flC = c; v.flPrev = v.flNext;
            if (p.flShape === 4) { let x = 3.93 * v.flX * (1 - v.flX); if (x < 0.002 || x > 0.998) x = Math.random(); v.flX = x; v.flNext = x * 2 - 1; }
            else v.flNext = Math.random() * 2 - 1;
          }
          let lf;
          switch (p.flShape) {
            case 1: lf = 1 - 4 * Math.abs(fr - 0.5); break;
            case 2: case 4: lf = v.flPrev + (v.flNext - v.flPrev) * (0.5 - 0.5 * Math.cos(Math.PI * fr)); break;
            case 3: lf = v.flNext; break;
            case 5: lf = 1 - 2 * fr; break;
            default: lf = Math.sin(TAU * fr);
          }
          v.fl = lf;
          v.lfs += (lf * p.flDepth * 6 + v.env * p.flEnv * 6 - v.lfs) * (p.flShape === 3 || p.flShape === 5 ? 0.6 : 0.35);
          oct = baseOct + v.lfs;
          if (!perSample) {
            const gg = Math.tan(Math.PI * cl(Math.pow(2, oct), 20, sr * 0.45) / sr);
            a1 = 1 / (1 + gg * (gg + kk)); a2 = gg * a1; a3 = gg * a2;
          }
        }
        const xl = bl[s], xr = br[s];
        if (perSample) {
          const gg = Math.tan(Math.PI * cl(Math.pow(2, oct + (xl + xr) * fmA), 20, sr * 0.45) / sr);
          a1 = 1 / (1 + gg * (gg + kk)); a2 = gg * a1; a3 = gg * a2;
        }
        const f = s / n;
        let v3 = xl - stt[1]; let v1 = a1 * stt[0] + a2 * v3; let v2 = stt[1] + a2 * stt[0] + a3 * v3;
        stt[0] = 2 * v1 - stt[0]; stt[1] = 2 * v2 - stt[1];
        const yl = mode === 1 ? v1 * bpG : mode === 2 ? xl - kk * v1 - v2 : mode === 3 ? xl - kk * v1 : v2;
        v3 = xr - stt[3]; v1 = a1 * stt[2] + a2 * v3; v2 = stt[3] + a2 * stt[2] + a3 * v3;
        stt[2] = 2 * v1 - stt[2]; stt[3] = 2 * v2 - stt[3];
        const yr = mode === 1 ? v1 * bpG : mode === 2 ? xr - kk * v1 - v2 : mode === 3 ? xr - kk * v1 : v2;
        const w = v.dw; DL[w] = yl; DR[w] = yr; v.dw = (w + 1) & 127;
        const tl = v.itdL + (v.nitdL - v.itdL) * f, tr = v.itdR + (v.nitdR - v.itdR) * f;
        let rp = w - tl; if (rp < 0) rp += 128; let ri = rp | 0, rf = rp - ri;
        let ol = DL[ri] + (DL[(ri + 1) & 127] - DL[ri]) * rf;
        rp = w - tr; if (rp < 0) rp += 128; ri = rp | 0; rf = rp - ri;
        let or = DR[ri] + (DR[(ri + 1) & 127] - DR[ri]) * rf;
        v.hsL += (ol - v.hsL) * (v.haL + (v.nhaL - v.haL) * f); ol = v.hsL;
        v.hsR += (or - v.hsR) * (v.haR + (v.nhaR - v.haR) * f); or = v.hsR;
        const dg = v.dG + (v.ndG - v.dG) * f, wg = v.wG + (v.nwG - v.wG) * f;
        dL[s] += ol * dg; dR[s] += or * dg; wL[s] += ol * wg; wR[s] += or * wg;
        const ab = Math.max(Math.abs(ol), Math.abs(or)) * (dg + wg * 0.5); if (ab > pk) pk = ab;
        bl[s] = 0; br[s] = 0;
      }
      v.flPh += flRate * bdt; if (v.flPh > 1e4) { v.flPh -= Math.floor(v.flPh); v.flC = -1; }
      v.fnorm = cl((oct - L30) / 9.5, 0, 1);
      if (!(stt[0] === stt[0]) || Math.abs(stt[0]) > 1e4) { stt[0] = stt[1] = stt[2] = stt[3] = 0; }
      if (!(v.hsL === v.hsL) || !(v.hsR === v.hsR)) { v.hsL = v.hsR = 0; v.dlL.fill(0); v.dlR.fill(0); }
      if (!(v.lp === v.lp)) { v.lp = 0; v.cb.fill(0); v.fs.fill(0); }
      if (!(v.mo === v.mo) || !(v.sx === v.sx)) { v.mo = 0; v.sx = v.sxp = v.nsx = 0; v.fbBuf.fill(0); }
      v.gL = v.ngL; v.gR = v.ngR; v.dG = v.ndG; v.wG = v.nwG; v.itdL = v.nitdL; v.itdR = v.nitdR; v.haL = v.nhaL; v.haR = v.nhaR;
      v.lvl = Math.max(v.lvl * 0.88, pk);
    }
    const wd = g.width;
    for (let s = 0; s < n; s++) {
      const mid = (dL[s] + dR[s]) * 0.5, side = (dL[s] - dR[s]) * 0.5 * wd;
      o0[s] = ftanh((mid + side) * 0.8); o1[s] = ftanh((mid - side) * 0.8);
      o2[s] = ftanh(wL[s] * 0.7); o3[s] = ftanh(wR[s] * 0.7);
    }

    // ---- memory ring, with a leveller so the granular feedback loop can never run away
    if (!g.freeze) {
      const mem = this.mem, len = this.memLen, ov = this.ov, ovN = this.ovN, fd = g.memFeed;
      let w = this.memW;
      for (let s = 0; s < n; s++) {
        const x0 = (inL[s] + inR[s]) * 0.5 * fd;
        const y = x0 - this.dcx + 0.995 * this.dcy; this.dcx = x0; this.dcy = y;
        const ay = Math.abs(y);
        this.menv = ay > this.menv ? this.menv + (ay - this.menv) * 0.01 : this.menv * 0.99995;
        const tg = this.menv > 0.3 ? 0.3 / this.menv : 1;
        this.mgain += (tg - this.mgain) * 0.001;
        this.mlp += (ftanh(y * 1.2 * this.mgain) - this.mlp) * 0.45;
        const x = this.mlp;
        mem[w] = x;
        const b = (w * ovN / len) | 0;
        if (b !== this.ovBin) { this.ovBin = b; ov[b] = 0; }
        const ax = Math.abs(x); if (ax > ov[b]) ov[b] = ax;
        if (++w >= len) w = 0;
      }
      this.memW = w;
    }

    // ---- status
    this.stC += n;
    if (this.stC >= this.stEvery) {
      this.stC = 0;
      const vs = [];
      for (let i = 0; i < 4; i++) { const v = V[i]; vs.push(v.ex, v.ey, v.lvl, v.env, v.step, v.deg, v.p.pulse, ex[i], v.fl, v.roar, v.ringA, v.hum, v.sing, v.fnorm, v.crush); }
      const msg = { t:'st', v:vs, g:this.gEv, tr:this.trEv, mw:this.memW / this.memLen, td:this.T.map(t => t.val.slice()) };
      if ((this.ovT++ & 1) === 0) msg.ov = this.ov.slice();
      this.emit(msg); this.gEv = []; this.trEv = [];
    }
  }
}

/* Recorder tap: captures the master bus while armed and posts it in chunks. */
const SYM_TAP_SRC = `
class SymTap extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.n = 0; this.L = new Float32Array(16384); this.R = new Float32Array(16384);
    this.port.onmessage = e => { if (e.data === 'start') { this.on = true; this.n = 0; } else if (e.data === 'stop') { this.flush(); this.on = false; this.port.postMessage('done'); } }; }
  flush() { if (!this.n) return; const L = this.L.slice(0, this.n), R = this.R.slice(0, this.n); this.port.postMessage({ L, R }, [L.buffer, R.buffer]); this.n = 0; }
  process(inputs) {
    if (!this.on) return true;
    const i = inputs[0]; if (!i || !i[0]) return true;
    const l = i[0], r = i[1] || l;
    for (let s = 0; s < l.length; s++) { this.L[this.n] = l[s]; this.R[this.n] = r[s]; if (++this.n === 16384) this.flush(); }
    return true;
  }
}
registerProcessor('symtap', SymTap);`;
