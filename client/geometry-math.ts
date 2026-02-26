/**
 * Pure geometry utilities for the plane: distances, clipping, intersections.
 * No DOM or app state; safe to unit test.
 */

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point2 {
  x: number;
  y: number;
}

/** Plain geometry object shapes (for intersection and serialization). */
export type GeomObject =
  | { type: 'point'; x: number; y: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'ray'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'segment'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'angle'; x1: number; y1: number; vx: number; vy: number; x2: number; y2: number }
  | { type: 'circle'; cx: number; cy: number; r: number };

/** Distance from point (x,y) to infinite line through (x1,y1)-(x2,y2). */
export function distToLine(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return Math.hypot(x - x1, y - y1);
  return Math.abs(dx * (y - y1) - dy * (x - x1)) / len;
}

/** Distance from point to segment (x1,y1)-(x2,y2). */
export function distToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Distance from point to ray from (x1,y1) through (x2,y2). */
export function distToRay(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  if (t < 0) return Math.hypot(x - x1, y - y1);
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Distance from point to circle boundary (cx,cy) r. */
export function distToCircle(x: number, y: number, cx: number, cy: number, r: number): number {
  return Math.abs(Math.hypot(x - cx, y - cy) - r);
}

/** Closest point on infinite line through (x1,y1)-(x2,y2) to (x,y). */
export function closestPointOnLine(x: number, y: number, x1: number, y1: number, x2: number, y2: number): Point2 {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return { x: x1, y: y1 };
  const t = ((x - x1) * dx + (y - y1) * dy) / len2;
  return { x: x1 + t * dx, y: y1 + t * dy };
}

/** Closest point on segment (x1,y1)-(x2,y2) to (x,y). */
export function closestPointOnSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): Point2 {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return { x: x1, y: y1 };
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

/** Closest point on ray from (x1,y1) through (x2,y2) to (x,y). */
export function closestPointOnRay(x: number, y: number, x1: number, y1: number, x2: number, y2: number): Point2 {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-24) return { x: x1, y: y1 };
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, t);
  return { x: x1 + t * dx, y: y1 + t * dy };
}

/** Closest point on circle boundary (cx,cy) r to (x,y). */
export function closestPointOnCircle(x: number, y: number, cx: number, cy: number, r: number): Point2 {
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (d < 1e-12) return { x: cx + r, y: cy };
  return { x: cx + (r * dx) / d, y: cy + (r * dy) / d };
}

/** Clip infinite line through p1, p2 to viewBox vb. Returns [x1,y1,x2,y2]. */
export function clipLineToViewBox(x1: number, y1: number, x2: number, y2: number, vb: ViewBox): number[] | null {
  const dx = x2 - x1, dy = y2 - y1;
  const tol = 1e-10;
  const minX = vb.x, maxX = vb.x + vb.w, minY = vb.y, maxY = vb.y + vb.h;
  if (Math.abs(dx) < tol && Math.abs(dy) < tol) return null;
  const t: number[] = [];
  if (Math.abs(dx) >= tol) t.push((minX - x1) / dx, (maxX - x1) / dx);
  if (Math.abs(dy) >= tol) t.push((minY - y1) / dy, (maxY - y1) / dy);
  const tMin = Math.min(...t), tMax = Math.max(...t);
  return [x1 + tMin * dx, y1 + tMin * dy, x1 + tMax * dx, y1 + tMax * dy];
}

/** Ray from (x1,y1) through (x2,y2); clip to viewBox vb. */
export function clipRayToViewBox(x1: number, y1: number, x2: number, y2: number, vb: ViewBox): number[] {
  const dx = x2 - x1, dy = y2 - y1;
  const tol = 1e-10;
  const minX = vb.x, maxX = vb.x + vb.w, minY = vb.y, maxY = vb.y + vb.h;
  if (Math.abs(dx) < tol && Math.abs(dy) < tol) return [x1, y1, x1, y1];
  const t: number[] = [];
  if (Math.abs(dx) >= tol) t.push(dx > 0 ? (maxX - x1) / dx : (minX - x1) / dx);
  if (Math.abs(dy) >= tol) t.push(dy > 0 ? (maxY - y1) / dy : (minY - y1) / dy);
  const tEnd = Math.min(...t.filter(ti => ti > 0), 100) || 0;
  return [x1, y1, x1 + tEnd * dx, y1 + tEnd * dy];
}

