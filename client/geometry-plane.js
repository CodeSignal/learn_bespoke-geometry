/**
 * Geometry Plane App
 * 2D coordinate plane with point, line, ray, segment, angle, circle tools.
 */
import * as geom from './geometry-math.js';
import { Point, Line, Ray, Segment, Angle, Circle, fromObject, toObject } from './geometry-objects.js';
import { logAction } from './logger.js';
const STORAGE_KEY = 'geometry-plane-state';
const MIN_VIEW_SIZE = 10;
const MAX_VIEW_SIZE = 100;
const ZOOM_FACTOR = 1.1;
const HIT_THRESHOLD = 0.6;
/** When competing with a line/ray/segment, treat a point as hittable up to this factor × HIT_THRESHOLD so intersection points are selectable. */
const POINT_HIT_FACTOR = 1.4;
/** When clicking within this distance of a point that is an endpoint of a line/ray/segment, select the point (for labeling/removal) instead of the line. */
const ENDPOINT_SELECT_GAP = 0.35;
const operationLog = [];
function pushLog(entry) {
    operationLog.push(entry);
    logAction(JSON.stringify(entry));
}
const state = {
    objectEntries: [],
    currentTool: 'point',
    pendingPoints: [],
    pendingIntersectionObjects: [],
    viewBox: { x: -20, y: -20, w: 40, h: 40 },
    hoverPoint: null,
    hoverPointRaw: null,
    selectedObjectIndex: null
};
function getViewBox() {
    return state.viewBox;
}
function snapToGrid(x, y) {
    return { x: Math.round(x), y: Math.round(y) };
}
function findExistingPointNear(x, y) {
    let best = { dist: HIT_THRESHOLD + 1, point: null };
    state.objectEntries.forEach(({ obj }) => {
        if (obj.type !== 'point')
            return;
        const d = obj.distanceFrom(x, y);
        if (d < best.dist)
            best = { dist: d, point: obj };
    });
    return best.dist <= HIT_THRESHOLD ? best.point : null;
}
function findObjectAt(x, y) {
    let best = { dist: HIT_THRESHOLD + 1, obj: null, index: -1 };
    state.objectEntries.forEach(({ obj }, index) => {
        const d = obj.distanceFrom(x, y);
        let resolved = obj;
        if (obj.type === 'angle')
            resolved = obj.getRay(obj.closerRay(x, y));
        const pointInRange = obj.type === 'point' && d <= HIT_THRESHOLD * POINT_HIT_FACTOR;
        const otherInRange = best.dist <= HIT_THRESHOLD;
        const preferPointOverLine = pointInRange && otherInRange && best.obj && best.obj.type !== 'point';
        const prefer = d < best.dist || preferPointOverLine;
        if (prefer)
            best = { dist: d, obj: resolved, index };
    });
    if (best.dist > HIT_THRESHOLD || !best.obj)
        return null;
    const hit = { obj: best.obj, index: best.index };
    if (best.obj.type === 'line' || best.obj.type === 'ray' || best.obj.type === 'segment') {
        const endpts = [
            [best.obj.x1, best.obj.y1],
            [best.obj.x2, best.obj.y2]
        ];
        for (const [ex, ey] of endpts) {
            const distToEnd = Math.hypot(x - ex, y - ey);
            if (distToEnd > ENDPOINT_SELECT_GAP)
                continue;
            const pointEntry = state.objectEntries.find((e) => e.obj.type === 'point' && Math.abs(e.obj.x - ex) < 1e-9 && Math.abs(e.obj.y - ey) < 1e-9);
            if (pointEntry) {
                const idx = state.objectEntries.indexOf(pointEntry);
                return { obj: pointEntry.obj, index: idx };
            }
        }
    }
    return hit;
}
function sameSelectedObject(a, b) {
    const ao = toObject(a), bo = toObject(b);
    if (ao.type !== bo.type)
        return false;
    if (ao.type === 'point' && bo.type === 'point')
        return Math.hypot(ao.x - bo.x, ao.y - bo.y) < 1e-9;
    if (ao.type === 'circle' && bo.type === 'circle')
        return Math.abs(ao.cx - bo.cx) < 1e-9 && Math.abs(ao.cy - bo.cy) < 1e-9 && Math.abs(ao.r - bo.r) < 1e-9;
    if ((ao.type === 'line' || ao.type === 'ray' || ao.type === 'segment') && (bo.type === 'line' || bo.type === 'ray' || bo.type === 'segment'))
        return Math.abs(ao.x1 - bo.x1) < 1e-9 && Math.abs(ao.y1 - bo.y1) < 1e-9 && Math.abs(ao.x2 - bo.x2) < 1e-9 && Math.abs(ao.y2 - bo.y2) < 1e-9;
    return false;
}
let svg = null;
let container = null;
let panStart = null;
let didPanThisGesture = false;
let clickDelayTimeout = null;
const CLICK_DELAY_MS = 250;
function screenToWorld(clientX, clientY) {
    if (!svg)
        return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgP.x, y: svgP.y };
}
function render() {
    if (!svg)
        return;
    const vb = getViewBox();
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
    const pointRadius = 0.25;
    state.objectEntries.forEach((entry) => {
        const obj = entry.obj;
        if (obj.type === 'point') {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            el.setAttribute('class', 'plane-point');
            el.setAttribute('cx', String(obj.x));
            el.setAttribute('cy', String(obj.y));
            el.setAttribute('r', String(pointRadius));
            g.appendChild(el);
        }
        else if (obj.type === 'line') {
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
        }
        else if (obj.type === 'ray') {
            const seg = obj.clipToViewBox(vb);
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            el.setAttribute('class', 'plane-ray');
            el.setAttribute('x1', String(seg[0]));
            el.setAttribute('y1', String(seg[1]));
            el.setAttribute('x2', String(seg[2]));
            el.setAttribute('y2', String(seg[3]));
            g.appendChild(el);
        }
        else if (obj.type === 'segment') {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            el.setAttribute('class', 'plane-segment');
            el.setAttribute('x1', String(obj.x1));
            el.setAttribute('y1', String(obj.y1));
            el.setAttribute('x2', String(obj.x2));
            el.setAttribute('y2', String(obj.y2));
            g.appendChild(el);
        }
        else if (obj.type === 'angle') {
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
        }
        else if (obj.type === 'circle') {
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
        }
        else if (obj.type === 'line') {
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
        }
        else if (obj.type === 'ray') {
            const seg = obj.clipToViewBox(vb);
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            el.setAttribute('class', `plane-ray ${selClass}`);
            el.setAttribute('x1', String(seg[0]));
            el.setAttribute('y1', String(seg[1]));
            el.setAttribute('x2', String(seg[2]));
            el.setAttribute('y2', String(seg[3]));
            g.appendChild(el);
        }
        else if (obj.type === 'segment') {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            el.setAttribute('class', `plane-segment ${selClass}`);
            el.setAttribute('x1', String(obj.x1));
            el.setAttribute('y1', String(obj.y1));
            el.setAttribute('x2', String(obj.x2));
            el.setAttribute('y2', String(obj.y2));
            g.appendChild(el);
        }
        else if (obj.type === 'circle' && obj.r > 0) {
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
    const hoverExisting = hoverRaw ? findExistingPointNear(hoverRaw.x, hoverRaw.y) : null;
    if (tool === 'point' && (state.hoverPoint || hoverRaw)) {
        let h;
        const hoverHit = hoverRaw ? findObjectAt(hoverRaw.x, hoverRaw.y) : null;
        const onLineLike = hoverHit && hoverHit.obj.type !== 'point' && (hoverHit.obj.type === 'line' || hoverHit.obj.type === 'ray' || hoverHit.obj.type === 'segment' || hoverHit.obj.type === 'circle');
        if (hoverRaw && onLineLike) {
            const o = hoverHit.obj;
            if (o.type === 'line')
                h = geom.closestPointOnLine(hoverRaw.x, hoverRaw.y, o.x1, o.y1, o.x2, o.y2);
            else if (o.type === 'ray')
                h = geom.closestPointOnRay(hoverRaw.x, hoverRaw.y, o.x1, o.y1, o.x2, o.y2);
            else if (o.type === 'segment')
                h = geom.closestPointOnSegment(hoverRaw.x, hoverRaw.y, o.x1, o.y1, o.x2, o.y2);
            else if (o.type === 'circle' && o.r > 1e-9)
                h = geom.closestPointOnCircle(hoverRaw.x, hoverRaw.y, o.cx, o.cy, o.r);
            else
                h = state.hoverPoint;
        }
        else {
            const grid = state.hoverPoint;
            const distToGrid = hoverRaw ? Math.hypot(hoverRaw.x - grid.x, hoverRaw.y - grid.y) : 0;
            const distToExisting = hoverExisting && hoverRaw ? Math.hypot(hoverRaw.x - hoverExisting.x, hoverRaw.y - hoverExisting.y) : Infinity;
            h = hoverExisting && distToExisting < distToGrid ? hoverExisting : grid;
        }
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('class', 'plane-point-preview');
        el.setAttribute('cx', String(h.x));
        el.setAttribute('cy', String(h.y));
        el.setAttribute('r', String(pointRadius));
        g.appendChild(el);
    }
    else if (tool === 'line' || tool === 'ray' || tool === 'segment' || tool === 'angle' || tool === 'circle') {
        if (p.length === 0 && hoverExisting) {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            el.setAttribute('class', 'plane-point-preview');
            el.setAttribute('cx', String(hoverExisting.x));
            el.setAttribute('cy', String(hoverExisting.y));
            el.setAttribute('r', String(pointRadius));
            g.appendChild(el);
        }
        else if (p.length >= 1 && hoverRaw) {
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
                }
                else if (tool === 'ray') {
                    const seg = geom.clipRayToViewBox(p[0].x, p[0].y, h.x, h.y, vb);
                    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    el.setAttribute('class', previewClass);
                    el.setAttribute('x1', String(seg[0]));
                    el.setAttribute('y1', String(seg[1]));
                    el.setAttribute('x2', String(seg[2]));
                    el.setAttribute('y2', String(seg[3]));
                    g.appendChild(el);
                }
                else {
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
            }
            else if (tool === 'angle' && (p.length === 1 || p.length === 2)) {
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
                }
                else {
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
                    arc.setAttribute('d', `M ${v.x + r * Math.cos(arcInfo.start)} ${v.y + r * Math.sin(arcInfo.start)} A ${r} ${r} 0 ${arcInfo.largeArc} ${arcInfo.sweep >= 0 ? 1 : 0} ${arcInfo.endX} ${arcInfo.endY}`);
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
            }
            else if (tool === 'circle' && p.length === 1) {
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
    recomputeLabelAngles();
    state.objectEntries.forEach((entry) => {
        if (entry.obj.type !== 'point')
            return;
        const name = entry.name?.trim();
        if (!name)
            return;
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
const LABEL_OFFSET = 0.5;
const LABEL_OVERLAP_THRESHOLD = 0.35;
const LABEL_ANGLES = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
/** Count how many line/ray/segment objects are within threshold of (lx, ly). */
function labelOverlapCount(lx, ly) {
    let count = 0;
    for (const { obj } of state.objectEntries) {
        if (obj.type === 'line') {
            if (geom.distToLine(lx, ly, obj.x1, obj.y1, obj.x2, obj.y2) < LABEL_OVERLAP_THRESHOLD)
                count++;
        }
        else if (obj.type === 'ray') {
            if (geom.distToRay(lx, ly, obj.x1, obj.y1, obj.x2, obj.y2) < LABEL_OVERLAP_THRESHOLD)
                count++;
        }
        else if (obj.type === 'segment') {
            if (geom.distToSegment(lx, ly, obj.x1, obj.y1, obj.x2, obj.y2) < LABEL_OVERLAP_THRESHOLD)
                count++;
        }
        else if (obj.type === 'angle') {
            const r1 = geom.distToRay(lx, ly, obj.vx, obj.vy, obj.x1, obj.y1);
            const r2 = geom.distToRay(lx, ly, obj.vx, obj.vy, obj.x2, obj.y2);
            if (r1 < LABEL_OVERLAP_THRESHOLD || r2 < LABEL_OVERLAP_THRESHOLD)
                count++;
        }
    }
    return count;
}
/** Pick best label angle for point labels that have overlap; only update when current position overlaps. */
function recomputeLabelAngles() {
    for (const entry of state.objectEntries) {
        if (entry.obj.type !== 'point' || !entry.name?.trim())
            continue;
        const pt = entry.obj;
        const angle = entry.labelAngle ?? 0;
        const lx = pt.x + LABEL_OFFSET * Math.cos(angle);
        const ly = pt.y + LABEL_OFFSET * Math.sin(angle);
        if (labelOverlapCount(lx, ly) === 0)
            continue;
        let bestAngle = angle;
        let bestCount = labelOverlapCount(lx, ly);
        for (const a of LABEL_ANGLES) {
            const x = pt.x + LABEL_OFFSET * Math.cos(a);
            const y = pt.y + LABEL_OFFSET * Math.sin(a);
            const c = labelOverlapCount(x, y);
            if (c < bestCount) {
                bestCount = c;
                bestAngle = a;
            }
        }
        entry.labelAngle = bestAngle;
    }
}
/** Renders label with A_1 → A plus subscript 1 using tspan baseline-shift for better alignment. */
function setLabelContent(textEl, name) {
    const m = name.match(/^(.*?)_(\d+)(.*)$/);
    if (!m) {
        textEl.textContent = name;
        return;
    }
    const [, base, sub, rest] = m;
    textEl.textContent = '';
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t1.textContent = base;
    textEl.appendChild(t1);
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t2.setAttribute('baseline-shift', 'sub');
    t2.setAttribute('font-size', '0.75em');
    t2.textContent = sub;
    textEl.appendChild(t2);
    if (rest) {
        const t3 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        t3.textContent = rest;
        textEl.appendChild(t3);
    }
}
/** Get label position and text-anchor for a point label using its optional labelAngle. */
function getPointLabelPosition(entry) {
    if (entry.obj.type !== 'point')
        return { x: 0, y: 0, anchor: 'start' };
    const pt = entry.obj;
    const angle = entry.labelAngle ?? 0;
    const x = pt.x + LABEL_OFFSET * Math.cos(angle);
    const y = pt.y + LABEL_OFFSET * Math.sin(angle);
    const anchor = Math.abs(angle - Math.PI / 2) < 0.01 || Math.abs(angle - (3 * Math.PI) / 2) < 0.01
        ? 'middle'
        : angle > Math.PI / 2 && angle < (3 * Math.PI) / 2
            ? 'end'
            : 'start';
    return { x, y, anchor };
}
function handlePlaneMouseMove(e) {
    if (panStart)
        return;
    const pt = screenToWorld(e.clientX, e.clientY);
    state.hoverPoint = snapToGrid(pt.x, pt.y);
    state.hoverPointRaw = { x: pt.x, y: pt.y };
    render();
}
function handlePlaneMouseLeave() {
    state.hoverPoint = null;
    state.hoverPointRaw = null;
    render();
}
function handlePlaneClick(e) {
    if (didPanThisGesture) {
        didPanThisGesture = false;
        return;
    }
    const pt = screenToWorld(e.clientX, e.clientY);
    const hit = findObjectAt(pt.x, pt.y);
    if (hit && hit.obj.type === 'point') {
        if (clickDelayTimeout !== null)
            clearTimeout(clickDelayTimeout);
        clickDelayTimeout = setTimeout(() => {
            clickDelayTimeout = null;
            performClickAt(pt);
        }, CLICK_DELAY_MS);
        return;
    }
    if (clickDelayTimeout !== null) {
        clearTimeout(clickDelayTimeout);
        clickDelayTimeout = null;
    }
    if (!hit) {
        state.selectedObjectIndex = null;
        updateLabelInput();
    }
    performClickAt(pt);
}
function handlePlaneDblClick(e) {
    if (clickDelayTimeout !== null) {
        clearTimeout(clickDelayTimeout);
        clickDelayTimeout = null;
    }
    const pt = screenToWorld(e.clientX, e.clientY);
    const hit = findObjectAt(pt.x, pt.y);
    if (hit && hit.obj.type === 'point') {
        state.selectedObjectIndex = hit.index;
        updateLabelInput();
        render();
    }
    e.preventDefault();
}
function performClickAt(pt) {
    const hit = findObjectAt(pt.x, pt.y);
    const tool = state.currentTool;
    if (tool === 'remove') {
        if (hit) {
            const removedGeom = toObject(state.objectEntries[hit.index].obj);
            state.objectEntries.splice(hit.index, 1);
            if (state.selectedObjectIndex === hit.index)
                state.selectedObjectIndex = null;
            else if (state.selectedObjectIndex !== null && state.selectedObjectIndex > hit.index)
                state.selectedObjectIndex--;
            state.pendingIntersectionObjects = [];
            pushLog({ op: 'remove', index: hit.index, geom: removedGeom });
            saveState();
            updateLabelInput();
            render();
        }
        return;
    }
    if (!hit) {
        state.selectedObjectIndex = null;
        updateLabelInput();
    }
    if (tool === 'intersection') {
        if (!hit)
            return;
        if (state.pendingIntersectionObjects.length === 0) {
            state.pendingIntersectionObjects.push({ obj: hit.obj, index: hit.index });
        }
        else if (sameSelectedObject(state.pendingIntersectionObjects[0].obj, hit.obj)) {
            return;
        }
        else {
            state.pendingIntersectionObjects.push({ obj: hit.obj, index: hit.index });
            const obj1 = state.pendingIntersectionObjects[0].obj;
            const obj2 = state.pendingIntersectionObjects[1].obj;
            const points = obj1.intersect(obj2);
            const added = [];
            for (const p of points) {
                state.objectEntries.push({ obj: new Point(p.x, p.y) });
                added.push({ type: 'point', x: p.x, y: p.y });
            }
            state.pendingIntersectionObjects = [];
            pushLog({ op: 'intersection', objects: [toObject(obj1), toObject(obj2)], added });
        }
        saveState();
        render();
        return;
    }
    const snapped = snapToGrid(pt.x, pt.y);
    if (tool === 'point') {
        let position = snapped;
        if (hit && hit.obj.type !== 'point') {
            const o = hit.obj;
            if (o.type === 'line')
                position = geom.closestPointOnLine(pt.x, pt.y, o.x1, o.y1, o.x2, o.y2);
            else if (o.type === 'ray')
                position = geom.closestPointOnRay(pt.x, pt.y, o.x1, o.y1, o.x2, o.y2);
            else if (o.type === 'segment')
                position = geom.closestPointOnSegment(pt.x, pt.y, o.x1, o.y1, o.x2, o.y2);
            else if (o.type === 'circle' && o.r > 1e-9)
                position = geom.closestPointOnCircle(pt.x, pt.y, o.cx, o.cy, o.r);
        }
        state.pendingPoints.push(position);
    }
    else {
        const existing = findExistingPointNear(pt.x, pt.y);
        if (!existing)
            return;
        state.pendingPoints.push({ x: existing.x, y: existing.y });
    }
    const needed = tool === 'point' ? 1 : tool === 'angle' ? 3 : 2;
    if (state.pendingPoints.length < needed) {
        render();
        return;
    }
    const pts = state.pendingPoints;
    state.pendingPoints = [];
    if (tool === 'point') {
        const obj = new Point(pts[0].x, pts[0].y);
        state.objectEntries.push({ obj });
        pushLog({ op: 'add', tool: 'point', geom: toObject(obj) });
    }
    else if (tool === 'line') {
        const obj = new Line(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        state.objectEntries.push({ obj });
        pushLog({ op: 'add', tool: 'line', geom: toObject(obj) });
    }
    else if (tool === 'ray') {
        const obj = new Ray(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        state.objectEntries.push({ obj });
        pushLog({ op: 'add', tool: 'ray', geom: toObject(obj) });
    }
    else if (tool === 'segment') {
        const obj = new Segment(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        state.objectEntries.push({ obj });
        pushLog({ op: 'add', tool: 'segment', geom: toObject(obj) });
    }
    else if (tool === 'angle') {
        const obj = new Angle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
        state.objectEntries.push({ obj });
        pushLog({ op: 'add', tool: 'angle', geom: toObject(obj) });
    }
    else if (tool === 'circle') {
        const cx = pts[0].x, cy = pts[0].y;
        const r = Math.hypot(pts[1].x - cx, pts[1].y - cy);
        if (r > 1e-6) {
            const obj = new Circle(cx, cy, r);
            state.objectEntries.push({ obj });
            pushLog({ op: 'add', tool: 'circle', geom: toObject(obj) });
        }
    }
    saveState();
    render();
}
function setTool(tool) {
    state.currentTool = tool;
    state.pendingPoints = [];
    state.pendingIntersectionObjects = [];
    document.querySelectorAll('.geometry-tool').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
    });
    render();
}
function clearAll() {
    state.objectEntries = [];
    state.pendingPoints = [];
    state.pendingIntersectionObjects = [];
    state.selectedObjectIndex = null;
    pushLog({ op: 'clear' });
    saveState();
    render();
    updateLabelInput();
}
function handlePanStart(e) {
    if (e.button !== 0)
        return;
    if (!svg)
        return;
    panStart = {
        vb: { ...state.viewBox },
        clientX: e.clientX,
        clientY: e.clientY,
        rect: svg.getBoundingClientRect()
    };
    svg.style.cursor = 'grabbing';
    svg.style.userSelect = 'none';
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
}
function handlePanMove(e) {
    if (!panStart)
        return;
    const dx = e.clientX - panStart.clientX;
    const dy = e.clientY - panStart.clientY;
    const scaleX = panStart.vb.w / panStart.rect.width;
    const scaleY = panStart.vb.h / panStart.rect.height;
    state.viewBox.x = panStart.vb.x - dx * scaleX;
    state.viewBox.y = panStart.vb.y - dy * scaleY;
    didPanThisGesture = true;
    render();
}
function handlePanEnd() {
    panStart = null;
    if (svg) {
        svg.style.cursor = '';
        svg.style.userSelect = '';
    }
    window.removeEventListener('mousemove', handlePanMove);
    window.removeEventListener('mouseup', handlePanEnd);
}
function handleWheel(e) {
    e.preventDefault();
    const vb = state.viewBox;
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    let newW = vb.w * factor;
    let newH = vb.h * factor;
    newW = Math.max(MIN_VIEW_SIZE, Math.min(MAX_VIEW_SIZE, newW));
    newH = Math.max(MIN_VIEW_SIZE, Math.min(MAX_VIEW_SIZE, newH));
    state.viewBox = {
        x: cx - newW / 2,
        y: cy - newH / 2,
        w: newW,
        h: newH
    };
    render();
}
/** Returns the current construction as a serializable snapshot (deep copy). */
export function getPlaneStateSnapshot() {
    return state.objectEntries.map((entry) => ({
        geom: toObject(entry.obj),
        name: entry.name?.trim() || undefined,
        labelAngle: entry.labelAngle
    }));
}
/** Returns a copy of the in-memory operation log for validation. */
export function getOperationLog() {
    return operationLog.slice();
}
function saveState() {
    try {
        const data = state.objectEntries.map((entry) => ({
            geom: toObject(entry.obj),
            name: entry.name?.trim() || undefined,
            labelAngle: entry.labelAngle
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch (err) {
        console.error('Failed to save geometry state:', err);
    }
}
function loadState() {
    try {
        state.selectedObjectIndex = null;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return;
        const entries = [];
        for (const item of parsed) {
            const geom = item && (item.geom != null ? item.geom : item);
            const name = typeof item?.name === 'string' ? item.name : undefined;
            const labelAngle = typeof item?.labelAngle === 'number' && Number.isFinite(item.labelAngle) ? item.labelAngle : undefined;
            const obj = fromObject(geom);
            if (obj)
                entries.push({ obj, name, labelAngle });
        }
        state.objectEntries = entries;
    }
    catch (err) {
        console.error('Failed to load geometry state:', err);
    }
}
function updateLabelInput() {
    const panel = document.getElementById('label-panel');
    const input = document.getElementById('object-label-input');
    if (!panel || !input)
        return;
    const i = state.selectedObjectIndex;
    if (i === null || i < 0 || i >= state.objectEntries.length) {
        panel.hidden = true;
        input.value = '';
        return;
    }
    if (state.objectEntries[i].obj.type !== 'point') {
        panel.hidden = true;
        input.value = '';
        return;
    }
    panel.hidden = false;
    input.value = state.objectEntries[i].name ?? '';
    input.focus();
}
function init() {
    container = document.getElementById('plane-container');
    if (!container)
        return;
    loadState();
    state.selectedObjectIndex = null;
    updateLabelInput();
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    container.appendChild(svg);
    svg.addEventListener('mousedown', handlePanStart);
    svg.addEventListener('click', handlePlaneClick);
    svg.addEventListener('dblclick', handlePlaneDblClick);
    svg.addEventListener('mousemove', handlePlaneMouseMove);
    svg.addEventListener('mouseleave', handlePlaneMouseLeave);
    svg.addEventListener('wheel', handleWheel, { passive: false });
    document.querySelectorAll('.geometry-tool').forEach((btn) => {
        btn.addEventListener('click', () => setTool(btn.getAttribute('data-tool') ?? ''));
    });
    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn)
        clearBtn.addEventListener('click', clearAll);
    const labelInput = document.getElementById('object-label-input');
    if (labelInput) {
        labelInput.addEventListener('input', () => {
            const i = state.selectedObjectIndex;
            if (i === null || i < 0 || i >= state.objectEntries.length)
                return;
            state.objectEntries[i].name = labelInput.value;
            pushLog({ op: 'label', index: i, name: labelInput.value });
            saveState();
            render();
        });
        labelInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                state.selectedObjectIndex = null;
                updateLabelInput();
                render();
            }
        });
    }
    const labelDoneBtn = document.getElementById('btn-label-done');
    if (labelDoneBtn) {
        labelDoneBtn.addEventListener('click', () => {
            state.selectedObjectIndex = null;
            updateLabelInput();
            render();
        });
    }
    updateLabelInput();
    render();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else {
    init();
}
if (typeof window !== 'undefined') {
    window.getPlaneStateSnapshot = getPlaneStateSnapshot;
    window.getOperationLog = getOperationLog;
}
