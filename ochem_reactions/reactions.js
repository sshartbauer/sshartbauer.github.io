/* Reactions \u2014 each has:
   substrate (molecule id), reagent (text + small subtitle for conditions),
   product (correct id), distractors (3 ids),
   mechanism: 'SN1' | 'SN2' | 'E1' | 'E2' | 'RedOx' | 'EAS' | 'Addition' | 'Ester',
   groups: array of functional-group tags present on substrate,
   difficulty: 1..3,
   hints:
     class: short text \u2014 names the reaction class
     site: { bondKey?, atomIndex?, text } \u2014 what to highlight + a note
     arrow: text \u2014 the first mechanism step, in words (not images)
   feedback: 1-line explanation shown on correct answer.
   source: textbook citation (e.g. 'OpenStax OC \u00a711.2').
   walkthrough: array of steps \u2014 each step has
     title: short header (4\u20136 words)
     specific: what's happening in THIS reaction with THESE molecules
     general: what's happening in this class of reaction, in general
     highlightBondKey?: bond.key on the substrate to draw attention to during this step
*/

const REACTIONS = [
  {
    id: 'sn2-propyl',
    substrate: '1-bromopropane',
    reagent: 'NaOH',
    conditions: 'DMSO, 25 \u00b0C',
    product: 'propan-1-ol',
    distractors: ['propene', 'propan-2-ol', '1-chloropropane'],
    distractorWhy: {
      'propene': 'That would be elimination, not substitution. With a small, unhindered nucleophile in a polar aprotic solvent the C–Nu bond forms much faster than a C–H breaks.',
      'propan-2-ol': 'Substitution happens at the carbon that carries the leaving group, not at a deeper carbon in the chain. The nucleophile cannot reach an interior carbon.',
      '1-chloropropane': 'A simple halide swap is uphill: chloride is a worse leaving group than bromide. The forward reaction would just be reversed by the conditions.',
    },
    mechanism: 'SN2',
    categories: ['Substitution'],
    groups: ['halide', 'primary'],
    difficulty: 1,
    source: 'OpenStax OC \u00a711.2 \u2014 The SN2 Reaction',
    hints: {
      class: 'Strong nucleophile + primary carbon + polar aprotic solvent. Classic backside attack.',
      site: { bondKey: 'leaving', text: 'Hydroxide attacks the carbon bearing the leaving group from the opposite face.' },
      arrow: 'OH\u207b attacks C1 from the back; Br\u207b departs in a single concerted step. Inversion at carbon.',
    },
    feedback: 'SN2: concerted backside attack on the primary carbon \u2014 clean substitution, no rearrangement.',
    walkthrough: [
      {
        title: 'NaOH dissociates in solution',
        specific: 'In DMSO, the ionic Na\u2013OH pair separates. The polar aprotic solvent solvates Na\u207a but leaves OH\u207b mostly bare \u2014 a very hungry nucleophile.',
        general: 'A polar aprotic solvent stabilizes the cation of an ionic reagent but does not H\u2011bond to the anion, so the nucleophile stays reactive.',
      },
      {
        title: 'OH\u207b approaches the back face of C1',
        specific: '1-bromopropane\u2019s C1 has only two small hydrogens around it \u2014 plenty of room for OH\u207b to come straight in opposite the bromine.',
        general: 'SN2 requires the nucleophile to attack 180\u00b0 from the leaving group. Primary carbons are unhindered and so they are the most reactive substrates in SN2.',
        highlightBondKey: 'leaving',
      },
      {
        title: 'Concerted bond swap',
        specific: 'In one step, the C\u2013O bond forms while the C\u2013Br bond breaks. There is no carbocation \u2014 the carbon is partially bonded to both groups at the transition state.',
        general: 'SN2 is bimolecular and concerted (rate = k\u00b7[RX]\u00b7[Nu]). The carbon passes through a single trigonal-bipyramidal transition state.',
      },
      {
        title: 'Inversion at carbon',
        specific: 'C1 \u201cflips inside-out\u201d like an umbrella in the wind \u2014 the three H\u2019s end up on the opposite face from where they started.',
        general: 'Every SN2 reaction inverts the stereochemistry of the reacting carbon. A chirality center flips R \u2194 S.',
      },
      {
        title: 'Product: propan-1-ol + Br\u207b',
        specific: 'A primary alcohol on the same carbon skeleton, with bromide as the leaving-group byproduct.',
        general: 'The overall outcome of SN2: nucleophile replaces leaving group at one carbon, with inversion.',
      },
    ],
  },

  {
    id: 'e2-2bromobutane',
    substrate: '2-bromobutane',
    reagent: 'NaOEt',
    conditions: 'EtOH, \u0394',
    product: '2-butene',
    distractors: ['1-butene', '2-butanol', '2-ethoxybutane'],
    distractorWhy: {
      '1-butene': 'This is the less-substituted (Hofmann) alkene. With a moderately small base and a free choice of β-hydrogens, the more-substituted alkene is more stable and wins.',
      '2-butanol': 'That would be substitution by hydroxide — but hydroxide is not in this flask, and heat + a strong alkoxide pushes a 2° halide toward elimination, not SN2.',
      '2-ethoxybutane': 'Substitution by ethoxide is the SN2 alternative — but at elevated temperature with a strong base on a secondary carbon, breaking a C–H beats forming a C–O.',
    },
    mechanism: 'E2',
    categories: ['Elimination'],
    groups: ['halide', 'secondary'],
    difficulty: 2,
    source: 'OpenStax OC \u00a711.8 \u2014 The E2 Reaction',
    hints: {
      class: 'Strong, bulky-ish base + heat + secondary alkyl halide \u2192 elimination, not substitution.',
      site: { bondKey: 'leaving', text: 'The base removes a \u03b2-hydrogen anti-periplanar to the leaving group. More substituted alkene wins (Zaitsev).' },
      arrow: 'EtO\u207b removes a \u03b2-H from C3; the C2\u2013Br bond breaks as the C2=C3 \u03c0-bond forms.',
    },
    feedback: 'E2 follows Zaitsev: the more substituted (internal) alkene is the major product.',
    walkthrough: [
      {
        title: 'Strong base + heat \u2192 elimination',
        specific: 'NaOEt is a strong, moderately bulky base. Heating in EtOH tips the balance away from SN2 toward elimination.',
        general: 'Secondary substrates with a strong base and heat favor E2 over SN2. With even bulkier bases (KOtBu) the preference is total.',
      },
      {
        title: 'Pick a \u03b2-hydrogen anti to Br',
        specific: 'C2 holds the Br. There are \u03b2-H\u2019s on C1 (three) and on C3 (two). The base reaches for a H anti-periplanar to the C\u2013Br bond \u2014 the orbitals must line up.',
        general: 'E2 needs the C\u2013H and C\u2013X bonds parallel (anti-periplanar) so that the new \u03c0 bond can form as the leaving group departs.',
        highlightBondKey: 'leaving',
      },
      {
        title: 'Concerted: three bonds change at once',
        specific: 'EtO\u207b grabs a C3 hydrogen; that C\u2013H pair of electrons flows into the C2\u2013C3 \u03c3 bond, becoming a \u03c0 bond; the C\u2013Br bond breaks. All in one step.',
        general: 'E2 is concerted \u2014 one transition state, no carbocation. Rate = k\u00b7[RX]\u00b7[Base].',
      },
      {
        title: 'Zaitsev: pick the more-substituted alkene',
        specific: 'Taking a H from C3 builds 2-butene (disubstituted alkene). Taking from C1 would give 1-butene (monosubstituted) \u2014 less stable, minor.',
        general: 'When two alkenes are possible, the more substituted one is more stable (hyperconjugation) and usually predominates. This is the Zaitsev rule.',
      },
      {
        title: 'Product: 2-butene + EtOH + Br\u207b',
        specific: 'The internal alkene plus ethanol (from the proton) and bromide.',
        general: 'Net E2 outcome: lose H\u2013X across two adjacent carbons; form an alkene. The base ends up protonated; the halide is released.',
      },
    ],
  },

  {
    id: 'sn1-tbubr',
    substrate: 'tert-butyl-bromide',
    reagent: 'H\u2082O',
    conditions: 'acetone, 25 \u00b0C',
    product: 'tert-butanol',
    distractors: ['isobutylene', 'tert-butyl-methyl-ether', 'n-butanol'],
    distractorWhy: {
      'isobutylene': 'That is the E1 product. It does form a little alongside the alcohol, but water is a poor base and a much better nucleophile — substitution dominates.',
      'tert-butyl-methyl-ether': 'An ether product would require an alkoxide (RO⁻) nucleophile. The only nucleophile in this flask is neutral water.',
      'n-butanol': 'Reaching a primary alcohol would require the carbon skeleton to rearrange and the cation to migrate to a less-stable position — strongly disfavored once a 3° cation has formed.',
    },
    mechanism: 'SN1',
    categories: ['Substitution'],
    groups: ['halide', 'tertiary'],
    difficulty: 2,
    source: 'OpenStax OC \u00a711.4 \u2014 The SN1 Reaction',
    hints: {
      class: 'Tertiary halide + weak nucleophile (water) \u2192 carbocation pathway.',
      site: { bondKey: 'leaving', text: 'The C\u2013Br bond ionizes first, generating a stable 3\u00b0 carbocation. Then water attacks.' },
      arrow: 'Step 1: Br\u207b leaves \u2192 tert-butyl cation. Step 2: H\u2082O attacks. Step 3: deprotonation gives the alcohol.',
    },
    feedback: 'SN1: ionization first, then nucleophile. Tertiary carbocation is well-stabilized.',
    walkthrough: [
      {
        title: 'Tertiary halide + neutral water',
        specific: 'tert-Butyl bromide has three methyl groups crammed around the carbon \u2014 backside attack is physically blocked. Water is also a poor nucleophile.',
        general: 'SN2 needs an unhindered carbon and a good nucleophile. When neither is available, the reaction switches to SN1: ionize first, attack later.',
      },
      {
        title: 'C\u2013Br bond ionizes (slow step)',
        specific: 'Heterolytic cleavage: both electrons leave with bromide. The carbon becomes a planar, sp\u00b2 tert-butyl carbocation.',
        general: 'Rate-limiting in SN1 is the spontaneous departure of the leaving group. Rate depends only on [RX] \u2014 first order.',
        highlightBondKey: 'leaving',
      },
      {
        title: 'Carbocation stabilized by three alkyls',
        specific: 'The three methyl groups donate electron density into the empty p-orbital through hyperconjugation and induction, stabilizing the cation.',
        general: 'Carbocation stability: 3\u00b0 > 2\u00b0 > 1\u00b0 > methyl. SN1 is fast for tertiary substrates and essentially never happens at primary ones.',
      },
      {
        title: 'Water attacks the planar cation',
        specific: 'A water lone pair attacks either face of the cation, forming a protonated alcohol (oxonium ion).',
        general: 'Because the cation is planar, the nucleophile can come from either face. Reactions at chiral centers go racemic.',
      },
      {
        title: 'Solvent removes the extra proton',
        specific: 'A second water molecule plucks H\u207a off the oxonium, giving the neutral alcohol and H\u2083O\u207a.',
        general: 'Protic solvents both stabilize the cation intermediate and serve as the proton-removing base in the final step.',
      },
    ],
  },

  {
    id: 'eas-bromination',
    substrate: 'benzene',
    reagent: 'Br\u2082',
    conditions: 'FeBr\u2083',
    product: 'bromobenzene',
    distractors: ['1,2-dibromobenzene', 'cyclohexa-1,3-diene', '1,2-dibromocyclohexane'],
    distractorWhy: {
      '1,2-dibromobenzene': 'A second EAS cycle is possible, but bromine is mildly deactivating once installed — the ring is slower to react a second time, so the mono-product is favored under standard conditions.',
      'cyclohexa-1,3-diene': 'That would be addition across two of the ring π bonds. The whole point of EAS is to keep aromaticity — the ring substitutes rather than adds.',
      '1,2-dibromocyclohexane': 'That is what an isolated alkene would do with Br₂. Benzene’s aromaticity changes the rules: it substitutes (loses an H) instead of saturating.',
    },
    mechanism: 'EAS',
    categories: ['Substitution'],
    groups: ['aromatic'],
    difficulty: 1,
    source: 'OpenStax OC \u00a716.2 \u2014 Bromination of Benzene',
    hints: {
      class: 'Aromatic ring + Lewis-acid catalyst + halogen \u2192 electrophilic aromatic substitution.',
      site: { text: 'The ring acts as the nucleophile. Aromaticity is broken in the intermediate but restored on deprotonation \u2014 the ring stays intact in the product.' },
      arrow: 'FeBr\u2083 polarizes Br\u2013Br \u2192 the ring attacks Br\u207a, forming the arenium (sigma complex). Loss of H\u207a restores aromaticity.',
    },
    feedback: 'EAS substitutes one H for Br; the aromatic ring is preserved, not opened.',
    walkthrough: [
      {
        title: 'Lewis acid activates Br\u2082',
        specific: 'FeBr\u2083 pulls on one Br of Br\u2013Br, polarizing the bond and making the other end essentially Br\u207a \u2014 a strong electrophile.',
        general: 'Benzene\u2019s aromatic stability means plain Br\u2082 won\u2019t react. A Lewis-acid catalyst (FeBr\u2083, FeCl\u2083, AlCl\u2083) is needed to generate a strong enough electrophile.',
      },
      {
        title: 'Ring attacks the electrophile',
        specific: 'Two of benzene\u2019s six \u03c0 electrons swing up to form a new C\u2013Br bond. One ring carbon becomes sp\u00b3 and aromaticity is temporarily lost.',
        general: 'EAS step 1 is always the same: the aromatic \u03c0 system attacks the electrophile, forming a positively charged, non-aromatic arenium (\u201csigma complex\u201d) intermediate.',
      },
      {
        title: 'Arenium ion is resonance-stabilized',
        specific: 'The + charge is delocalized over three ring carbons (ortho, ortho, para to the Br). That stabilization is what makes the step possible.',
        general: 'The arenium has three principal resonance structures. Substituents on the ring change which positions can carry the + charge, which drives ortho/para vs meta selectivity.',
      },
      {
        title: 'Deprotonation restores aromaticity',
        specific: 'FeBr\u2084\u207b (the catalyst\u2019s counterion) removes the proton from the sp\u00b3 carbon. Those electrons go back into the ring, rebuilding the aromatic \u03c0 system.',
        general: 'This is what makes it substitution, not addition. The aromatic ring loses an H but recovers its aromaticity \u2014 a huge thermodynamic incentive.',
      },
      {
        title: 'Product: bromobenzene + HBr (catalyst regenerated)',
        specific: 'The ring keeps its six \u03c0 electrons. FeBr\u2083 cycles back out of HBr and is ready to activate the next Br\u2082.',
        general: 'Net EAS outcome: H on the ring is replaced by the electrophile. The aromatic system is intact in the product.',
      },
    ],
  },

  {
    id: 'hydrogenation-cyclohexene',
    substrate: 'cyclohexene',
    reagent: 'H\u2082',
    conditions: 'Pd/C',
    product: 'cyclohexane',
    distractors: ['cyclohexanol', '1,2-dibromocyclohexane', 'benzene'],
    distractorWhy: {
      'cyclohexanol': 'To install an OH you would need water and an acid catalyst. H₂ only delivers H — there is no source of oxygen in this flask.',
      '1,2-dibromocyclohexane': 'That would need Br₂, not H₂. The two reagents add the same way (across the π bond) but with very different atoms.',
      'benzene': 'That is the reverse direction — dehydrogenation. A Pd surface with H₂ pushes toward saturation, never away from it.',
    },
    mechanism: 'RedOx',
    groups: ['alkene', 'ring-6'],
    difficulty: 1,
    source: 'OpenStax OC \u00a78.6 \u2014 Catalytic Hydrogenation of Alkenes',
    hints: {
      class: 'Alkene + H\u2082 + metal catalyst \u2192 syn-addition of two H atoms across the \u03c0-bond.',
      site: { bondKey: 'auto-pi', text: 'The \u03c0-bond is reduced. Both new C\u2013H bonds form on the same face.' },
      arrow: 'H\u2082 adsorbs on Pd; the alkene binds the surface; two H atoms transfer to the same face of the double bond.',
    },
    feedback: 'Catalytic hydrogenation: syn-addition of H\u2013H across the \u03c0-bond. Reduces C=C to C\u2013C.',
    walkthrough: [
      {
        title: 'H\u2082 splits on the Pd surface',
        specific: 'Hydrogen gas adsorbs onto finely divided Pd. The H\u2013H bond breaks and the two H atoms sit on adjacent metal sites.',
        general: 'Heterogeneous catalysts work by activating one or both reactants on a surface. The metal lowers the barrier without being consumed.',
      },
      {
        title: 'Cyclohexene\u2019s \u03c0 bond binds the metal',
        specific: 'The alkene\u2019s \u03c0 electrons donate into empty Pd orbitals; the alkene lies flat against the surface.',
        general: 'Alkene adsorption brings the carbons close to the activated H atoms, only on one face of the alkene (the face touching the metal).',
      },
      {
        title: 'Both H\u2019s transfer to the same face',
        specific: 'The two surface-bound hydrogens insert one after the other into C1 and C2 of cyclohexene \u2014 same face, syn-addition.',
        general: 'Hydrogenation is stereospecifically syn. If the alkene is prochiral, the two new C\u2013H bonds are cis on the product.',
      },
      {
        title: 'Cyclohexane desorbs',
        specific: 'The product saturates and falls off the surface. The Pd is ready for the next cycle.',
        general: 'Catalytic turnover: the metal is recovered unchanged at the end. A few mg of Pd can reduce moles of alkene.',
      },
    ],
  },

  {
    id: 'mark-hydration',
    substrate: 'propene',
    reagent: 'H\u2082O',
    conditions: 'H\u2082SO\u2084 (cat.)',
    product: 'propan-2-ol',
    distractors: ['propan-1-ol', 'propane', 'propanal'],
    distractorWhy: {
      'propan-1-ol': 'Putting OH on the terminal carbon would require going through a primary carbocation. The secondary cation is far more stable, so the reaction takes the other path.',
      'propane': 'Full reduction would need H–H added across the π bond. Water cannot supply two hydrogens, only one H and one OH.',
      'propanal': 'That is an oxidation product. Acid-catalyzed hydration just adds water across the double bond — it does not change the oxidation state of carbon beyond that.',
    },
    mechanism: 'Addition',
    groups: ['alkene'],
    difficulty: 2,
    source: 'OpenStax OC \u00a78.4 \u2014 Hydration of Alkenes',
    hints: {
      class: 'Alkene + H\u2082O + acid \u2192 Markovnikov addition. OH ends up on the more substituted carbon.',
      site: { bondKey: 'pi', text: 'Protonation gives the more stable (secondary) carbocation, which water then attacks.' },
      arrow: 'H\u207a adds to C1 forming the 2\u00b0 cation on C2 \u2192 H\u2082O attacks C2 \u2192 deprotonation gives 2-propanol.',
    },
    feedback: 'Acid-catalyzed hydration follows Markovnikov: OH on the more substituted carbon via the more stable carbocation.',
    walkthrough: [
      {
        title: 'Acid protonates the alkene',
        specific: 'H\u2082SO\u2084 donates a proton to propene. The two \u03c0 electrons grab the H, forming a new C\u2013H bond at C1 \u2014 the terminal carbon.',
        general: 'Acid-catalyzed alkene additions start by protonating the \u03c0 bond. Which carbon gets the H decides where the + charge ends up.',
        highlightBondKey: 'pi',
      },
      {
        title: 'Carbocation forms on C2 (Markovnikov)',
        specific: 'Putting the H on C1 leaves a + charge on C2, which has one methyl and one H \u2014 a secondary cation. Putting it on C2 would give a primary cation on C1 (much worse).',
        general: 'Markovnikov\u2019s rule, restated: the proton adds so that the more stable carbocation forms. Stability order: 3\u00b0 > 2\u00b0 > 1\u00b0.',
      },
      {
        title: 'Water attacks the cation',
        specific: 'A water lone pair attacks C2, forming a C\u2013O bond and a protonated alcohol (oxonium ion).',
        general: 'The nucleophile lands on whichever carbon carried the cation \u2014 hence \u201cOH on the more substituted carbon.\u201d',
      },
      {
        title: 'Deprotonate to regenerate H\u207a',
        specific: 'A second water molecule removes the extra H from oxygen. The catalyst (H\u207a) is back in solution.',
        general: 'Because the acid is regenerated, only a catalytic amount is needed. This is a true acid catalysis cycle.',
      },
      {
        title: 'Product: propan-2-ol',
        specific: 'OH ends up on C2, the more substituted carbon of the original alkene.',
        general: 'Net Markovnikov hydration outcome: H\u2013OH added across the \u03c0 bond, OH on the more substituted carbon.',
      },
    ],
  },

  {
    id: 'eas-nitration',
    substrate: 'benzene',
    reagent: 'HNO\u2083',
    conditions: 'H\u2082SO\u2084, \u0394',
    product: 'nitrobenzene',
    distractors: ['phenol', 'aniline', 'bromobenzene'],
    distractorWhy: {
      'phenol': 'To install an OH on the ring you need a different reagent system entirely. HNO₃/H₂SO₄ does not deliver oxygen as a nucleophile.',
      'aniline': 'Aniline is the product of reducing nitrobenzene, several steps further along. Nothing in this flask reduces.',
      'bromobenzene': 'There is no bromine in this flask. The electrophile generated here is NO₂⁺, not Br⁺.',
    },
    mechanism: 'EAS',
    categories: ['Substitution'],
    groups: ['aromatic'],
    difficulty: 2,
    source: 'OpenStax OC \u00a716.2 \u2014 Nitration of Benzene',
    hints: {
      class: 'Mixed-acid generates the nitronium ion NO\u2082\u207a \u2014 a classic EAS electrophile.',
      site: { text: 'Same EAS pattern as bromination: ring attacks the electrophile, sigma complex forms, H\u207a leaves.' },
      arrow: 'H\u2082SO\u2084 protonates HNO\u2083 \u2192 loss of H\u2082O gives NO\u2082\u207a \u2192 ring attacks N \u2192 deprotonation.',
    },
    feedback: 'Nitration: the active electrophile is NO\u2082\u207a, generated from HNO\u2083/H\u2082SO\u2084. Substitutes one H.',
    walkthrough: [
      {
        title: 'Sulfuric acid protonates nitric acid',
        specific: 'H\u2082SO\u2084 is the stronger acid and donates a proton to one of the O\u2013H groups of HNO\u2083, giving H\u2082NO\u2083\u207a.',
        general: 'Many EAS reactions need a small acid/base equilibrium to generate the real electrophile in situ.',
      },
      {
        title: 'Water leaves \u2192 nitronium ion (NO\u2082\u207a)',
        specific: 'Loss of water from the protonated nitric acid gives the linear nitronium ion NO\u2082\u207a \u2014 the powerful electrophile that actually reacts with benzene.',
        general: 'The active electrophile is rarely the bottle reagent. Knowing what species is doing the chemistry is half the battle.',
      },
      {
        title: 'Ring attacks NO\u2082\u207a',
        specific: 'Benzene\u2019s \u03c0 electrons attack the central N of NO\u2082\u207a, forming a new C\u2013N bond and the familiar resonance-stabilized arenium (sigma complex).',
        general: 'Every EAS pathway uses the same sigma-complex intermediate. Only the identity of the electrophile changes.',
      },
      {
        title: 'Deprotonation restores aromaticity',
        specific: 'HSO\u2084\u207b removes the H from the sp\u00b3 ring carbon. The ring rebuilds its aromatic \u03c0 system and releases H\u2082SO\u2084.',
        general: 'Loss of H\u207a from the arenium is what makes the reaction substitution, not addition.',
      },
      {
        title: 'Product: nitrobenzene',
        specific: 'One H of benzene is replaced by an NO\u2082 group. The ring stays aromatic.',
        general: 'Nitration is one of the canonical EAS reactions. The NO\u2082 group is also a deactivating, meta-directing substituent for any subsequent EAS.',
      },
    ],
  },

  {
    id: 'pcc-cyclohexanol',
    substrate: 'cyclohexanol',
    reagent: 'PCC',
    conditions: 'CH\u2082Cl\u2082',
    product: 'cyclohexanone',
    distractors: ['cyclohexene', 'cyclohexyl_methyl_ether', 'benzene'],
    distractorWhy: {
      'cyclohexene': 'That would be dehydration — losing H₂O to form a π bond. PCC does the opposite: it removes one H from C and one H from O to form a C=O.',
      'cyclohexyl_methyl_ether': 'Etherification would need an alkylating agent and a base, not an oxidant. PCC has no carbon to donate.',
      'benzene': 'Full aromatization is far over-oxidation. PCC is intentionally mild — it stops at the carbonyl and never strips out three more H₂ to make a ring aromatic.',
    },
    mechanism: 'RedOx',
    groups: ['alcohol', 'ring-6'],
    difficulty: 2,
    source: 'OpenStax OC \u00a717.7 \u2014 Oxidation of Alcohols',
    hints: {
      class: 'PCC is a mild oxidant. It stops at the carbonyl \u2014 no over-oxidation to carboxylic acid.',
      site: { text: 'The C\u2013OH carbon loses two hydrogens (one from O, one from C) to form C=O.' },
      arrow: 'Alcohol \u2192 chromate ester \u2192 E2-like loss of Cr & H gives the ketone. Secondary alcohols become ketones.',
    },
    feedback: 'PCC oxidizes a 2\u00b0 alcohol to a ketone. It does not touch the ring or over-oxidize.',
    walkthrough: [
      {
        title: 'Alcohol bonds to chromium',
        specific: 'The OH oxygen of cyclohexanol attacks the Cr center of PCC, displacing a chloride and forming a Cr\u2013O bond \u2014 a chromate ester.',
        general: 'Cr(VI) reagents oxidize alcohols by first attaching to oxygen, then pulling two hydrogens off the same carbon.',
      },
      {
        title: 'O\u2013H proton lost to the counterion',
        specific: 'The pyridinium counterion of PCC removes the alcohol\u2019s O\u2013H proton, leaving a neutral chromate ester.',
        general: 'A weak base step that sets up the carbon for oxidation. Many oxidation mechanisms have an early deprotonation here.',
      },
      {
        title: 'E2-like elimination forms C=O',
        specific: 'A base takes the C\u2013H on the same carbon while the Cr\u2013O bond breaks. Those C\u2013H electrons flow into the C\u2013O bond, making it a double bond \u2014 a ketone.',
        general: 'The key oxidation step is geometrically just like an E2: anti-periplanar C\u2013H and metal\u2013O bonds break together to form a \u03c0 bond.',
      },
      {
        title: 'No further oxidation \u2014 it\u2019s a ketone',
        specific: 'Cyclohexanone has no more H on the carbonyl carbon, so PCC has nothing left to oxidize. It stops here.',
        general: 'PCC vs. Jones / K\u2082Cr\u2082O\u2087: PCC is mild and stops at aldehydes (from 1\u00b0 alcohols) or ketones (from 2\u00b0). Stronger oxidants take 1\u00b0 alcohols all the way to carboxylic acids.',
      },
      {
        title: 'Product: cyclohexanone',
        specific: 'A 2\u00b0 alcohol cleanly becomes a ketone. The ring is untouched.',
        general: 'Net outcome: lose two H\u2019s (one from C, one from O); form one C=O. Cr is reduced from Cr(VI) to Cr(IV).',
      },
    ],
  },

  {
    id: 'hbr-mark-isobutylene',
    substrate: 'isobutylene',
    reagent: 'HBr',
    conditions: 'CH\u2082Cl\u2082, 0 \u00b0C',
    product: 'tert-butyl-bromide',
    distractors: ['n-butanol', '2-butanol', 'isobutylene'],
    distractorWhy: {
      'n-butanol': 'No OH source in this flask. HBr adds H and Br across the π bond, not H and OH.',
      '2-butanol': 'Wrong nucleophile and wrong carbon skeleton. Isobutylene has a branch — the product keeps it.',
      'isobutylene': 'That is the starting material. Once HBr protonates the π bond, bromide captures the cation — the alkene does not just sit there.',
    },
    mechanism: 'Addition',
    groups: ['alkene'],
    difficulty: 1,
    source: 'OpenStax OC \u00a78.3 \u2014 Markovnikov Addition of HX',
    hints: {
      class: 'Alkene + HX \u2192 Markovnikov addition: H to less-substituted C, X to more-substituted C.',
      site: { bondKey: 'pi', text: 'The \u03c0 bond is protonated to give the more stable carbocation, which then captures Br\u207b.' },
      arrow: 'H\u207a adds to =CH\u2082, putting the + on the tertiary carbon. Br\u207b then attacks that cation.',
    },
    feedback: 'Markovnikov: H goes to the less substituted carbon so the more stable carbocation forms.',
    walkthrough: [
      {
        title: 'HBr protonates the alkene',
        specific: 'Isobutylene\u2019s \u03c0 electrons grab the H of HBr. The H adds to the =CH\u2082 end \u2014 the less substituted carbon.',
        general: 'In any acid-catalyzed alkene addition, the proton goes onto whichever carbon leaves the more stable cation behind.',
        highlightBondKey: 'pi',
      },
      {
        title: 'Tertiary carbocation forms',
        specific: 'Putting H on =CH\u2082 leaves a + on the central carbon, which already has two methyls and a methyl just added \u2014 a 3\u00b0 carbocation. Very stable.',
        general: 'Markovnikov\u2019s rule restated: cations form at the more substituted carbon because they are more stable (hyperconjugation + induction).',
      },
      {
        title: 'Bromide attacks the cation',
        specific: 'Br\u207b, just released from HBr, snaps onto the tertiary carbon to form the C\u2013Br bond.',
        general: 'Step 2 of addition is anion capture. The nucleophile is the counterion of the acid that just protonated the alkene.',
      },
      {
        title: 'Product: 2-bromo-2-methylpropane',
        specific: 'Bromine is on the central, tertiary carbon \u2014 tert-butyl bromide. The anti-Markovnikov product (isobutyl bromide) is minor.',
        general: 'Net outcome: H\u2013X adds across the \u03c0 bond. H on the less substituted C, X on the more substituted C.',
      },
    ],
  },

  {
    id: 'friedel-crafts-tbu',
    substrate: 'benzene',
    reagent: '(CH\u2083)\u2083CCl',
    conditions: 'AlCl\u2083',
    product: 'tert-butylbenzene',
    distractors: ['tert-butyl-bromide', 'bromobenzene', 'cyclohexyl_methyl_ether'],
    distractorWhy: {
      'tert-butyl-bromide': 'That is the starting alkyl halide, recovered. AlCl₃ ionizes it — the carbocation that forms then reacts with the ring; it does not just sit there.',
      'bromobenzene': 'Wrong halogen and wrong reaction. There is no Br₂ here, and Friedel–Crafts installs a carbon group on the ring, not a halogen.',
      'cyclohexyl_methyl_ether': 'Ether formation would need an alkoxide and a different ring. Friedel–Crafts alkylation builds a C–C bond to an aromatic ring, not a C–O bond.',
    },
    mechanism: 'EAS',
    categories: ['Substitution'],
    groups: ['aromatic'],
    difficulty: 2,
    source: 'OpenStax OC \u00a716.3 \u2014 Friedel\u2013Crafts Alkylation',
    hints: {
      class: 'Aryl ring + alkyl halide + Lewis-acid catalyst \u2192 Friedel\u2013Crafts alkylation (EAS variant).',
      site: { text: 'AlCl\u2083 strips Cl from the alkyl chloride, generating a carbocation that the ring then attacks.' },
      arrow: 'AlCl\u2083 + (CH\u2083)\u2083CCl \u2192 tert-butyl cation + AlCl\u2084\u207b. Ring attacks the cation \u2192 sigma complex \u2192 deprotonation.',
    },
    feedback: 'Friedel\u2013Crafts: the ring is alkylated. AlCl\u2083 generates a stable carbocation electrophile.',
    walkthrough: [
      {
        title: 'AlCl\u2083 ionizes the alkyl halide',
        specific: 'AlCl\u2083 (a strong Lewis acid) plucks Cl off (CH\u2083)\u2083CCl, generating AlCl\u2084\u207b and a free tert-butyl cation.',
        general: 'Friedel\u2013Crafts alkylation needs an alkyl carbocation as the electrophile. AlCl\u2083 (or FeCl\u2083) helps generate it from the alkyl halide.',
      },
      {
        title: 'Stable cation \u2014 no rearrangement',
        specific: 'The tert-butyl cation is already tertiary, so it has no incentive to shuffle hydrogens or methyls around. It stays put.',
        general: 'A famous limitation of Friedel\u2013Crafts: primary or secondary alkyl groups often rearrange before they reach the ring. Pick a substrate that gives a stable cation.',
      },
      {
        title: 'Ring attacks the cation',
        specific: 'Benzene\u2019s \u03c0 electrons attack the cation, forming a new C\u2013C bond and the resonance-stabilized arenium intermediate.',
        general: 'EAS step 1 again: the aromatic ring is the nucleophile, the cation is the electrophile, and the arenium is the intermediate.',
      },
      {
        title: 'Deprotonation restores aromaticity',
        specific: 'AlCl\u2084\u207b acts as a base, removing the H on the sp\u00b3 ring carbon. The aromatic \u03c0 system rebuilds and HCl is released.',
        general: 'Loss of H\u207a from the arenium is what differentiates EAS from simple alkene-style addition.',
      },
      {
        title: 'Product: tert-butylbenzene',
        specific: 'The ring carries a tert-butyl group. AlCl\u2083 cycles back out and is ready to ionize another alkyl halide.',
        general: 'Friedel\u2013Crafts alkylation installs an alkyl group on an aryl ring. A second alkylation is faster than the first (alkyl groups activate the ring), which is the second classic limitation.',
      },
    ],
  },
];

