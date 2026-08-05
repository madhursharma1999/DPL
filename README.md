# DPL Flick Cricket

Bottle-cap cricket as a one-thumb game, built for **YouTube Playables**. Drag back
on the cap, release, and flick a marble into the gaps. Chase the rival franchise's
total in 18 balls with 3 wickets.

Shares its universe with the [DPL generator](../DPL): same eight franchises, same
parody squad, same commentary voices (Akash Bhai hype, Colonel Dhakkan deadpan).

```
open http://localhost:8791       # after: python3 -m http.server 8791
./build.sh                       # → dist/dpl-flick-cricket.zip  (~17 KB)
node tools/simulate.mjs 500 0.8  # headless balance harness
```

## Why it fits the platform

Playables is gated and curated on retention, and the bundle rules are strict. This
build is shaped around those constraints rather than retrofitted to them:

| Constraint | How it's met |
|---|---|
| No network calls at runtime | Zero fetches. `build.sh` fails the build if any `http(s)://`, `fetch(`, `XMLHttpRequest`, or `WebSocket` reference appears in the bundle. |
| Initial load under 30 MB | **~17 KB.** No image or audio files at all — the ground, caps, marble and UI are vector canvas draws; every sound is synthesised in WebAudio. |
| Portrait, one thumb, sound often off | Single fixed 100×160 world letterboxed to any screen. Every outcome is readable as text; audio is pure garnish and host-mutable. |
| Retention is the grading criterion | Adaptive target (see below), 60–90 second matches, one-tap replay. |

## How it plays

A delivery rolls down the pitch at constant speed. Drag **away** from where you
want the ball to go, release, and the cap lunges.

Three things decide the outcome, which is what gives it a skill ceiling:

- **Timing** — contact within ~3.8 world units of the sweet spot is `PERFECT`.
  Only a middled shot can go for six; anything else that clears the rope is four.
- **Aim** — nine fielders, re-jittered every ball so gaps can't be memorised.
  Firm shots at a fielder are stopped for one; the ring is beaten only by a screamer.
- **Power** — drag length. Underhit shots stop inside the ring for one or two.

Getting caught is a *mistiming* punishment: a fielder only holds it in the
mid-speed band (14–40), where a mishit hangs up. That keeps wickets attributable
to a mistake the player can feel, instead of to bad luck.

### The adaptive target

`Match` takes a `form` value — an exponential moving average of recent scores,
persisted in the save. The rival's total is set to roughly that average, so a
first match is winnable and a good player keeps getting stretched.

This was not cosmetic. With a fixed 40–56 target, the headless harness put a
beginner's win rate at **0%** and an expert's at 58% — the shape that kills a
first session. Measured now, over 500 matches per skill level:

| Timing error (σ) | Avg score | Run rate | Win rate |
|---|---|---|---|
| 40 ms (expert)    | 30.5 | 3.42 /ball | 70% |
| 85 ms (competent) | 32.5 | 2.07 /ball | 54% |
| 140 ms (first go) | 16.2 | 1.21 /ball | 57% |

Everyone can win; the run rate still separates skill cleanly. Re-measure with
`tools/simulate.mjs` after touching anything in `TUNE`.

## Layout

```
index.html          canvas + boot label, all CSS inline
src/physics.js      world constants, TUNE (all balance knobs), collision, impulse
src/game.js         Match state machine: ball cycle, outcomes, scoring
src/render.js       every pixel — vector ground, bottle caps, HUD, screens
src/main.js         loop, pointer input, persistence, scene routing
src/data.js         franchises, squad, fielding slots, commentary
src/audio.js        WebAudio synth (no audio files)
src/sdk.js          window.ytgame adapter, fully feature-detected
tools/simulate.mjs  balance harness (not shipped)
build.sh            self-containment + size gate, writes dist/*.zip
```

Tuning lives in one place: `TUNE` in `src/physics.js`. Match length is `BALLS`
and `WICKETS` in `src/game.js`.

## Before submitting

1. **Confirm the SDK signatures.** `src/sdk.js` wraps `window.ytgame`
   (`game.firstFrameReady`, `game.gameReady`, `game.saveData/loadData`,
   `system.onPause/onResume`, `engagement.sendScore`) but those are versioned and
   only documented inside the Playables Developer Portal, which needs approval
   first. Every call is feature-detected and wrapped, so a mismatch degrades to
   the localStorage + Page Visibility fallback instead of throwing — but check
   the real names against the portal docs and fix them there before shipping.
2. Apply for portal access (interest form; expect weeks) **or** go through a
   partner that already holds a verified account, at the cost of a rev split.
3. Run `./build.sh` and submit `dist/dpl-flick-cricket.zip`.
4. Test on a real mid-range Android device. The game is vector-only and should
   hold 60 fps, but the flick timing window is 60 ms — verify input latency there,
   not in a desktop browser.

## Verified

- Loads with **zero console errors or warnings**; 7 module requests, all local.
- Menu, team select, first-ball gating, delivery, contact, runs, wickets, result
  screen, and save persistence all exercised in headless Chromium at 390×844.
- `build.sh` self-containment check passes; bundle 17,351 bytes.
- Balance measured over 1,500 simulated matches across three skill levels.

Known gap: the flick physics are verified by the headless harness and by scripted
pointer events, not yet by a human thumb on glass. The 60 ms timing window is the
one number most likely to need adjusting after real play — widen `timingOf`'s
`PERFECT` band in `src/physics.js` if it feels punishing.
# DPL
