/**
 * Manual layout for `ProjectCards` on the infinite canvas.
 * Units are in "world px" (same coordinate space as badges/cards).
 *
 * Featured cards are keyed by their `projects.json` asset key:
 * - lottie: `animationData`
 * - lottie-prop: `animationData2` (if present) else `animationData`
 * - video: `video`
 * - image: `image`
 *
 * Cards with a `stack` field skip this map and live in a pile (see PROJECT_STACKS).
 */

export const PROJECT_CARD_POSITIONS = {
  // Row 1
  workoutBuddy: { left: 740, top: -560, rotate: 1.2 },
  localfixr: { left: 1100, top: -510, rotate: -1.4 },
  bookRoulette: { left: 1460, top: -580, rotate: 1.1 },
  mealRoulette: { left: 1820, top: -520, rotate: -1.3 },

  // Row 2
  foodservices: { left: 900, top: -30, rotate: 1.0 },
  pictureTrain: { left: 1260, top: 10, rotate: -1.2 },
  pacman: { left: 1620, top: -40, rotate: 1.4 },
};

/**
 * Piles east of the featured cards. Each pile fans out to the right in a single
 * row, so piles stacked vertically never collide when opened.
 * `left`/`top` is the top card's spot; the label sits underneath.
 */
export const PROJECT_STACKS = {
  friends: { label: 'made for friends', left: 2240, top: -640, rotate: -1.6 },
  experiments: { label: 'experiments', left: 2240, top: -140, rotate: 1.4 },
  early: { label: 'the early days', left: 2240, top: 360, rotate: -1.2 },
};

// Gap between fanned-out cards (card is 280px wide)
export const STACK_FAN_STEP = 310;
