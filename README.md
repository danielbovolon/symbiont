# Symbiont 0.5

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
   git commit -m "Symbiont 0.5"
   git branch -M main
   git remote add origin git@github.com:<you>/symbiont.git
   git push -u origin main
   ```
2. On GitHub: **Settings › Pages › Build and deployment › Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute the app is live at `https://<you>.github.io/symbiont/`.
4. On a phone, open that URL and use **Add to Home Screen** (iOS Share menu, Android browser menu) to install it as an app.

When you publish changes, bump `VERSION` in `js/app.js` and in `sw.js` (`symbiont-v0.5` → `symbiont-v0.6`) so installed copies pick up the new files. Tag releases with `git tag v0.5 && git push --tags`. See `CHANGELOG.md` for the version history.

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
| Drag an organism | Move the centre of its orbit (the small cross). For organisms circling the listener, dragging in or out sets the radius |
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

- **Voice**: octave (−4 to +4), octave leap (each new note may jump up to ±3 octaves), fine tune, glide, body (oscillator vs. grain cloud)
- **FM · feedback · drive**: the engine, in three groups
  - **FM**: FM amount, FM ratio (continuous ×0.25 to ×8, or the quick ratios ×½ … ×7; whole numbers sound harmonic, others metallic), FM feedback (the operator modulates itself: bright → saw-like → noise), FM follows hits (the FM opens with each hit and closes as it decays)
  - **Feedback**: self-feedback (above 70 % it tips into chaos), feedback time (instant, or delayed up to 20 ms for comb-like and chaotic engine sounds), bond depth (scales every bond reaching this organism, up to ×3) and the three bonds from the other organisms
  - **Distortion**: type (tube, fuzz, fold, rectify — rectify adds an octave above), drive, wavefold, crush (sample-rate and bit reduction)
- **Colour**: three voicings you can blend freely
  - **Ring**: bell partials (1 : 3.5 FM) that open with each hit, plus a string resonance tuned to the note
  - **Hum**: a detuned twin that beats slowly against the voice, plus a sub octave
  - **Sing**: vibrato and two soft formants drifting through vowels
- **Filter**: lowpass, bandpass, highpass or notch; resonance up to self-oscillation (“scream”); key track (cutoff follows the note, including octave leaps). It moves on its own:
  - **LFO**: sine, tri, ramp, drift, step or chaos; free (50 s to 40 Hz) or locked to the tempo (8 bars to 1/16); up to ±6 octaves
  - **Env → cutoff**: each hit opens or closes it (±6 octaves)
  - **Near → bright**: cutoff follows the organism's distance from you
  - **Audio FM**: the organism modulates its own cutoff at audio rate for snarls and metallic edges
  - *Cutoff now* shows the live cutoff. Each mixer strip also has a filter bar: the dot is the live cutoff, the shaded range is how far the LFO moves it. Drag the bar sideways to set the LFO depth, tap it to open the filter
- **Orbit**: how the organism travels. Around *its cross* or around *the listener* (full circles past your head and behind you); paths: ellipse, figure eight, pendulum, spiral or wander (smooth flights to random points); clockwise or counter-clockwise; speed from still to 8 Hz (a whirling, rotating-speaker effect at the top); X and Y axis; tilt. **Travel**: *Swing* keeps changing the speed and, above 40 %, sometimes turns the organism back; *Breathe* swells and shrinks the path so the sound comes close and drifts far away; *Jump* lets pulse hits throw the organism to another point of its path
- **Bonds**: audio-rate phase modulation from each other organism
- **Cloud**: grain source (Memory ring, or Recording to load a file; tap Recording again to replace it), density, size, position, spray, stereo width, transpose, scatter in scale steps, reverse
- **Pulse**: drone or euclidean pulse ring with steps, hits, rotation, attack (or the swell time of a drone), decay, chance, wander and step length. Tap cells to flip steps

**World** page:

