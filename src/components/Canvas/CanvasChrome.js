import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './CanvasChrome.css';
import { MINIMAP_PADDING, MINIMAP_SOURCES } from './canvasNavConfig';

// When to re-measure the canvas for the minimap (ms after intro): the reveal
// animation pops cards in, so take a couple of late readings too.
const MEASURE_DELAYS_MS = [300, 2500, 5000];
const MINIMAP_LABEL_H = 16;

// Measure every minimap source in world coords (origin = .canvas-world-anchor).
// Pan/zoom never changes world coords, so this only needs re-running on drags/resizes.
const measureCanvas = (zoom) => {
  const anchor = document.querySelector('.canvas-world-anchor');
  if (!anchor) return null;
  const a = anchor.getBoundingClientRect();
  const z = zoom || 1;
  const nodes = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  MINIMAP_SOURCES.forEach(({ selector, color }) => {
    anchor.querySelectorAll(selector).forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const l = (r.left - a.left) / z;
      const t = (r.top - a.top) / z;
      const w = r.width / z;
      const h = r.height / z;
      nodes.push({ key: `${selector}-${i}`, l, t, w, h, color });
      minX = Math.min(minX, l);
      minY = Math.min(minY, t);
      maxX = Math.max(maxX, l + w);
      maxY = Math.max(maxY, t + h);
    });
  });

  if (!nodes.length) return null;

  // Bounds are symmetric around the hero (BB-8 + "This is my story") so it sits
  // in the middle of the minimap, however lopsided the rest of the content is.
  const hero = anchor.querySelector('.canvas-center');
  let cx = 0;
  let cy = 0;
  if (hero) {
    const r = hero.getBoundingClientRect();
    cx = (r.left + r.width / 2 - a.left) / z;
    cy = (r.top + r.height / 2 - a.top) / z;
  }
  const halfW = Math.max(cx - minX, maxX - cx) + MINIMAP_PADDING;
  const halfH = Math.max(cy - minY, maxY - cy) + MINIMAP_PADDING;

  return {
    nodes,
    bounds: { minX: cx - halfW, minY: cy - halfH, maxX: cx + halfW, maxY: cy + halfH },
  };
};

// World -> minimap pixels, fitting the bounds into the map area (aspect preserved, centred)
const makeProjection = (bounds, mmW, mmH) => {
  const areaH = mmH - MINIMAP_LABEL_H;
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  const scale = Math.min(mmW / worldW, areaH / worldH);
  const padX = (mmW - worldW * scale) / 2;
  const padY = MINIMAP_LABEL_H + (areaH - worldH * scale) / 2;
  return {
    scale,
    x: (wx) => padX + (wx - bounds.minX) * scale,
    y: (wy) => padY + (wy - bounds.minY) * scale,
  };
};

