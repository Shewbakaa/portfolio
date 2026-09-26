import React, { useCallback, useRef, useState } from 'react';
import '../styles/TimelineStrip.css';

const TIMELINE_EVENTS = [
  { year: '2017', label: 'Started CS Degree', type: 'education' },
  { year: '2021', label: 'First Internship', type: 'work' },
  { year: '2021', label: 'Started Masters', type: 'education' },
  { year: '2023', label: 'PropChain', type: 'project' },
  { year: '2023', label: 'Graduated Masters', type: 'education' },
  { year: '2024', label: 'Full Stack Role', type: 'work' },
  { year: '2026', label: 'Meal Roulette', type: 'project' },
];

// Board sits above the Now Playing / Currently Cooking cards (clear by ~24px)
const TIMELINE_POS = { left: -620, top: -1100 };

// Polaroid centre x / top y inside the cork area, plus tilt
const EVENT_POSITIONS = [
  { x: 250, y: 30, rot: -4 },
  { x: 386, y: 62, rot: 3 },
  { x: 522, y: 28, rot: -3 },
  { x: 658, y: 60, rot: 2.5 },
  { x: 794, y: 30, rot: -2 },
  { x: 930, y: 62, rot: 3 },
  { x: 1066, y: 32, rot: -3 },
];

const POLAROID_HALF_WIDTH = 65;
const PIN_Y_OFFSET = 3;
const YARN_SAG = 16;

const Doodle = ({ type }) => {
  if (type === 'education') {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M4 16 L20 9 L36 16 L20 23 Z" className="is-fill" />
        <path d="M11 19 v7 q9 5 18 0 v-7 M34 17 v9" />
        <circle cx="34" cy="27" r="1.8" className="is-ink" />
      </svg>
    );
  }
  if (type === 'work') {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect x="6" y="13" width="28" height="19" rx="3" className="is-fill" />
        <path d="M15 13 v-4 h10 v4 M6 21 h28" />
        <rect x="18" y="19" width="4" height="4" className="is-ink" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 6 a10 10 0 0 1 6 18 v4 h-12 v-4 a10 10 0 0 1 6 -18 z" className="is-fill" />
      <path d="M15 32 h10 M16 35.5 h8 M20 24 v-6 l-3 -3 M20 18 l3 -3" />
    </svg>
  );
};

export const TimelineStrip = () => {
  const [dragById, setDragById] = useState(() => ({}));
  const [draggingId, setDraggingId] = useState(null);
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

  const onDown = useCallback(
    (e, id) => {
      e.stopPropagation();
      const o = dragById[id] || { x: 0, y: 0 };
      dragRef.current = {
        id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startOffsetX: o.x,
        startOffsetY: o.y,
      };
      setDraggingId(id);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [dragById]
  );

  const onMove = useCallback((e) => {
    const id = dragRef.current.id;
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

  const onUp = useCallback((e) => {
    if (dragRef.current.id && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = {
      id: null,
      startClientX: 0,
      startClientY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
    };
    setDraggingId(null);
  }, []);

  // Keyed per event (years repeat), so each polaroid drags on its own
  const nodes = TIMELINE_EVENTS.map((ev, i) => {
    const id = `${ev.year}-${ev.label}`;
    const off = getOffset(id);
    const pos = EVENT_POSITIONS[i];
    return { ...ev, ...pos, id, px: pos.x + off.x, py: pos.y + off.y };
  });

  return (
    <section
      id="card-timeline"
      className="timeline-strip"
      style={{ position: 'absolute', left: TIMELINE_POS.left, top: TIMELINE_POS.top }}
      aria-label="Timeline"
    >
      <div className="timeline-board">
        <div className="timeline-board__cork">
          <div className="timeline-casefile" aria-hidden="true">
            <span className="timeline-pin" />
            <span className="timeline-casefile__head">CASE FILE</span>
            the career of S. Pawar
            <br />
            2017 → 2026
          </div>

          {/* Red yarn between the pins, sagging a little between each pair */}
          <svg className="timeline-board__yarn" aria-hidden="true">
            {nodes.slice(0, -1).map((a, i) => {
              const b = nodes[i + 1];
              const ay = a.py + PIN_Y_OFFSET;
              const by = b.py + PIN_Y_OFFSET;
              const mx = (a.px + b.px) / 2;
              const my = Math.max(ay, by) + YARN_SAG;
              return <path key={`${a.id}->${b.id}`} d={`M ${a.px} ${ay} Q ${mx} ${my} ${b.px} ${by}`} />;
            })}
          </svg>

          {nodes.map((ev) => (
            <div
              key={ev.id}
              className={`timeline-note timeline-note--${ev.type}${draggingId === ev.id ? ' is-dragging' : ''}`}
              style={{
                left: ev.px - POLAROID_HALF_WIDTH,
                top: ev.py,
                ['--tn-rot']: `${ev.rot}deg`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => onDown(e, ev.id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {/* Intro pop target: no CSS transform here */}
              <div className="timeline-note__pop">
                <span className="timeline-pin" aria-hidden="true" />
                <div className="timeline-note__photo">
                  <Doodle type={ev.type} />
                  <span className="timeline-note__year">{ev.year}</span>
                </div>
                <div className="timeline-note__label">{ev.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
