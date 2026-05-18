/* Molecule renderer + reaction-arrow component.
   Reads from window.MOLECULES (see molecules.js).

   <MoleculeSVG id="2-bromobutane" scale={1.4} highlightBondKey="leaving" />

   GROUP-BASED BACKGROUNDS:
   Each molecule's card background is determined by its FUNCTIONAL CLASS
   (alcohol, alkene, halide, aromatic, ketone, aldehyde, ...). The PATTERN
   is fixed per class (so alcohols always look "vertical-striped" wherever
   they appear); the COLOR varies between molecules in the same class so
   you can still tell them apart.

   To extend: add an entry to MOLECULE_GROUP and (if new) GROUP_PATTERNS.
*/

/* ── Functional-class palette ────────────────────────────── */
const GROUP_PATTERNS = {
  alkane: {
    color: '#6d7f8a', legendLabel: 'Alkane (no functional group)',
    css: 'none',
  },
  alkene: {
    color: '#00AFB9', legendLabel: 'Alkene (C=C)',
    css: 'radial-gradient(circle, rgba(0,175,185,0.32) 1.3px, transparent 1.8px) 0 0 / 9px 9px',
  },
  alkyne: {
    color: '#7fc6cb', legendLabel: 'Alkyne (C≡C)',
    css: 'repeating-linear-gradient(90deg, transparent 0 4px, rgba(127,198,203,0.32) 4px 5px, transparent 5px 9px, rgba(127,198,203,0.32) 9px 10px)',
  },
  alcohol: {
    color: '#9b59b6', legendLabel: 'Alcohol (R–OH)',
    css: 'repeating-linear-gradient(90deg, transparent 0 6px, rgba(155,89,182,0.28) 6px 7px)',
  },
  halide: {
    color: '#C96460', legendLabel: 'Alkyl halide (R–X)',
    css: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(201,100,96,0.26) 6px 8px)',
  },
  aromatic: {
    color: '#F08667', legendLabel: 'Aromatic ring',
    css: 'radial-gradient(circle at 50% 50%, rgba(240,134,103,0.16) 4px, transparent 4.5px) 0 0 / 14px 14px, radial-gradient(circle at 50% 50%, rgba(240,134,103,0.16) 4px, transparent 4.5px) 7px 7px / 14px 14px',
  },
  ketone: {
    color: '#d4a657', legendLabel: 'Ketone (R₂C=O)',
    css: 'repeating-linear-gradient(0deg, transparent 0 8px, rgba(212,166,87,0.22) 8px 10px), repeating-linear-gradient(90deg, transparent 0 8px, rgba(212,166,87,0.18) 8px 10px)',
  },
  aldehyde: {
    color: '#e9b977', legendLabel: 'Aldehyde (R–CHO)',
    css: 'repeating-linear-gradient(-45deg, transparent 0 5px, rgba(233,185,119,0.30) 5px 6px, transparent 6px 10px)',
  },
  acid: {
    color: '#5fb585', legendLabel: 'Carboxylic acid (R–COOH)',
    css: 'repeating-linear-gradient(45deg, transparent 0 5px, rgba(95,181,133,0.18) 5px 6px), repeating-linear-gradient(-45deg, transparent 0 5px, rgba(95,181,133,0.18) 5px 6px)',
  },
  ester: {
    color: '#7fc09b', legendLabel: 'Ester (R–COOR)',
    css: 'repeating-linear-gradient(-45deg, transparent 0 6px, rgba(127,192,155,0.30) 6px 7px)',
  },
  amine: {
    color: '#5b8ea0', legendLabel: 'Amine (R–NH₂)',
    css: 'radial-gradient(circle, rgba(91,142,160,0.26) 2px, transparent 2.5px) 0 0 / 13px 13px',
  },
  amide: {
    color: '#7ca8b8', legendLabel: 'Amide (R–CONR₂)',
    css: 'repeating-linear-gradient(0deg, transparent 0 5px, rgba(124,168,184,0.22) 5px 6px, transparent 6px 11px)',
  },
  ether: {
    color: '#b88a7c', legendLabel: 'Ether (R–O–R)',
    css: 'repeating-linear-gradient(135deg, transparent 0 8px, rgba(184,138,124,0.22) 8px 9px)',
  },
  carbonyl: {
    color: '#d4a657', legendLabel: 'Carbonyl (C=O)',
    css: 'repeating-linear-gradient(0deg, transparent 0 8px, rgba(212,166,87,0.22) 8px 10px), repeating-linear-gradient(90deg, transparent 0 8px, rgba(212,166,87,0.18) 8px 10px)',
  },
  nitro: {
    color: '#b96e9c', legendLabel: 'Nitroarene (Ar–NO₂)',
    css: 'repeating-linear-gradient(45deg, rgba(185,110,156,0.20) 0 3px, transparent 3px 8px)',
  },
  diene: {
    color: '#56b3a4', legendLabel: 'Conjugated diene',
    css: 'repeating-linear-gradient(0deg, transparent 0 4px, rgba(86,179,164,0.24) 4px 5px), repeating-linear-gradient(90deg, transparent 0 4px, rgba(86,179,164,0.24) 4px 5px)',
  },
  default: {
    color: '#6fa0af', legendLabel: 'Other / generic',
    css: 'none',
  },
};

