# Project cards: sketchbook page redesign

Date: 2026-09-26

## Goal

Replace the neo-brutalist project cards on the infinite canvas with hand-drawn
sketchbook pages that match the site's paper theme (graph-paper canvas, sticky
notes, the "let's go!" sketch button). Clicking a page flips it over to show the
details.

## Look

- **Page**: off-white paper (`#fdfcf6`), torn bottom edge (clip-path), soft
  lifted-paper shadow, one strip of yellow washi tape, per-card tilt (existing
  `--pc-rot`). Size stays 280×380.
- **Front**
  - Title in Cabin Sketch with a yellow highlighter underline.
  - Existing Lottie / Pacman video inside a wobbly pencil frame.
  - Margin note in Caveat (teal), new per-project `note` field.
  - Date in Caveat, from `createdDate`, formatted like `Mar '24`.
  - Subtle `flip ↻` hint.
- **Back**
  - Title (Cabin Sketch), full description in Figtree on faint blue ruled lines.
  - GitHub and Live links rendered with the same sketch-button style as
    "let's go!": double wobbly pencil outline, yellow scribble fill, Cabin Sketch
    label, shadow stroke, line boil on hover/focus.
  - `flip back ↺` hint.
- Hand-drawn strokes use a seeded wobble per card: every card differs, but each
  one looks the same across visits.

## Behaviour

- Click (not drag) anywhere on a page flips it in 3D (~0.7s). Links don't flip.
- One page flipped at a time; flipping another, or clicking empty canvas,
  flips the open one back.
- Dragging a page still moves it (GSAP Draggable); a drag never flips.
- Keyboard: a visually hidden "Flip <title>" button per card toggles the flip;
  links are normal focusable anchors.
- Animations play only while the front is showing and the card is in view.
- Zoom compact/expanded modes are removed; zooming just scales the page.

## Architecture

- `src/components/sketch/sketchPaths.js`: seeded RNG + wobble helpers
  (`sketchBox`, hatch lines), extracted from `SketchEnterButton`.
- `src/components/SketchButton.js` (+ `src/styles/SketchButton.css`): generic
  hand-drawn button, renders `<a>` when given `href`, otherwise `<button>`.
  Props: `label`, `href`, `onClick`, `width`, `hatchColor`, `arrow`.
- `SketchEnterButton` becomes a thin wrapper over `SketchButton` (label
  "let's go!", arrow on), with an identical look.
- `ProjectCards.jsx`: card markup becomes article (position, tilt, drag) >
  leaf (3D flip) > front and back faces. Parent holds `flippedId` and reuses the
  existing outside-pointerdown handler to clear it. Flip triggers from
  Draggable's `onClick`, which only fires without movement.
- Removed: `useCanvasZoom`, `zoomLevel`, `forceExpanded`, `open` state, the
  `canvas:zoom` event in `InfiniteCanvas`, and the compact/expanded CSS.
- Kept: lazy Lottie/video loading, play/pause via refs, `useIsInView`, card
  positions, per-project animation size overrides (`#project-card-*`).
- `projects.json`: add a `note` string to each project.

## Testing

Production build, then in the browser:

- Flip on click; no flip after a drag; links open without flipping.
- Only one card flipped at a time; clicking the canvas flips it back.
- A flipped card's animation is paused; it resumes on flip back.
- Zooming changes no card classes; the "let's go!" button looks unchanged.
