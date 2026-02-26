/**
 * Geometry object types for the plane. Each knows its data, distance, intersection, and serialization.
 */
import * as geom from './geometry-math.js';
const TOL = 1e-9;
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    get type() { return 'point'; }
    distanceFrom(x, y) {
        return Math.hypot(x - this.x, y - this.y);
    }
    intersect(other) {
        return geom.intersectTwoObjects(this.toObject(), other.toObject());
    }
    toObject() {
        return { type: 'point', x: this.x, y: this.y };
    }
    equals(other) {
        return !!other && other.type === 'point' && Math.hypot(this.x - other.x, this.y - other.y) < TOL;
    }
    static fromObject(o) {
        if (!o || o.type !== 'point')
            return null;
        return new Point(o.x, o.y);
    }
}
export class Line {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    get type() { return 'line'; }
    distanceFrom(x, y) {
        return geom.distToLine(x, y, this.x1, this.y1, this.x2, this.y2);
    }
    clipToViewBox(vb) {
        return geom.clipLineToViewBox(this.x1, this.y1, this.x2, this.y2, vb);
    }
    intersect(other) {
        return geom.intersectTwoObjects(this.toObject(), other.toObject());
    }
    toObject() {
        return { type: 'line', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    }
    equals(other) {
        if (!other || other.type !== 'line')
            return false;
        return Math.abs(this.x1 - other.x1) < TOL && Math.abs(this.y1 - other.y1) < TOL &&
            Math.abs(this.x2 - other.x2) < TOL && Math.abs(this.y2 - other.y2) < TOL;
    }
    static fromObject(o) {
        if (!o || o.type !== 'line')
            return null;
        return new Line(o.x1, o.y1, o.x2, o.y2);
    }
}
export class Ray {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    get type() { return 'ray'; }
    distanceFrom(x, y) {
        return geom.distToRay(x, y, this.x1, this.y1, this.x2, this.y2);
    }
    clipToViewBox(vb) {
        return geom.clipRayToViewBox(this.x1, this.y1, this.x2, this.y2, vb);
    }
    intersect(other) {
        return geom.intersectTwoObjects(this.toObject(), other.toObject());
    }
    toObject() {
        return { type: 'ray', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    }
    equals(other) {
        if (!other || other.type !== 'ray')
            return false;
        return Math.abs(this.x1 - other.x1) < TOL && Math.abs(this.y1 - other.y1) < TOL &&
            Math.abs(this.x2 - other.x2) < TOL && Math.abs(this.y2 - other.y2) < TOL;
    }
    static fromObject(o) {
        if (!o || o.type !== 'ray')
            return null;
        return new Ray(o.x1, o.y1, o.x2, o.y2);
    }
}
export class Segment {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    get type() { return 'segment'; }
    distanceFrom(x, y) {
        return geom.distToSegment(x, y, this.x1, this.y1, this.x2, this.y2);
    }
    intersect(other) {
        return geom.intersectTwoObjects(this.toObject(), other.toObject());
    }
    toObject() {
        return { type: 'segment', x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    }
    equals(other) {
        if (!other || other.type !== 'segment')
            return false;
        return Math.abs(this.x1 - other.x1) < TOL && Math.abs(this.y1 - other.y1) < TOL &&
            Math.abs(this.x2 - other.x2) < TOL && Math.abs(this.y2 - other.y2) < TOL;
    }
    static fromObject(o) {
        if (!o || o.type !== 'segment')
            return null;
        return new Segment(o.x1, o.y1, o.x2, o.y2);
    }
}
export class Angle {
    constructor(x1, y1, vx, vy, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.vx = vx;
        this.vy = vy;
        this.x2 = x2;
        this.y2 = y2;
    }
    get type() { return 'angle'; }
    distanceFrom(x, y) {
        const d1 = geom.distToRay(x, y, this.vx, this.vy, this.x1, this.y1);
        const d2 = geom.distToRay(x, y, this.vx, this.vy, this.x2, this.y2);
        return Math.min(d1, d2);
    }
    closerRay(x, y) {
        const d1 = geom.distToRay(x, y, this.vx, this.vy, this.x1, this.y1);
        const d2 = geom.distToRay(x, y, this.vx, this.vy, this.x2, this.y2);
        return d1 <= d2 ? 1 : 2;
    }
    getRayAsObject(arm) {
        if (arm === 1)
            return { type: 'ray', x1: this.vx, y1: this.vy, x2: this.x1, y2: this.y1 };
        return { type: 'ray', x1: this.vx, y1: this.vy, x2: this.x2, y2: this.y2 };
    }
    getRay(arm) {
        if (arm === 1)
            return new Ray(this.vx, this.vy, this.x1, this.y1);
        return new Ray(this.vx, this.vy, this.x2, this.y2);
    }
    clipRaysToViewBox(vb) {
        const seg1 = geom.clipRayToViewBox(this.vx, this.vy, this.x1, this.y1, vb);
        const seg2 = geom.clipRayToViewBox(this.vx, this.vy, this.x2, this.y2, vb);
        return [seg1, seg2];
    }
    angleArcPoints(r) {
        const arm1 = { x: this.x1, y: this.y1 };
        const vertex = { x: this.vx, y: this.vy };
        const arm2 = { x: this.x2, y: this.y2 };
        return geom.angleArcPoints(arm1, vertex, arm2, r);
    }
    intersect(other) {
        const r1 = this.getRay(1).intersect(other);
        const r2 = this.getRay(2).intersect(other);
        const seen = new Set();
        const out = [];
        for (const p of [...r1, ...r2]) {
            const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
            if (!seen.has(key)) {
                seen.add(key);
                out.push(p);
            }
        }
        return out;
    }
    toObject() {
        return { type: 'angle', x1: this.x1, y1: this.y1, vx: this.vx, vy: this.vy, x2: this.x2, y2: this.y2 };
    }
    static fromObject(o) {
        if (!o || o.type !== 'angle')
            return null;
        return new Angle(o.x1, o.y1, o.vx, o.vy, o.x2, o.y2);
    }
}
export class Circle {
    constructor(cx, cy, r) {
        this.cx = cx;
        this.cy = cy;
        this.r = r;
    }
    get type() { return 'circle'; }
    distanceFrom(x, y) {
        return geom.distToCircle(x, y, this.cx, this.cy, this.r);
    }
    intersect(other) {
        return geom.intersectTwoObjects(this.toObject(), other.toObject());
    }
    toObject() {
        return { type: 'circle', cx: this.cx, cy: this.cy, r: this.r };
    }
    equals(other) {
        if (!other || other.type !== 'circle')
            return false;
        return Math.abs(this.cx - other.cx) < TOL && Math.abs(this.cy - other.cy) < TOL && Math.abs(this.r - other.r) < TOL;
    }
    static fromObject(o) {
        if (!o || o.type !== 'circle')
            return null;
        return new Circle(o.cx, o.cy, o.r);
    }
}
const builders = [Point.fromObject, Line.fromObject, Ray.fromObject, Segment.fromObject, Angle.fromObject, Circle.fromObject];
export function fromObject(o) {
    if (!o || typeof o.type !== 'string')
        return null;
    for (const build of builders) {
        const instance = build(o);
        if (instance)
            return instance;
    }
    return null;
}
export function toObject(obj) {
    if (obj && typeof obj.toObject === 'function')
        return obj.toObject();
    return obj;
}
