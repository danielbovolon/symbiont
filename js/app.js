/* Symbiont — host: state, audio graph, console, radar, recorder. */
'use strict';

const VERSION = '0.4';
const COLS = ['#7fe7dc', '#ff8fa0', '#ffc56b', '#b8a4ff'];
const RGB = COLS.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)));
const NAMES = ['a', 'b', 'c', 'd'];
const SCALES = [['hira','Hirajoshi'],['lyd','Lydian'],['harm','Harmonic'],['pelog','Pelog'],['phryg','Phrygian'],['whole','Whole tone'],['pent','Pentatonic'],['rast','Rast']];
const TARGETS = ['Orbit','Depth','Pitch','Bonds','Density','Grain size','Position','Cutoff','Width','Sharp','Roar','Ring','Hum','Sing','Orbit speed','Gain','Crush','Resonance'];
const SHAPES = ['Sine','Tri','Saw','Drift','Step','Chaos','Ecology','Follow'];
const DIVS = [[0.5,'1/32'],[1,'1/16'],[1.5,'1/16·'],[2,'1/8'],[3,'1/8·'],[4,'1/4']];
const COLOURS = ['roar', 'ring', 'hum', 'sing'];
const NN = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName = m => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const store = { get(k, d) { try { const v = localStorage.getItem('symbiont.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('symbiont.' + k, JSON.stringify(v)); } catch (e) {} } };

/* ---------------- state ---------------- */
function voice(o) {
  return Object.assign({ gate:1, gain:0.7, bx:0, by:0, oct:0, tune:0, glide:0.2,
    body:0.45, fold:0.2, fb:0.1, ratio:2, index:0, fm:[0,0,0,0],
    roar:0, ring:0, hum:0, sing:0, crush:0,
    fmode:0, tone:0.6, res:0.2, flRate:0.3, flSync:0, flDepth:0, flShape:0, flEnv:0, flSpace:0, flFM:0,
    orbShape:0, orbAround:0, orbSpeed:0, orbDir:1, orbX:0.25, orbY:0.15, orbTilt:0,
    src:0, cloud:0.5, density:10, size:0.35, pos:0.3, spray:0.3, trans:0, scatter:4, rev:0.15, width:0.6, track:1,
    pulse:1, steps:16, hits:5, rot:0, div:1, prob:0.9, attack:0.004, decay:0.4, wander:0.4 }, o);
}
const polar = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r];
const gainOf = t => 2 * Math.pow(clamp(t, 0, 1), 3.106);
const posOf = g => Math.pow(clamp(g / 2, 0, 1), 1 / 3.106);
const dbOf = g => g <= 0.00001 ? -Infinity : 20 * Math.log10(g);
const D2R = Math.PI / 180;

function initialState() {
  const p = [polar(-62, 0.5), polar(40, 0.7), polar(132, 0.5), polar(-150, 0.45)];
  return {
    v: [
      voice({ bx:p[0][0], by:p[0][1], oct:-2, pulse:0, hum:0.6, body:0.55, fold:0.2, fb:0.1, glide:0.45, attack:1.5,
        tone:0.5, res:0.35, flRate:0.18, flDepth:0.4, flShape:0, flSpace:0.3,
        orbShape:0, orbSpeed:0.3, orbDir:-1, orbX:0.35, orbY:0.2, orbTilt:20 * D2R,
        cloud:0.35, density:5, size:0.72, pos:0.5, spray:0.4, trans:12, scatter:5, width:0.8, steps:9, hits:0, wander:0.5, fm:[0,0,0,0.18] }),
      voice({ bx:p[1][0], by:p[1][1], oct:0, pulse:1, roar:0.25, body:0.42, fold:0.45, fb:0.05, ratio:2, index:0.25,
        fmode:1, tone:0.55, res:0.55, flRate:0.4, flSync:1, flDepth:0.45, flShape:1, flEnv:0.35,
        orbShape:0, orbAround:1, orbSpeed:0.38, orbDir:1, orbX:0.7, orbY:0.7, orbTilt:0,
        density:16, size:0.28, pos:0.2, spray:0.25, cloud:0.55, scatter:7, rev:0.2, width:0.5, steps:16, hits:5, decay:0.35, wander:0.45, fm:[0.25,0,0,0] }),
      voice({ bx:p[2][0], by:p[2][1], oct:1, pulse:1, ring:0.55, body:0.42, fold:0.05, fb:0.25,
        tone:0.75, res:0.3, flRate:0.62, flDepth:0.3, flShape:3,
        orbShape:1, orbAround:1, orbSpeed:0.45, orbDir:-1, orbX:0.8, orbY:0.55, orbTilt:-15 * D2R,
        density:8, size:0.2, pos:0.05, spray:0.15, cloud:0.4, scatter:12, rev:0.35, width:1, steps:12, hits:4, rot:2, div:2, decay:1.4, prob:0.8, wander:0.6, fm:[0,0.15,0,0] }),
      voice({ bx:p[3][0], by:p[3][1], oct:-1, pulse:0, sing:0.6, hum:0.2, body:0.4, fold:0.25, attack:2.5,
        tone:0.62, res:0.2, flRate:0.25, flDepth:0.55, flShape:2,
        orbShape:4, orbSpeed:0.42, orbDir:1, orbX:0.6, orbY:0.6, orbTilt:0,
        density:26, size:0.6, pos:0.42, spray:0.6, cloud:0.6, trans:-5, scatter:2, rev:0.4, width:0.95, steps:7, hits:0, wander:0.3, fm:[0,0,0.12,0] })
    ],
    ch: [0, 1, 2, 3].map(() => ({ mute:0, solo:0 })),
    g: { bpm:74, mutate:0.25, drift:0.3, scale:'hira', root:45, width:1.15, memFeed:0.5, freeze:0, pressure:1, eco:0.3, ecoRate:0.3, motion:1, doppler:0.4 },
    sp: { room:5.5, roomLvl:0.55, echo:0.46, echoFb:0.4, echoLvl:0.3, wob:0.3, wobRate:0.3, drive:0.15, master:0.85 },
    t: [
      { rate:0.02, shape:0, target:0, depth:0.12, spread:1, mask:[1,1,1,1] },
      { rate:0.8, shape:5, target:4, depth:0.4, spread:0.8, mask:[0,1,0,1] },
      { rate:0.04, shape:1, target:1, depth:0.25, spread:0.5, mask:[1,1,1,1] },
      { rate:0.07, shape:3, target:3, depth:0.35, spread:0.7, mask:[1,1,1,1] }
    ],
    files: ['', '', '', '']
  };
}
const S = initialState();
const pats = [[], [], [], []];
function euclidJS(p) {
  const n = Math.max(1, p.steps | 0), k = Math.min(p.hits | 0, n), r = p.rot | 0, a = [];
  for (let s = 0; s < n; s++) { const j = ((s - r) % n + n) % n; a.push(Math.floor((j + 1) * k / n) - Math.floor(j * k / n) > 0 ? 1 : 0); }
  return a;
}
for (let i = 0; i < 4; i++) pats[i] = euclidJS(S.v[i]);

/* ---------------- audio graph ---------------- */
let ac = null, eng = null, N = { bufL:new Float32Array(2048), bufR:new Float32Array(2048) }, running = false;
const pendingSmp = [null, null, null, null];
const send = m => { if (eng) eng.post(m); };
const setV = (i, k, v) => { S.v[i][k] = v; send({ t:'v', i, k, val:v }); };
const setG = (k, v) => { S.g[k] = v; send({ t:'g', k, val:v }); };

function applyGates() {
  const any = S.ch.some(c => c.solo);
  S.ch.forEach((c, i) => { const g = c.mute ? 0 : (any ? (c.solo ? 1 : 0) : 1); if (S.v[i].gate !== g || !eng) setV(i, 'gate', g); });
  paintMixer();
}

function makeIR(sec) {
  const sr = ac.sampleRate, len = Math.floor(sr * sec), b = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len, env = Math.pow(1 - t, 2.4) * Math.exp(-t * 2.5) * Math.min(1, i / (sr * 0.012));
      const k = 0.08 + 0.85 * t;
      lp += (Math.random() * 2 - 1 - lp) * (1 - k * 0.92);
      d[i] = lp * env * (1 + k);
    }
  }
  return b;
}
function satCurve(k, asym) {
  const n = 2048, c = new Float32Array(n), t = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (Math.tanh(k * x + asym) - Math.tanh(asym)) / t; }
  return c;
}
// slope 1 at zero and never above 1: inside a feedback loop this can only ever lose energy
function loopCurve(asym) {
  const n = 2048, c = new Float32Array(n), k = 1.4, b = Math.tanh(asym);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (Math.tanh(k * x + asym) - b) / (k * (1 - b * b)); }
  return c;
}
// transparent below −4 dBFS, rounds off above, never exceeds −0.1 dBFS
function limitCurve() {
  const n = 4096, c = new Float32Array(n), knee = 0.63, room = 0.989 - knee;
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a < knee ? a : knee + room * Math.tanh((a - knee) / room)); }
  return c;
}
const ECHO_MAX = 0.9;
let irT = 0;
function applySpace(k) {
  if (!ac) return;
  const sp = S.sp, now = ac.currentTime;
  if (!k || k === 'room') { clearTimeout(irT); irT = setTimeout(() => { N.conv.buffer = makeIR(sp.room); }, k ? 220 : 0); }
  if (!k || k === 'drive') N.drive.curve = sp.drive > 0.01 ? satCurve(1 + sp.drive * 7, sp.drive * 0.25) : null;
  N.roomG.gain.setTargetAtTime(sp.roomLvl * 0.9, now, 0.05);
  N.dl.delayTime.setTargetAtTime(sp.echo, now, 0.2);
  N.dr.delayTime.setTargetAtTime(sp.echo * 0.75, now, 0.2);
  const efb = Math.min(ECHO_MAX, sp.echoFb); N.fbL.gain.setTargetAtTime(efb, now, 0.05); N.fbR.gain.setTargetAtTime(efb, now, 0.05);
  N.echoG.gain.setTargetAtTime(sp.echoLvl, now, 0.05);
  N.wob.frequency.setTargetAtTime(0.05 * Math.pow(120, sp.wobRate), now, 0.05);
  N.wobG.gain.setTargetAtTime(sp.wob * 0.009, now, 0.05);
  N.master.gain.setTargetAtTime(sp.master * 1.25 / (1 + sp.drive * 1.2), now, 0.05);
}

function unlockIOS() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  try {
    const sr = 8000, n = 800, b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const a = new Audio(URL.createObjectURL(new Blob([b], { type:'audio/wav' }))); a.loop = true; a.setAttribute('playsinline', ''); a.play().catch(() => {});
  } catch (e) {}
}

