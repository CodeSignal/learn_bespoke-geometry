/**
 * Resolved geometry context from plane snapshot: named points, lines, rays.
 */

import {
  distToLine,
  distToRay,
  type GeomObject,
  type Point2,
} from '../geometry-math.js';

export const TOL = 1e-6;
export const POINT_TOL = 0.5;

/** One entry in the plane snapshot (matches geometry-plane snapshot shape). */
export interface SnapshotEntry {
  geom: GeomObject;
  name?: string;
  labelAngle?: number;
}

/** Line or ray as two points (x1,y1) -> (x2,y2). */
export interface LineLike {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Resolved geometry: named points and derived line/ray through two point names. */
export interface ResolvedContext {
  points: Map<string, Point2>;
  lineThrough(a: string, b: string): LineLike | null;
  rayFromThrough(a: string, b: string): LineLike | null;
}

/** Build resolved context from plane snapshot. */
export function resolveContext(snapshot: SnapshotEntry[]): ResolvedContext {
  const points = new Map<string, Point2>();
  for (const entry of snapshot) {
    if (entry.geom.type === 'point' && entry.name != null && entry.name.trim() !== '') {
      const name = entry.name.trim();
      if (!points.has(name)) points.set(name, { x: entry.geom.x, y: entry.geom.y });
    }
  }

  function lineThrough(a: string, b: string): LineLike | null {
    const pA = points.get(a);
    const pB = points.get(b);
    if (!pA || !pB) return null;
    if (Math.hypot(pB.x - pA.x, pB.y - pA.y) < 1e-12) return null;
    return { x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y };
  }

  function rayFromThrough(a: string, b: string): LineLike | null {
    const pA = points.get(a);
    const pB = points.get(b);
    if (!pA || !pB) return null;
    if (Math.hypot(pB.x - pA.x, pB.y - pA.y) < 1e-12) return null;
    return { x1: pA.x, y1: pA.y, x2: pB.x, y2: pB.y };
  }

  return { points, lineThrough, rayFromThrough };
}

/** Whether (px,py) lies on the infinite line through l. */
export function pointOnLine(px: number, py: number, l: LineLike, tolerance = POINT_TOL): boolean {
  return distToLine(px, py, l.x1, l.y1, l.x2, l.y2) <= tolerance;
}

/** Whether (px,py) lies on the ray from (x1,y1) through (x2,y2). */
export function pointOnRay(px: number, py: number, l: LineLike, tolerance = POINT_TOL): boolean {
  return distToRay(px, py, l.x1, l.y1, l.x2, l.y2) <= tolerance;
}

/** Normalize line direction for equality: same infinite line yields same key. */
function lineKey(l: LineLike): string {
  const dx = l.x2 - l.x1;
  const dy = l.y2 - l.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return `0_${l.x1}_${l.y1}`;
  let nx = dx / len;
  let ny = dy / len;
  let d = l.x1 * ny - l.y1 * nx;
  if (nx < 0 || (nx === 0 && ny < 0)) {
    nx = -nx;
    ny = -ny;
    d = -d;
  }
  return `${Math.round(nx / TOL)}_${Math.round(ny / TOL)}_${Math.round(d / TOL)}`;
}

/** Whether two infinite lines are the same. */
export function sameLine(l1: LineLike, l2: LineLike): boolean {
  return lineKey(l1) === lineKey(l2);
}

/** Whether two rays are opposite: same line, opposite directions. */
export function areOppositeRays(ray1: LineLike, ray2: LineLike, lineTol = TOL): boolean {
  const d1 = { dx: ray1.x2 - ray1.x1, dy: ray1.y2 - ray1.y1 };
  const d2 = { dx: ray2.x2 - ray2.x1, dy: ray2.y2 - ray2.y1 };
  const len1 = Math.hypot(d1.dx, d1.dy);
  const len2 = Math.hypot(d2.dx, d2.dy);
  if (len1 < 1e-12 || len2 < 1e-12) return false;
  const cross = Math.abs(d1.dx * d2.dy - d1.dy * d2.dx);
  if (cross > lineTol * len1 * len2) return false;
  const dot = d1.dx * d2.dx + d1.dy * d2.dy;
  if (dot >= 0) return false;
  const onLine1 = distToLine(ray2.x1, ray2.y1, ray1.x1, ray1.y1, ray1.x2, ray1.y2) <= lineTol;
  const onLine2 = distToLine(ray1.x1, ray1.y1, ray2.x1, ray2.y1, ray2.x2, ray2.y2) <= lineTol;
  return onLine1 && onLine2;
}
