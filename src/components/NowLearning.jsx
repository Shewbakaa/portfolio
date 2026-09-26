import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/NowLearning.css';
import { TRACK, getTapeAudio, toggleTape } from './tapePlayer';

const NOW_LEARNING = {
  label: 'NOW LISTENING',
};

const BASE_POS = { left: -600, top: -650 };

// Cassette geometry (SVG units, matches the shell's inner 290×86 box)
const REEL_Y = 34;
const REEL_LEFT_X = 80;
const REEL_RIGHT_X = 210;
const HUB_R = 11;
const PACK_MIN_R = 13;
const PACK_MAX_R = 28;
const GUIDE_LEFT = { x: 24, y: 70 };
const GUIDE_RIGHT = { x: 266, y: 70 };
const TAPE_SPEED = 45; // px/s along the tape — hubs spin faster as their pack shrinks
const SPOKES = [0, 60, 120, 180, 240, 300];

const formatTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

// Tape pack radii for progress p, conserving tape area between the two reels
const packRadii = (p) => {
  const span = PACK_MAX_R ** 2 - PACK_MIN_R ** 2;
  return [
    Math.sqrt(PACK_MAX_R ** 2 - p * span),
    Math.sqrt(PACK_MIN_R ** 2 + p * span),
  ];
};

// Point where a line from guide g touches the circle, on the outer side
const tangentPoint = (cx, cy, r, g, outerIsLeft) => {
  const dx = g.x - cx;
  const dy = g.y - cy;
  const base = Math.atan2(dy, dx);
  const spread = Math.acos(Math.min(1, r / Math.hypot(dx, dy)));
  const a = { x: cx + r * Math.cos(base + spread), y: cy + r * Math.sin(base + spread) };
  const b = { x: cx + r * Math.cos(base - spread), y: cy + r * Math.sin(base - spread) };
  return (a.x < b.x) === outerIsLeft ? a : b;
};

const Hub = ({ hubRef, cx }) => (
  <g ref={hubRef} transform={`rotate(0 ${cx} ${REEL_Y})`}>
    <circle cx={cx} cy={REEL_Y} r={HUB_R} className="cassette__hub" />
    {SPOKES.map((deg) => (
      <rect
        key={deg}
        x={cx - 1.5}
        y={REEL_Y - HUB_R + 1}
        width="3"
        height="4"
        className="cassette__tooth"
        transform={`rotate(${deg} ${cx} ${REEL_Y})`}
      />
    ))}
    <circle cx={cx} cy={REEL_Y} r="4.5" className="cassette__hubHole" />
  </g>
);

