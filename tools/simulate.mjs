// Headless balance harness. Plays N matches with a scripted "decent player" so
// the target range and the run gradient can be tuned without touching a phone.
//
//   node tools/simulate.mjs [matches] [skill 0..1]
//
// Not part of the shipped bundle (build.sh only packs index.html + src).

import { TEAMS } from '../src/data.js';
import { W, TUNE } from '../src/physics.js';
import { Match, BALLS } from '../src/game.js';

const N = Number(process.argv[2] || 400);
const SKILL = Number(process.argv[3] ?? 0.85);
const DT = 1 / 60;

/** Widest gap in the forward arc, as a unit direction from the batter. */
function aimAtGap(field) {
  let best = null;
  for (let deg = -85; deg <= 85; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    let worst = Infinity;
    for (const f of field) {
      const fa = Math.atan2(f.x - W.batX, -(f.y - W.batY));
      let d = Math.abs(fa - a);
      if (d > Math.PI) d = Math.PI * 2 - d;
      worst = Math.min(worst, d);
    }
    if (!best || worst > best.worst) best = { dx, dy, worst };
  }
  return best;
}

/** Box-Muller, so timing error is normally distributed like a real thumb. */
function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Human release error, in seconds: an expert lands inside ~40ms, a first-timer
// closer to 140ms. Anything tighter than this flatters the game.
const timingSigma = 0.02 + (1 - SKILL) * 0.22;

function playMatch(form) {
  const m = new Match(TEAMS[0], TEAMS[1], form);
  m.armed = true;                 // the real game waits for the player's first touch
  const counts = {};
  let guard = 0;
  while (m.phase !== 'DONE' && guard++ < 60000) {
    if (m.canSwing) {
      const ball = m.marble;
      const lead = 0.085 + gauss() * timingSigma;
      if (ball.y + ball.vy * lead >= W.sweetY) {
        const gap = aimAtGap(m.field);
        const jitter = gauss() * (1 - SKILL) * 0.35;
        const a = Math.atan2(gap.dx, -gap.dy) + jitter;
        const power = TUNE.dragMax * (0.75 + Math.random() * 0.25);
        m.swing(Math.sin(a), -Math.cos(a), power);
      }
    }
    const before = m.outcome;
    m.update(DT);
    if (m.outcome && m.outcome !== before) {
      counts[m.outcome.kind] = (counts[m.outcome.kind] || 0) + 1;
    }
    m.events.length = 0;
  }
  return { runs: m.runs, won: m.won, target: m.target, balls: m.ball, wickets: m.wickets, counts };
}

const all = [];
const totals = {};
let form = 0;   // same EMA the game keeps in its save file
for (let i = 0; i < N; i++) {
  const r = playMatch(form);
  form = form ? form * 0.7 + r.runs * 0.3 : r.runs;
  all.push(r);
  for (const [k, v] of Object.entries(r.counts)) totals[k] = (totals[k] || 0) + v;
}

const avg = (f) => all.reduce((s, r) => s + f(r), 0) / all.length;
const wins = all.filter((r) => r.won).length;
const balls = Object.values(totals).reduce((a, b) => a + b, 0);

console.log(`matches ${N}   skill ${SKILL}`);
console.log(`avg score      ${avg((r) => r.runs).toFixed(1)} / target avg ${avg((r) => r.target).toFixed(1)}`);
console.log(`win rate       ${((wins / N) * 100).toFixed(1)}%`);
console.log(`avg wickets    ${avg((r) => r.wickets).toFixed(2)} in ${avg((r) => r.balls).toFixed(1)} balls`);
console.log(`run rate       ${(avg((r) => r.runs) / avg((r) => r.balls)).toFixed(2)} per ball`);
console.log('outcome mix:');
for (const k of ['SIX', 'FOUR', 'TWO', 'ONE', 'FIELDED', 'DOT', 'CAUGHT', 'BOWLED']) {
  const c = totals[k] || 0;
  console.log(`  ${k.padEnd(7)} ${String(c).padStart(5)}  ${((c / balls) * 100).toFixed(1)}%`);
}
if (avg((r) => r.balls) < BALLS * 0.5) console.log('WARN: innings ending very early');
