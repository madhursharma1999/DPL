# DPL Flick Cricket

Chase the rival franchise's total in 18 balls with 3 wickets. Same universe as the
[DPL generator](../DPL): eight franchises and Akash Bhai / Colonel Dhakkan on
commentary. The squad is original to the game — no real players, parodied or
otherwise.

**Play:** https://madhursharma1999.github.io/DPL/

## Run it

```bash
python3 -m http.server 8791     # then open http://localhost:8791
./build.sh                      # → dist/dpl-flick-cricket.zip (~17 KB)
node tools/simulate.mjs 500 0.8 # balance harness
```

ES modules need HTTP — opening `index.html` as a `file://` URL will fail on CORS.

## How it plays

Tap to face the first ball. Drag **back** from the cap and release; the ball goes
opposite to your drag. Three things decide the outcome:

- **Timing** — contact near the sweet spot is `PERFECT`. Only a middled shot goes
  for six; anything else clearing the rope is four.
- **Aim** — nine fielders, re-jittered every ball. Firm shots at a fielder are
  stopped for one.
- **Power** — drag length. Underhit shots stop inside the ring for one or two.

Wickets come from mistiming, not bad luck: a fielder only takes the catch in the
mid-speed band, where a mishit hangs up.

The rival's total tracks a rolling average of your recent scores, so a first match
is winnable and a good player keeps getting stretched.

The timing window is 60 ms, so on a phone input latency matters more than frame
rate. If `PERFECT` feels impossible on a real thumb, widen that band in `timingOf`
(`src/physics.js`).

## Layout

```
index.html          canvas + boot label, CSS inline
src/physics.js      world constants, TUNE (all balance knobs), collision, impulse
src/game.js         Match state machine: ball cycle, outcomes, scoring
src/render.js       every pixel — vector ground, bottle caps, HUD, screens
src/main.js         loop, pointer input, persistence, scene routing
src/data.js         franchises, squad, fielding slots, commentary
src/audio.js        WebAudio synth (no audio files)
src/sdk.js          host adapter (saves, pause/resume), feature-detected
tools/simulate.mjs  balance harness (not shipped)
build.sh            self-containment + size gate, writes dist/*.zip
```

Balance knobs live in `TUNE` (`src/physics.js`); match length is `BALLS` and
`WICKETS` (`src/game.js`). Re-run the harness after changing either.

The whole thing is one self-contained bundle: no image or audio files (the ground,
caps and marble are vector canvas draws, every sound is synthesised in WebAudio)
and no network calls at runtime. `build.sh` fails the build if anything in the
bundle reaches out, and falls back to localStorage when no host is present.
