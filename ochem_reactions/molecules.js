/* Molecule library — atoms + bonds, hand-laid skeletal coords.
   Coord conventions:
     - viewBox 0 0 width height (typically 140×80 to 200×120)
     - Bond length ~24px, zig-zag step (dx=22, dy=±13) for chains
     - Implicit carbon vertices: atoms with no `label` render as plain vertices
     - Atoms with `label` render the label (e.g. 'Br', 'OH', 'O', 'NH2')
     - bond.order = 1 | 2 | 3
     - bond.key (optional) is a stable id used by hints to highlight specific bonds
       (e.g. 'leaving-group', 'reactive-pi', 'C-H', etc.)
*/

// ── Helpers ────────────────────────────────────────────────────
// Zig-zag chain of n carbons starting at (x0, y0).
// Even indices low (y0), odd indices high (y0-dy).
function chain(n, x0, y0, dx = 22, dy = 13) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({ x: x0 + i * dx, y: y0 + (i % 2 === 0 ? 0 : -dy) });
  }
  return arr;
}

// Regular hexagon, "pointy-top". Returns 6 vertices clockwise starting at top.
function hexagon(cx, cy, r = 22) {
  const arr = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * (Math.PI / 3);
    arr.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return arr;
}

function ring(n, cx, cy, r = 22, rot = -Math.PI / 2) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const a = rot + i * (2 * Math.PI / n);
    arr.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return arr;
}

// Bond list for a closed ring of n atoms (indices 0..n-1).
function ringBonds(n, offset = 0, orders = null) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const a = offset + i;
    const b = offset + ((i + 1) % n);
    arr.push({ a, b, order: orders ? orders[i] : 1 });
  }
  return arr;
}

// Bond list for a chain a-b-c-d-...
function chainBonds(n, offset = 0, orders = null) {
  const arr = [];
  for (let i = 0; i < n - 1; i++) {
    arr.push({ a: offset + i, b: offset + i + 1, order: orders ? orders[i] : 1 });
  }
  return arr;
}

// ── Molecule definitions ──────────────────────────────────────
// Each: { name, formula?, vb (viewBox dims), atoms, bonds, aromatic? }
const M = {};

// ── Propanes / propenes ──
M.propane = {
  name: 'propane', vb: [70, 40],
  atoms: chain(3, 12, 24),
  bonds: chainBonds(3),
};
M.propene = {
  name: 'propene', vb: [70, 40],
  atoms: chain(3, 12, 24),
  bonds: [{ a: 0, b: 1, order: 2, key: 'pi' }, { a: 1, b: 2, order: 1 }],
};
M['propan-1-ol'] = {
  name: 'propan-1-ol', vb: [110, 40],
  atoms: [...chain(3, 12, 24), { x: 80, y: 24, label: 'OH' }],
  bonds: [...chainBonds(3), { a: 2, b: 3, order: 1 }],
};
M['propan-2-ol'] = {
  name: 'propan-2-ol', vb: [85, 50],
  atoms: [
    ...chain(3, 12, 30),
    { x: 34, y: 8, label: 'OH' },
  ],
  bonds: [...chainBonds(3), { a: 1, b: 3, order: 1 }],
};
M['1-bromopropane'] = {
  name: '1-bromopropane', vb: [110, 40],
  atoms: [...chain(3, 12, 24), { x: 78, y: 24, label: 'Br' }],
  bonds: [...chainBonds(3), { a: 2, b: 3, order: 1, key: 'leaving' }],
};
M['1-chloropropane'] = {
  name: '1-chloropropane', vb: [110, 40],
  atoms: [...chain(3, 12, 24), { x: 78, y: 24, label: 'Cl' }],
  bonds: [...chainBonds(3), { a: 2, b: 3, order: 1 }],
};
M.propanal = {
  name: 'propanal', vb: [110, 50],
  atoms: [
    ...chain(3, 12, 30),
    { x: 78, y: 10, label: 'O' },
  ],
  bonds: [...chainBonds(3), { a: 2, b: 3, order: 2 }],
};

