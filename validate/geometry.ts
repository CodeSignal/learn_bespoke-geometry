/**
 * Pure geometry helpers for validators. No I/O; safe to unit test.
 */

import type { GeomObject } from './types.js';

/** Distance from point (x,y) to infinite line through (x1,y1)-(x2,y2). */
export function distToLine(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return Math.hypot(x - x1, y - y1);
  return Math.abs(dx * (y - y1) - dy * (x - x1)) / len;
}

/** Length of a segment, or 0 for non–line-like geoms. */
export function segmentLength(geom: GeomObject): number {
  if (geom.type === 'segment' || geom.type === 'line' || geom.type === 'ray') {
    return Math.hypot(geom.x2 - geom.x1, geom.y2 - geom.y1);
  }
  return 0;
}

/** Direction vector (dx, dy) for line/ray/segment; null otherwise. */
export function directionVector(geom: GeomObject): { dx: number; dy: number } | null {
  if (geom.type === 'segment' || geom.type === 'line' || geom.type === 'ray') {
    const dx = geom.x2 - geom.x1;
    const dy = geom.y2 - geom.y1;
    return { dx, dy };
  }
  return null;
}

/** Whether two line-like geoms are parallel (within tolerance). */
export function areParallel(geom1: GeomObject, geom2: GeomObject, tolerance = 1e-9): boolean {
  const v1 = directionVector(geom1);
  const v2 = directionVector(geom2);
  if (!v1 || !v2) return false;
  const len1 = Math.hypot(v1.dx, v1.dy);
  const len2 = Math.hypot(v2.dx, v2.dy);
  if (len1 < 1e-12 || len2 < 1e-12) return false;
  const cross = Math.abs(v1.dx * v2.dy - v1.dy * v2.dx);
  return cross <= tolerance * len1 * len2;
}

/** Distance between two points. */
export function distanceBetweenPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Endpoints of a segment/line/ray as two points. */
export function getEndpoints(geom: GeomObject): [{ x: number; y: number }, { x: number; y: number }] | null {
  if (geom.type === 'segment' || geom.type === 'line' || geom.type === 'ray') {
    return [
      { x: geom.x1, y: geom.y1 },
      { x: geom.x2, y: geom.y2 },
    ];
  }
  return null;
}
