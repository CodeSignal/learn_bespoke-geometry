/**
 * Statement types, parsing, and display for proof steps.
 */

export type StatementKind =
  | 'points-distinct'
  | 'point-on-line'
  | 'line-equals-line'
  | 'rays-form-line'
  | 'unique-line'
  | 'intersection-equals'
  | 'angle-equals-constant'
  | 'angle-equals-angle'
  | 'angle-less-than-angle'
  | 'angle-greater-than-angle'
  | 'angle-leq-angle'
  | 'angle-geq-angle'
  | 'segment-equals-segment'
  | 'triangles-congruent'
  | 'triangle-angles-sum-180'
  | 'point-midpoint-of-segment';

export interface Statement {
  kind: StatementKind;
  pointNames: string[];
  constant?: number;
}

export const STATEMENT_POINT_COUNTS: Record<StatementKind, number> = {
  'points-distinct': 2,
  'point-on-line': 3,
  'line-equals-line': 4,
  'rays-form-line': 3,
  'unique-line': 2,
  'intersection-equals': 5,
  'angle-equals-constant': 3,
  'angle-equals-angle': 6,
  'angle-less-than-angle': 6,
  'angle-greater-than-angle': 6,
  'angle-leq-angle': 6,
  'angle-geq-angle': 6,
  'segment-equals-segment': 4,
  'triangles-congruent': 6,
  'triangle-angles-sum-180': 3,
  'point-midpoint-of-segment': 3,
};

/** All 6 permutations of (0,1,2) for trying second-triangle orderings. */
export const TRIANGLE_SECOND_PERMS: number[][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

function extractPointNames(text: string): string[] {
  const re = /[A-Za-z][A-Za-z0-9_]*/g;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    names.push(m[0]);
  }
  return names;
}

/** Parse a written outcome string into a Statement. Returns null if not recognized. */
export function parseOutcomeStatement(text: string): Statement | null {
  const t = text.trim();
  if (!t) return null;
  const names = extractPointNames(t);

  if (t.includes('≠') && names.length >= 2) {
    return { kind: 'points-distinct', pointNames: names.slice(0, 2) };
  }
  if ((t.includes('∈') || t.toLowerCase().includes(' in line ')) && names.length >= 3) {
    const lineA = names[names.length - 2];
    const lineB = names[names.length - 1];
    return { kind: 'point-on-line', pointNames: [names[0], lineA, lineB] };
  }
  if (t.includes('line ') && t.includes('=') && t.includes('line ') && names.length >= 4) {
    const [a, c, a2, b] = names.slice(0, 4);
    return { kind: 'line-equals-line', pointNames: [a, c, a2, b] };
  }
  if ((t.includes('ray ') && t.includes('∪') && t.includes('line ')) && names.length >= 3) {
    return { kind: 'rays-form-line', pointNames: names.slice(0, 3) };
  }
  if ((t.includes('∃') || t.toLowerCase().includes('unique')) && t.toLowerCase().includes('line') && names.length >= 2) {
    return { kind: 'unique-line', pointNames: names.slice(0, 2) };
  }
  if (t.includes('∩') && names.length >= 5) {
    return { kind: 'intersection-equals', pointNames: names.slice(0, 5) };
  }
  if (t.toLowerCase().includes('midpoint') && t.toLowerCase().includes('of')) {
    const letMatch = t.match(/let\s+(\w+)\s+be\s+midpoint\s+of\s+(\w+)/i);
    const isMatch = t.match(/(\w+)\s+is\s+midpoint\s+of\s+(\w+)/i);
    const beMatch = t.match(/(\w+)\s+be\s+midpoint\s+of\s+(\w+)/i);
    const match = letMatch || isMatch || beMatch;
    if (match) {
      const pointName = match[1];
      const seg = match[2];
      if (seg.length >= 2) {
        return { kind: 'point-midpoint-of-segment', pointNames: [pointName, seg[0], seg[1]] };
      }
    }
  }
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && t.includes('°')) {
    const degMatch = t.match(/(\d+(?:\.\d+)?)\s*°/);
    const constant = degMatch ? parseFloat(degMatch[1]) : undefined;
    let anglePoints = names.length >= 3 ? names.slice(0, 3) : null;
    if (!anglePoints && names.length === 1 && names[0].length === 3 && /^[A-Za-z][A-Za-z][A-Za-z]$/.test(names[0])) {
      anglePoints = [names[0][0], names[0][1], names[0][2]];
    }
    if (anglePoints) return { kind: 'angle-equals-constant', pointNames: anglePoints, constant };
  }
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && t.includes('=') && names.length >= 6) {
    return { kind: 'angle-equals-angle', pointNames: names.slice(0, 6) };
  }
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && t.includes('=') && names.length === 2) {
    const [a, b] = names;
    if (a.length === 3 && b.length === 3 && /^[A-Za-z]{3}$/.test(a) && /^[A-Za-z]{3}$/.test(b)) {
      return { kind: 'angle-equals-angle', pointNames: [a[0], a[1], a[2], b[0], b[1], b[2]] };
    }
  }
  const angleCompare = (kind: StatementKind) => {
    if (names.length >= 6) return { kind, pointNames: names.slice(0, 6) };
    if (names.length === 2 && names[0].length === 3 && names[1].length === 3 && /^[A-Za-z]{3}$/.test(names[0]) && /^[A-Za-z]{3}$/.test(names[1])) {
      return { kind, pointNames: [names[0][0], names[0][1], names[0][2], names[1][0], names[1][1], names[1][2]] };
    }
    return null;
  };
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && (t.includes('≤') || t.includes('\\leq'))) {
    const st = angleCompare('angle-leq-angle');
    if (st) return st;
  }
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && (t.includes('≥') || t.includes('\\geq'))) {
    const st = angleCompare('angle-geq-angle');
    if (st) return st;
  }
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && t.includes('<') && !t.includes('≤')) {
    const st = angleCompare('angle-less-than-angle');
    if (st) return st;
  }
  if ((t.includes('∠') || t.toLowerCase().includes('angle')) && t.includes('>') && !t.includes('≥')) {
    const st = angleCompare('angle-greater-than-angle');
    if (st) return st;
  }
  if (t.includes('=') && names.length >= 2 && !t.includes('line ') && !t.includes('ray ')) {
    const twoSides = t.split('=').map((s) => s.trim());
    if (twoSides.length >= 2 && twoSides[0].length >= 1 && twoSides[1].length >= 1) {
      const left = extractPointNames(twoSides[0]);
      const right = extractPointNames(twoSides[1]);
      if (left.length >= 2 && right.length >= 2) {
        return {
          kind: 'segment-equals-segment',
          pointNames: [left[0], left[1], right[0], right[1]],
        };
      }
      if (left.length === 1 && right.length === 1 && left[0].length === 2 && right[0].length === 2 && /^[A-Za-z][A-Za-z]$/.test(left[0]) && /^[A-Za-z][A-Za-z]$/.test(right[0])) {
        return {
          kind: 'segment-equals-segment',
          pointNames: [left[0][0], left[0][1], right[0][0], right[0][1]],
        };
      }
    }
    if (names.length >= 4) return { kind: 'segment-equals-segment', pointNames: names.slice(0, 4) };
  }
  if ((t.toLowerCase().includes('triangle') && (t.includes('180') || t.includes('°'))) || (t.includes('∠') && t.includes('+') && t.includes('180'))) {
    let tri: string[] | null = null;
    const threeLetter = names.find((n) => n.length === 3 && /^[A-Za-z]{3}$/.test(n));
    if (threeLetter) tri = [threeLetter[0], threeLetter[1], threeLetter[2]];
    else if (names.length >= 3) tri = names.slice(0, 3);
    if (tri) return { kind: 'triangle-angles-sum-180', pointNames: tri };
  }
  if (t.includes('≅') || t.toLowerCase().includes('congruent')) {
    if (names.length >= 6) return { kind: 'triangles-congruent', pointNames: names.slice(0, 6) };
    if (names.length === 2 && names[0].length === 3 && names[1].length === 3 && /^[A-Za-z]{3}$/.test(names[0]) && /^[A-Za-z]{3}$/.test(names[1])) {
      return {
        kind: 'triangles-congruent',
        pointNames: [names[0][0], names[0][1], names[0][2], names[1][0], names[1][1], names[1][2]],
      };
    }
  }
  return null;
}

