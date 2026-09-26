import React, {
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';
import { gsap } from 'gsap';
import { CanvasCenter } from './CanvasCenter';
import { CanvasChrome } from './CanvasChrome';
import { FloatingSkillBadges } from './FloatingSkillBadges';
import { AboutCard } from './About/AboutCard';
import { BB8animation } from '../BB8animation';
import { SketchEnterButton } from '../SketchEnterButton';
import { ProjectCards } from '../ProjectCards';
import { SkillCards } from '../SkillCards';
import { TimelineStrip } from '../TimelineStrip';
import { ContactCluster } from '../ContactCluster';
import { StickyNotes } from '../StickyNotes';
import { NowLearning } from '../NowLearning';
import { startTapeQuietly } from '../tapePlayer';
import { NowPlaying } from '../NowPlaying';
import { VinylShelf } from '../VinylShelf';
import { CookingCard } from '../CookingCard';
import bb8Exit from '../../assets/Audios/bb8-exit.mp3';
import '../../styles/LoadingScreen.css';
import './InfiniteCanvas.css';
import {
  NODE_POSITIONS,
  MINIMAP_NODES,
  MINIMAP_DOM_SKIP,
} from './canvasNavConfig';

const CANVAS_PAN_BOUNDS = 8000;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

export const InfiniteCanvas = ({ children }) => {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const introOverlayRef = useRef(null);
  const bb8StageRef = useRef(null);
  const bb8ExitRef = useRef(new Audio(bb8Exit));
  const applyTransformRef = useRef(() => {});
  const updateChromeRef = useRef(() => {});
  const zoomRef = useRef(1);
  const postTitleIntroAnimRanRef = useRef(false);

  const [exitMeta, setExitMeta] = useState({
    introComplete: false,
    ballRotation: null,
    handoffWrapperX: null,
  });
  const introComplete = exitMeta.introComplete;

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [exitInProgress, setExitInProgress] = useState(false);
  const [zoomPercentLabel, setZoomPercentLabel] = useState('100%');

  const introCompleteRef = useRef(false);
  useEffect(() => {
    introCompleteRef.current = introComplete;
  }, [introComplete]);

  useEffect(() => {
    bb8ExitRef.current.volume = audioEnabled ? 1 : 0;
  }, [audioEnabled]);

  const isPanning = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const adjustZoomRef = useRef(() => {});

  const clampOffset = useCallback((o) => {
    o.x = clamp(o.x, -CANVAS_PAN_BOUNDS, CANVAS_PAN_BOUNDS);
    o.y = clamp(o.y, -CANVAS_PAN_BOUNDS, CANVAS_PAN_BOUNDS);
  }, []);

  const applyTransform = useCallback(() => {
    if (worldRef.current) {
      const { x, y } = offset.current;
      const z = zoomRef.current;
      worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
      worldRef.current.style.transformOrigin = 'center center';
    }
    updateChromeRef.current();
  }, []);

  applyTransformRef.current = applyTransform;

  /**
   * NAV pan — vanilla used `offsetX = W/2 - (cx + cw/2) * scale` with card `style.left/top`
   * in world space and `transform-origin: 0 0`. We keep `transform-origin: center` and
   * center via getBoundingClientRect so pan stays visually correct.
   */
  const panTo = useCallback((key) => {
    const entry = NODE_POSITIONS[key];
    if (!entry) return;
    const target = entry.card;
    const el =
      typeof target === 'string' && (target.startsWith('.') || target.startsWith('#'))
        ? document.querySelector(target)
        : document.getElementById(target);
    if (!el) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const r = el.getBoundingClientRect();
    const ddx = w / 2 - (r.left + r.width / 2);
    const ddy = h / 2 - (r.top + r.height / 2);

    const o = offset.current;
    const targetX = clamp(
      o.x + ddx,
      -CANVAS_PAN_BOUNDS,
      CANVAS_PAN_BOUNDS
    );
    const targetY = clamp(
      o.y + ddy,
      -CANVAS_PAN_BOUNDS,
      CANVAS_PAN_BOUNDS
    );

    gsap.killTweensOf(o);
    gsap.to(o, {
      x: targetX,
      y: targetY,
      duration: 1,
      ease: 'power3.inOut',
      onUpdate: () => {
        applyTransformRef.current();
      },
    });
  }, []);

  const adjustZoom = useCallback(
    (delta, focalX, focalY) => {
      const scale = zoomRef.current;
      const newScale = Math.min(1.5, Math.max(0.35, scale + delta));
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mx = focalX !== undefined ? focalX : w / 2;
      const my = focalY !== undefined ? focalY : h / 2;
      const o = offset.current;
      o.x = mx - (mx - o.x) * (newScale / scale);
      o.y = my - (my - o.y) * (newScale / scale);
      zoomRef.current = newScale;
      setZoomPercentLabel(`${Math.round(newScale * 100)}%`);
      window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { zoom: newScale } }));
      clampOffset(o);
      applyTransform();
    },
    [applyTransform, clampOffset]
  );

  adjustZoomRef.current = adjustZoom;

  const onPointerDown = useCallback((e) => {
    if (!introCompleteRef.current) return;
    const world = worldRef.current;
    const t = e.target;
    if (t.closest?.('.canvas-chrome')) return;
    if (t.closest?.('.float-badge') || t.closest?.('.float-badges-root'))
      return;
    if (t.closest?.('.about-card')) return;
    if (t.closest?.('#vinyl-shelf') || t.closest?.('.cooking-card')) return;
    if (
      t !== containerRef.current &&
      t !== world &&
      !(world && world.contains(t))
    ) {
      return;
    }
    isPanning.current = true;
    startPos.current = {
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    };
    containerRef.current?.classList.add('canvas-panning');
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      if (!isPanning.current) return;
      const newX = clamp(
        e.clientX - startPos.current.x,
        -CANVAS_PAN_BOUNDS,
        CANVAS_PAN_BOUNDS
      );
      const newY = clamp(
        e.clientY - startPos.current.y,
        -CANVAS_PAN_BOUNDS,
        CANVAS_PAN_BOUNDS
      );
      offset.current = { x: newX, y: newY };
      applyTransform();
    },
    [applyTransform]
  );

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
    containerRef.current?.classList.remove('canvas-panning');
  }, []);

  const onTouchStart = useCallback((e) => {
    if (!introCompleteRef.current) return;
    const touch = e.touches[0];
    const world = worldRef.current;
    const t = e.target;
    if (t.closest?.('.canvas-chrome')) return;
    if (t.closest?.('.float-badge') || t.closest?.('.float-badges-root'))
      return;
    if (t.closest?.('.about-card')) return;
    if (t.closest?.('#vinyl-shelf') || t.closest?.('.cooking-card')) return;
    if (
      t !== containerRef.current &&
      t !== world &&
      !(world && world.contains(t))
    ) {
      return;
    }
    isPanning.current = true;
    startPos.current = {
      x: touch.clientX - offset.current.x,
      y: touch.clientY - offset.current.y,
    };
  }, []);

  const onTouchMove = useCallback(
    (e) => {
      if (!isPanning.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const newX = clamp(
        touch.clientX - startPos.current.x,
        -CANVAS_PAN_BOUNDS,
        CANVAS_PAN_BOUNDS
      );
      const newY = clamp(
        touch.clientY - startPos.current.y,
        -CANVAS_PAN_BOUNDS,
        CANVAS_PAN_BOUNDS
      );
      offset.current = { x: newX, y: newY };
      applyTransform();
    },
    [applyTransform]
  );

  const onTouchEnd = useCallback(() => {
    isPanning.current = false;
    containerRef.current?.classList.remove('canvas-panning');
  }, []);

  useLayoutEffect(() => {
    applyTransform();
  }, [applyTransform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => container.removeEventListener('touchmove', onTouchMove);
  }, [onTouchMove]);

  useEffect(() => {
    if (!introComplete) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (e.target.closest?.('.canvas-chrome')) return;
      e.preventDefault();
      const o = offset.current;
      o.x -= e.deltaX;
      o.y -= e.deltaY;
      clampOffset(o);
      applyTransformRef.current();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [introComplete, clampOffset]);

  useLayoutEffect(() => {
    if (!introComplete) return;
    // Prevent a flash of UI/cards between intro end and our reveal timeline.
    gsap.set('#nav-tabs .nav-tab', { opacity: 0, x: 42 });
    gsap.set('#nav-tabs .nav-menu-toggle', {
      opacity: 0,
      scale: 0.86,
      transformOrigin: '50% 50%',
    });
    gsap.set(['#zoom-info', '#minimap'], { opacity: 0, x: 42 });
    gsap.set(['.about-card', '.float-badges-root', '.float-badge'], { opacity: 0 });
    gsap.set('.float-badge-inner', { scale: 0.86 });
    gsap.set(['.project-card'], { opacity: 0 });
    gsap.set('.project-card__inner', { scale: 0.86 });
    gsap.set(['.skill-cards-cluster', '.timeline-strip', '.contact-cluster'], { opacity: 0 });
    gsap.set(['.sticky-note'], { opacity: 0 });
    gsap.set(
      ['.now-learning', '.now-playing', '#vinyl-shelf', '.cooking-card'],
      { opacity: 0 }
    );

    gsap.set(['.about-card-pop', '.skill-card-title-badge'], { scale: 0.86 });
    gsap.set(['.skill-cards-canvas-card'], { scale: 0.94 });
    gsap.set(['.timeline-note__pop', '.sticky-note__pop'], { scale: 0.86 });
    gsap.set(['.contact-cluster'], { scale: 0.94, transformOrigin: '50% 20%' });
    gsap.set(
      ['.now-learning', '.now-playing', '#vinyl-shelf', '.cooking-card'],
      { scale: 0.94, transformOrigin: '50% 20%' }
    );
  }, [introComplete]);

  useEffect(() => {
    if (!introComplete) return undefined;

    const run = () => {
      if (postTitleIntroAnimRanRef.current) return;
      postTitleIntroAnimRanRef.current = true;

      const tl = gsap.timeline();

      const cards = ['.about-card', '.float-badges-root', '.float-badge'];
      tl.fromTo(
        cards.join(','),
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.06,
          clearProps: 'opacity',
        },
        0
      );

      // Badges: pop in (zoom) without disturbing outer rotate transform.
      tl.to(
        '.float-badge-inner',
        {
          keyframes: [
            { scale: 1.06, duration: 0.22, ease: 'power3.out' },
            { scale: 1, duration: 0.18, ease: 'power2.out' },
          ],
          stagger: 0.035,
          clearProps: 'transform',
        },
        0
      );

      tl.fromTo(
        '.project-card',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.05,
          clearProps: 'opacity',
        },
        0
      );

      tl.to(
        '.project-card__inner',
        {
          keyframes: [
            { scale: 1.06, duration: 0.22, ease: 'power3.out' },
            { scale: 1, duration: 0.18, ease: 'power2.out' },
          ],
          stagger: 0.03,
          clearProps: 'transform',
        },
        0
      );

      // About card: fade + pop (inner wrapper, so we don't clobber Draggable rotation).
      tl.to(
        '.about-card-pop',
        {
          keyframes: [
            { scale: 1.06, duration: 0.22, ease: 'power3.out' },
            { scale: 1, duration: 0.18, ease: 'power2.out' },
          ],
          clearProps: 'transform',
        },
        0
      );

      // Skill cards cluster: fade + pop each card slightly.
      tl.fromTo(
        '.skill-cards-cluster',
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out', clearProps: 'opacity' },
        0.05
      );
      tl.to(
        '.skill-cards-canvas-card',
        {
          keyframes: [
            { scale: 1.04, duration: 0.18, ease: 'power3.out' },
            { scale: 1, duration: 0.16, ease: 'power2.out' },
          ],
          stagger: 0.04,
          clearProps: 'transform',
        },
        0.05
      );

      // Timeline notes: fade + pop the inner content (outer keeps rotation).
      tl.fromTo(
        '.timeline-strip',
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out', clearProps: 'opacity' },
        0.08
      );
      tl.to(
        '.timeline-note__pop',
        {
          keyframes: [
            { scale: 1.06, duration: 0.2, ease: 'power3.out' },
            { scale: 1, duration: 0.18, ease: 'power2.out' },
          ],
          stagger: 0.035,
          clearProps: 'transform',
        },
        0.08
      );

      // Sticky notes: fade + pop (inner content).
      tl.to(
        '.sticky-note',
        { opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.04, clearProps: 'opacity' },
        0.1
      );
      tl.to(
        '.sticky-note__pop',
        {
          keyframes: [
            { scale: 1.06, duration: 0.2, ease: 'power3.out' },
            { scale: 1, duration: 0.18, ease: 'power2.out' },
          ],
          stagger: 0.04,
          clearProps: 'transform',
        },
        0.1
      );

      // Contact + retro widgets: fade + pop as whole cards (no navbar changes).
      tl.fromTo(
        '.contact-cluster',
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'opacity' },
        0.12
      );
      tl.to(
        '.contact-cluster',
        {
          keyframes: [
            { scale: 1.03, duration: 0.18, ease: 'power3.out' },
            { scale: 1, duration: 0.16, ease: 'power2.out' },
          ],
          clearProps: 'transform',
        },
        0.12
      );

      tl.to(
        [
          '.now-learning',
          '.now-playing',
          '#vinyl-shelf',
          '.cooking-card',
        ],
        {
          opacity: 1,
          duration: 0.25,
          ease: 'power2.out',
          stagger: 0.05,
          clearProps: 'opacity',
        },
        0.12
      );
      tl.to(
        [
          '.now-learning',
          '.now-playing',
          '#vinyl-shelf',
          '.cooking-card',
        ],
        {
          keyframes: [
            { scale: 1.03, duration: 0.18, ease: 'power3.out' },
            { scale: 1, duration: 0.16, ease: 'power2.out' },
          ],
          stagger: 0.05,
          clearProps: 'transform',
        },
        0.12
      );

      tl.fromTo(
        '#nav-tabs .nav-tab',
        { opacity: 0, x: 42 },
        {
          opacity: 1,
          x: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.07,
          clearProps: 'opacity,transform',
        },
        0.15
      );

      tl.fromTo(
        '#nav-tabs .nav-menu-toggle',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.28,
          ease: 'power2.out',
          clearProps: 'opacity',
        },
        0.15
      );
      tl.to(
        '#nav-tabs .nav-menu-toggle',
        {
          keyframes: [
            { scale: 1.06, duration: 0.18, ease: 'power3.out' },
            { scale: 1, duration: 0.16, ease: 'power2.out' },
          ],
          clearProps: 'transform',
        },
        0.15
      );

      tl.fromTo(
        ['#zoom-info', '#minimap'],
        { opacity: 0, x: 42 },
        {
          opacity: 1,
          x: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.08,
          clearProps: 'opacity,transform',
        },
        0.25
      );
    };

    window.addEventListener('canvas:titleDone', run);
    return () => window.removeEventListener('canvas:titleDone', run);
  }, [introComplete]);

  const exitIntro = () => {
    setExitInProgress(true);
    // Inside the click handler so browsers treat it as user-initiated playback
    startTapeQuietly();

    gsap.to('.canvas-intro-overlay .enterButton', { opacity: 0, duration: 0.3 });
    gsap.to('.canvas-intro-overlay .volume', { opacity: 0, duration: 0.3 });

    if (audioEnabled) {
      bb8ExitRef.current.play().catch(() => {});
    }

    const bb8Stage = bb8StageRef.current;
    const ball = bb8Stage?.querySelector('.bb8 .ball');
    const bb8El = bb8Stage?.querySelector('.bb8');
    const W = window.innerWidth;
    const bb8Rect = bb8El?.getBoundingClientRect();
    const centerX0 = bb8Rect
      ? bb8Rect.left + bb8Rect.width / 2
      : W / 2;
    // Intro exit (0–3s): keep camera/world centered; slide BB-8 stage into center.
    // Move background grid to sell the "world is moving" feel.
    const bx1 = W / 2 - centerX0;
    const gridEl = worldRef.current?.querySelector?.('.canvas-grid');
    const phase1PanPx = Math.min(5200, Math.max(3000, Math.round(W * 1.05)));
    const gridX1 = -phase1PanPx;

    const tl = gsap.timeline({
      onComplete: () => {
        let rot = 0;
        if (ball) {
          const r = gsap.getProperty(ball, 'rotation');
          rot = typeof r === 'number' ? r : parseFloat(String(r), 10) || 0;
        }
        setExitMeta({
          introComplete: true,
          ballRotation: rot,
          handoffWrapperX: 0,
        });
        if (audioEnabled) bb8ExitRef.current.pause();
      },
    });

    if (gridEl) {
      // Slide the background during the roll (no snap-back).
      tl.to(
        gridEl,
        {
          x: gridX1,
          duration: 2.6,
          ease: 'power2.inOut',
        },
        0
      );
    }

    if (bb8Stage) {
      tl.to(
        bb8Stage,
        {
          x: bx1,
          duration: 3,
          ease: 'power2.inOut',
        },
        0
      );
    }

    if (ball) {
      tl.to(
        ball,
        {
          rotation: '+=2160',
          duration: 3,
          ease: 'power2.inOut',
        },
        0
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-container${introComplete ? '' : ' canvas-intro'}`}
      onMouseDown={onPointerDown}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div ref={worldRef} className="canvas-world">
        <div className="canvas-world-anchor">
          <div className="canvas-grid" aria-hidden="true" />
          {!introComplete && (
            <div ref={bb8StageRef} className="intro-bb8-world-stage">
              <BB8animation
                audioEnabled={audioEnabled}
                exitInProgress={exitInProgress}
              />
            </div>
          )}
          <CanvasCenter
            introComplete={introComplete}
            skipBb8EntryMotion={introComplete}
            handoffBallRotation={exitMeta.ballRotation}
            handoffWrapperX={exitMeta.handoffWrapperX}
          />
          {introComplete ? (
            <AboutCard
              handoffX={
                typeof exitMeta.handoffWrapperX === 'number'
                  ? exitMeta.handoffWrapperX
                  : 0
              }
            />
          ) : null}
          {introComplete
            ? MINIMAP_NODES.filter((n) => !MINIMAP_DOM_SKIP.has(n.id)).map(
                (n) => (
                  <div
                    key={n.id}
                    id={n.id}
                    className="canvas-card-marker"
                    style={{
                      left: n.left,
                      top: n.top,
                      width: n.w,
                      height: n.h,
                    }}
                    aria-hidden
                  />
                )
              )
            : null}
          {introComplete ? <FloatingSkillBadges /> : null}
          {introComplete ? <ProjectCards /> : null}
          {introComplete ? <SkillCards /> : null}
          {introComplete ? <TimelineStrip /> : null}
          {introComplete ? <ContactCluster /> : null}
          {introComplete ? <StickyNotes /> : null}
          {introComplete ? <NowLearning /> : null}
          {introComplete ? <NowPlaying /> : null}
          {introComplete ? <VinylShelf /> : null}
          {introComplete ? <CookingCard /> : null}
          {children}
        </div>
      </div>
      <div className="canvas-vignette" aria-hidden="true" />

      {introComplete ? (
        <CanvasChrome
          panTo={panTo}
          zoomPercentLabel={zoomPercentLabel}
          onZoomIn={() => adjustZoom(0.1)}
          onZoomOut={() => adjustZoom(-0.1)}
          offsetRef={offset}
          zoomRef={zoomRef}
          updateChromeRef={updateChromeRef}
        />
      ) : null}

      {!introComplete && (
        <div
          ref={introOverlayRef}
          className="canvas-intro-overlay canvas-intro-overlay--chrome-only"
        >
          <label
            className="volume"
            style={{
              position: 'fixed',
              top: '0px',
              right: '20px',
              cursor: 'pointer',
              zIndex: 10002,
              pointerEvents: 'auto',
            }}
          >
            <input
              type="checkbox"
              checked={!audioEnabled}
              onChange={() => setAudioEnabled(!audioEnabled)}
            />
            <svg viewBox="0 0 108 96">
              <path d="M7,28 L35,28 L35,28 L59,8 L59,88 L35,68 L7,68 C4.790861,68 3,66.209139 3,64 L3,32 C3,29.790861 4.790861,28 7,28 Z"></path>
              <path d="M79,62 C83,57.3333333 85,52.6666667 85,48 C85,43.3333333 83,38.6666667 79,34 L49,3"></path>
              <path d="M95,69 C101.666667,61.6666667 105,54.3333333 105,47 C105,39.6666667 101.666667,32.3333333 95,25 L75.5,6 L49,33"></path>
            </svg>
          </label>

          <div
            className="enterButton"
            style={{
              top: '70%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
            }}
          >
            <SketchEnterButton onClick={exitIntro} />
          </div>
        </div>
      )}
    </div>
  );
};
