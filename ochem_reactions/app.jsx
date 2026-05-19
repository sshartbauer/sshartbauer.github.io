/* OChem Reaction Game — main app */
const { useState, useEffect, useMemo, useRef } = React;

// ── Game tuning ────────────────────────────────────────────
const STARTING_ELECTRONS = 15;
const HINT_COSTS = { class: 2, site: 5, arrow: 10 };
const REWARDS = {
  noHint: 6, withHints: 3, afterWrong: 1,
  wrongPenalty: 1,
  streakBonusEvery: 3,
};
const XP_THRESHOLDS = [0, 12, 32, 60, 100, 150, 220, 310, 420];

function levelFromXP(xp) {
  let lvl = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) lvl = i + 1;
  }
  return lvl;
}
function xpProgress(xp) {
  const lvl = levelFromXP(xp);
  const lo = XP_THRESHOLDS[lvl - 1];
  const hi = XP_THRESHOLDS[lvl] ?? (lo + 200);
  return { lvl, lo, hi, pct: Math.round(((xp - lo) / (hi - lo)) * 100) };
}

function reactionMatchesMechs(r, selMechs) {
  if (selMechs.includes(r.mechanism)) return true;
  if (Array.isArray(r.categories)) {
    for (const c of r.categories) if (selMechs.includes(c)) return true;
  }
  return false;
}