// ── Butanes / butenes ──
M['2-bromobutane'] = {
  name: '2-bromobutane', vb: [120, 50],
  atoms: [
    ...chain(4, 12, 30),
    { x: 34, y: 8, label: 'Br' },
  ],
  bonds: [...chainBonds(4), { a: 1, b: 4, order: 1, key: 'leaving' }],
};
M['1-butene'] = {
  name: 'but-1-ene', vb: [100, 40],
  atoms: chain(4, 12, 24),
  bonds: [
    { a: 0, b: 1, order: 2 },
    { a: 1, b: 2, order: 1 },
    { a: 2, b: 3, order: 1 },
  ],
};
M['2-butene'] = {
  name: 'but-2-ene', vb: [100, 40],
  atoms: chain(4, 12, 24),
  bonds: [
    { a: 0, b: 1, order: 1 },
    { a: 1, b: 2, order: 2 },
    { a: 2, b: 3, order: 1 },
  ],
};
M['2-butanol'] = {
  name: 'butan-2-ol', vb: [120, 50],
  atoms: [
    ...chain(4, 12, 30),
    { x: 34, y: 8, label: 'OH' },
  ],
  bonds: [...chainBonds(4), { a: 1, b: 4, order: 1 }],
};
M['2-ethoxybutane'] = {
  name: '2-ethoxybutane', vb: [160, 60],
  atoms: [
    ...chain(4, 12, 36),                             // 0..3 butyl chain
    { x: 34, y: 18, label: 'O' },                    // 4 ether O
    { x: 56, y: 6 },                                 // 5 methylene
    { x: 78, y: 18 },                                // 6 methyl
  ],
  bonds: [...chainBonds(4), { a: 1, b: 4 }, { a: 4, b: 5 }, { a: 5, b: 6 }],
};
M.butane = {
  name: 'butane', vb: [100, 40],
  atoms: chain(4, 12, 24),
  bonds: chainBonds(4),
};

// ── tert-butyl family ──
// (CH3)3C-X drawn as a tetrahedral hub
M['tert-butyl-bromide'] = {
  name: '2-bromo-2-methylpropane', vb: [110, 90],
  atoms: [
    { x: 55, y: 45 },                  // 0 central C
    { x: 30, y: 30 },                  // 1 methyl
    { x: 80, y: 30 },                  // 2 methyl
    { x: 55, y: 72 },                  // 3 methyl down
    { x: 55, y: 14, label: 'Br' },     // 4 Br up
  ],
  bonds: [
    { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 },
    { a: 0, b: 4, key: 'leaving' },
  ],
};
M['tert-butanol'] = {
  name: '2-methylpropan-2-ol', vb: [110, 90],
  atoms: [
    { x: 55, y: 45 },
    { x: 30, y: 30 },
    { x: 80, y: 30 },
    { x: 55, y: 72 },
    { x: 55, y: 14, label: 'OH' },
  ],
  bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 0, b: 4 }],
};
M.isobutylene = {
  name: '2-methylpropene', vb: [110, 60],
  atoms: [
    { x: 20, y: 36 },                  // 0 =CH2
    { x: 45, y: 22 },                  // 1 =C<
    { x: 70, y: 36 },                  // 2 CH3 right
    { x: 45, y: 50 },                  // 3 CH3 down... actually want it up-left
  ],
  bonds: [
    { a: 0, b: 1, order: 2, key: 'pi' },
    { a: 1, b: 2 },
    { a: 1, b: 3 },
  ],
};
M['tert-butyl-methyl-ether'] = {
  name: 'tert-butyl methyl ether', vb: [150, 90],
  atoms: [
    { x: 50, y: 45 },                  // central C
    { x: 25, y: 30 },                  // methyl
    { x: 50, y: 72 },                  // methyl down
    { x: 25, y: 60 },                  // methyl lower-left
    { x: 80, y: 30, label: 'O' },      // O
    { x: 110, y: 45 },                 // methyl right
  ],
  bonds: [
    { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 },
    { a: 0, b: 4 }, { a: 4, b: 5 },
  ],
};
M['n-butanol'] = {
  name: 'butan-1-ol', vb: [120, 40],
  atoms: [...chain(4, 12, 24), { x: 90, y: 24, label: 'OH' }],
  bonds: [...chainBonds(4), { a: 3, b: 4 }],
};

