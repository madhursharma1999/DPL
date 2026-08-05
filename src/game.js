// Match state machine. One innings: chase a target in BALLS deliveries with
// WICKETS to spare. Short enough for a feed session, long enough to build tension.

import { PLAYERS, BOWLERS, COMMENTARY, pick } from './data.js';
import {
  W, TUNE, makeField, newMarble, stepMarble, marbleSpeed, lungeState, strike,
  timingOf, distFromCentre, distFromBat, powerFromDrag,
} from './physics.js';

export const BALLS = 18;
export const WICKETS = 3;

const shuffled = (a) => a.slice().sort(() => Math.random() - 0.5);

export class Match {
  // `form` is a rolling average of recent scores, not the all-time best: a best
  // score ratchets up after one lucky match and then never lets the player win
  // again. Chasing roughly your own average is what makes it go to the wire.
  constructor(team, rival, form = 0) {
    this.team = team;
    this.rival = rival;
    this.target = form > 0
      ? Math.max(12, Math.round(form * 1.0)) + ((Math.random() * 5) | 0)
      : 18 + ((Math.random() * 5) | 0);
    this.runs = 0;
    this.wickets = 0;
    this.ball = 0;
    this.order = shuffled(PLAYERS);
    this.batterIndex = 0;
    this.bowler = pick(BOWLERS);
    this.phase = 'READY';
    this.phaseT = 0;
    this.field = makeField();
    this.marble = null;
    this.lunge = null;
    this.capX = W.batX;
    this.capY = W.batY;
    this.contacted = false;
    this.outcome = null;
    this.timing = null;
    this.shake = 0;
    this.events = [];
    this.commentary = pick(COMMENTARY.START);
    this.over = false;
    this.won = false;
    this.lastRuns = [];
    // The first ball waits for a touch. Auto-bowling into a feed means a player
    // who glanced away is 0/3 before they looked back.
    this.armed = false;
  }

  get batter() { return this.order[this.batterIndex % this.order.length]; }
  get needed() { return Math.max(0, this.target + 1 - this.runs); }
  get ballsLeft() { return BALLS - this.ball; }
  get canSwing() { return this.phase === 'LIVE' && !this.lunge; }

  emit(name, data) { this.events.push({ name, data }); }

  /** Player released a flick. dx/dy is the (already normalised) shot direction. */
  swing(dx, dy, dragLen) {
    if (!this.canSwing) return;
    // Movement direction leans up the pitch (0,-1) so aiming square doesn't make
    // the cap dodge the delivery — that punished good aim for the wrong reason.
    let mx = dx * 0.6, my = dy * 0.6 - 0.4;
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml; my /= ml;
    this.lunge = { dx, dy, mx, my, power: powerFromDrag(dragLen), t: 0 };
    this.emit('flick', this.lunge.power);
  }

  update(dt) {
    this.phaseT += dt;
    this.shake = Math.max(0, this.shake - dt * 4);

    if (this.phase === 'READY') {
      if (this.armed && this.phaseT > 0.55) this.bowl();
      return;
    }
    if (this.phase === 'OUTCOME') {
      if (this.phaseT > 1.25) this.nextBall();
      return;
    }
    if (this.phase !== 'LIVE') return;

    // --- cap ---
    let capVx = 0, capVy = 0;
    if (this.lunge) {
      const prevX = this.capX, prevY = this.capY;
      this.lunge.t += dt;
      const st = lungeState(this.lunge, this.lunge.t);
      if (st) {
        this.capX = st.x; this.capY = st.y;
        capVx = (this.capX - prevX) / dt;
        capVy = (this.capY - prevY) / dt;
        this.swinging = st.swinging;
      } else {
        this.capX = W.batX; this.capY = W.batY;
        this.swinging = false;
      }
    }

    // --- marble ---
    const m = this.marble;
    stepMarble(m, dt);

    // Contact is live for the whole lunge, not just the forward stroke — a late
    // flick still connects, it just connects badly.
    if (!this.contacted && this.lunge && this.lunge.t <= TUNE.lungeOut + TUNE.lungeBack
        && Math.hypot(m.x - this.capX, m.y - this.capY) < W.capR + W.marbleR) {
      this.timing = timingOf(m.y);
      const mul = this.timing.mul * (this.swinging ? 1 : 0.8);
      const speed = strike(m, { x: this.capX, y: this.capY }, capVx, capVy, this.lunge, mul);
      this.contacted = true;
      this.emit('hit', { power: speed, timing: this.timing.label });
      this.shake = Math.min(1, speed / 160);
    }

    // --- resolution ---
    if (!this.contacted && m.y > W.stumpY) return this.resolve('BOWLED');
    if (this.phaseT > 4.5) return this.resolve('DOT');   // safety net
    if (!this.contacted) return;

    const speed = marbleSpeed(m);

    if (distFromCentre(m) > W.R) {
      // Six is earned by middling it, not by finding the short square boundary —
      // the batter stands near the bottom of the circle, so distance alone made
      // square sixes trivial and straight ones near-impossible.
      const behind = m.y > W.batY;
      const middled = this.timing && this.timing.label === 'PERFECT';
      return this.resolve(!behind && middled && speed > TUNE.sixSpeed ? 'SIX' : 'FOUR');
    }
    for (const f of this.field) {
      if (Math.hypot(m.x - f.x, m.y - f.y) < TUNE.catchR + W.marbleR) {
        if (speed > TUNE.fielderBeat) continue;                    // screamer, through them
        if (speed > TUNE.catchHi) return this.resolve('FIELDED', f.name);
        if (speed > TUNE.catchLo) return this.resolve('CAUGHT', f.name);
        return this.resolve('FIELDED', f.name);
      }
    }
    if (speed < TUNE.restSpeed) {
      const d = distFromBat(m);
      return this.resolve(d > TUNE.twoRunDist ? 'TWO' : d > TUNE.oneRunDist ? 'ONE' : 'DOT');
    }
  }

  bowl() {
    this.marble = newMarble();
    this.phase = 'LIVE';
    this.phaseT = 0;
    this.emit('bowl');
  }

  resolve(kind, by) {
    const runs = { SIX: 6, FOUR: 4, TWO: 2, ONE: 1, FIELDED: 1 }[kind] || 0;
    const wicket = kind === 'CAUGHT' || kind === 'BOWLED';
    this.runs += runs;
    this.ball += 1;
    if (wicket) this.wickets += 1;
    this.lastRuns.push(wicket ? 'W' : String(runs));
    this.outcome = { kind, runs, wicket, by, timing: this.timing && this.timing.label };
    this.commentary = pick(COMMENTARY[kind]);
    this.phase = 'OUTCOME';
    this.phaseT = 0;
    this.marble.live = false;
    if (wicket) this.shake = 0.7;
    this.emit('outcome', this.outcome);
  }

  nextBall() {
    if (this.outcome && this.outcome.wicket) this.batterIndex += 1;
    const chased = this.runs > this.target;
    if (chased || this.wickets >= WICKETS || this.ball >= BALLS) {
      this.over = true;
      this.won = chased;
      this.commentary = pick(chased ? COMMENTARY.WIN : COMMENTARY.LOSE);
      this.phase = 'DONE';
      this.emit('end', { won: this.won, runs: this.runs });
      return;
    }
    this.phase = 'READY';
    this.phaseT = 0;
    this.field = makeField();
    this.marble = null;
    this.lunge = null;
    this.contacted = false;
    this.swinging = false;
    this.timing = null;
    this.outcome = null;
    this.capX = W.batX;
    this.capY = W.batY;
    if (this.ball % 6 === 0) this.bowler = pick(BOWLERS);
  }
}
