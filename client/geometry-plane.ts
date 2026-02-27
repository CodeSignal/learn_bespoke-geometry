/**
 * Geometry Plane App – entry point.
 * State, hit, labels, render, and proof UI live in geometry-plane/.
 */

import * as geom from './geometry-math.js';
import type { GeomObject } from './geometry-math.js';
import { Point, Line, Ray, Segment, Angle, Circle, fromObject, toObject } from './geometry-objects.js';
import {
  state,
  pushLog,
  saveState,
  loadState,
  getViewBox,
  getPlaneStateSnapshot,
  getOperationLog,
  proofSteps,
} from './geometry-plane/state.js';
import {
  snapToGrid,
  findExistingPointNear,
  findObjectAt,
  sameSelectedObject,
} from './geometry-plane/hit.js';
import { render } from './geometry-plane/render.js';
import { initProofUI, renderProofSteps, setProofStepMessage } from './geometry-plane/proof-ui.js';

export type { PlaneStateSnapshot, OperationLogEntry, ObjectEntry } from './geometry-plane/state.js';
export { getPlaneStateSnapshot, getOperationLog };

const MIN_VIEW_SIZE = 10;
const MAX_VIEW_SIZE = 100;
const ZOOM_FACTOR = 1.1;
const CLICK_DELAY_MS = 250;

let svg: SVGElement | null = null;
let container: HTMLElement | null = null;
let panStart: {
  vb: { x: number; y: number; w: number; h: number };
  clientX: number;
  clientY: number;
  rect: DOMRect;
} | null = null;
let didPanThisGesture = false;
let clickDelayTimeout: ReturnType<typeof setTimeout> | null = null;

function screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
  if (!svg) return { x: 0, y: 0 };
  const pt = (svg as SVGSVGElement).createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgP = pt.matrixTransform((svg as SVGSVGElement).getScreenCTM()!.inverse());
  return { x: svgP.x, y: svgP.y };
}

function doRender(): void {
  if (svg) render(svg);
}

