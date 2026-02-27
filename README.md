# Geometry Plane

An interactive 2D coordinate plane for exploring Euclidean geometry. Build constructions with points, lines, rays, segments, angles, and circles; find intersections; label points. Built with the Bespoke Simulation framework and the CodeSignal Design System.

## What you can do

- **Points** – Place points on the grid or snap them to lines, rays, segments, and circles.
- **Lines, rays, segments** – Draw through two points.
- **Angles** – Mark an angle at a vertex with two arms.
- **Circles** – Define a circle by center and a point on the circumference.
- **Intersections** – Select two objects to add their intersection points.
- **Labels** – Name points (e.g. A₁, B₂). Subscripts: use underscore (e.g. `A_1`).
- **Clear** – Remove objects one by one or clear the whole construction.

The plane supports pan and zoom. State is saved in the browser and can be logged for tasks and validation.

## Quick start

```bash
npm install
npm run build
node server.js
```

Open **http://localhost:3000**. Build compiles TypeScript to `client/`; the server serves from `client/` by default.

- **Type-check only:** `npm run typecheck`
- **Production:** set `IS_PRODUCTION=true` and run the server to serve from `dist/` (see CI for how `dist/` is produced).

## For developers

### Framework and docs

- [BESPOKE.md](./BESPOKE.md) – Layout, design system, and conventions.
- [AGENTS.md](./AGENTS.md) – Repo guidelines, validation API, and logging.

### Server and integration

The server (`server.js`) serves static files and supports:

- **WebSocket** (`/ws`) – Optional; used for real-time alerts (e.g. from a Run/Submit flow).
- **POST /message** – Broadcast a message to connected clients (`{ "message": "string" }`).
- **POST /log** – Append a line to `logs/user_actions.log` (`{ "message": "string" }`). Used for operation logging.

### Logging and validation

The geometry plane logs each construction change (add, remove, intersection, clear, label) to the server and keeps an in-memory operation log. For task validation:

- **Final state** – `getPlaneStateSnapshot()` (from `geometry-plane.js`) returns the current construction as a serializable array.
- **Operation log** – `getOperationLog()` returns the sequence of operations; the same data is written to `logs/user_actions.log`.

Details and payload formats: [AGENTS.md](./AGENTS.md).

**Task validation:** The student works in the browser (already open at localhost:3000). Every action is logged to `logs/user_actions.log`. Run validation with the task you are solving; the script replays the log and runs the selected task validator. The app does not show the task description—see the task descriptions below and use `TASK=<task-id> npm run validate` to check your work.

**Validate:** `TASK=<task-id> npm run validate` (default task: `line-and-points`). Set `LOG_FILE` for a different log path. You can also validate a snapshot file: `node run-validate.mjs snapshot.json` or pipe JSON to stdin. Exit code 0 = valid, 1 = invalid.

### Task descriptions

**line-and-points** (default)  
Construct one line and exactly five points: three on the line, two off it.

**equilateral-triangle**  
Construct an equilateral triangle: three segments of equal length forming a closed triangle.

**parallel-lines**  
Draw two parallel lines.

**prove-opposite-rays**  
*Task:* Prove that opposite rays lie on one line.  
*Expected proof:* Construct two opposite rays (e.g. ray AB and ray CB with B between A and C). Give a multi-step proof (at least 3 steps): set up givens or definitions, then a step that cites "Theorem: opposite rays lie on one line" with a prerequisite.

**prove-perpendicular-bisector**  
*Task:* Given triangle ABC, M ∈ BC with BM = MC and AM ⊥ BC; prove AB = AC. Only the **proof** is validated (not the construction on the plane).  
*Expected proof:* At least 6 steps: (1) ∠AMC = 90°, (2) ∠AMB = 90°, (3) ∠AMC = ∠AMB (both 90° ⇒ equal), (4) BM = MC (Given), (5) AM = AM (Reflexivity) and ΔAMB ≅ ΔAMC (SAS), (6) AB = AC (From congruence / CPCTC).

Examples: `TASK=equilateral-triangle npm run validate`, `TASK=prove-opposite-rays npm run validate`.

## Releases

Published from version tags (e.g. `v1.0.0`); see the [Releases](https://github.com/CodeSignal/learn_bespoke-geometry/releases) page.
