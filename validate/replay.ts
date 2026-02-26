/**
 * Full operation replay: apply log entries to derive final plane state.
 *
 * Log contract: one JSON object per line. Op types match client/geometry-plane
 * OperationLogEntry:
 *   add       { op, tool, geom }
 *   remove    { op, index, geom }
 *   intersection  { op, objects, added }
 *   clear     { op }
 *   label     { op, index, name }
 *
 * Output: array of { geom, name? } (SnapshotEntry) in the same shape as
 * getPlaneStateSnapshot() so validators can consume it.
 */

import { readFileSync, existsSync } from 'fs';
import type { SnapshotEntry, OperationLogEntry } from './types.js';
import { isOperationLogEntry } from './types.js';

/**
 * Replay a log string into final state. Skips non-JSON or non-op lines.
 */
export function replayLogFromString(text: string): SnapshotEntry[] {
  const state: SnapshotEntry[] = [];
  const lines = text.trim().split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isOperationLogEntry(entry)) continue;
    applyEntry(state, entry);
  }

  return state;
}

/**
 * Replay a log file into final state. Throws if file missing or empty.
 */
export function replayLogToSnapshot(logPath: string): SnapshotEntry[] {
  if (!existsSync(logPath)) {
    throw new Error(
      `Log file not found: ${logPath}. Ensure the app is running and the student has performed actions.`
    );
  }
  const text = readFileSync(logPath, 'utf8').trim();
  if (!text) {
    throw new Error('Log file is empty. Ensure the student has performed actions in the app.');
  }
  return replayLogFromString(text);
}

function applyEntry(state: SnapshotEntry[], entry: OperationLogEntry): void {
  switch (entry.op) {
    case 'add':
      state.push({ geom: entry.geom });
      break;
    case 'remove':
      if (Number.isInteger(entry.index) && entry.index >= 0 && entry.index < state.length) {
        state.splice(entry.index, 1);
      }
      break;
    case 'intersection':
      if (Array.isArray(entry.added)) {
        for (const g of entry.added) state.push({ geom: g });
      }
      break;
    case 'clear':
      state.length = 0;
      break;
    case 'label':
      if (
        Number.isInteger(entry.index) &&
        entry.index >= 0 &&
        entry.index < state.length &&
        entry.name != null
      ) {
        state[entry.index].name = String(entry.name).trim() || undefined;
      }
      break;
  }
}