/** Angle arc from arm1 to arm2 at vertex (radius r). */
export function angleArcPoints(arm1: Point2, vertex: Point2, arm2: Point2, r: number): { start: number; sweep: number; largeArc: number; endX: number; endY: number; r: number } {
  const a1 = Math.atan2(arm1.y - vertex.y, arm1.x - vertex.x);
  const a2 = Math.atan2(arm2.y - vertex.y, arm2.x - vertex.x);
  let sweep = a2 - a1;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep < -Math.PI) sweep += 2 * Math.PI;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const endX = vertex.x + r * Math.cos(a2);
  const endY = vertex.y + r * Math.sin(a2);
  return { start: a1, sweep, largeArc, endX, endY, r };
}

export function intersectLineLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point2[] {
  const denom = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(denom) < 1e-12) return [];
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / denom;
  return [{ x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) }];
}

export function intersectLineSegment(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point2[] {
  const denom = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(denom) < 1e-12) return [];
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / denom;
  const s = ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) / denom;
  if (s < -1e-9 || s > 1 + 1e-9) return [];
  return [{ x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) }];
}

function lineRayParams(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): { t: number; s: number; dx1: number; dy1: number } | null {
  const dx1 = x2 - x1, dy1 = y2 - y1, dx2 = x4 - x3, dy2 = y4 - y3;
  const det = dx2 * dy1 - dx1 * dy2;
  if (Math.abs(det) < 1e-12) return null;
  const t = ((y3 - y1) * dx2 - (x3 - x1) * dy2) / det;
  const s = (dx1 * (y3 - y1) - dy1 * (x3 - x1)) / det;
  return { t, s, dx1, dy1 };
}

export function intersectLineRay(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point2[] {
  const r = lineRayParams(x1, y1, x2, y2, x3, y3, x4, y4);
  if (!r || r.s < -1e-9) return [];
  return [{ x: x1 + r.t * r.dx1, y: y1 + r.t * r.dy1 }];
}

export function intersectSegmentSegment(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point2[] {
  const denom = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(denom) < 1e-12) return [];
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / denom;
  const s = ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) / denom;
  if (t < -1e-9 || t > 1 + 1e-9 || s < -1e-9 || s > 1 + 1e-9) return [];
  return [{ x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) }];
}

export function intersectSegmentRay(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point2[] {
  const r = lineRayParams(x1, y1, x2, y2, x3, y3, x4, y4);
  if (!r || r.t < -1e-9 || r.t > 1 + 1e-9 || r.s < -1e-9) return [];
  return [{ x: x1 + r.t * r.dx1, y: y1 + r.t * r.dy1 }];
}

export function intersectRayRay(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point2[] {
  const r = lineRayParams(x1, y1, x2, y2, x3, y3, x4, y4);
  if (!r || r.t < -1e-9 || r.s < -1e-9) return [];
  return [{ x: x1 + r.t * r.dx1, y: y1 + r.t * r.dy1 }];
}

export function intersectLineCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number): Point2[] {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < -1e-12) return [];
  const sqrtD = Math.sqrt(Math.max(0, disc));
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);
  const out: Point2[] = [{ x: x1 + t1 * dx, y: y1 + t1 * dy }];
  if (disc > 1e-12) out.push({ x: x1 + t2 * dx, y: y1 + t2 * dy });
  return out;
}

export function intersectSegmentCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number): Point2[] {
  const pts = intersectLineCircle(x1, y1, x2, y2, cx, cy, r);
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1e-24;
  return pts.filter((p) => {
    const t = ((p.x - x1) * dx + (p.y - y1) * dy) / len2;
    return t >= -1e-9 && t <= 1 + 1e-9;
  });
}

export function intersectRayCircle(x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number): Point2[] {
  const pts = intersectLineCircle(x1, y1, x2, y2, cx, cy, r);
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1e-24;
  return pts.filter((p) => {
    const t = ((p.x - x1) * dx + (p.y - y1) * dy) / len2;
    return t >= -1e-9;
  });
}

