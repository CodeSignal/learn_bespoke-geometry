/**
 * Task validation for the geometry plane.
 * Snapshot format: array of { geom, name?, labelAngle? } where geom has type and coordinates.
 */

import { distToLine } from './geometry-math.js';

const POINT_ON_LINE_TOLERANCE = 0.5;

/**
 * Task: Draw a line, 3 points on the line, and 2 points not on the line.
 * @param {Array<{ geom: { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number } }>} snapshot - from getPlaneStateSnapshot()
 * @returns {{ valid: boolean; message: string }}
 */
export function validateLineWithPointsTask(snapshot) {
  if (!Array.isArray(snapshot)) {
    return { valid: false, message: 'Invalid snapshot: expected an array.' };
  }

  const lines = snapshot.filter((e) => e?.geom?.type === 'line');
  const points = snapshot.filter((e) => e?.geom?.type === 'point');

  if (lines.length === 0) {
    return { valid: false, message: 'Task requires exactly one line. None found.' };
  }
  if (lines.length > 1) {
    return { valid: false, message: 'Task requires exactly one line. Found ' + lines.length + '.' };
  }
  if (points.length !== 5) {
    return {
      valid: false,
      message: 'Task requires 5 points (3 on the line, 2 off). Found ' + points.length + ' points.',
    };
  }

  const line = lines[0].geom;
  const x1 = line.x1,
    y1 = line.y1,
    x2 = line.x2,
    y2 = line.y2;

  let onLine = 0;
  let offLine = 0;
  for (const entry of points) {
    const { x, y } = entry.geom;
    const d = distToLine(x, y, x1, y1, x2, y2);
    if (d <= POINT_ON_LINE_TOLERANCE) onLine++;
    else offLine++;
  }

  if (onLine !== 3) {
    return {
      valid: false,
      message: 'Expected 3 points on the line; found ' + onLine + '. (2 must be off the line.)',
    };
  }
  if (offLine !== 2) {
    return {
      valid: false,
      message: 'Expected 2 points not on the line; found ' + offLine + '. (3 must be on the line.)',
    };
  }

  return {
    valid: true,
    message: 'Task complete: one line, 3 points on it, 2 points off it.',
  };
}
