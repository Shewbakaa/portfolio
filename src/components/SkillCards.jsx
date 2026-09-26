import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { seededRandom } from './sketch/sketchPaths';
import './SkillCards.css';

/** World-space layouts by viewport (drag offsets still apply on top). */
const SKILL_LAYOUTS = {
  wide: {
    cluster: { left: -500, top: 300 },
    positions: [
      { id: 'card1', x: 100, y: 0 },
      { id: 'card2', x: 450, y: 0 },
      { id: 'card3', x: 800, y: 0 },
      { id: 'card4', x: -250, y: 0 },
    ],
  },
  medium: {
    cluster: { left: -420, top: 340 },
    positions: [
      { id: 'card1', x: 0, y: 0 },
      { id: 'card2', x: 310, y: 0 },
      { id: 'card3', x: 620, y: 0 },
      { id: 'card4', x: -310, y: 0 },
    ],
  },
  narrow: {
    cluster: { left: -140, top: 520 },
    positions: [
      { id: 'card1', x: 0, y: 0 },
      { id: 'card2', x: 0, y: 400 },
      { id: 'card3', x: 0, y: 800 },
      { id: 'card4', x: 0, y: 1200 },
    ],
  },
};

function useSkillCardsLayout() {
  const [layout, setLayout] = useState('wide');

  useEffect(() => {
    const mqNarrow = window.matchMedia('(max-width: 640px)');
    const mqMedium = window.matchMedia('(max-width: 1024px)');

    const pick = () => {
      if (mqNarrow.matches) setLayout('narrow');
      else if (mqMedium.matches) setLayout('medium');
      else setLayout('wide');
    };

    pick();
    mqNarrow.addEventListener('change', pick);
    mqMedium.addEventListener('change', pick);
    return () => {
      mqNarrow.removeEventListener('change', pick);
      mqMedium.removeEventListener('change', pick);
    };
  }, []);

  return layout;
}

// Each card is a different kind of paper; night styling is per paper in SkillCards.css
const CARD_DATA = [
  {
    id: 'card1',
    title: 'Languages',
    paper: 'watercolor',
    rotate: -2,
    items: ['Python', 'C#', 'JavaScript / TypeScript', 'HTML / CSS', 'PHP', 'SQL', 'Ruby'],
  },
  {
    id: 'card2',
    title: 'Technologies',
    paper: 'engineering',
    rotate: 1.5,
    items: ['Docker', 'Kubernetes', 'SSIS', 'JIRA', 'AWS', 'Jenkins'],
  },
  {
    id: 'card3',
    title: 'Frameworks',
    paper: 'kraft',
    rotate: -1,
    items: ['ASP.NET', 'VB.NET', 'Flask / Django', 'Next.js', 'GraphQL', 'React.js', 'Angular'],
  },
  {
    id: 'card4',
    title: 'Testing Tools',
    paper: 'dotgrid',
    rotate: 2,
    items: ['Selenium', 'Cypress', 'Test Driven Dev', 'OOP Concepts', 'Machine Learning'],
  },
];

const STAR_COUNT = 22;
const TAP_SLOP_PX = 6;

// Seeded so each card gets its own star pattern that stays put between visits
const makeStars = (seed) => {
  const rand = seededRandom(seed);
  return Array.from({ length: STAR_COUNT }, (_, k) => {
    const big = rand() > 0.7;
    return {
      key: k,
      big,
      left: Math.round(rand() * 262),
      top: Math.round(rand() * 360),
      duration: (1.6 + rand() * 2.4).toFixed(1),
      delay: (rand() * 2.5).toFixed(1),
    };
  });
};

const Sun = () => (
  <svg className="skill-page__sun" viewBox="0 0 50 50" aria-hidden="true">
    <g className="skill-page__sunRays">
      <path d="M25 2 v7 M25 41 v7 M2 25 h7 M41 25 h7 M8.7 8.7 l5 5 M36.3 36.3 l5 5 M8.7 41.3 l5 -5 M36.3 13.7 l5 -5" />
    </g>
    <circle className="skill-page__sunBody" cx="25" cy="25" r="11.5" />
    <path className="skill-page__face" d="M20 23.5 q1.6 -1.6 3.2 0 M26.8 23.5 q1.6 -1.6 3.2 0 M20.5 28.5 q4.5 3.4 9 0" />
  </svg>
);

const Moon = () => (
  <svg className="skill-page__moon" viewBox="0 0 50 50" aria-hidden="true">
    <path className="skill-page__moonBody" d="M31 8 A 17 17 0 1 0 37 39 A 13 13 0 1 1 31 8 Z" />
    {/* Sleepy face: closed eye + small mouth */}
    <path className="skill-page__moonFace" d="M12.5 22 q2.6 2.6 5.2 0 M14 30.5 q2 1.4 4 0" />
    <text className="skill-page__z skill-page__z--1" x="36" y="14">z</text>
    <text className="skill-page__z skill-page__z--2" x="42" y="7">z</text>
  </svg>
);