/* Extract OpenStax chapter number from the source field (e.g. '§11.2' → 11) */
function getChapter(r) {
  if (!r.source) return 0;
  const m = r.source.match(/§(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/* Deterministic shuffle with an arbitrary seed string */
function shuffleWithSeed(arr, seedStr) {
  let seed = 0;
  for (const c of seedStr) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function filterReactions(selGroups, selMechs, selChapters) {
  return REACTIONS.filter(r => {
    const ch = getChapter(r);
    return reactionMatchesMechs(r, selMechs) &&
      r.groups.some(g => selGroups.includes(g)) &&
      (selChapters.length === 0 || ch === 0 || selChapters.includes(ch));
  });
}

function shuffleAnswers(rxn) {
  const items = [rxn.product, ...rxn.distractors];
  let seed = 0;
  for (const c of rxn.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Top-bar wallet + chips ─────────────────────────────────
function Wallet({ electrons, flash, spent }) {
  const cls = `wallet${flash ? ' flash' : ''}${spent ? ' spent' : ''}`;
  return (
    <div className={cls} title="Electron balance — spend on hints">
      <div className="wallet-symbol">e⁻</div>
      <div className="wallet-body">
        <div className="wallet-label">Balance</div>
        <div className="wallet-value">{electrons}</div>
      </div>
    </div>
  );
}

function CurrencyChips({ streak, level }) {
  return (
    <div className="chip-row">
      <div className="chip level">
        <span className="chip-icon">Lv</span>
        <span className="chip-num">{level}</span>
      </div>
      <div className="chip streak">
        <span className="chip-icon">{'\u{1F525}'}</span>
        <span className="chip-num">{streak}</span>
      </div>
    </div>
  );
}

// ── Sidebar (Reaction Building mode) ──────────────────────
function GameSidebar({
  groups, mechs, chapters,
  selGroups, selMechs, selChapters,
  onToggleGroup, onToggleMech, onToggleChapter,
  onAllGroups, onClearGroups,
  onAllMechs, onClearMechs,
  onAllChapters, onClearChapters,
  level, xp, deckSize, solved,
}) {
  const xpInfo = xpProgress(xp);
  return (
    <div className="sidebar">
      <div className="sidebar-hdr">
        <span>Groups</span>
        <div className="sidebar-acts">
          <button className="btn-xs" onClick={onAllGroups}>All</button>
          <button className="btn-xs" onClick={onClearGroups}>Clear</button>
        </div>
      </div>

      <div className="sidebar-body">
        <div className="sec-col">
          {groups.map(g => (
            <button key={g.id}
              className={`sec-btn${selGroups.includes(g.id) ? ' on' : ''}`}
              style={{ '--c': g.color }}
              onClick={() => onToggleGroup(g.id)}
            >
              <span className="sec-btn-left">
                <span className="dot"></span>{g.label}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-section-hdr" style={{ marginTop: 14 }}>
          <span>Mechanisms</span>
          <div className="sidebar-acts">
            <button className="btn-xs" onClick={onAllMechs}>All</button>
            <button className="btn-xs" onClick={onClearMechs}>Clear</button>
          </div>
        </div>
        <div className="sec-col">
          {mechs.map(m => (
            <button key={m.id}
              className={`sec-btn${selMechs.includes(m.id) ? ' on' : ''}`}
              style={{ '--c': m.color }}
              onClick={() => onToggleMech(m.id)}
            >
              <span className="sec-btn-left">
                <span className="dot"></span>{m.label}
              </span>
            </button>
          ))}
        </div>

        {chapters.length > 0 && (
          <>
            <div className="sidebar-section-hdr" style={{ marginTop: 14 }}>
              <span>OpenStax Ch.</span>
              <div className="sidebar-acts">
                <button className="btn-xs" onClick={onAllChapters}>All</button>
                <button className="btn-xs" onClick={onClearChapters}>None</button>
              </div>
            </div>
            <div className="chapter-scroll-wrap">
              <div className="chapter-grid">
                {chapters.map(ch => (
                  <button key={ch}
                    className={`ch-btn${selChapters.includes(ch) ? ' on' : ''}`}
                    onClick={() => onToggleChapter(ch)}
                  >
                    {String(ch).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div className="chapter-scroll-fade" />
            </div>
          </>
        )}
      </div>

      <div className="prog-panel">
        <div className="prog-panel-title">Lab progress</div>
        <div className="prog-stats">
          <div className="prog-stat known">
            <div className="prog-stat-val">{solved}</div>
            <div className="prog-stat-lbl">Solved</div>
          </div>
          <div className="prog-stat total">
            <div className="prog-stat-val">{deckSize}</div>
            <div className="prog-stat-lbl">In Deck</div>
          </div>
        </div>
        <div className="lvl-meter">
          <div className="lvl-meter-row">
            <span>Level <b>{xpInfo.lvl}</b></span>
            <span>{xp} / {xpInfo.hi} xp</span>
          </div>
          <div className="lvl-bar">
            <div className="lvl-fill" style={{ width: `${xpInfo.pct}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tree-mode sidebar (slim) ───────────────────────────────
function TreeSidebar() {
  const trees = window.TREES || {};
  return (
    <div className="sidebar tree-sidebar">
      <div className="sidebar-hdr"><span>Reaction Tree</span></div>
      <div className="sidebar-body">
        <div className="tree-side-blurb">
          Pick a substrate from the dropdown. Each ray is a reagent. Complete one branch at a time.
        </div>
        <div className="tree-side-list">
          {Object.values(trees).map(t => (
            <div key={t.id} className="tree-side-row">
              <span className="tree-side-name">{t.label}</span>
              <span className="tree-side-cnt">{t.branches.length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hint shop ──────────────────────────────────────────────
function HintShop({ electrons, bought, onBuy, hints, locked, flashE }) {
  const tiers = [
    { id: 'class', klass: '', name: 'Reaction class',
      desc: 'Tells you the mechanism family. Cheap nudge.' },
    { id: 'site', klass: 't2', name: 'Reactive site',
      desc: 'Highlights the bond / atom where the action happens.' },
    { id: 'arrow', klass: 't3', name: 'First mechanism step',
      desc: 'The opening curved arrow, in plain English. Almost a giveaway.' },
  ];

  return (
    <div className="hint-shop">
      <div className="hint-shop-hdr">
        <span className="hint-shop-title">Hint shop</span>
        <div className={`hint-shop-wallet${flashE ? ' '+flashE : ''}`} title="Available electrons">
          <span className="hint-shop-wallet-sym">e⁻</span>
          <span className="hint-shop-wallet-val">{electrons}</span>
          <span className="hint-shop-wallet-lbl">available</span>
        </div>
      </div>
      <div className="hint-row">
        {tiers.map(t => {
          const cost = HINT_COSTS[t.id];
          const isBought = bought.has(t.id);
          const canAfford = electrons >= cost;
          const disabled = locked || isBought || !canAfford;
          return (
            <button key={t.id}
              className={`hint-card ${t.klass}${isBought ? ' bought' : ''}`}
              disabled={disabled}
              onClick={() => onBuy(t.id)}
            >
              <div className="hint-card-top">
                <span className="hint-card-name">{t.name}</span>
                <span className={`hint-card-cost${isBought ? ' spent' : ''}`}>
                  {cost} e⁻
                </span>
              </div>
              <div className="hint-card-desc">{t.desc}</div>
            </button>
          );
        })}
      </div>

      {bought.has('class') && (
        <div className="hint-reveal">
          <div className="hint-reveal-label">Class</div>
          {hints.class}
        </div>
      )}
      {bought.has('site') && (
        <div className="hint-reveal t2">
          <div className="hint-reveal-label">Reactive site</div>
          {hints.site.text}
        </div>
      )}
      {bought.has('arrow') && (
        <div className="hint-reveal t3">
          <div className="hint-reveal-label">First step</div>
          {hints.arrow}
        </div>
      )}
    </div>
  );
}

// ── Wrong-answer panel ─────────────────────────────────────
function WrongPanel({ pickedName, reason }) {
  return (
    <div className="wrong-panel">
      <div className="wrong-panel-icon">✗</div>
      <div className="wrong-panel-body">
        <div className="wrong-panel-title">
          Why not <em>{pickedName}</em>?
        </div>
        <div className="wrong-panel-text">{reason}</div>
        <div className="wrong-panel-prompt">Try another option.</div>
      </div>
    </div>
  );
}

// ── Correct-answer mechanism panel ─────────────────────────
function MechanismStepsPanel({ rxn, onWalkthrough }) {
  const steps = rxn.walkthrough || [];
  return (
    <div className="mech-panel">
      <div className="mech-panel-hdr">
        <div className="mech-panel-icon">✓</div>
        <div className="mech-panel-titleblock">
          <div className="mech-panel-title">
            Correct — mechanism for {rxn.mechanism}
          </div>
          <div className="mech-panel-sub">{rxn.feedback}</div>
        </div>
        {onWalkthrough && steps.length > 0 && (
          <button className="mech-panel-walk" onClick={onWalkthrough}>
            Walk through →
          </button>
        )}
      </div>
      {steps.length > 0 && (
        <ol className="mech-steps">
          {steps.map((s, i) => (
            <li key={i} className="mech-step">
              <span className="mech-step-num">{i + 1}.</span>
              <div className="mech-step-body">
                <div className="mech-step-title">{s.title}</div>
                <div className="mech-step-text">{s.specific}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Legend panel — always-visible pattern key ──────────────
function LegendPanel() {
  const patterns = window.GROUP_PATTERNS || {};
  const order = ['alkane','alkene','alkyne','alcohol','halide','aromatic','ketone',
                 'aldehyde','acid','ester','amine','amide','ether','nitro','diene'];
  return (
    <div className="legend-panel">
      <div className="legend-panel-hdr">Key</div>
      <div className="legend-scroll">
        {order.filter(id => patterns[id]).map(id => {
          const p = patterns[id];
          return (
            <div key={id} className="legend-row">
              <div className="legend-swatch" style={{
                backgroundColor: `${p.color}14`,
                backgroundImage: p.css === 'none' ? 'none' : p.css,
                borderColor: `${p.color}60`,
              }} />
              <div className="legend-label">{p.legendLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reaction puzzle board ──────────────────────────────────
function ReactionBoard({ rxn, highlightBondKey, choices, wrongPicks, correctIdx, locked, lastWrongIdx, onPick, questionSlot }) {
  const promptMap = {
    product:   'Predict the major product',
    reagent:   'Predict the reagent & conditions',
    substrate: 'Predict the starting material',
  };

  const subGroup  = window.groupForMolecule ? window.groupForMolecule(rxn.substrate) : 'default';
  const groupPat  = (window.GROUP_PATTERNS || {})[subGroup]  || { color: '#6fa0af', legendLabel: 'Substrate' };
  const prodGroup = window.groupForMolecule ? window.groupForMolecule(rxn.product)   : 'default';
  const prodPat   = (window.GROUP_PATTERNS || {})[prodGroup] || { color: '#6fa0af', legendLabel: 'Product' };

  return (
    <div className="rxn-board">
      <div className="rxn-prompt">{promptMap[questionSlot] || 'Predict the major product'}</div>

      <div className="rxn-equation">

        {/* ── Substrate slot ── */}
        <div className="rxn-slot">
          <div className="rxn-slot-label">Substrate</div>
          {questionSlot === 'substrate' && !locked ? (
            <div className="rxn-q-card">?</div>
          ) : (
            <>
              <div className="rxn-group-tag" style={{ color: groupPat.color, borderColor: `${groupPat.color}55` }}>
                <span className="rxn-group-dot" style={{ background: groupPat.color }} />
                {groupPat.legendLabel}
              </div>
              <MoleculeSVG
                id={rxn.substrate}
                highlightBondKey={questionSlot !== 'substrate' ? highlightBondKey : null}
                scale={1.7}
              />
              <div className="rxn-slot-name" style={locked && questionSlot === 'substrate' ? { color: 'var(--known)' } : {}}>
                {MOLECULES[rxn.substrate]?.name}
              </div>
            </>
          )}
        </div>

        {/* ── Reagent arrow ── */}
        {questionSlot === 'reagent' && !locked ? (
          <div className="rxn-slot">
            <div className="rxn-slot-label">Reagent</div>
            <div className="rxn-q-card rxn-q-reagent">?</div>
          </div>
        ) : (
          <ReactionArrow reagent={rxn.reagent} conditions={rxn.conditions} />
        )}

        {/* ── Product slot ── */}
        <div className="rxn-slot rxn-product-slot">
          <div className="rxn-slot-label">Product</div>
          {questionSlot === 'product' && !locked ? (
            <>
              <div className="rxn-q-card">?</div>
              <div className="rxn-slot-name">choose below</div>
            </>
          ) : (
            <>
              <div className="rxn-group-tag" style={{ color: prodPat.color, borderColor: `${prodPat.color}55` }}>
                <span className="rxn-group-dot" style={{ background: prodPat.color }} />
                {prodPat.legendLabel}
              </div>
              <MoleculeSVG id={rxn.product} scale={1.7} />
              <div className="rxn-slot-name" style={locked && questionSlot === 'product' ? { color: 'var(--known)' } : {}}>
                {MOLECULES[rxn.product]?.name}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="answer-grid">
        {choices.map((choice, i) => {
          const isCorrect = i === correctIdx;
          const isWrong   = wrongPicks.has(i);
          let cls = 'ans-card';
          if (locked && isCorrect) cls += ' correct';
          else if (isWrong) cls += ' wrong';
          else if (locked) cls += ' dim';
          if (i === lastWrongIdx) cls += ' shake';
          const isText = questionSlot === 'reagent';
          return (
            <button key={i}
              className={cls}
              disabled={locked || isWrong}
              onClick={() => onPick(i)}
            >
              <span className="ans-letter">{String.fromCharCode(65 + i)}</span>
              {isText ? (
                <div className="ans-reagent-label">
                  {choice.split('\n').map((line, j) => (
                    <div key={j} className={j === 0 ? 'ans-reagent-main' : 'ans-reagent-cond'}>{line}</div>
                  ))}
                </div>
              ) : (
                <MoleculeSVG id={choice} scale={1.3} />
              )}
              {!isText && <div className="ans-name">{MOLECULES[choice]?.name || choice}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Walkthrough panel ──────────────────────────────────────
function WalkthroughPanel({ rxn, steps, idx, onStep, onClose }) {
  const step = steps[idx] || {};
  return (
    <div className="walkthrough">
      <div className="walkthrough-hdr">
        <div className="walkthrough-hdr-left">
          <span className="walkthrough-eyebrow">Walkthrough</span>
          <span className="walkthrough-rxn">{rxn.mechanism}: {MOLECULES[rxn.substrate]?.name} → {MOLECULES[rxn.product]?.name}</span>
        </div>
        <button className="walkthrough-close" onClick={onClose} aria-label="Close walkthrough">✕</button>
      </div>

      <div className="walkthrough-step-row">
        <span className="walkthrough-step-num">Step {idx + 1} / {steps.length}</span>
        <div className="walkthrough-step-title">{step.title}</div>
      </div>

      <div className="walkthrough-cards">
        <div className="walkthrough-card specific">
          <div className="walkthrough-card-label">In this reaction</div>
          <div className="walkthrough-card-text">{step.specific}</div>
        </div>
        <div className="walkthrough-card general">
          <div className="walkthrough-card-label">In this mechanism, in general</div>
          <div className="walkthrough-card-text">{step.general}</div>
        </div>
      </div>

      <div className="walkthrough-nav">
        <button className="btn" disabled={idx === 0} onClick={() => onStep(idx - 1)}>← Back</button>
        <div className="walkthrough-dots">
          {steps.map((_, i) => (
            <button key={i}
              className={`walkthrough-dot${i === idx ? ' on' : ''}${i < idx ? ' done' : ''}`}
              onClick={() => onStep(i)} aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>
        {idx < steps.length - 1 ? (
          <button className="btn btn-flip" onClick={() => onStep(idx + 1)}>Next →</button>
        ) : (
          <button className="btn btn-flip" onClick={onClose}>Finish ✓</button>
        )}
      </div>
    </div>
  );
}

// ── Reaction Building (the game) ───────────────────────────
function ReactionBuildingMode({
  electrons, setElectrons,
  streak, setStreak,
  xp, setXp,
  solvedIds, setSolvedIds,
  flashE, setFlashE,
  level,
}) {
  const [selGroups, setSelGroups] = useState(() => GROUPS.map(g => g.id));
  const [selMechs,  setSelMechs]  = useState(() => MECHANISMS.map(m => m.id));

  // Chapters derived from REACTIONS data
  const allChapters = useMemo(() => {
    const set = new Set(REACTIONS.map(r => getChapter(r)).filter(n => n > 0));
    return [...set].sort((a, b) => a - b);
  }, []);
  const [selChapters, setSelChapters] = useState(() => {
    const set = new Set(REACTIONS.map(r => getChapter(r)).filter(n => n > 0));
    return [...set].sort((a, b) => a - b);
  });

  const [rxnIdx, setRxnIdx] = useState(0);
  const [bought, setBought] = useState(() => new Set());
  const [wrongPicks, setWrongPicks] = useState(() => new Set());
  const [lastWrongIdx, setLastWrongIdx] = useState(null);
  const [locked, setLocked] = useState(false);
  const [walkthroughIdx, setWalkthroughIdx] = useState(null);
  const [lastReward, setLastReward] = useState(null);

  // Tracks how many times each reaction has been correctly answered →
  // rotates which slot is the unknown (product → reagent → substrate → …)
  const [seenCounts, setSeenCounts] = useState(() => ({}));

  const deck = useMemo(() => filterReactions(selGroups, selMechs, selChapters), [selGroups, selMechs, selChapters]);

  useEffect(() => {
    if (deck.length === 0) setRxnIdx(0);
    else if (rxnIdx >= deck.length) setRxnIdx(0);
  }, [deck.length]);

  const rxn = deck[rxnIdx] || null;

  // Which slot is missing this round?
  const questionSlot = useMemo(() => {
    const n = seenCounts[rxn?.id] || 0;
    return ['product', 'reagent', 'substrate'][n % 3];
  }, [rxn?.id, seenCounts]);

  // Reagent choices (text strings) when reagent is the unknown
  const reagentChoices = useMemo(() => {
    if (!rxn || questionSlot !== 'reagent') return [];
    const correctLabel = rxn.reagent + (rxn.conditions ? '\n' + rxn.conditions : '');
    const pool = deck.filter(r => r.id !== rxn.id)
      .map(r => r.reagent + (r.conditions ? '\n' + r.conditions : ''));
    const unique = [...new Set(pool)].filter(s => s !== correctLabel);
    const distractors = shuffleWithSeed(unique, rxn.id + 'r').slice(0, 3);
    return shuffleWithSeed([correctLabel, ...distractors], rxn.id + 'rs');
  }, [rxn?.id, questionSlot, deck]);

  // Substrate choices (mol ids) when substrate is the unknown
  const substrateChoices = useMemo(() => {
    if (!rxn || questionSlot !== 'substrate') return [];
    const pool = deck.filter(r => r.id !== rxn.id && r.substrate !== rxn.substrate)
      .map(r => r.substrate);
    const unique = [...new Set(pool)];
    const distractors = shuffleWithSeed(unique, rxn.id + 'sub').slice(0, 3);
    return shuffleWithSeed([rxn.substrate, ...distractors], rxn.id + 'subs');
  }, [rxn?.id, questionSlot, deck]);

  const choices = useMemo(() => {
    if (!rxn) return [];
    if (questionSlot === 'reagent')   return reagentChoices;
    if (questionSlot === 'substrate') return substrateChoices;
    return shuffleAnswers(rxn);
  }, [rxn?.id, questionSlot, reagentChoices, substrateChoices]);

  const correctIdx = useMemo(() => {
    if (!rxn || choices.length === 0) return -1;
    if (questionSlot === 'reagent') {
      const correctLabel = rxn.reagent + (rxn.conditions ? '\n' + rxn.conditions : '');
      return choices.indexOf(correctLabel);
    }
    if (questionSlot === 'substrate') return choices.indexOf(rxn.substrate);
    return choices.indexOf(rxn.product);
  }, [rxn?.id, questionSlot, choices]);

  useEffect(() => {
    setBought(new Set()); setWrongPicks(new Set());
    setLastWrongIdx(null); setLocked(false);
    setLastReward(null); setWalkthroughIdx(null);
  }, [rxn?.id]);

  function toggleGroup(id) { setSelGroups(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]); }
  function toggleMech(id)  { setSelMechs(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]); }
  function toggleChapter(ch) { setSelChapters(c => c.includes(ch) ? c.filter(x => x !== ch) : [...c, ch]); }

  function buyHint(tier) {
    if (locked || bought.has(tier)) return;
    const cost = HINT_COSTS[tier];
    if (electrons < cost) return;
    setElectrons(e => e - cost);
    setBought(b => new Set([...b, tier]));
    setFlashE('spend'); setTimeout(() => setFlashE(false), 600);
  }

  function pickAnswer(i) {
    if (locked || wrongPicks.has(i)) return;
    const isCorrect = i === correctIdx;
    if (isCorrect) {
      let base;
      if (wrongPicks.size > 0) base = REWARDS.afterWrong;
      else if (bought.size > 0) base = REWARDS.withHints;
      else base = REWARDS.noHint;
      const newStreak = streak + 1;
      const streakBonus = Math.floor(newStreak / REWARDS.streakBonusEvery) - Math.floor(streak / REWARDS.streakBonusEvery);
      const total = base + streakBonus;
      const earnedXP = base + (wrongPicks.size === 0 ? 2 : 0);
      const prevLvl = level;
      const nextXP = xp + earnedXP;
      const leveled = levelFromXP(nextXP) > prevLvl;
      setElectrons(e => e + total); setXp(nextXP); setStreak(newStreak);
      setSolvedIds(s => new Set([...s, rxn.id]));
      setFlashE('gain'); setTimeout(() => setFlashE(false), 700);
      setLastReward({ electrons: total, streakBonus, leveled });
      setLocked(true);
    } else {
      setStreak(0);
      setElectrons(e => Math.max(0, e - REWARDS.wrongPenalty));
      setWrongPicks(s => new Set([...s, i]));
      setLastWrongIdx(i);
      setFlashE('spend'); setTimeout(() => setFlashE(false), 600);
    }
  }

  function nextReaction() {
    if (deck.length === 0) return;
    // Increment seen count so the question type rotates on next visit
    if (locked && rxn) setSeenCounts(c => ({ ...c, [rxn.id]: (c[rxn.id] || 0) + 1 }));
    setRxnIdx(i => (i + 1) % deck.length);
  }
  function prevReaction() {
    if (deck.length === 0) return;
    setRxnIdx(i => (i - 1 + deck.length) % deck.length);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key >= '1' && e.key <= '4' && rxn && !locked) {
        pickAnswer(parseInt(e.key, 10) - 1);
      } else if (e.key === 'ArrowRight' && locked) {
        nextReaction();
      } else if (e.key === 'h' && rxn && !locked) {
        const order = ['class', 'site', 'arrow'];
        const next = order.find(t => !bought.has(t) && electrons >= HINT_COSTS[t]);
        if (next) buyHint(next);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rxn, locked, bought, electrons, streak, xp, choices, correctIdx, wrongPicks]);

  const siteHintBondKey = bought.has('site') ? rxn?.hints?.site?.bondKey : null;
  const walkthroughStep = walkthroughIdx !== null ? rxn?.walkthrough?.[walkthroughIdx] : null;
  const highlightBondKey = walkthroughStep?.highlightBondKey || siteHintBondKey;

  // Wrong panel content varies by question type
  const wrongPanelName = questionSlot === 'reagent'
    ? (lastWrongIdx !== null ? choices[lastWrongIdx]?.split('\n')[0] : '')
    : (MOLECULES[choices[lastWrongIdx]]?.name || choices[lastWrongIdx]);
  const wrongPanelReason = questionSlot === 'reagent'
    ? 'Those conditions lead to a different outcome — check the substrate functional group and the revealed product, then think about which mechanism connects them.'
    : (rxn?.distractorWhy?.[choices[lastWrongIdx]] || 'Not the major product here — the conditions favor a different pathway.');

  return (
    <div className="building-layout">
      <GameSidebar
        groups={GROUPS} mechs={MECHANISMS} chapters={allChapters}
        selGroups={selGroups} selMechs={selMechs} selChapters={selChapters}
        onToggleGroup={toggleGroup} onToggleMech={toggleMech} onToggleChapter={toggleChapter}
        onAllGroups={() => setSelGroups(GROUPS.map(g => g.id))}
        onClearGroups={() => setSelGroups([])}
        onAllMechs={() => setSelMechs(MECHANISMS.map(m => m.id))}
        onClearMechs={() => setSelMechs([])}
        onAllChapters={() => setSelChapters([...allChapters])}
        onClearChapters={() => setSelChapters([])}
        level={level} xp={xp}
        deckSize={deck.length} solved={solvedIds.size}
      />

      <LegendPanel />

      <div className="content">
        <DeviceNotice>
          {'\u{1F4BE}'} Progress lives in this browser session — not synced. Press <kbd>1</kbd>–<kbd>4</kbd> to pick, <kbd>H</kbd> to buy a hint.
        </DeviceNotice>

        {!rxn && (
          <div className="empty-state">
            <div className="empty-state-icon">{'\u{1F9EA}'}</div>
            <div className="empty-state-text">
              No reactions match your filters. Toggle groups, mechanisms, or chapters to load puzzles.
            </div>
          </div>
        )}

        {rxn && (
          <div className="rxn-wrap">
            <div className="rxn-meta">
              <div className="rxn-meta-left">
                <span>Puzzle {rxnIdx + 1} of {deck.length}</span>
                <span className={`mech-pill${bought.has('class') ? '' : ' hidden'}`}>
                  {bought.has('class') ? rxn.mechanism : '???'}
                </span>
                <div className="diff-dots" title={`Difficulty: ${rxn.difficulty}/3`}>
                  {[1,2,3].map(n => (
                    <span key={n} className={`diff-dot${n <= rxn.difficulty ? ' on' : ''}`}></span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="skip-btn" onClick={prevReaction}>← Prev</button>
                <button className="skip-btn" onClick={nextReaction}>Skip →</button>
              </div>
            </div>

            <HintShop
              electrons={electrons}
              bought={bought}
              onBuy={buyHint}
              hints={rxn.hints}
              locked={locked}
              flashE={flashE}
            />

            <ReactionBoard
              rxn={rxn}
              highlightBondKey={highlightBondKey}
              choices={choices}
              wrongPicks={wrongPicks}
              lastWrongIdx={lastWrongIdx}
              correctIdx={correctIdx}
              locked={locked}
              onPick={pickAnswer}
              questionSlot={questionSlot}
            />

            {locked && (
              <MechanismStepsPanel
                rxn={rxn}
                onWalkthrough={rxn.walkthrough?.length ? () => setWalkthroughIdx(0) : null}
              />
            )}

            {!locked && lastWrongIdx !== null && (
              <WrongPanel
                pickedName={wrongPanelName}
                reason={wrongPanelReason}
              />
            )}

            {locked && lastReward && (
              <div className="reward-strip">
                <span className="reward-pop">+{lastReward.electrons} e⁻</span>
                {lastReward.streakBonus > 0 && (
                  <span className="reward-pop streak">streak +{lastReward.streakBonus}</span>
                )}
                {lastReward.leveled && (
                  <span className="reward-pop level">level up!</span>
                )}
                <button className="btn btn-flip" onClick={nextReaction} style={{ marginLeft: 'auto' }}>
                  Next reaction →
                </button>
              </div>
            )}

            {walkthroughIdx !== null && rxn.walkthrough?.length > 0 && (
              <WalkthroughPanel
                rxn={rxn} steps={rxn.walkthrough}
                idx={walkthroughIdx}
                onStep={i => setWalkthroughIdx(Math.max(0, Math.min(rxn.walkthrough.length - 1, i)))}
                onClose={() => setWalkthroughIdx(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────
function App() {
  const [electrons, setElectrons] = useState(STARTING_ELECTRONS);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [solvedIds, setSolvedIds] = useState(() => new Set());
  const [flashE, setFlashE] = useState(false);
  const [levelToast, setLevelToast] = useState(null);

  const [mode, setMode] = useState('building'); // 'building' | 'tree'
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial());

  const level = levelFromXP(xp);
  const prevLevelRef = useRef(level);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelToast(`Level ${level} — you levelled up!`);
      const t = setTimeout(() => setLevelToast(null), 2000);
      prevLevelRef.current = level;
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level]);

  function resetProgress() {
    setElectrons(STARTING_ELECTRONS);
    setStreak(0); setXp(0); setSolvedIds(new Set());
  }

  function rewardForTree(delta) {
    setElectrons(e => Math.max(0, e + delta));
    if (delta > 0) {
      setXp(x => x + delta);
      setStreak(s => s + 1);
      setFlashE('gain'); setTimeout(() => setFlashE(false), 700);
    } else {
      setStreak(0);
      setFlashE('spend'); setTimeout(() => setFlashE(false), 600);
    }
  }

  return (
    <>
      <TopBar icon={'\u{1F9EA}'} title="OChem Reaction Game" backTo="../">
        <button className="tut-topbar-btn" onClick={() => setShowTutorial(true)}>💡 Tutorial</button>
        <div className="mode-toggle">
          <button
            className={`mode-btn${mode === 'building' ? ' active' : ''}`}
            onClick={() => setMode('building')}
          >Reaction Building</button>
          <button
            className={`mode-btn${mode === 'tree' ? ' active' : ''}`}
            onClick={() => setMode('tree')}
          >Reaction Tree</button>
        </div>
        <CurrencyChips streak={streak} level={level} />
        <Wallet electrons={electrons} flash={flashE === 'gain'} spent={flashE === 'spend'} />
        <ResetButton onClick={resetProgress} label={'↺ Reset run'} />
      </TopBar>

      <div className="main">
        {mode === 'building' && (
          <ReactionBuildingMode
            electrons={electrons} setElectrons={setElectrons}
            streak={streak} setStreak={setStreak}
            xp={xp} setXp={setXp}
            solvedIds={solvedIds} setSolvedIds={setSolvedIds}
            flashE={flashE} setFlashE={setFlashE}
            level={level}
          />
        )}
        {mode === 'tree' && (
          <>
            <TreeSidebar />
            <LegendPanel />
            <div className="content tree-content">
              <ReactionTreeMode
                electrons={electrons}
                onReward={rewardForTree}
              />
            </div>
          </>
        )}
      </div>

      {levelToast && (
        <div className="level-toast">
          <span>{'✨'}</span><span>{levelToast}</span>
        </div>
      )}

      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
