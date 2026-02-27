/**
 * Plane state, operation log, persistence, and snapshot for validation.
 */

import type { ViewBox, GeomObject } from '../geometry-math.js';
import { fromObject, toObject, type GeometryInstance } from '../geometry-objects.js';
import { logAction } from '../logger.js';
import type { ProofStep } from '../proof.js';

const STORAGE_KEY = 'geometry-plane-state';

export type ToolType = 'point' | 'line' | 'ray' | 'segment' | 'angle' | 'circle' | 'intersection' | 'remove';

export interface ObjectEntry {
  obj: GeometryInstance;
  name?: string;
  labelAngle?: number;
}

/** Serializable operation log entry for validation. */
export type OperationLogEntry =
  | { op: 'add'; tool: ToolType; geom: GeomObject }
  | { op: 'remove'; index: number; geom: GeomObject }
  | { op: 'intersection'; objects: [GeomObject, GeomObject]; added: GeomObject[] }
  | { op: 'clear' }
  | { op: 'label'; index: number; name: string }
  | { op: 'proof_step'; reasonId: string; outcome: { kind: string; pointNames: string[] }; prerequisiteRefs: ('given' | number)[] };

export interface PlaneState {
  objectEntries: ObjectEntry[];
  currentTool: ToolType;
  pendingPoints: { x: number; y: number }[];
  pendingIntersectionObjects: { obj: GeometryInstance; index: number }[];
  viewBox: ViewBox;
  hoverPoint: { x: number; y: number } | null;
  hoverPointRaw: { x: number; y: number } | null;
  selectedObjectIndex: number | null;
}

const operationLog: OperationLogEntry[] = [];

export function pushLog(entry: OperationLogEntry): void {
  operationLog.push(entry);
  logAction(JSON.stringify(entry));
}

export const state: PlaneState = {
  objectEntries: [],
  currentTool: 'point',
  pendingPoints: [],
  pendingIntersectionObjects: [],
  viewBox: { x: -20, y: -20, w: 40, h: 40 },
  hoverPoint: null,
  hoverPointRaw: null,
  selectedObjectIndex: null,
};

export const proofSteps: ProofStep[] = [];

export function getViewBox(): ViewBox {
  return state.viewBox;
}

export interface StoredEntry {
  geom: GeomObject;
  name?: string;
  labelAngle?: number;
}

export type PlaneStateSnapshot = StoredEntry[];

export function getPlaneStateSnapshot(): PlaneStateSnapshot {
  return state.objectEntries.map((entry) => ({
    geom: toObject(entry.obj),
    name: entry.name?.trim() || undefined,
    labelAngle: entry.labelAngle,
  }));
}

export function getOperationLog(): OperationLogEntry[] {
  return operationLog.slice();
}

export function saveState(): void {
  try {
    const data: StoredEntry[] = state.objectEntries.map((entry) => ({
      geom: toObject(entry.obj),
      name: entry.name?.trim() || undefined,
      labelAngle: entry.labelAngle,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save geometry state:', err);
  }
}

export function loadState(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as StoredEntry[];
    const entries: ObjectEntry[] = [];
    for (const stored of data) {
      const geom = stored.geom;
      const name =
        typeof stored.name === 'string' ? stored.name : undefined;
      const labelAngle =
        typeof stored.labelAngle === 'number' && Number.isFinite(stored.labelAngle)
          ? stored.labelAngle
          : undefined;
      const obj = fromObject(geom);
      if (obj) entries.push({ obj, name, labelAngle });
    }
    state.objectEntries = entries;
  } catch (err) {
    console.error('Failed to load geometry state:', err);
  }
}
