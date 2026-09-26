import { useEffect, useState } from 'react';

const IN_VIEW_MARGIN = '100px';
const NEAR_MARGIN = '600px';

/**
 * Returns { inView, isNear } for a canvas element, via IntersectionObserver.
 * IO accounts for the canvas pan/zoom transforms, so no per-frame polling is needed.
 * - inView: within 100px of the viewport
 * - isNear: within 600px (used to start loading assets early)
 */
export function useIsInView(elementRef) {
  const [state, setState] = useState({ inView: false, isNear: false });

  useEffect(() => {
    const el = elementRef?.current;
    if (!el) return undefined;

    // No IO support: treat everything as visible so animations still load and play
    if (typeof window.IntersectionObserver !== 'function') {
      setState({ inView: true, isNear: true });
      return undefined;
    }

    // Observe against the canvas viewport itself: with root=null, its overflow:hidden
    // would clip cards before rootMargin applies, so "near" would never fire early.
    const root = el.closest('.canvas-container');

    const observe = (rootMargin, key) => {
      const io = new IntersectionObserver(
        ([entry]) => {
          const value = Boolean(entry?.isIntersecting);
          setState((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
        },
        { root, rootMargin, threshold: 0 }
      );
      io.observe(el);
      return io;
    };

    const ioIn = observe(IN_VIEW_MARGIN, 'inView');
    const ioNear = observe(NEAR_MARGIN, 'isNear');

    return () => {
      ioIn.disconnect();
      ioNear.disconnect();
    };
  }, [elementRef]);

  return state;
}
