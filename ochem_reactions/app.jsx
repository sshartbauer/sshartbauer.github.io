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
function filterReactions(selGroups, selMechs) {
  return REACTIONS.filter(r =>
    reactionMatchesMechs(r, selMechs) &&
    r.groups.some(g => selGroups.includes(g))
  );
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

// ── Top-bar wallet + chips ────────────────────────────────
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
  groups, mechs,
  selGroups, selMechs,
  onToggleGroup, onToggleMech,
  onAllGroups, onClearGroups,
  onAllMechs, onClearMechs,
  level, xp, deckSize, solved,
  onShowTutorial,
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

        <button className="sidebar-tut-btn" onClick={onShowTutorial}>
          📖 Show tutorial again
        </button>
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

// ── Tree-mode sidebar (a slim variant) ────────────────────
function TreeSidebar({ onShowTutorial }) {
  const trees = window.TREES || {};
  return (
    <div className="sidebar tree-sidebar">
      <div className="sidebar-hdr"><span>Reaction Tree</span></div>
      <div className="sidebar-body">
        <div className="tree-side-blurb">
          Pick a substrate from the dropdown above the tree. Each branch is a reagent / set of conditions. Click the leaf to choose the product.
        </div>
        <div className="tree-side-list">
          {Object.values(trees).map(t => (
            <div key={t.id} className="tree-side-row">
              <span className="tree-side-name">{t.label}</span>
              <span className="tree-side-cnt">{t.branches.length}</span>
            </div>
          ))}
        </div>
        <button className="sidebar-tut-btn" onClick={onShowTutorial}>
          📖 Show tutorial again
        </button>
      </div>
    </div>
  );
}

// ── Hint shop (now with prominent wallet) ─────────────────
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

// ── Wrong-answer panel ────────────────────────────────────
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

// ── Correct-answer mechanism panel (numbered steps) ───────
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

// ── Reactant frame (substrate + arrow in their own box) ───
function ReactantFrame({ rxn, highlightBondKey }) {
  const subGroup = window.groupForMolecule
    ? window.groupForMolecule(rxn.substrate)
    : 'default';
  const groupPat = (window.GROUP_PATTERNS || {})[subGroup] || (window.GROUP_PATTERNS || {}).default || { color: '#6fa0af', css: 'none' };
  // The frame's background is the substrate's group pattern,
  // tinted a little brighter so it reads as "the reactants area".
  const frameStyle = {
    backgroundColor: `${groupPat.color}10`,
    backgroundImage: groupPat.css,
    borderColor: `${groupPat.color}66`,
  };
  return (
    <div className="reactant-frame" style={frameStyle}>
      <div className="reactant-frame-label">
        <span className="reactant-frame-dot" style={{ background: groupPat.color }}></span>
        {window.GROUP_PATTERNS?.[subGroup]?.legendLabel || 'Substrate'}
      </div>
      <div className="reactant-frame-body">
        <div className="rxn-slot">
          <div className="rxn-slot-label">Substrate</div>
          <MoleculeSVG id={rxn.substrate} highlightBondKey={highlightBondKey} scale={1.7} />
          <div className="rxn-slot-name">{MOLECULES[rxn.substrate]?.name}</div>
        </div>
        <ReactionArrow reagent={rxn.reagent} conditions={rxn.conditions} />
      </div>
    </div>
  );
}

// ── Reaction puzzle board ─────────────────────────────────
function ReactionBoard({ rxn, highlightBondKey, choices, wrongPicks, correctIdx, locked, lastWrongIdx, onPick }) {
  return (
    <div className="rxn-board">
      <div className="rxn-prompt">Predict the major product</div>

      <div className="rxn-equation">
        <ReactantFrame rxn={rxn} highlightBondKey={highlightBondKey} />

        <div className="rxn-slot rxn-product-slot">
          <div className="rxn-slot-label">Product</div>
          {locked ? (
            <>
              <MoleculeSVG id={rxn.product} scale={1.7} />
              <div className="rxn-slot-name" style={{ color: 'var(--known)' }}>
                {MOLECULES[rxn.product]?.name}
              </div>
            </>
          ) : (
            <>
              <div className="rxn-q-card">?</div>
              <div className="rxn-slot-name">choose below</div>
            </>
          )}
        </div>
      </div>

      <div className="answer-grid">
        {choices.map((molId, i) => {
          const isCorrect = i === correctIdx;
          const isWrong   = wrongPicks.has(i);
          let cls = 'ans-card';
          if (locked && isCorrect) cls += ' correct';
          else if (isWrong) cls += ' wrong';
          else if (locked) cls += ' dim';
          if (i === lastWrongIdx) cls += ' shake';
          return (
            <button key={i}
              className={cls}
              disabled={locked || isWrong}
              onClick={() => onPick(i)}
            >
              <span className="ans-letter">{String.fromCharCode(65 + i)}</span>
              <MoleculeSVG id={molId} scale={1.3} />
              <div className="ans-name">{MOLECULES[molId]?.name || molId}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Walkthrough panel (existing) ──────────────────────────
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

// ── Reaction Building (the existing game) ─────────────────
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

  const [rxnIdx, setRxnIdx] = useState(0);
  const [bought, setBought] = useState(() => new Set());
  const [wrongPicks, setWrongPicks] = useState(() => new Set());
  const [lastWrongIdx, setLastWrongIdx] = useState(null);
  const [locked, setLocked] = useState(false);
  const [walkthroughIdx, setWalkthroughIdx] = useState(null);
  const [lastReward, setLastReward] = useState(null);

  const deck = useMemo(() => filterReactions(selGroups, selMechs), [selGroups, selMechs]);

  useEffect(() => {
    if (deck.length === 0) setRxnIdx(0);
    else if (rxnIdx >= deck.length) setRxnIdx(0);
  }, [deck.length]);

  const rxn = deck[rxnIdx] || null;
  const choices = useMemo(() => rxn ? shuffleAnswers(rxn) : [], [rxn?.id]);
  const correctIdx = useMemo(() => rxn ? choices.indexOf(rxn.product) : -1, [rxn?.id, choices]);

  useEffect(() => {
    setBought(new Set()); setWrongPicks(new Set());
    setLastWrongIdx(null); setLocked(false);
    setLastReward(null); setWalkthroughIdx(null);
  }, [rxn?.id]);

  function toggleGroup(id) { setSelGroups(g => g.includes(id) ? g.filter(x => x !== id) : [...g, id]); }
  function toggleMech(id)  { setSelMechs(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]); }
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

  return (
    <div className="building-layout">
      <GameSidebar
        groups={GROUPS} mechs={MECHANISMS}
        selGroups={selGroups} selMechs={selMechs}
        onToggleGroup={toggleGroup} onToggleMech={toggleMech}
        onAllGroups={() => setSelGroups(GROUPS.map(g => g.id))}
        onClearGroups={() => setSelGroups([])}
        onAllMechs={() => setSelMechs(MECHANISMS.map(m => m.id))}
        onClearMechs={() => setSelMechs([])}
        level={level} xp={xp}
        deckSize={deck.length} solved={solvedIds.size}
        onShowTutorial={() => window.__openTutorial?.()}
      />

      <div className="content">
        <DeviceNotice>
          {'\u{1F4BE}'} Progress lives in this browser session — not synced. Press <kbd>1</kbd>–<kbd>4</kbd> to pick, <kbd>H</kbd> to buy a hint.
        </DeviceNotice>

        {!rxn && (
          <div className="empty-state">
            <div className="empty-state-icon">{'\u{1F9EA}'}</div>
            <div className="empty-state-text">
              No reactions match your filters. Toggle a few more groups or
              mechanisms on the left to load some puzzles.
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

            {/* Hint shop is now ABOVE the reaction board */}
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
            />

            {/* Green mechanism-steps panel below reaction box on correct */}
            {locked && (
              <MechanismStepsPanel
                rxn={rxn}
                onWalkthrough={rxn.walkthrough?.length ? () => setWalkthroughIdx(0) : null}
              />
            )}

            {/* Wrong-answer "why not?" panel */}
            {!locked && lastWrongIdx !== null && (
              <WrongPanel
                pickedName={MOLECULES[choices[lastWrongIdx]]?.name || choices[lastWrongIdx]}
                reason={rxn.distractorWhy?.[choices[lastWrongIdx]] || 'Not the major product here — the conditions favor a different pathway.'}
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

// ── Root App ──────────────────────────────────────────────
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
      setLevelToast(`Level ${level} \u2014 you levelled up!`);
      const t = setTimeout(() => setLevelToast(null), 2000);
      prevLevelRef.current = level;
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level]);

  // Expose the tutorial trigger on window for the sidebar buttons to call.
  useEffect(() => {
    window.__openTutorial = () => setShowTutorial(true);
    return () => { delete window.__openTutorial; };
  }, []);

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
        <ResetButton onClick={resetProgress} label={'\u21BA Reset run'} />
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
            <TreeSidebar onShowTutorial={() => setShowTutorial(true)} />
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
          <span>{'\u2728'}</span><span>{levelToast}</span>
        </div>
      )}

      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
