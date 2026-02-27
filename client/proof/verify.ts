/**
 * Proof step verification: resolve prerequisites and validate each step.
 */

import type { ResolvedContext } from './context.js';
import { checkStatement } from './check.js';
import type { Statement } from './statements.js';
import { statementToString } from './statements.js';
import { TRIANGLE_SECOND_PERMS } from './statements.js';
import {
  REASONS,
  REASON_GIVEN,
  REASON_DEFINITION,
  statementsEqual,
  statementsEqualStructural,
  segmentStatementKey,
  substitutePremiseByOccurrence,
} from './reasons.js';

export type PrerequisiteRef = 'given' | number;

export interface ProofStep {
  outcome: Statement;
  reasonId: string;
  prerequisiteRefs: PrerequisiteRef[];
}

function getPrerequisiteStatements(
  stepIndex: number,
  prerequisiteRefs: PrerequisiteRef[],
  previousSteps: ProofStep[],
  taskGivens: Statement[]
): Statement[] {
  const out: Statement[] = [];
  for (const ref of prerequisiteRefs) {
    if (ref === 'given') {
      taskGivens.forEach((s) => out.push(s));
    } else if (typeof ref === 'number' && ref >= 1 && ref <= stepIndex) {
      out.push(previousSteps[ref - 1].outcome);
    }
  }
  return out;
}

