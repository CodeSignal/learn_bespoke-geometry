/**
 * Proof reasons (axioms, theorems, definitions), substitution, and structural equality.
 */

import type { ResolvedContext } from './context.js';
import { checkStatement } from './check.js';
import type { Statement } from './statements.js';
import { statementToString } from './statements.js';

export type ReasonType = 'axiom' | 'theorem' | 'definition';

export interface ReasonSchema {
  id: string;
  name: string;
  reasonType: ReasonType;
  premises: Statement[];
  conclusion: Statement;
  disabled?: boolean;
}

export const REASON_GIVEN = 'given';
export const REASON_DEFINITION = 'definition';

export const REASONS: ReasonSchema[] = [
  { id: REASON_GIVEN, name: 'Given in task statement', reasonType: 'axiom', premises: [], conclusion: { kind: 'points-distinct', pointNames: ['A', 'B'] } },
  { id: REASON_DEFINITION, name: 'Definition', reasonType: 'definition', premises: [], conclusion: { kind: 'point-on-line', pointNames: ['P', 'A', 'B'] } },
  { id: 'line-determination', name: 'Incidence axiom I1 (two points determine a unique line)', reasonType: 'axiom', premises: [{ kind: 'points-distinct', pointNames: ['A', 'B'] }], conclusion: { kind: 'unique-line', pointNames: ['A', 'B'] } },
  { id: 'point-on-line-same-line', name: 'By I1 (point on line: line AC = line AB)', reasonType: 'theorem', premises: [{ kind: 'point-on-line', pointNames: ['C', 'A', 'B'] }], conclusion: { kind: 'line-equals-line', pointNames: ['A', 'C', 'A', 'B'] } },
  { id: 'opposite-rays-form-line', name: 'Theorem: opposite rays lie on one line', reasonType: 'theorem', premises: [{ kind: 'rays-form-line', pointNames: ['A', 'B', 'C'] }], conclusion: { kind: 'rays-form-line', pointNames: ['A', 'B', 'C'] } },
  { id: 'reflexivity', name: 'Reflexivity (AB = AB or ∠A = ∠A)', reasonType: 'definition', premises: [], conclusion: { kind: 'segment-equals-segment', pointNames: ['A', 'B', 'A', 'B'] } },
  { id: 'transitivity-equals', name: 'Transitivity (=)', reasonType: 'theorem', premises: [{ kind: 'angle-equals-constant', pointNames: ['A', 'M', 'C'] }, { kind: 'angle-equals-constant', pointNames: ['A', 'M', 'B'] }], conclusion: { kind: 'angle-equals-angle', pointNames: ['A', 'M', 'C', 'A', 'M', 'B'] } },
  { id: 'transitivity-less', name: 'Transitivity (<)', reasonType: 'theorem', premises: [{ kind: 'angle-less-than-angle', pointNames: ['A', 'M', 'B', 'C', 'N', 'D'] }, { kind: 'angle-less-than-angle', pointNames: ['C', 'N', 'D', 'E', 'P', 'F'] }], conclusion: { kind: 'angle-less-than-angle', pointNames: ['A', 'M', 'B', 'E', 'P', 'F'] } },
  { id: 'transitivity-greater', name: 'Transitivity (>)', reasonType: 'theorem', premises: [{ kind: 'angle-greater-than-angle', pointNames: ['A', 'M', 'B', 'C', 'N', 'D'] }, { kind: 'angle-greater-than-angle', pointNames: ['C', 'N', 'D', 'E', 'P', 'F'] }], conclusion: { kind: 'angle-greater-than-angle', pointNames: ['A', 'M', 'B', 'E', 'P', 'F'] } },
  { id: 'transitivity-leq', name: 'Transitivity (≤)', reasonType: 'theorem', premises: [{ kind: 'angle-leq-angle', pointNames: ['A', 'M', 'B', 'C', 'N', 'D'] }, { kind: 'angle-leq-angle', pointNames: ['C', 'N', 'D', 'E', 'P', 'F'] }], conclusion: { kind: 'angle-leq-angle', pointNames: ['A', 'M', 'B', 'E', 'P', 'F'] } },
  { id: 'transitivity-geq', name: 'Transitivity (≥)', reasonType: 'theorem', premises: [{ kind: 'angle-geq-angle', pointNames: ['A', 'M', 'B', 'C', 'N', 'D'] }, { kind: 'angle-geq-angle', pointNames: ['C', 'N', 'D', 'E', 'P', 'F'] }], conclusion: { kind: 'angle-geq-angle', pointNames: ['A', 'M', 'B', 'E', 'P', 'F'] } },
  { id: 'sas', name: 'Triangle congruence (SAS)', reasonType: 'theorem', premises: [{ kind: 'segment-equals-segment', pointNames: ['A', 'M', 'A', 'M'] }, { kind: 'segment-equals-segment', pointNames: ['B', 'M', 'M', 'C'] }, { kind: 'angle-equals-angle', pointNames: ['A', 'M', 'B', 'A', 'M', 'C'] }], conclusion: { kind: 'triangles-congruent', pointNames: ['A', 'M', 'B', 'A', 'M', 'C'] } },
  { id: 'asa', name: 'Triangle congruence (ASA)', reasonType: 'theorem', premises: [{ kind: 'angle-equals-angle', pointNames: ['C', 'A', 'B', 'F', 'D', 'E'] }, { kind: 'segment-equals-segment', pointNames: ['A', 'B', 'D', 'E'] }, { kind: 'angle-equals-angle', pointNames: ['A', 'B', 'C', 'D', 'E', 'F'] }], conclusion: { kind: 'triangles-congruent', pointNames: ['A', 'B', 'C', 'D', 'E', 'F'] } },
  { id: 'aas', name: 'Triangle congruence (AAS)', reasonType: 'theorem', premises: [{ kind: 'angle-equals-angle', pointNames: ['C', 'A', 'B', 'F', 'D', 'E'] }, { kind: 'angle-equals-angle', pointNames: ['A', 'B', 'C', 'D', 'E', 'F'] }, { kind: 'segment-equals-segment', pointNames: ['B', 'C', 'E', 'F'] }], conclusion: { kind: 'triangles-congruent', pointNames: ['A', 'B', 'C', 'D', 'E', 'F'] } },
  { id: 'sss', name: 'Triangle congruence (SSS)', reasonType: 'theorem', premises: [{ kind: 'segment-equals-segment', pointNames: ['A', 'B', 'D', 'E'] }, { kind: 'segment-equals-segment', pointNames: ['B', 'C', 'E', 'F'] }, { kind: 'segment-equals-segment', pointNames: ['C', 'A', 'F', 'D'] }], conclusion: { kind: 'triangles-congruent', pointNames: ['A', 'B', 'C', 'D', 'E', 'F'] } },
  { id: 'hl', name: 'Triangle congruence (HL)', reasonType: 'theorem', premises: [{ kind: 'angle-equals-constant', pointNames: ['A', 'B', 'C'] }, { kind: 'angle-equals-constant', pointNames: ['D', 'E', 'F'] }, { kind: 'segment-equals-segment', pointNames: ['A', 'C', 'D', 'F'] }, { kind: 'segment-equals-segment', pointNames: ['A', 'B', 'D', 'E'] }], conclusion: { kind: 'triangles-congruent', pointNames: ['A', 'B', 'C', 'D', 'E', 'F'] } },
  { id: 'from-congruence', name: 'From congruence (CPCTC): corresponding sides equal', reasonType: 'theorem', premises: [{ kind: 'triangles-congruent', pointNames: ['A', 'M', 'B', 'A', 'M', 'C'] }], conclusion: { kind: 'segment-equals-segment', pointNames: ['A', 'B', 'A', 'C'] } },
  { id: 'sum-triangle-angles', name: 'Sum of triangle angles', reasonType: 'theorem', premises: [], conclusion: { kind: 'triangle-angles-sum-180', pointNames: ['A', 'B', 'C'] } },
  { id: 'thales', name: 'Thales theorem', reasonType: 'theorem', premises: [], conclusion: { kind: 'angle-equals-constant', pointNames: ['A', 'B', 'C'], constant: 90 } },
];

