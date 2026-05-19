/* Reaction Tree mode — radial "sun" layout.
   Substrate sits at the center of an SVG sun; each reaction branch
   radiates outward as a ray.  Leaves (products) ring the perimeter.

   Branches reveal ONE AT A TIME:
     1. Active branch pulses orange with a "?" leaf.
     2. Picker below the SVG shows 4 text choices.
     3. Correct pick turns the leaf green; next branch activates.
     4. Wrong pick stays red/disabled; keep trying.
*/

const { useState: useTreeState, useMemo: useTreeMemo, useEffect: useTreeEffect, useRef: useTreeRef } = React;

/* ── Deterministic 4-card shuffle ─────────────────────────── */
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

/* ── Sun geometry ─────────────────────────────────────────── */
const CX = 350, CY = 350;
const SUBSTRATE_R = 52;

function branchGeom(i, n) {
  // First branch at top (-90°), spread evenly clockwise
  const angleDeg = -90 + (i / n) * 360;
  const angleRad = angleDeg * Math.PI / 180;
  // Shorter rays when more branches to avoid crowding
  const rayLen = n <= 5 ? 235 : n <= 8 ? 218 : n <= 12 ? 200 : 185;

  const x1 = CX + (SUBSTRATE_R + 9) * Math.cos(angleRad);
  const y1 = CY + (SUBSTRATE_R + 9) * Math.sin(angleRad);
  const x2 = CX + rayLen * Math.cos(angleRad);
  const y2 = CY + rayLen * Math.sin(angleRad);

  // Reagent label sits at 52% along the ray
  const lx = CX + rayLen * 0.52 * Math.cos(angleRad);
  const ly = CY + rayLen * 0.52 * Math.sin(angleRad);

  // Rotate label to follow the ray; flip left-half labels so text is never upside-down
  const flip = angleDeg > 90 && angleDeg < 270;
  const labelRotate = flip ? angleDeg + 180 : angleDeg;

  return { x1, y1, x2, y2, lx, ly, angleDeg, angleRad, labelRotate, rayLen };
}

