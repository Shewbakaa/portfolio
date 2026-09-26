import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import Lottie from 'lottie-react';
import '../styles/ProjectCards.css';
import { useIsInView } from '../hooks/useIsInView';
import { SketchButton } from './SketchButton';
import { makeWobble, seededRandom, sketchBox, sketchLine } from './sketch/sketchPaths';

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
    // `video/quicktime` makes Chrome skip this (it can decode HEVC but not its alpha)
    { src: pacmanHevc, type: 'video/quicktime; codecs="hvc1"' },
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

// "2024-02-16" -> "Feb '24" (parsed by hand so timezones can't shift the month)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatCardDate = (d) => {
  const [y, m] = String(d || '').split('-').map(Number);
  if (!y || !m) return '';
  return `${MONTHS[m - 1]} '${String(y).slice(-2)}`;
};

gsap.registerPlugin(Draggable);

// Seeded hand-drawn strokes for a card's front: highlighter underline + pencil frame
const useCardSketch = (id) =>
  useMemo(() => {
    const wobble = makeWobble(seededRandom(id * 7919 + 13));
    return {
      underline: sketchLine(2, 6, 150 + wobble(30), 5, 4, wobble),
      frame: sketchBox(4, 4, 236, 182, 5, wobble),
      frameInner: sketchBox(6, 6, 232, 179, 6, wobble),
    };
  }, [id]);

const ProjectCard = memo(function ProjectCard({ p, i, flipped, onToggleFlip }) {
  const cardRef = useRef(null);
  const draggableRef = useRef(null);
  const toggleRef = useRef(onToggleFlip);
  toggleRef.current = onToggleFlip;
  const { left, top, rotate } = getCardPos(p, i);
  const { inView, isNear } = useIsInView(cardRef);
  const sketch = useCardSketch(p.id);

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

    // Drag with transforms so absolute left/top stay put. Draggable's onClick
    // only fires for a press without movement, so a drag never flips the page.
    draggableRef.current?.kill?.();
    const d = Draggable.create(el, {
      type: 'x,y',
      bounds: { minX: -2600, maxX: 2600, minY: -2600, maxY: 2600 },
      inertia: false,
      cursor: 'grab',
      activeCursor: 'grabbing',
      // GSAP defaults this to true; pressing a link shouldn't start a drag
      dragClickables: false,
      onPress(e) {
        e?.stopPropagation?.();
      },
      onDrag(e) {
        e?.stopPropagation?.();
      },
      onClick(e) {
        // Draggable still reports clicks on links/buttons; let those do their own thing
        if (e?.target?.closest?.('a, button')) return;
        toggleRef.current(p.id);
      },
    })[0];

    draggableRef.current = d;
    return () => {
      d?.kill?.();
      draggableRef.current = null;
    };
  }, [p.id]);
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
  // Play only while the front is on screen; pause keeps the frame so it resumes in place
  useEffect(() => {
    const shouldPlay = inView && !flipped;
    [lottieRef.current, lottieRef2.current].forEach((anim) => {
      if (!anim) return;
      if (shouldPlay) anim.play();
      else anim.pause();
    });

    const video = videoRef.current;
    if (video) {
      if (shouldPlay) video.play().catch(() => {});
      else video.pause();
    }
  }, [inView, flipped, anims, activated]);

  const hero =
    p.type === 'video' && activated ? (
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
    );

  return (
    <article
      ref={cardRef}
      id={`project-card-${toDomId(p.__assetKey) || p.id}`}
      className={`project-card${flipped ? ' project-card--flipped' : ''}`}
      style={{ left, top, ['--pc-rot']: `${rotate}deg` }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Intro pop target: no CSS transform here, so GSAP's leftover inline transform is harmless */}
      <div className="project-card__pop">
        <div className="project-card__page">
          <div className="project-card__leaf">
            <span className="project-card__tape" aria-hidden="true" />

            {/* Front: the sketch */}
            <div className="project-card__face project-card__face--front" aria-hidden={flipped}>
              <span className="project-card__shadow" aria-hidden="true" />
              <div className="project-card__sheet">
                <h3 className={`project-card__title${p.title.length > 14 ? ' is-long' : ''}`}>{p.title}</h3>
                <svg className="project-card__underline" viewBox="0 0 160 10" aria-hidden="true">
                  <path d={sketch.underline} />
                </svg>

                <div className="project-card__frame">
                  <svg className="project-card__frameLines" viewBox="0 0 244 190" preserveAspectRatio="none" aria-hidden="true">
                    <path d={sketch.frame} />
                    <path d={sketch.frameInner} className="is-inner" />
                  </svg>
                  <div className="project-card__hero">{hero}</div>
                </div>

                {p.note ? <p className="project-card__note">{p.note}</p> : null}
                <span className="project-card__hint" aria-hidden="true">flip ↻</span>
                <span className="project-card__date">{formatCardDate(p.createdDate)}</span>
              </div>
            </div>

            {/* Back: the notes */}
            <div className="project-card__face project-card__face--back" aria-hidden={!flipped}>
              <span className="project-card__shadow" aria-hidden="true" />
              <div className="project-card__sheet">
                <h3 className="project-card__backTitle">{p.title}</h3>
                <p className="project-card__desc">{p.Desc}</p>
                <div className="project-card__links">
                  <SketchButton
                    className="project-card__link"
                    label="GitHub"
                    href={p.link}
                    seed={p.id * 31 + 1}
                    ariaLabel={`${p.title} on GitHub`}
                  />
                  {p.demo ? (
                    <SketchButton
                      className="project-card__link"
                      label="Live ↗"
                      href={p.demo}
                      seed={p.id * 31 + 2}
                      hatchColor="var(--teal)"
                      ariaLabel={`${p.title} live demo`}
                    />
                  ) : null}
                </div>
                <span className="project-card__hint project-card__hint--back" aria-hidden="true">flip back ↺</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard access to the flip (mouse users click the page itself) */}
      <button type="button" className="sr-only" onClick={() => onToggleFlip(p.id)} aria-pressed={flipped}>
        {flipped ? `Show ${p.title} sketch` : `Show ${p.title} details`}
      </button>
    </article>
  );
});

export const ProjectCards = () => {
  const [flippedId, setFlippedId] = useState(null);
  const rootRef = useRef(null);

  const projects = useMemo(() => {
    const resolved = resolveProjects(projectsData);
    return [...resolved].sort((a, b) => parseDate(b.createdDate) - parseDate(a.createdDate));
  }, []);

  // One page flipped at a time; clicking a flipped page turns it back
  const toggleFlip = useCallback((id) => {
    setFlippedId((prev) => (prev === id ? null : id));
  }, []);

  // Clicking anywhere outside the cards flips the open page back
  useEffect(() => {
    const onDocDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setFlippedId(null);
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
          flipped={flippedId === p.id}
          onToggleFlip={toggleFlip}
        />
      ))}
    </div>
  );
};