export function statementsEqual(a: Statement, b: Statement): boolean {
  if (a.kind !== b.kind || a.pointNames.length !== b.pointNames.length) return false;
  return a.pointNames.every((p, i) => p === b.pointNames[i]);
}

export function segmentStatementKey(s: Statement): string {
  if (s.kind !== 'segment-equals-segment' || s.pointNames.length < 4) return '';
  const [a, b, c, d] = s.pointNames;
  const seg1 = [a < b ? a : b, a < b ? b : a].join(',');
  const seg2 = [c < d ? c : d, c < d ? d : c].join(',');
  const first = seg1 < seg2 ? seg1 : seg2;
  const second = seg1 < seg2 ? seg2 : seg1;
  return `${first}|${second}`;
}

function angleTripleKey(p0: string, p1: string, p2: string): string {
  const other = p0 < p2 ? `${p0},${p2}` : `${p2},${p0}`;
  return `${p1}:${other}`;
}

function angleConstantStatementKey(s: Statement): string {
  if (s.kind !== 'angle-equals-constant' || s.pointNames.length < 3) return '';
  return angleTripleKey(s.pointNames[0], s.pointNames[1], s.pointNames[2]);
}

function angleStatementKey(s: Statement): string {
  if (s.kind !== 'angle-equals-angle' || s.pointNames.length < 6) return '';
  const k1 = angleTripleKey(s.pointNames[0], s.pointNames[1], s.pointNames[2]);
  const k2 = angleTripleKey(s.pointNames[3], s.pointNames[4], s.pointNames[5]);
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

export function statementsEqualStructural(a: Statement, b: Statement): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'segment-equals-segment') return segmentStatementKey(a) === segmentStatementKey(b);
  if (a.kind === 'angle-equals-constant') return angleConstantStatementKey(a) === angleConstantStatementKey(b);
  if (a.kind === 'angle-equals-angle') return angleStatementKey(a) === angleStatementKey(b);
  return statementsEqual(a, b);
}

