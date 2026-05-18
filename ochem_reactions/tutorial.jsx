/* Tutorial overlay — one-time on first visit; "Show tutorial again"
   button in the sidebar reopens it. Stores seen flag in localStorage.
   Multi-page slideshow with skip button.
*/

const TUTORIAL_KEY = 'ochem-tutorial-seen-v1';

function hasSeenTutorial() {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; }
  catch (_) { return false; }
}
function markTutorialSeen() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch (_) {}
}

/* Renders a small SVG legend swatch with the given pattern + color. */
function PatternSwatch({ pattern, label }) {
  return (
    <div className="tut-swatch">
      <div className="tut-swatch-tile" style={{
        backgroundColor: `${pattern.color}10`,
        backgroundImage: pattern.css,
        borderColor: `${pattern.color}55`,
      }} />
      <div className="tut-swatch-label">{label}</div>
    </div>
  );
}

/* Build a representative swatch for each major substrate class. */
function buildLegendSwatches() {
  const groups = window.GROUP_PATTERNS || {};
  const order = ['alkene', 'alkyne', 'alcohol', 'halide', 'aromatic', 'carbonyl', 'acid', 'amine'];
  return order.map(id => groups[id] ? { id, ...groups[id] } : null).filter(Boolean);
}

const TUTORIAL_PAGES = [
  {
    title: 'Welcome to the OChem Reaction Game',
    body: (
      <>
        <p>You’ve got two modes: <b>Reaction Building</b> (a flashcard-style puzzle game) and <b>Reaction Tree</b> (pick a substrate, work through every reaction it can do).</p>
        <p>This tutorial covers everything you need to know. It only shows once — but there’s a <em>Show tutorial again</em> button in the sidebar if you want it back.</p>
      </>
    ),
    icon: '🧪',
  },
  {
    title: 'The reaction puzzle',
    body: (
      <>
        <p>In <b>Reaction Building</b>, you’re given a substrate, a reagent, and conditions. Your job: pick the major product from four choices.</p>
        <ul className="tut-list">
          <li>Click an answer card to lock it in.</li>
          <li>Or press <kbd>1</kbd>–<kbd>4</kbd> to pick with the keyboard.</li>
          <li>Wrong answers stay highlighted in red — you can keep trying.</li>
          <li>Correct answers reveal a <b>step-by-step mechanism</b> explanation below.</li>
        </ul>
      </>
    ),
    icon: '🎯',
  },
  {
    title: 'Reading the substrate background',
    body: (
      <>
        <p>Every molecule sits on a background that tells you what <b>functional class</b> it is. Memorize these and you’ll read reactions faster.</p>
        <div className="tut-legend">
          {buildLegendSwatches().map(s => (
            <PatternSwatch key={s.id} pattern={s} label={s.legendLabel} />
          ))}
        </div>
        <p className="tut-note">Different colors within the same pattern just distinguish individual molecules in the same class.</p>
      </>
    ),
    icon: '🎨',
  },
  {
    title: 'Electrons (e⁻) — the in-game currency',
    body: (
      <>
        <p>You start with <b>15 e⁻</b>. Spend them on hints; earn them by answering correctly.</p>
        <ul className="tut-list">
          <li><b>+6 e⁻</b> for a clean solve (no hints, no wrong picks)</li>
          <li><b>+3 e⁻</b> if you bought any hint</li>
          <li><b>+1 e⁻</b> after a wrong pick</li>
          <li><b>+1 e⁻</b> streak bonus every 3 in a row</li>
          <li><b>–1 e⁻</b> for each wrong pick (streak resets)</li>
        </ul>
        <p>Your balance lives in the top-right of the window — keep an eye on it.</p>
      </>
    ),
    icon: '⚡',
  },
  {
    title: 'The hint shop',
    body: (
      <>
        <p>Three tiers of hint, each more revealing than the last:</p>
        <ul className="tut-list">
          <li><b>Reaction class (2 e⁻)</b> — names the mechanism family.</li>
          <li><b>Reactive site (5 e⁻)</b> — highlights the bond or atom where the action happens.</li>
          <li><b>First step (10 e⁻)</b> — the opening curved arrow, in words. Almost a giveaway.</li>
        </ul>
        <p>Hint shop sits <em>above</em> the reaction box so you can scan it before committing.</p>
      </>
    ),
    icon: '💡',
  },
  {
    title: 'Feedback you can learn from',
    body: (
      <>
        <p>Every answer gives you something to study:</p>
        <ul className="tut-list">
          <li><b>Wrong pick</b> — a red box explains <em>why that product doesn’t fit</em>. Often more useful than the right answer.</li>
          <li><b>Right pick</b> — a green box steps through the <em>mechanism</em> in numbered steps.</li>
          <li>The <b>Walk through this reaction</b> button gives you a 4–5-step deep dive.</li>
        </ul>
      </>
    ),
    icon: '✓',
  },
  {
    title: 'Reaction Tree mode',
    body: (
      <>
        <p>Pick a substrate class from a dropdown (alkene, alcohol, aldehyde…). The substrate goes at the top of a tree; each <b>branch</b> is a reagent.</p>
        <p>Branches reveal <b>one at a time</b>. Pick the right product from multiple choice to grow the next branch. Work through every reaction the substrate can do.</p>
        <p>Great for sweep-style review before an exam.</p>
      </>
    ),
    icon: '🌳',
  },
  {
    title: 'Study tips',
    body: (
      <ul className="tut-list tut-list-tips">
        <li><b>Use hint 1 (reaction class) liberally.</b> Knowing it’s an EAS or an aldol cuts the answer space in half before you even look at the products.</li>
        <li><b>Spot the leaving group first.</b> In substitution / elimination problems, the carbon attached to the LG is where everything happens.</li>
        <li><b>Markovnikov = the more stable cation wins.</b> When in doubt about an addition, draw both possible cations and pick the better one.</li>
        <li><b>For acyl substitution, rank reactivity: acid Cl &gt; anhydride &gt; ester &gt; amide.</b> Going down the list is easy; up is hard.</li>
        <li><b>Read the conditions, not just the reagent.</b> NaOH + heat is elimination; NaOH at 0 °C is substitution.</li>
        <li><b>If you don’t recognize a reagent, look it up before guessing.</b> The walkthroughs are your friend.</li>
      </ul>
    ),
    icon: '📚',
  },
];

