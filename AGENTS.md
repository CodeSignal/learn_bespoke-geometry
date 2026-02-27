# Repository Guidelines

This repository is a **Bespoke application**: the Geometry Plane, an interactive 2D coordinate plane with point, line, ray, segment, angle, circle, and intersection tools. For the Bespoke framework contract (layout, design system, conventions), see [BESPOKE.md](./BESPOKE.md).

## Overview

This application provides:
- CodeSignal Design System integration
- Consistent layout (header, sidebar, main content area)
- Help modal (content from `help-content.html`)
- Local development server with WebSocket support and operation logging
- Geometry plane state and operation log for validation

## Quick Start

1. **Run the application**
   ```bash
   npm run dev
   ```
   Server runs at `http://localhost:3000`. TypeScript is compiled via `tsc`; use `npm run typecheck` to type-check without emitting.

2. **Production**: `npm run build` (compiles TypeScript to `client/`), then `npm start` (or use your preferred production server setup).

## Key Conventions

### File Naming

- CSS files: kebab-case (e.g. `geometry-plane.css`)
- JavaScript/TypeScript files: kebab-case (e.g. `geometry-plane.ts`)
- Data files: kebab-case (e.g. `solution.json`)
- Image files: kebab-case (e.g. `overview.png`)

### Error Handling

- Wrap all async operations in try-catch blocks
- Provide meaningful error messages to users
- Log errors to console for debugging
- Implement retry logic for network operations where appropriate
- Handle localStorage quota exceeded errors when persisting
- Validate data before saving operations

## Development Workflow

### TypeScript

The geometry plane and app entry use **TypeScript** (`.ts`). The browser loads the **compiled JavaScript** (`client/*.js`); editing a `.ts` file does not update the `.js` until you recompile.

- **Type-check only:** `npm run typecheck`
- **Compile once:** `npm run build` (runs `tsc`; writes `client/*.js` and `validate/*.js`). Run this after changing any `.ts` file so the app uses your changes.
- **Compile on save:** `npm run build:watch` — runs `tsc --watch` so that saving a `.ts` file automatically updates the corresponding `.js`. Use this in a separate terminal while developing.

### WebSocket Messaging

The server provides `POST /message` for real-time alerts:

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'
```

Requires `ws` package: `npm install`.

## Logging and validation

### Server

- **`POST /log`** – Accepts `{ "message": "string" }`. Appends the message as one line to `logs/user_actions.log`. The server creates the `logs/` directory at startup if missing. Used for operation logging and optional state snapshots.

### Client

- **`logAction(message)`** – Defined in `client/logger.js` and exposed on `window.logAction`. Sends the string to `POST /log` (fire-and-forget). The geometry plane calls it for every mutation (add, remove, intersection, clear, and optionally label) with a JSON-serialized payload (one object per line) so validators can parse line-by-line.

### Validation

There is no validation API or server endpoint. **Validation is log-based:** run `npm run validate` (or `node run-validate.mjs`); the script reads `logs/user_actions.log`, replays operations via `validate/replay.ts`, and runs the task validator selected by `TASK` (default `line-and-points`). Tasks: `line-and-points`, `equilateral-triangle`, `parallel-lines`. Set `LOG_FILE` to override log path. Snapshot file or stdin: `node run-validate.mjs snapshot.json` or pipe JSON. Exit code 0 = valid, 1 = invalid. **Replay** lives in `validate/replay.ts` (canonical operation replay). **Validators** and task registry in `validate/tasks.ts`; geometry helpers in `validate/geometry.ts`. When adding a new task, add a validator in `validate/tasks.ts` and register it in `TASK_REGISTRY`. Validators can use either or both of:

1. **Final state** – Call **`getPlaneStateSnapshot()`** (exported from `geometry-plane.js`). Returns an array of `{ geom, name?, labelAngle? }` in the same form as saved state. Compare to an expected construction (e.g. same set of objects, coordinate tolerance).

2. **Operation log** – Call **`getOperationLog()`** (exported from `geometry-plane.js`) to get the in-memory sequence of operations, or read `logs/user_actions.log` server-side. Each line can be a JSON object with `op`, `tool`, `geom`, `index`, etc. Check that the user performed an allowed sequence of steps.

## Framework Documentation

For design system usage, layout components, and CSS/JS conventions, see [BESPOKE.md](./BESPOKE.md).

## Project Structure

```
client/
  ├── index.html           # Main HTML
  ├── app.js               # WebSocket, help modal, logger bootstrap
  ├── logger.js            # logAction() for POST /log
  ├── bespoke.css          # Bespoke layout and utilities
  ├── geometry-plane.ts   # Plane logic, state, operation log
  ├── geometry-math.ts     # Geometry math utilities
  ├── geometry-objects.ts  # Point, Line, Ray, Segment, Angle, Circle
  ├── help-content.html    # Help modal content
  └── design-system/       # CodeSignal Design System
validate/
  ├── types.ts             # GeomObject, SnapshotEntry, OperationLogEntry
  ├── geometry.ts          # distToLine, segmentLength, areParallel, etc.
  ├── replay.ts            # Full operation replay (replayLogToSnapshot, replayLogFromString)
  └── tasks.ts             # Task validators + TASK_REGISTRY
run-validate.mjs           # CLI: log/file/stdin -> replay -> run task validator
server.js                  # Static server, WebSocket, POST /message, POST /log
```

## Notes for AI Agents

When working on this application:

1. **Reference BESPOKE.md** for layout, design system, and implementation details.
2. **Follow the conventions** above for file naming and error handling.
3. **Use Design System components** as documented in BESPOKE.md.
4. **Logging**: Use `logAction(JSON.stringify({ op, ... }))` for any new user actions that should be validated; keep one JSON object per call for line-by-line parsing.
5. **Validation**: Use `getPlaneStateSnapshot()` and `getOperationLog()` for task/validation features; do not mutate state from validators.