/** Human-readable string for a statement. */
export function statementToString(s: Statement): string {
  switch (s.kind) {
    case 'points-distinct':
      return `${s.pointNames[0]} ≠ ${s.pointNames[1]}`;
    case 'point-on-line':
      return `${s.pointNames[0]} ∈ line ${s.pointNames[1]}${s.pointNames[2]}`;
    case 'line-equals-line':
      return `line ${s.pointNames[0]}${s.pointNames[1]} = line ${s.pointNames[2]}${s.pointNames[3]}`;
    case 'rays-form-line':
      return `ray ${s.pointNames[0]}${s.pointNames[1]} ∪ ray ${s.pointNames[2]}${s.pointNames[1]} = line ${s.pointNames[0]}${s.pointNames[1]}`;
    case 'unique-line':
      return `∃₁ line through ${s.pointNames[0]}, ${s.pointNames[1]}`;
    case 'intersection-equals':
      return `${s.pointNames[0]} = line ${s.pointNames[1]}${s.pointNames[2]} ∩ line ${s.pointNames[3]}${s.pointNames[4]}`;
    case 'angle-equals-constant':
      return `∠${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} = ${s.constant ?? '·'}°`;
    case 'angle-equals-angle':
      return `∠${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} = ∠${s.pointNames[3]}${s.pointNames[4]}${s.pointNames[5]}`;
    case 'angle-less-than-angle':
      return `∠${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} < ∠${s.pointNames[3]}${s.pointNames[4]}${s.pointNames[5]}`;
    case 'angle-greater-than-angle':
      return `∠${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} > ∠${s.pointNames[3]}${s.pointNames[4]}${s.pointNames[5]}`;
    case 'angle-leq-angle':
      return `∠${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} ≤ ∠${s.pointNames[3]}${s.pointNames[4]}${s.pointNames[5]}`;
    case 'angle-geq-angle':
      return `∠${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} ≥ ∠${s.pointNames[3]}${s.pointNames[4]}${s.pointNames[5]}`;
    case 'segment-equals-segment':
      return `${s.pointNames[0]}${s.pointNames[1]} = ${s.pointNames[2]}${s.pointNames[3]}`;
    case 'triangles-congruent':
      return `Δ${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} ≅ Δ${s.pointNames[3]}${s.pointNames[4]}${s.pointNames[5]}`;
    case 'triangle-angles-sum-180':
      return `angles of Δ${s.pointNames[0]}${s.pointNames[1]}${s.pointNames[2]} sum to 180°`;
    case 'point-midpoint-of-segment':
      return `${s.pointNames[0]} is midpoint of ${s.pointNames[1]}${s.pointNames[2]}`;
    default:
      return String((s as Statement).kind);
  }
}
