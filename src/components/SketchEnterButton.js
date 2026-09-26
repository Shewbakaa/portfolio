import React, { useEffect, useRef } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const JITTER_REST = 5;
const JITTER_BOIL = 6;
const BOIL_MS = 140;

const wobble = (amount) => (Math.random() - 0.5) * amount;

// Rough rectangle: jittered corners joined by curves with jittered midpoints
const sketchBox = (x, y, w, h, j) => {
  const corners = [
    [x + wobble(j), y + wobble(j)],
    [x + w + wobble(j), y + wobble(j)],
    [x + w + wobble(j), y + h + wobble(j)],
    [x + wobble(j), y + h + wobble(j)],
  ];
  let d = `M${corners[0][0]},${corners[0][1]}`;
  for (let i = 1; i <= 4; i++) {
    const a = corners[i - 1];
    const b = corners[i % 4];
    const mx = (a[0] + b[0]) / 2 + wobble(j * 1.4);
    const my = (a[1] + b[1]) / 2 + wobble(j * 1.4);
    d += ` Q${mx},${my} ${b[0] + wobble(j * 0.6)},${b[1] + wobble(j * 0.6)}`;
  }
  return d;
};

export const SketchEnterButton = ({ onClick, label = "let's go!" }) => {
  const outlineRef = useRef(null);
  const outlineInnerRef = useRef(null);
  const shadowRef = useRef(null);
  const arrowRef = useRef(null);
  const hatchRef = useRef(null);
  const boilRef = useRef(null);

  const draw = (j) => {
    outlineRef.current?.setAttribute('d', sketchBox(30, 26, 220, 70, j));
    outlineInnerRef.current?.setAttribute('d', sketchBox(32, 28, 217, 68, j * 1.3));
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

  // Hand-drawn "line boil" while hovered/focused
  const startBoil = () => {
    if (boilRef.current != null) return;
    draw(JITTER_BOIL);
    boilRef.current = setInterval(() => draw(JITTER_BOIL), BOIL_MS);
  };

  const stopBoil = () => {
    if (boilRef.current != null) clearInterval(boilRef.current);
    boilRef.current = null;
    draw(JITTER_REST);
  };

  useEffect(() => {
    draw(JITTER_REST);
    return () => {
      if (boilRef.current != null) clearInterval(boilRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className="sketch-enter"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={startBoil}
      onMouseLeave={stopBoil}
      onFocus={startBoil}
      onBlur={stopBoil}
    >
      <svg viewBox="0 0 280 120" aria-hidden="true">
        <path ref={shadowRef} className="sketch-enter__shadow" />
        <g ref={hatchRef} className="sketch-enter__hatch" />
        <path ref={outlineRef} className="sketch-enter__outline" />
        <path ref={outlineInnerRef} className="sketch-enter__outline sketch-enter__outline--inner" />
        <text x="140" y="62" className="sketch-enter__label" textAnchor="middle" dominantBaseline="central">
          {label}
        </text>
        <path ref={arrowRef} className="sketch-enter__arrow" />
      </svg>
    </button>
  );
};