export const NowLearning = () => {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(() => !getTapeAudio().paused);
  const [time, setTime] = useState({ current: 0, duration: NaN });
  const dragRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
  });

  const packLeftRef = useRef(null);
  const packRightRef = useRef(null);
  const hubLeftRef = useRef(null);
  const hubRightRef = useRef(null);
  const tapeRef = useRef(null);
  const anglesRef = useRef({ left: 0, right: 0 });

  // Draw reels/tape for the audio's current progress, spinning hubs by dt seconds
  const drawTape = useCallback((dt) => {
    const a = getTapeAudio();
    const p = Number.isFinite(a.duration) && a.duration > 0 ? a.currentTime / a.duration : 0;
    const [rLeft, rRight] = packRadii(p);

    // Tape leaves the left pack and winds onto the right; both reels turn counter-clockwise
    const angles = anglesRef.current;
    angles.left = (angles.left - (TAPE_SPEED / rLeft) * dt * (180 / Math.PI)) % 360;
    angles.right = (angles.right - (TAPE_SPEED / rRight) * dt * (180 / Math.PI)) % 360;

    packLeftRef.current?.setAttribute('r', rLeft.toFixed(2));
    packRightRef.current?.setAttribute('r', rRight.toFixed(2));
    hubLeftRef.current?.setAttribute('transform', `rotate(${angles.left.toFixed(2)} ${REEL_LEFT_X} ${REEL_Y})`);
    hubRightRef.current?.setAttribute('transform', `rotate(${angles.right.toFixed(2)} ${REEL_RIGHT_X} ${REEL_Y})`);

    const tl = tangentPoint(REEL_LEFT_X, REEL_Y, rLeft, GUIDE_LEFT, true);
    const tr = tangentPoint(REEL_RIGHT_X, REEL_Y, rRight, GUIDE_RIGHT, false);
    tapeRef.current?.setAttribute(
      'd',
      `M${tl.x.toFixed(2)},${tl.y.toFixed(2)} L${GUIDE_LEFT.x},${GUIDE_LEFT.y} L${GUIDE_RIGHT.x},${GUIDE_RIGHT.y} L${tr.x.toFixed(2)},${tr.y.toFixed(2)}`
    );
  }, []);

  // Keep UI in sync with the shared audio element
  useEffect(() => {
    const a = getTapeAudio();
    const syncTime = () => setTime({ current: a.currentTime, duration: a.duration });
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onSeek = () => {
      syncTime();
      drawTape(0);
    };

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('timeupdate', syncTime);
    a.addEventListener('loadedmetadata', onSeek);
    a.addEventListener('seeked', onSeek);
    onSeek();

    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('timeupdate', syncTime);
      a.removeEventListener('loadedmetadata', onSeek);
      a.removeEventListener('seeked', onSeek);
    };
  }, [drawTape]);

  // Animate only while playing
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    let last = performance.now();
    const frame = (now) => {
      drawTape(Math.min((now - last) / 1000, 0.1));
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, drawTape]);

  const onDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: drag.x,
      startY: drag.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [drag.x, drag.y]);

  const onMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    setDrag({ x: dragRef.current.startX + dx, y: dragRef.current.startY + dy });
  }, []);

  const onUp = useCallback((e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current.active = false;
  }, []);

  return (
    <section
      id="now-learning"
      className={`now-learning${playing ? ' is-playing' : ''}`}
      style={{
        position: 'absolute',
        left: BASE_POS.left + drag.x,
        top: BASE_POS.top + drag.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="Now listening widget"
    >
      <div className="now-learning__label">
        <span className="now-learning__labelText">{NOW_LEARNING.label}</span>
        <span className="now-learning__controls">
          <button
            type="button"
            className="now-learning__play"
            aria-label={playing ? 'Pause music' : 'Play music'}
            // Keep the card's drag handler from capturing the pointer
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleTape}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {playing ? (
                <>
                  <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
                </>
              ) : (
                <path d="M4 2 L14 8 L4 14 Z" />
              )}
            </svg>
          </button>
          <span className="now-learning__rec" aria-hidden="true">
            <span className="now-learning__dot" /> REC
          </span>
        </span>
      </div>

      <div className="cassette">
        <div className="cassette__shell">
          <svg className="cassette__svg" viewBox="0 0 290 86" aria-hidden="true">
            <rect x="14" y="8" width="262" height="52" rx="8" className="cassette__window" />
            <circle ref={packLeftRef} cx={REEL_LEFT_X} cy={REEL_Y} r={PACK_MAX_R} className="cassette__pack" />
            <circle ref={packRightRef} cx={REEL_RIGHT_X} cy={REEL_Y} r={PACK_MIN_R} className="cassette__pack" />
            <Hub hubRef={hubLeftRef} cx={REEL_LEFT_X} />
            <Hub hubRef={hubRightRef} cx={REEL_RIGHT_X} />
            <path ref={tapeRef} className="cassette__tape" />
            <circle cx={GUIDE_LEFT.x} cy={GUIDE_LEFT.y} r="3" className="cassette__guide" />
            <circle cx={GUIDE_RIGHT.x} cy={GUIDE_RIGHT.y} r="3" className="cassette__guide" />
            <rect x="131" y="70" width="28" height="9" rx="2" className="cassette__head" />
          </svg>
        </div>
      </div>

      <div className="now-learning__text">
        <div className="now-learning__title">{TRACK.title}</div>
        <div className="now-learning__subtitle">{TRACK.artist}</div>
      </div>

      <div className="now-learning__meta" aria-hidden="true">
        <span className="now-learning__metaLeft">SIDE {TRACK.side}</span>
        <span className="now-learning__metaRight">
          {formatTime(time.current)} / {formatTime(time.duration)}
        </span>
      </div>
    </section>
  );
};
