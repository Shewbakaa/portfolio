# Timeline: detective board redesign

Date: 2026-09-26

## Goal

Replace the timeline strip's cream notes and dashed curves with a framed
corkboard of pinned polaroids joined by red yarn, matching the site's paper
theme.

## Look

- Framed corkboard (wooden frame, cork texture, inner shadow), about 1160x260,
  moved up 135px from the old strip so it clears the Now Playing and
  Currently Cooking cards below it. The canvas nav "EXP" target is unchanged
  (`#card-timeline`).
- One polaroid per milestone (7), in date order, each held by a red pushpin
  and slightly tilted.
  - Photo area tinted by type (education yellow, work teal, project red) with
    a pencil doodle: graduation cap, briefcase or lightbulb.
  - Year typewriter-stamped in the photo's corner.
  - Handwritten label as the caption.
- Red yarn connects the pins in date order, sagging slightly between them.
- A typed index card pinned in the top-left corner: "CASE FILE / the career
  of S. Pawar / 2017 → 2026".

## Behaviour

- Hover lifts and straightens a polaroid.
- Polaroids stay draggable; their yarn follows. Drag offsets are keyed per
  event, not per year, fixing notes with the same year moving together.
- The intro still pops each polaroid via `.timeline-note__pop`, which has no
  CSS transform, so GSAP's leftover inline transform is harmless.

## Implementation notes

- `TimelineStrip.jsx` keeps the events data; the markup and CSS are rewritten.
- The minimap marker in `canvasNavConfig.js` is resized to match the board.
