/**
 * Task validators: each takes a snapshot and returns a validation result.
 * Registry maps task id to validator for CLI selection.
 */

import type { SnapshotEntry, ValidationResult, GeomObject } from './types.js';
import { isLineLike } from './types.js';
import {
  distToLine,
  segmentLength,
  areParallel,
  distanceBetweenPoints,
  getEndpoints,
} from './geometry.js';

const POINT_ON_LINE_TOLERANCE = 0.5;
const LENGTH_TOLERANCE = 0.01;
const POINT_MERGE_TOLERANCE = 0.01;

/** Task: One line, 3 points on it, 2 points off it. */
export function validateLineWithPointsTask(snapshot: SnapshotEntry[]): ValidationResult {
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

/** Task: Three segments forming an equilateral triangle. */
export function validateEquilateralTriangleTask(snapshot: SnapshotEntry[]): ValidationResult {
  if (!Array.isArray(snapshot)) {
    return { valid: false, message: 'Invalid snapshot: expected an array.' };
  }

  const segments = snapshot.filter((e) => e?.geom?.type === 'segment');

  if (segments.length !== 3) {
    return {
      valid: false,
      message: `Task requires exactly 3 segments. Found ${segments.length}.`,
    };
  }

  const lengths = segments.map((e) => segmentLength(e.geom));
  const [a, b, c] = lengths;
  if (
    Math.abs(a - b) > LENGTH_TOLERANCE ||
    Math.abs(b - c) > LENGTH_TOLERANCE ||
    Math.abs(a - c) > LENGTH_TOLERANCE
  ) {
    return {
      valid: false,
      message: 'The three segments must have equal length (equilateral triangle).',
    };
  }

  const endpoints = segments.map((e) => getEndpoints(e.geom)).filter(Boolean) as [
    { x: number; y: number },
    { x: number; y: number }
  ][];
  if (endpoints.length !== 3) return { valid: false, message: 'Invalid segment geometry.' };

  const allPoints = endpoints.flat();
  const unique = distinctPoints(allPoints, POINT_MERGE_TOLERANCE);
  if (unique.length !== 3) {
    return {
      valid: false,
      message: 'The three segments must share endpoints to form a closed triangle.',
    };
  }

  return {
    valid: true,
    message: 'Task complete: equilateral triangle (3 equal-length segments).',
  };
}

/** Task: Two parallel lines (or segments/rays). */
export function validateParallelLinesTask(snapshot: SnapshotEntry[]): ValidationResult {
  if (!Array.isArray(snapshot)) {
    return { valid: false, message: 'Invalid snapshot: expected an array.' };
  }

  const lineLikes = snapshot.filter((e) => e?.geom && isLineLike(e.geom));

  if (lineLikes.length < 2) {
    return {
      valid: false,
      message: `Task requires at least two line-like objects (line, segment, or ray). Found ${lineLikes.length}.`,
    };
  }

  const first = lineLikes[0].geom;
  const second = lineLikes[1].geom;
  if (!areParallel(first, second)) {
    return {
      valid: false,
      message: 'The two lines (or segments/rays) must be parallel.',
    };
  }

  return {
    valid: true,
    message: 'Task complete: two parallel lines.',
  };
}

/** Registry: task id -> validator. */
export const TASK_REGISTRY: Record<string, (snapshot: SnapshotEntry[]) => ValidationResult> = {
  'line-and-points': validateLineWithPointsTask,
  'equilateral-triangle': validateEquilateralTriangleTask,
  'parallel-lines': validateParallelLinesTask,
};

export const DEFAULT_TASK_ID = 'line-and-points';

export function getTaskIds(): string[] {
  return Object.keys(TASK_REGISTRY);
}

/** Run the validator for the given task id; falls back to default if unknown. */
export function runTask(taskId: string, snapshot: SnapshotEntry[]): ValidationResult {
  const fn = TASK_REGISTRY[taskId] ?? TASK_REGISTRY[DEFAULT_TASK_ID];
  return fn(snapshot);
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
