/**
 * SVG rendering for the plane: grid, objects, preview, labels.
 */

import * as geom from '../geometry-math.js';
import type { ViewBox } from '../geometry-math.js';
import { state } from './state.js';
import { findExistingPointNear, findObjectAt } from './hit.js';
import { recomputeLabelAngles, getPointLabelPosition, setLabelContent } from './labels.js';

const pointRadius = 0.25;

export function render(svg: SVGElement): void {
  const vb = state.viewBox;
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
  clip.id = 'plane-clip';
  const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  clipRect.setAttribute('x', String(vb.x));
  clipRect.setAttribute('y', String(vb.y));
  clipRect.setAttribute('width', String(vb.w));
  clipRect.setAttribute('height', String(vb.h));
  clip.appendChild(clipRect);
  defs.appendChild(clip);
  g.setAttribute('clip-path', 'url(#plane-clip)');

  const gridMinor = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridMinor.setAttribute('class', 'plane-grid');
  const gridMajor = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridMajor.setAttribute('class', 'plane-grid-major');
  for (let i = Math.floor(vb.x); i <= vb.x + vb.w; i++) {
    const v = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    v.setAttribute('x1', String(i));
    v.setAttribute('y1', String(vb.y));
    v.setAttribute('x2', String(i));
    v.setAttribute('y2', String(vb.y + vb.h));
    (i % 5 === 0 ? gridMajor : gridMinor).appendChild(v);
  }
  for (let j = Math.floor(vb.y); j <= vb.y + vb.h; j++) {
    const h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    h.setAttribute('x1', String(vb.x));
    h.setAttribute('y1', String(j));
    h.setAttribute('x2', String(vb.x + vb.w));
    h.setAttribute('y2', String(j));
    (j % 5 === 0 ? gridMajor : gridMinor).appendChild(h);
  }
  g.appendChild(gridMinor);
  g.appendChild(gridMajor);

  const axes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  axes.setAttribute('class', 'plane-axes');
  const axX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  axX.setAttribute('x1', String(vb.x));
  axX.setAttribute('y1', '0');
  axX.setAttribute('x2', String(vb.x + vb.w));
  axX.setAttribute('y2', '0');
  axes.appendChild(axX);
  const axY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  axY.setAttribute('x1', '0');
  axY.setAttribute('y1', String(vb.y));
  axY.setAttribute('x2', '0');
  axY.setAttribute('y2', String(vb.y + vb.h));
  axes.appendChild(axY);
  g.appendChild(axes);

  const entries = state.objectEntries;
  entries.forEach((entry) => {
    const obj = entry.obj;
    if (obj.type === 'point') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('class', 'plane-point');
      el.setAttribute('cx', String(obj.x));
      el.setAttribute('cy', String(obj.y));
      el.setAttribute('r', String(pointRadius));
      g.appendChild(el);
    } else if (obj.type === 'line') {
      const seg = obj.clipToViewBox(vb);
      if (seg) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        el.setAttribute('class', 'plane-line');
        el.setAttribute('x1', String(seg[0]));
        el.setAttribute('y1', String(seg[1]));
        el.setAttribute('x2', String(seg[2]));
        el.setAttribute('y2', String(seg[3]));
        g.appendChild(el);
      }
    } else if (obj.type === 'ray') {
      const seg = obj.clipToViewBox(vb);
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('class', 'plane-ray');
      el.setAttribute('x1', String(seg[0]));
      el.setAttribute('y1', String(seg[1]));
      el.setAttribute('x2', String(seg[2]));
      el.setAttribute('y2', String(seg[3]));
      g.appendChild(el);
    } else if (obj.type === 'segment') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('class', 'plane-segment');
      el.setAttribute('x1', String(obj.x1));
      el.setAttribute('y1', String(obj.y1));
      el.setAttribute('x2', String(obj.x2));
      el.setAttribute('y2', String(obj.y2));
      g.appendChild(el);
    } else if (obj.type === 'angle') {
      const [seg1, seg2] = obj.clipRaysToViewBox(vb);
      const r = 0.8;
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('class', 'plane-ray');
      line1.setAttribute('x1', String(seg1[0]));
      line1.setAttribute('y1', String(seg1[1]));
      line1.setAttribute('x2', String(seg1[2]));
      line1.setAttribute('y2', String(seg1[3]));
      g.appendChild(line1);
      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('class', 'plane-ray');
      line2.setAttribute('x1', String(seg2[0]));
      line2.setAttribute('y1', String(seg2[1]));
      line2.setAttribute('x2', String(seg2[2]));
      line2.setAttribute('y2', String(seg2[3]));
      g.appendChild(line2);
      const arcInfo = obj.angleArcPoints(r);
      const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arc.setAttribute('class', 'plane-angle-arc');
      arc.setAttribute('d', `M ${obj.vx + r * Math.cos(arcInfo.start)} ${obj.vy + r * Math.sin(arcInfo.start)} A ${r} ${r} 0 ${arcInfo.largeArc} ${arcInfo.sweep >= 0 ? 1 : 0} ${arcInfo.endX} ${arcInfo.endY}`);
      g.appendChild(arc);
    } else if (obj.type === 'circle') {
      if (obj.r > 0) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('class', 'plane-circle');
        el.setAttribute('cx', String(obj.cx));
        el.setAttribute('cy', String(obj.cy));
        el.setAttribute('r', String(obj.r));
        g.appendChild(el);
      }
    }
  });

  const selClass = 'plane-intersection-selected';
  for (const { obj } of state.pendingIntersectionObjects) {
    if (obj.type === 'point') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('class', `plane-point ${selClass}`);
      el.setAttribute('cx', String(obj.x));
      el.setAttribute('cy', String(obj.y));
      el.setAttribute('r', String(pointRadius));
      g.appendChild(el);
    } else if (obj.type === 'line') {
      const seg = obj.clipToViewBox(vb);
      if (seg) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        el.setAttribute('class', `plane-line ${selClass}`);
        el.setAttribute('x1', String(seg[0]));
        el.setAttribute('y1', String(seg[1]));
        el.setAttribute('x2', String(seg[2]));
        el.setAttribute('y2', String(seg[3]));
        g.appendChild(el);
      }
    } else if (obj.type === 'ray') {
      const seg = obj.clipToViewBox(vb);
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('class', `plane-ray ${selClass}`);
      el.setAttribute('x1', String(seg[0]));
      el.setAttribute('y1', String(seg[1]));
      el.setAttribute('x2', String(seg[2]));
      el.setAttribute('y2', String(seg[3]));
      g.appendChild(el);
    } else if (obj.type === 'segment') {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('class', `plane-segment ${selClass}`);
      el.setAttribute('x1', String(obj.x1));
      el.setAttribute('y1', String(obj.y1));
      el.setAttribute('x2', String(obj.x2));
      el.setAttribute('y2', String(obj.y2));
      g.appendChild(el);
    } else if (obj.type === 'circle' && obj.r > 0) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('class', `plane-circle ${selClass}`);
      el.setAttribute('cx', String(obj.cx));
      el.setAttribute('cy', String(obj.cy));
      el.setAttribute('r', String(obj.r));
      g.appendChild(el);
    }
  }

  for (const p of state.pendingPoints) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('class', 'plane-point');
    el.setAttribute('cx', String(p.x));
    el.setAttribute('cy', String(p.y));
    el.setAttribute('r', String(pointRadius));
    g.appendChild(el);
  }

  const tool = state.currentTool;
  const p = state.pendingPoints;
  const hoverRaw = state.hoverPointRaw;
  const hoverExisting = hoverRaw ? findExistingPointNear(entries, hoverRaw.x, hoverRaw.y) : null;

  if (tool === 'point' && (state.hoverPoint || hoverRaw)) {
    let h: { x: number; y: number };
    const hoverHit = hoverRaw ? findObjectAt(entries, hoverRaw.x, hoverRaw.y) : null;
    const onLineLike =
      hoverHit &&
      hoverHit.obj.type !== 'point' &&
      (hoverHit.obj.type === 'line' ||
        hoverHit.obj.type === 'ray' ||
        hoverHit.obj.type === 'segment' ||
        hoverHit.obj.type === 'circle');
    if (hoverRaw && onLineLike) {
      const o = hoverHit!.obj;
      if (o.type === 'line')
        h = geom.closestPointOnLine(hoverRaw.x, hoverRaw.y, o.x1, o.y1, o.x2, o.y2);
      else if (o.type === 'ray')
        h = geom.closestPointOnRay(hoverRaw.x, hoverRaw.y, o.x1, o.y1, o.x2, o.y2);
      else if (o.type === 'segment')
        h = geom.closestPointOnSegment(hoverRaw.x, hoverRaw.y, o.x1, o.y1, o.x2, o.y2);
      else if (o.type === 'circle' && o.r > 1e-9)
        h = geom.closestPointOnCircle(hoverRaw.x, hoverRaw.y, o.cx, o.cy, o.r);
      else h = state.hoverPoint!;
    } else {
      const grid = state.hoverPoint!;
      const distToGrid = hoverRaw ? Math.hypot(hoverRaw.x - grid.x, hoverRaw.y - grid.y) : 0;
      const distToExisting =
        hoverExisting && hoverRaw
          ? Math.hypot(hoverRaw.x - hoverExisting.x, hoverRaw.y - hoverExisting.y)
          : Infinity;
      h = hoverExisting && distToExisting < distToGrid ? hoverExisting : grid;
    }
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('class', 'plane-point-preview');
    el.setAttribute('cx', String(h.x));
    el.setAttribute('cy', String(h.y));
    el.setAttribute('r', String(pointRadius));
    g.appendChild(el);
  } else if (
    tool === 'line' ||
    tool === 'ray' ||
    tool === 'segment' ||
    tool === 'angle' ||
    tool === 'circle'
  ) {
    if (p.length === 0 && hoverExisting) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('class', 'plane-point-preview');
      el.setAttribute('cx', String(hoverExisting.x));
      el.setAttribute('cy', String(hoverExisting.y));
      el.setAttribute('r', String(pointRadius));
      g.appendChild(el);
    } else if (p.length >= 1 && hoverRaw) {
      const h = hoverExisting ?? { x: hoverRaw.x, y: hoverRaw.y };
      const showEndpointHighlight = !!hoverExisting;
      if ((tool === 'line' || tool === 'ray' || tool === 'segment') && p.length === 1) {
        const previewClass = `plane-${tool}-preview`;
        if (tool === 'line') {
          const seg = geom.clipLineToViewBox(p[0].x, p[0].y, h.x, h.y, vb);
          if (seg) {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            el.setAttribute('class', previewClass);
            el.setAttribute('x1', String(seg[0]));
            el.setAttribute('y1', String(seg[1]));
            el.setAttribute('x2', String(seg[2]));
            el.setAttribute('y2', String(seg[3]));
            g.appendChild(el);
          }
        } else if (tool === 'ray') {
          const seg = geom.clipRayToViewBox(p[0].x, p[0].y, h.x, h.y, vb);
          const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          el.setAttribute('class', previewClass);
          el.setAttribute('x1', String(seg[0]));
          el.setAttribute('y1', String(seg[1]));
          el.setAttribute('x2', String(seg[2]));
          el.setAttribute('y2', String(seg[3]));
          g.appendChild(el);
        } else {
          const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          el.setAttribute('class', previewClass);
          el.setAttribute('x1', String(p[0].x));
          el.setAttribute('y1', String(p[0].y));
          el.setAttribute('x2', String(h.x));
          el.setAttribute('y2', String(h.y));
          g.appendChild(el);
        }
        if (showEndpointHighlight) {
          const hl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          hl.setAttribute('class', 'plane-point-preview');
          hl.setAttribute('cx', String(h.x));
          hl.setAttribute('cy', String(h.y));
          hl.setAttribute('r', String(pointRadius));
          g.appendChild(hl);
        }
      } else if (tool === 'angle' && (p.length === 1 || p.length === 2)) {
        const r = 0.8;
        if (p.length === 1) {
          const seg = geom.clipRayToViewBox(p[0].x, p[0].y, h.x, h.y, vb);
          const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          el.setAttribute('class', 'plane-ray-preview');
          el.setAttribute('x1', String(seg[0]));
          el.setAttribute('y1', String(seg[1]));
          el.setAttribute('x2', String(seg[2]));
          el.setAttribute('y2', String(seg[3]));
          g.appendChild(el);
        } else {
          const v = { x: p[1].x, y: p[1].y };
          const seg1 = geom.clipRayToViewBox(v.x, v.y, p[0].x, p[0].y, vb);
          const seg2 = geom.clipRayToViewBox(v.x, v.y, h.x, h.y, vb);
          const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line1.setAttribute('class', 'plane-ray-preview');
          line1.setAttribute('x1', String(seg1[0]));
          line1.setAttribute('y1', String(seg1[1]));
          line1.setAttribute('x2', String(seg1[2]));
          line1.setAttribute('y2', String(seg1[3]));
          g.appendChild(line1);
          const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line2.setAttribute('class', 'plane-ray-preview');
          line2.setAttribute('x1', String(seg2[0]));
          line2.setAttribute('y1', String(seg2[1]));
          line2.setAttribute('x2', String(seg2[2]));
          line2.setAttribute('y2', String(seg2[3]));
          g.appendChild(line2);
          const arcInfo = geom.angleArcPoints(p[0], v, h, r);
          const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          arc.setAttribute('class', 'plane-angle-arc-preview');
          arc.setAttribute(
            'd',
            `M ${v.x + r * Math.cos(arcInfo.start)} ${v.y + r * Math.sin(arcInfo.start)} A ${r} ${r} 0 ${arcInfo.largeArc} ${arcInfo.sweep >= 0 ? 1 : 0} ${arcInfo.endX} ${arcInfo.endY}`
          );
          g.appendChild(arc);
        }
        if (showEndpointHighlight) {
          const hl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          hl.setAttribute('class', 'plane-point-preview');
          hl.setAttribute('cx', String(h.x));
          hl.setAttribute('cy', String(h.y));
          hl.setAttribute('r', String(pointRadius));
          g.appendChild(hl);
        }
      } else if (tool === 'circle' && p.length === 1) {
        const cx = p[0].x;
        const cy = p[0].y;
        const rad = Math.hypot(h.x - cx, h.y - cy);
        if (rad > 0.1) {
          const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          el.setAttribute('class', 'plane-circle-preview');
          el.setAttribute('cx', String(cx));
          el.setAttribute('cy', String(cy));
          el.setAttribute('r', String(rad));
          g.appendChild(el);
        }
        if (showEndpointHighlight) {
          const hl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          hl.setAttribute('class', 'plane-point-preview');
          hl.setAttribute('cx', String(h.x));
          hl.setAttribute('cy', String(h.y));
          hl.setAttribute('r', String(pointRadius));
          g.appendChild(hl);
        }
      }
    }
  }

  const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  labelsGroup.setAttribute('class', 'plane-labels');
  recomputeLabelAngles(entries);
  entries.forEach((entry) => {
    if (entry.obj.type !== 'point') return;
    const name = entry.name?.trim();
    if (!name) return;
    const pos = getPointLabelPosition(entry);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'plane-label');
    text.setAttribute('x', String(pos.x));
    text.setAttribute('y', String(pos.y));
    text.setAttribute('text-anchor', pos.anchor);
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', '0.6');
    setLabelContent(text, name);
    labelsGroup.appendChild(text);
  });
  g.appendChild(labelsGroup);

  svg.innerHTML = '';
  svg.appendChild(defs);
  svg.appendChild(g);
}