export function intersectCircleCircle(cx1: number, cy1: number, r1: number, cx2: number, cy2: number, r2: number): Point2[] {
  const d = Math.hypot(cx2 - cx1, cy2 - cy1);
  if (d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  if (d < 1e-12 && Math.abs(r1 - r2) < 1e-12) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const px = cx1 + a * (cx2 - cx1) / d;
  const py = cy1 + a * (cy2 - cy1) / d;
  if (h < 1e-12) return [{ x: px, y: py }];
  const rx = (cy2 - cy1) / d * h;
  const ry = (cx1 - cx2) / d * h;
  return [{ x: px + rx, y: py + ry }, { x: px - rx, y: py - ry }];
}

function lineCoords(o: { x1: number; y1: number; x2: number; y2: number }): [number, number, number, number] {
  return [o.x1, o.y1, o.x2, o.y2];
}
function circleCoords(o: { cx: number; cy: number; r: number }): [number, number, number] {
  return [o.cx, o.cy, o.r];
}

export function intersectTwoObjects(obj1: GeomObject, obj2: GeomObject): Point2[] {
  if (obj1.type === 'point' && obj2.type === 'point') {
    if (Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y) < 1e-9) return [{ x: obj1.x, y: obj1.y }];
    return [];
  }
  if (obj1.type === 'point' || obj2.type === 'point') {
    const pt = (obj1.type === 'point' ? obj1 : obj2) as Extract<GeomObject, { type: 'point' }>;
    const other = (obj1.type === 'point' ? obj2 : obj1) as Exclude<GeomObject, { type: 'point' }>;
    if (other.type === 'line' && distToLine(pt.x, pt.y, ...lineCoords(other)) < 1e-9) return [{ x: pt.x, y: pt.y }];
    if (other.type === 'segment' && distToSegment(pt.x, pt.y, ...lineCoords(other)) < 1e-9) return [{ x: pt.x, y: pt.y }];
    if (other.type === 'ray' && distToRay(pt.x, pt.y, ...lineCoords(other)) < 1e-9) return [{ x: pt.x, y: pt.y }];
    if (other.type === 'circle' && Math.abs(Math.hypot(pt.x - other.cx, pt.y - other.cy) - other.r) < 1e-9) return [{ x: pt.x, y: pt.y }];
    return [];
  }
  if (obj1.type === 'line' && obj2.type === 'line') return intersectLineLine(...lineCoords(obj1), ...lineCoords(obj2));
  if (obj1.type === 'line' && obj2.type === 'segment') return intersectLineSegment(...lineCoords(obj1), ...lineCoords(obj2));
  if (obj1.type === 'line' && obj2.type === 'ray') return intersectLineRay(...lineCoords(obj1), ...lineCoords(obj2));
  if (obj1.type === 'line' && obj2.type === 'circle') return intersectLineCircle(...lineCoords(obj1), ...circleCoords(obj2));
  if (obj1.type === 'segment' && obj2.type === 'segment') return intersectSegmentSegment(...lineCoords(obj1), ...lineCoords(obj2));
  if (obj1.type === 'segment' && obj2.type === 'ray') return intersectSegmentRay(...lineCoords(obj1), ...lineCoords(obj2));
  if (obj1.type === 'segment' && obj2.type === 'circle') return intersectSegmentCircle(...lineCoords(obj1), ...circleCoords(obj2));
  if (obj1.type === 'ray' && obj2.type === 'ray') return intersectRayRay(...lineCoords(obj1), ...lineCoords(obj2));
  if (obj1.type === 'ray' && obj2.type === 'circle') return intersectRayCircle(...lineCoords(obj1), ...circleCoords(obj2));
  if (obj1.type === 'circle' && obj2.type === 'circle') return intersectCircleCircle(...circleCoords(obj1), ...circleCoords(obj2));
  if (obj1.type === 'segment' && obj2.type === 'line') return intersectLineSegment(...lineCoords(obj2), ...lineCoords(obj1));
  if (obj1.type === 'ray' && obj2.type === 'line') return intersectLineRay(...lineCoords(obj2), ...lineCoords(obj1));
  if (obj1.type === 'circle' && obj2.type === 'line') return intersectLineCircle(...lineCoords(obj2), ...circleCoords(obj1));
  if (obj1.type === 'ray' && obj2.type === 'segment') return intersectSegmentRay(...lineCoords(obj2), ...lineCoords(obj1));
  if (obj1.type === 'circle' && obj2.type === 'segment') return intersectSegmentCircle(...lineCoords(obj2), ...circleCoords(obj1));
  if (obj1.type === 'circle' && obj2.type === 'ray') return intersectRayCircle(...lineCoords(obj2), ...circleCoords(obj1));
  return [];
}