async function wake() {
  if (ac) {
    if (ac.state === 'running') { await ac.suspend(); running = false; } else { await ac.resume(); running = true; }
    syncTop(); return;
  }
  unlockIOS();
  ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint:'playback' });
  let src, workletOK = false;
  try {
    if (!ac.audioWorklet) throw new Error('no worklet');
    const code = SymEngine.toString() + '\n' + SYM_TAP_SRC + `
class SymProc extends AudioWorkletProcessor {
  constructor(){ super(); this.e = new SymEngine(sampleRate, m => this.port.postMessage(m)); this.port.onmessage = ev => this.e.handle(ev.data); this.z = new Float32Array(128); }
  process(inputs, outputs){ const i = inputs[0], o = outputs[0], n = o[0].length; if (this.z.length < n) this.z = new Float32Array(n);
    const L = i && i[0] ? i[0] : this.z, R = i && i[1] ? i[1] : L; this.e.process(L, R, o[0], o[1], o[2], o[3], n); return true; }
}
registerProcessor('symbiont', SymProc);`;
    const url = URL.createObjectURL(new Blob([code], { type:'application/javascript' }));
    await ac.audioWorklet.addModule(url);
    src = new AudioWorkletNode(ac, 'symbiont', { numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[4], channelCount:2, channelCountMode:'explicit' });
    src.port.onmessage = e => onEngine(e.data);
    eng = { post: m => src.port.postMessage(m) };
    workletOK = true;
  } catch (err) {
    const e = new SymEngine(ac.sampleRate, onEngine);
    src = ac.createScriptProcessor(1024, 2, 4);
    src.channelCountMode = 'explicit'; src.channelCount = 2;
    src.onaudioprocess = ev => {
      const ib = ev.inputBuffer, ob = ev.outputBuffer, n = ob.length;
      const L = ib.getChannelData(0), R = ib.numberOfChannels > 1 ? ib.getChannelData(1) : L;
      const o = [0, 1, 2, 3].map(c => ob.getChannelData(c));
      for (let k = 0; k < n; k += 128) e.process(L.subarray(k, k + 128), R.subarray(k, k + 128), o[0].subarray(k, k + 128), o[1].subarray(k, k + 128), o[2].subarray(k, k + 128), o[3].subarray(k, k + 128), 128);
    };
    eng = { post: m => e.handle(m) };
  }
  N.src = src;
  const split = ac.createChannelSplitter(4), mDry = ac.createChannelMerger(2), mWet = ac.createChannelMerger(2);
  src.connect(split);
  split.connect(mDry, 0, 0); split.connect(mDry, 1, 1); split.connect(mWet, 2, 0); split.connect(mWet, 3, 1);
  N.master = ac.createGain();
  N.conv = ac.createConvolver(); N.roomG = ac.createGain();
  // ping-pong echo: saturating feedback (can self-oscillate) and a wobbling delay line
  const es = ac.createChannelSplitter(2), em = ac.createChannelMerger(2);
  N.dl = ac.createDelay(2.5); N.dr = ac.createDelay(2.5);
  N.fbL = ac.createGain(); N.fbR = ac.createGain();
  const lpL = ac.createBiquadFilter(), lpR = ac.createBiquadFilter(); lpL.frequency.value = 3200; lpR.frequency.value = 2600;
  const satL = ac.createWaveShaper(), satR = ac.createWaveShaper(); satL.curve = loopCurve(0.08); satR.curve = loopCurve(0.08);
  const lhL = ac.createBiquadFilter(), lhR = ac.createBiquadFilter(); lhL.type = lhR.type = 'highpass'; lhL.frequency.value = lhR.frequency.value = 110;
  const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
  N.echoG = ac.createGain();
  mWet.connect(hp); hp.connect(es);
  es.connect(N.dl, 0); es.connect(N.dr, 1);
  N.dl.connect(lpL); lpL.connect(lhL); lhL.connect(satL); satL.connect(N.fbL); N.fbL.connect(N.dr);
  N.dr.connect(lpR); lpR.connect(lhR); lhR.connect(satR); satR.connect(N.fbR); N.fbR.connect(N.dl);
  N.dl.connect(em, 0, 0); N.dr.connect(em, 0, 1);
  em.connect(N.echoG); N.echoG.connect(N.master); N.echoG.connect(N.conv);
  N.wob = ac.createOscillator(); N.wobG = ac.createGain();
  N.wob.connect(N.wobG); N.wobG.connect(N.dl.delayTime); N.wobG.connect(N.dr.delayTime); N.wob.start();
  mWet.connect(N.conv); N.conv.connect(N.roomG); N.roomG.connect(N.master);
  mDry.connect(N.master);
  N.drive = ac.createWaveShaper(); N.drive.oversample = '4x';
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -9; comp.knee.value = 6; comp.ratio.value = 20; comp.attack.value = 0.001; comp.release.value = 0.2;
  const clip = ac.createWaveShaper(); clip.curve = limitCurve(); clip.oversample = '2x';
  N.master.connect(N.drive); N.drive.connect(comp); comp.connect(clip); clip.connect(ac.destination); N.out = clip;
  const as = ac.createChannelSplitter(2);
  N.aL = ac.createAnalyser(); N.aR = ac.createAnalyser(); N.aL.fftSize = N.aR.fftSize = 2048;
  clip.connect(as); as.connect(N.aL, 0); as.connect(N.aR, 1);
  const ret = ac.createDelay(0.2); ret.delayTime.value = 0.045;
  clip.connect(ret); ret.connect(src);
  const sink = ac.createGain(); sink.gain.value = 0; sink.connect(ac.destination);
  if (workletOK) {
    N.tap = new AudioWorkletNode(ac, 'symtap', { numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[1], channelCount:2, channelCountMode:'explicit' });
    N.tap.port.onmessage = e => onTap(e.data);
    N.tapPost = m => N.tap.port.postMessage(m);
  } else {
    N.tap = ac.createScriptProcessor(4096, 2, 1); let armed = false;
    N.tap.onaudioprocess = ev => { if (!armed) return; const b = ev.inputBuffer; onTap({ L:b.getChannelData(0).slice(), R:(b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice() }); };
    N.tapPost = m => { armed = m === 'start'; if (m === 'stop') onTap('done'); };
  }
  clip.connect(N.tap); N.tap.connect(sink);

  send({ t:'state', voices:S.v, g:S.g, tides:S.t });
  applyGates();
  for (let i = 0; i < 4; i++) if (pendingSmp[i]) send({ t:'sample', i, data:resample(pendingSmp[i].mono, pendingSmp[i].sr, ac.sampleRate) });
  applySpace();
  await ac.resume();
  running = true; syncTop();
}

