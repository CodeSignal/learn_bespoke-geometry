# Geometry Plane – Bespoke Simulation Application

An interactive 2D coordinate plane built with the Bespoke Simulation framework. Create points, lines, rays, segments, angles, and circles; find intersections; label points. Uses the CodeSignal Design System for layout and components.

## Components

### 1. Design System Integration
This application uses the CodeSignal Design System in `client/design-system/`:
- **Foundations**: Colors, spacing, typography tokens
- **Components**: Buttons, boxes, inputs, dropdowns, tags, modal
- Light and dark theme support (automatic)

### 2. `client/bespoke.css`
Bespoke layout and utilities:
- Layout (header, sidebar, main-layout, content-area)
- Utility classes (row, spacer)
- Temporary form/toggle components until the design system provides them

### 3. `client/index.html`
Main page: header, sidebar with tools and label panel, content area with the plane container, help button. Scripts load `app.js` (WebSocket, help modal, logger) and `geometry-plane.js`.

### 4. Help modal
Help content is loaded from `client/help-content.html` and shown via the design system Modal (`Modal.createHelpModal`). See `client/design-system/components/modal/README.md` for the API.

## Running the Application

1. **Install dependencies** (optional for WebSocket and logging):
   ```bash
   npm install
   ```

2. **Development**
   - Build TypeScript: `npm run build` (runs `tsc`, outputs `.js` in `client/`)
   - Start server: `node server.js` or `npm run dev:server`
   - Or use `npm run start:dev` for Vite dev server plus API server on another port.

   Default URL: `http://localhost:3000`.

3. **Production**
   - Build: `npm run build`
   - Serve: set `IS_PRODUCTION=true` and run `node server.js` (or `npm start`) to serve from `dist/` if you use a separate build that outputs to `dist/`; otherwise serve from `client/` as in development.

4. **Type-check only**: `npm run typecheck`

## Server

The server (`server.js`) provides:
- Static file serving (from `client/` in development, or `dist/` in production when `IS_PRODUCTION=true`)
- WebSocket at path `/ws` for real-time alerts
- **POST /message** – broadcast a message to connected clients (body: `{ "message": "string" }`)
- **POST /log** – append a line to `logs/user_actions.log` (body: `{ "message": "string" }`). The `logs/` directory is created at startup if missing.

### WebSocket messaging

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from the server!"}'
```

## Logging and validation

- **Server:** `POST /log` writes each `message` as one line to `logs/user_actions.log`. The geometry plane sends JSON-serialized operation objects (add, remove, intersection, clear, label) so each line is one JSON object.
- **Client:** `logAction(message)` in `client/logger.js` sends to `/log`; exposed as `window.logAction` for validators.
- **Validation:** Use **final state** via `getPlaneStateSnapshot()` (exported from `geometry-plane.js`) to compare the construction to an expected state, or use **operation log** via `getOperationLog()` (or the server log file) to validate the sequence of steps. See [AGENTS.md](./AGENTS.md) for details.

## Framework documentation

For layout, design system usage, and conventions, see [BESPOKE.md](./BESPOKE.md). For repository guidelines and validation API, see [AGENTS.md](./AGENTS.md).

## CI/CD and Releases

The GitHub Actions workflow (`.github/workflows/build-release.yml`) runs on push to `main`: checkout, init submodules, `npm ci`, `npm run build`, then creates a release tarball and GitHub Release. Ensure the build script produces the artifacts your deployment expects (e.g. `dist/` if the workflow packages it).

## Example app

`client/example-app/` is a reference application that demonstrates Bespoke layout and design system components (buttons, inputs, dropdowns, tags). Open `http://localhost:3000/example-app/index.html` when the server is running.

## Pushing to your own GitHub repo

If you cloned from `CodeSignal/learn_bespoke-template`, the git remote still points at that repo. To push this project to a new GitHub repository under your account or org:

1. **Create a new repository on GitHub** (empty, no README/license/gitignore).

2. **Point this repo’s `origin` at the new URL** (replace with your repo URL):
   ```bash
   git remote set-url origin git@github.com:YOUR_USER_OR_ORG/YOUR_REPO_NAME.git
   ```
   Or with HTTPS:
   ```bash
   git remote set-url origin https://github.com/YOUR_USER_OR_ORG/YOUR_REPO_NAME.git
   ```

3. **Push your branch** (e.g. `main`):
   ```bash
   git push -u origin main
   ```

4. **Optional: rename the project folder** to match the new repo (e.g. `bespoke-geometry-plane` or `learn_bespoke-geometry`). Do this outside the folder (e.g. from `Documents/work/`):
   ```bash
   mv learn_bespoke-template bespoke-geometry-plane
   ```
   Then open the renamed folder in your editor. Git history is unchanged; only the directory name changes.

The design-system submodule (`client/design-system`) will continue to track the CodeSignal design-system repo; you don’t need to change that to push your own repo.
