# Symbiont 0.3

A generative feedback / FM / granular instrument built as an ecosystem.
Four organisms live in a polar listening field around you. They bend each other's phase, feed on a shared memory of everything the room has heard, compete as populations, and rewrite their own rhythms while they play. Nothing repeats exactly.

Runs in any modern browser on desktop and mobile, installs as an app (PWA), and works offline after the first visit.

---

## Quick start

```bash
# any static server works; the AudioWorklet needs http://localhost or https://
python3 -m http.server 8000
# open http://localhost:8000
```

Press **Wake**. On iOS, tap Wake once more if you hear nothing: Safari only starts audio after a touch.

## Deploy on GitHub Pages

1. Create a repository and push this folder's contents to `main`:
   ```bash
   git init
   git add .
   git commit -m "Symbiont 0.3"
   git branch -M main
   git remote add origin git@github.com:<you>/symbiont.git
   git push -u origin main
   ```
2. On GitHub: **Settings › Pages › Build and deployment › Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute the app is live at `https://<you>.github.io/symbiont/`.
4. On a phone, open that URL and use **Add to Home Screen** (iOS Share menu, Android browser menu) to install it as an app.

When you publish changes, bump `VERSION` in `js/app.js` and in `sw.js` (`symbiont-v0.3` → `symbiont-v0.4`) so installed copies pick up the new files. Tag releases with `git tag v0.3 && git push --tags`. See `CHANGELOG.md` for the version history.

`.nojekyll` is included so GitHub Pages serves the files as they are.

## Files

```
index.html             markup and PWA meta
css/style.css          the console and field styling
js/engine.js           the DSP engine (runs inside an AudioWorklet)
js/app.js              state, audio graph, radar, console, recorder
manifest.webmanifest   install metadata
sw.js                  offline cache (app shell + fonts)
icons/                 app icons (SVG + PNG)
tools/bundle.py        builds dist/symbiont.html, one self-contained file
```

`engine.js` is serialised into an AudioWorklet at runtime (`SymEngine.toString()`), so the same code also runs through a ScriptProcessor fallback on browsers without AudioWorklet. Keep the class self-contained: no references to anything outside its body.

## Playing it

### The radar

The field is a top-down view with you, the listener, at the centre. Left/right is stereo position, top is front, bottom is rear. The further an organism sits from the centre, the quieter, darker and more reverberant it gets. Sounds behind you lose their top end.

| Gesture | What it does |
|---|---|
| Drag an organism | Move the centre of its orbit (the small cross) |
| Drag empty space | **Stir**: organisms near your finger get excited. Bonds tighten, roar grows, grains burst, pulses fire. Vertical speed bends pitch slightly. Stirring also feeds that organism's population |
| Scroll over an organism | Gain |
| Double-click / double-tap an organism | Solo |
| Shift-drag (or Alt-drag) one organism onto another | Make or cut a bond |
| Drop an audio file on an organism | Load it as that organism's grain source |

The outer ring is the **memory ring**, the last 8 seconds of the master output. The bright dot is the write head. Grains torn from memory fly in from where they were read. Each organism circles its cross on its own orbit. The dotted path shows the orbit's shape and tilt, and the chevrons show its direction. The phosphor trace at the centre is a goniometer of the master bus.

### Console

**Mixer strips** (always visible): select, gain fader (drag, scroll, arrow keys; double-click resets), peak meter in dBFS with hold, population bar, mute, solo.

**Master** (below the strips): a triggered oscilloscope (L bright, R teal) and a stereo meter with peak, RMS and peak hold in dBFS. The hold value turns red at 0 dBFS.

**Organism** page:

- **Voice**: octave, fine tune, body (oscillator vs. grain cloud), glide, Sharp (wavefold), Self-bend (feedback FM on a pure sine), and Harmonic FM with integer ratios (×½ to ×7)
- **Colour**: four voicings you can blend freely
  - **Roar**: warm asymmetric tube drive
  - **Ring**: bell partials (1 : 3.5 FM) that open with each hit, plus a string resonance tuned to the note
  - **Hum**: a detuned twin that beats slowly against the voice, plus a sub octave
  - **Sing**: vibrato and two soft formants drifting through vowels
- **Filter**: lowpass or bandpass with cutoff, resonance and its own LFO (sine, tri, drift, step; 50 s to 12 Hz; up to ±3.5 octaves), plus envelope → cutoff. *LFO now* shows where the LFO is
- **Orbit**: each organism moves on its own path around its anchor: ellipse, figure eight or pendulum, clockwise or counter-clockwise, with speed (still to 3 Hz), X and Y axis and tilt. Give organisms different speeds and directions and they cross each other's paths in the stereo field
- **Bonds**: audio-rate phase modulation from each other organism
- **Cloud**: grain source (Memory ring, or Recording to load a file; tap Recording again to replace it), density, size, position, spray, stereo width, transpose, scatter in scale steps, reverse
- **Pulse**: drone or euclidean pulse ring with steps, hits, rotation, attack (or the swell time of a drone), decay, chance, wander and step length. Tap cells to flip steps

**World** page:

- **Ecology**: a four-species competitive Lotka–Volterra system in its chaotic regime. Each population swells and starves its organism's level, bond depth and grain density. Pressure scales every bond at once. Motion scales every orbit, depth, drift and the interaural delay
- **Tides**: four modulators with Sine, Tri, Saw, Drift, Step, Chaos (logistic map), Ecology (follows population) and Follow (follows loudness) shapes. Each has 16 possible targets including cutoff, the four colours, orbit speed and gain, rates from 200 s to 40 Hz, phase spread across organisms and a per-organism mask
- **Space**: algorithmic room; ping-pong echo with saturating feedback (above 100 % return it sustains itself) and a wobbling delay line; warm master Drive; stereo width; memory feed; master
- **Clock**: tempo, root, scale (including Harmonic and Rast microtonal sets), mutation, drift. **Seed** grows a completely new ecosystem

Sections fold open and closed. The app remembers which ones you closed.

### Recording

**Rec** (or the `R` key) captures the master output, after the room, echo and limiter. Each take appears top-left as a **24-bit stereo WAV** at the context sample rate (usually 48 kHz). Press **Save** to download it.
Inside the claude.ai artifact viewer, takes are saved as a `.zip` containing the WAV, because the viewer doesn't allow `.wav` downloads directly.

### Keys

`Space` wake/sleep · `1`–`4` select organism · `M` mute · `S` solo · `R` record

## Spatial model

- Equal-power pan from the organism's left/right position, widened ×1.3
- Interaural time difference up to 0.7 ms (scaled by Motion) on the far ear
- Distance: dry level falls and room/echo send rises with distance; brightness falls with distance and when the source is behind the listener
- Each organism's orbit moves it through the field on its own cycle and direction; a slight doppler shift follows radial movement
- Grains scatter across the stereo field by each organism's Width
- Global M/S width on the dry bus

## Browser notes

- Chrome, Edge, Firefox and Safari 14.1+ run the AudioWorklet engine. Older browsers fall back to a ScriptProcessor (higher latency).
- On iPhone, Symbiont plays through the mute switch.
- If a phone struggles, lower grain Density and set Ring, Hum or Sing to zero on organisms that don't need them: each colour stage only runs while it is above zero.

## Sound design notes

Version 0.3 returns to the folded-sine core of 0.1 and takes cues from the SOMA Lyra-8: modulators are pure sines, bond and feedback depths stay in a range where FM sounds tonal, detuned twins beat slowly, drive is warm and asymmetric, and the echo can saturate into self-oscillation with a wobbling delay line. The memory ring is lowpassed on write so the granular feedback loop stays smooth.