/* ── Molecule → functional-class lookup ──────────────────── */
const MOLECULE_GROUP = {
  // Alkanes
  'propane': 'alkane',
  'butane': 'alkane',
  'cyclohexane': 'alkane',
  // Alkenes
  'propene': 'alkene',
  '1-butene': 'alkene',
  '2-butene': 'alkene',
  'isobutylene': 'alkene',
  'cyclohexene': 'alkene',
  // Alcohols
  'propan-1-ol': 'alcohol',
  'propan-2-ol': 'alcohol',
  '2-butanol': 'alcohol',
  'n-butanol': 'alcohol',
  'tert-butanol': 'alcohol',
  'cyclohexanol': 'alcohol',
  'phenol': 'alcohol',
  // Halides
  '1-bromopropane': 'halide',
  '1-chloropropane': 'halide',
  '2-bromobutane': 'halide',
  'tert-butyl-bromide': 'halide',
  'bromobenzene': 'halide',
  '1,2-dibromobenzene': 'halide',
  '1,2-dibromocyclohexane': 'halide',
  // Aromatic
  'benzene': 'aromatic',
  'tert-butylbenzene': 'aromatic',
  'aniline': 'amine',          // amine on an aromatic — call it amine
  'nitrobenzene': 'nitro',
  'cyclohexa-1,3-diene': 'diene',
  // Carbonyls
  'propanal': 'aldehyde',
  'ethanal': 'aldehyde',
  'cyclohexanone': 'ketone',
  '2-butanone': 'ketone',
  // Acids / esters / amides
  'acetic_acid': 'acid',
  'propanoic_acid': 'acid',
  'ethyl_acetate': 'ester',
  'methyl_acetate': 'ester',
  // Ethers
  'tert-butyl-methyl-ether': 'ether',
  'cyclohexyl_methyl_ether': 'ether',
  // Small alcohols
  'ethanol': 'alcohol',
};

/* Infer functional class for molecules we haven't explicitly tagged. */
function inferGroup(data) {
  if (!data) return 'default';
  if (data.aromaticRing) return 'aromatic';
  const atoms = data.atoms || [];
  const labels = atoms.map(a => a.label || '').join('|');
  if (/Br|Cl|I\b|F\b/.test(labels)) return 'halide';
  const hasOH = labels.includes('OH');
  const hasO  = atoms.some(a => a.label === 'O');
  const hasDoubleO = data.bonds?.some(b => {
    const A = atoms[b.a], B = atoms[b.b];
    return b.order === 2 && (A?.label === 'O' || B?.label === 'O');
  });
  if (hasDoubleO && hasOH) return 'acid';
  if (hasDoubleO) return 'ketone';
  if (hasOH) return 'alcohol';
  if (hasO) return 'ether';
  if (/NH|N\b/.test(labels)) return 'amine';
  if (data.bonds?.some(b => b.order === 2)) return 'alkene';
  if (data.bonds?.some(b => b.order === 3)) return 'alkyne';
  return 'alkane';
}

/* Public helper for tutorial / inspector. */
function groupForMolecule(idOrData, data) {
  if (typeof idOrData === 'string' && MOLECULE_GROUP[idOrData]) return MOLECULE_GROUP[idOrData];
  return inferGroup(data || (window.MOLECULES && window.MOLECULES[idOrData]));
}

/* ── Color variation within a group ──────────────────────── */
function _molHash(id) {
  let h = 5381 >>> 0;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return h;
}
/* Slight hue shift per molecule so two molecules in the same class are
   distinguishable but still clearly the same family. We do this by
   blending the group's base color with a per-molecule accent. */
function _accentForMolecule(id) {
  // 6 stable accents
  const accents = ['#f4d35e', '#ee964b', '#5ee2f4', '#c7f9cc', '#f1a7c8', '#b5b9ff'];
  return accents[_molHash(id) % accents.length];
}

function moleculeCardStyle(id, data) {
  const group = groupForMolecule(id, data);
  const pat = GROUP_PATTERNS[group] || GROUP_PATTERNS.default;
  const accent = id ? _accentForMolecule(id) : '#FDFCDC';
  // Layer the accent as a soft inner tint behind the group's pattern.
  // Pattern image goes ON TOP of the accent so the class is still readable.
  const bgImage = pat.css === 'none'
    ? `linear-gradient(135deg, ${accent}12, ${accent}05)`
    : `${pat.css}, linear-gradient(135deg, ${accent}14, ${accent}06)`;
  return {
    backgroundColor: `${pat.color}0c`,
    backgroundImage: bgImage,
    borderColor: `${pat.color}55`,
    '--mol-accent': accent,
    '--mol-group-color': pat.color,
  };
}

