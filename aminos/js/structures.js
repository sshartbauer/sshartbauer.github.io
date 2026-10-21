/* Skeletal (line-angle) structure builder + SVG renderer.
   Coordinates are in bond-length units; angles in degrees with
   0 = right, 90 = down (SVG convention). Carbons are implicit vertices;
   heteroatoms carry labels, and bonds are trimmed so they stop short of them. */
(function (global) {
  'use strict';
  const RAD = Math.PI / 180;

  // Atom label: element plus optional attached hydrogens drawn on one side.
  function L(el, h, side) { return { el, h: h || 0, side: side || 'right' }; }

  function Mol() { this.atoms = {}; this.bonds = []; this.rings = []; }

  Mol.prototype.at = function (id, x, y, label) {
    this.atoms[id] = { id, x, y, label: typeof label === 'string' ? L(label) : (label || null) };
    return this;
  };

  // Place `id` one bond from `from` at `angle`, bonded with `order`.
  Mol.prototype.add = function (id, from, angle, label, order) {
    const a = this.atoms[from];
    this.at(id, a.x + Math.cos(angle * RAD), a.y + Math.sin(angle * RAD), label);
    this.bonds.push({ a: from, b: id, order: order || 1 });
    return this;
  };

  // Regular ring hanging off existing atom ids[0], centred along `angle`.
  // orders[k] is the bond ids[k]–ids[k+1] (the last one closes the ring).
  Mol.prototype.ringFrom = function (ids, angle, orders, labels) {
    const n = ids.length, a = this.atoms[ids[0]];
    const R = 1 / (2 * Math.sin(Math.PI / n));
    const cx = a.x + R * Math.cos(angle * RAD), cy = a.y + R * Math.sin(angle * RAD);
    for (let k = 1; k < n; k++) {
      const t = (angle + 180 + k * 360 / n) * RAD;
      this.at(ids[k], cx + R * Math.cos(t), cy + R * Math.sin(t), labels && labels[ids[k]]);
    }
    for (let k = 0; k < n; k++) {
      this.bonds.push({ a: ids[k], b: ids[(k + 1) % n], order: (orders && orders[k]) || 1 });
    }
    const ring = { ids, x: cx, y: cy };
    this.rings.push(ring);
    return ring;
  };

  // Regular ring on the existing bond ids[0]–ids[n-1], built on the side away
  // from `away` (an atom id or any {x, y}). That closing bond must already exist.
  Mol.prototype.ringOnEdge = function (ids, away, orders, labels) {
    const n = ids.length, a = this.atoms[ids[0]], b = this.atoms[ids[n - 1]];
    const p = typeof away === 'string' ? this.atoms[away] : away;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let px = -(b.y - a.y), py = b.x - a.x;
    const len = Math.hypot(px, py); px /= len; py /= len;
    if ((p.x - mx) * px + (p.y - my) * py > 0) { px = -px; py = -py; }
    const apothem = 0.5 / Math.tan(Math.PI / n), R = 1 / (2 * Math.sin(Math.PI / n));
    const cx = mx + px * apothem, cy = my + py * apothem;
    const ta = Math.atan2(a.y - cy, a.x - cx), tb = Math.atan2(b.y - cy, b.x - cx);
    let step = 2 * Math.PI / n;
    if (Math.cos(ta - step - tb) < 0.999) step = -step; // walk so that b comes last
    for (let k = 1; k < n - 1; k++) {
      this.at(ids[k], cx + R * Math.cos(ta + k * step), cy + R * Math.sin(ta + k * step), labels && labels[ids[k]]);
    }
    for (let k = 0; k < n - 1; k++) {
      this.bonds.push({ a: ids[k], b: ids[k + 1], order: (orders && orders[k]) || 1 });
    }
    const ring = { ids, x: cx, y: cy };
    this.rings.push(ring);
    return ring;
  };

  // ── Rendering ─────────────────────────────────────────────
  const LABEL_GAP = 0.3;    // bond trimmed this far from a labelled atom
  const DBL_INNER = 0.17;   // ring double bond: inner line offset
  const DBL_TRIM = 0.14;    // ring double bond: inner line shortened at each end
  const DBL_SPLIT = 0.085;  // acyclic double bond: half-spacing of the pair

  const f = n => +n.toFixed(2);
  const line = (x1, y1, x2, y2) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;

  function labelSvg(atom, S, fs) {
    const x = atom.x * S, y = atom.y * S, lab = atom.label, hw = fs * 0.36;
    let out = `<text x="${f(x)}" y="${f(y)}" text-anchor="middle">${lab.el}</text>`;
    if (!lab.h) return out;
    const sub = lab.h > 1 ? `<tspan class="sub" font-size="${f(fs * 0.68)}" dy="${f(fs * 0.3)}">${lab.h}</tspan>` : '';
    const h = 'H' + sub;
    if (lab.side === 'right') out += `<text x="${f(x + hw)}" y="${f(y)}" text-anchor="start">${h}</text>`;
    else if (lab.side === 'left') out += `<text x="${f(x - hw)}" y="${f(y)}" text-anchor="end">${h}</text>`;
    else if (lab.side === 'up') out += `<text x="${f(x)}" y="${f(y - fs * 0.95)}" text-anchor="middle">${h}</text>`;
    else out += `<text x="${f(x)}" y="${f(y + fs * 0.95)}" text-anchor="middle">${h}</text>`;
    return out;
  }

  function render(mol, opts) {
    opts = opts || {};
    const S = opts.scale || 40, fs = S * 0.44;
    const atoms = Object.values(mol.atoms);

    // Bounding box, padded for labels and their hydrogens.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const a of atoms) {
      let l = 0, r = 0, u = 0, d = 0;
      if (a.label) {
        l = r = 0.25; u = d = 0.28;
        if (a.label.h) {
          const w = a.label.h > 1 ? 0.62 : 0.46;
          if (a.label.side === 'right') r += w;
          else if (a.label.side === 'left') l += w;
          else if (a.label.side === 'up') u += 0.42;
          else d += 0.42;
        }
      }
      x0 = Math.min(x0, a.x - l); x1 = Math.max(x1, a.x + r);
      y0 = Math.min(y0, a.y - u); y1 = Math.max(y1, a.y + d);
    }
    const pad = 0.3;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;

    let bonds = '';
    for (const b of mol.bonds) {
      const A = mol.atoms[b.a], B = mol.atoms[b.b];
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const sa = A.label ? LABEL_GAP : 0, sb = B.label ? LABEL_GAP : 0;
      const ax = A.x + ux * sa, ay = A.y + uy * sa, bx = B.x - ux * sb, by = B.y - uy * sb;

      if (b.order === 1) { bonds += line(ax * S, ay * S, bx * S, by * S); continue; }

      let nx = -uy, ny = ux;
      // Search newest ring first so a fused edge draws inside the ring added last.
      const ring = mol.rings.slice().reverse().find(r => r.ids.includes(b.a) && r.ids.includes(b.b));
      if (ring) {
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        if ((ring.x - mx) * nx + (ring.y - my) * ny < 0) { nx = -nx; ny = -ny; }
        const ta = A.label ? 0 : DBL_TRIM, tb = B.label ? 0 : DBL_TRIM;
        bonds += line(ax * S, ay * S, bx * S, by * S);
        bonds += line((ax + ux * ta + nx * DBL_INNER) * S, (ay + uy * ta + ny * DBL_INNER) * S,
                      (bx - ux * tb + nx * DBL_INNER) * S, (by - uy * tb + ny * DBL_INNER) * S);
      } else {
        for (const s of [-1, 1]) {
          const ox = nx * DBL_SPLIT * s, oy = ny * DBL_SPLIT * s;
          bonds += line((ax + ox) * S, (ay + oy) * S, (bx + ox) * S, (by + oy) * S);
        }
      }
    }

    const labels = atoms.filter(a => a.label).map(a => labelSvg(a, S, fs)).join('');
    const w = (x1 - x0) * S, h = (y1 - y0) * S;
    return `<svg class="mol" xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0 * S)} ${f(y0 * S)} ${f(w)} ${f(h)}" ` +
      `width="${f(w)}" height="${f(h)}" role="img" aria-label="${opts.alt || 'structure'}">` +
      `<g class="mol-bonds" stroke-width="${f(S * 0.055)}" stroke-linecap="round">${bonds}</g>` +
      `<g class="mol-labels" font-size="${f(fs)}" dominant-baseline="central">${labels}</g></svg>`;
  }

  global.RecallStructures = { Mol, L, render };
})(window);
