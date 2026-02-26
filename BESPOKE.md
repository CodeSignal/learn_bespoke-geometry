# Bespoke Simulation Framework

This document describes how the Bespoke framework is used in this application: layout, design system integration, and conventions. It is the canonical contract for this repo.

## Required Files Structure

This application includes:

1. CodeSignal Design System foundations: colors, spacing, typography, button
2. CodeSignal Design System components (optional): boxes, dropdown, input, tags, modal
3. bespoke.css – Bespoke layout, utilities, and temporary components
4. components/modal/modal.css and modal.js (design system; used for help modal)
5. app.js (WebSocket, help modal bootstrap, logger)
6. server.js (static server, WebSocket, POST /message, POST /log)

## HTML Structure

- Use the `.bespoke` class on the body element for scoping.
- Load design system CSS, then bespoke.css, then app-specific CSS.
- Load app.js and app-specific scripts as modules.

## CSS Implementation

1. ALWAYS use the `.bespoke` class on the body element for scoping.
2. USE design system components directly with proper classes:
   - Buttons: `button button-primary`, `button button-secondary`,
     `button button-danger`, `button button-text`, `button button-tertiary`
   - Boxes/Cards: `box card` for card containers
   - Inputs: Add `input` class to input elements:
     `<input type="text" class="input" />`
3. USE design system CSS custom properties for styling:
   - Colors: `--Colors-*` (e.g., `--Colors-Primary-Default`,
     `--Colors-Text-Body-Default`)
   - Spacing: `--UI-Spacing-*` (e.g., `--UI-Spacing-spacing-ml`,
     `--UI-Spacing-spacing-xl`)
   - Typography: `--Fonts-*`, `--Fonts-Headlines-*`
   - Borders: `--UI-Radius-*` (e.g., `--UI-Radius-radius-s`,
     `--UI-Radius-radius-m`)
   - Font families: `--body-family`, `--heading-family`
4. OVERRIDE design system variables in app-specific CSS, not in bespoke.css.
5. FOLLOW design system naming conventions for consistency.

## JavaScript Implementation

### Help modal

- Load help content (e.g. from `help-content.html`) and use the design system Modal:
  `Modal.createHelpModal({ title: 'Help', content, triggerSelector: '#btn-help' })`.
- Include `modal.css` and import `Modal` from `design-system/components/modal/modal.js`.

### Error handling

- Wrap async operations in try-catch blocks.
- Provide meaningful error messages; log errors to console.
- Implement retry logic for network operations where appropriate.
- Handle localStorage quota exceeded when persisting data.
- Validate data before saving.

## File Naming Conventions

- CSS: kebab-case (e.g. geometry-plane.css)
- JavaScript/TypeScript: kebab-case (e.g. geometry-plane.ts)
- Data files: kebab-case (e.g. solution.json)
- Image files: kebab-case (e.g. overview.png)

---

# Bespoke Design System Guidelines

This section explains how the CodeSignal Design System is used with Bespoke in this application.

## Overview

Bespoke uses the CodeSignal Design System for components and tokens, with layout and utilities in bespoke.css. All styles are scoped under `.bespoke` to prevent interference with parent site styles.

## Basic Usage

### 1. Include the CSS

```html
<link rel="stylesheet" href="./bespoke.css" />
```

### 2. Wrap the application

```html
<body class="bespoke">
  <!-- Application content -->
</body>
```

### 3. Use the component classes

```html
<div class="bespoke">
  <header class="header">
    <h1>App Title</h1>
    <button class="button button-text">Help</button>
  </header>

  <main class="main-layout">
    <aside class="sidebar">
      <section class="box card">
        <h2>Settings</h2>
        <form>
          <label>Name
            <input type="text" class="input" placeholder="Enter name" />
          </label>
          <button type="submit" class="button button-primary">Save</button>
        </form>
      </section>
    </aside>

    <div class="content-area">
      <!-- Main content -->
    </div>
  </main>
</div>
```

## Component Reference

### Layout Components

#### Header

```html
<header class="header">
  <h1>App Title</h1>
  <button class="button button-text">Help</button>
</header>
```

#### Main Layout (Sidebar + Content)

```html
<main class="main-layout">
  <aside class="sidebar">
    <!-- Sidebar content -->
  </aside>
  <div class="content-area">
    <!-- Main content area -->
  </div>
</main>
```

#### Cards

```html
<section class="box card">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</section>
```

### Form Components

#### Labels and inputs

```html
<label>Field Name
  <input type="text" class="input" />
</label>
```

#### Buttons

```html
<button class="button button-text">Text</button>
<button class="button button-primary">Primary</button>
<button class="button button-danger">Danger</button>
<button class="button button-tertiary">Secondary</button>
```

### Modal (Help)

Use the design system Modal for help content:

```javascript
import Modal from './design-system/components/modal/modal.js';

const helpModal = Modal.createHelpModal({
  title: 'Help',
  content: helpContent,
  triggerSelector: '#btn-help'
});
```

See `client/design-system/components/modal/README.md` for full API.

## Customization

Override design system CSS variables in app-specific CSS (`--Colors-*`, `--UI-Spacing-*`, `--Fonts-*`, `--UI-Radius-*`).

## Theme Support

The framework respects the user's system preference for light/dark theme. No extra configuration is required.

## Best Practices

1. **Always wrap in `.bespoke`** to avoid style conflicts with the host page.
2. **Use design system components directly** with the documented class combinations.
3. **Use semantic HTML** for accessibility.
4. **Override in app-specific CSS** using design system variables; do not edit bespoke.css for app-specific overrides.
5. **Test in both themes** (light and dark).