/* ── SVG render helpers (unchanged) ──────────────────────── */
function _vectorLen(dx, dy) { return Math.sqrt(dx*dx + dy*dy); }
function _centroid(atoms) {
  const cx = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
  const cy = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
  return { cx, cy };
}

function _Bond({ from, to, order, hi, centroid, gap }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = _vectorLen(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;

  const midx = (from.x + to.x) / 2, midy = (from.y + to.y) / 2;
  const towardCx = centroid.cx - midx, towardCy = centroid.cy - midy;
  const dot = px * towardCx + py * towardCy;
  const sign = dot >= 0 ? 1 : -1;

  const g0 = gap[0], g1 = gap[1];
  const x1 = from.x + ux * g0, y1 = from.y + uy * g0;
  const x2 = to.x   - ux * g1, y2 = to.y   - uy * g1;

  const stroke = hi ? '#F08667' : '#FDFCDC';
  const sw = hi ? 2.1 : 1.4;

  if (order === 2) {
    const off = 3.2;
    const ix1 = x1 + px*off*sign + ux*3;
    const iy1 = y1 + py*off*sign + uy*3;
    const ix2 = x2 + px*off*sign - ux*3;
    const iy2 = y2 + py*off*sign - uy*3;
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <line x1={ix1} y1={iy1} x2={ix2} y2={iy2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
    );
  }
  if (order === 3) {
    const off = 3.2;
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <line x1={x1 + px*off} y1={y1 + py*off} x2={x2 + px*off} y2={y2 + py*off} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <line x1={x1 - px*off} y1={y1 - py*off} x2={x2 - px*off} y2={y2 - py*off} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
    );
  }
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
}

function MoleculeSVG({
  id, mol, scale = 1.6,
  highlightBondKey, highlightAtoms,
  invert = false, framed = true,
  className = '',
}) {
  const data = mol || (window.MOLECULES && window.MOLECULES[id]);
  if (!data) {
    return (
      <div className={`mol-missing ${className}`} style={{
        color: '#C96460', fontSize: '0.72rem',
        padding: '20px', fontFamily: 'monospace',
      }}>
        missing: {id}
      </div>
    );
  }

  const [vw, vh] = data.vb;
  const W = vw * scale, H = vh * scale;
  const cent = _centroid(data.atoms);

  const gapFor = (atom) => (atom.label ? 9 : 0);
  const atomHi = new Set(highlightAtoms || []);
  const labelColor = invert ? '#1a2c3a' : '#FDFCDC';
  const labelHi = '#F08667';

  const svg = (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      width={W} height={H}
      className={`mol-svg ${className}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {data.aromaticRing && (
        <circle
          cx={data.aromaticRing.cx} cy={data.aromaticRing.cy} r={data.aromaticRing.r}
          fill="none" stroke={invert ? '#1a2c3a' : '#FDFCDC'}
          strokeWidth={1.2} opacity={0.85}
        />
      )}

      {data.bonds.map((b, i) => {
        const A = data.atoms[b.a], B = data.atoms[b.b];
        const isHi = highlightBondKey && b.key === highlightBondKey;
        const ring = data.aromaticRing;
        let renderOrder = b.order || 1;
        if (ring && i < 6 && renderOrder === 2) renderOrder = 1;
        return (
          <_Bond key={i} from={A} to={B} order={renderOrder}
            hi={isHi} centroid={cent}
            gap={[gapFor(A), gapFor(B)]}
          />
        );
      })}

      {data.atoms.map((a, i) => {
        if (!a.label) return null;
        const hi = atomHi.has(i);
        return (
          <text
            key={i} x={a.x} y={a.y + 3} textAnchor="middle"
            fontSize={9.5} fontWeight={700}
            fill={hi ? labelHi : labelColor}
            style={{ paintOrder: 'stroke', stroke: invert ? '#FDFCDC' : '#080e14', strokeWidth: 3 }}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );

  if (!framed) return svg;

  return (
    <div
      className={`mol-card mol-group-${groupForMolecule(id, data)}`}
      style={moleculeCardStyle(id, data)}
      title={data.name}
    >
      {svg}
    </div>
  );
}

/* Reaction arrow with reagent text on top, conditions below. */
function ReactionArrow({ reagent, conditions, width = 90 }) {
  return (
    <div className="rxn-arrow" style={{ width }}>
      <div className="rxn-reagent">{reagent}</div>
      <svg width={width} height={20} viewBox={`0 0 ${width} 20`} style={{ display: 'block' }}>
        <line x1={4} y1={10} x2={width - 8} y2={10}
          stroke="var(--muted)" strokeWidth={1.4} strokeLinecap="round" />
        <polygon points={`${width - 10},5 ${width - 2},10 ${width - 10},15`} fill="var(--muted)" />
      </svg>
      <div className="rxn-cond">{conditions}</div>
    </div>
  );
}

Object.assign(window, {
  MoleculeSVG, ReactionArrow,
  GROUP_PATTERNS, MOLECULE_GROUP,
  groupForMolecule, moleculeCardStyle,
});