// ── Benzene & aromatic friends ──
const _benz = hexagon(50, 45, 22);
M.benzene = {
  name: 'benzene', vb: [100, 90], aromatic: true,
  atoms: [..._benz],
  bonds: ringBonds(6),
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};
M.bromobenzene = {
  name: 'bromobenzene', vb: [110, 90], aromatic: true,
  atoms: [..._benz, { x: 50, y: 12, label: 'Br' }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }],
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};
M['1,2-dibromobenzene'] = {
  name: '1,2-dibromobenzene', vb: [125, 95], aromatic: true,
  atoms: [..._benz, { x: 50, y: 12, label: 'Br' }, { x: 79, y: 28, label: 'Br' }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }, { a: 1, b: 7 }],
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};
M.nitrobenzene = {
  name: 'nitrobenzene', vb: [120, 100], aromatic: true,
  atoms: [..._benz, { x: 50, y: 8, label: 'NO\u2082' }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }],
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};
M.phenol = {
  name: 'phenol', vb: [110, 90], aromatic: true,
  atoms: [..._benz, { x: 50, y: 12, label: 'OH' }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }],
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};
M.aniline = {
  name: 'aniline', vb: [120, 95], aromatic: true,
  atoms: [..._benz, { x: 50, y: 10, label: 'NH\u2082' }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }],
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};
M['cyclohexa-1,3-diene'] = {
  name: 'cyclohexa-1,3-diene', vb: [100, 90],
  atoms: [..._benz],
  // Kekulé: bonds 0-1, 2-3 are double; rest single
  bonds: ringBonds(6, 0, [2, 1, 2, 1, 1, 1]),
};
M['tert-butylbenzene'] = {
  name: 'tert-butylbenzene', vb: [130, 90], aromatic: true,
  atoms: [
    ..._benz,                                // 0..5 ring
    { x: 89, y: 67 },                        // 6 central C of t-Bu (attached to ring atom 2)
    { x: 89, y: 47 },                        // 7 methyl up
    { x: 108, y: 56 },                       // 8 methyl up-right
    { x: 108, y: 78 },                       // 9 methyl down-right
  ],
  bonds: [
    ...ringBonds(6),
    { a: 2, b: 6 },                          // ring atom 2 \u2014 central C
    { a: 6, b: 7 }, { a: 6, b: 8 }, { a: 6, b: 9 },
  ],
  aromaticRing: { cx: 50, cy: 45, r: 14 },
};

// ── Cyclohexane family ──
const _cyhex = hexagon(50, 45, 22);
M.cyclohexane = {
  name: 'cyclohexane', vb: [100, 90],
  atoms: [..._cyhex],
  bonds: ringBonds(6),
};
M.cyclohexene = {
  name: 'cyclohexene', vb: [100, 90],
  atoms: [..._cyhex],
  bonds: ringBonds(6, 0, [2, 1, 1, 1, 1, 1]),
};
M.cyclohexanol = {
  name: 'cyclohexan-1-ol', vb: [110, 90],
  atoms: [..._cyhex, { x: 50, y: 12, label: 'OH' }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }],
};
M.cyclohexanone = {
  name: 'cyclohexan-1-one', vb: [110, 90],
  atoms: [..._cyhex, { x: 50, y: 12, label: 'O' }],
  bonds: [...ringBonds(6), { a: 0, b: 6, order: 2 }],
};
M['1,2-dibromocyclohexane'] = {
  name: 'trans-1,2-dibromocyclohexane', vb: [135, 95],
  atoms: [
    ..._cyhex,
    { x: 50, y: 12, label: 'Br' },
    { x: 79, y: 28, label: 'Br' },
  ],
  bonds: [...ringBonds(6), { a: 0, b: 6 }, { a: 1, b: 7 }],
};