// \u2500\u2500 Indexes \u2500\u2500
const REACTION_BY_ID = Object.fromEntries(REACTIONS.map(r => [r.id, r]));

// Functional-group catalog (label + color). Order matters for sidebar.
const GROUPS = [
  { id: 'aromatic',  label: 'Aromatic',     color: '#F08667' },
  { id: 'alkene',    label: 'Alkene',       color: '#00AFB9' },
  { id: 'halide',    label: 'Alkyl halide', color: '#C96460' },
  { id: 'alcohol',   label: 'Alcohol',      color: '#9b59b6' },
  { id: 'ring-6',    label: '6-mem ring',   color: '#395C6B' },
  { id: 'primary',   label: '1\u00b0 Carbon',    color: '#6fa0af' },
  { id: 'secondary', label: '2\u00b0 Carbon',    color: '#6fa0af' },
  { id: 'tertiary',  label: '3\u00b0 Carbon',    color: '#6fa0af' },
];

const MECHANISMS = [
  { id: 'SN1',           label: 'SN1',          color: '#00AFB9' },
  { id: 'SN2',           label: 'SN2',          color: '#00AFB9' },
  { id: 'E1',            label: 'E1',           color: '#F08667' },
  { id: 'E2',            label: 'E2',           color: '#F08667' },
  { id: 'EAS',           label: 'EAS',          color: '#C96460' },
  { id: 'Addition',      label: 'Addition',     color: '#9b59b6' },
  { id: 'RedOx',         label: 'Redox',        color: '#395C6B' },
  { id: 'Ester',         label: 'Esterif.',     color: '#6fa0af' },
  // Broader parent categories — toggle these to grab any reaction tagged
  // with that family (e.g. "Substitution" matches SN1/SN2/EAS reactions).
  { id: 'Substitution',  label: 'Substitution', color: '#00AFB9', broad: true },
  { id: 'Elimination',   label: 'Elimination',  color: '#F08667', broad: true },
  { id: 'Rearrangement', label: 'Rearrang.',    color: '#9b59b6', broad: true },
];

Object.assign(window, { REACTIONS, REACTION_BY_ID, GROUPS, MECHANISMS });
