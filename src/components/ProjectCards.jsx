import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import Lottie from 'lottie-react';
import '../styles/ProjectCards.css';
import { useIsInView } from '../hooks/useIsInView';

import projectsData from '../assets/json/projects.json';

import pacmanWebm from '../assets/Videos/pacman.webm';
import pacmanHevc from '../assets/Videos/pacman-hevc.mov';
import { PROJECT_CARD_POSITIONS } from './projectCardPositions';

// Loaded as soon as the canvas mounts; everything else loads when its card gets near.
const PRIORITY_IDS = [1, 6, 10];

// Lottie JSON is only ever imported dynamically so each file is its own chunk.
const LOTTIE_IMPORTERS = {
  CCDP: () => import('../assets/Lottie/CCDP.json'),
  ANS: () => import('../assets/Lottie/ANS.json'),
  Valentine: () => import('../assets/Lottie/Valentine.json'),
  Chatbot: () => import('../assets/Lottie/Chatbot.json'),
  Portfolio: () => import('../assets/Lottie/Portfolio.json'),
  'Mini-projects': () => import('../assets/Lottie/Mini-projects.json'),
  'video-game': () => import('../assets/Lottie/video-game.json'),
  'PropChain-1': () => import('../assets/Lottie/PropChain-1.json'),
  'PropChain-2': () => import('../assets/Lottie/PropChain-2.json'),
  'Card-Heart': () => import('../assets/Lottie/Card-Heart.json'),
  foodservices: () => import('../assets/Lottie/foodservices.json'),
  rsvp: () => import('../assets/Lottie/rsvp.json'),
  secretSanta: () => import('../assets/Lottie/secretSanta.json'),
  umbracoBase: () => import('../assets/Lottie/umbracoBase.json'),
  Voting: () => import('../assets/Lottie/Voting.json'),
  mealRoulette: () => import('../assets/Lottie/mealRoulette.json'),
};

// Transparent video: HEVC+alpha for Safari, VP9+alpha WebM for everyone else.
const VIDEO_SOURCES = {
  pacman: [
    { src: pacmanHevc, type: 'video/mp4; codecs="hvc1"' },
    { src: pacmanWebm, type: 'video/webm' },
  ],
};

const resolveProjects = (data) =>
  data.map((p) => ({
    ...p,
    // Keep original JSON keys for stable DOM ids / manual overrides.
    __assetKey:
      p.type === 'video'
        ? p.video
        : p.type === 'lottie-prop'
          ? p.animationData2 || p.animationData
          : p.animationData,
    ...(p.video && { videoSources: VIDEO_SOURCES[p.video] || [] }),
  }));

const toDomId = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseDate = (d) => {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getCardPos = (p, i) => {
  const key = p?.__assetKey;
  const manual = key ? PROJECT_CARD_POSITIONS[key] : null;
  if (manual) return manual;

  // Fallback: small manual-friendly layout near center
  const COLS = 4;
  const CARD_X = 330;
  const CARD_Y = 380;
  const START_X = 360;
  const START_Y = -260;
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    left: START_X + col * CARD_X,
    top: START_Y + row * CARD_Y,
    rotate: (i % 3 - 1) * 1.5,
  };
};

