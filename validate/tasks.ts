/**
 * Task validators: each takes a snapshot and returns a validation result.
 * Proof tasks also receive proofSteps from the operation log.
 */

import type {
  SnapshotEntry,
  ValidationResult,
  GeomObject,
  ProofStepLogEntry,
  ProofStepOutcome,
} from './types.js';
import {
  distToLine,
  segmentLength,
  areParallel,
  distanceBetweenPoints,
  getAllSegmentsFromSnapshot,
  getAllLinesFromSnapshot,
  pointOnLine,
  areOppositeRays,
  angleAtVertexDeg,
  segmentsEqualLength,
  isPerpendicularAtVertex,
  type SegmentLike,
} from './geometry.js';

export interface RunTaskOptions {
  proofSteps?: ProofStepLogEntry[];
  /** When set, validate proof steps against this task (givens + goal). Used for TASK=task-statement. */
  taskStatement?: { givens: ProofStepOutcome[]; goal: ProofStepOutcome };
}

const POINT_ON_LINE_TOLERANCE = 0.5;
const LENGTH_TOLERANCE = 0.01;
const POINT_MERGE_TOLERANCE = 0.01;

/** Task: One line, 3 points on it, 2 points off it. */
export function validateLineWithPointsTask(
  snapshot: SnapshotEntry[],
  _options?: RunTaskOptions
): ValidationResult {
  if (!Array.isArray(snapshot)) {
    return { valid: false, message: 'Invalid snapshot: expected an array.' };
  }

  const lines = snapshot.filter((e) => e?.geom?.type === 'line');
  const points = snapshot.filter((e) => e?.geom?.type === 'point');

  if (lines.length === 0) {
    return { valid: false, message: 'Task requires exactly one line. None found.' };
  }
  if (lines.length > 1) {
    return { valid: false, message: `Task requires exactly one line. Found ${lines.length}.` };
  }
  if (points.length !== 5) {
    return {
      valid: false,
      message: `Task requires 5 points (3 on the line, 2 off). Found ${points.length} points.`,
    };
  }

  const line = lines[0].geom as GeomObject & { x1: number; y1: number; x2: number; y2: number };
  const { x1, y1, x2, y2 } = line;

  let onLine = 0;
  let offLine = 0;
  for (const entry of points) {
    const { x, y } = (entry.geom as { type: 'point'; x: number; y: number });
    const d = distToLine(x, y, x1, y1, x2, y2);
    if (d <= POINT_ON_LINE_TOLERANCE) onLine++;
    else offLine++;
  }

  if (onLine !== 3) {
    return {
      valid: false,
      message: `Expected 3 points on the line; found ${onLine}. (2 must be off the line.)`,
    };
  }
  if (offLine !== 2) {
    return {
      valid: false,
      message: `Expected 2 points not on the line; found ${offLine}. (3 must be on the line.)`,
    };
  }

  return {
    valid: true,
    message: 'Task complete: one line, 3 points on it, 2 points off it.',
  };
}

/** Length of a SegmentLike. */
function segmentLikeLength(s: SegmentLike): number {
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
}

/** Endpoints of a SegmentLike as two points. */
function segmentLikeEndpoints(s: SegmentLike): [{ x: number; y: number }, { x: number; y: number }] {
  return [
    { x: s.x1, y: s.y1 },
    { x: s.x2, y: s.y2 },
  ];
}

/** Task: Three segments forming an equilateral triangle. Segments may be explicit (segment tool) or implicit (pairs of points on the same line, ray, or angle arm). */
export function validateEquilateralTriangleTask(
  snapshot: SnapshotEntry[],
  _options?: RunTaskOptions
): ValidationResult {
  if (!Array.isArray(snapshot)) {
    return { valid: false, message: 'Invalid snapshot: expected an array.' };
  }

  const allSegments = getAllSegmentsFromSnapshot(snapshot);

  if (allSegments.length < 3) {
    return {
      valid: false,
      message: `Task requires at least 3 segments (explicit or from points on lines/rays/angles). Found ${allSegments.length}.`,
    };
  }

  for (let i = 0; i < allSegments.length; i++) {
    for (let j = i + 1; j < allSegments.length; j++) {
      for (let k = j + 1; k < allSegments.length; k++) {
        const segs = [allSegments[i], allSegments[j], allSegments[k]];
        const lengths = segs.map(segmentLikeLength);
        if (
          Math.abs(lengths[0] - lengths[1]) > LENGTH_TOLERANCE ||
          Math.abs(lengths[1] - lengths[2]) > LENGTH_TOLERANCE ||
          Math.abs(lengths[0] - lengths[2]) > LENGTH_TOLERANCE
        ) {
          continue;
        }
        const allPoints = segs.flatMap(segmentLikeEndpoints);
        const unique = distinctPoints(allPoints, POINT_MERGE_TOLERANCE);
        if (unique.length === 3) {
          return {
            valid: true,
            message: 'Task complete: equilateral triangle (3 equal-length segments).',
          };
        }
      }
    }
  }

  return {
    valid: false,
    message:
      'No equilateral triangle found. Draw three equal-length sides (as segments, or as points on lines/rays/angle arms so they form implicit segments).',
  };
}

