/**
 * Proof logic: statements, reasons, and verification.
 * Implementations live in client/proof/; this file is the single entry for imports from ./proof.js.
 */

export type { SnapshotEntry, LineLike, ResolvedContext } from './proof/index.js';
export { resolveContext, pointOnLine, pointOnRay, sameLine, areOppositeRays } from './proof/index.js';

export type { StatementKind, Statement } from './proof/index.js';
export { STATEMENT_POINT_COUNTS, TRIANGLE_SECOND_PERMS, parseOutcomeStatement, statementToString } from './proof/index.js';

export { checkStatement } from './proof/index.js';

export type { ReasonType, ReasonSchema } from './proof/index.js';
export {
  REASON_GIVEN,
  REASON_DEFINITION,
  REASONS,
  statementsEqual,
  statementsEqualStructural,
  segmentStatementKey,
  getConclusionForReason,
  verifyReasonApplication,
} from './proof/index.js';

export type { PrerequisiteRef, ProofStep } from './proof/index.js';
export { verifyStep } from './proof/index.js';
