import React, { useCallback, useRef, useState } from 'react';
import '../styles/NowPlaying.css';

const NOW_PLAYING = {
  label: 'NOW PLAYING',
  title: 'GTA 6',
  platform: 'PS5',
  genre: 'Action-Adventure',
  progress: 8,
  status: 'In Progress',
};

const BASE_POS = { left: -150, top: -800 };

export const NowPlaying = () => {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
  });

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
      id="now-playing"
      className="now-playing"
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
      aria-label="Now playing widget"
    >
      <div className="cart cart--shell" style={{ ['--cart-color']: '#FF5E5E' }}>
        <div className="cart__pins" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="cart__pin" />
          ))}
        </div>

        <div className="cart__label">
          <div className="cart__labelTop">
            <span className="cart__labelSmall">{NOW_PLAYING.label}</span>
            <svg className="cart__pixel" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M11 2h2v4h4v2h-4v4h-2V8H7V6h4V2zm-6 9h2v2H5v-2zm12 0h2v2h-2v-2zM9 17h6v2H9v-2z"
                fill="rgba(250,250,245,0.92)"
              />
            </svg>
          </div>
          <div className="cart__title">{NOW_PLAYING.title}</div>
          <div className="cart__metaRow">
            <span className="cart__platform">{NOW_PLAYING.platform}</span>
            <span className="cart__genre">{NOW_PLAYING.genre}</span>
          </div>
          <div className="cart__scanlines" aria-hidden="true" />
        </div>

        <div className="cart__bottom">
          <div
            className="cart__progress"
            role="progressbar"
            aria-label="Game progress"
            aria-valuenow={NOW_PLAYING.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span className="cart__progressPct">{NOW_PLAYING.progress}%</span>
            <span className="cart__progressBar" aria-hidden="true">
              <span className="cart__progressFill" style={{ width: `${NOW_PLAYING.progress}%` }} />
            </span>
          </div>
          <div className="cart__status">{NOW_PLAYING.status}</div>
        </div>
      </div>
    </section>
  );
};