/** Task: At least two lines (explicit or from opposite rays), with at least one parallel pair. */
export function validateParallelLinesTask(
  snapshot: SnapshotEntry[],
  _options?: RunTaskOptions
): ValidationResult {
  if (!Array.isArray(snapshot)) {
    return { valid: false, message: 'Invalid snapshot: expected an array.' };
  }

  const lines = getAllLinesFromSnapshot(snapshot);

  if (lines.length < 2) {
    return {
      valid: false,
      message: `Task requires at least two lines. Found ${lines.length}.`,
    };
  }

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      const geomA = { type: 'line' as const, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2 };
      const geomB = { type: 'line' as const, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 };
      if (areParallel(geomA, geomB)) {
        return { valid: true, message: 'Task complete: two parallel lines.' };
      }
    }
  }

  return {
    valid: false,
    message: 'No pair of lines is parallel. At least one pair must be parallel.',
  };
}

const POINT_TOL = 0.5;

/** Named points from snapshot (point entries with a name). */
function getNamedPoints(
  snapshot: SnapshotEntry[]
): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  for (const entry of snapshot) {
    if (entry?.geom?.type === 'point' && entry.name != null && String(entry.name).trim() !== '') {
      const name = String(entry.name).trim();
      const g = entry.geom as { type: 'point'; x: number; y: number };
      if (!map.has(name)) map.set(name, { x: g.x, y: g.y });
    }
  }
  return map;
}

/** Task: Perpendicular bisector — validate the proof only (no construction check). Given: triangle ABC, M ∈ BC, BM = MC, AM ⊥ BC. Prove: AB = AC. */
export function validatePerpendicularBisectorTask(
  _snapshot: SnapshotEntry[],
  options?: RunTaskOptions
): ValidationResult {
  const proofSteps = options?.proofSteps ?? [];
  if (proofSteps.length < 6) {
    return {
      valid: false,
      message: 'Give at least 6 proof steps (e.g. ∠AMC=90°, ∠AMB=90°, ∠AMC=∠AMB, BM=MC, AM=AM + SAS, AB=AC).',
    };
  }
  const conclusionStep = proofSteps.find(
    (s) => s.reasonId === 'from-congruence' && s.outcome.kind === 'segment-equals-segment'
  );
  if (!conclusionStep) {
    return { valid: false, message: 'Include a step with reason "From congruence (CPCTC)" concluding AB = AC.' };
  }
  const names = conclusionStep.outcome.pointNames;
  if (names.length < 4) {
    return { valid: false, message: 'Conclusion step must state segment equality (e.g. AB = AC).' };
  }
  const [a, b, a2, c] = names;
  if (a !== a2) {
    return { valid: false, message: 'Conclusion should be AB = AC (same vertex for both segments, e.g. first and third point name equal).' };
  }
  const sasStep = proofSteps.find((s) => s.reasonId === 'sas');
  if (!sasStep) {
    return { valid: false, message: 'Include a step using Triangle congruence (SAS).' };
  }
  return { valid: true, message: 'Proved: AB = AC (perpendicular bisector).' };
}

/** Task: Prove that opposite rays lie on one line (multi-step proof required). */
export function validateProveOppositeRaysTask(
  snapshot: SnapshotEntry[],
  options?: RunTaskOptions
): ValidationResult {
  const proofSteps = options?.proofSteps ?? [];
  const points = getNamedPoints(snapshot);
  if (points.size < 3) {
    return { valid: false, message: 'Construct at least three named points (e.g. A, B, C).' };
  }
  if (proofSteps.length < 3) {
    return {
      valid: false,
      message: 'Give a multi-step proof (at least 3 steps): set up givens/definitions, then conclude with the theorem.',
    };
  }
  const step = proofSteps.find((s) => s.reasonId === 'opposite-rays-form-line');
  if (!step) {
    return { valid: false, message: 'Add a proof step using "Theorem: opposite rays lie on one line".' };
  }
  const hasPrereq = Array.isArray(step.prerequisiteRefs) && step.prerequisiteRefs.length >= 1;
  if (!hasPrereq) {
    return {
      valid: false,
      message: 'The theorem step must have at least one prerequisite (e.g. Given or a prior step).',
    };
  }
  const names = step.outcome.pointNames;
  if (names.length < 3) {
    return { valid: false, message: 'This reason requires three point names (A, B, C).' };
  }
  const [a, b, c] = names;
  if (!points.has(a) || !points.has(b) || !points.has(c)) {
    return { valid: false, message: `Points ${a}, ${b}, and ${c} must exist in the construction.` };
  }
  const pA = points.get(a)!;
  const pB = points.get(b)!;
  const pC = points.get(c)!;
  const rayAB = { type: 'ray' as const, x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y };
  const rayCB = { type: 'ray' as const, x1: pC.x, y1: pC.y, x2: pB.x, y2: pB.y };
  if (!areOppositeRays(rayAB, rayCB)) {
    return {
      valid: false,
      message: 'Ray AB and ray CB must be opposite rays (same line, B between A and C).',
    };
  }
  return { valid: true, message: 'Proved: opposite rays lie on one line.' };
}

