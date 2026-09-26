import React, { useEffect, useMemo, useRef } from 'react';
import '../styles/SketchButton.css';
import { makeWobble, seededRandom, sketchBox } from './sketch/sketchPaths';

const SVG_NS = 'http://www.w3.org/2000/svg';
const JITTER_REST = 5;
const JITTER_BOIL = 6;
const BOIL_MS = 140;

/**
 * Hand-drawn button: double pencil outline, scribble fill, chalk label, and a
 * "line boil" redraw while hovered/focused. Renders an <a> when `href` is set.
 * `seed` makes the resting sketch deterministic (boil is always random).
 */
export const SketchButton = ({
  label,
  href,
  onClick,
  arrow = false,
  seed,
  hatchColor,
  className = '',
  ariaLabel,
}) => {
  const outlineRef = useRef(null);
  const outlineInnerRef = useRef(null);
  const shadowRef = useRef(null);
  const arrowRef = useRef(null);
  const hatchRef = useRef(null);
  const boilRef = useRef(null);

  const restWobble = useMemo(
    () => (seed == null ? makeWobble() : null),
    [seed]
  );

  const draw = (j, wobble) => {
    outlineRef.current?.setAttribute('d', sketchBox(30, 26, 220, 70, j, wobble));
    outlineInnerRef.current?.setAttribute('d', sketchBox(32, 28, 217, 68, j * 1.3, wobble));
    shadowRef.current?.setAttribute(
      'd',
      `M${40 + wobble(2)},${104 + wobble(2)} Q140,${108 + wobble(3)} ${258 + wobble(2)},${100 + wobble(2)} L${260 + wobble(2)},${40 + wobble(2)}`
    );
    arrowRef.current?.setAttribute(
      'd',
      `M262,22 q18,${-12 + wobble(3)} 10,${-20 + wobble(3)} m0,0 l-8,4 m8,-4 l2,9`
    );

    const hatch = hatchRef.current;
    if (hatch) {
      hatch.replaceChildren();
      // Keep strokes inside the box: each line spans x..x+22
      for (let x = 32; x <= 226; x += 13) {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x + wobble(4));
        line.setAttribute('y1', 94 + wobble(4));
        line.setAttribute('x2', x + 22 + wobble(4));
        line.setAttribute('y2', 30 + wobble(4));
        hatch.appendChild(line);
      }
    }
  };

  // Seeded buttons redraw the same resting sketch every time
  const drawRest = () => draw(JITTER_REST, restWobble || makeWobble(seededRandom(seed)));

  const startBoil = () => {
    if (boilRef.current != null) return;
    const boil = () => draw(JITTER_BOIL, makeWobble());
    boil();
    boilRef.current = setInterval(boil, BOIL_MS);
  };

  const stopBoil = () => {
    if (boilRef.current != null) clearInterval(boilRef.current);
    boilRef.current = null;
    drawRest();
  };

  useEffect(() => {
    drawRest();
    return () => {
      if (boilRef.current != null) clearInterval(boilRef.current);
    };
  }, [seed]);

  const Tag = href ? 'a' : 'button';
  const tagProps = href
    ? { href, target: '_blank', rel: 'noreferrer' }
    : { type: 'button' };

  return (
    <Tag
      {...tagProps}
      className={`sketch-btn ${className}`.trim()}
      style={hatchColor ? { '--sketch-hatch': hatchColor } : undefined}
      aria-label={ariaLabel || label}
      onClick={onClick}
      onMouseEnter={startBoil}
      onMouseLeave={stopBoil}
      onFocus={startBoil}
      onBlur={stopBoil}
    >
      <svg viewBox="0 0 280 120" aria-hidden="true">
        <path ref={shadowRef} className="sketch-btn__shadow" />
        <g ref={hatchRef} className="sketch-btn__hatch" />
        <path ref={outlineRef} className="sketch-btn__outline" />
        <path ref={outlineInnerRef} className="sketch-btn__outline sketch-btn__outline--inner" />
        <text x="140" y="62" className="sketch-btn__label" textAnchor="middle" dominantBaseline="central">
          {label}
        </text>
        {arrow ? <path ref={arrowRef} className="sketch-btn__arrow" /> : null}
      </svg>
    </Tag>
  );
};