function substitute(stmt: Statement, map: Map<string, string>): Statement {
  const names = stmt.pointNames.map((n) => map.get(n) ?? n);
  const out: Statement = { kind: stmt.kind, pointNames: names };
  if (stmt.constant != null) out.constant = stmt.constant;
  return out;
}

/**
 * Substitute a premise using occurrence order for matching prerequisites to conclusion.
 * Exported for use in verify.ts.
 */
export function substitutePremiseByOccurrence(
  premise: Statement,
  conclusionPointNames: string[],
  outcomePointNames: string[],
  used: Map<string, number>
): Statement | null {
  const pointNames: string[] = [];
  for (const ph of premise.pointNames) {
    const k = used.get(ph) ?? 0;
    let count = 0;
    let found = false;
    for (let i = 0; i < conclusionPointNames.length; i++) {
      if (conclusionPointNames[i] === ph) {
        if (count === k) {
          pointNames.push(outcomePointNames[i]);
          used.set(ph, k + 1);
          found = true;
          break;
        }
        count++;
      }
    }
    if (!found) return null;
  }
  return { kind: premise.kind, pointNames };
}

export function getConclusionForReason(reasonId: string, pointNames: string[]): Statement | null {
  if (reasonId === REASON_GIVEN || reasonId === REASON_DEFINITION || reasonId === 'reflexivity') return null;
  const reason = REASONS.find((r) => r.id === reasonId);
  if (!reason || reason.disabled) return null;
  const uniq: string[] = [];
  for (const p of reason.conclusion.pointNames) {
    if (!uniq.includes(p)) uniq.push(p);
  }
  const map = new Map<string, string>();
  uniq.forEach((p, i) => {
    if (i < pointNames.length) map.set(p, pointNames[i]);
  });
  return substitute(reason.conclusion, map);
}

export function verifyReasonApplication(
  ctx: ResolvedContext,
  reasonId: string,
  pointNames: string[]
): { ok: boolean; message: string } {
  const reason = REASONS.find((r) => r.id === reasonId);
  if (!reason || reason.disabled) return { ok: false, message: 'Unknown or disabled reason.' };

  const placeholders = ['A', 'B', 'C'];
  const map = new Map<string, string>();
  placeholders.forEach((p, i) => {
    if (i < pointNames.length) map.set(p, pointNames[i]);
  });

  for (const prem of reason.premises) {
    const sub = substitute(prem, map);
    if (!checkStatement(ctx, sub)) {
      return { ok: false, message: `Premise not satisfied: ${statementToString(sub)}` };
    }
  }

  const concl = substitute(reason.conclusion, map);
  if (!checkStatement(ctx, concl)) {
    return { ok: false, message: `Conclusion does not hold: ${statementToString(concl)}` };
  }

  return { ok: true, message: statementToString(concl) };
}
