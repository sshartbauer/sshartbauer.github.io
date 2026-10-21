/* SM-2 style scheduler. A card state is
   { phase: 'learning' | 'review', ease, interval (days), reps, lapses, due (ms) }.
   No state at all means the card is new. Ratings: 0 Again, 1 Hard, 2 Good, 3 Easy. */
(function (global) {
  'use strict';
  const MIN = 60 * 1000, DAY = 24 * 60 * MIN;

  const cfg = {
    againDelay: 1 * MIN,     // Again (any phase) → back in 1 minute
    hardDelay: 10 * MIN,     // Hard while learning → back in 10 minutes
    graduate: 1,             // Good on a learning card → 1 day
    easyGraduate: 4,         // Easy on a learning card → 4 days
    secondInterval: 6,       // second successful review (classic SM-2)
    easyBonus: 1.3,
    hardFactor: 1.2,
    startEase: 2.5,
    minEase: 1.3,
    masteredDays: 6,         // interval at which a card counts as mastered
    learnAhead: 20 * MIN,    // learning cards due this soon still count as due
  };

  function fresh() {
    return { phase: 'learning', ease: cfg.startEase, interval: 0, reps: 0, lapses: 0, due: 0 };
  }

  function next(state, rating, now) {
    const s = Object.assign(fresh(), state || {});
    now = now || Date.now();

    if (s.phase === 'learning') {
      if (rating === 0) { s.due = now + cfg.againDelay; return s; }
      if (rating === 1) { s.due = now + cfg.hardDelay; return s; }
      s.phase = 'review';
      s.reps = 1;
      s.interval = rating === 3 ? cfg.easyGraduate : cfg.graduate;
      if (rating === 3) s.ease += 0.15;
    } else {
      if (rating === 0) {
        s.phase = 'learning';
        s.lapses += 1;
        s.ease = Math.max(cfg.minEase, s.ease - 0.2);
        s.interval = 0;
        s.due = now + cfg.againDelay;
        return s;
      }
      const I = s.interval;
      if (rating === 1) {
        s.ease = Math.max(cfg.minEase, s.ease - 0.15);
        s.interval = Math.max(I + 1, I * cfg.hardFactor);
      } else if (rating === 2) {
        s.interval = s.reps === 1 ? Math.max(cfg.secondInterval, I + 1) : Math.max(I + 1, I * s.ease);
      } else {
        s.ease += 0.15;
        s.interval = s.reps === 1
          ? Math.max(cfg.secondInterval * cfg.easyBonus, I + 1)
          : Math.max(I + 1, I * s.ease * cfg.easyBonus);
      }
      s.reps += 1;
    }
    s.interval = Math.round(s.interval * 10) / 10;
    s.due = now + s.interval * DAY;
    return s;
  }

  function status(state) {
    if (!state) return 'new';
    if (state.phase === 'learning') return 'learning';
    return state.interval >= cfg.masteredDays ? 'mastered' : 'review';
  }

  function isDue(state, now) {
    if (!state) return true;
    const ahead = state.phase === 'learning' ? cfg.learnAhead : 0;
    return state.due <= now + ahead;
  }

  function fmtDelay(ms) {
    if (ms < MIN) return '<1 min';
    if (ms < 60 * MIN) return Math.round(ms / MIN) + ' min';
    if (ms < DAY) { const h = Math.round(ms / (60 * MIN)); return h + (h === 1 ? ' hr' : ' hrs'); }
    const d = ms / DAY;
    if (d < 30) { const r = Math.round(d); return r + (r === 1 ? ' day' : ' days'); }
    if (d < 365) return (d / 30).toFixed(1).replace(/\.0$/, '') + ' mo';
    return (d / 365).toFixed(1).replace(/\.0$/, '') + ' yr';
  }

  // Human-readable delay for each rating button.
  function preview(state, now) {
    now = now || Date.now();
    return [0, 1, 2, 3].map(r => fmtDelay(next(state, r, now).due - now));
  }

  global.RecallSRS = { cfg, next, status, isDue, preview, fmtDelay };
})(window);
