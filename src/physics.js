// All gameplay happens in a fixed 100 x 160 "world". The renderer scales that to
// whatever screen it lands on, so tuning numbers here never depend on device size.

import { FIELD_SLOTS } from './data.js';

export const W = {
  w: 100, h: 160,
  cx: 50, cy: 74, R: 46,       // ground circle (the rope)
  batX: 50, batY: 100,         // cap at rest
  stumpY: 108,                 // behind the cap
  sweetY: 93,                  // ideal contact height
  bowlY: 30,                   // marble release
  capR: 5.4, marbleR: 2.2,
};

export const TUNE = {
  friction: 1.15,              // exponential decay per second, struck marble only
  lungeOut: 0.13, lungeBack: 0.22, lungeDist: 9.5,
  transferCap: 0.55, transferIncoming: 0.35,
  aimBlend: 0.45,              // how much of the shot direction comes from aim vs contact point
  sixSpeed: 10,             // must still be travelling when it crosses the rope
  // A fielder only takes a catch out of the mid band: a screamer beats them, a
  // firm shot is stopped for one, and a mishit hangs up long enough to be caught.
  fielderBeat: 90,
  catchHi: 40,
  catchLo: 14,
  catchR: 4.0,
  restSpeed: 5,                // marble considered stopped
  twoRunDist: 52, oneRunDist: 14,
  dragMin: 4, dragMax: 26,
  ballSpeedMin: 62, ballSpeedMax: 84,
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const len = (x, y) => Math.hypot(x, y);

/** Distance from the batter to the rope along a unit direction. */
export function ropeDistance(dx, dy) {
  const fx = W.batX - W.cx, fy = W.batY - W.cy;
  const b = dx * fx + dy * fy;
  const c = fx * fx + fy * fy - W.R * W.R;   // negative: batter is inside
  return -b + Math.sqrt(Math.max(0, b * b - c));
}

/** Fresh fielding positions, jittered every ball so the gaps can't be memorised. */
export function makeField() {
  return FIELD_SLOTS.map((s) => {
    const a = (s.a + (Math.random() * 20 - 10)) * Math.PI / 180;
    const r = clamp(s.r + (Math.random() * 0.12 - 0.06), 0.15, 0.95);
    // angle 0 points up the ground (towards the bowler)
    const dx = Math.sin(a), dy = -Math.cos(a);
    const d = ropeDistance(dx, dy) * r;
    return { name: s.n, x: W.batX + dx * d, y: W.batY + dy * d };
  });
}

export function newMarble() {
  const targetX = W.batX + (Math.random() * 6 - 3);
  const dx = targetX - W.batX, dy = W.stumpY - W.bowlY;
  const m = len(dx, dy);
  const speed = TUNE.ballSpeedMin + Math.random() * (TUNE.ballSpeedMax - TUNE.ballSpeedMin);
  return {
    x: W.batX, y: W.bowlY,
    vx: (dx / m) * speed, vy: (dy / m) * speed,
    trail: [], live: true, hit: false,
  };
}

export function stepMarble(m, dt) {
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  // The delivery keeps its pace so the timing window is learnable; only a struck
  // marble is slowed by the floor.
  if (m.hit) {
    const decay = Math.exp(-TUNE.friction * dt);
    m.vx *= decay;
    m.vy *= decay;
  }
  m.trail.push(m.x, m.y);
  if (m.trail.length > 36) m.trail.splice(0, m.trail.length - 36);
}

export function marbleSpeed(m) { return len(m.vx, m.vy); }

/** Cap position/velocity for a lunge in progress. Returns null once it is over. */
export function lungeState(lunge, t) {
  const { lungeOut: out, lungeBack: back, lungeDist: dist } = TUNE;
  if (t > out + back) return null;
  let f;
  if (t <= out) {
    const p = t / out;
    f = 1 - (1 - p) * (1 - p);            // ease-out on the way in
  } else {
    const p = (t - out) / back;
    f = (1 - p) * (1 - p);                // slower recovery
  }
  const reach = dist * lunge.power * f;
  return {
    // Moves along mx/my (biased up the pitch so a square shot still meets the
    // marble); the ball leaves along dx/dy, the direction the player aimed.
    x: W.batX + lunge.mx * reach,
    y: W.batY + lunge.my * reach,
    swinging: t <= out,
  };
}

/**
 * Bat-on-marble impulse. Direction is a blend of the true contact normal and the
 * player's aim, which keeps it controllable while still rewarding hitting the
 * marble on the correct side of the cap.
 */
export function strike(m, cap, capVx, capVy, lunge, timingMul) {
  let nx = m.x - cap.x, ny = m.y - cap.y;
  const n = len(nx, ny) || 1;
  nx /= n; ny /= n;
  let dx = nx * (1 - TUNE.aimBlend) + lunge.dx * TUNE.aimBlend;
  let dy = ny * (1 - TUNE.aimBlend) + lunge.dy * TUNE.aimBlend;
  const d = len(dx, dy) || 1;
  dx /= d; dy /= d;
  const speed = (len(capVx, capVy) * TUNE.transferCap
               + marbleSpeed(m) * TUNE.transferIncoming) * timingMul;
  m.vx = dx * speed;
  m.vy = dy * speed;
  m.hit = true;
  m.trail.length = 0;
  return speed;
}

export function timingOf(marbleY) {
  const d = Math.abs(marbleY - W.sweetY);
  if (d < 3.8) return { label: 'PERFECT', mul: 1.2 };
  if (d < 10) return { label: 'GOOD', mul: 1.0 };
  return { label: marbleY < W.sweetY ? 'EARLY' : 'LATE', mul: 0.62 };
}

export function distFromCentre(m) { return Math.hypot(m.x - W.cx, m.y - W.cy); }
export function distFromBat(m) { return Math.hypot(m.x - W.batX, m.y - W.batY); }
export function powerFromDrag(d) {
  return clamp((d - TUNE.dragMin) / (TUNE.dragMax - TUNE.dragMin), 0, 1) * 0.65 + 0.35;
}
