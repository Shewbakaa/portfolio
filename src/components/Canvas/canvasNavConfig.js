/** Logical world size for minimap scaling (anchor-relative coords, origin at scene center). */
export const WORLD_W = 4000;
export const WORLD_H = 3000;

export const MM_W = 160;
export const MM_H = 120;

export const SCALE_X = MM_W / WORLD_W;
export const SCALE_Y = MM_H / WORLD_H;

/** NAV pan targets — vanilla `nodePositions` shape */
export const NODE_POSITIONS = {
  home: { card: '.canvas-center' },
  about: { card: '.about-card' },
  projects: { card: 'card-projects' },
  skills: { card: '.skill-cards-cluster' },
  experience: { card: '#card-timeline' },
  contact: { card: '.contact-cluster__stack' },
};

/**
 * Card layout (anchor-relative left/top) + minimap appearance.
 * Matches vanilla minimapNodes colors; sizes are nominal for invisible markers / minimap rects.
 */
export const MINIMAP_NODES = [
  // Keep this marker centered on world origin (0,0).
  { id: 'canvas-center', left: -360, top: -80, w: 720, h: 160, color: '#868686' },
  { id: 'card-about', left: -1040, top: -720, w: 280, h: 420, color: '#2e8b57' },
  { id: 'card-projects', left: 1100, top: -200, w: 360, h: 200, color: '#FF6B9D' },
  { id: 'card-skills', left: -1100, top: -200, w: 360, h: 200, color: '#4ECDC4' },
  { id: 'card-experience', left: -200, top: -980, w: 360, h: 200, color: '#f5f0e8' },
  { id: 'card-contact', left: 0, top: 780, w: 360, h: 200, color: '#6BCB77' },
  { id: 'card-cooking', left: 1300, top: 600, w: 320, h: 180, color: '#FF8C42' },
  { id: 'card-stats', left: -1300, top: 700, w: 280, h: 240, color: '#0a0a0a' },
  { id: 'card-easter', left: 800, top: -1100, w: 120, h: 80, color: '#ccc' },

  // New canvas elements
  { id: 'card-timeline', left: -440, top: -1000, w: 1160, h: 260, color: '#8b5a2b' },
  { id: 'card-contacts', left: 980, top: 720, w: 380, h: 240, color: '#3BCEAC' },
  { id: 'now-learning', left: 800, top: -300, w: 320, h: 200, color: '#F5C842' },
  { id: 'now-playing', left: 1100, top: -280, w: 220, h: 300, color: '#FF5E5E' },
  { id: 'vinyl-shelf', left: -1000, top: 0, w: 340, h: 180, color: '#2a2a2a' },
  { id: 'cooking-card', left: -1000, top: 600, w: 280, h: 320, color: '#FF8C42' },
  {
    id: 'cooking-card-traffic',
    left: -650,
    top: 600,
    w: 280,
    h: 320,
    color: '#F5C842',
  },
];

/** Real DOM nodes use these ids — skip invisible duplicate markers */
export const MINIMAP_DOM_SKIP = new Set([
  'vinyl-shelf',
  'cooking-card',
  'cooking-card-traffic',
]);