const clampText = (s, max = 160) => {
  const text = String(s || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
};

gsap.registerPlugin(Draggable);

const ZOOM_COMPACT = 0.6;
const ZOOM_EXPANDED = 0.85;

// Deterministic "never repeats" (within practical ranges) pop colors per card.
// Golden-angle hue stepping spreads colors evenly without collisions.
const pcHue = (i) => (i * 137.508) % 360;

function useCanvasCameraRefs() {
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [, bump] = useState(0);
  const last = useRef({ x: 0, y: 0, z: 1 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const world = document.querySelector('.canvas-world');
      if (world) {
        const tr = world.style.transform || '';
        // translate(px, px) scale(z)
        const m = tr.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)\s*scale\(([-0-9.]+)\)/);
        if (m) {
          const x = parseFloat(m[1]) || 0;
          const y = parseFloat(m[2]) || 0;
          const z = parseFloat(m[3]) || 1;
          const changed = x !== last.current.x || y !== last.current.y || z !== last.current.z;
          if (changed) {
            last.current = { x, y, z };
            offsetRef.current = { x, y };
            zoomRef.current = z;
            bump((n) => (n + 1) % 1000000);
          }
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return { zoomRef, offsetRef };
}

const ProjectCard = memo(function ProjectCard({
  p,
  i,
  zoomRef,
  offsetRef,
  forceExpanded,
  setForceExpandedId,
}) {
  const cardRef = useRef(null);
  const draggableRef = useRef(null);
  const { left, top, rotate } = getCardPos(p, i);
  const { inView, isNear } = useIsInView(cardRef, offsetRef, zoomRef);
  const zoom = zoomRef.current || 1;

  const compact = zoom < ZOOM_COMPACT && !forceExpanded;
  const expanded = zoom >= ZOOM_EXPANDED || forceExpanded;

  const [open, setOpen] = useState(false);

  // Latches true the first time the card is near (or immediately for priority
  // cards) so assets stay loaded + mounted and never restart from frame 0.
  const [activated, setActivated] = useState(() => PRIORITY_IDS.includes(p.id));
  const [anims, setAnims] = useState(null);
  const lottieRef = useRef(null);
  const lottieRef2 = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;

    // Re-enable dragging (same plugin used by AboutCard).
    // Use transforms for drag so we don't mutate absolute left/top.
    draggableRef.current?.kill?.();
    const d = Draggable.create(el, {
      type: 'x,y',
      bounds: { minX: -2600, maxX: 2600, minY: -2600, maxY: 2600 },
      inertia: false,
      cursor: 'grab',
      activeCursor: 'grabbing',
      onPress(e) {
        e?.stopPropagation?.();
      },
      onDrag(e) {
        e?.stopPropagation?.();
      },
    })[0];

    draggableRef.current = d;
    return () => {
      d?.kill?.();
      draggableRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isNear) setActivated(true);
  }, [isNear]);

  // Fetch this card's Lottie chunk(s) once activated
  useEffect(() => {
    if (!activated || p.type === 'video') return undefined;

    const load = (key) => {
      const importer = key && LOTTIE_IMPORTERS[key];
      return importer ? importer().then((mod) => mod.default) : Promise.resolve(null);
    };

    let cancelled = false;
    Promise.all([load(p.animationKey), load(p.animationKey2)])
      .then(([primary, secondary]) => {
        if (!cancelled) setAnims({ primary, secondary });
      })
      .catch((err) => console.error(`Failed to load animation for ${p.title}`, err));
    return () => {
      cancelled = true;
    };
  }, [activated, p.type, p.animationKey, p.animationKey2, p.title]);

  // Play only while on screen; pause keeps the current frame so it resumes in place
  useEffect(() => {
    [lottieRef.current, lottieRef2.current].forEach((anim) => {
      if (!anim) return;
      if (inView) anim.play();
      else anim.pause();
    });

    const video = videoRef.current;
    if (video) {
      if (inView) video.play().catch(() => {});
      else video.pause();
    }
  }, [inView, anims, activated]);

  return (
    <article
      ref={cardRef}
      id={`project-card-${toDomId(p.__assetKey) || p.id}`}
      className={[
        'project-card',
        compact ? 'project-card--compact' : '',
        expanded ? 'project-card--expanded' : '',
        open ? 'project-card--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left,
        top,
        ['--pc-rot']: `${rotate}deg`,
        // Pop background for the article surface (NOT the hero background).
        ['--pc-bg']: `hsl(${pcHue(i)} 92% 74%)`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {forceExpanded ? (
        <button
          type="button"
          className="project-card-close"
          onClick={(e) => {
            e.stopPropagation();
            setForceExpandedId(null);
          }}
          aria-label="Close"
        >
          ×
        </button>
      ) : null}

      <div className="about-card-tape project-card__tape" aria-hidden="true" />

      <button
        type="button"
        className="project-card__hit"
        onClick={() => {
          if (zoom < ZOOM_EXPANDED) {
            setForceExpandedId(p.id);
            setOpen(true);
            return;
          }
          setOpen((v) => !v);
        }}
        aria-expanded={open || forceExpanded}
      >
        <span className="sr-only">Open {p.title}</span>
      </button>

      <div className="project-card__inner">
        <header className="project-card__header">
          <div className="project-card__pin" aria-hidden="true" />
          <h3 className="project-card__title">{p.title}</h3>
        </header>

        <div className="project-card__hero" aria-hidden={false}>
          {p.type === 'video' && activated ? (
            <video
              ref={videoRef}
              className="project-card__img"
              aria-label={p.title}
              muted
              loop
              playsInline
              preload="auto"
            >
              {p.videoSources.map((s) => (
                <source key={s.src} src={s.src} type={s.type} />
              ))}
            </video>
          ) : anims?.primary ? (
            p.type === 'lottie-prop' ? (
              <div className="project-card__lottieStack" aria-hidden="true">
                <Lottie lottieRef={lottieRef} animationData={anims.primary} loop autoplay={false} />
                {anims.secondary ? (
                  <Lottie
                    lottieRef={lottieRef2}
                    className="project-card__lottieProp"
                    animationData={anims.secondary}
                    loop
                    autoplay={false}
                  />
                ) : null}
              </div>
            ) : (
              <div className="project-card__lottie" aria-hidden="true">
                <Lottie lottieRef={lottieRef} animationData={anims.primary} loop autoplay={false} />
              </div>
            )
          ) : (
            <div className="lottie-placeholder" aria-hidden>
              <span className="lottie-placeholder-shimmer" />
            </div>
          )}
        </div>

        <div className="project-card__body project-card-desc">
          <p className={`project-card__desc${open || forceExpanded ? ' is-expanded' : ''}`}>
            {open || forceExpanded ? p.Desc : clampText(p.Desc, 170)}
          </p>
        </div>

        <footer className="project-card__footer project-card-actions">
          <a className="project-card__btn project-card__btn--primary" href={p.link} target="_blank" rel="noreferrer">
            GitHub
          </a>
          {p.demo ? (
            <a
              className="project-card__btn project-card__btn--demo project-card__btn--primary"
              href={p.demo}
              target="_blank"
              rel="noreferrer"
            >
              Live
            </a>
          ) : null}
          <button
            type="button"
            className="project-card__btn project-card__btn--more"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            {open ? 'Less' : 'More'}
          </button>
        </footer>
      </div>
    </article>
  );
});

export const ProjectCards = () => {
  const { zoomRef, offsetRef } = useCanvasCameraRefs();
  const [forceExpandedId, setForceExpandedId] = useState(null);
  const rootRef = useRef(null);

  const projects = useMemo(() => {
    const resolved = resolveProjects(projectsData);
    return [...resolved].sort((a, b) => parseDate(b.createdDate) - parseDate(a.createdDate));
  }, []);

  useEffect(() => {
    const onDocDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setForceExpandedId(null);
    };
    document.addEventListener('pointerdown', onDocDown, true);
    return () => document.removeEventListener('pointerdown', onDocDown, true);
  }, []);

  return (
    <div ref={rootRef} className="project-cards-root" aria-label="Project cards">
      {projects.map((p, i) => (
        <ProjectCard
          key={p.id}
          p={p}
          i={i}
          zoomRef={zoomRef}
          offsetRef={offsetRef}
          forceExpanded={forceExpandedId === p.id}
          setForceExpandedId={setForceExpandedId}
        />
      ))}
    </div>
  );
};

