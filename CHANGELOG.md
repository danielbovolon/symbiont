# Changelog

## 0.4 — 2026-10-27
- Fixed: echo feedback ran away and distorted. Return now capped at 90 %, unity-gain saturator and highpass inside the loop
- Master safety: fast compressor plus soft clipper (ceiling −0.1 dBFS); memory ring leveller keeps the granular loop stable
- More extreme ranges: Sharp, Self-bend, Harmonic FM, bonds and Pressure (×3) go much further; octave −4 to +3; glide to 3 s; density 200/s; transpose ±36
- New colour: Crush (sample-rate and bit reduction)
- Filter: highpass and notch modes; resonance to self-oscillation; LFO shapes ramp and chaos; tempo-synced LFO; Near → bright (cutoff follows distance); Audio FM of the cutoff
- Filter bar on every mixer strip: live cutoff and LFO range, drag to set depth
- Orbits: around the listener (full circles behind your head); new paths spiral and wander; speed up to 8 Hz
- Stronger space: wider pan, head shadow on the far ear, darker rear, stronger distance cues, adjustable doppler
- Motion up to 300 %; tides up to 80 Hz with Crush and Resonance targets
- Seed a wild one (key W)

## 0.3 — 2026-10-27
- Sound core rebuilt on the 0.1 voice (folded sine, self-bend, cross-bonds). FM now uses pure sine modulators with tamed depths, so it stays tonal
- Roar, Ring, Hum and Sing re-voiced musically, inspired by the SOMA Lyra-8: tube drive, bell partials with a string resonance, detuned beating twin with sub, vibrato with soft vowels
- Character diamond and radar handles removed; colours are four plain sliders in the editor
- Per-organism filter (lowpass / bandpass) with its own LFO and envelope → cutoff
- Per-organism orbits: ellipse, figure eight or pendulum, direction, speed, X/Y axes and tilt, drawn in the radar
- Harmonic FM operator with integer ratios; attack control for pulses and drone swells
- Master oscilloscope and stereo peak/RMS meter in the console
- Echo with saturating, self-oscillating feedback and wobble; master Drive
- Memory ring lowpassed on write; “MEMORY · 8 S” label removed from the radar
- Version shown next to the logo; takes are named with the version

## 0.2 — 2026-10-27
- Mixer strips with gain, meters, mute and solo; flat console with collapsible sections
- Stir gesture on the radar; ecology (Lotka–Volterra populations); interaural delay and doppler
- 24-bit WAV recorder; PWA files and README for GitHub Pages

## 0.1 — 2026-10-26
- First version: four organisms in a polar field, cross-FM bonds, granular memory ring, euclidean pulses, tides, room and echo