/* ── Single SVG branch (ray + label + leaf) ─────────────────── */
function SunBranch({ branch, i, n, state }) {
  const g = branchGeom(i, n);

  const lineColor   = state === 'done' ? '#2ecc71' : state === 'active' ? '#f08667' : '#1e3d50';
  const lineWidth   = state === 'active' ? 2.5 : 2;
  const lineDash    = state === 'locked' ? '4 7' : 'none';
  const lineOpacity = state === 'locked' ? 0.45 : 1;
  const labelColor  = state === 'done' ? '#2ecc71' : state === 'active' ? '#f08667' : '#3a6070';

  // Product name split into up to 2 lines for the done leaf
  let nameLine1 = '', nameLine2 = '';
  if (state === 'done') {
    const words = branch.productName.split(' ');
    const half = Math.ceil(words.length / 2);
    nameLine1 = words.slice(0, half).join(' ');
    nameLine2 = words.slice(half).join(' ');
  }

  const LEAF_R_ACTIVE = 26;
  const LEAF_R_DONE   = 30;

  return (
    <g className={`sun-branch sun-branch-${state}`}>

      {/* Ray line from substrate edge to leaf */}
      <line
        x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
        stroke={lineColor} strokeWidth={lineWidth}
        strokeDasharray={lineDash} strokeLinecap="round"
        opacity={lineOpacity}
      />

      {/* Reagent label along the ray (rotated to follow it) */}
      <g transform={`rotate(${g.labelRotate}, ${g.lx}, ${g.ly})`}
         opacity={state === 'locked' ? 0.5 : 1}>
        <rect
          x={-62} y={branch.conditions ? -15 : -11}
          width={124} height={branch.conditions ? 30 : 21}
          rx={4}
          fill="rgba(6,10,16,0.92)"
          stroke={labelColor} strokeWidth={1}
        />
        <text
          x={0} y={branch.conditions ? -2 : 4}
          textAnchor="middle"
          fontSize={9.5} fontWeight="700" fill={labelColor}
          fontFamily="'SF Mono','Fira Code',monospace"
        >{branch.reagent}</text>
        {branch.conditions && (
          <text x={0} y={11} textAnchor="middle"
            fontSize={8} fontWeight="500" fill="#4a7080">
            {branch.conditions}
          </text>
        )}
      </g>

      {/* LOCKED leaf — small dim dot */}
      {state === 'locked' && (
        <circle cx={g.x2} cy={g.y2} r={5.5}
          fill="none" stroke="#1e3d50" strokeWidth={1.5}
          strokeDasharray="2 3" opacity={0.5}
        />
      )}

      {/* ACTIVE leaf — orange circle + "?" */}
      {state === 'active' && (
        <g>
          <circle cx={g.x2} cy={g.y2} r={LEAF_R_ACTIVE}
            fill="rgba(240,134,103,0.12)" stroke="#f08667" strokeWidth={2.5}
          />
          <text x={g.x2} y={g.y2 + 6}
            textAnchor="middle" fontSize={18} fontWeight="800" fill="#f08667">
            ?
          </text>
          <text x={g.x2} y={g.y2 + 41}
            textAnchor="middle" fontSize={7} fontWeight="700"
            fill="#4a7080" letterSpacing="0.07em">
            PICK BELOW
          </text>
        </g>
      )}

      {/* DONE leaf — green circle + product name */}
      {state === 'done' && (
        <g>
          <circle cx={g.x2} cy={g.y2} r={LEAF_R_DONE}
            fill="rgba(46,204,113,0.12)" stroke="#2ecc71" strokeWidth={2}
          />
          {nameLine2 ? (
            <>
              <text x={g.x2} y={g.y2 - 2}
                textAnchor="middle" fontSize={8} fontWeight="700" fill="#2ecc71">
                {nameLine1}
              </text>
              <text x={g.x2} y={g.y2 + 9}
                textAnchor="middle" fontSize={8} fontWeight="700" fill="#2ecc71">
                {nameLine2}
              </text>
            </>
          ) : (
            <text x={g.x2} y={g.y2 + 4}
              textAnchor="middle" fontSize={8.5} fontWeight="700" fill="#2ecc71">
              {nameLine1}
            </text>
          )}
          {/* Checkmark badge */}
          <circle cx={g.x2 + LEAF_R_DONE - 4} cy={g.y2 - LEAF_R_DONE + 4} r={8}
            fill="#2ecc71"
          />
          <text
            x={g.x2 + LEAF_R_DONE - 4} y={g.y2 - LEAF_R_DONE + 8}
            textAnchor="middle" fontSize={9} fontWeight="800" fill="#061018">
            ✓
          </text>
        </g>
      )}
    </g>
  );
}

