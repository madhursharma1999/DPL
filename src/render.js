// Everything is drawn as vectors in world units — no image assets, so the whole
// game weighs what its source weighs and stays sharp on any density.

import { W, TUNE } from './physics.js';
import { BALLS, WICKETS } from './game.js';

export const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

export function resize(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const sw = canvas.clientWidth || window.innerWidth;
  const sh = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(sw * dpr);
  canvas.height = Math.round(sh * dpr);
  const scale = Math.min(sw / W.w, sh / W.h);
  view.dpr = dpr;
  view.scale = scale;
  view.ox = (sw - W.w * scale) / 2;
  view.oy = (sh - W.h * scale) / 2;
}

export function toWorld(clientX, clientY, canvas) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left - view.ox) / view.scale,
    y: (clientY - r.top - view.oy) / view.scale,
  };
}

export function begin(ctx, canvas, shake = 0) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b120e';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  const sx = shake ? (Math.random() - 0.5) * shake * 3 : 0;
  const sy = shake ? (Math.random() - 0.5) * shake * 3 : 0;
  ctx.translate(view.ox + sx, view.oy + sy);
  ctx.scale(view.scale, view.scale);
}

function font(ctx, size, weight = 'bold') {
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
}

export function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  font(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A bottle cap: crimped rim, flat top, single specular highlight. */
export function drawCap(ctx, x, y, r, color, label, spin = 0) {
  const notches = 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);

  ctx.beginPath();
  for (let i = 0; i < notches; i++) {
    const a0 = (i / notches) * Math.PI * 2;
    const a1 = ((i + 0.5) / notches) * Math.PI * 2;
    ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    ctx.lineTo(Math.cos(a1) * r * 0.9, Math.sin(a1) * r * 0.9);
  }
  ctx.closePath();
  ctx.fillStyle = shade(color, -0.35);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.26, r * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();

  if (label) {
    text(ctx, label, 0, r * 0.05, r * 0.72, 'rgba(255,255,255,0.92)');
  }
  ctx.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function drawGround(ctx) {
  const g = ctx.createRadialGradient(W.cx, W.cy - 8, 6, W.cx, W.cy, W.R);
  g.addColorStop(0, '#2f6b3c');
  g.addColorStop(0.7, '#245730');
  g.addColorStop(1, '#1a4224');
  ctx.beginPath();
  ctx.arc(W.cx, W.cy, W.R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // mowing rings
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 3;
  for (let r = 12; r < W.R; r += 9) {
    ctx.beginPath();
    ctx.arc(W.cx, W.cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // rope
  ctx.setLineDash([2.4, 2.4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(W.cx, W.cy, W.R - 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // pitch
  ctx.save();
  ctx.beginPath();
  ctx.arc(W.cx, W.cy, W.R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(206,183,130,0.5)';
  ctx.fillRect(W.batX - 7, W.bowlY - 4, 14, W.stumpY - W.bowlY + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(W.batX - 6, W.sweetY + 3);
  ctx.lineTo(W.batX + 6, W.sweetY + 3);
  ctx.stroke();
  ctx.restore();
}

export function drawStumps(ctx) {
  ctx.fillStyle = '#efe6cf';
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(W.batX + i * 1.7 - 0.35, W.stumpY - 1.5, 0.7, 5);
  }
}

export function drawFielders(ctx, field, color) {
  for (const f of field) {
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + 1.4, 2.6, 1.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    drawCap(ctx, f.x, f.y, 2.6, color, null, 0);
  }
}

export function drawMarble(ctx, m) {
  if (m.trail.length > 3) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(m.trail[0], m.trail[1]);
    for (let i = 2; i < m.trail.length; i += 2) ctx.lineTo(m.trail[i], m.trail[i + 1]);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(m.x, m.y + 1, W.marbleR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  const g = ctx.createRadialGradient(m.x - 0.8, m.y - 0.9, 0.2, m.x, m.y, W.marbleR);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#8fd3ff');
  g.addColorStop(1, '#2b6c9c');
  ctx.beginPath();
  ctx.arc(m.x, m.y, W.marbleR, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

export function drawAim(ctx, aim, color) {
  const { dx, dy, power } = aim;
  const reach = 10 + power * 22;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([2, 1.6]);
  ctx.beginPath();
  ctx.moveTo(W.batX, W.batY);
  ctx.lineTo(W.batX + dx * reach, W.batY + dy * reach);
  ctx.stroke();
  ctx.setLineDash([]);

  const hx = W.batX + dx * reach, hy = W.batY + dy * reach;
  const a = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(hx + Math.cos(a) * 3, hy + Math.sin(a) * 3);
  ctx.lineTo(hx + Math.cos(a + 2.5) * 3, hy + Math.sin(a + 2.5) * 3);
  ctx.lineTo(hx + Math.cos(a - 2.5) * 3, hy + Math.sin(a - 2.5) * 3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // power ring around the cap
  ctx.beginPath();
  ctx.arc(W.batX, W.batY, W.capR + 2.4, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
  ctx.strokeStyle = power > 0.85 ? '#ffd166' : 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();
}

export function drawHud(ctx, m) {
  const team = m.team;
  roundRect(ctx, 4, 4, 92, 26, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fill();

  drawCap(ctx, 12, 14, 6.4, team.color, team.id);
  text(ctx, `${m.runs}/${m.wickets}`, 24, 11, 8.5, '#ffffff', 'left');
  text(ctx, `${m.ball}/${BALLS} balls`, 24, 19, 4, 'rgba(255,255,255,0.6)', 'left');

  const need = m.needed;
  text(ctx, need > 0 ? `NEED ${need}` : 'CHASED', 92, 10, 5.4,
    need > 0 && need <= 12 ? '#ffd166' : '#ffffff', 'right');
  text(ctx, `${m.rival.id} MADE ${m.target}`, 92, 17, 4, 'rgba(255,255,255,0.6)', 'right');

  // last six deliveries, inside the scoreboard so it never sits on the grass
  const recent = m.lastRuns.slice(-6);
  const x0 = 50 - (recent.length * 6) / 2;
  recent.forEach((r, i) => {
    const x = x0 + i * 6 + 3;
    ctx.beginPath();
    ctx.arc(x, 25.5, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = r === 'W' ? '#e63946' : r === '0' ? 'rgba(255,255,255,0.18)'
      : r === '6' ? '#ffd166' : r === '4' ? '#8fd3ff' : 'rgba(255,255,255,0.4)';
    ctx.fill();
    text(ctx, r, x, 25.5, 3, r === '0' ? 'rgba(255,255,255,0.6)' : '#12241a');
  });

  text(ctx, `${m.batter}  vs  ${m.bowler}`, 50, 149.5, 4.2, 'rgba(255,255,255,0.75)');

  // wickets remaining
  for (let i = 0; i < WICKETS; i++) {
    ctx.beginPath();
    ctx.arc(42 + i * 8, 155.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = i < WICKETS - m.wickets ? '#8fd3ff' : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }
}

const OUT_COLOR = {
  SIX: '#ffd166', FOUR: '#8fd3ff', TWO: '#b9f6ca', ONE: '#b9f6ca',
  FIELDED: '#b9f6ca', DOT: '#c9d6cd', CAUGHT: '#ff6b6b', BOWLED: '#ff6b6b',
};
const OUT_TITLE = {
  SIX: 'CHHAKKA!', FOUR: 'CHAAR!', TWO: 'TWO RUNS', ONE: 'SINGLE',
  FIELDED: 'FIELDED · 1', DOT: 'DOT BALL', CAUGHT: 'CAUGHT!', BOWLED: 'BOWLED!',
};

export function drawOutcome(ctx, m, t) {
  const o = m.outcome;
  if (!o) return;
  const pop = Math.min(1, t / 0.14);
  const color = OUT_COLOR[o.kind];
  ctx.save();
  ctx.translate(50, 62);
  ctx.scale(0.8 + pop * 0.2, 0.8 + pop * 0.2);
  ctx.globalAlpha = pop;
  roundRect(ctx, -40, -13, 80, 26, 3);
  ctx.fillStyle = 'rgba(6,14,9,0.86)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.stroke();
  text(ctx, OUT_TITLE[o.kind], 0, -5, 10, color);
  const sub = o.by ? `${o.by}` : (o.timing || '');
  if (sub) text(ctx, sub, 0, 6, 4.4, 'rgba(255,255,255,0.7)', 'center', 'normal');
  ctx.restore();
}

export function drawCommentary(ctx, line) {
  if (!line) return;
  const [who, said] = line;
  const wrapped = wrap(ctx, said, 82, 4.2, 2);
  const h = 10 + wrapped.length * 5.4;
  const top = 124;                           // fixed band under the ground
  roundRect(ctx, 6, top, 88, h, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fill();
  text(ctx, who.toUpperCase(), 10, top + 4, 3.6, '#ffd166', 'left');
  wrapped.forEach((l, i) => {
    text(ctx, l, 10, top + 10.5 + i * 5.4, 4.2, 'rgba(255,255,255,0.9)', 'left', 'normal');
  });
}

function wrap(ctx, str, maxW, size, maxLines = 3) {
  font(ctx, size, 'normal');
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

export function drawMenu(ctx, ui) {
  const { teams, selected, best, played, wins, mutedFlag } = ui;
  text(ctx, 'DHAKKAN', 50, 22, 13, '#ffd166');
  text(ctx, 'PREMIER LEAGUE', 50, 34, 7.6, '#ffffff');
  text(ctx, 'F L I C K   C R I C K E T', 50, 43, 4.4, 'rgba(255,255,255,0.55)', 'center', 'normal');

  text(ctx, 'PICK YOUR FRANCHISE', 50, 55, 4, 'rgba(255,255,255,0.5)', 'center', 'normal');

  ui.hit = [];
  teams.forEach((t, i) => {
    const col = i % 4, row = (i / 4) | 0;
    const x = 17 + col * 22, y = 68 + row * 24;
    const on = i === selected;
    if (on) {
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,209,102,0.18)';
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    drawCap(ctx, x, y, 8.4, t.color, t.id);
    ui.hit.push({ x, y, r: 11, i });
  });

  const t = teams[selected];
  text(ctx, t.name.toUpperCase(), 50, 118, 5.6, '#ffffff');
  text(ctx, `"${t.tagline}"`, 50, 125, 4, 'rgba(255,255,255,0.6)', 'center', 'normal');

  button(ctx, 50, 139, 54, 12, 'START THE CHASE', '#ffd166', '#12241a');
  ui.start = { x: 50, y: 139, w: 54, h: 12 };

  text(ctx, `BEST ${best}   PLAYED ${played}   WON ${wins}`, 50, 152, 3.6,
    'rgba(255,255,255,0.45)', 'center', 'normal');

  muteButton(ctx, mutedFlag);
  ui.mute = { x: 90, y: 152, r: 6 };
}

export function drawResult(ctx, m, best) {
  ctx.fillStyle = 'rgba(4,10,7,0.93)';
  ctx.fillRect(0, 0, W.w, W.h);
  const won = m.won;
  text(ctx, won ? 'JEET GAYE!' : 'HAAR GAYE', 50, 52, 12, won ? '#ffd166' : '#ff6b6b');
  text(ctx, `${m.runs}/${m.wickets}  in  ${m.ball} balls`, 50, 66, 6.4, '#ffffff');
  text(ctx, `Target was ${m.target}`, 50, 75, 4.4, 'rgba(255,255,255,0.6)', 'center', 'normal');
  drawCap(ctx, 50, 92, 11, m.team.color, m.team.id);
  text(ctx, m.team.name.toUpperCase(), 50, 108, 5, '#ffffff');
  if (m.runs > 0 && m.runs >= best) text(ctx, 'NEW BEST SCORE', 50, 116, 4.2, '#ffd166');
  button(ctx, 50, 130, 58, 12, 'PLAY AGAIN', '#ffd166', '#12241a');
  button(ctx, 50, 146, 58, 11, 'CHANGE TEAM', 'rgba(255,255,255,0.22)', '#ffffff');
}

export const RESULT_HIT = {
  again: { x: 50, y: 130, w: 58, h: 12 },
  menu: { x: 50, y: 146, w: 58, h: 11 },
};

export function button(ctx, cx, cy, w, h, label, bg, fg) {
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 2.5);
  ctx.fillStyle = bg;
  ctx.fill();
  text(ctx, label, cx, cy, h * 0.38, fg);
}

export function muteButton(ctx, mutedFlag) {
  ctx.beginPath();
  ctx.arc(90, 152, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  text(ctx, mutedFlag ? 'OFF' : 'ON', 90, 152, 3.6, 'rgba(255,255,255,0.8)');
}

/** Prompts sit on the grass, so they get a pill behind them to stay readable. */
function pill(ctx, str, size, color, weight = 'bold') {
  font(ctx, size, weight);
  const w = ctx.measureText(str).width + 6;
  roundRect(ctx, 50 - w / 2, 115 - size * 0.75, w, size * 1.5, size * 0.75);
  ctx.fillStyle = 'rgba(6,14,9,0.66)';
  ctx.fill();
  text(ctx, str, 50, 115, size, color, 'center', weight);
}

export function drawPrompt(ctx, phase, hasSwung, armed) {
  if (!armed) return pill(ctx, 'TAP TO FACE THE FIRST BALL', 4.4, '#ffd166');
  if (phase === 'READY') {
    pill(ctx, 'DRAG BACK  ·  RELEASE TO FLICK', 4.2, 'rgba(255,255,255,0.7)', 'normal');
  } else if (phase === 'LIVE' && !hasSwung) {
    pill(ctx, 'FLICK!', 5.2, '#ffd166');
  }
}

export function inRect(p, r) {
  return Math.abs(p.x - r.x) <= r.w / 2 && Math.abs(p.y - r.y) <= r.h / 2;
}
export function inCircle(p, c) {
  return Math.hypot(p.x - c.x, p.y - c.y) <= c.r;
}
export { TUNE };
