/* Recall — generic flashcard app. Everything deck-specific comes from
   window.RecallDecks[deckId]; pick the deck with ?deck=<id> (default below). */
(function () {
  'use strict';
  const SRS = window.RecallSRS, Structures = window.RecallStructures;
  const deckId = new URLSearchParams(location.search).get('deck') || 'amino-acids';
  const deck = window.RecallDecks[deckId];
  const $ = id => document.getElementById(id);

  // ── Persistence ──
  const KEY = 'recall:' + deck.id;
  function load(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  const fieldKeys = deck.fields.map(f => f.key);
  const settings = Object.assign(
    { front: deck.defaultFront, back: deck.defaultBack, interval: 3000, loop: true, shuffle: false, scope: 'due' },
    load(KEY + ':settings', {})
  );
  settings.front = settings.front.filter(k => fieldKeys.includes(k));
  settings.back = settings.back.filter(k => fieldKeys.includes(k));
  let progress = load(KEY + ':progress', {});
  const saveSettings = () => save(KEY + ':settings', settings);
  const saveProgress = () => save(KEY + ':progress', progress);

  const cardById = Object.fromEntries(deck.cards.map(c => [c.id, c]));
  const fieldByKey = Object.fromEntries(deck.fields.map(f => [f.key, f]));
  const structureCache = {};

  // ── Session ──
  let queue = [], pos = 0, flipped = false, playing = false, timer = null;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function buildQueue() {
    const now = Date.now();
    let ids = deck.cards.map(c => c.id);
    if (settings.scope === 'due') {
      ids = ids.filter(id => SRS.isDue(progress[id], now));
      // Seen cards first, soonest-due first; new cards after, in deck order.
      const seen = ids.filter(id => progress[id]).sort((a, b) => progress[a].due - progress[b].due);
      ids = seen.concat(ids.filter(id => !progress[id]));
    }
    queue = settings.shuffle ? shuffle(ids) : ids;
    pos = 0;
    flipped = false;
  }

  const current = () => cardById[queue[pos]];

  function advance(auto) {
    flipped = false;
    if (pos < queue.length - 1) { pos++; return; }
    if (settings.loop || !auto) {
      pos = 0;
      if (settings.shuffle && queue.length > 2) {
        const last = queue[queue.length - 1];
        do { shuffle(queue); } while (queue[0] === last); // don't repeat the card just seen
      }
    } else {
      flipped = true;
      setPlaying(false);
    }
  }

  function rate(r) {
    const card = current();
    if (!card || !flipped) return;
    const now = Date.now();
    progress[card.id] = SRS.next(progress[card.id], r, now);
    saveProgress();
    queue.splice(pos, 1);
    // Cards due again soon come back later in this session.
    if (progress[card.id].due - now <= SRS.cfg.learnAhead) {
      const gap = r === 0 ? 3 : 6;
      queue.splice(Math.min(pos + gap, queue.length), 0, card.id);
    }
    if (pos >= queue.length) pos = 0;
    flipped = false;
    render();
    restartTimer();
  }

  // ── Autoplay ──
  function setPlaying(on) {
    playing = on && queue.length > 0;
    const btn = $('playBtn');
    btn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    restartTimer();
  }
  function restartTimer() {
    clearTimeout(timer);
    if (playing) timer = setTimeout(tick, settings.interval);
  }
  function tick() {
    if (!queue.length) { setPlaying(false); return; }
    if (!flipped) flipped = true; else advance(true);
    render();
    restartTimer();
  }

  // ── Rendering ──
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const catOf = card => deck.categories[card[deck.categoryField]];
  const colorVar = name => `var(--${name})`;

  function fieldValue(field, card) {
    return field.get ? field.get(card) : card[field.key];
  }

  function renderValue(field, card, side) {
    const v = fieldValue(field, card);
    switch (field.type) {
      case 'structure': {
        const scale = side === 'front' ? 44 : 34, ck = card.id + scale;
        if (!structureCache[ck]) structureCache[ck] = Structures.render(v, { scale, alt: 'skeletal structure' });
        return `<div class="structure-box">${structureCache[ck]}</div>`;
      }
      case 'title': return `<div class="v-title">${esc(v)}</div>`;
      case 'code': return `<div class="v-code">${esc(v)}</div>`;
      case 'formula': {
        const [main, ...rest] = [].concat(v);
        return `<div class="v-formula">${esc(main)}${rest.map(r => `<div class="r">${esc(r)}</div>`).join('')}</div>`;
      }
      case 'category': {
        const c = deck.categories[v];
        return `<span class="pill" style="--c:${colorVar(c.color)}">${esc(c.label)}</span>`;
      }
      case 'badge': return `<span class="pill" style="--c:var(--muted)">${esc(v)}</span>`;
      case 'number':
        return v == null ? `<div class="v none">${esc(field.empty || '—')}</div>` : `<div class="v-number">${esc(v)}</div>`;
      default: return `<div class="v">${esc(v)}</div>`;
    }
  }

  function blocks(keys, card, side) {
    return keys.map(k => {
      const f = fieldByKey[k];
      const wide = f.type === 'structure' || f.type === 'formula';
      return `<div class="fblock${wide ? ' wide' : ''}"><div class="k">${esc(f.label)}</div>${renderValue(f, card, side)}</div>`;
    }).join('');
  }

  const ordered = keys => fieldKeys.filter(k => keys.includes(k));

  function renderCard() {
    const el = $('card');
    const card = current();
    el.classList.remove('cat-shown');
    el.style.removeProperty('--c');

    if (!card) {
      const now = Date.now();
      const upcoming = Object.values(progress).map(s => s.due).filter(d => d > now).sort((a, b) => a - b)[0];
      el.innerHTML = `<div class="empty">
        <h2>All caught up</h2>
        <p>${upcoming ? `Next card is due in <b>${SRS.fmtDelay(upcoming - now)}</b>.` : 'Nothing is due right now.'}
        You can keep practicing with every card — ratings still update the schedule.</p>
        <div class="btns">
          <button class="nav-btn" data-act="cram">Study all ${deck.cards.length} cards</button>
          <button class="nav-btn" data-act="recheck">Check for due cards</button>
        </div></div>`;
      return;
    }

    const front = ordered(settings.front);
    const back = ordered(settings.back).filter(k => !front.includes(k));
    const catVisible = front.includes(deck.categoryField) || (flipped && back.includes(deck.categoryField));
    const cat = catOf(card);
    if (catVisible) { el.classList.add('cat-shown'); el.style.setProperty('--c', colorVar(cat.color)); }

    const st = SRS.status(progress[card.id]);
    const stateLabel = { new: 'New', learning: 'Learning', review: 'Review', mastered: 'Mastered' }[st];
    const tag = catVisible ? `<div class="card-tag"><span class="dot"></span>${esc(cat.label)}</div>` : '<div></div>';

    let body;
    if (!front.length) {
      body = `<div class="empty"><p>Pick at least one field under <b>Front shows</b> to build the card.</p></div>`;
    } else {
      body = `<div class="fblocks front">${blocks(front, card, 'front')}</div>`;
      if (!flipped) {
        if (back.length) {
          body += `<div class="recall"><span>Recall:</span>${back.map(k => `<span class="q">${esc(fieldByKey[k].label)}</span>`).join('')}</div>`;
        }
        body += `<div class="flip-hint">Click the card or press Space to reveal</div>`;
      } else if (back.length) {
        body += `<div class="divider"></div><div class="fblocks back">${blocks(back, card, 'back')}</div>`;
      }
    }

    const labels = SRS.preview(progress[card.id]);
    const names = ['Again', 'Hard', 'Good', 'Easy'];
    const rateRow = flipped
      ? names.map((n, i) => `<button class="rate-btn ${n.toLowerCase()}" data-rate="${i}" title="${n} (${i + 1})">${n}<span class="rate-sub">${labels[i]}</span></button>`).join('')
      : `<button class="show-btn" data-act="flip">Show answer <span class="rate-sub" style="display:inline;margin-left:6px">Space</span></button>`;

    el.innerHTML = `<div class="card-top">${tag}<span class="card-state">${stateLabel}</span></div>
      <div class="card-body${flipped ? ' flipped' : ''}" data-act="${flipped ? '' : 'flip'}">${body}</div>
      <div class="rate-row">${rateRow}</div>`;
  }

  function renderFields() {
    for (const side of ['front', 'back']) {
      const other = side === 'front' ? 'back' : 'front';
      $(side + 'Fields').innerHTML = deck.fields.map(f => {
        const on = settings[side].includes(f.key);
        const note = side === 'back' && on && settings[other].includes(f.key) ? '<span class="also">on front</span>' : '';
        return `<button type="button" class="field-row${on ? ' on' : ''}" data-side="${side}" data-key="${f.key}" aria-pressed="${on}"><span class="dot"></span>${esc(f.label)}${note}</button>`;
      }).join('');
    }
    const same = (a, b) => a.length === b.length && a.every(k => b.includes(k));
    $('presets').innerHTML = (deck.presets || []).map((p, i) => {
      const on = same(p.front, settings.front) && same(p.back, settings.back);
      return `<button type="button" class="preset${on ? ' on' : ''}" data-preset="${i}">${esc(p.label)}</button>`;
    }).join('');
  }

  function renderKey() {
    const cats = Object.values(deck.categories);
    $('keyList').innerHTML = cats.map(c =>
      `<div class="key-row"><span class="swatch" style="--c:${colorVar(c.color)}"></span>${esc(c.label)}</div>`).join('');
    $('keyStrip').innerHTML = cats.map(c =>
      `<span><i style="--c:${colorVar(c.color)}"></i>${esc(c.label)}</span>`).join('');
  }

  function renderProgress() {
    const counts = { new: 0, learning: 0, review: 0, mastered: 0 };
    const cur = current();
    $('dots').innerHTML = deck.cards.map(c => {
      const st = SRS.status(progress[c.id]);
      counts[st]++;
      return `<span class="${st}${cur && cur.id === c.id ? ' cur' : ''}"></span>`;
    }).join('');
    const total = deck.cards.length;
    $('statMastered').textContent = counts.mastered;
    $('statTotal').textContent = total;
    $('statLearning').textContent = counts.learning + counts.review;
    $('statNew').textContent = counts.new;
    $('masteryFill').style.width = (100 * counts.mastered / total) + '%';
    $('masteryNote').textContent = `${counts.mastered} of ${total} mastered. A card counts as mastered once its review interval reaches ${SRS.cfg.masteredDays} days.`;

    $('sessionPos').textContent = queue.length
      ? `Card ${pos + 1} of ${queue.length}${settings.scope === 'due' ? ' due' : ''}`
      : 'Session complete';
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.scope === settings.scope));
    $('prevBtn').disabled = queue.length < 2;
    $('skipBtn').disabled = queue.length < 2;
  }

  function render() {
    renderCard();
    renderProgress();
  }

  // ── Events ──
  function flip() {
    if (!current() || !settings.front.length) return;
    flipped = !flipped;
    render();
    restartTimer();
  }

  $('card').addEventListener('click', e => {
    const r = e.target.closest('[data-rate]');
    if (r) return rate(+r.dataset.rate);
    const a = e.target.closest('[data-act]');
    if (!a || !a.dataset.act) return;
    if (a.dataset.act === 'flip') flip();
    else if (a.dataset.act === 'cram') { settings.scope = 'all'; saveSettings(); buildQueue(); render(); }
    else if (a.dataset.act === 'recheck') { buildQueue(); render(); }
  });

  document.querySelector('.fields-panel').addEventListener('click', e => {
    const row = e.target.closest('.field-row');
    const all = e.target.closest('.mini-link');
    const preset = e.target.closest('[data-preset]');
    if (row) {
      const list = settings[row.dataset.side], k = row.dataset.key;
      settings[row.dataset.side] = list.includes(k) ? list.filter(x => x !== k) : list.concat(k);
    } else if (all) {
      settings[all.dataset.side] = all.dataset.all === '1' ? fieldKeys.slice() : [];
    } else if (preset) {
      const p = deck.presets[+preset.dataset.preset];
      settings.front = p.front.slice(); settings.back = p.back.slice();
    } else return;
    saveSettings();
    renderFields();
    renderCard();
  });

  document.querySelector('.seg').addEventListener('click', e => {
    const b = e.target.closest('[data-scope]');
    if (!b || b.dataset.scope === settings.scope) return;
    settings.scope = b.dataset.scope; saveSettings();
    buildQueue(); render(); restartTimer();
  });

  $('prevBtn').addEventListener('click', () => {
    if (!queue.length) return;
    pos = (pos - 1 + queue.length) % queue.length; flipped = false; render(); restartTimer();
  });
  $('skipBtn').addEventListener('click', () => { if (queue.length) { advance(false); render(); restartTimer(); } });
  $('playBtn').addEventListener('click', () => setPlaying(!playing));

  const intervalInput = $('intervalInput');
  intervalInput.value = settings.interval;
  function commitInterval() {
    const n = parseInt(intervalInput.value.replace(/[^\d]/g, ''), 10);
    const ok = Number.isFinite(n) && n >= 200 && n <= 600000;
    intervalInput.classList.toggle('bad', !ok);
    if (!ok) { intervalInput.title = 'Enter 200–600000 ms'; return; }
    intervalInput.title = '';
    settings.interval = n; saveSettings();
    restartTimer();
  }
  intervalInput.addEventListener('input', () => {
    const n = parseInt(intervalInput.value, 10);
    intervalInput.classList.toggle('bad', !(n >= 200 && n <= 600000) || /[^\d\s]/.test(intervalInput.value));
  });
  intervalInput.addEventListener('change', commitInterval);
  intervalInput.addEventListener('keydown', e => { if (e.key === 'Enter') { commitInterval(); intervalInput.blur(); } });
  intervalInput.addEventListener('blur', () => {
    if (intervalInput.classList.contains('bad')) { intervalInput.value = settings.interval; intervalInput.classList.remove('bad'); }
  });

  $('loopToggle').checked = settings.loop;
  $('shuffleToggle').checked = settings.shuffle;
  $('loopToggle').addEventListener('change', e => { settings.loop = e.target.checked; saveSettings(); });
  $('shuffleToggle').addEventListener('change', e => {
    settings.shuffle = e.target.checked; saveSettings();
    const cur = queue[pos];
    const rest = queue.filter((_, i) => i !== pos);
    if (settings.shuffle) shuffle(rest);
    else rest.sort((a, b) => deck.cards.indexOf(cardById[a]) - deck.cards.indexOf(cardById[b]));
    queue = cur ? [cur].concat(rest) : rest;
    pos = 0;
    render();
  });

  $('resetBtn').addEventListener('click', () => {
    if (!confirm(`Reset all progress for “${deck.title}”? This clears every card's schedule.`)) return;
    progress = {}; saveProgress();
    buildQueue(); render(); restartTimer();
  });

  const themeSelect = $('themeSelect');
  themeSelect.value = document.documentElement.getAttribute('data-theme') || 'dark';
  themeSelect.addEventListener('change', () => {
    document.documentElement.setAttribute('data-theme', themeSelect.value);
    try { localStorage.setItem('recall:theme', themeSelect.value); } catch (e) {}
  });

  document.addEventListener('keydown', e => {
    const t = e.target instanceof Element ? e.target : document.body;
    if (t.closest('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (t.closest('button') && e.key === 'Enter') return;
      e.preventDefault(); flip();
    } else if (/^[1-4]$/.test(e.key)) rate(+e.key - 1);
    else if (e.key === 'p' || e.key === 'P') setPlaying(!playing);
    else if (e.key === 'ArrowRight') $('skipBtn').click();
    else if (e.key === 'ArrowLeft') $('prevBtn').click();
  });

  // ── Boot ──
  document.title = deck.title + ' — Hartbauer';
  $('deckTitle').textContent = deck.title;
  $('deckIcon').textContent = deck.icon || '';
  renderKey();
  renderFields();
  buildQueue();
  render();
})();