function updateLabelInput(): void {
  const panel = document.getElementById('label-panel');
  const input = document.getElementById('object-label-input') as HTMLInputElement | null;
  if (!panel || !input) return;
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

function performClickAt(pt: { x: number; y: number }): void {
  const entries = state.objectEntries;
  const hit = findObjectAt(entries, pt.x, pt.y);
  const tool = state.currentTool;

  if (tool === 'remove') {
    if (hit) {
      const removedGeom = toObject(state.objectEntries[hit.index].obj);
      state.objectEntries.splice(hit.index, 1);
      if (state.selectedObjectIndex === hit.index) state.selectedObjectIndex = null;
      else if (
        state.selectedObjectIndex !== null &&
        state.selectedObjectIndex > hit.index
      )
        state.selectedObjectIndex--;
      state.pendingIntersectionObjects = [];
      pushLog({ op: 'remove', index: hit.index, geom: removedGeom });
      saveState();
      updateLabelInput();
      doRender();
    }
    return;
  }

  if (!hit) {
    state.selectedObjectIndex = null;
    updateLabelInput();
  }

  if (tool === 'intersection') {
    if (!hit) return;
    if (state.pendingIntersectionObjects.length === 0) {
      state.pendingIntersectionObjects.push({ obj: hit.obj, index: hit.index });
    } else if (sameSelectedObject(state.pendingIntersectionObjects[0].obj, hit.obj)) {
      return;
    } else {
      state.pendingIntersectionObjects.push({ obj: hit.obj, index: hit.index });
      const obj1 = state.pendingIntersectionObjects[0].obj;
      const obj2 = state.pendingIntersectionObjects[1].obj;
      const points = obj1.intersect(obj2);
      const added: GeomObject[] = [];
      for (const p of points) {
        state.objectEntries.push({ obj: new Point(p.x, p.y) });
        added.push({ type: 'point', x: p.x, y: p.y });
      }
      state.pendingIntersectionObjects = [];
      pushLog({ op: 'intersection', objects: [toObject(obj1), toObject(obj2)], added });
    }
    saveState();
    doRender();
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
  } else {
    const existing = findExistingPointNear(entries, pt.x, pt.y);
    if (!existing) return;
    state.pendingPoints.push({ x: existing.x, y: existing.y });
  }

  const needed = tool === 'point' ? 1 : tool === 'angle' ? 3 : 2;
  if (state.pendingPoints.length < needed) {
    doRender();
    return;
  }

  const pts = state.pendingPoints;
  state.pendingPoints = [];

  if (tool === 'point') {
    const obj = new Point(pts[0].x, pts[0].y);
    state.objectEntries.push({ obj });
    pushLog({ op: 'add', tool: 'point', geom: toObject(obj) });
  } else if (tool === 'line') {
    const obj = new Line(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    state.objectEntries.push({ obj });
    pushLog({ op: 'add', tool: 'line', geom: toObject(obj) });
  } else if (tool === 'ray') {
    const obj = new Ray(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    state.objectEntries.push({ obj });
    pushLog({ op: 'add', tool: 'ray', geom: toObject(obj) });
  } else if (tool === 'segment') {
    const obj = new Segment(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    state.objectEntries.push({ obj });
    pushLog({ op: 'add', tool: 'segment', geom: toObject(obj) });
  } else if (tool === 'angle') {
    const obj = new Angle(
      pts[0].x,
      pts[0].y,
      pts[1].x,
      pts[1].y,
      pts[2].x,
      pts[2].y
    );
    state.objectEntries.push({ obj });
    pushLog({ op: 'add', tool: 'angle', geom: toObject(obj) });
  } else if (tool === 'circle') {
    const cx = pts[0].x,
      cy = pts[0].y;
    const r = Math.hypot(pts[1].x - cx, pts[1].y - cy);
    if (r > 1e-6) {
      const obj = new Circle(cx, cy, r);
      state.objectEntries.push({ obj });
      pushLog({ op: 'add', tool: 'circle', geom: toObject(obj) });
    }
  }

  saveState();
  doRender();
}

function setTool(tool: string): void {
  state.currentTool = tool as import('./geometry-plane/state.js').ToolType;
  state.pendingPoints = [];
  state.pendingIntersectionObjects = [];
  document.querySelectorAll('.geometry-tool').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
  });
  doRender();
}

function clearAll(): void {
  state.objectEntries = [];
  state.pendingPoints = [];
  state.pendingIntersectionObjects = [];
  state.selectedObjectIndex = null;
  pushLog({ op: 'clear' });
  saveState();
  doRender();
  updateLabelInput();
}

function handlePlaneMouseMove(e: MouseEvent): void {
  if (panStart) return;
  const pt = screenToWorld(e.clientX, e.clientY);
  state.hoverPoint = snapToGrid(pt.x, pt.y);
  state.hoverPointRaw = { x: pt.x, y: pt.y };
  doRender();
}

function handlePlaneMouseLeave(): void {
  state.hoverPoint = null;
  state.hoverPointRaw = null;
  doRender();
}

function handlePlaneClick(e: MouseEvent): void {
  if (didPanThisGesture) {
    didPanThisGesture = false;
    return;
  }
  const pt = screenToWorld(e.clientX, e.clientY);
  const hit = findObjectAt(state.objectEntries, pt.x, pt.y);
  if (hit && hit.obj.type === 'point') {
    if (clickDelayTimeout !== null) clearTimeout(clickDelayTimeout);
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

function handlePlaneDblClick(e: MouseEvent): void {
  if (clickDelayTimeout !== null) {
    clearTimeout(clickDelayTimeout);
    clickDelayTimeout = null;
  }
  const pt = screenToWorld(e.clientX, e.clientY);
  const hit = findObjectAt(state.objectEntries, pt.x, pt.y);
  if (hit && hit.obj.type === 'point') {
    state.selectedObjectIndex = hit.index;
    updateLabelInput();
    doRender();
  }
  e.preventDefault();
}

function handlePanStart(e: MouseEvent): void {
  if (e.button !== 0) return;
  if (!svg) return;
  panStart = {
    vb: { ...state.viewBox },
    clientX: e.clientX,
    clientY: e.clientY,
    rect: (svg as SVGSVGElement).getBoundingClientRect(),
  };
  svg.style.cursor = 'grabbing';
  svg.style.userSelect = 'none';
  window.addEventListener('mousemove', handlePanMove);
  window.addEventListener('mouseup', handlePanEnd);
}

function handlePanMove(e: MouseEvent): void {
  if (!panStart) return;
  const dx = e.clientX - panStart.clientX;
  const dy = e.clientY - panStart.clientY;
  const scaleX = panStart.vb.w / panStart.rect.width;
  const scaleY = panStart.vb.h / panStart.rect.height;
  state.viewBox.x = panStart.vb.x - dx * scaleX;
  state.viewBox.y = panStart.vb.y - dy * scaleY;
  didPanThisGesture = true;
  doRender();
}

function handlePanEnd(): void {
  panStart = null;
  if (svg) {
    svg.style.cursor = '';
    svg.style.userSelect = '';
  }
  window.removeEventListener('mousemove', handlePanMove);
  window.removeEventListener('mouseup', handlePanEnd);
}

function handleWheel(e: WheelEvent): void {
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
    h: newH,
  };
  doRender();
}

function init(): void {
  container = document.getElementById('plane-container');
  if (!container) return;

  loadState();
  state.selectedObjectIndex = null;
  updateLabelInput();

  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  container.appendChild(svg);

  svg.addEventListener('mousedown', handlePanStart as EventListener);
  svg.addEventListener('click', handlePlaneClick as EventListener);
  svg.addEventListener('dblclick', handlePlaneDblClick as EventListener);
  svg.addEventListener('mousemove', handlePlaneMouseMove as EventListener);
  svg.addEventListener('mouseleave', handlePlaneMouseLeave as EventListener);
  svg.addEventListener('wheel', handleWheel as EventListener, { passive: false });

  document.querySelectorAll('.geometry-tool').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.getAttribute('data-tool') ?? ''));
  });

  const clearBtn = document.getElementById('btn-clear');
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  const labelInput = document.getElementById('object-label-input') as HTMLInputElement | null;
  if (labelInput) {
    labelInput.addEventListener('input', () => {
      const i = state.selectedObjectIndex;
      if (i === null || i < 0 || i >= state.objectEntries.length) return;
      state.objectEntries[i].name = labelInput.value;
      pushLog({ op: 'label', index: i, name: labelInput.value });
      saveState();
      doRender();
    });
    labelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.selectedObjectIndex = null;
        updateLabelInput();
        doRender();
      }
    });
  }
  const labelDoneBtn = document.getElementById('btn-label-done');
  if (labelDoneBtn) {
    labelDoneBtn.addEventListener('click', () => {
      state.selectedObjectIndex = null;
      updateLabelInput();
      doRender();
    });
  }

  initProofUI({
    onStepAdded: () => {
      doRender();
      updateLabelInput();
    },
    updateLabelInput,
  });
  updateLabelInput();
  doRender();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

if (typeof window !== 'undefined') {
  (window as unknown as { getPlaneStateSnapshot: typeof getPlaneStateSnapshot; getOperationLog: typeof getOperationLog }).getPlaneStateSnapshot = getPlaneStateSnapshot;
  (window as unknown as { getPlaneStateSnapshot: typeof getPlaneStateSnapshot; getOperationLog: typeof getOperationLog }).getOperationLog = getOperationLog;
}
