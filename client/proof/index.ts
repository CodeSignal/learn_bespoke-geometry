/**
 * Proof module: re-export all public API for proof logic, reasons, and verification.
 */

export type { SnapshotEntry, LineLike, ResolvedContext } from './context.js';
export { resolveContext, pointOnLine, pointOnRay, sameLine, areOppositeRays } from './context.js';

export type { StatementKind, Statement } from './statements.js';
export { STATEMENT_POINT_COUNTS, TRIANGLE_SECOND_PERMS, parseOutcomeStatement, statementToString } from './statements.js';

export { checkStatement } from './check.js';

export type { ReasonType, ReasonSchema } from './reasons.js';
export {
  REASON_GIVEN,
  REASON_DEFINITION,
  REASONS,
  statementsEqual,
  statementsEqualStructural,
  segmentStatementKey,
  getConclusionForReason,
  verifyReasonApplication,
} from './reasons.js';

export type { PrerequisiteRef, ProofStep } from './verify.js';
export { verifyStep } from './verify.js';
