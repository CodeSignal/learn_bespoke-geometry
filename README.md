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

## Example app

`client/example-app/` demonstrates Bespoke layout and design system components. Open **http://localhost:3000/example-app/index.html** when the server is running.

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

## Releases

Published from version tags (e.g. `v1.0.0`); see the [Releases](https://github.com/CodeSignal/learn_bespoke-geometry/releases) page.
