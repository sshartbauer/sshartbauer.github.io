/* Study App UI Kit — components.
   Recreates the dense dark shell shared by Hospital Spanish + OChem.
   Exports: TopBar, BackButton, ModeToggle, ResetButton, Sidebar,
   SectionPill, TypeFilter, ProgressPanel, FlashcardScene,
   ControlBar, QuizButtons, KbdHint. */

const { useState, useEffect } = React;

/* ── TopBar ────────────────────────────────────────────────── */
function TopBar({ icon = '🏥', title, backTo, backLabel = '← Home', children }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        {backTo && <a className="nav-back-btn" href={backTo}>{backLabel}</a>}
        <h1>{icon} {title}</h1>
      </div>
      <div className="topbar-right">{children}</div>
    </div>
  );
}

/* ── ModeToggle (Browse / Quiz) ────────────────────────────── */
function ModeToggle({ mode = 'browse', onChange, modes = [{id:'browse',label:'Browse'},{id:'quiz',label:'Quiz'}] }) {
  return (
    <div className="mode-toggle">
      {modes.map(m => (
        <button
          key={m.id}
          className={`mode-btn${mode === m.id ? ' active' : ''}`}
          onClick={() => onChange?.(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function ResetButton({ onClick, label = '↺ Reset progress' }) {
  return <button className="reset-btn" onClick={onClick}>{label}</button>;
}

/* ── Sidebar shell ─────────────────────────────────────────── */
function Sidebar({ headerLabel = 'Sections', onSelectAll, onClearAll, children }) {
  return (
    <div className="sidebar">
      <div className="sidebar-hdr">
        <span>{headerLabel}</span>
        <div className="sidebar-acts">
          <button className="btn-xs" onClick={onSelectAll}>All</button>
          <button className="btn-xs" onClick={onClearAll}>Clear</button>
        </div>
      </div>
      <div className="sidebar-body">{children}</div>
    </div>
  );
}

/* ── Section pill (colored deck button) ────────────────────── */
function SectionPill({ color, label, count, on, onClick }) {
  return (
    <button
      className={`sec-btn${on ? ' on' : ''}`}
      style={{ '--c': color }}
      onClick={onClick}
    >
      <span className="sec-btn-left">
        <span className="dot"></span>
        {label}
      </span>
      <span className="sec-count">{count}</span>
    </button>
  );
}

function SectionList({ sections, selected, onToggle }) {
  return (
    <div className="sec-col">
      {sections.map(s => (
        <SectionPill
          key={s.id}
          color={s.color}
          label={s.label}
          count={s.count}
          on={selected.includes(s.id)}
          onClick={() => onToggle(s.id)}
        />
      ))}
    </div>
  );
}

/* ── Type filter (Words / Phrases / Both) ──────────────────── */
function TypeFilter({ label = 'Card Type', value = 'both', onChange, options = [
  { id: 'word', label: 'Words' },
  { id: 'phrase', label: 'Phrases' },
  { id: 'both', label: 'Both' },
]}) {
  return (
    <div className="type-filter">
      <div className="type-filter-label">{label}</div>
      <div className="type-toggle">
        {options.map(o => (
          <button
            key={o.id}
            className={`type-btn${value === o.id ? ' active' : ''}`}
            onClick={() => onChange?.(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Progress panel ────────────────────────────────────────── */
function ProgressPanel({ title = 'Quiz Progress', known = 0, unknown = 0, total = 0 }) {
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <div className="prog-panel">
      <div className="prog-panel-title">{title}</div>
      <div className="prog-stats">
        <div className="prog-stat known">
          <div className="prog-stat-val">{known}</div>
          <div className="prog-stat-lbl">Known</div>
        </div>
        <div className="prog-stat unknown">
          <div className="prog-stat-val">{unknown}</div>
          <div className="prog-stat-lbl">Review</div>
        </div>
        <div className="prog-stat total">
          <div className="prog-stat-val">{total}</div>
          <div className="prog-stat-lbl">In Deck</div>
        </div>
      </div>
      <div className="prog-bar-wrap">
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: `${pct}%` }}></div>
        </div>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

/* ── Flashcard scene ───────────────────────────────────────── */
function FlashcardScene({ flipped, onFlip, front, back }) {
  return (
    <div className="scene">
      <div className={`flip-card${flipped ? ' flipped' : ''}`} onClick={onFlip}>
        <div className="face front">{front}</div>
        <div className="face back">{back}</div>
      </div>
    </div>
  );
}

/* Pre-built front / back layouts matching the live Hospital Spanish app. */
function FlashcardFront({ type = 'phrase', section, sectionColor, english }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 6 }}>
        <span className={`type-badge ${type}`}>{type}</span>
        {section && (
          <span
            className="sec-badge"
            style={{
              background: `${sectionColor}22`,
              color: sectionColor,
              border: `1px solid ${sectionColor}66`,
            }}
          >
            {section}
          </span>
        )}
      </div>
      <div className="phrase-en">{english}</div>
      <div className="flip-hint">tap to flip ↺</div>
    </>
  );
}

function FlashcardBack({ spanish, phonetic, notes }) {
  return (
    <>
      <div className="back-l">
        <div className="es-label">Español</div>
        <div className="es-text">{spanish}</div>
      </div>
      <div className="back-r">
        <div className="dl">
          <div className="dl-label">Pronunciation</div>
          <div className="phonetic">{phonetic}</div>
        </div>
        {notes && (
          <div className="dl">
            <div className="dl-label">Notes</div>
            <div className="notes">{notes}</div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Control bar (prev / flip / next) ──────────────────────── */
function ControlBar({ onPrev, onFlip, onNext, prevDisabled, nextDisabled }) {
  return (
    <div className="ctrls">
      <button className="btn" onClick={onPrev} disabled={prevDisabled}>← Prev</button>
      <button className="btn btn-flip" onClick={onFlip}>Flip</button>
      <button className="btn" onClick={onNext} disabled={nextDisabled}>Next →</button>
    </div>
  );
}

/* ── Quiz buttons ──────────────────────────────────────────── */
function QuizButtons({ onKnown, onUnknown }) {
  return (
    <div className="quiz-btns">
      <button className="btn-unknown" onClick={onUnknown}>✗ Review again</button>
      <button className="btn-known"   onClick={onKnown}>✓ I knew it</button>
    </div>
  );
}

function KbdHint({ children }) { return <div className="kbd-hint">{children}</div>; }

/* ── Stats row ─────────────────────────────────────────────── */
function StatsRow({ label, index, total }) {
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  return (
    <div className="stats-row">
      <span style={{ flexShrink: 0 }}>{label}</span>
      <div className="nav-prog">
        <div className="nav-bar">
          <div className="nav-fill" style={{ width: `${pct}%` }}></div>
        </div>
        <span style={{ whiteSpace: 'nowrap' }}>{index + 1}/{total}</span>
      </div>
    </div>
  );
}

function DeviceNotice({ children = '💾 Progress saves to this browser only — not shared across devices' }) {
  return <div className="device-notice">{children}</div>;
}

Object.assign(window, {
  TopBar, ModeToggle, ResetButton,
  Sidebar, SectionPill, SectionList,
  TypeFilter, ProgressPanel,
  FlashcardScene, FlashcardFront, FlashcardBack,
  ControlBar, QuizButtons, KbdHint, StatsRow, DeviceNotice,
});
