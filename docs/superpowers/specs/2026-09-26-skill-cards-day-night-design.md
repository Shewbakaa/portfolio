# Skill cards: day/night paper sketches

Date: 2026-09-26

## Goal

Restyle the four skill cards (Languages, Technologies, Frameworks, Testing
Tools) to match the paper and pencil theme, keeping the existing day to night
hover idea. Each card is a different kind of paper, and the skill list is
always readable.

## Papers

| Card | Day | Fastener / edge | Night |
|---|---|---|---|
| Languages | Watercolor: cream with soft yellow and blue washes | Teal washi tape, deckled edges | Indigo watercolor wash |
| Technologies | Green engineering graph paper | Perforated top edge | Blueprint (white grid on blue) |
| Frameworks | Kraft paper with fibre specks | Black binder clip, torn top | Dark kraft |
| Testing Tools | Dot-grid journal | Paperclip, dog-eared corner | Chalkboard dots |

## Shared content

- Title in Cabin Sketch; skills in Caveat with `~` bullets by day and `*`
  bullets by night. The list is always visible.
- Day: a pencil sun with a smiley face (closed happy arc eyes, a smile) whose
  rays turn slowly, and a drifting outline cloud. On kraft paper both are
  drawn in dark brown.
- Night: the sun sets and a crescent moon rises with a sleepy face (a closed
  eye and a small mouth) and floating "z"s. There are 16 twinkling stars per
  card (seeded, so layouts differ per card but stay stable), and a shooting
  star from top-left to bottom-right every 4.5s, offset per card.

## Behaviour

- Night on hover (devices that support hover) or on tap (touch); a drag never
  toggles night.
- Cards stay draggable with the existing pointer drag and keep their wide,
  medium and narrow layouts.
- The night animations (twinkle, shooting star, z's) are paused by day.
- Card size: 280x380, matching the project cards.

## Implementation notes

- Keep `.skill-cards-cluster`, `.skill-cards-canvas-card` and the `card1` to
  `card4` ids: the intro animation and nav target them. The intro clears
  transforms on the card, so the tilt lives on an inner `.skill-page`.
- Remove `skills.css`, `Bg-Animations/Clouds.js`, `Bg-Animations/Stars.js`,
  the react-bootstrap `ListGroup` usage, and the unused image assets (`lang`,
  `tech`, `framework`, `test`, `sun`, `moon` PNGs). Only the skill cards use
  them.
- Doodles are inline SVG and all motion is CSS, with no JavaScript animation
  loops.

## Testing

Production build, then in the browser: day and night on hover; tapping
toggles night and a drag doesn't; stars and the shooting star run only at
night; the intro pop still works; nav "Skills" still pans to the cluster.
