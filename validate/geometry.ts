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

const DEFAULT_POINT_TOLERANCE = 0.5;

/** Distance from point to ray from (x1,y1) through (x2,y2). */
function distToRay(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  if (t < 0) return Math.hypot(x - x1, y - y1);
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Distance from point to segment (x1,y1)-(x2,y2). */
function distToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Whether point (px,py) lies on the infinite line through the given line geom. */
export function pointOnLine(
  px: number,
  py: number,
  line: GeomObject & { type: 'line'; x1: number; y1: number; x2: number; y2: number },
  tolerance = DEFAULT_POINT_TOLERANCE
): boolean {
  return distToLine(px, py, line.x1, line.y1, line.x2, line.y2) <= tolerance;
}

/** Whether point (px,py) lies on the ray (from origin through second point). */
export function pointOnRay(
  px: number,
  py: number,
  ray: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  tolerance = DEFAULT_POINT_TOLERANCE
): boolean {
  return distToRay(px, py, ray.x1, ray.y1, ray.x2, ray.y2) <= tolerance;
}

/** Whether point (px,py) lies on the segment. */
export function pointOnSegment(
  px: number,
  py: number,
  seg: GeomObject & { type: 'segment'; x1: number; y1: number; x2: number; y2: number },
  tolerance = DEFAULT_POINT_TOLERANCE
): boolean {
  return distToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2) <= tolerance;
}

/** Angle: vertex (x1,y1), arm1 direction (vx,vy), arm2 end (x2,y2). arm 0 = ray (x1,y1)->(x1+vx,y1+vy), arm 1 = ray (x1,y1)->(x2,y2). */
export function pointOnAngleArm(
  px: number,
  py: number,
  angle: GeomObject & { type: 'angle'; x1: number; y1: number; vx: number; vy: number; x2: number; y2: number },
  arm: 0 | 1,
  tolerance = DEFAULT_POINT_TOLERANCE
): boolean {
  const { x1, y1, vx, vy, x2, y2 } = angle;
  if (arm === 0) {
    return distToRay(px, py, x1, y1, x1 + vx, y1 + vy) <= tolerance;
  }
  return distToRay(px, py, x1, y1, x2, y2) <= tolerance;
}