/* ---------------- recorder ---------------- */
let rec = null; const takes = []; let takeNo = 0;
let DL = null;
try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { DL = d; }).catch(() => {}); } catch (e) {}
function toggleRec() {
  if (!ac) { wake().then(() => { if (running) toggleRec(); }); return; }
  if (!rec) { rec = { L:[], R:[], n:0, t0:performance.now() }; N.tapPost('start'); }
  else N.tapPost('stop');
  syncTop();
}
function onTap(m) {
  if (!rec) return;
  if (m === 'done') {
    const r = rec; rec = null; syncTop();
    if (!r.n) return;
    const wav = encodeWav(r.L, r.R, r.n, ac.sampleRate);
    takeNo++;
    const d = new Date(), pad = x => String(x).padStart(2, '0');
    takes.unshift({ name:`symbiont-${VERSION}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}-take${pad(takeNo)}`, blob:wav, dur:r.n / ac.sampleRate, no:takeNo });
    renderTakes();
    return;
  }
  rec.L.push(m.L); rec.R.push(m.R); rec.n += m.L.length;
}
function encodeWav(Ls, Rs, n, sr) {
  const bytes = n * 6, b = new ArrayBuffer(44 + bytes), d = new DataView(b), w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); d.setUint32(4, 36 + bytes, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 2, true);
  d.setUint32(24, sr, true); d.setUint32(28, sr * 6, true); d.setUint16(32, 6, true); d.setUint16(34, 24, true); w(36, 'data'); d.setUint32(40, bytes, true);
  const u = new Uint8Array(b); let o = 44;
  for (let c = 0; c < Ls.length; c++) {
    const L = Ls[c], R = Rs[c];
    for (let s = 0; s < L.length; s++) {
      for (const x of [L[s], R[s]]) { let v = Math.round(clamp(x, -1, 1) * 8388607); if (v < 0) v += 16777216; u[o++] = v & 255; u[o++] = (v >> 8) & 255; u[o++] = (v >> 16) & 255; }
    }
  }
  return new Blob([b], { type:'audio/wav' });
}
let CRC = null;
function crc32(u) {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(name, data) {
  const nm = new TextEncoder().encode(name), crc = crc32(data), sz = data.length;
  const lh = new DataView(new ArrayBuffer(30)), ch = new DataView(new ArrayBuffer(46)), end = new DataView(new ArrayBuffer(22));
  lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
  ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true);
  const cdOff = 30 + nm.length + sz;
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true); end.setUint32(12, 46 + nm.length, true); end.setUint32(16, cdOff, true);
  return new Blob([lh, nm, data, ch, nm, end], { type:'application/zip' });
}
async function saveTake(t, btn) {
  if (DL) {
    try {
      const zip = zipStore(t.name + '.wav', new Uint8Array(await t.blob.arrayBuffer()));
      await DL.save({ filename:t.name + '.zip', data:zip });
      btn.textContent = 'Saved';
    } catch (e) { btn.textContent = e && e.code === 'declined' ? 'Save' : 'Not saved'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(t.blob); a.download = t.name + '.wav';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
function renderTakes() {
  const box = document.getElementById('takes'); box.innerHTML = '';
  takes.slice(0, 4).forEach(t => {
    const r = el('div', 'take');
    const m = Math.floor(t.dur / 60), s = Math.floor(t.dur % 60);
    r.append(el('span', null, `Take ${String(t.no).padStart(2, '0')} · ${m}:${String(s).padStart(2, '0')} · 24-bit WAV`));
    const b = el('button', null, 'Save'); b.addEventListener('click', () => saveTake(t, b));
    const x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Discard take'); x.addEventListener('click', () => { takes.splice(takes.indexOf(t), 1); renderTakes(); });
    r.append(b, x); box.append(r);
  });
  if (takes.length && window.claude && !DL) box.append(el('p', 'note', 'In this view saving may be blocked; open the web app to save takes as WAV.'));
}

/* ---------------- engine → eyes ---------------- */
const vis = S.v.map(p => ({ x:p.bx, y:p.by, tx:p.bx, ty:p.by, lvl:0.05, env:0, step:-1, deg:0, pulse:p.pulse, pop:0.5, fl:0, fn:p.tone, crush:p.crush, col:COLOURS.map(k => p[k]), pk:-90, hold:-90, holdT:0 }));
let memOv = new Float32Array(240), memW = 0;
const tideHist = [[], [], [], []], popHist = [];
const parts = [], ripples = [];
function onEngine(m) {
  if (m.t === 'st') {
    for (let i = 0; i < 4; i++) {
      const b = i * 15, z = vis[i], v = m.v;
      z.tx = v[b]; z.ty = v[b + 1]; z.lvl = v[b + 2]; z.env = v[b + 3];
      if (z.step !== v[b + 4]) { z.step = v[b + 4]; onStep(i); }
      z.deg = v[b + 5]; z.pulse = v[b + 6]; z.pop = v[b + 7]; z.fl = v[b + 8];
      z.col = [v[b + 9], v[b + 10], v[b + 11], v[b + 12]]; z.fn = v[b + 13]; z.crush = v[b + 14];
    }
    for (const e of m.g) spawnParticle(e);
    for (const i of m.tr) ripples.push({ i, age:0 });
    if (m.ov) memOv = m.ov;
    memW = m.mw;
    for (let k = 0; k < 4; k++) { const h = tideHist[k]; h.push(m.td[k][0]); if (h.length > 60) h.shift(); }
    popHist.push(vis.map(z => z.pop)); if (popHist.length > 240) popHist.shift();
  } else if (m.t === 'pat') {
    pats[m.i] = m.pat;
    const p = S.v[m.i];
    if (p.hits !== m.hits || p.rot !== m.rot) { p.hits = m.hits; p.rot = m.rot; refreshRefs(); }
    if (tab === 'org' && sel === m.i) drawPat();
  }
}

/* ---------------- canvas ---------------- */
const cv = document.getElementById('field'), cx2 = cv.getContext('2d');
const trail = document.createElement('canvas'), tx2 = trail.getContext('2d');
let W = 0, H = 0, DPR = 1;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(window.devicePixelRatio || 1, W < 820 ? 1.5 : 2);
  for (const c of [cv, trail]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  cx2.setTransform(DPR, 0, 0, DPR, 0, 0); tx2.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize); resize();
const panel = document.getElementById('panel');
let GEO = { cx:0, cy:0, R:100, sc:1 };
function geom() {
  const mobile = W <= 820; let cx, cy, R;
  if (mobile) {
    const ph = panel.getBoundingClientRect().height, top = 84, avail = Math.max(150, H - ph - top - 8);
    cx = W / 2; cy = top + avail / 2; R = Math.max(64, Math.min(W * 0.4, avail * 0.41));
  } else {
    const aw = W - panel.offsetWidth - 28; cx = aw / 2 + 6; cy = H / 2 + 14; R = Math.min(aw, H) * 0.36;
  }
  GEO = { cx, cy, R, sc: clamp(R / 270, 0.5, 1.35) };
  return GEO;
}
const toScreen = (x, y) => [GEO.cx + x * GEO.R, GEO.cy + y * GEO.R];

function spawnParticle(e) {
  if (parts.length > 700) return;
  const [i, pan, posN, durS, semis] = e, z = vis[i];
  const tgx = pan, tgy = z.y + (Math.random() - 0.5) * 0.2;
  let sx, sy, kind;
  if (posN >= 0) { const a = posN * Math.PI * 2 - Math.PI / 2, rr = 1.13; sx = Math.cos(a) * rr; sy = Math.sin(a) * rr; kind = 0; }
  else { sx = z.x; sy = z.y; kind = 1; }
  parts.push({ i, sx, sy, tx:tgx, ty:tgy, px:sx, py:sy, age:0, life:clamp(durS * 1.6 + 0.5, 0.55, 2.8), sz:clamp(durS * 9, 0.6, 5.5), kind, semis });
}
function orbitLocal(p, ph) {
  const ax = p.orbX, ay = p.orbY;
  switch (p.orbShape) {
    case 1: return [ax * Math.sin(ph), ay * Math.sin(2 * ph)];
    case 2: return [ax * Math.sin(ph), ay * (0.5 - 0.5 * Math.cos(2 * ph)) - ay * 0.5];
    case 3: { const k = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(ph * 0.23)); return [ax * k * Math.cos(ph), ay * k * Math.sin(ph)]; }
    default: return [ax * Math.cos(ph), ay * Math.sin(ph)];
  }
}
function orbitPoint(p, ph) {
  const [lx, ly] = orbitLocal(p, ph), c = Math.cos(p.orbTilt), s = Math.sin(p.orbTilt), M = S.g.motion;
  const rx = lx * c - ly * s, ry = lx * s + ly * c;
  let x, y;
  if (p.orbAround) { const k = Math.min(1, M); x = p.bx + (rx - p.bx) * k; y = p.by + (ry - p.by) * k; }
  else { x = p.bx + rx * M; y = p.by + ry * M; }
  const r = Math.hypot(x, y); if (r > 1) { x /= r; y /= r; }
  return [x, y];
}
const SHAPE_NAMES = ['Ellipse', 'Figure eight', 'Pendulum', 'Spiral', 'Wander'];

let stirP = null;
function drawField(t, dt) {
  const { cx, cy, R, sc } = GEO;
  tx2.globalCompositeOperation = 'destination-out';
  tx2.fillStyle = `rgba(0,0,0,${reduce ? 0.35 : 0.12})`; tx2.fillRect(0, 0, W, H);
  tx2.globalCompositeOperation = 'lighter';
  if (ac && running) {
    const L = N.bufL, Rr = N.bufR, k = R * 0.26 * 0.7071;
    tx2.beginPath();
    for (let s = 0; s < L.length; s += 3) { const x = cx + (L[s] - Rr[s]) * k, y = cy - (L[s] + Rr[s]) * k; s ? tx2.lineTo(x, y) : tx2.moveTo(x, y); }
    tx2.strokeStyle = 'rgba(210,235,238,0.2)'; tx2.lineWidth = 0.8; tx2.stroke();
  }
  for (let k = parts.length - 1; k >= 0; k--) {
    const p = parts[k]; p.age += dt;
    const u = p.age / p.life;
    if (u >= 1) { parts.splice(k, 1); continue; }
    const c = RGB[p.i];
    let x, y;
    if (u < 0.42) { const e = 1 - Math.pow(1 - u / 0.42, 3); x = p.sx + (p.tx - p.sx) * e; y = p.sy + (p.ty - p.sy) * e;
      if (p.kind === 0) { const bend = Math.sin(e * Math.PI) * 0.12; x += -y * bend; y += x * bend * 0.3; } }
    else { const f = (u - 0.42) / 0.58; x = p.tx + Math.sin(p.semis + t) * 0.02 * f; y = p.ty - f * 0.05; }
    const [X, Y] = toScreen(x, y), [PX, PY] = toScreen(p.px, p.py);
    const al = (u < 0.42 ? 0.55 : 0.55 * (1 - (u - 0.42) / 0.58)) * (S.v[p.i].gate ? 1 : 0.25);
    if (Math.hypot(X - PX, Y - PY) < 40 * sc) {
      tx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${al})`; tx2.lineWidth = 1;
      tx2.beginPath(); tx2.moveTo(PX, PY); tx2.lineTo(X, Y); tx2.stroke();
    }
    if (u >= 0.42) { tx2.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${al * 0.35})`; tx2.beginPath(); tx2.arc(X, Y, p.sz * sc * (0.6 + (u - 0.42) * 2.2), 0, 6.283); tx2.fill(); }
    p.px = x; p.py = y;
  }
  if (stirP) {
    const sp = Math.min(1, stirP.spd);
    for (let k = 0; k < 3; k++) {
      tx2.strokeStyle = `rgba(212,230,233,${0.18 + sp * 0.25})`;
      const a0 = t * (2 + k) + k * 2.1; tx2.beginPath(); tx2.arc(stirP.sx, stirP.sy, (10 + k * 9) * sc * (1 + sp), a0, a0 + 1.4 + sp); tx2.stroke();
    }
  }

  cx2.globalCompositeOperation = 'source-over';
  cx2.fillStyle = '#04070b'; cx2.fillRect(0, 0, W, H);
  const vg = cx2.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.6);
  vg.addColorStop(0, 'rgba(18,40,48,0.55)'); vg.addColorStop(1, 'rgba(4,7,11,0)');
  cx2.fillStyle = vg; cx2.fillRect(0, 0, W, H);
  cx2.strokeStyle = 'rgba(120,170,180,0.09)'; cx2.lineWidth = 1;
  for (const f of [0.33, 0.66, 1]) { cx2.beginPath(); cx2.arc(cx, cy, R * f, 0, 6.283); cx2.stroke(); }
  cx2.beginPath(); cx2.moveTo(cx - R, cy); cx2.lineTo(cx + R, cy); cx2.moveTo(cx, cy - R); cx2.lineTo(cx, cy + R); cx2.stroke();
  for (let a = 0; a < 72; a++) { const an = a / 72 * 6.283, r1 = R * (a % 6 ? 0.985 : 0.965);
    cx2.beginPath(); cx2.moveTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); cx2.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); cx2.stroke(); }
  cx2.fillStyle = 'rgba(140,175,185,0.55)'; cx2.font = `400 ${Math.round(9.5 * clamp(sc, 0.9, 1.2))}px 'Azeret Mono', monospace`;
  cx2.textAlign = 'center'; cx2.textBaseline = 'middle';
  cx2.fillText('L', cx - R - 12, cy); cx2.fillText('R', cx + R + 12, cy);
  cx2.fillText('FRONT', cx, cy - R + 14); cx2.fillText('REAR', cx, cy + R - 14);
  // memory ring: waveform of the last 8 seconds, write head as a dot
  const Rm = R * 1.13, ovN = memOv.length;
  cx2.strokeStyle = S.g.freeze ? 'rgba(190,225,255,0.5)' : 'rgba(120,170,180,0.16)';
  cx2.beginPath(); cx2.arc(cx, cy, Rm, 0, 6.283); cx2.stroke();
  cx2.strokeStyle = S.g.freeze ? 'rgba(200,230,255,0.6)' : 'rgba(150,205,210,0.42)';
  cx2.beginPath();
  for (let b = 0; b < ovN; b++) {
    const an = b / ovN * 6.283 - Math.PI / 2, a = Math.min(1, memOv[b] * 1.6) * R * 0.11;
    if (a < 0.4) continue;
    cx2.moveTo(cx + Math.cos(an) * (Rm - a * 0.35), cy + Math.sin(an) * (Rm - a * 0.35));
    cx2.lineTo(cx + Math.cos(an) * (Rm + a), cy + Math.sin(an) * (Rm + a));
  }
  cx2.stroke();
  const wa = memW * 6.283 - Math.PI / 2;
  cx2.fillStyle = S.g.freeze ? '#cfe6ff' : '#d4e6e9';
  cx2.beginPath(); cx2.arc(cx + Math.cos(wa) * Rm, cy + Math.sin(wa) * Rm, 2.6, 0, 6.283); cx2.fill();

  // orbit paths: each organism's own cycle, axis, tilt and direction
  for (let i = 0; i < 4; i++) {
    const p = S.v[i]; if (p.orbSpeed <= 0 || (p.orbX < 0.01 && p.orbY < 0.01)) continue;
    const c = RGB[i], on = p.gate ? 1 : 0.3, hi = i === sel && tab === 'org';
    cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(hi ? 0.38 : 0.2) * on})`; cx2.setLineDash([2, 5]);
    cx2.beginPath();
    if (p.orbShape === 4) {
      // wander: show the area it roams
      for (let k = 0; k <= 72; k++) { const a = k / 72 * 6.283, [x, y] = toScreen(...orbitPoint(Object.assign({}, p, { orbShape:0 }), a)); k ? cx2.lineTo(x, y) : cx2.moveTo(x, y); }
      cx2.stroke(); cx2.setLineDash([]); continue;
    }
    const turns = p.orbShape === 3 ? 6.283 / 0.23 : 6.283, steps = p.orbShape === 3 ? 360 : 96;
    for (let k = 0; k <= steps; k++) { const [x, y] = toScreen(...orbitPoint(p, k / steps * turns)); k ? cx2.lineTo(x, y) : cx2.moveTo(x, y); }
    cx2.stroke(); cx2.setLineDash([]);
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * 6.283 + t * 0.05, d = 0.06 * p.orbDir;
      const [x0, y0] = toScreen(...orbitPoint(p, a)), [x1, y1] = toScreen(...orbitPoint(p, a + d));
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(hi ? 0.55 : 0.25) * on})`;
      cx2.beginPath(); cx2.moveTo(x0 - ux * 4 - uy * 3, y0 - uy * 4 + ux * 3); cx2.lineTo(x0, y0); cx2.lineTo(x0 - ux * 4 + uy * 3, y0 - uy * 4 - ux * 3); cx2.stroke();
    }
  }

  cx2.drawImage(trail, 0, 0, W, H);
  cx2.globalCompositeOperation = 'lighter';

  // bonds
  for (let i = 0; i < 4; i++) {
    const p = S.v[i]; if (!p.gate) continue;
    for (let j = 0; j < 4; j++) {
      if (j === i || p.fm[j] < 0.005 || !S.v[j].gate) continue;
      const [ax, ay] = toScreen(vis[j].x, vis[j].y), [bx, by] = toScreen(vis[i].x, vis[i].y);
      const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      const pr = S.g.pressure, amp = (2 + p.fm[j] * 12 * Math.min(2, pr)) * sc, waves = 5 + p.fm[j] * 10 * pr, c = RGB[j];
      cx2.beginPath();
      for (let s = 0; s <= 72; s++) {
        const u = s / 72, o = Math.sin(u * Math.PI * waves - t * (3 + pr * 2)) * amp * Math.sin(u * Math.PI);
        const x = ax + dx * u + nx * o, y = ay + dy * u + ny * o; s ? cx2.lineTo(x, y) : cx2.moveTo(x, y);
      }
      const gr = cx2.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.6)`); gr.addColorStop(1, `rgba(${RGB[i][0]},${RGB[i][1]},${RGB[i][2]},0.25)`);
      cx2.strokeStyle = gr; cx2.lineWidth = 1; cx2.stroke();
    }
  }

  // organisms
  for (let i = 0; i < 4; i++) {
    const z = vis[i], p = S.v[i], c = RGB[i];
    z.x += (z.tx - z.x) * 0.25; z.y += (z.ty - z.y) * 0.25;
    const [X, Y] = toScreen(z.x, z.y), on = p.gate ? 1 : 0.25;
    const lv = clamp(Math.sqrt(z.lvl) * 1.3, 0, 1), [roar, ring, hum, sing] = z.col;
    const r0 = (8 + lv * 18 + clamp(z.pop, 0, 1.2) * 5) * sc, rs = 34 * sc;
    const [AX, AY] = toScreen(p.bx, p.by);
    cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.4 * on})`;
    cx2.beginPath(); cx2.moveTo(AX - 3, AY); cx2.lineTo(AX + 3, AY); cx2.moveTo(AX, AY - 3); cx2.lineTo(AX, AY + 3); cx2.stroke();
    const glow = 0.28 + (p.flDepth > 0 ? 0.12 * z.fl : 0);
    const hg = cx2.createRadialGradient(X, Y, 0, X, Y, r0 * 3.4);
    hg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${glow * on})`); hg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    cx2.fillStyle = hg; cx2.beginPath(); cx2.arc(X, Y, r0 * 3.4, 0, 6.283); cx2.fill();
    const ph = t * (0.6 + i * 0.17);
    cx2.beginPath();
    for (let k = 0; k <= 96; k++) {
      const a = k / 96 * 6.283;
      const rr = r0 * (1 + 0.07 * Math.sin(a * 3 + ph + i) + hum * 0.14 * Math.sin(a * 2 + ph * 0.5) * Math.sin(t * 0.9 + i)
        + roar * 0.14 * Math.sin(a * 11 + t * 5 + i) * Math.sin(a * 4 - t * 2.3)
        + sing * 0.2 * Math.pow(Math.abs(Math.sin(a * 2.5 + ph * 0.7)), 2)
        + p.fold * 0.1 * Math.sin(a * (5 + i) - ph * 1.7) + z.env * 0.16 * Math.sin(a * 7 + ph * 3)
        + z.crush * 0.18 * (((k * 7 + Math.floor(t * 12)) % 5) / 5 - 0.4));
      const x = X + Math.cos(a) * rr, y = Y + Math.sin(a) * rr; k ? cx2.lineTo(x, y) : cx2.moveTo(x, y);
    }
    const mg = cx2.createRadialGradient(X, Y, 0, X, Y, r0 * 1.25);
    mg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.75 * on})`); mg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},${0.05 * on})`);
    cx2.fillStyle = mg; cx2.fill();
    cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.7 * on})`; cx2.lineWidth = 1; cx2.stroke();
    if (ring > 0.02) for (let k = 0; k < 2; k++) {
      const u = ((t * (0.4 + ring * 0.5) + k / 2) % 1);
      cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${ring * 0.45 * (1 - u) * on})`;
      cx2.beginPath(); cx2.arc(X, Y, r0 * (1.1 + u * 1.2), 0, 6.283); cx2.stroke();
    }
    if (p.fb > 0.01) {
      cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.5 * on})`; cx2.lineWidth = 0.5 + p.fb * 2.5;
      const a0 = t * (1 + p.fb * 3) + i; cx2.beginPath(); cx2.arc(X, Y, r0 + 6 * sc, a0, a0 + 1 + p.fb * 4); cx2.stroke(); cx2.lineWidth = 1;
    }
    const pat = pats[i], n = pat.length || 1;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + k / n * 6.283, x = X + Math.cos(a) * rs, y = Y + Math.sin(a) * rs, now = k === z.step;
      if (p.pulse) {
        cx2.fillStyle = pat[k] ? `rgba(${c[0]},${c[1]},${c[2]},${(now ? 1 : 0.65) * on})` : `rgba(${c[0]},${c[1]},${c[2]},${(now ? 0.6 : 0.18) * on})`;
        cx2.beginPath(); cx2.arc(x, y, (pat[k] ? 2.1 : 1.1) * sc + (now ? 1.6 : 0), 0, 6.283); cx2.fill();
      } else if (now || k % 2 === 0) {
        cx2.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(now ? 0.55 : 0.14) * on})`;
        cx2.beginPath(); cx2.arc(x, y, now ? 1.8 : 0.9, 0, 6.283); cx2.fill();
      }
    }
    if (i === sel && tab === 'org') {
      cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.5)`; cx2.setLineDash([1, 5]);
      cx2.beginPath(); cx2.arc(X, Y, rs + 9 * sc, 0, 6.283); cx2.stroke(); cx2.setLineDash([]);
    }
    cx2.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.95 * on})`;
    cx2.font = `400 ${Math.round(13 * clamp(sc, 0.85, 1.3))}px 'Major Mono Display', monospace`;
    cx2.fillText(NAMES[i], X + rs * 0.82, Y - rs * 0.82);
    if (S.ch[i].solo) { cx2.font = `400 9px 'Azeret Mono', monospace`; cx2.fillText('SOLO', X, Y + rs + 12 * sc); }
  }
  for (let k = ripples.length - 1; k >= 0; k--) {
    const r = ripples[k]; r.age += dt; if (r.age > 0.9) { ripples.splice(k, 1); continue; }
    const z = vis[r.i], [X, Y] = toScreen(z.x, z.y), c = RGB[r.i], u = r.age / 0.9;
    cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.5 * (1 - u)})`;
    cx2.beginPath(); cx2.arc(X, Y, (14 + u * 50) * sc, 0, 6.283); cx2.stroke();
  }
  cx2.fillStyle = 'rgba(212,230,233,0.8)';
  cx2.beginPath(); cx2.moveTo(cx, cy - 4); cx2.lineTo(cx + 4, cy); cx2.lineTo(cx, cy + 4); cx2.lineTo(cx - 4, cy); cx2.closePath(); cx2.fill();
  if (drag && drag.mode === 'bond') {
    const [ax, ay] = toScreen(vis[drag.i].x, vis[drag.i].y), c = RGB[drag.i];
    cx2.setLineDash([3, 4]); cx2.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.8)`;
    cx2.beginPath(); cx2.moveTo(ax, ay); cx2.lineTo(drag.x, drag.y); cx2.stroke(); cx2.setLineDash([]);
  }
}

/* ---------------- master scope + stereo meter ---------------- */
const scopeCv = document.getElementById('scope'), lrCv = document.getElementById('lrm');
const MS = { pk:[-90, -90], hold:[-90, -90], holdT:[0, 0], rms:[-90, -90] };
function fitCanvas(c) {
  const w = c.clientWidth, h = c.clientHeight, d = Math.min(2, devicePixelRatio || 1);
  if (!w || !h) return null;
  if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h); return { g, w, h };
}
function drawMaster(dt) {
  const live = !!(ac && running);
  if (live) { N.aL.getFloatTimeDomainData(N.bufL); N.aR.getFloatTimeDomainData(N.bufR); }
  const L = N.bufL, R = N.bufR;
  const s = fitCanvas(scopeCv);
  if (s) {
    const { g, w, h } = s, mid = h / 2;
    g.strokeStyle = 'rgba(120,170,180,0.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid);
    for (let k = 1; k < 4; k++) { g.moveTo(w * k / 4, 2); g.lineTo(w * k / 4, h - 2); } g.stroke();
    if (live) {
      let tr = 0; const span = 1024;
      for (let k = 1; k < L.length - span; k++) if (L[k - 1] + R[k - 1] <= 0 && L[k] + R[k] > 0) { tr = k; break; }
      const draw = (buf, col, lw) => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
        for (let k = 0; k < span; k += 2) { const x = k / span * w, y = mid - clamp(buf[tr + k], -1, 1) * (mid - 3); k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      };
      draw(R, 'rgba(127,231,220,0.5)', 1); draw(L, 'rgba(212,230,233,0.9)', 1.2);
    }
    g.fillStyle = 'rgba(140,175,185,0.6)'; g.font = `400 9px 'Azeret Mono', monospace`; g.textBaseline = 'top'; g.textAlign = 'left';
    g.fillText('SCOPE  L', 6, 4); g.fillStyle = 'rgba(127,231,220,0.7)'; g.fillText('R', 58, 4);
  }
  const m = fitCanvas(lrCv);
  if (m) {
    const { g, w, h } = m, now = performance.now(), x0 = 14, bw = w - x0 - 4;
    const tX = d => x0 + clamp((d + 48) / 51, 0, 1) * bw;
    for (let c = 0; c < 2; c++) {
      const buf = c ? R : L; let pk = 0, sum = 0;
      if (live) for (let k = 0; k < buf.length; k++) { const a = Math.abs(buf[k]); if (a > pk) pk = a; sum += buf[k] * buf[k]; }
      const dp = live ? Math.max(-90, dbOf(pk)) : -90, dr = live ? 10 * Math.log10(sum / buf.length + 1e-12) : -90;
      MS.pk[c] = Math.max(dp, MS.pk[c] - dt * 24); MS.rms[c] = MS.rms[c] + (dr - MS.rms[c]) * 0.3;
      if (dp >= MS.hold[c] || now - MS.holdT[c] > 1600) { MS.hold[c] = dp; MS.holdT[c] = now; }
      const y = 13 + c * 11, bh = 7;
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x0, y, bw, bh);
      const grd = g.createLinearGradient(x0, 0, x0 + bw, 0);
      grd.addColorStop(0, 'rgba(127,231,220,0.3)'); grd.addColorStop(0.8, 'rgba(127,231,220,0.6)'); grd.addColorStop(0.9, '#ffc56b'); grd.addColorStop(1, '#ff5a4f');
      g.fillStyle = grd; g.fillRect(x0, y, Math.max(0, tX(MS.pk[c]) - x0), bh);
      g.fillStyle = 'rgba(212,230,233,0.85)'; g.fillRect(x0, y + 3, Math.max(0, tX(MS.rms[c]) - x0), 2);
      g.fillStyle = MS.hold[c] > -0.3 ? '#ff5a4f' : '#d4e6e9'; g.fillRect(tX(MS.hold[c]) - 1, y - 1, 2, bh + 2);
      g.fillStyle = 'rgba(140,175,185,0.8)'; g.font = `400 9px 'Azeret Mono', monospace`; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText(c ? 'R' : 'L', 2, y + bh / 2);
    }
    g.fillStyle = 'rgba(140,175,185,0.6)'; g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `400 8.5px 'Azeret Mono', monospace`;
    for (const d of [-48, -24, -12, -6, 0]) { const x = tX(d); g.fillRect(x - 0.5, 33, 1, 2); g.fillText(d === 0 ? '0' : String(d).replace('-', '−'), x, 36); }
    const fmt = d => d > -60 ? d.toFixed(1).replace('-', '−') : '−∞';
    g.textAlign = 'right'; g.font = `400 9px 'Azeret Mono', monospace`;
    g.fillStyle = MS.hold[0] > -0.3 || MS.hold[1] > -0.3 ? '#ff5a4f' : 'rgba(212,230,233,0.85)';
    g.fillText(`${fmt(MS.hold[0])} ${fmt(MS.hold[1])}`, w - 2, 2);
    g.textAlign = 'left'; g.fillStyle = 'rgba(140,175,185,0.6)'; g.fillText('PEAK dBFS', 2, 2);
  }
}

let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (!running) for (let i = 0; i < 4; i++) vis[i].col = COLOURS.map(k => S.v[i][k]);
  geom(); drawMaster(dt); drawField(now / 1000, dt);
  paintMeters(dt);
  if (tab === 'world') drawWorldViz(); else paintLfo();
  if (rec) { const s = Math.floor((now - rec.t0) / 1000); recBtn.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  requestAnimationFrame(loop);
}

/* ---------------- radar gestures ---------------- */
let drag = null, lastTap = { i:-1, t:0 };
function hitOrg(x, y) {
  let best = -1, bd = 1e9;
  for (let i = 0; i < 4; i++) { const [X, Y] = toScreen(vis[i].x, vis[i].y), d = Math.hypot(X - x, Y - y); if (d < bd) { bd = d; best = i; } }
  return bd < Math.max(24, 28 * GEO.sc) ? best : -1;
}
const toField = (x, y) => [(x - GEO.cx) / GEO.R, (y - GEO.cy) / GEO.R];
function sendStir(a) {
  if (!stirP) return;
  const [fx, fy] = toField(stirP.sx, stirP.sy);
  send({ t:'stir', x:fx, y:fy, a, vx:stirP.vx, vy:stirP.vy, spd:stirP.spd });
}
cv.addEventListener('pointerdown', e => {
  const x = e.clientX, y = e.clientY;
  cv.setPointerCapture(e.pointerId);
  const i = hitOrg(x, y);
  if (i >= 0) {
    const nowT = performance.now();
    if (lastTap.i === i && nowT - lastTap.t < 320) { toggleSolo(i); lastTap = { i:-1, t:0 }; drag = null; return; }
    lastTap = { i, t:nowT };
    // keep the offset so the anchor moves with the finger even while the organism orbits
    const [fx, fy] = toField(x, y);
    drag = { i, mode:(e.shiftKey || e.altKey) ? 'bond' : 'move', x, y, x0:x, y0:y, moved:false, ox:S.v[i].bx - fx, oy:S.v[i].by - fy };
    return;
  }
  const [fx, fy] = toField(x, y);
  if (Math.hypot(fx, fy) < 1.2) { drag = { mode:'stir' }; stirP = { sx:x, sy:y, vx:0, vy:0, spd:0, t:performance.now() }; sendStir(1); }
});
cv.addEventListener('pointermove', e => {
  const x = e.clientX, y = e.clientY;
  if (!drag) { cv.style.cursor = hitOrg(x, y) >= 0 ? 'grab' : 'crosshair'; return; }
  if (drag.mode === 'stir') {
    const now = performance.now(), dtt = Math.max(8, now - stirP.t) / 1000;
    const vx = (x - stirP.sx) / GEO.R / dtt, vy = (y - stirP.sy) / GEO.R / dtt;
    stirP.vx = stirP.vx * 0.6 + vx * 0.4; stirP.vy = stirP.vy * 0.6 + vy * 0.4; stirP.spd = Math.hypot(stirP.vx, stirP.vy);
    stirP.sx = x; stirP.sy = y; stirP.t = now; sendStir(1); return;
  }
  drag.x = x; drag.y = y;
  if (Math.hypot(x - drag.x0, y - drag.y0) > 5) drag.moved = true;
  if (drag.mode === 'move' && drag.moved) {
    let [fx, fy] = toField(x, y); fx += drag.ox; fy += drag.oy;
    const r = Math.hypot(fx, fy); if (r > 1) { fx /= r; fy /= r; }
    setV(drag.i, 'bx', fx); setV(drag.i, 'by', fy);
    const P = S.v[drag.i];
    if (P.orbAround) {
      const d = Math.max(0.05, Math.hypot(fx, fy)), mx = Math.max(P.orbX, P.orbY, 0.01);
      setV(drag.i, 'orbX', clamp(P.orbX / mx * d, 0, 1)); setV(drag.i, 'orbY', clamp(P.orbY / mx * d, 0, 1)); refreshRefs();
    }
    if (!running) { vis[drag.i].tx = fx; vis[drag.i].ty = fy; }
  }
});
function endDrag(e) {
  if (!drag) return;
  if (drag.mode === 'stir') { sendStir(0); stirP = null; }
  else if (drag.mode === 'bond') {
    const j = hitOrg(e.clientX, e.clientY);
    if (j >= 0 && j !== drag.i) { const p = S.v[j]; p.fm[drag.i] = p.fm[drag.i] > 0.005 ? 0 : 0.3; send({ t:'v', i:j, k:'fm', j:drag.i, val:p.fm[drag.i] }); select(j); openSec('bonds'); }
  } else if (drag.mode === 'move' && !drag.moved) select(drag.i);
  drag = null;
}
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', () => { if (drag && drag.mode === 'stir') { sendStir(0); stirP = null; } drag = null; });
cv.addEventListener('wheel', e => {
  const i = hitOrg(e.clientX, e.clientY); if (i < 0) return;
  e.preventDefault(); setGainPos(i, posOf(S.v[i].gain) - e.deltaY * 0.0009);
}, { passive:false });

/* ---------------- recordings as grain sources ---------------- */
const fileIn = document.getElementById('file');
let loadTarget = 0;
async function loadFile(f, i) {
  try {
    const ctx = ac || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 48000);
    const ab = await ctx.decodeAudioData(await f.arrayBuffer());
    const sr = ab.sampleRate, n = Math.min(ab.length, sr * 90), mono = new Float32Array(n);
    for (let c = 0; c < ab.numberOfChannels; c++) { const d = ab.getChannelData(c); for (let s = 0; s < n; s++) mono[s] += d[s] / ab.numberOfChannels; }
    let pk = 0; for (let s = 0; s < n; s++) pk = Math.max(pk, Math.abs(mono[s]));
    if (pk > 0) for (let s = 0; s < n; s++) mono[s] *= 0.8 / pk;
    pendingSmp[i] = { mono, sr };
    S.files[i] = `${f.name} · ${(n / sr).toFixed(1)} s`;
    if (eng) send({ t:'sample', i, data:resample(mono, sr, ac.sampleRate) });
    setV(i, 'src', 1);
  } catch (err) { S.files[i] = 'Could not decode that file. Try WAV, MP3 or M4A.'; }
  select(i); openSec('cloud');
}
function resample(x, a, b) {
  if (a === b) return x;
  const n = Math.floor(x.length * b / a), y = new Float32Array(n), r = a / b;
  for (let i = 0; i < n; i++) { const p = i * r, k = p | 0, f = p - k; y[i] = x[k] + ((x[k + 1] || 0) - x[k]) * f; }
  return y;
}
fileIn.addEventListener('change', () => { if (fileIn.files[0]) loadFile(fileIn.files[0], loadTarget); fileIn.value = ''; });
const dropEl = document.getElementById('drop');
addEventListener('dragover', e => { e.preventDefault(); dropEl.hidden = false; });
addEventListener('dragleave', e => { if (!e.relatedTarget) dropEl.hidden = true; });
addEventListener('drop', e => {
  e.preventDefault(); dropEl.hidden = true;
  const f = e.dataTransfer.files[0]; if (!f) return;
  let i = hitOrg(e.clientX, e.clientY);
  if (i < 0) { let bd = 1e9; for (let k = 0; k < 4; k++) { const [X, Y] = toScreen(vis[k].x, vis[k].y), d = Math.hypot(X - e.clientX, Y - e.clientY); if (d < bd) { bd = d; i = k; } } }
  loadFile(f, i);
});

/* ---------------- console: widgets ---------------- */
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
const pct = v => Math.round(v * 100) + '%';
const hz = v => v >= 1000 ? (v / 1000).toFixed(1) + ' kHz' : (v < 10 ? v.toFixed(2) : Math.round(v)) + ' Hz';
const sec = v => v < 1 ? Math.round(v * 1000) + ' ms' : v.toFixed(2) + ' s';
const st = v => (v > 0 ? '+' : '') + Math.round(v) + ' st';
const period = hzv => hzv < 1 ? (1 / hzv).toFixed(hzv < 0.1 ? 0 : 1) + ' s' : hzv.toFixed(hzv < 10 ? 2 : 1) + ' Hz';
let refs = [], uid = 0;
function slider(spec, get, set) {
  const id = 'c' + (uid++);
  const w = el('div', 'ctl'), h = el('div', 'ctl-h'), lb = el('label', null, spec.l), out = el('output');
  lb.htmlFor = id; out.htmlFor = id; if (spec.tip) w.title = spec.tip;
  const inp = document.createElement('input'); inp.type = 'range'; inp.id = id; inp.min = 0; inp.max = 1000; inp.step = 1;
  const { min, max } = spec;
  const toT = v => spec.exp ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  const fromT = t => { let v = spec.exp ? min * Math.pow(max / min, t) : min + t * (max - min); if (spec.step) v = Math.round(v / spec.step) * spec.step; return v; };
  const paint = () => {
    const v = get(), t = clamp(toT(v), 0, 1) * 100;
    if (document.activeElement !== inp) inp.value = Math.round(t * 10);
    out.textContent = spec.fmt ? spec.fmt(v) : v.toFixed(2);
    const a = spec.bip ? Math.min(50, t) : 0, b = spec.bip ? Math.max(50, t) : t;
    inp.style.setProperty('--tr', `linear-gradient(90deg, var(--faint) ${a}%, var(--acc) ${a}% ${b}%, var(--faint) ${b}%)`);
  };
  inp.addEventListener('input', () => { set(fromT(inp.value / 1000)); paint(); });
  inp.addEventListener('dblclick', () => { if (spec.def != null) { set(spec.def); paint(); } });
  h.append(lb, out); w.append(h, inp); paint();
  refs.push(paint);
  return w;
}
function chips(label, opts, get, set, cls) {
  const w = el('div', 'row'); if (label) w.append(el('span', 'rl', label));
  const c = el('div', 'chips'); const bs = [];
  opts.forEach(([val, txt, extra]) => {
    const b = el('button', 'chip' + (cls ? ' ' + cls : ''), txt); if (extra) b.style.setProperty('--c', extra);
    b.addEventListener('click', () => { set(val); paint(); }); bs.push([b, val]); c.append(b);
  });
  const paint = () => { const g = get(); bs.forEach(([b, v]) => b.classList.toggle('on', Array.isArray(g) ? !!g[v] : g === v)); };
  paint(); refs.push(paint); w.append(c); return w;
}
function selectBox(opts, get, set, label) {
  const s = el('select', 'sel'); if (label) s.setAttribute('aria-label', label);
  opts.forEach(([v, l]) => { const o = el('option', null, l); o.value = v; s.append(o); });
  s.value = get(); s.addEventListener('change', () => set(isNaN(+s.value) ? s.value : +s.value));
  refs.push(() => { s.value = get(); });
  return s;
}
function refreshRefs() { refs.forEach(f => f()); }

/* ---------------- console: mixer strips ---------------- */
const mixEl = document.getElementById('mix'), strips = [];
function setGainPos(i, t) { setV(i, 'gain', gainOf(clamp(t, 0, 1))); paintMixer(); }
function toggleSolo(i) { S.ch[i].solo = S.ch[i].solo ? 0 : 1; applyGates(); }
function buildMixer() {
  mixEl.innerHTML = ''; strips.length = 0;
  for (let i = 0; i < 4; i++) {
    const s = el('div', 'strip'); s.style.setProperty('--c', COLS[i]);
    const h = el('div', 'strip-h');
    const who = el('button', 'who', NAMES[i]); who.setAttribute('aria-label', 'Select organism ' + NAMES[i].toUpperCase()); who.addEventListener('click', () => select(i));
    const pop = el('div', 'pop'); pop.title = 'Population'; const pi = el('i'); pop.append(pi);
    h.append(who, pop);
    const fdr = el('div', 'fdr');
    const fd = el('div', 'fd'); fd.tabIndex = 0; fd.setAttribute('role', 'slider'); fd.setAttribute('aria-label', 'Gain ' + NAMES[i].toUpperCase());
    const fill = el('div', 'fill'), zero = el('div', 'zero'), cap = el('div', 'cap');
    zero.style.bottom = (posOf(1) * 100) + '%';
    fd.append(fill, zero, cap);
    const mtr = el('div', 'mtr'), mi = el('i'), mb = el('b'); mtr.append(mi, mb);
    fdr.append(fd, mtr);
    const db = el('div', 'db');
    const flt = el('div', 'flt'); flt.tabIndex = 0; flt.setAttribute('role', 'slider');
    flt.setAttribute('aria-label', 'Filter movement ' + NAMES[i].toUpperCase()); flt.title = 'Filter: the dot is the live cutoff. Drag sideways to set how far the LFO moves it, tap to edit';
    const fRng = el('span', 'rng'), fDot = el('i'); flt.append(fRng, fDot);
    const ms = el('div', 'ms'), bm = el('button', 'm', 'M'), bs = el('button', 's', 'S');
    bm.setAttribute('aria-label', 'Mute ' + NAMES[i].toUpperCase()); bs.setAttribute('aria-label', 'Solo ' + NAMES[i].toUpperCase());
    bm.addEventListener('click', () => { S.ch[i].mute = S.ch[i].mute ? 0 : 1; applyGates(); });
    bs.addEventListener('click', () => toggleSolo(i));
    ms.append(bm, bs);
    s.append(h, fdr, db, flt, ms); mixEl.append(s);
    let fdDrag = null;
    fd.addEventListener('pointerdown', e => { fd.setPointerCapture(e.pointerId); fdDrag = { y:e.clientY, t:posOf(S.v[i].gain) }; e.preventDefault(); });
    fd.addEventListener('pointermove', e => { if (!fdDrag) return; const hgt = fd.clientHeight; setGainPos(i, fdDrag.t - (e.clientY - fdDrag.y) / hgt * (e.shiftKey ? 0.25 : 1)); });
    fd.addEventListener('pointerup', () => { fdDrag = null; });
    fd.addEventListener('dblclick', () => setGainPos(i, posOf(0.7)));
    fd.addEventListener('wheel', e => { e.preventDefault(); setGainPos(i, posOf(S.v[i].gain) - e.deltaY * 0.0009); }, { passive:false });
    fd.addEventListener('keydown', e => { const d = { ArrowUp:0.02, ArrowDown:-0.02, PageUp:0.08, PageDown:-0.08 }[e.key]; if (d) { e.preventDefault(); setGainPos(i, posOf(S.v[i].gain) + d); } });
    let flDrag = null;
    flt.addEventListener('pointerdown', e => { flt.setPointerCapture(e.pointerId); flDrag = { x:e.clientX, d:S.v[i].flDepth, moved:false }; e.preventDefault(); });
    flt.addEventListener('pointermove', e => { if (!flDrag) return; const dx = e.clientX - flDrag.x; if (Math.abs(dx) > 3) flDrag.moved = true;
      if (flDrag.moved) { setV(i, 'flDepth', clamp(flDrag.d + dx / flt.clientWidth, 0, 1)); refreshRefs(); } });
    flt.addEventListener('pointerup', () => { if (flDrag && !flDrag.moved) { select(i); openSec('filter'); } flDrag = null; });
    flt.addEventListener('keydown', e => { const d = { ArrowRight:0.05, ArrowLeft:-0.05 }[e.key]; if (d) { e.preventDefault(); setV(i, 'flDepth', clamp(S.v[i].flDepth + d, 0, 1)); refreshRefs(); } });
    strips.push({ s, fill, cap, mi, mb, db, bm, bs, pi, fd, fRng, fDot });
  }
  paintMixer();
}
function paintMixer() {
  strips.forEach((k, i) => {
    const t = posOf(S.v[i].gain) * 100;
    k.fill.style.height = t + '%'; k.cap.style.bottom = t + '%';
    k.fd.setAttribute('aria-valuetext', fmtDb(dbOf(S.v[i].gain)) + ' dB');
    k.s.classList.toggle('sel', sel === i && tab === 'org');
    k.s.classList.toggle('off', !S.v[i].gate);
    k.bm.classList.toggle('on', !!S.ch[i].mute); k.bs.classList.toggle('on', !!S.ch[i].solo);
  });
}
const fmtDb = d => d === -Infinity ? '−∞' : (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toFixed(1);
const meterT = d => clamp((d + 60) / 66, 0, 1);
function paintMeters(dt) {
  strips.forEach((k, i) => {
    const z = vis[i], d = running ? Math.max(-90, dbOf(z.lvl)) : -90;
    z.pk = Math.max(d, z.pk - dt * 30);
    if (d >= z.hold || performance.now() - z.holdT > 1500) { z.hold = d; z.holdT = performance.now(); }
    k.mi.style.height = (meterT(z.pk) * 100) + '%';
    k.mb.style.bottom = (meterT(z.hold) * 100) + '%';
    k.db.textContent = z.hold > -60 ? fmtDb(z.hold) : fmtDb(dbOf(S.v[i].gain));
    k.db.classList.toggle('clip', z.hold > -0.3);
    k.pi.style.width = (clamp(z.pop, 0, 1.2) / 1.2 * 100) + '%';
    const p = S.v[i], base = clamp(p.tone, 0, 1), span = p.flDepth * 3.5 / 9.5;
    k.fRng.style.left = (clamp(base - span, 0, 1) * 100) + '%'; k.fRng.style.right = ((1 - clamp(base + span, 0, 1)) * 100) + '%';
    k.fDot.style.left = ((running ? z.fn : base) * 100) + '%';
  });
}

/* ---------------- console: pages ---------------- */
let sel = 0, tab = 'org';
const tabsEl = document.getElementById('tabs'), pg = document.getElementById('pg');
const shut = store.get('shut3', {});
function section(key, title, sub, build) {
  const s = el('section', 'sec' + (shut[key] ? ' shut' : '')); s.dataset.key = key;
  const h = el('button', 'sec-h'); h.append(el('b', null, title), el('small', null, sub || ''), el('span', null, '▾'));
  h.setAttribute('aria-expanded', String(!shut[key]));
  h.addEventListener('click', () => { shut[key] = !shut[key]; store.set('shut3', shut); s.classList.toggle('shut', !!shut[key]); h.setAttribute('aria-expanded', String(!shut[key])); });
  const b = el('div', 'sec-b'); build(b); s.append(h, b); return s;
}
function openSec(key) {
  if (shut[key]) { shut[key] = false; store.set('shut3', shut); }
  const s = pg.querySelector(`[data-key="${key}"]`); if (s) { s.classList.remove('shut'); s.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
}
function select(i) { sel = i; tab = 'org'; panel.classList.remove('min'); render(); }
function renderTabs() {
  tabsEl.innerHTML = '';
  const a = el('button', 'tab' + (tab === 'org' ? ' on' : '')); a.append(el('i', 'dot'), document.createTextNode('Organism ' + NAMES[sel].toUpperCase()));
  a.addEventListener('click', () => { tab = 'org'; render(); });
  const b = el('button', 'tab' + (tab === 'world' ? ' on' : ''), 'World'); b.addEventListener('click', () => { tab = 'world'; render(); });
  const f = el('button', 'fold', panel.classList.contains('min') ? '▴' : '▾'); f.setAttribute('aria-label', 'Collapse console');
  f.addEventListener('click', () => { panel.classList.toggle('min'); renderTabs(); });
  tabsEl.append(a, b, el('span', 'sp'), f);
}

let lfoInd = null;
function render() {
  refs = []; lfoInd = null;
  panel.style.setProperty('--acc', tab === 'org' ? COLS[sel] : '#d4e6e9');
  renderTabs(); paintMixer();
  const top = pg.scrollTop; pg.innerHTML = '';
  const i = sel, sv = k => v => setV(i, k, v), gv = k => () => S.v[i][k];
  if (tab === 'org') {
    pg.append(section('voice', 'voice', 'pitch · shape · fm', b => {
      const two = el('div', 'two');
      two.append(
        slider({ l:'Octave', min:-4, max:3, step:1, fmt:v => (v > 0 ? '+' : '') + v, def:0 }, gv('oct'), sv('oct')),
        slider({ l:'Fine tune', min:-1, max:1, bip:1, fmt:v => (v > 0 ? '+' : '') + Math.round(v * 100) + ' ct', def:0 }, gv('tune'), sv('tune')),
        slider({ l:'Body', min:0, max:1, fmt:pct, def:0.45, tip:'Level of the oscillator against its grain cloud' }, gv('body'), sv('body')),
        slider({ l:'Glide', min:0, max:1, fmt:v => sec(0.002 + v * v * 3), def:0.2 }, gv('glide'), sv('glide')),
        slider({ l:'Sharp', min:0, max:1, fmt:pct, def:0.2, tip:'Folds the sine into richer harmonics; the top quarter gets wild' }, gv('fold'), sv('fold')),
        slider({ l:'Self-bend', min:0, max:1, fmt:pct, def:0.1, tip:'Feedback FM of the voice into itself; above 70% it tips into chaos' }, gv('fb'), sv('fb')),
        slider({ l:'Harmonic FM', min:0, max:1, fmt:pct, def:0 }, gv('index'), sv('index'))
      );
      b.append(two);
      b.append(chips('Harmonic ratio', [[0.5, '×½'], [1, '×1'], [2, '×2'], [3, '×3'], [4, '×4'], [5, '×5'], [7, '×7']], gv('ratio'), sv('ratio')));
    }));
    pg.append(section('colour', 'colour', 'roar · ring · hum · sing', b => {
      const two = el('div', 'two');
      two.append(
        slider({ l:'Roar', min:0, max:1, fmt:pct, def:0, tip:'Warm asymmetric tube drive' }, gv('roar'), sv('roar')),
        slider({ l:'Ring', min:0, max:1, fmt:pct, def:0, tip:'Bell partials that open with each hit, plus a string resonance on the note' }, gv('ring'), sv('ring')),
        slider({ l:'Hum', min:0, max:1, fmt:pct, def:0, tip:'A detuned twin that beats slowly against the voice, and a sub octave' }, gv('hum'), sv('hum')),
        slider({ l:'Sing', min:0, max:1, fmt:pct, def:0, tip:'Vibrato and two soft formants drifting through vowels' }, gv('sing'), sv('sing')),
        slider({ l:'Crush', min:0, max:1, fmt:v => v < 0.003 ? 'off' : Math.round(14 - v * 11) + ' bit · ÷' + (1 + Math.floor(v * v * 48)), def:0, tip:'Sample-rate and bit reduction' }, gv('crush'), sv('crush'))
      );
      b.append(two);
    }));
    pg.append(section('filter', 'filter', 'its own movement', b => {
      b.append(chips(null, [[0, 'Lowpass'], [1, 'Bandpass'], [2, 'Highpass'], [3, 'Notch']], gv('fmode'), sv('fmode')));
      const two = el('div', 'two');
      const SYNCL = ['8 bars', '4 bars', '2 bars', '1 bar', '1/2', '1/4', '1/8', '1/16'];
      two.append(
        slider({ l:'Cutoff', min:0, max:1, fmt:v => hz(30 * Math.pow(2, v * 9.5)), def:0.6 }, gv('tone'), sv('tone')),
        slider({ l:'Resonance', min:0, max:1, fmt:v => v > 0.93 ? 'scream' : pct(v), def:0.2 }, gv('res'), sv('res'))
      );
      b.append(two);
      const mod = el('div', 'two');
      mod.append(
        slider({ l:'LFO rate', min:0, max:1, fmt:v => S.v[i].flSync ? SYNCL[Math.round(v * 7)] : period(0.02 * Math.pow(2000, v)), def:0.3 }, gv('flRate'), sv('flRate')),
        slider({ l:'LFO depth', min:0, max:1, fmt:v => '±' + (v * 3.5).toFixed(1) + ' oct', def:0 }, gv('flDepth'), sv('flDepth')),
        slider({ l:'Env → cutoff', min:-1, max:1, bip:1, fmt:v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 4).toFixed(1) + ' oct', def:0 }, gv('flEnv'), sv('flEnv')),
        slider({ l:'Near → bright', min:-1, max:1, bip:1, fmt:v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 2.5).toFixed(1) + ' oct', def:0, tip:'Cutoff follows distance: positive opens it as the organism comes close, negative as it moves away' }, gv('flSpace'), sv('flSpace')),
        slider({ l:'Audio FM', min:0, max:1, fmt:v => v < 0.003 ? 'off' : pct(v), def:0, tip:'The organism modulates its own cutoff at audio rate: snarls, growls, metallic edges' }, gv('flFM'), sv('flFM'))
      );
      const ind = el('div', 'lfo-ind'); ind.append(el('i')); lfoInd = ind;
      const indWrap = el('div', 'ctl'); const ih = el('div', 'ctl-h'); ih.append(el('label', null, 'Cutoff now')); indWrap.append(ih, ind);
      mod.append(indWrap);
      b.append(mod);
      b.append(chips('LFO shape', [[0, 'Sine'], [1, 'Tri'], [5, 'Ramp'], [2, 'Drift'], [3, 'Step'], [4, 'Chaos']], gv('flShape'), sv('flShape')));
      b.append(chips('LFO clock', [[0, 'Free'], [1, 'Tempo']], gv('flSync'), v => { setV(i, 'flSync', v); refreshRefs(); }));
    }));
    pg.append(section('orbit', 'orbit', 'how it travels', b => {
      b.append(chips('Around', [[0, 'Its cross'], [1, 'The listener']], gv('orbAround'), v => {
        setV(i, 'orbAround', v);
        if (v) { const d = Math.max(0.3, Math.hypot(S.v[i].bx, S.v[i].by)); setV(i, 'orbX', d); setV(i, 'orbY', d); }
        else { setV(i, 'orbX', 0.3); setV(i, 'orbY', 0.2); }
        refreshRefs();
      }));
      b.append(chips('Path', SHAPE_NAMES.map((l, n) => [n, l]), gv('orbShape'), sv('orbShape')));
      b.append(chips(null, [[1, '↻ Clockwise'], [-1, '↺ Counter']], gv('orbDir'), sv('orbDir')));
      const two = el('div', 'two');
      two.append(
        slider({ l:'Speed', min:0, max:1, fmt:v => v <= 0 ? 'still' : period(0.004 * Math.pow(2000, v)), def:0, tip:'Up to 8 Hz: at the top it whirls like a rotating speaker' }, gv('orbSpeed'), sv('orbSpeed')),
        slider({ l:'Tilt', min:-90 * D2R, max:90 * D2R, bip:1, fmt:v => Math.round(v / D2R) + '°', def:0 }, gv('orbTilt'), sv('orbTilt')),
        slider({ l:'Axis X', min:0, max:1, fmt:pct, def:0.25 }, gv('orbX'), sv('orbX')),
        slider({ l:'Axis Y', min:0, max:1, fmt:pct, def:0.15 }, gv('orbY'), sv('orbY'))
      );
      b.append(two);
      b.append(el('p', 'lede', 'Around the listener, the organism circles you, passing behind your head; drag it in or out to set the radius. Wander flies to random points inside its area. World › Motion scales every path and sets the doppler.'));
    }));
    pg.append(section('bonds', 'bonds', 'who bends ' + NAMES[i], b => {
      const three = el('div', 'three');
      for (let j = 0; j < 4; j++) if (j !== i) three.append(slider({ l:`${NAMES[j].toUpperCase()} → ${NAMES[i].toUpperCase()}`, min:0, max:1, fmt:pct, def:0 }, () => S.v[i].fm[j], v => { S.v[i].fm[j] = v; send({ t:'v', i, k:'fm', j, val:v }); }));
      b.append(three);
    }));
    pg.append(section('cloud', 'cloud', 'grains', b => {
      b.append(chips('Grain source', [[0, 'Memory ring'], [1, S.files[i] ? 'Recording · ' + S.files[i] : 'Recording…']], gv('src'), v => {
        if (v === 1 && (!S.files[i] || S.v[i].src === 1)) { loadTarget = i; fileIn.click(); return; }
        setV(i, 'src', v);
      }));
      const two = el('div', 'two');
      two.append(
        slider({ l:'Cloud', min:0, max:1, fmt:pct, def:0.5 }, gv('cloud'), sv('cloud')),
        slider({ l:'Density', min:0.5, max:200, exp:1, fmt:v => (v < 10 ? v.toFixed(1) : Math.round(v)) + ' /s', def:10 }, gv('density'), sv('density')),
        slider({ l:'Grain size', min:0, max:1, fmt:v => sec(0.012 * Math.pow(100, v)), def:0.35 }, gv('size'), sv('size')),
        slider({ l:'Position', min:0, max:1, fmt:v => S.v[i].src === 1 ? pct(v) : '−' + (v * 6.6 + 0.05).toFixed(1) + ' s', def:0.3 }, gv('pos'), sv('pos')),
        slider({ l:'Spray', min:0, max:1, fmt:pct, def:0.3 }, gv('spray'), sv('spray')),
        slider({ l:'Width', min:0, max:1, fmt:pct, def:0.6 }, gv('width'), sv('width')),
        slider({ l:'Transpose', min:-36, max:36, step:1, fmt:st, bip:1, def:0 }, gv('trans'), sv('trans')),
        slider({ l:'Scatter', min:0, max:24, step:1, fmt:v => '±' + v + ' st', def:4 }, gv('scatter'), sv('scatter')),
        slider({ l:'Reverse', min:0, max:1, fmt:pct, def:0.15 }, gv('rev'), sv('rev'))
      );
      b.append(two);
      b.append(chips('Grain pitch', [[1, 'Follows notes'], [0, 'Free']], gv('track'), sv('track')));
    }));
    pg.append(section('pulse', 'pulse', 'euclidean ring', b => {
      b.append(chips(null, [[0, 'Drone'], [1, 'Pulse']], gv('pulse'), sv('pulse')));
      const grid = el('div', 'pat'); grid.id = 'patGrid'; b.append(grid);
      const three = el('div', 'three');
      three.append(
        slider({ l:'Steps', min:2, max:16, step:1, fmt:v => v, def:16 }, gv('steps'), v => { setV(i, 'steps', v); if (S.v[i].hits > v) setV(i, 'hits', v); }),
        slider({ l:'Hits', min:0, max:16, step:1, fmt:v => v, def:5 }, gv('hits'), v => setV(i, 'hits', Math.min(v, S.v[i].steps))),
        slider({ l:'Rotate', min:0, max:15, step:1, fmt:v => v, def:0 }, gv('rot'), sv('rot')),
        slider({ l:'Attack', min:0.002, max:4, exp:1, fmt:sec, def:0.004, tip:'Pulse attack, or the swell time of a drone' }, gv('attack'), sv('attack')),
        slider({ l:'Decay', min:0.02, max:4, exp:1, fmt:sec, def:0.4 }, gv('decay'), sv('decay')),
        slider({ l:'Chance', min:0, max:1, fmt:pct, def:0.9 }, gv('prob'), sv('prob')),
        slider({ l:'Wander', min:0, max:1, fmt:pct, def:0.4 }, gv('wander'), sv('wander'))
      );
      b.append(three);
      b.append(chips('Step length', DIVS.map(([v, l]) => [v, l]), gv('div'), sv('div')));
    }));
    drawPat();
  } else {
    pg.append(section('eco', 'motion', 'ecology · pressure · doppler', b => {
      const c = document.createElement('canvas'); c.className = 'pops'; c.id = 'popsCv'; b.append(c);
      const two = el('div', 'two');
      two.append(
        slider({ l:'Ecology', min:0, max:1, fmt:pct, def:0.3, tip:'How much each population swells and starves its organism' }, () => S.g.eco, v => setG('eco', v)),
        slider({ l:'Life speed', min:0, max:1, fmt:pct, def:0.3 }, () => S.g.ecoRate, v => setG('ecoRate', v)),
        slider({ l:'Pressure', min:0, max:3, fmt:v => '×' + v.toFixed(2), def:1, tip:'Scales every bond' }, () => S.g.pressure, v => setG('pressure', v)),
        slider({ l:'Motion', min:0, max:3, fmt:pct, def:1, tip:'Scales every orbit, depth and drift' }, () => S.g.motion, v => setG('motion', v)),
        slider({ l:'Doppler', min:0, max:1, fmt:pct, def:0.4, tip:'Pitch bends as organisms rush toward or away from you' }, () => S.g.doppler, v => setG('doppler', v))
      );
      b.append(two);
    }));
    pg.append(section('tides', 'tides', 'modulation', b => {
      S.t.forEach((t, k) => {
        const c = el('div', 'card'), h = el('div', 'card-h');
        const setT = key => v => { t[key] = v; send({ t:'tide', i:k, k:key, val:v }); };
        h.append(el('b', null, 'tide ' + ['i', 'ii', 'iii', 'iv'][k]), selectBox(TARGETS.map((l, n) => [n, l]), () => t.target, setT('target'), 'Target'));
        const sp = document.createElement('canvas'); sp.width = 144; sp.height = 44; sp.dataset.tide = k; h.append(sp);
        c.append(h);
        c.append(chips(null, SHAPES.map((l, n) => [n, l]), () => t.shape, setT('shape')));
        const three = el('div', 'three');
        three.append(
          slider({ l:'Rate', min:0.005, max:80, exp:1, fmt:period, def:0.05 }, () => t.rate, setT('rate')),
          slider({ l:'Depth', min:-1, max:1, bip:1, fmt:v => (v > 0 ? '+' : '') + Math.round(v * 100), def:0 }, () => t.depth, setT('depth')),
          slider({ l:'Spread', min:0, max:1, fmt:pct, def:0.5 }, () => t.spread, setT('spread'))
        );
        c.append(three);
        c.append(chips(null, [0, 1, 2, 3].map(n => [n, NAMES[n].toUpperCase(), COLS[n]]), () => t.mask, n => { t.mask[n] = t.mask[n] ? 0 : 1; send({ t:'tide', i:k, k:'mask', val:t.mask.slice() }); }, 'vc'));
        b.append(c);
      });
    }));
    pg.append(section('space', 'space', 'room · echo · drive', b => {
      const sp = S.sp, setS = k => v => { sp[k] = v; applySpace(k); };
      const two = el('div', 'two');
      two.append(
        slider({ l:'Room size', min:1, max:12, exp:1, fmt:v => v.toFixed(1) + ' s', def:5.5 }, () => sp.room, setS('room')),
        slider({ l:'Room', min:0, max:1, fmt:pct, def:0.55 }, () => sp.roomLvl, setS('roomLvl')),
        slider({ l:'Echo time', min:0.03, max:1.6, exp:1, fmt:sec, def:0.46 }, () => sp.echo, setS('echo')),
        slider({ l:'Echo return', min:0, max:ECHO_MAX, fmt:pct, def:0.4, tip:'Long, dense tails near the top; the loop can no longer run away' }, () => sp.echoFb, setS('echoFb')),
        slider({ l:'Echo', min:0, max:1, fmt:pct, def:0.3 }, () => sp.echoLvl, setS('echoLvl')),
        slider({ l:'Echo wobble', min:0, max:1, fmt:pct, def:0.3 }, () => sp.wob, setS('wob')),
        slider({ l:'Wobble rate', min:0, max:1, fmt:v => period(0.05 * Math.pow(120, v)), def:0.3 }, () => sp.wobRate, setS('wobRate')),
        slider({ l:'Drive', min:0, max:1, fmt:pct, def:0.15, tip:'Warm master saturation' }, () => sp.drive, setS('drive')),
        slider({ l:'Stereo width', min:0, max:2, fmt:pct, def:1.15 }, () => S.g.width, v => setG('width', v)),
        slider({ l:'Memory feed', min:0, max:1, fmt:pct, def:0.5 }, () => S.g.memFeed, v => setG('memFeed', v)),
        slider({ l:'Master', min:0, max:1.2, fmt:v => fmtDb(dbOf(v)) + ' dB', def:0.85 }, () => sp.master, setS('master'))
      );
      b.append(two);
    }));
    pg.append(section('clock', 'clock', 'tempo · scale · mutation', b => {
      const sg = k => v => { setG(k, v); syncTop(); };
      const two = el('div', 'two');
      two.append(
        slider({ l:'Tempo', min:20, max:220, step:1, fmt:v => v + ' bpm', def:74 }, () => S.g.bpm, sg('bpm')),
        slider({ l:'Root', min:28, max:60, step:1, fmt:noteName, def:45 }, () => S.g.root, sg('root')),
        slider({ l:'Mutation', min:0, max:1, fmt:pct, def:0.25 }, () => S.g.mutate, sg('mutate')),
        slider({ l:'Drift', min:0, max:1, fmt:pct, def:0.3 }, () => S.g.drift, sg('drift'))
      );
      b.append(two);
      b.append(chips('Scale', SCALES, () => S.g.scale, sg('scale')));
      const a = el('div', 'act');
      const b1 = el('button', 'chip', 'Seed a new ecosystem'); b1.addEventListener('click', () => seed(false));
      const b3 = el('button', 'chip', 'Seed a wild one'); b3.addEventListener('click', () => seed(true));
      const b2 = el('button', 'chip', 'Erase memory'); b2.addEventListener('click', () => { send({ t:'clearMem' }); memOv = new Float32Array(240); });
      a.append(b1, b3, b2); b.append(a);
    }));
  }
  pg.scrollTop = top;
}
function paintLfo() {
  if (!lfoInd || !lfoInd.isConnected) return;
  const p = S.v[sel], v = running ? vis[sel].fn : p.tone;
  lfoInd.firstChild.style.left = (clamp(v, 0, 1) * 100) + '%';
  lfoInd.classList.toggle('idle', !running);
}
function drawPat() {
  const g = document.getElementById('patGrid'); if (!g) return;
  const pat = pats[sel]; g.innerHTML = '';
  g.style.gridTemplateColumns = `repeat(${Math.max(8, pat.length)}, 1fr)`;
  pat.forEach((h, j) => {
    const b = el('button', 'cell' + (h ? ' hit' : '') + (vis[sel].step === j ? ' now' : ''));
    b.setAttribute('aria-label', `Step ${j + 1} ${h ? 'on' : 'off'}`);
    b.addEventListener('click', () => { pats[sel][j] = pats[sel][j] ? 0 : 1; send({ t:'v', i:sel, k:'patStep', j }); drawPat(); });
    g.append(b);
  });
}
function onStep(i) {
  if (tab === 'org' && i === sel) {
    const g = document.getElementById('patGrid'); if (!g) return;
    [...g.children].forEach((c, j) => c.classList.toggle('now', j === vis[i].step));
  }
}
function drawWorldViz() {
  document.querySelectorAll('canvas[data-tide]').forEach(c => {
    const k = +c.dataset.tide, h = tideHist[k], g = c.getContext('2d'), w = c.width, hh = c.height;
    g.clearRect(0, 0, w, hh);
    g.strokeStyle = 'rgba(120,170,180,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke();
    if (h.length < 2) return;
    g.strokeStyle = '#d4e6e9'; g.lineWidth = 2; g.beginPath();
    h.forEach((v, n) => { const x = n / 59 * w, y = hh / 2 - v * (hh / 2 - 4); n ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  });
  const pc = document.getElementById('popsCv'); if (!pc) return;
  const f = fitCanvas(pc); if (!f) return;
  const { g, w, h: hh } = f;
  g.strokeStyle = 'rgba(120,170,180,0.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, hh - 1); g.lineTo(w, hh - 1); g.stroke();
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = COLS[i]; g.lineWidth = 1.4; g.beginPath();
    popHist.forEach((v, n) => { const x = n / 239 * w, y = hh - 2 - clamp(v[i], 0, 1.2) / 1.2 * (hh - 4); n ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
}

/* ---------------- top bar ---------------- */
const wakeBtn = document.getElementById('wake'), statEl = document.getElementById('stat'), frBtn = document.getElementById('freezeBtn'), recBtn = document.getElementById('recBtn');
document.getElementById('ver').textContent = VERSION;
function syncTop() {
  const sc = SCALES.find(s => s[0] === S.g.scale);
  if (!ac) { statEl.textContent = 'dormant · press wake'; wakeBtn.textContent = 'Wake'; wakeBtn.classList.remove('live'); }
  else if (running) { statEl.textContent = `alive · ${S.g.bpm} bpm · ${sc[1]} on ${noteName(S.g.root)}`; wakeBtn.textContent = 'Sleep'; wakeBtn.classList.add('live'); }
  else { statEl.textContent = 'asleep'; wakeBtn.textContent = 'Wake'; wakeBtn.classList.remove('live'); }
  frBtn.classList.toggle('on', !!S.g.freeze);
  recBtn.classList.toggle('on', !!rec);
  if (!rec) recBtn.textContent = 'Rec';
}
wakeBtn.addEventListener('click', wake);
frBtn.addEventListener('click', () => { setG('freeze', S.g.freeze ? 0 : 1); syncTop(); });
recBtn.addEventListener('click', toggleRec);
document.getElementById('seedBtn').addEventListener('click', () => seed(false));
addEventListener('keydown', e => {
  const tg = e.target.tagName; if (tg === 'SELECT' || (tg === 'INPUT' && e.target.type !== 'range')) return;
  if (e.code === 'Space' && (e.target === document.body || e.target === cv)) { e.preventDefault(); wake(); }
  if (/^Digit[1-4]$/.test(e.code)) select(+e.code.slice(5) - 1);
  if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) toggleRec();
  if (e.code === 'KeyM') { S.ch[sel].mute = S.ch[sel].mute ? 0 : 1; applyGates(); }
  if (e.code === 'KeyS' && !e.metaKey && !e.ctrlKey) toggleSolo(sel);
  if (e.code === 'KeyW' && !e.metaKey && !e.ctrlKey) seed(true);
});

/* ---------------- seeding ---------------- */
function seed(wild) {
  const g = S.g, W = wild ? 1 : 0, x = (calm, w) => W ? w : calm;
  g.scale = pick(SCALES)[0]; g.root = pick([36, 38, 40, 41, 43, 45, 46, 48]); g.bpm = Math.round(rnd(52, 128));
  g.mutate = rnd(0.1, 0.5); g.drift = rnd(0.15, 0.5); g.pressure = x(rnd(0.6, 1.4), rnd(1.3, 2.6)); g.eco = rnd(0.15, 0.5); g.ecoRate = rnd(0.15, 0.5);
  g.motion = x(1, rnd(1.2, 2.2)); g.doppler = x(rnd(0.2, 0.5), rnd(0.5, 1));
  const off = rnd(0, 360), pulses = [1, 1, 0, 0].sort(() => Math.random() - 0.5), cols = COLOURS.slice().sort(() => Math.random() - 0.5);
  S.v = S.v.map((old, i) => {
    const [bx, by] = polar(off + i * 90 + rnd(-35, 35), rnd(0.25, 0.75));
    const steps = pick([5, 7, 8, 9, 11, 12, 13, 16]);
    const fm = [0, 1, 2, 3].map(j => j !== i && Math.random() < x(0.35, 0.6) ? rnd(0.05, x(0.4, 0.85)) : 0);
    const col = { roar:0, ring:0, hum:0, sing:0, crush: W && Math.random() < 0.4 ? rnd(0.2, 0.8) : 0 }; col[cols[i]] = rnd(0.35, x(0.8, 1)); if (Math.random() < 0.5) { const k2 = pick(COLOURS); col[k2] = Math.max(col[k2], rnd(0, 0.35)); }
    const pulse = Math.random() < 0.2 ? 1 - pulses[i] : pulses[i];
    return voice(Object.assign({ bx, by, gate:old.gate, gain:old.gain, src: S.files[i] && Math.random() < 0.7 ? 1 : 0, pulse,
      oct: pick([-2, -1, -1, 0, 0, 1]), tune: Math.random() < 0.3 ? rnd(-0.15, 0.15) : 0, body: rnd(0.3, 0.6), fold: rnd(0, x(0.6, 1)), fb: Math.random() < 0.5 ? rnd(0, x(0.4, 0.9)) : 0,
      ratio: pick([0.5, 1, 2, 2, 3, 4, 5, 7]), index: Math.random() < x(0.5, 0.7) ? rnd(0, x(0.45, 0.9)) : 0,
      fmode: pick([0, 0, 0, 1, 1, 2, 3]), tone: rnd(0.45, 0.8), res: rnd(0.05, x(0.6, 0.97)), flRate: rnd(0.05, x(0.7, 0.9)), flSync: Math.random() < 0.4 ? 1 : 0, flDepth: Math.random() < 0.85 ? rnd(0.15, x(0.6, 0.95)) : 0,
      flShape: (Math.random() * 6) | 0, flEnv: pulse ? rnd(0, 0.6) : 0, flSpace: Math.random() < 0.5 ? rnd(-0.6, 0.8) : 0, flFM: W && Math.random() < 0.4 ? rnd(0.1, 0.7) : 0,
      orbAround: Math.random() < x(0.4, 0.7) ? 1 : 0, orbShape: (Math.random() * 5) | 0, orbSpeed: Math.random() < 0.9 ? rnd(0.2, x(0.6, 0.95)) : 0, orbDir: pick([-1, 1]), orbTilt: rnd(-90, 90) * D2R,
      glide: rnd(0, 0.6), attack: pulse ? 0.002 * Math.pow(20, Math.random()) : rnd(0.3, 3), fm, density: 2 * Math.pow(25, Math.random()), size: rnd(0.15, 0.8),
      pos: rnd(0, 0.7), spray: rnd(0, 0.7), trans: pick([-12, -5, 0, 0, 7, 12]), scatter: pick([0, 2, 5, 7, 12]), rev: rnd(0, 0.5),
      width: rnd(0.3, 1), cloud: rnd(0.3, 0.7), steps, hits: Math.max(1, Math.round(steps * rnd(0.2, 0.6))), rot: (Math.random() * steps) | 0,
      div: pick(DIVS)[0], prob: rnd(0.6, 1), decay: 0.06 * Math.pow(40, Math.random()), wander: rnd(0.1, 0.7) }, col));
  });
  S.v.forEach(p => { if (p.orbAround) { p.orbX = rnd(0.45, 0.95); p.orbY = rnd(0.45, 0.95); } else { p.orbX = rnd(0.1, 0.55); p.orbY = rnd(0.08, 0.45); } });
  const one = (target, depth) => ({ rate: 0.02 * Math.pow(60, Math.random()), shape: (Math.random() * 8) | 0, target, depth, spread: rnd(0, 1), mask: [1, 1, 1, 1] });
  S.t = [
    { rate: rnd(0.01, 0.05), shape: pick([0, 3]), target: 0, depth: rnd(0.1, 0.3) * pick([-1, 1]), spread: 1, mask: [1, 1, 1, 1] },
    one(pick([4, 5, 6, 7, 14]), rnd(-0.5, 0.5)),
    one(pick([3, 8, 9, 10, 11, 12, 13, 15, 16, 17]), rnd(-0.4, 0.4)),
    Math.random() < 0.5 ? one(1, rnd(0.15, 0.4)) : one(2, rnd(0.01, 0.05) * pick([-1, 1]))
  ];
  S.sp.room = rnd(2, 9); S.sp.echo = rnd(0.12, 0.9); S.sp.echoFb = rnd(0.2, x(0.7, 0.88)); S.sp.wob = rnd(0, 0.6); S.sp.wobRate = rnd(0.1, 0.6);
  for (let i = 0; i < 4; i++) { pats[i] = euclidJS(S.v[i]); vis[i].col = COLOURS.map(k => S.v[i][k]); if (!running) { vis[i].tx = S.v[i].bx; vis[i].ty = S.v[i].by; } }
  send({ t:'state', voices:S.v, g:S.g, tides:S.t });
  applySpace();
  render(); syncTop();
}

/* ---------------- boot ---------------- */
buildMixer(); render(); syncTop(); requestAnimationFrame(loop);
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') && !window.claude) {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