/* ── Choice picker (DOM panel below the SVG) ───────────────── */
function BranchPicker({ branch, onCorrect, onWrong, wrongPicks }) {
  const choices = useTreeMemo(() => shuffleBranchAnswers(branch), [branch.id]);
  const [explainOpen, setExplainOpen] = useTreeState(false);
  const ref = useTreeRef(null);

  useTreeEffect(() => {
    if (ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [branch.id]);

  function handle(pick) {
    if (pick === branch.productName) onCorrect();
    else onWrong(pick);
  }

  return (
    <div ref={ref} className="branch-picker">
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

/* ── Main tree renderer ────────────────────────────────────── */
function ReactionTreeMode({ electrons, onReward }) {
  const treeIds = Object.keys(window.TREES);
  const [selectedId, setSelectedId] = useTreeState(treeIds[0]);

  const [trees, setTrees] = useTreeState(() => {
    const init = {};
    for (const id of treeIds) init[id] = { activeIdx: 0, doneIds: new Set(), wrongCounts: {} };
    return init;
  });

  const tree = window.TREES[selectedId];
  const st   = trees[selectedId];
  const n    = tree.branches.length;

  function handleCorrect() {
    const branch = tree.branches[st.activeIdx];
    const newDone = new Set(st.doneIds); newDone.add(branch.id);
    setTrees(prev => ({ ...prev, [selectedId]: { ...st, doneIds: newDone, activeIdx: st.activeIdx + 1 } }));
    onReward(2);
  }
  function handleWrong(name) {
    const branch = tree.branches[st.activeIdx];
    const prevWrong = st.wrongCounts[branch.id] || new Set();
    const updated = new Set(prevWrong); updated.add(name);
    setTrees(prev => ({ ...prev, [selectedId]: { ...st, wrongCounts: { ...st.wrongCounts, [branch.id]: updated } } }));
    onReward(-1);
  }
  function handleReset() {
    setTrees(prev => ({ ...prev, [selectedId]: { activeIdx: 0, doneIds: new Set(), wrongCounts: {} } }));
  }

  const allDone      = st.activeIdx >= n;
  const activeBranch = !allDone ? tree.branches[st.activeIdx] : null;
  const wrongPicks   = activeBranch ? (st.wrongCounts[activeBranch.id] || new Set()) : new Set();

  return (
    <div className="tree-mode">

      {/* Substrate / tree selector bar */}
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
          {st.doneIds.size} / {n} learned
        </div>
        <button className="tree-picker-reset" onClick={handleReset}>
          ↺ Reset tree
        </button>
      </div>

      {/* Substrate blurb */}
      <div className="tree-blurb">
        <div className="tree-blurb-class">
          {tree.label} <span className="tree-blurb-sub">· {tree.subtitle}</span>
        </div>
        <div className="tree-blurb-text">{tree.blurb}</div>
      </div>

      {/* Sun SVG diagram */}
      <div className="sun-wrap">
        <svg
          className="sun-svg"
          viewBox="0 0 700 700"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="sunCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(0,175,185,0.18)" />
              <stop offset="100%" stopColor="rgba(0,175,185,0)" />
            </radialGradient>
          </defs>

          {/* Ambient glow behind substrate */}
          <circle cx={CX} cy={CY} r={130} fill="url(#sunCenterGlow)" />

          {/* All branches — locked first so active renders on top */}
          {tree.branches.map((b, i) => {
            const state = st.doneIds.has(b.id) ? 'done'
                        : i === st.activeIdx    ? 'active'
                        : 'locked';
            return <SunBranch key={b.id} branch={b} i={i} n={n} state={state} />;
          })}

          {/* Center substrate node */}
          <circle cx={CX} cy={CY} r={SUBSTRATE_R + 7}
            fill="none" stroke="rgba(0,175,185,0.22)" strokeWidth={1}
          />
          <circle cx={CX} cy={CY} r={SUBSTRATE_R}
            fill="rgba(0,175,185,0.13)" stroke="var(--teal)" strokeWidth={2.5}
          />
          <text x={CX} y={CY - 6}
            textAnchor="middle" fontSize={13} fontWeight="800" fill="var(--teal)">
            {tree.label}
          </text>
          <text x={CX} y={CY + 11}
            textAnchor="middle" fontSize={9} fill="#4a7080"
            fontFamily="'SF Mono','Fira Code',monospace">
            {tree.subtitle}
          </text>
          {st.doneIds.size > 0 && (
            <text x={CX} y={CY + 27}
              textAnchor="middle" fontSize={8} fontWeight="700" fill="#2ecc71">
              {st.doneIds.size}/{n} ✓
            </text>
          )}
        </svg>
      </div>

      {/* Multiple-choice picker for the active branch */}
      {activeBranch ? (
        <BranchPicker
          branch={activeBranch}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
          wrongPicks={wrongPicks}
        />
      ) : (
        <div className="tree-complete">
          <div className="tree-complete-icon">🌟</div>
          <div className="tree-complete-title">Sun complete!</div>
          <div className="tree-complete-text">
            You walked through all {n} reactions from <b>{tree.label}</b>.
            Pick a different substrate from the dropdown to keep going.
          </div>
        </div>
      )}

    </div>
  );
}

Object.assign(window, { ReactionTreeMode });