/** Segment as normalized pair of endpoints for deduplication. */
export interface SegmentLike {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Infinite line represented by two points (for parallel check). */
export interface LineLike {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const LINE_TOLERANCE = 1e-9;

/** Whether two rays lie on the same infinite line and point in opposite directions. */
export function areOppositeRays(
  ray1: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  ray2: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  lineTol = 1e-6
): boolean {
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

/** Whether two opposite rays "cross": each ray's origin lies on the other ray (so they overlap and form a full line). */
export function oppositeRaysCross(
  ray1: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  ray2: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  tol = DEFAULT_POINT_TOLERANCE
): boolean {
  return (
    pointOnRay(ray2.x1, ray2.y1, ray1, tol) &&
    pointOnRay(ray1.x1, ray1.y1, ray2, tol)
  );
}

/** Whether a segment lies on the given infinite line (both endpoints on line). */
export function segmentLiesOnLine(
  seg: GeomObject & { type: 'segment'; x1: number; y1: number; x2: number; y2: number },
  line: LineLike,
  tol = DEFAULT_POINT_TOLERANCE
): boolean {
  return (
    distToLine(seg.x1, seg.y1, line.x1, line.y1, line.x2, line.y2) <= tol &&
    distToLine(seg.x2, seg.y2, line.x1, line.y1, line.x2, line.y2) <= tol
  );
}

/** Parameter t of point (px,py) along line (x1,y1)->(x2,y2): (p - origin)·dir. */
function paramOnLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return 0;
  return ((px - x1) * dx + (py - y1) * dy) / len;
}

/** Whether segments on line L cover the closed interval between the two ray origins (gap between opposite rays). */
function segmentsCoverGap(
  line: LineLike,
  ray1: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  ray2: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number },
  segmentsOnLine: Array<GeomObject & { type: 'segment'; x1: number; y1: number; x2: number; y2: number }>,
  tol: number
): boolean {
  const t1 = paramOnLine(ray1.x1, ray1.y1, line.x1, line.y1, line.x2, line.y2);
  const t2 = paramOnLine(ray2.x1, ray2.y1, line.x1, line.y1, line.x2, line.y2);
  const lo = Math.min(t1, t2);
  const hi = Math.max(t1, t2);
  const intervals: [number, number][] = segmentsOnLine.map((seg) => {
    const a = paramOnLine(seg.x1, seg.y1, line.x1, line.y1, line.x2, line.y2);
    const b = paramOnLine(seg.x2, seg.y2, line.x1, line.y1, line.x2, line.y2);
    return [Math.min(a, b), Math.max(a, b)];
  });
  intervals.sort((a, b) => a[0] - b[0]);
  let coveredUpTo = lo;
  for (const [a, b] of intervals) {
    if (a <= coveredUpTo + tol) coveredUpTo = Math.max(coveredUpTo, b);
  }
  return coveredUpTo >= hi - tol;
}

/** Normalize line for dedupe: same infinite line yields same key (flip (nx,ny,d) -> (-nx,-ny,-d) so we canonicalize). */
function lineKey(l: LineLike, tol: number): string {
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
  return `${Math.round(nx / tol)}_${Math.round(ny / tol)}_${Math.round(d / tol)}`;
}

/**
 * All infinite lines present in the construction:
 * - Explicit line objects (line tool),
 * - Two opposite rays that cross (each origin on the other ray) → full line,
 * - Two opposite rays that don't cross plus segments that cover the finite gap between their origins.
 */
export function getAllLinesFromSnapshot(
  snapshot: { geom: GeomObject }[],
  lineTol = 1e-6,
  pointTol = DEFAULT_POINT_TOLERANCE
): LineLike[] {
  const result: LineLike[] = [];
  const seen = new Set<string>();

  function addLine(l: LineLike) {
    const key = lineKey(l, lineTol);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(l);
  }

  const explicitLines = snapshot.filter(
    (e): e is { geom: GeomObject & { type: 'line'; x1: number; y1: number; x2: number; y2: number } } =>
      e?.geom?.type === 'line'
  );
  const rays = snapshot.filter(
    (e): e is { geom: GeomObject & { type: 'ray'; x1: number; y1: number; x2: number; y2: number } } =>
      e?.geom?.type === 'ray'
  );
  const segments = snapshot.filter(
    (e): e is { geom: GeomObject & { type: 'segment'; x1: number; y1: number; x2: number; y2: number } } =>
      e?.geom?.type === 'segment'
  );

  for (const e of explicitLines) {
    addLine({ x1: e.geom.x1, y1: e.geom.y1, x2: e.geom.x2, y2: e.geom.y2 });
  }

  for (let i = 0; i < rays.length; i++) {
    for (let j = i + 1; j < rays.length; j++) {
      const r1 = rays[i].geom;
      const r2 = rays[j].geom;
      if (!areOppositeRays(r1, r2, lineTol)) continue;
      const line: LineLike = { x1: r1.x1, y1: r1.y1, x2: r1.x2, y2: r1.y2 };
      const cross = oppositeRaysCross(r1, r2, pointTol);
      const segsOnLine = segments.filter((s) => segmentLiesOnLine(s.geom, line, pointTol));
      const gapCovered = segmentsCoverGap(line, r1, r2, segsOnLine.map((s) => s.geom), pointTol);
      if (cross || gapCovered) {
        addLine(line);
      }
    }
  }

  return result;
}

/** Normalize segment so the same physical segment always has the same representation (for dedupe). */
function normalizeSegment(s: SegmentLike, tol: number): string {
  const p1 = { x: s.x1, y: s.y1 };
  const p2 = { x: s.x2, y: s.y2 };
  const key = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `${Math.round(a.x / tol)}_${Math.round(a.y / tol)}_${Math.round(b.x / tol)}_${Math.round(b.y / tol)}`;
  return key(p1, p2) < key(p2, p1) ? key(p1, p2) : key(p2, p1);
}

/**
 * All segments present in the construction: explicit segments plus implicit segments
 * from lines, rays, and angle arms. For each line/ray/angle arm, every pair of points
 * that lie on it defines an implicit segment (e.g. line through A,B,C gives AB, AC, BC).
 */
export function getAllSegmentsFromSnapshot(
  snapshot: { geom: GeomObject }[],
  pointTolerance = DEFAULT_POINT_TOLERANCE
): SegmentLike[] {
  const points = snapshot
    .filter((e): e is { geom: GeomObject & { type: 'point'; x: number; y: number } } => e?.geom?.type === 'point')
    .map((e) => ({ x: e.geom.x, y: e.geom.y }));

  const seen = new Set<string>();
  const tol = Math.max(pointTolerance, 1e-6);

  function addSegment(s: SegmentLike) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (len < 1e-9) return;
    const key = normalizeSegment(s, tol);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(s);
  }

