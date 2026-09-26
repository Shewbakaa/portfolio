// Helpers for hand-drawn ("sketch") SVG strokes shared by sketch buttons and cards.

// Small deterministic PRNG so a given seed always draws the same wobble
export const seededRandom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Returns wobble(amount) -> random offset in [-amount/2, amount/2]
export const makeWobble = (rand = Math.random) => (amount) => (rand() - 0.5) * amount;

const r2 = (n) => Math.round(n * 100) / 100;

// Rough rectangle: jittered corners joined by curves with jittered midpoints
export const sketchBox = (x, y, w, h, j, wobble) => {
  const corners = [
    [x + wobble(j), y + wobble(j)],
    [x + w + wobble(j), y + wobble(j)],
    [x + w + wobble(j), y + h + wobble(j)],
    [x + wobble(j), y + h + wobble(j)],
  ];
  let d = `M${r2(corners[0][0])},${r2(corners[0][1])}`;
  for (let i = 1; i <= 4; i++) {
    const a = corners[i - 1];
    const b = corners[i % 4];
    const mx = (a[0] + b[0]) / 2 + wobble(j * 1.4);
    const my = (a[1] + b[1]) / 2 + wobble(j * 1.4);
    d += ` Q${r2(mx)},${r2(my)} ${r2(b[0] + wobble(j * 0.6))},${r2(b[1] + wobble(j * 0.6))}`;
  }
  return d;
};

// Slightly bowed hand-drawn line
export const sketchLine = (x1, y1, x2, y2, j, wobble) => {
  const mx = (x1 + x2) / 2 + wobble(j);
  const my = (y1 + y2) / 2 + wobble(j);
  return `M${r2(x1 + wobble(j * 0.5))},${r2(y1 + wobble(j * 0.5))} Q${r2(mx)},${r2(my)} ${r2(
    x2 + wobble(j * 0.5)
  )},${r2(y2 + wobble(j * 0.5))}`;
};
