/**
 * NAV pan targets. `card` is a CSS selector; when it matches several elements
 * (e.g. every project card) the pan centres on their combined bounds.
 */
export const NODE_POSITIONS = {
  home: { card: '.canvas-center' },
  about: { card: '.about-card' },
  projects: { card: '.project-card' },
  skills: { card: '.skill-cards-canvas-card' },
  experience: { card: 'section.timeline-strip' },
  contact: { card: '.contact-cluster__stack' },
};

/**
 * What the minimap draws. Each selector's elements are measured from the real
 * DOM (world coords), so the minimap follows layout changes and drags.
 * Order = paint order (later draws on top).
 */
export const MINIMAP_SOURCES = [
  { selector: '.float-badge', color: '#d6d3c8' },
  { selector: '.sticky-note', color: '#f5c842' },
  { selector: '.canvas-center', color: '#868686' },
  { selector: '.about-card-anchor', color: '#2e8b57' },
  { selector: 'section.timeline-strip', color: '#8b5a2b' },
  { selector: 'section.now-learning', color: '#7ec8e3' },
  { selector: '.now-playing', color: '#ff5e5e' },
  { selector: '.cooking-card', color: '#ff8c42' },
  { selector: '#vinyl-shelf', color: '#2a2a2a' },
  { selector: '.contact-cluster', color: '#3bceac' },
  { selector: '.skill-cards-canvas-card', color: '#4ecdc4' },
  { selector: '.project-card', color: '#ff6b9d' },
];

/** World-space padding around the content bounds shown in the minimap */
export const MINIMAP_PADDING = 160;