const Cloud = () => (
  <svg className="skill-page__cloud" viewBox="0 0 78 36" aria-hidden="true">
    <path d="M10 30 q-8 0 -6 -8 q2 -7 10 -6 q3 -10 15 -8 q8 -8 18 0 q12 -2 13 9 q9 1 8 9 q-1 5 -8 4 z" />
  </svg>
);

const Fastener = ({ paper }) => {
  if (paper === 'watercolor') return <span className="skill-page__tape" aria-hidden="true" />;
  if (paper === 'kraft') return <span className="skill-page__binderClip" aria-hidden="true" />;
  if (paper === 'dotgrid') {
    return (
      <>
        <span className="skill-page__dogEar" aria-hidden="true" />
        <span className="skill-page__paperclip" aria-hidden="true" />
      </>
    );
  }
  return null;
};

const SkillPage = ({ card, index, night }) => {
  const stars = useMemo(() => makeStars(index * 97 + 11), [index]);

  return (
    <div
      className={`skill-page skill-page--${card.paper}${night ? ' is-night' : ''}`}
      style={{ '--sp-rot': `${card.rotate}deg`, '--sp-shoot-delay': `${(index * 1.15).toFixed(2)}s` }}
    >
      <span className="skill-page__shadow" aria-hidden="true" />
      <div className="skill-page__sheet">
        <div className="skill-page__night" aria-hidden="true" />
        <div className="skill-page__sky" aria-hidden="true">
          {stars.map((s) => (
            <i
              key={s.key}
              className={s.big ? 'is-big' : undefined}
              style={{
                left: s.left,
                top: s.top,
                '--tw-dur': `${s.duration}s`,
                '--tw-delay': `${s.delay}s`,
              }}
            >
              {s.big ? '✦' : '•'}
            </i>
          ))}
          <span className="skill-page__shootingStar" />
        </div>
        {card.paper === 'engineering' ? <span className="skill-page__perforation" aria-hidden="true" /> : null}

        <Sun />
        <Moon />
        <Cloud />

        <h4 className="skill-page__title">{card.title}</h4>
        <ul className="skill-page__list">
          {card.items.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
      <Fastener paper={card.paper} />
    </div>
  );
};

export const SkillCards = () => {
  const layoutKey = useSkillCardsLayout();
  const { cluster: clusterPos, positions: layoutPositions } =
    SKILL_LAYOUTS[layoutKey];

  const [dragById, setDragById] = useState(() => ({}));
  // Night on mouse hover; touch users toggle it with a tap
  const [hoverId, setHoverId] = useState(null);
  const [tappedNight, setTappedNight] = useState(() => ({}));
  const dragRef = useRef({
    id: null,
    startClientX: 0,
    startClientY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const getOffset = useCallback(
    (id) => dragById[id] || { x: 0, y: 0 },
    [dragById]
  );

  const handlePointerDown = useCallback((e, id) => {
    e.stopPropagation();
    const o = dragById[id] || { x: 0, y: 0 };
    dragRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffsetX: o.x,
      startOffsetY: o.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [dragById]);

  const handlePointerMove = useCallback((e) => {
    const { id } = dragRef.current;
    if (!id) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    setDragById((prev) => ({
      ...prev,
      [id]: {
        x: dragRef.current.startOffsetX + dx,
        y: dragRef.current.startOffsetY + dy,
      },
    }));
  }, []);

  const handlePointerUp = useCallback((e) => {
    const { id, startClientX, startClientY } = dragRef.current;
    if (id && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // A touch/pen press that barely moved is a tap: flip that card between day and night
    const moved = Math.hypot(e.clientX - startClientX, e.clientY - startClientY);
    if (id && e.type === 'pointerup' && e.pointerType !== 'mouse' && moved < TAP_SLOP_PX) {
      setTappedNight((prev) => ({ ...prev, [id]: !prev[id] }));
    }
    dragRef.current = {
      id: null,
      startClientX: 0,
      startClientY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
    };
  }, []);

  return (
    <div
      className={`skill-cards-cluster skill-cards-cluster--${layoutKey}`}
      style={{
        position: 'absolute',
        left: clusterPos.left,
        top: clusterPos.top,
      }}
    >
      {CARD_DATA.map((card, index) => {
        const pos =
          layoutPositions.find((p) => p.id === card.id) || { x: 0, y: 0 };
        const off = getOffset(card.id);
        return (
          <div
            key={card.id}
            className="skill-cards-canvas-card"
            id={card.id}
            style={{
              position: 'absolute',
              left: pos.x + off.x,
              top: pos.y + off.y,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => handlePointerDown(e, card.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setHoverId(card.id)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHoverId((cur) => (cur === card.id ? null : cur))}
          >
            <SkillPage
              card={card}
              index={index}
              night={hoverId === card.id || Boolean(tappedNight[card.id])}
            />
          </div>
        );
      })}
    </div>
  );
};
