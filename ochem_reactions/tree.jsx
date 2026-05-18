/* Reaction Tree mode. User picks a substrate class; the substrate becomes
   the top of a vertical trunk. Branches reach out left/right (alternating)
   at increasing depths down the trunk. Each branch ends in a "leaf" — the
   product — which the user picks by multiple choice.

   Branches reveal ONE AT A TIME:
     1. The next-locked branch becomes ACTIVE with an empty product leaf.
     2. A picker beneath the tree shows 4 options.
     3. Correct pick fills the leaf, marks branch done, unlocks the next one.
     4. Wrong pick highlights red and stays selectable.
*/

const { useState: useTreeState, useMemo: useTreeMemo, useEffect: useTreeEffect, useRef: useTreeRef } = React;

/* ── Deterministic 4-card shuffle (correct + 3 distractors) ── */
function shuffleBranchAnswers(branch) {
  const items = [branch.productName, ...branch.distractors];
  let seed = 0;
  for (const c of branch.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── Tree visualization (vertical trunk, alternating L/R branches) ── */
const ROW_HEIGHT = 72;
const TRUNK_TOP = 130;       /* y-coordinate where the trunk line starts (below substrate node) */
const BRANCH_REACH = 260;    /* how far horizontally a branch extends from trunk */
const BRANCH_SLOPE = 18;     /* vertical drop along the branch from trunk to leaf */

function TreeBranchRow({ branch, idx, total, state, onScrollIntoView }) {
  // Even idx → right side, odd idx → left side
  const side = idx % 2 === 0 ? 'right' : 'left';
  const sign = side === 'right' ? 1 : -1;
  const row = idx;
  const yTop = TRUNK_TOP + row * ROW_HEIGHT;
  const xEnd = sign * BRANCH_REACH;
  const yEnd = yTop + BRANCH_SLOPE;

  const ref = useTreeRef(null);
  useTreeEffect(() => {
    if (state === 'active' && ref.current && onScrollIntoView) onScrollIntoView(ref.current);
  }, [state]);

  return (
    <div
      ref={ref}
      className={`tree-row tree-row-${side} tree-row-state-${state}`}
      style={{ top: `${yTop}px` }}
    >
      {/* SVG branch from trunk (x=0) to leaf */}
      <svg className="tree-row-svg"
        width={BRANCH_REACH + 30} height={BRANCH_SLOPE + 40}
        viewBox={`0 0 ${BRANCH_REACH + 30} ${BRANCH_SLOPE + 40}`}
        style={{ left: side === 'right' ? '0' : `-${BRANCH_REACH + 30}px`, top: '-10px' }}
      >
        <path
          d={
            side === 'right'
              ? `M 0 10 Q 30 10 ${BRANCH_REACH * 0.35} ${BRANCH_SLOPE * 0.5 + 10} T ${BRANCH_REACH} ${BRANCH_SLOPE + 10}`
              : `M ${BRANCH_REACH + 30} 10 Q ${BRANCH_REACH} 10 ${(BRANCH_REACH + 30) - BRANCH_REACH * 0.35} ${BRANCH_SLOPE * 0.5 + 10} T 30 ${BRANCH_SLOPE + 10}`
          }
          stroke="var(--branch-color)" strokeWidth="2.5" fill="none"
          strokeLinecap="round"
          strokeDasharray={state === 'locked' ? '3 5' : 'none'}
        />
      </svg>

      {/* Reagent label */}
      <div className={`tree-row-label tree-row-label-${side}`}>
        <div className="tree-row-reagent">{branch.reagent}</div>
        {branch.conditions && <div className="tree-row-conditions">{branch.conditions}</div>}
      </div>

      {/* Leaf at branch end */}
      <div className={`tree-row-leaf-wrap tree-row-leaf-${side}`}
        style={{ top: `${BRANCH_SLOPE + 10}px` }}
      >
        {state === 'locked' && (
          <div className="tree-row-leaf locked">
            <span className="tree-row-leaf-q">·</span>
          </div>
        )}
        {state === 'active' && (
          <div className="tree-row-leaf empty">
            <span className="tree-row-leaf-q">?</span>
            <span className="tree-row-leaf-hint">pick below</span>
          </div>
        )}
        {state === 'done' && (
          <div className="tree-row-leaf done" title={branch.productLong}>
            <span className="tree-row-leaf-name">{branch.productName}</span>
            <span className="tree-row-leaf-check">✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Choice picker (below tree) ────────────────────────────── */
function BranchPicker({ branch, onCorrect, onWrong, wrongPicks }) {
  const choices = useTreeMemo(() => shuffleBranchAnswers(branch), [branch.id]);
  const [explainOpen, setExplainOpen] = useTreeState(false);

  function handle(pick) {
    if (pick === branch.productName) onCorrect();
    else onWrong(pick);
  }

  return (
    <div className="branch-picker">
      <div className="branch-picker-hdr">
        <span className="branch-picker-eyebrow">Branch:</span>
        <span className="branch-picker-reagent">{branch.reagent}</span>
        {branch.conditions && (
          <span className="branch-picker-cond">{branch.conditions}</span>
        )}
        <div className="branch-picker-spacer" />
        <button
          className="branch-picker-mech-btn"
          onClick={() => setExplainOpen(o => !o)}
        >
          {explainOpen ? 'Hide' : 'Show'} mechanism
        </button>
      </div>

      <div className="branch-picker-prompt">Pick the major product:</div>

      <div className="branch-picker-grid">
        {choices.map((name, i) => {
          const wrong = wrongPicks.has(name);
          return (
            <button
              key={i}
              className={`branch-pick-card${wrong ? ' wrong' : ''}`}
              disabled={wrong}
              onClick={() => handle(name)}
            >
              <span className="branch-pick-letter">{String.fromCharCode(65 + i)}</span>
              <span className="branch-pick-name">{name}</span>
            </button>
          );
        })}
      </div>

      {explainOpen && (
        <div className="branch-mech">
          <div className="branch-mech-label">{branch.mechanism}</div>
          <div className="branch-mech-text">{branch.explain}</div>
        </div>
      )}
    </div>
  );
}

/* ── Main tree renderer ───────────────────────────────────── */
function ReactionTreeMode({ electrons, onReward }) {
  const treeIds = Object.keys(window.TREES);
  const [selectedId, setSelectedId] = useTreeState(treeIds[0]);

  const [trees, setTrees] = useTreeState(() => {
    const init = {};
    for (const id of treeIds) init[id] = { activeIdx: 0, doneIds: new Set(), wrongCounts: {} };
    return init;
  });

  const tree = window.TREES[selectedId];
  const st = trees[selectedId];

  function handleCorrect() {
    const branch = tree.branches[st.activeIdx];
    const newDone = new Set(st.doneIds); newDone.add(branch.id);
    const next = { ...st, doneIds: newDone, activeIdx: st.activeIdx + 1 };
    setTrees(prev => ({ ...prev, [selectedId]: next }));
    onReward(2);
  }
  function handleWrong(name) {
    const branch = tree.branches[st.activeIdx];
    const prevWrong = st.wrongCounts[branch.id] || new Set();
    const updated = new Set(prevWrong); updated.add(name);
    const next = { ...st, wrongCounts: { ...st.wrongCounts, [branch.id]: updated } };
    setTrees(prev => ({ ...prev, [selectedId]: next }));
    onReward(-1);
  }
  function handleReset() {
    setTrees(prev => ({
      ...prev,
      [selectedId]: { activeIdx: 0, doneIds: new Set(), wrongCounts: {} },
    }));
  }

  const allDone = st.activeIdx >= tree.branches.length;
  const activeBranch = !allDone ? tree.branches[st.activeIdx] : null;
  const wrongPicks = activeBranch
    ? (st.wrongCounts[activeBranch.id] || new Set())
    : new Set();

  const treeHeight = TRUNK_TOP + tree.branches.length * ROW_HEIGHT + 50;
  const trunkBottom = TRUNK_TOP + tree.branches.length * ROW_HEIGHT - ROW_HEIGHT / 2;

  return (
    <div className="tree-mode">
      <div className="tree-picker-bar">
        <label className="tree-picker-label">Substrate:</label>
        <select
          className="tree-picker-select"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          {treeIds.map(id => {
            const t = window.TREES[id];
            return (
              <option key={id} value={id}>
                {t.label} ({t.subtitle}) — {t.branches.length} rxns
              </option>
            );
          })}
        </select>
        <div className="tree-picker-progress">
          {st.doneIds.size} / {tree.branches.length} learned
        </div>
        <button className="tree-picker-reset" onClick={handleReset}>
          ↺ Reset tree
        </button>
      </div>

      <div className="tree-blurb">
        <div className="tree-blurb-class">
          {tree.label} <span className="tree-blurb-sub">· {tree.subtitle}</span>
        </div>
        <div className="tree-blurb-text">{tree.blurb}</div>
      </div>

      <div className="tree-canvas" style={{ '--tree-h': `${treeHeight}px` }}>
        {/* Substrate node at top, centered */}
        <div className="tree-substrate-node">
          <div className="tree-substrate-label">{tree.label}</div>
          <div className="tree-substrate-sub">{tree.subtitle}</div>
          {tree.trunkMolecule && window.MOLECULES?.[tree.trunkMolecule] && (
            <div className="tree-substrate-mol">
              <window.MoleculeSVG id={tree.trunkMolecule} scale={1.3} framed={true} />
            </div>
          )}
        </div>

        {/* Vertical trunk line */}
        <div className="tree-trunk" style={{
          top: `${TRUNK_TOP - 8}px`,
          height: `${trunkBottom - TRUNK_TOP + 30}px`,
        }} />

        {/* All branches */}
        <div className="tree-branch-container">
          {tree.branches.map((b, i) => {
            let state;
            if (st.doneIds.has(b.id)) state = 'done';
            else if (i === st.activeIdx) state = 'active';
            else state = 'locked';
            return (
              <TreeBranchRow
                key={b.id}
                branch={b}
                idx={i} total={tree.branches.length}
                state={state}
              />
            );
          })}
        </div>
      </div>

      {activeBranch ? (
        <BranchPicker
          branch={activeBranch}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
          wrongPicks={wrongPicks}
        />
      ) : (
        <div className="tree-complete">
          <div className="tree-complete-icon">🌳</div>
          <div className="tree-complete-title">Tree complete!</div>
          <div className="tree-complete-text">
            You walked through all {tree.branches.length} reactions starting from <b>{tree.label}</b>. Pick a different substrate from the dropdown to keep going.
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ReactionTreeMode });