  const result: SegmentLike[] = [];

  for (const entry of snapshot) {
    const geom = entry.geom;
    if (geom.type === 'segment') {
      addSegment({ x1: geom.x1, y1: geom.y1, x2: geom.x2, y2: geom.y2 });
      continue;
    }
    if (geom.type === 'line') {
      const onLine = points.filter((p) => pointOnLine(p.x, p.y, geom, pointTolerance));
      for (let i = 0; i < onLine.length; i++) {
        for (let j = i + 1; j < onLine.length; j++) {
          addSegment({
            x1: onLine[i].x,
            y1: onLine[i].y,
            x2: onLine[j].x,
            y2: onLine[j].y,
          });
        }
      }
      continue;
    }
    if (geom.type === 'ray') {
      const onRay = points.filter((p) => pointOnRay(p.x, p.y, geom, pointTolerance));
      for (let i = 0; i < onRay.length; i++) {
        for (let j = i + 1; j < onRay.length; j++) {
          addSegment({
            x1: onRay[i].x,
            y1: onRay[i].y,
            x2: onRay[j].x,
            y2: onRay[j].y,
          });
        }
      }
      continue;
    }
    if (geom.type === 'angle') {
      for (const arm of [0, 1] as const) {
        const onArm = points.filter((p) => pointOnAngleArm(p.x, p.y, geom, arm, pointTolerance));
        for (let i = 0; i < onArm.length; i++) {
          for (let j = i + 1; j < onArm.length; j++) {
            addSegment({
              x1: onArm[i].x,
              y1: onArm[i].y,
              x2: onArm[j].x,
              y2: onArm[j].y,
            });
          }
        }
      }
    }
  }

  return result;
}

/** Angle at vertex (mx,my) between rays to (ax,ay) and (bx,by), in degrees [0, 180]. */
export function angleAtVertexDeg(
  ax: number,
  ay: number,
  mx: number,
  my: number,
  bx: number,
  by: number
): number {
  const ux = ax - mx;
  const uy = ay - my;
  const vx = bx - mx;
  const vy = by - my;
  const ul = Math.hypot(ux, uy);
  const vl = Math.hypot(vx, vy);
  if (ul < 1e-12 || vl < 1e-12) return 0;
  const dot = ux * vx + uy * vy;
  const cos = Math.max(-1, Math.min(1, dot / (ul * vl)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Whether two segments (by endpoints) have equal length (within tolerance). */
export function segmentsEqualLength(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  tol = 0.01
): boolean {
  const d1 = distanceBetweenPoints(x1, y1, x2, y2);
  const d2 = distanceBetweenPoints(x3, y3, x4, y4);
  return Math.abs(d1 - d2) <= tol;
}

/** Whether segment (mx,my)-(ax,ay) is perpendicular to segment (mx,my)-(bx,by) at vertex (mx,my). */
export function isPerpendicularAtVertex(
  ax: number,
  ay: number,
  mx: number,
  my: number,
  bx: number,
  by: number,
  degTol = 2
): boolean {
  const angle = angleAtVertexDeg(ax, ay, mx, my, bx, by);
  return Math.abs(angle - 90) <= degTol;
}
