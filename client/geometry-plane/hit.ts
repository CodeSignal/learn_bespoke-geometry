/**
 * Hit testing and coordinate helpers for the plane.
 */

import { Point, toObject } from '../geometry-objects.js';
import type { GeometryInstance } from '../geometry-objects.js';
import type { ObjectEntry } from './state.js';

const HIT_THRESHOLD = 0.6;
const POINT_HIT_FACTOR = 1.4;
const ENDPOINT_SELECT_GAP = 0.35;

export { HIT_THRESHOLD, POINT_HIT_FACTOR, ENDPOINT_SELECT_GAP };

export function snapToGrid(x: number, y: number): { x: number; y: number } {
  return { x: Math.round(x), y: Math.round(y) };
}

export function findExistingPointNear(
  entries: ObjectEntry[],
  x: number,
  y: number
): Point | null {
  let best = { dist: HIT_THRESHOLD + 1, point: null as Point | null };
  entries.forEach(({ obj }) => {
    if (obj.type !== 'point') return;
    const d = obj.distanceFrom(x, y);
    if (d < best.dist) best = { dist: d, point: obj as Point };
  });
  return best.dist <= HIT_THRESHOLD ? best.point : null;
}

export interface HitResult {
  obj: GeometryInstance;
  index: number;
}

export function findObjectAt(
  entries: ObjectEntry[],
  x: number,
  y: number
): HitResult | null {
  let best = { dist: HIT_THRESHOLD + 1, obj: null as GeometryInstance | null, index: -1 };
  entries.forEach(({ obj }, index) => {
    const d = obj.distanceFrom(x, y);
    let resolved: GeometryInstance = obj;
    if (obj.type === 'angle') resolved = obj.getRay(obj.closerRay(x, y));
    const pointInRange = obj.type === 'point' && d <= HIT_THRESHOLD * POINT_HIT_FACTOR;
    const otherInRange = best.dist <= HIT_THRESHOLD;
    const preferPointOverLine = pointInRange && otherInRange && best.obj && best.obj.type !== 'point';
    const prefer = d < best.dist || preferPointOverLine;
    if (prefer) best = { dist: d, obj: resolved, index };
  });
  if (best.dist > HIT_THRESHOLD || !best.obj) return null;
  const hit: HitResult = { obj: best.obj, index: best.index };
  if (best.obj.type === 'line' || best.obj.type === 'ray' || best.obj.type === 'segment') {
    const endpts = [
      [best.obj.x1, best.obj.y1],
      [best.obj.x2, best.obj.y2],
    ];
    for (const [ex, ey] of endpts) {
      const distToEnd = Math.hypot(x - ex, y - ey);
      if (distToEnd > ENDPOINT_SELECT_GAP) continue;
      const pointEntry = entries.find(
        (e) =>
          e.obj.type === 'point' &&
          Math.abs((e.obj as Point).x - ex) < 1e-9 &&
          Math.abs((e.obj as Point).y - ey) < 1e-9
      );
      if (pointEntry) {
        const idx = entries.indexOf(pointEntry);
        return { obj: pointEntry.obj, index: idx };
      }
    }
  }
  return hit;
}

export function sameSelectedObject(a: GeometryInstance, b: GeometryInstance): boolean {
  const ao = toObject(a),
    bo = toObject(b);
  if (ao.type !== bo.type) return false;
  if (ao.type === 'point' && bo.type === 'point')
    return Math.hypot(ao.x - bo.x, ao.y - bo.y) < 1e-9;
  if (ao.type === 'circle' && bo.type === 'circle')
    return (
      Math.abs(ao.cx - bo.cx) < 1e-9 &&
      Math.abs(ao.cy - bo.cy) < 1e-9 &&
      Math.abs(ao.r - bo.r) < 1e-9
    );
  if (
    (ao.type === 'line' || ao.type === 'ray' || ao.type === 'segment') &&
    (bo.type === 'line' || bo.type === 'ray' || bo.type === 'segment')
  )
    return (
      Math.abs(ao.x1 - bo.x1) < 1e-9 &&
      Math.abs(ao.y1 - bo.y1) < 1e-9 &&
      Math.abs(ao.x2 - bo.x2) < 1e-9 &&
      Math.abs(ao.y2 - bo.y2) < 1e-9
    );
  return false;
}