export function verifyStep(
  ctx: ResolvedContext,
  step: ProofStep,
  previousSteps: ProofStep[],
  taskGivens: Statement[] = []
): { ok: boolean; message: string } {
  const stepIndex = previousSteps.length + 1;
  const reason = REASONS.find((r) => r.id === step.reasonId);

  if (step.reasonId === REASON_GIVEN) {
    if (taskGivens.length === 0) {
      return { ok: true, message: statementToString(step.outcome) };
    }
    const matches = taskGivens.some((g) => statementsEqual(g, step.outcome));
    return matches
      ? { ok: true, message: statementToString(step.outcome) }
      : { ok: false, message: `"${statementToString(step.outcome)}" is not in the task givens.` };
  }

  if (step.reasonId === REASON_DEFINITION) {
    const ok = checkStatement(ctx, step.outcome);
    return ok
      ? { ok: true, message: statementToString(step.outcome) }
      : { ok: false, message: `Not satisfied in construction: ${statementToString(step.outcome)}` };
  }

  if (!reason || reason.disabled) return { ok: false, message: 'Unknown or disabled reason.' };

  if (step.reasonId === 'reflexivity') {
    if (step.outcome.kind === 'segment-equals-segment' && step.outcome.pointNames.length === 4) {
      const [a, b, c, d] = step.outcome.pointNames;
      if (a === c && b === d) return { ok: true, message: statementToString(step.outcome) };
      return { ok: false, message: 'Reflexivity requires the same segment on both sides (e.g. AB = AB).' };
    }
    if (step.outcome.kind === 'angle-equals-angle' && step.outcome.pointNames.length === 6) {
      const [a, m, b, a2, m2, b2] = step.outcome.pointNames;
      if (a === a2 && m === m2 && b === b2) return { ok: true, message: statementToString(step.outcome) };
      return { ok: false, message: 'Reflexivity requires the same angle on both sides (e.g. ∠AMB = ∠AMB).' };
    }
    return { ok: false, message: 'Reflexivity: outcome must be AB = AB or ∠AMB = ∠AMB (same segment or angle twice).' };
  }
  if (step.reasonId === 'thales') {
    if (step.outcome.kind !== 'angle-equals-constant' || step.outcome.pointNames.length !== 3) {
      return { ok: false, message: 'Thales: conclusion must be a right angle (e.g. ∠ABC = 90°).' };
    }
    if (step.outcome.constant !== 90) {
      return { ok: false, message: 'Thales theorem applies to a right angle (90°).' };
    }
    return { ok: true, message: statementToString(step.outcome) };
  }
  if (step.reasonId === 'sum-triangle-angles') {
    if (step.outcome.kind !== 'triangle-angles-sum-180' || step.outcome.pointNames.length !== 3) {
      return { ok: false, message: 'Conclusion must be: angles of a triangle sum to 180° (e.g. triangle ABC).' };
    }
    return { ok: true, message: statementToString(step.outcome) };
  }

  const prereqStatements = getPrerequisiteStatements(
    stepIndex,
    step.prerequisiteRefs,
    previousSteps,
    taskGivens
  );
  if (prereqStatements.length < reason.premises.length) {
    return { ok: false, message: `This reason requires ${reason.premises.length} prerequisite(s).` };
  }

  if (step.reasonId === 'transitivity-equals' && prereqStatements.length >= 2 &&
      prereqStatements[0]?.kind === 'angle-equals-angle' && prereqStatements[1]?.kind === 'angle-equals-angle') {
    const [p0, p1] = [prereqStatements[0], prereqStatements[1]];
    const mid0 = [p0.pointNames[3], p0.pointNames[4], p0.pointNames[5]];
    const mid1 = [p1.pointNames[0], p1.pointNames[1], p1.pointNames[2]];
    if (mid0[0] !== mid1[0] || mid0[1] !== mid1[1] || mid0[2] !== mid1[2]) {
      return { ok: false, message: 'Middle term must match: second angle of first prerequisite = first angle of second.' };
    }
    if (step.outcome.kind !== 'angle-equals-angle' || step.outcome.pointNames.length !== 6) {
      return { ok: false, message: 'Conclusion should be: angle-equals-angle (first angle of prerequisite 1, second of prerequisite 2).' };
    }
    const outFirst = [step.outcome.pointNames[0], step.outcome.pointNames[1], step.outcome.pointNames[2]];
    const outSecond = [step.outcome.pointNames[3], step.outcome.pointNames[4], step.outcome.pointNames[5]];
    const p0First = [p0.pointNames[0], p0.pointNames[1], p0.pointNames[2]];
    const p1Second = [p1.pointNames[3], p1.pointNames[4], p1.pointNames[5]];
    if (outFirst[0] !== p0First[0] || outFirst[1] !== p0First[1] || outFirst[2] !== p0First[2] ||
        outSecond[0] !== p1Second[0] || outSecond[1] !== p1Second[1] || outSecond[2] !== p1Second[2]) {
      return { ok: false, message: 'Conclusion must be: first angle of prerequisite 1, second angle of prerequisite 2.' };
    }
    return { ok: true, message: statementToString(step.outcome) };
  }

  const chainReasonIds = ['transitivity-less', 'transitivity-greater', 'transitivity-leq', 'transitivity-geq'];
  if (chainReasonIds.includes(step.reasonId)) {
    const [p0, p1] = [prereqStatements[0], prereqStatements[1]];
    const kind = reason.conclusion.kind;
    if (!p0 || !p1 || p0.kind !== kind || p1.kind !== kind) {
      return { ok: false, message: `Prerequisites must be two ${statementToString(reason.conclusion)}-type statements.` };
    }
    const mid0 = [p0.pointNames[3], p0.pointNames[4], p0.pointNames[5]];
    const mid1 = [p1.pointNames[0], p1.pointNames[1], p1.pointNames[2]];
    if (mid0[0] !== mid1[0] || mid0[1] !== mid1[1] || mid0[2] !== mid1[2]) {
      return { ok: false, message: 'Middle term must match: second angle of first prerequisite = first angle of second.' };
    }
    if (step.outcome.kind !== kind || step.outcome.pointNames.length !== 6) {
      return { ok: false, message: `Conclusion should be: ${statementToString(reason.conclusion)} (with your point names).` };
    }
    const outFirst = [step.outcome.pointNames[0], step.outcome.pointNames[1], step.outcome.pointNames[2]];
    const outSecond = [step.outcome.pointNames[3], step.outcome.pointNames[4], step.outcome.pointNames[5]];
    const p0First = [p0.pointNames[0], p0.pointNames[1], p0.pointNames[2]];
    const p1Second = [p1.pointNames[3], p1.pointNames[4], p1.pointNames[5]];
    if (outFirst[0] !== p0First[0] || outFirst[1] !== p0First[1] || outFirst[2] !== p0First[2] ||
        outSecond[0] !== p1Second[0] || outSecond[1] !== p1Second[1] || outSecond[2] !== p1Second[2]) {
      return { ok: false, message: 'Conclusion must be: first angle of prerequisite 1, second angle of prerequisite 2.' };
    }
    return { ok: true, message: statementToString(step.outcome) };
  }

  if (step.reasonId === 'sas' && step.outcome.kind === 'triangles-congruent' && step.outcome.pointNames.length === 6) {
    const outcomeNames = step.outcome.pointNames;
    for (const perm of TRIANGLE_SECOND_PERMS) {
      const tri1 = [outcomeNames[0], outcomeNames[1], outcomeNames[2]];
      const tri2 = [outcomeNames[3 + perm[0]], outcomeNames[3 + perm[1]], outcomeNames[3 + perm[2]]];
      for (let v = 0; v < 3; v++) {
        const v1 = (v + 1) % 3;
        const v2 = (v + 2) % 3;
        const seg1: Statement = { kind: 'segment-equals-segment', pointNames: [tri1[v], tri1[v1], tri2[v], tri2[v1]] };
        const seg2: Statement = { kind: 'segment-equals-segment', pointNames: [tri1[v], tri1[v2], tri2[v], tri2[v2]] };
        const angle: Statement = { kind: 'angle-equals-angle', pointNames: [tri1[v2], tri1[v], tri1[v1], tri2[v2], tri2[v], tri2[v1]] };
        const required = [seg1, seg2, angle];
        const used = new Set<number>();
        let allMatched = true;
        for (const req of required) {
          const idx = prereqStatements.findIndex((p, i) => !used.has(i) && statementsEqualStructural(p, req));
          if (idx === -1) { allMatched = false; break; }
          used.add(idx);
        }
        if (allMatched) return { ok: true, message: statementToString(step.outcome) };
      }
    }
    return { ok: false, message: 'No valid SAS combination: need two sides and the included angle equal under the same correspondence.' };
  }

  function matchTriangleCongruencePremises(outcomeNames: string[], perm: number[], required: Statement[]): boolean {
    const used = new Set<number>();
    for (const req of required) {
      const idx = prereqStatements.findIndex((p, i) => !used.has(i) && statementsEqualStructural(p, req));
      if (idx === -1) return false;
      used.add(idx);
    }
    return true;
  }

  if (step.reasonId === 'asa' && step.outcome.kind === 'triangles-congruent' && step.outcome.pointNames.length === 6) {
    const outcomeNames = step.outcome.pointNames;
    for (const perm of TRIANGLE_SECOND_PERMS) {
      const tri1 = [outcomeNames[0], outcomeNames[1], outcomeNames[2]];
      const tri2 = [outcomeNames[3 + perm[0]], outcomeNames[3 + perm[1]], outcomeNames[3 + perm[2]]];
      const required: Statement[] = [
        { kind: 'angle-equals-angle', pointNames: [tri1[2], tri1[0], tri1[1], tri2[2], tri2[0], tri2[1]] },
        { kind: 'segment-equals-segment', pointNames: [tri1[0], tri1[1], tri2[0], tri2[1]] },
        { kind: 'angle-equals-angle', pointNames: [tri1[0], tri1[1], tri1[2], tri2[0], tri2[1], tri2[2]] },
      ];
      if (matchTriangleCongruencePremises(outcomeNames, perm, required)) {
        return { ok: true, message: statementToString(step.outcome) };
      }
    }
    return { ok: false, message: 'No valid ASA: need two angles and the included side under the same correspondence.' };
  }

  if (step.reasonId === 'aas' && step.outcome.kind === 'triangles-congruent' && step.outcome.pointNames.length === 6) {
    const outcomeNames = step.outcome.pointNames;
    for (const perm of TRIANGLE_SECOND_PERMS) {
      const tri1 = [outcomeNames[0], outcomeNames[1], outcomeNames[2]];
      const tri2 = [outcomeNames[3 + perm[0]], outcomeNames[3 + perm[1]], outcomeNames[3 + perm[2]]];
      const required: Statement[] = [
        { kind: 'angle-equals-angle', pointNames: [tri1[2], tri1[0], tri1[1], tri2[2], tri2[0], tri2[1]] },
        { kind: 'angle-equals-angle', pointNames: [tri1[0], tri1[1], tri1[2], tri2[0], tri2[1], tri2[2]] },
        { kind: 'segment-equals-segment', pointNames: [tri1[1], tri1[2], tri2[1], tri2[2]] },
      ];
      if (matchTriangleCongruencePremises(outcomeNames, perm, required)) {
        return { ok: true, message: statementToString(step.outcome) };
      }
    }
    return { ok: false, message: 'No valid AAS: need two angles and a non-included side under the same correspondence.' };
  }

  if (step.reasonId === 'sss' && step.outcome.kind === 'triangles-congruent' && step.outcome.pointNames.length === 6) {
    const outcomeNames = step.outcome.pointNames;
    for (const perm of TRIANGLE_SECOND_PERMS) {
      const tri1 = [outcomeNames[0], outcomeNames[1], outcomeNames[2]];
      const tri2 = [outcomeNames[3 + perm[0]], outcomeNames[3 + perm[1]], outcomeNames[3 + perm[2]]];
      const required: Statement[] = [
        { kind: 'segment-equals-segment', pointNames: [tri1[0], tri1[1], tri2[0], tri2[1]] },
        { kind: 'segment-equals-segment', pointNames: [tri1[1], tri1[2], tri2[1], tri2[2]] },
        { kind: 'segment-equals-segment', pointNames: [tri1[2], tri1[0], tri2[2], tri2[0]] },
      ];
      if (matchTriangleCongruencePremises(outcomeNames, perm, required)) {
        return { ok: true, message: statementToString(step.outcome) };
      }
    }
    return { ok: false, message: 'No valid SSS: need all three sides equal under the same correspondence.' };
  }

  if (step.reasonId === 'hl' && step.outcome.kind === 'triangles-congruent' && step.outcome.pointNames.length === 6) {
    const outcomeNames = step.outcome.pointNames;
    const angle90 = (p: Statement): boolean =>
      p.kind === 'angle-equals-constant' && (p.constant == null || p.constant === 90);
    for (const perm of TRIANGLE_SECOND_PERMS) {
      const tri1 = [outcomeNames[0], outcomeNames[1], outcomeNames[2]];
      const tri2 = [outcomeNames[3 + perm[0]], outcomeNames[3 + perm[1]], outcomeNames[3 + perm[2]]];
      const right1: Statement = { kind: 'angle-equals-constant', pointNames: [tri1[0], tri1[1], tri1[2]], constant: 90 };
      const right2: Statement = { kind: 'angle-equals-constant', pointNames: [tri2[0], tri2[1], tri2[2]], constant: 90 };
      const hyp: Statement = { kind: 'segment-equals-segment', pointNames: [tri1[0], tri1[2], tri2[0], tri2[2]] };
      const leg: Statement = { kind: 'segment-equals-segment', pointNames: [tri1[0], tri1[1], tri2[0], tri2[1]] };
      const required = [right1, right2, hyp, leg];
      const used = new Set<number>();
      let allMatched = true;
      for (const req of required) {
        const idx = prereqStatements.findIndex((p, i) => {
          if (used.has(i)) return false;
          if (req.kind === 'angle-equals-constant' && !angle90(p)) return false;
          return statementsEqualStructural(p, req);
        });
        if (idx === -1) { allMatched = false; break; }
        used.add(idx);
      }
      if (allMatched) return { ok: true, message: statementToString(step.outcome) };
    }
    return { ok: false, message: 'No valid HL: need right angles at corresponding vertices, hypotenuse and one leg equal.' };
  }

  if (step.reasonId === 'from-congruence') {
    if (step.outcome.kind !== 'segment-equals-segment' || step.outcome.pointNames.length < 4) {
      return { ok: false, message: 'Conclusion must be a segment equality (e.g. AB = DE).' };
    }
    const triPrereqs = prereqStatements.filter((s) => s.kind === 'triangles-congruent' && s.pointNames.length >= 6);
    const outcomeKey = segmentStatementKey(step.outcome);
    for (const triPrereq of triPrereqs) {
      const p = triPrereq.pointNames;
      for (const perm of TRIANGLE_SECOND_PERMS) {
        const tri1 = [p[0], p[1], p[2]];
        const tri2 = [p[3 + perm[0]], p[3 + perm[1]], p[3 + perm[2]]];
        const sides: Statement[] = [
          { kind: 'segment-equals-segment', pointNames: [tri1[0], tri1[1], tri2[0], tri2[1]] },
          { kind: 'segment-equals-segment', pointNames: [tri1[1], tri1[2], tri2[1], tri2[2]] },
          { kind: 'segment-equals-segment', pointNames: [tri1[2], tri1[0], tri2[2], tri2[0]] },
        ];
        if (sides.some((s) => segmentStatementKey(s) === outcomeKey)) {
          return { ok: true, message: statementToString(step.outcome) };
        }
      }
    }
    return { ok: false, message: 'Conclusion must be a pair of corresponding sides from a triangle congruence prerequisite.' };
  } else {
    if (step.outcome.kind !== reason.conclusion.kind || step.outcome.pointNames.length !== reason.conclusion.pointNames.length) {
      return { ok: false, message: `Conclusion should be: ${statementToString(reason.conclusion)} (with your point names).` };
    }
  }

  const useSharedUsed =
    step.reasonId === 'transitivity-equals' &&
    reason.premises.length === 2 &&
    reason.premises[0].kind === 'angle-equals-constant' &&
    reason.premises[1].kind === 'angle-equals-constant';

  const outcomeNames = step.outcome.pointNames;
  const toTry: string[][] =
    step.outcome.kind === 'triangles-congruent' && outcomeNames.length === 6
      ? TRIANGLE_SECOND_PERMS.map((p) => [
          outcomeNames[0], outcomeNames[1], outcomeNames[2],
          outcomeNames[3 + p[0]], outcomeNames[3 + p[1]], outcomeNames[3 + p[2]],
        ])
      : [outcomeNames];

  let lastError: string | null = null;
  for (const names of toTry) {
    const used = new Map<string, number>();
    let ok = true;
    for (let i = 0; i < reason.premises.length; i++) {
      if (!useSharedUsed) used.clear();
      const prem = substitutePremiseByOccurrence(reason.premises[i], reason.conclusion.pointNames, names, used);
      if (!prem) {
        lastError = `Prerequisite ${i + 1}: could not match to conclusion.`;
        ok = false;
        break;
      }
      const match = prereqStatements.some((p) => statementsEqualStructural(p, prem));
      if (!match) {
        const hint = prem.kind === 'angle-equals-constant'
          ? ` For this use of the rule you need two steps stating each angle in your conclusion equals the same measure (e.g. 90°, 45°).`
          : '';
        lastError = `Prerequisite ${i + 1}: need a step stating "${statementToString(prem)}" (order of prerequisites does not matter).${hint}`;
        ok = false;
        break;
      }
    }
    if (ok) return { ok: true, message: statementToString(step.outcome) };
  }
  return { ok: false, message: lastError ?? 'Prerequisites do not match.' };
}
