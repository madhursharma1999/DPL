// Thin adapter over the YouTube Playables host object (window.ytgame).
//
// Everything is feature-detected: the game must run identically in a plain
// browser during development, where no host object exists at all. Falls back to
// localStorage for saves and to the Page Visibility API for pause/resume.
//
// NOTE: confirm the exact ytgame.* signatures against the Playables Developer
// Portal docs before submitting — they are versioned and gated behind approval.
// Nothing here assumes a response shape, so a mismatch degrades to the fallback
// instead of throwing.

const host = typeof window !== 'undefined' ? window.ytgame : undefined;
const KEY = 'dpl.flick.save.v1';

const safe = (fn, fallback) => { try { return fn(); } catch (_) { return fallback; } };

export const Sdk = {
  present: !!host,

  /** Call the moment the first real frame is on screen. */
  firstFrameReady() { safe(() => host && host.game && host.game.firstFrameReady()); },

  /** Call when assets are up and the game is interactive. */
  gameReady() { safe(() => host && host.game && host.game.gameReady()); },

  async load() {
    if (host && host.game && host.game.loadData) {
      const raw = await safe(() => host.game.loadData(), null);
      if (raw) return safe(() => JSON.parse(raw), null);
      return null;
    }
    return safe(() => JSON.parse(localStorage.getItem(KEY)), null);
  },

  async save(obj) {
    const raw = JSON.stringify(obj);
    if (host && host.game && host.game.saveData) {
      return safe(() => host.game.saveData(raw), null);
    }
    return safe(() => localStorage.setItem(KEY, raw), null);
  },

  /** Report a run to the host so it can drive its own engagement surfaces. */
  sendScore(value) {
    safe(() => host && host.engagement && host.engagement.sendScore({ value }));
  },

  onPause(cb) {
    if (host && host.system && host.system.onPause) return safe(() => host.system.onPause(cb));
    document.addEventListener('visibilitychange', () => { if (document.hidden) cb(); });
  },

  onResume(cb) {
    if (host && host.system && host.system.onResume) return safe(() => host.system.onResume(cb));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) cb(); });
  },

  /** The host can mute the whole game (e.g. a video is playing over it). */
  audioEnabled() {
    if (host && host.system && typeof host.system.isAudioEnabled === 'function') {
      return safe(() => host.system.isAudioEnabled(), true);
    }
    return true;
  },

  onAudioEnabledChange(cb) {
    safe(() => host && host.system && host.system.onAudioEnabledChange
      && host.system.onAudioEnabledChange(cb));
  },
};
