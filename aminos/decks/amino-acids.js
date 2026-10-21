/* Deck: the 20 standard amino acids.
   A deck declares its fields (what can go on the front/back), its
   categories (the colour key), some presets, and the cards themselves.
   The app knows nothing amino-acid specific — new decks follow this shape.

   Values: pKa (side chain) and pI from Lehninger, Principles of Biochemistry.
   Structures are drawn in the neutral (un-ionized) form. */
(function () {
  'use strict';
  const { Mol, L } = window.RecallStructures;

  // Shared backbone: H2N–CαH(R)–C(=O)OH. `side` adds the R group starting at CA.
  function aa(side, opts) {
    const m = new Mol();
    m.at('CA', 0, 0);
    m.add('N', 'CA', 210, opts && opts.pro ? L('N', 1, 'up') : L('N', 2, 'left'));
    m.add('C', 'CA', -30);
    m.add('O', 'C', -90, 'O', 2);
    m.add('OXT', 'C', 30, L('O', 1, 'right'));
    if (side) side(m);
    return m;
  }
  const cb = m => m.add('CB', 'CA', 90);
  const benzeneFrom = (m, at, ids) => m.ringFrom([at].concat(ids), 30, [2, 1, 2, 1, 2, 1]);

  const cards = [
    // ── Nonpolar, aliphatic ──
    { id: 'gly', name: 'Glycine', three: 'Gly', one: 'G', cls: 'nonpolar', essential: false, pka: null, pi: 5.97,
      text: ['H₂N–CH₂–COOH', 'R = –H'],
      draw: () => aa() },
    { id: 'ala', name: 'Alanine', three: 'Ala', one: 'A', cls: 'nonpolar', essential: false, pka: null, pi: 6.01,
      text: ['CH₃–CH(NH₂)–COOH', 'R = –CH₃'],
      draw: () => aa(cb) },
    { id: 'pro', name: 'Proline', three: 'Pro', one: 'P', cls: 'nonpolar', essential: false, pka: null, pi: 6.48,
      text: ['HN–CH₂CH₂CH₂–CH–COOH (ring)', 'R = –CH₂CH₂CH₂– bonded back to N'],
      draw: () => aa(m => m.ringOnEdge(['CA', 'CB', 'CG', 'CD', 'N'], 'C'), { pro: true }) },
    { id: 'val', name: 'Valine', three: 'Val', one: 'V', cls: 'nonpolar', essential: true, pka: null, pi: 5.97,
      text: ['(CH₃)₂CH–CH(NH₂)–COOH', 'R = –CH(CH₃)₂'],
      draw: () => aa(m => { cb(m); m.add('CG1', 'CB', 30); m.add('CG2', 'CB', 150); }) },
    { id: 'leu', name: 'Leucine', three: 'Leu', one: 'L', cls: 'nonpolar', essential: true, pka: null, pi: 5.98,
      text: ['(CH₃)₂CHCH₂–CH(NH₂)–COOH', 'R = –CH₂CH(CH₃)₂'],
      draw: () => aa(m => { cb(m); m.add('CG', 'CB', 30); m.add('CD1', 'CG', 90); m.add('CD2', 'CG', -30); }) },
    { id: 'ile', name: 'Isoleucine', three: 'Ile', one: 'I', cls: 'nonpolar', essential: true, pka: null, pi: 6.02,
      text: ['CH₃CH₂CH(CH₃)–CH(NH₂)–COOH', 'R = –CH(CH₃)CH₂CH₃'],
      draw: () => aa(m => { cb(m); m.add('CG1', 'CB', 30); m.add('CG2', 'CB', 150); m.add('CD1', 'CG1', 90); }) },
    { id: 'met', name: 'Methionine', three: 'Met', one: 'M', cls: 'nonpolar', essential: true, pka: null, pi: 5.74,
      text: ['CH₃SCH₂CH₂–CH(NH₂)–COOH', 'R = –CH₂CH₂SCH₃'],
      draw: () => aa(m => { cb(m); m.add('CG', 'CB', 30); m.add('SD', 'CG', 90, 'S'); m.add('CE', 'SD', 30); }) },

    // ── Aromatic ──
    { id: 'phe', name: 'Phenylalanine', three: 'Phe', one: 'F', cls: 'aromatic', essential: true, pka: null, pi: 5.48,
      text: ['C₆H₅CH₂–CH(NH₂)–COOH', 'R = –CH₂–C₆H₅ (benzyl)'],
      draw: () => aa(m => { cb(m); m.add('CG', 'CB', 30); benzeneFrom(m, 'CG', ['CD1', 'CE1', 'CZ', 'CE2', 'CD2']); }) },
    { id: 'tyr', name: 'Tyrosine', three: 'Tyr', one: 'Y', cls: 'aromatic', essential: false, pka: 10.07, pi: 5.66,
      text: ['HO–C₆H₄–CH₂–CH(NH₂)–COOH', 'R = –CH₂–C₆H₄–OH (phenol)'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); benzeneFrom(m, 'CG', ['CD1', 'CE1', 'CZ', 'CE2', 'CD2']);
        m.add('OH', 'CZ', 30, L('O', 1, 'right'));
      }) },
    { id: 'trp', name: 'Tryptophan', three: 'Trp', one: 'W', cls: 'aromatic', essential: true, pka: null, pi: 5.89,
      text: ['C₈H₆N–CH₂–CH(NH₂)–COOH', 'R = –CH₂–(indol-3-yl)'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30);
        const pyrrole = m.ringFrom(['CG', 'CD1', 'NE1', 'CE2', 'CD2'], 30, [2, 1, 1, 2, 1], { NE1: L('N', 1, 'right') });
        m.ringOnEdge(['CD2', 'CE3', 'CZ3', 'CH2', 'CZ2', 'CE2'], pyrrole, [1, 2, 1, 2, 1]);
      }) },

    // ── Polar, uncharged ──
    { id: 'ser', name: 'Serine', three: 'Ser', one: 'S', cls: 'polar', essential: false, pka: null, pi: 5.68,
      text: ['HOCH₂–CH(NH₂)–COOH', 'R = –CH₂OH'],
      draw: () => aa(m => { cb(m); m.add('OG', 'CB', 30, L('O', 1, 'right')); }) },
    { id: 'thr', name: 'Threonine', three: 'Thr', one: 'T', cls: 'polar', essential: true, pka: null, pi: 5.87,
      text: ['CH₃CH(OH)–CH(NH₂)–COOH', 'R = –CH(OH)CH₃'],
      draw: () => aa(m => { cb(m); m.add('OG1', 'CB', 150, L('O', 1, 'left')); m.add('CG2', 'CB', 30); }) },
    { id: 'cys', name: 'Cysteine', three: 'Cys', one: 'C', cls: 'polar', essential: false, pka: 8.18, pi: 5.07,
      text: ['HSCH₂–CH(NH₂)–COOH', 'R = –CH₂SH (thiol)'],
      draw: () => aa(m => { cb(m); m.add('SG', 'CB', 30, L('S', 1, 'right')); }) },
    { id: 'asn', name: 'Asparagine', three: 'Asn', one: 'N', cls: 'polar', essential: false, pka: null, pi: 5.41,
      text: ['H₂NCOCH₂–CH(NH₂)–COOH', 'R = –CH₂CONH₂ (amide)'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); m.add('OD1', 'CG', -30, 'O', 2); m.add('ND2', 'CG', 90, L('N', 2, 'right'));
      }) },
    { id: 'gln', name: 'Glutamine', three: 'Gln', one: 'Q', cls: 'polar', essential: false, pka: null, pi: 5.65,
      text: ['H₂NCOCH₂CH₂–CH(NH₂)–COOH', 'R = –CH₂CH₂CONH₂ (amide)'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); m.add('CD', 'CG', 90);
        m.add('OE1', 'CD', 150, 'O', 2); m.add('NE2', 'CD', 30, L('N', 2, 'right'));
      }) },

    // ── Basic (positively charged) ──
    { id: 'lys', name: 'Lysine', three: 'Lys', one: 'K', cls: 'basic', essential: true, pka: 10.53, pi: 9.74,
      text: ['H₂N(CH₂)₄–CH(NH₂)–COOH', 'R = –(CH₂)₄NH₂'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); m.add('CD', 'CG', 90); m.add('CE', 'CD', 30); m.add('NZ', 'CE', 90, L('N', 2, 'right'));
      }) },
    { id: 'arg', name: 'Arginine', three: 'Arg', one: 'R', cls: 'basic', essential: false, pka: 12.48, pi: 10.76,
      text: ['H₂NC(=NH)NH(CH₂)₃–CH(NH₂)–COOH', 'R = –(CH₂)₃NHC(=NH)NH₂ (guanidino)'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); m.add('CD', 'CG', 90); m.add('NE', 'CD', 30, L('N', 1, 'up'));
        m.add('CZ', 'NE', 90); m.add('NH1', 'CZ', 30, L('N', 1, 'right'), 2); m.add('NH2', 'CZ', 150, L('N', 2, 'left'));
      }) },
    { id: 'his', name: 'Histidine', three: 'His', one: 'H', cls: 'basic', essential: true, pka: 6.00, pi: 7.59,
      text: ['C₃H₃N₂–CH₂–CH(NH₂)–COOH', 'R = –CH₂–(imidazol-4-yl)'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30);
        m.ringFrom(['CG', 'ND1', 'CE1', 'NE2', 'CD2'], 30, [1, 1, 2, 1, 2], { ND1: L('N', 1, 'up'), NE2: 'N' });
      }) },

    // ── Acidic (negatively charged) ──
    { id: 'asp', name: 'Aspartate', three: 'Asp', one: 'D', cls: 'acidic', essential: false, pka: 3.65, pi: 2.77,
      text: ['HOOCCH₂–CH(NH₂)–COOH', 'R = –CH₂COOH'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); m.add('OD1', 'CG', -30, 'O', 2); m.add('OD2', 'CG', 90, L('O', 1, 'right'));
      }) },
    { id: 'glu', name: 'Glutamate', three: 'Glu', one: 'E', cls: 'acidic', essential: false, pka: 4.25, pi: 3.22,
      text: ['HOOCCH₂CH₂–CH(NH₂)–COOH', 'R = –CH₂CH₂COOH'],
      draw: () => aa(m => {
        cb(m); m.add('CG', 'CB', 30); m.add('CD', 'CG', 90);
        m.add('OE1', 'CD', 150, 'O', 2); m.add('OE2', 'CD', 30, L('O', 1, 'right'));
      }) },
  ];

  const fmtNum = v => (v == null ? null : v.toFixed(2));

  window.RecallDecks = window.RecallDecks || {};
  window.RecallDecks['amino-acids'] = {
    id: 'amino-acids',
    title: 'Amino Acid Recall',
    icon: '🧬',
    categoryField: 'cls',
    categories: {
      nonpolar: { label: 'Nonpolar', color: 'slate' },
      polar:    { label: 'Polar, uncharged', color: 'teal' },
      acidic:   { label: 'Acidic', color: 'coral' },
      basic:    { label: 'Basic', color: 'blue' },
      aromatic: { label: 'Aromatic', color: 'purple' },
    },
    // type drives rendering: title | code | structure | formula | category | badge | number
    fields: [
      { key: 'name',      label: 'Name',            type: 'title' },
      { key: 'three',     label: '3-Letter Code',   type: 'code' },
      { key: 'one',       label: '1-Letter Code',   type: 'code' },
      { key: 'structure', label: 'Drawn Structure', type: 'structure', get: c => c.draw() },
      { key: 'text',      label: 'Text Structure',  type: 'formula' },
      { key: 'cls',       label: 'Classification',  type: 'category' },
      { key: 'essential', label: 'Essential / Non', type: 'badge', get: c => (c.essential ? 'Essential' : 'Nonessential') },
      { key: 'pka',       label: 'pKa (side chain)', type: 'number', get: c => fmtNum(c.pka), empty: 'no ionizable side chain' },
      { key: 'pi',        label: 'pI',              type: 'number', get: c => fmtNum(c.pi) },
    ],
    presets: [
      { label: 'Structure → Name', front: ['structure'], back: ['name', 'three', 'one', 'cls'] },
      { label: 'Name → Structure', front: ['name'], back: ['structure', 'cls'] },
      { label: 'Codes', front: ['name'], back: ['three', 'one'] },
      { label: '1-Letter → Name', front: ['one'], back: ['name', 'three'] },
      { label: 'Text Structure → Name', front: ['text'], back: ['name', 'cls'] },
      { label: 'Chemistry', front: ['name', 'cls'], back: ['pka', 'pi', 'structure'] },
    ],
    defaultFront: ['structure'],
    defaultBack: ['name', 'three', 'one', 'cls', 'essential', 'pka', 'pi'],
    cards,
  };
})();
