"use strict";
/**
 * Shared types for validation: replay, geometry helpers, and task validators.
 * Mirrors the shapes used by client/geometry-plane and client/geometry-math
 * so the validator can run in Node without importing the client bundle.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperationLogEntry = isOperationLogEntry;
exports.isLineLike = isLineLike;
const VALID_OPS = new Set(['add', 'remove', 'intersection', 'clear', 'label']);
function isOperationLogEntry(entry) {
    if (!entry || typeof entry !== 'object' || !('op' in entry))
        return false;
    return VALID_OPS.has(entry.op);
}
/** Line-like geom: has (x1,y1) and (x2,y2). */
function isLineLike(geom) {
    return (geom.type === 'line' ||
        geom.type === 'ray' ||
        geom.type === 'segment');
}