function outcomeEqual(a: ProofStepOutcome, b: ProofStepOutcome): boolean {
  if (a.kind !== b.kind || a.pointNames.length !== b.pointNames.length) return false;
  return a.pointNames.every((p, i) => p === b.pointNames[i]);
}

/** Task: Validate proof against the task statement from the log (givens + goal). */
export function validateTaskStatementTask(
  snapshot: SnapshotEntry[],
  options?: RunTaskOptions
): ValidationResult {
  const proofSteps = options?.proofSteps ?? [];
  const task = options?.taskStatement;
  if (!task) {
    return { valid: false, message: 'No task statement in log. Save a task statement in the Proof panel first.' };
  }
  const { givens, goal } = task;
  if (givens.length === 0 && !goal) {
    return { valid: false, message: 'Task statement must have at least one given or a goal.' };
  }
  for (const g of givens) {
    const found = proofSteps.some(
      (s) => s.reasonId === 'given' && outcomeEqual(s.outcome, g)
    );
    if (!found) {
      return {
        valid: false,
        message: `No step states the given: ${g.kind} ${g.pointNames.join(', ')}. Add a step with reason "Given in task statement".`,
      };
    }
  }
  const goalReached = proofSteps.some((s) => outcomeEqual(s.outcome, goal));
  if (!goalReached) {
    return {
      valid: false,
      message: `Proof does not reach the goal: ${goal.kind} ${goal.pointNames.join(', ')}.`,
    };
  }
  return { valid: true, message: 'Proof validates against the task statement.' };
}

/** Registry: task id -> validator. */
export const TASK_REGISTRY: Record<
  string,
  (snapshot: SnapshotEntry[], options?: RunTaskOptions) => ValidationResult
> = {
  'line-and-points': validateLineWithPointsTask,
  'equilateral-triangle': validateEquilateralTriangleTask,
  'parallel-lines': validateParallelLinesTask,
  'prove-opposite-rays': validateProveOppositeRaysTask,
  'prove-perpendicular-bisector': validatePerpendicularBisectorTask,
  'task-statement': validateTaskStatementTask,
};

/** Human-readable task descriptions (e.g. for UI). */
export const TASK_DESCRIPTIONS: Record<string, string> = {
  'line-and-points': 'Construct one line and 5 points: 3 on the line, 2 off it.',
  'equilateral-triangle': 'Construct an equilateral triangle (three equal-length segments).',
  'parallel-lines': 'Construct at least two lines, with at least one pair parallel.',
  'prove-opposite-rays':
    'Prove that opposite rays lie on one line: construct two opposite rays (e.g. ray AB and ray CB, B between A and C) and give a multi-step proof (at least 3 steps, with the theorem step depending on givens/definitions).',
  'prove-perpendicular-bisector':
    'Given triangle ABC, M ∈ BC with BM = MC and AM ⊥ BC; prove AB = AC. Validator checks the proof only (not the construction). At least 6 steps: ∠AMC=90°, ∠AMB=90°, ∠AMC=∠AMB, BM=MC (given), AM=AM + SAS, AB=AC (from congruence).',
  'task-statement':
    'Validate the proof against the task statement saved in the log (Givens + Prove from the Proof panel).',
};

export const DEFAULT_TASK_ID = 'line-and-points';

export function getTaskIds(): string[] {
  return Object.keys(TASK_REGISTRY);
}

/** Run the validator for the given task id; falls back to default if unknown. */
export function runTask(
  taskId: string,
  snapshot: SnapshotEntry[],
  options?: RunTaskOptions
): ValidationResult {
  const fn = TASK_REGISTRY[taskId] ?? TASK_REGISTRY[DEFAULT_TASK_ID];
  return fn(snapshot, options);
}

function distinctPoints(
  points: { x: number; y: number }[],
  tolerance: number
): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (const p of points) {
    if (!result.some((q) => distanceBetweenPoints(p.x, p.y, q.x, q.y) <= tolerance)) {
      result.push(p);
    }
  }
  return result;
}