export const CanvasChrome = ({
  panTo,
  zoomPercentLabel,
  onZoomIn,
  onZoomOut,
  offsetRef,
  zoomRef,
  updateChromeRef,
}) => {
  const minimapViewportRef = useRef(null);
  const minimapRef = useRef(null);
  const projectionRef = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const [minimap, setMinimap] = useState(null);

  const remeasure = useCallback(() => {
    const measured = measureCanvas(zoomRef?.current);
    if (measured) setMinimap(measured);
  }, [zoomRef]);

  // Re-measure after the intro reveal, on resize, and after any drag ends
  useEffect(() => {
    const timers = MEASURE_DELAYS_MS.map((ms) => setTimeout(remeasure, ms));
    let raf = 0;
    const later = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTimeout(remeasure, 200));
    };
    window.addEventListener('resize', later);
    document.addEventListener('pointerup', later, true);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', later);
      document.removeEventListener('pointerup', later, true);
    };
  }, [remeasure]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = () => {
      if (mq.matches) setNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 768px)');
    if (!navOpen || !narrow.matches) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  const go = (section) => {
    setNavOpen(false);
    panTo(section);
  };

  useLayoutEffect(() => {
    const updateMinimap = () => {
      const vp = minimapViewportRef.current;
      if (!vp || !offsetRef?.current || zoomRef?.current == null) return;
      const proj = projectionRef.current;
      if (!proj) return;
      const z = zoomRef.current;
      const ox = offsetRef.current.x;
      const oy = offsetRef.current.y;

      /**
       * World origin (0,0) is the canvas center (`.canvas-world-anchor` is centred), and
       * screen = center + world * z + offset, so the world point at screen centre is -offset / z.
       */
      const viewW = window.innerWidth / z;
      const viewH = window.innerHeight / z;
      const camLeft = -ox / z - viewW / 2;
      const camTop = -oy / z - viewH / 2;

      // Not clamped: near the content's edge the box runs off the map (the minimap clips it)
      // instead of sliding inward over things that aren't actually on screen.
      const vpW = viewW * proj.scale;
      const vpH = viewH * proj.scale;
      const vpX = proj.x(camLeft);
      const vpY = proj.y(camTop);

      vp.style.width = `${Math.max(4, vpW)}px`;
      vp.style.height = `${Math.max(4, vpH)}px`;
      vp.style.left = `${vpX}px`;
      vp.style.top = `${vpY}px`;
    };

    if (updateChromeRef && typeof updateChromeRef === 'object') {
      updateChromeRef.current = updateMinimap;
    }
    updateMinimap();

    return () => {
      if (updateChromeRef && typeof updateChromeRef === 'object') {
        updateChromeRef.current = () => {};
      }
    };
  }, [offsetRef, zoomRef, updateChromeRef]);

  // Rebuild the projection whenever the measured content changes, then refresh the viewport box
  const mmEl = minimapRef.current;
  const projection =
    minimap && mmEl
      ? makeProjection(minimap.bounds, mmEl.clientWidth || 160, mmEl.clientHeight || 120)
      : null;
  projectionRef.current = projection;
  useEffect(() => {
    updateChromeRef?.current?.();
  }, [minimap, updateChromeRef]);

  return (
    <div className="canvas-chrome" aria-hidden={false}>
      <nav
        id="nav-tabs"
        className={navOpen ? 'nav-tabs--open' : ''}
        aria-label="Canvas sections"
      >
        <button
          type="button"
          className="nav-menu-toggle"
          aria-label={navOpen ? 'Close section menu' : 'Open section menu'}
          aria-expanded={navOpen}
          aria-controls="nav-tabs-panel"
          onClick={() => setNavOpen((o) => !o)}
        >
          <span className="nav-menu-toggle__bar" aria-hidden />
          <span className="nav-menu-toggle__bar" aria-hidden />
          <span className="nav-menu-toggle__bar" aria-hidden />
        </button>
        <div
          id="nav-tabs-panel"
          className="nav-tabs__panel"
          role="navigation"
        >
          <button
            type="button"
            className="nav-tab nav-tab--first"
            onClick={() => go('home')}
          >
            <span className="dot" style={{ background: 'var(--yellow)' }} />
            HOME
          </button>
          <button
            type="button"
            className="nav-tab nav-tab--first"
            onClick={() => go('about')}
          >
            <span className="dot" style={{ background: 'var(--forestGreen)' }} />
            ABOUT
          </button>
          <button
            type="button"
            className="nav-tab"
            onClick={() => go('projects')}
          >
            <span className="dot" style={{ background: 'var(--pink)' }} />
            PROJECTS
          </button>
          <button
            type="button"
            className="nav-tab"
            onClick={() => go('skills')}
          >
            <span className="dot" style={{ background: 'var(--blue)' }} />
            SKILLS
          </button>
          <button
            type="button"
            className="nav-tab"
            onClick={() => go('experience')}
          >
            <span
              className="dot"
              style={{
                background: 'var(--white)',
                borderColor: 'var(--black)',
              }}
            />
            EXP
          </button>
          <button
            type="button"
            className="nav-tab"
            onClick={() => go('contact')}
          >
            <span className="dot" style={{ background: 'var(--green)' }} />
            CONTACT
          </button>
        </div>
      </nav>

      <div id="minimap" ref={minimapRef}>
        <span id="minimap-label">MINIMAP</span>
        {projection
          ? minimap.nodes.map(({ key, l, t, w, h, color }) => (
              <div
                key={key}
                className="minimap-node"
                style={{
                  left: `${projection.x(l)}px`,
                  top: `${projection.y(t)}px`,
                  width: `${Math.max(3, w * projection.scale)}px`,
                  height: `${Math.max(3, h * projection.scale)}px`,
                  background: color,
                }}
              />
            ))
          : null}
        <div id="minimap-viewport" ref={minimapViewportRef} />
      </div>

      <div id="zoom-info">
        <button type="button" id="zoom-btn-out" onClick={onZoomOut}>
          −
        </button>
        <span id="zoom-label">{zoomPercentLabel}</span>
        <button type="button" id="zoom-btn-in" onClick={onZoomIn}>
          +
        </button>
      </div>

      <div id="hint">✦ drag to explore the canvas</div>
    </div>
  );
};
