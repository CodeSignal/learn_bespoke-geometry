/**
 * Geometry object types for the plane. Each knows its data, distance, intersection, and serialization.
 */

import * as geom from './geometry-math.js';
import type { ViewBox, GeomObject, Point2 } from './geometry-math.js';

const TOL = 1e-9;

export type GeometryInstance = Point | Line | Ray | Segment | Angle | Circle;

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get type(): 'point' { return 'point'; }

  distanceFrom(x: number, y: number): number {
    return Math.hypot(x - this.x, y - this.y);
  }

  intersect(other: GeometryInstance): Point2[] {
    return geom.intersectTwoObjects(this.toObject(), other.toObject());
  }

  toObject(): Extract<GeomObject, { type: 'point' }> {
    return { type: 'point', x: this.x, y: this.y };
  }

  equals(other: Point | null | undefined): boolean {
    return !!other && other.type === 'point' && Math.hypot(this.x - other.x, this.y - other.y) < TOL;
  }

  static fromObject(o: GeomObject | null | undefined): Point | null {
    if (!o || o.type !== 'point') return null;
    return new Point(o.x, o.y);
  }
}

export class Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  get type(): 'line' { return 'line'; }

  distanceFrom(x: number, y: number): number {
    return geom.distToLine(x, y, this.x1, this.y1, this.x2, this.y2);
  }

  clipToViewBox(vb: ViewBox): number[] | null {
    return geom.clipLineToViewBox(this.x1, this.y1, this.x2, this.y2, vb);
  }

  intersect(other: GeometryInstance): Point2[] {
    return geom.intersectTwoObjects(this.toObject(), other.toObject());
  }

  toObject(): Extract<GeomObject, { type: 'line' }> {
    return { type: 'line', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  equals(other: Line | null | undefined): boolean {
    if (!other || other.type !== 'line') return false;
    return Math.abs(this.x1 - other.x1) < TOL && Math.abs(this.y1 - other.y1) < TOL &&
      Math.abs(this.x2 - other.x2) < TOL && Math.abs(this.y2 - other.y2) < TOL;
  }

  static fromObject(o: GeomObject | null | undefined): Line | null {
    if (!o || o.type !== 'line') return null;
    return new Line(o.x1, o.y1, o.x2, o.y2);
  }
}

export class Ray {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  get type(): 'ray' { return 'ray'; }

  distanceFrom(x: number, y: number): number {
    return geom.distToRay(x, y, this.x1, this.y1, this.x2, this.y2);
  }

  clipToViewBox(vb: ViewBox): number[] {
    return geom.clipRayToViewBox(this.x1, this.y1, this.x2, this.y2, vb);
  }

  intersect(other: GeometryInstance): Point2[] {
    return geom.intersectTwoObjects(this.toObject(), other.toObject());
  }

  toObject(): Extract<GeomObject, { type: 'ray' }> {
    return { type: 'ray', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  equals(other: Ray | null | undefined): boolean {
    if (!other || other.type !== 'ray') return false;
    return Math.abs(this.x1 - other.x1) < TOL && Math.abs(this.y1 - other.y1) < TOL &&
      Math.abs(this.x2 - other.x2) < TOL && Math.abs(this.y2 - other.y2) < TOL;
  }

  static fromObject(o: GeomObject | null | undefined): Ray | null {
    if (!o || o.type !== 'ray') return null;
    return new Ray(o.x1, o.y1, o.x2, o.y2);
  }
}

export class Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(x1: number, y1: number, x2: number, y2: number) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  get type(): 'segment' { return 'segment'; }

  distanceFrom(x: number, y: number): number {
    return geom.distToSegment(x, y, this.x1, this.y1, this.x2, this.y2);
  }

  intersect(other: GeometryInstance): Point2[] {
    return geom.intersectTwoObjects(this.toObject(), other.toObject());
  }

  toObject(): Extract<GeomObject, { type: 'segment' }> {
    return { type: 'segment', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }

  equals(other: Segment | null | undefined): boolean {
    if (!other || other.type !== 'segment') return false;
    return Math.abs(this.x1 - other.x1) < TOL && Math.abs(this.y1 - other.y1) < TOL &&
      Math.abs(this.x2 - other.x2) < TOL && Math.abs(this.y2 - other.y2) < TOL;
  }

  static fromObject(o: GeomObject | null | undefined): Segment | null {
    if (!o || o.type !== 'segment') return null;
    return new Segment(o.x1, o.y1, o.x2, o.y2);
  }
}

export class Angle {
  x1: number;
  y1: number;
  vx: number;
  vy: number;
  x2: number;
  y2: number;

  constructor(x1: number, y1: number, vx: number, vy: number, x2: number, y2: number) {
    this.x1 = x1;
    this.y1 = y1;
    this.vx = vx;
    this.vy = vy;
    this.x2 = x2;
    this.y2 = y2;
  }

  get type(): 'angle' { return 'angle'; }

  distanceFrom(x: number, y: number): number {
    const d1 = geom.distToRay(x, y, this.vx, this.vy, this.x1, this.y1);
    const d2 = geom.distToRay(x, y, this.vx, this.vy, this.x2, this.y2);
    return Math.min(d1, d2);
  }

  closerRay(x: number, y: number): 1 | 2 {
    const d1 = geom.distToRay(x, y, this.vx, this.vy, this.x1, this.y1);
    const d2 = geom.distToRay(x, y, this.vx, this.vy, this.x2, this.y2);
    return d1 <= d2 ? 1 : 2;
  }

  getRayAsObject(arm: 1 | 2): Extract<GeomObject, { type: 'ray' }> {
    if (arm === 1) return { type: 'ray', x1: this.vx, y1: this.vy, x2: this.x1, y2: this.y1 };
    return { type: 'ray', x1: this.vx, y1: this.vy, x2: this.x2, y2: this.y2 };
  }

  getRay(arm: 1 | 2): Ray {
    if (arm === 1) return new Ray(this.vx, this.vy, this.x1, this.y1);
    return new Ray(this.vx, this.vy, this.x2, this.y2);
  }

  clipRaysToViewBox(vb: ViewBox): [number[], number[]] {
    const seg1 = geom.clipRayToViewBox(this.vx, this.vy, this.x1, this.y1, vb);
    const seg2 = geom.clipRayToViewBox(this.vx, this.vy, this.x2, this.y2, vb);
    return [seg1, seg2];
  }

  angleArcPoints(r: number): { start: number; sweep: number; largeArc: number; endX: number; endY: number; r: number } {
    const arm1 = { x: this.x1, y: this.y1 };
    const vertex = { x: this.vx, y: this.vy };
    const arm2 = { x: this.x2, y: this.y2 };
    return geom.angleArcPoints(arm1, vertex, arm2, r);
  }

  intersect(other: GeometryInstance): Point2[] {
    const r1 = this.getRay(1).intersect(other);
    const r2 = this.getRay(2).intersect(other);
    const seen = new Set<string>();
    const out: Point2[] = [];
    for (const p of [...r1, ...r2]) {
      const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
      if (!seen.has(key)) { seen.add(key); out.push(p); }
    }
    return out;
  }

  toObject(): Extract<GeomObject, { type: 'angle' }> {
    return { type: 'angle', x1: this.x1, y1: this.y1, vx: this.vx, vy: this.vy, x2: this.x2, y2: this.y2 };
  }

  static fromObject(o: GeomObject | null | undefined): Angle | null {
    if (!o || o.type !== 'angle') return null;
    return new Angle(o.x1, o.y1, o.vx, o.vy, o.x2, o.y2);
  }
}

export class Circle {
  cx: number;
  cy: number;
  r: number;

  constructor(cx: number, cy: number, r: number) {
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }

  get type(): 'circle' { return 'circle'; }

  distanceFrom(x: number, y: number): number {
    return geom.distToCircle(x, y, this.cx, this.cy, this.r);
  }

  intersect(other: GeometryInstance): Point2[] {
    return geom.intersectTwoObjects(this.toObject(), other.toObject());
  }

  toObject(): Extract<GeomObject, { type: 'circle' }> {
    return { type: 'circle', cx: this.cx, cy: this.cy, r: this.r };
  }

  equals(other: Circle | null | undefined): boolean {
    if (!other || other.type !== 'circle') return false;
    return Math.abs(this.cx - other.cx) < TOL && Math.abs(this.cy - other.cy) < TOL && Math.abs(this.r - other.r) < TOL;
  }

  static fromObject(o: GeomObject | null | undefined): Circle | null {
    if (!o || o.type !== 'circle') return null;
    return new Circle(o.cx, o.cy, o.r);
  }
}

const builders = [Point.fromObject, Line.fromObject, Ray.fromObject, Segment.fromObject, Angle.fromObject, Circle.fromObject];

export function fromObject(o: GeomObject | null | undefined): GeometryInstance | null {
  if (!o || typeof o.type !== 'string') return null;
  for (const build of builders) {
    const instance = build(o);
    if (instance) return instance;
  }
  return null;
}

export function toObject(obj: GeometryInstance | GeomObject): GeomObject {
  if (obj && typeof (obj as GeometryInstance).toObject === 'function') return (obj as GeometryInstance).toObject();
  return obj as GeomObject;
}
