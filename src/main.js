import { TEAMS } from './data.js';
import { W, TUNE, powerFromDrag } from './physics.js';
import { Match } from './game.js';
import { Sdk } from './sdk.js';
import { sfx, setMuted, isMuted, resumeAudio } from './audio.js';
import * as R from './render.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
const boot = document.getElementById('boot');

const save = { best: 0, played: 0, wins: 0, team: 0, muted: false, form: 0 };
let scene = 'MENU';
let match = null;
let paused = false;
let firstFrame = true;

const ui = { teams: TEAMS, selected: 0, best: 0, played: 0, wins: 0, mutedFlag: false, hit: [], start: null, mute: null };

// ---------------------------------------------------------------- persistence

async function loadSave() {
  const data = await Sdk.load();
  if (data && typeof data === 'object') Object.assign(save, data);
  ui.selected = Math.min(Math.max(save.team | 0, 0), TEAMS.length - 1);
  setMuted(!!save.muted);
  syncUi();
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => Sdk.save(save), 250);
}

function syncUi() {
  ui.best = save.best;
  ui.played = save.played;
  ui.wins = save.wins;
  ui.mutedFlag = isMuted();
}

// ---------------------------------------------------------------------- input

let drag = null;

function pointerPos(e) {
  const t = e.touches ? e.touches[0] : e;
  return R.toWorld(t.clientX, t.clientY, canvas);
}

function onDown(e) {
  e.preventDefault();
  resumeAudio();
  const p = pointerPos(e);
  if (scene === 'PLAY') {
    if (!match.armed) { match.armed = true; match.phaseT = 0; sfx.tap(); return; }
    if (match.canSwing || match.phase === 'READY') drag = { start: p, now: p };
    return;
  }
  drag = { start: p, now: p, tap: true };
}

function onMove(e) {
  if (!drag) return;
  e.preventDefault();
  drag.now = pointerPos(e);
  if (Math.hypot(drag.now.x - drag.start.x, drag.now.y - drag.start.y) > 2) drag.tap = false;
}

function onUp(e) {
  if (!drag) return;
  e.preventDefault();
  const d = drag;
  drag = null;

  if (scene === 'PLAY') {
    const dx = d.now.x - d.start.x, dy = d.now.y - d.start.y;
    const len = Math.hypot(dx, dy);
    if (len < TUNE.dragMin * 0.6) return;           // too small to be a flick
    match.swing(-dx / len, -dy / len, len);         // slingshot: away from the pull
    return;
  }

  const p = d.now;
  if (scene === 'MENU') {
    if (ui.mute && R.inCircle(p, ui.mute)) { toggleMute(); return; }
    for (const h of ui.hit) {
      if (R.inCircle(p, h)) { ui.selected = h.i; save.team = h.i; persist(); sfx.tap(); return; }
    }
    if (ui.start && R.inRect(p, ui.start)) { startMatch(); return; }
    return;
  }
  if (scene === 'RESULT') {
    if (R.inRect(p, R.RESULT_HIT.again)) { startMatch(); return; }
    if (R.inRect(p, R.RESULT_HIT.menu)) { scene = 'MENU'; sfx.tap(); return; }
  }
}

function toggleMute() {
  setMuted(!isMuted());
  save.muted = isMuted();
  syncUi();
  persist();
  if (!isMuted()) sfx.tap();
}

canvas.addEventListener('pointerdown', onDown, { passive: false });
canvas.addEventListener('pointermove', onMove, { passive: false });
canvas.addEventListener('pointerup', onUp, { passive: false });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ----------------------------------------------------------------------- flow

function startMatch() {
  const team = TEAMS[ui.selected];
  let rival = TEAMS[(ui.selected + 1 + ((Math.random() * (TEAMS.length - 1)) | 0)) % TEAMS.length];
  if (rival === team) rival = TEAMS[(ui.selected + 1) % TEAMS.length];
  match = new Match(team, rival, save.form);
  scene = 'PLAY';
  sfx.tap();
}

function endMatch() {
  save.played += 1;
  if (match.won) save.wins += 1;
  if (match.runs > save.best) save.best = match.runs;
  save.form = save.form ? save.form * 0.7 + match.runs * 0.3 : match.runs;
  syncUi();
  persist();
  Sdk.sendScore(match.runs);
  scene = 'RESULT';
}

function handleEvents(m) {
  for (const ev of m.events) {
    switch (ev.name) {
      case 'bowl': sfx.bowl(); break;
      case 'flick': sfx.flick(ev.data); break;
      case 'hit': sfx.hit(ev.data.power, ev.data.timing); break;
      case 'outcome': {
        const k = ev.data.kind;
        if (k === 'SIX') sfx.six();
        else if (k === 'FOUR') sfx.four();
        else if (k === 'CAUGHT' || k === 'BOWLED') sfx.wicket();
        else if (k === 'DOT') sfx.dot();
        else sfx.run();
        break;
      }
      case 'end':
        if (ev.data.won) sfx.win(); else sfx.lose();
        endMatch();
        break;
      default: break;
    }
  }
  m.events.length = 0;
}

// ----------------------------------------------------------------------- loop

let last = 0;

function frame(ts) {
  const dt = last ? Math.min((ts - last) / 1000, 1 / 20) : 0;
  last = ts;

  if (!paused && scene === 'PLAY' && match && match.phase !== 'DONE') {
    match.update(dt);
    handleEvents(match);
  }

  R.begin(ctx, canvas, scene === 'PLAY' && match ? match.shake : 0);

  if (scene === 'MENU') {
    R.drawMenu(ctx, ui);
  } else if (match) {
    R.drawGround(ctx);
    R.drawFielders(ctx, match.field, match.rival.color);
    R.drawStumps(ctx);
    R.drawCap(ctx, match.capX, match.capY, W.capR, match.team.color, match.team.id,
      match.lunge ? match.lunge.t * 6 : 0);
    if (match.marble && match.marble.live) R.drawMarble(ctx, match.marble);
    if (drag && scene === 'PLAY') {
      const dx = drag.now.x - drag.start.x, dy = drag.now.y - drag.start.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        R.drawAim(ctx, { dx: -dx / len, dy: -dy / len, power: powerFromDrag(len) }, '#ffd166');
      }
    }
    R.drawHud(ctx, match);
    R.drawPrompt(ctx, match.phase, !!match.lunge, match.armed);
    if (match.phase === 'OUTCOME') R.drawOutcome(ctx, match, match.phaseT);
    R.drawCommentary(ctx, match.commentary);
    if (scene === 'RESULT') R.drawResult(ctx, match, save.best);
  }

  if (paused) {
    ctx.fillStyle = 'rgba(4,10,7,0.7)';
    ctx.fillRect(0, 0, W.w, W.h);
    R.text(ctx, 'PAUSED', 50, 80, 10, '#ffd166');
  }

  if (firstFrame) {
    firstFrame = false;
    boot.classList.add('gone');
    Sdk.firstFrameReady();
  }
  requestAnimationFrame(frame);
}

// ----------------------------------------------------------------------- boot

function fit() { R.resize(canvas); }
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

Sdk.onPause(() => { paused = true; });
Sdk.onResume(() => { paused = false; last = 0; });
Sdk.onAudioEnabledChange((on) => setMuted(!on));
if (!Sdk.audioEnabled()) setMuted(true);

loadSave().then(() => {
  Sdk.gameReady();
  requestAnimationFrame(frame);
});
