/**
 * Point label layout (overlap avoidance) and label content (subscript rendering).
 */

import * as geom from '../geometry-math.js';
import type { ObjectEntry } from './state.js';

const LABEL_OFFSET = 0.5;
const LABEL_OVERLAP_THRESHOLD = 0.35;
const LABEL_ANGLES = [
  0,
  Math.PI / 4,
  Math.PI / 2,
  (3 * Math.PI) / 4,
  Math.PI,
  (5 * Math.PI) / 4,
  (3 * Math.PI) / 2,
  (7 * Math.PI) / 4,
];

export { LABEL_OFFSET };

export function labelOverlapCount(entries: ObjectEntry[], lx: number, ly: number): number {
  let count = 0;
  for (const { obj } of entries) {
    if (obj.type === 'line') {
      if (geom.distToLine(lx, ly, obj.x1, obj.y1, obj.x2, obj.y2) < LABEL_OVERLAP_THRESHOLD)
        count++;
    } else if (obj.type === 'ray') {
      if (geom.distToRay(lx, ly, obj.x1, obj.y1, obj.x2, obj.y2) < LABEL_OVERLAP_THRESHOLD)
        count++;
    } else if (obj.type === 'segment') {
      if (geom.distToSegment(lx, ly, obj.x1, obj.y1, obj.x2, obj.y2) < LABEL_OVERLAP_THRESHOLD)
        count++;
    } else if (obj.type === 'angle') {
      const r1 = geom.distToRay(lx, ly, obj.vx, obj.vy, obj.x1, obj.y1);
      const r2 = geom.distToRay(lx, ly, obj.vx, obj.vy, obj.x2, obj.y2);
      if (r1 < LABEL_OVERLAP_THRESHOLD || r2 < LABEL_OVERLAP_THRESHOLD) count++;
    }
  }
  return count;
}

/** Pick best label angle for point labels; only update when current position overlaps. */
export function recomputeLabelAngles(entries: ObjectEntry[]): void {
  for (const entry of entries) {
    if (entry.obj.type !== 'point' || !entry.name?.trim()) continue;
    const pt = entry.obj;
    const angle = entry.labelAngle ?? 0;
    const lx = pt.x + LABEL_OFFSET * Math.cos(angle);
    const ly = pt.y + LABEL_OFFSET * Math.sin(angle);
    if (labelOverlapCount(entries, lx, ly) <= 1) continue;
    let best = { count: 999, angle: 0 };
    for (const a of LABEL_ANGLES) {
      const x = pt.x + LABEL_OFFSET * Math.cos(a);
      const y = pt.y + LABEL_OFFSET * Math.sin(a);
      const c = labelOverlapCount(entries, x, y);
      if (c < best.count) best = { count: c, angle: a };
    }
    entry.labelAngle = best.angle;
  }
}

/** Renders label with A_1 → A plus subscript 1 using tspan. */
export function setLabelContent(textEl: SVGTextElement, name: string): void {
  const m = name.match(/^(.*?)_(\d+)(.*)$/);
  if (!m) {
    textEl.textContent = name;
    return;
  }
  const [, base, sub, rest] = m;
  textEl.textContent = '';
  const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
  t1.textContent = base ?? '';
  textEl.appendChild(t1);
  const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
  t2.setAttribute('baseline-shift', 'sub');
  t2.setAttribute('font-size', '0.75em');
  t2.textContent = sub ?? '';
  textEl.appendChild(t2);
  if (rest) {
    const t3 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t3.textContent = rest;
    textEl.appendChild(t3);
  }
}

export function getPointLabelPosition(
  entry: ObjectEntry
): { x: number; y: number; anchor: string } {
  if (entry.obj.type !== 'point') return { x: 0, y: 0, anchor: 'start' };
  const pt = entry.obj;
  const angle = entry.labelAngle ?? 0;
  const x = pt.x + LABEL_OFFSET * Math.cos(angle);
  const y = pt.y + LABEL_OFFSET * Math.sin(angle);
  const anchor =
    Math.abs(angle - Math.PI / 2) < 0.01 || Math.abs(angle - (3 * Math.PI) / 2) < 0.01
      ? 'middle'
      : angle > Math.PI / 2 && angle < (3 * Math.PI) / 2
        ? 'end'
        : 'start';
  return { x, y, anchor };
}