function Tutorial({ onClose }) {
  const { useState } = React;
  const [page, setPage] = useState(0);
  const p = TUTORIAL_PAGES[page];
  const last = page === TUTORIAL_PAGES.length - 1;

  function close() {
    markTutorialSeen();
    onClose();
  }

  return (
    <div className="tut-backdrop" onClick={close}>
      <div className="tut-modal" onClick={e => e.stopPropagation()}>
        <div className="tut-hdr">
          <div className="tut-hdr-left">
            <span className="tut-icon">{p.icon}</span>
            <span className="tut-eyebrow">Tutorial · {page + 1}/{TUTORIAL_PAGES.length}</span>
          </div>
          <button className="tut-skip" onClick={close} title="Skip tutorial">Skip ✕</button>
        </div>

        <div className="tut-body">
          <h2 className="tut-title">{p.title}</h2>
          <div className="tut-content">{p.body}</div>
        </div>

        <div className="tut-nav">
          <button
            className="btn"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >← Back</button>

          <div className="tut-dots">
            {TUTORIAL_PAGES.map((_, i) => (
              <button
                key={i}
                className={`tut-dot${i === page ? ' on' : ''}${i < page ? ' done' : ''}`}
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>

          {last
            ? <button className="btn btn-flip" onClick={close}>Start playing →</button>
            : <button className="btn btn-flip" onClick={() => setPage(page + 1)}>Next →</button>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Tutorial, hasSeenTutorial, markTutorialSeen });