// ── Reagents/products: 2-butanone, ethanol, ethyl acetate, acetic acid ──
M['2-butanone'] = {
  name: 'butan-2-one', vb: [110, 50],
  atoms: [
    ...chain(4, 12, 30),
    { x: 34, y: 8, label: 'O' },
  ],
  bonds: [...chainBonds(4), { a: 1, b: 4, order: 2 }],
};
M.ethanol = {
  name: 'ethanol', vb: [80, 40],
  atoms: [...chain(2, 12, 24), { x: 56, y: 24, label: 'OH' }],
  bonds: [...chainBonds(2), { a: 1, b: 2 }],
};
M.acetic_acid = {
  name: 'acetic acid', vb: [100, 55],
  atoms: [
    { x: 12, y: 32 },                  // CH3
    { x: 34, y: 19 },                  // C(=O)
    { x: 34, y: -3, label: 'O' },      // =O up (oh wait off-screen)
    { x: 56, y: 32, label: 'OH' },     // -OH
  ],
  bonds: [
    { a: 0, b: 1 },
    { a: 1, b: 2, order: 2 },
    { a: 1, b: 3 },
  ],
};
// Fix acetic_acid y to fit
M.acetic_acid = {
  name: 'acetic acid', vb: [100, 60],
  atoms: [
    { x: 12, y: 40 },
    { x: 34, y: 27 },
    { x: 34, y: 8, label: 'O' },
    { x: 56, y: 40, label: 'OH' },
  ],
  bonds: [
    { a: 0, b: 1 },
    { a: 1, b: 2, order: 2 },
    { a: 1, b: 3 },
  ],
};
M.ethyl_acetate = {
  name: 'ethyl acetate', vb: [150, 60],
  atoms: [
    { x: 12, y: 40 },                  // 0 CH3
    { x: 34, y: 27 },                  // 1 C(=O)
    { x: 34, y: 8, label: 'O' },       // 2 =O
    { x: 56, y: 40, label: 'O' },      // 3 -O-
    { x: 78, y: 27 },                  // 4 -CH2-
    { x: 100, y: 40 },                 // 5 -CH3
  ],
  bonds: [
    { a: 0, b: 1 },
    { a: 1, b: 2, order: 2 },
    { a: 1, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 5 },
  ],
};
M.methyl_acetate = {
  name: 'methyl acetate', vb: [120, 60],
  atoms: [
    { x: 12, y: 40 },
    { x: 34, y: 27 },
    { x: 34, y: 8, label: 'O' },
    { x: 56, y: 40, label: 'O' },
    { x: 78, y: 27 },
  ],
  bonds: [
    { a: 0, b: 1 },
    { a: 1, b: 2, order: 2 },
    { a: 1, b: 3 },
    { a: 3, b: 4 },
  ],
};
M.propanoic_acid = {
  name: 'propanoic acid', vb: [120, 60],
  atoms: [
    { x: 12, y: 40 },
    { x: 34, y: 27 },
    { x: 56, y: 40 },
    { x: 56, y: 8, label: 'O' },
    { x: 78, y: 27, label: 'OH' },
  ],
  bonds: [
    { a: 0, b: 1 }, { a: 1, b: 2 },
    { a: 2, b: 3, order: 2 },
    { a: 2, b: 4 },
  ],
};
M.ethanal = {
  name: 'ethanal', vb: [90, 50],
  atoms: [
    { x: 12, y: 32 },
    { x: 34, y: 19 },
    { x: 34, y: 0, label: 'O' },
  ],
  bonds: [{ a: 0, b: 1 }, { a: 1, b: 2, order: 2 }],
};
// Tweak ethanal viewBox to fit O label
M.ethanal = {
  name: 'ethanal', vb: [90, 55],
  atoms: [
    { x: 12, y: 38 },
    { x: 34, y: 25 },
    { x: 34, y: 8, label: 'O' },
  ],
  bonds: [{ a: 0, b: 1 }, { a: 1, b: 2, order: 2 }],
};
M.cyclohexyl_methyl_ether = {
  name: 'cyclohexyl methyl ether', vb: [140, 90],
  atoms: [..._cyhex, { x: 50, y: 12, label: 'O' }, { x: 78, y: 28 }],
  bonds: [...ringBonds(6), { a: 0, b: 6 }, { a: 6, b: 7 }],
};

Object.assign(window, { MOLECULES: M });
