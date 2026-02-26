/**
 * Shared types for validation: replay, geometry helpers, and task validators.
 * Mirrors the shapes used by client/geometry-plane and client/geometry-math
 * so the validator can run in Node without importing the client bundle.
 */

/** Plain geometry object shapes (for replay output and validators). */
export type GeomObject =
  | { type: 'point'; x: number; y: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'ray'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'segment'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'angle'; x1: number; y1: number; vx: number; vy: number; x2: number; y2: number }
  | { type: 'circle'; cx: number; cy: number; r: number };

/** One entry in the plane state (after replay or from getPlaneStateSnapshot). */
export interface SnapshotEntry {
  geom: GeomObject;
  name?: string;
  labelAngle?: number;
}

/** Result of a task validator. */
export interface ValidationResult {
  valid: boolean;
  message: string;
}

/** Operation log entry: one JSON object per log line (client geometry-plane contract). */
export type OperationLogEntry =
  | { op: 'add'; tool: string; geom: GeomObject }
  | { op: 'remove'; index: number; geom: GeomObject }
  | { op: 'intersection'; objects: [GeomObject, GeomObject]; added: GeomObject[] }
  | { op: 'clear' }
  | { op: 'label'; index: number; name: string };

const VALID_OPS = new Set<string>(['add', 'remove', 'intersection', 'clear', 'label']);

export function isOperationLogEntry(entry: unknown): entry is OperationLogEntry {
  if (!entry || typeof entry !== 'object' || !('op' in entry)) return false;
  return VALID_OPS.has((entry as { op: string }).op);
}

/** Line-like geom: has (x1,y1) and (x2,y2). */
export function isLineLike(geom: GeomObject): geom is GeomObject & { x1: number; y1: number; x2: number; y2: number } {
  return (
    geom.type === 'line' ||
    geom.type === 'ray' ||
    geom.type === 'segment'
  );
}
