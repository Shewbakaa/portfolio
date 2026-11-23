import React, { useCallback, useRef, useState } from 'react';
import './CookingCard.css';

export const COOKING_PROJECTS = [
  {
    id: 'cooking-card',
    basePos: { left: 400, top: -615 },
    platform: 'REACT NATIVE · MOBILE',
    platformColor: '#3BCEAC',
    title: 'Budget Tracker',
    subtitle: 'Personal finance app',
    stack: [
      { label: 'React Native', hot: true },
      { label: 'Expo', hot: true },
      { label: 'AsyncStorage', hot: false },
      { label: 'TypeScript', hot: false },
    ],
    progress: 80,
    startedDate: 'Apr 2026',
    eta: 'under app store review™',
    chefNote: 'first time with React Native, wish me luck',
  },
];

/** @deprecated Use COOKING_PROJECTS */
export const COOKING = COOKING_PROJECTS[0];

function CookingCardItem({ project }) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
  });

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      dragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: drag.x,
        startY: drag.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [drag.x, drag.y]
  );

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    setDrag({
      x: dragRef.current.startX + dx,
      y: dragRef.current.startY + dy,
    });
  }, []);

  const onPointerUp = useCallback((e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current.active = false;
  }, []);

  const p = Math.min(100, Math.max(0, project.progress));
  const titleEl = project.url ? (
    <a
      className="cooking-card__title-link"
      href={project.url}
      target="_blank"
      rel="noreferrer"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {project.title}
    </a>
  ) : (
    project.title
  );

  return (
    <div
      id={project.id}
      className="cooking-card"
      style={{
        position: 'absolute',
        left: project.basePos.left + drag.x,
        top: project.basePos.top + drag.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={`Currently cooking: ${project.title}`}
    >
      <div className="cooking-card__inner">
        <header className="cooking-card__header">
          <div className="cooking-card__flames" aria-hidden="true">
            <span className="cooking-card__flame cooking-card__flame--1" />
            <span className="cooking-card__flame cooking-card__flame--2" />
            <span className="cooking-card__flame cooking-card__flame--3" />
          </div>
          <div className="cooking-card__header-title-wrap">
            <span className="cooking-card__header-label">CURRENTLY COOKING</span>
          </div>
          <span className="cooking-card__status-dot" aria-hidden="true" />
        </header>

        <div className="cooking-card__body">
          <span
            className="cooking-card__platform"
            style={{ backgroundColor: project.platformColor }}
          >
            {project.platform}
          </span>
          <h2 className="cooking-card__title">{titleEl}</h2>
          <p className="cooking-card__subtitle">{project.subtitle}</p>

          <section className="cooking-card__section cooking-card__section--ingredients">
            <h3 className="cooking-card__section-label">INGREDIENTS</h3>
            <ul className="cooking-card__tags">
              {project.stack.map((item) => (
                <li key={item.label}>
                  <span
                    className={`cooking-card__tag${item.hot ? ' cooking-card__tag--hot' : ''}`}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="cooking-card__section cooking-card__section--progress">
            <div className="cooking-card__progress-head">
              <span className="cooking-card__progress-label">DONE</span>
              <span className="cooking-card__progress-pct">{p}%</span>
            </div>
            <div className="cooking-card__bar">
              <div className="cooking-card__fill" style={{ width: `${p}%` }}>
                <span className="cooking-card__fill-cursor" aria-hidden="true" />
              </div>
            </div>
            <div className="cooking-card__eta-row">
              <span>{project.startedDate}</span>
              <span>{project.eta}</span>
            </div>
          </section>
        </div>

        <footer className="cooking-card__footer">
          <div className="cooking-card__footer-label">CHEF&apos;S NOTE</div>
          <p className="cooking-card__footer-note">
            <span className="cooking-card__quote" aria-hidden="true">
              &ldquo;
            </span>
            {project.chefNote}
            <span className="cooking-card__quote" aria-hidden="true">
              &rdquo;
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}

export const CookingCard = () => (
  <>
    {COOKING_PROJECTS.map((project) => (
      <CookingCardItem key={project.id} project={project} />
    ))}
  </>
);