- **Motion**: Motion scales every orbit (up to 300 %), Doppler sets how much pitch bends as organisms rush toward or away from you, Pressure scales every bond (up to ×3).
- **Ecology**: a four-species competitive Lotka–Volterra system in its chaotic regime. Each population swells and starves its organism's level, bond depth and grain density. 
- **Tides**: four modulators with Sine, Tri, Saw, Drift, Step, Chaos (logistic map), Ecology (follows population) and Follow (follows loudness) shapes. Each has 20 possible targets including cutoff, resonance, FM amount, self-feedback, drive, fold, the colours, crush, orbit speed and gain, rates from 200 s to 80 Hz, phase spread across organisms and a per-organism mask
- **Space**: algorithmic room; ping-pong echo with a wobbling delay line (return capped at 90 %, see below); warm master Drive; stereo width; memory feed; master
- **Clock**: tempo, root, scale (including Harmonic and Rast microtonal sets), mutation, drift. **Seed** grows a completely new ecosystem; **Seed a wild one** (or `W`) grows an extreme one

Sections fold open and closed. The app remembers which ones you closed.

### Recording

**Rec** (or the `R` key) captures the master output, after the room, echo and limiter. Each take appears top-left as a **24-bit stereo WAV** at the context sample rate (usually 48 kHz). Press **Save** to download it.
Inside the claude.ai artifact viewer, takes are saved as a `.zip` containing the WAV, because the viewer doesn't allow `.wav` downloads directly.

### Keys

`Space` wake/sleep · `1`–`4` select organism · `M` mute · `S` solo · `R` record · `W` wild seed

## Spatial model

- Each organism travels its own path (orbit), around its anchor or around the listener
- Equal-power pan from the organism's left/right position, widened ×1.5
- Interaural time difference up to 0.75 ms on the far ear
- Head shadow: the far ear is lowpassed down to about 1.6 kHz at full pan
- Rear sources lose brightness; distance lowers the dry level, raises the room/echo send and darkens the tone
- Doppler: radial speed bends the pitch (World › Motion › Doppler)
- Grains scatter across the stereo field by each organism's Width
- Global M/S width on the dry bus

## Gain safety

Version 0.4 makes every feedback path unconditionally stable:
- **Echo**: the return is capped at 90 %, and the saturator inside the loop has a gain of at most 1 (in 0.3 it had a small-signal gain of about 1.7, so the loop ran away from roughly 57 % return). A highpass inside the loop stops low-end build-up.
- **Memory ring**: a slow leveller on the write keeps the granular feedback loop from growing.
- **Master**: a fast compressor followed by a soft clipper that never exceeds −0.1 dBFS. Recordings are taken after it.

## On a phone

The whole instrument is one scrolling page: the radar on top, then the mixer, master meters and editor. The Organism / World tabs stay pinned to the top while you scroll.
- Swipe up and down anywhere to scroll, including over the empty radar, the mixer and the sliders. A vertical swipe never changes a slider; drag sideways to set one.
- Touch an organism to drag it. On the faders, grab the coloured cap; swiping elsewhere on the strip scrolls.
- Drag sideways on the empty radar to stir.

## Browser notes

- Chrome, Edge, Firefox and Safari 14.1+ run the AudioWorklet engine. Older browsers fall back to a ScriptProcessor (higher latency).
- On iPhone, Symbiont plays through the mute switch.
- If a phone struggles, lower grain Density and set Ring, Hum or Sing to zero on organisms that don't need them: each colour stage only runs while it is above zero.

## Sound design notes

Version 0.3 returns to the folded-sine core of 0.1 and takes cues from the SOMA Lyra-8: modulators are pure sines, bond and feedback depths stay in a range where FM sounds tonal, detuned twins beat slowly, drive is warm and asymmetric, and the echo saturates warmly with a wobbling delay line. Version 0.4 widens every range for extreme sounds while keeping the low end of each control musical. The memory ring is lowpassed on write so the granular feedback loop stays smooth.
