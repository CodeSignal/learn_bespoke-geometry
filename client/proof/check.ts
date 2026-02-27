/**
 * Check whether a statement holds in the resolved construction context.
 */

import { intersectLineLine, angleAtVertexDeg, distToSegment } from '../geometry-math.js';
import type { ResolvedContext } from './context.js';
import { pointOnLine, sameLine, areOppositeRays, POINT_TOL, TOL } from './context.js';
import type { Statement } from './statements.js';

export function checkStatement(ctx: ResolvedContext, s: Statement): boolean {
  switch (s.kind) {
    case 'points-distinct': {
      const [a, b] = s.pointNames;
      const pA = ctx.points.get(a);
      const pB = ctx.points.get(b);
      if (!pA || !pB) return false;
      return Math.hypot(pB.x - pA.x, pB.y - pA.y) >= TOL;
    }
    case 'point-on-line': {
      const [c, a, b] = s.pointNames;
      const line = ctx.lineThrough(a, b);
      const pC = ctx.points.get(c);
      if (!line || !pC) return false;
      return pointOnLine(pC.x, pC.y, line);
    }
    case 'line-equals-line': {
      const [a1, c1, a2, b2] = s.pointNames;
      const line1 = ctx.lineThrough(a1, c1);
      const line2 = ctx.lineThrough(a2, b2);
      if (!line1 || !line2) return false;
      return sameLine(line1, line2);
    }
    case 'rays-form-line': {
      const [a, b, c] = s.pointNames;
      const rayAB = ctx.rayFromThrough(a, b);
      const rayCB = ctx.rayFromThrough(c, b);
      const lineAB = ctx.lineThrough(a, b);
      if (!rayAB || !rayCB || !lineAB) return false;
      if (!areOppositeRays(rayAB, rayCB)) return false;
      return sameLine(rayAB, lineAB) && sameLine(rayCB, lineAB);
    }
    case 'unique-line': {
      const [a, b] = s.pointNames;
      return checkStatement(ctx, { kind: 'points-distinct', pointNames: [a, b] });
    }
    case 'intersection-equals': {
      const [e, a, b, c, d] = s.pointNames;
      const lineAB = ctx.lineThrough(a, b);
      const lineCD = ctx.lineThrough(c, d);
      const pE = ctx.points.get(e);
      if (!lineAB || !lineCD || !pE) return false;
      const pts = intersectLineLine(lineAB.x1, lineAB.y1, lineAB.x2, lineAB.y2, lineCD.x1, lineCD.y1, lineCD.x2, lineCD.y2);
      if (pts.length !== 1) return false;
      return Math.hypot(pts[0].x - pE.x, pts[0].y - pE.y) <= POINT_TOL;
    }
    case 'angle-equals-constant': {
      const [a, m, c] = s.pointNames;
      const pA = ctx.points.get(a);
      const pM = ctx.points.get(m);
      const pC = ctx.points.get(c);
      if (!pA || !pM || !pC) return false;
      const target = s.constant;
      if (target == null) return true;
      const deg = angleAtVertexDeg(pA.x, pA.y, pM.x, pM.y, pC.x, pC.y);
      return Math.abs(deg - target) <= 5;
    }
    case 'angle-equals-angle': {
      const [a1, m1, c1, a2, m2, c2] = s.pointNames;
      const p1 = [ctx.points.get(a1), ctx.points.get(m1), ctx.points.get(c1)];
      const p2 = [ctx.points.get(a2), ctx.points.get(m2), ctx.points.get(c2)];
      if (p1.some((p) => !p) || p2.some((p) => !p)) return false;
      const deg1 = angleAtVertexDeg(p1[0]!.x, p1[0]!.y, p1[1]!.x, p1[1]!.y, p1[2]!.x, p1[2]!.y);
      const deg2 = angleAtVertexDeg(p2[0]!.x, p2[0]!.y, p2[1]!.x, p2[1]!.y, p2[2]!.x, p2[2]!.y);
      return Math.abs(deg1 - deg2) <= 5;
    }
    case 'segment-equals-segment': {
      const [a, b, c, d] = s.pointNames;
      const pA = ctx.points.get(a);
      const pB = ctx.points.get(b);
      const pC = ctx.points.get(c);
      const pD = ctx.points.get(d);
      if (!pA || !pB || !pC || !pD) return false;
      const len1 = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      const len2 = Math.hypot(pD.x - pC.x, pD.y - pC.y);
      return Math.abs(len1 - len2) <= 0.01;
    }
    case 'triangles-congruent': {
      const names = s.pointNames;
      if (names.length < 6) return false;
      return names.every((n) => ctx.points.has(n));
    }
    case 'point-midpoint-of-segment': {
      const [m, a, b] = s.pointNames;
      const pM = ctx.points.get(m);
      const pA = ctx.points.get(a);
      const pB = ctx.points.get(b);
      if (!pM || !pA || !pB) return false;
      const distMA = Math.hypot(pA.x - pM.x, pA.y - pM.y);
      const distMB = Math.hypot(pB.x - pM.x, pB.y - pM.y);
      const onSegment = distToSegment(pM.x, pM.y, pA.x, pA.y, pB.x, pB.y) <= POINT_TOL;
      return onSegment && Math.abs(distMA - distMB) <= 0.01;
    }
    default:
      return false;
  }
}
