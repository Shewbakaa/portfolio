import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './VinylShelf.css';
import { getTapeAudio } from './tapePlayer';

// Each record plays its Spotify track in the "now spinning" bar: full song for
// listeners signed in to Spotify, a 30-second preview for everyone else.
export const ALBUMS = [
  {
    id: 1,
    title: 'Dilruba Dilnasheen',
    artist: 'Rito Riba & Siddhant Kaushal',
    spotifyId: '3ZhV3K4tmdYofyLKPS5KqF',
    sleeveColor: '#C2410C',
    stripeColor: '#F5C842',
  },
  {
    id: 2,
    title: 'I Will Survive',
    artist: 'Gloria Gaynor',
    spotifyId: '7rIovIsXE6kMn629b7kDig',
    sleeveColor: '#D6336C',
    stripeColor: '#FFD6E7',
  },
  {
    id: 3,
    title: 'Dracula (JENNIE Remix)',
    artist: 'Tame Impala ft. JENNIE',
    spotifyId: '5yvVYFDUpbnjcnRBgjwTzM',
    sleeveColor: '#3B1F5C',
    stripeColor: '#B59BFF',
  },
  {
    id: 4,
    title: 'Have You Ever Seen The Rain',
    artist: 'Creedence Clearwater Revival',
    spotifyId: '2LawezPeJhN4AWuSB0GtAU',
    sleeveColor: '#2D6A8A',
    stripeColor: '#87CEEB',
  },
];

const BASE_POS = { left: -1100, top: -200 };

// Spotify iFrame API, loaded once on first need
let spotifyApiPromise = null;
const loadSpotifyApi = () => {
  if (spotifyApiPromise) return spotifyApiPromise;
  spotifyApiPromise = new Promise((resolve) => {
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      prev?.(IFrameAPI);
      resolve(IFrameAPI);
    };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    document.head.appendChild(s);
  });
  return spotifyApiPromise;
};

const trackUri = (album) => `spotify:track:${album.spotifyId}`;

// At 80 x 80 Spotify's embed shows just the cover art; the shelf records are the controls
const EMBED_SIZE = 80;

// The player is portalled out of the shelf, but React still bubbles its events
// up through the shelf (and the canvas). Stop them so using the player never drags anything.
const stopBubble = (e) => e.stopPropagation();

export const VinylShelf = () => {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
  });

  // Player state: which record is loaded and whether it's playing
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef(null);
  const playerHostRef = useRef(null);
  // Set when a record paused the background tape, so closing the player can resume it
  const tapeWasPlayingRef = useRef(false);
  const currentIdRef = useRef(null);
  currentIdRef.current = currentId;

  const current = ALBUMS.find((a) => a.id === currentId) || null;

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      // Pressing a record is a click, not a shelf drag
      if (e.target.closest?.('button')) return;
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

  // Warm up the API so the first click starts quickly
  useEffect(() => {
    loadSpotifyApi();
  }, []);

  // Only one thing plays at a time: starting the cassette pauses the record
  useEffect(() => {
    const tape = getTapeAudio();
    const onTapePlay = () => {
      tapeWasPlayingRef.current = false;
      playerRef.current?.pause?.();
    };
    tape.addEventListener('play', onTapePlay);
    return () => tape.removeEventListener('play', onTapePlay);
  }, []);

  useEffect(
    () => () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    },
    []
  );

  // Roll on to the next record when a track (or its 30s preview) finishes
  const playNextRef = useRef(null);
  const endedRef = useRef(null);

  const onPlaybackUpdate = useCallback((e) => {
    const { isPaused, position, duration } = e.data || {};
    setPlaying(!isPaused);
    if (!isPaused) {
      const tape = getTapeAudio();
      if (!tape.paused) {
        tapeWasPlayingRef.current = true;
        tape.pause();
      }
    } else if (duration > 0 && position >= duration - 400 && endedRef.current !== currentIdRef.current) {
      // Several end-of-track updates can arrive; advance only once per track
      endedRef.current = currentIdRef.current;
      playNextRef.current?.();
    }
  }, []);

  const playAlbum = useCallback(
    async (album) => {
      endedRef.current = null;
      currentIdRef.current = album.id;
      setCurrentId(album.id);
      const IFrameAPI = await loadSpotifyApi();

      if (playerRef.current) {
        playerRef.current.loadUri(trackUri(album));
        playerRef.current.play();
        return;
      }

      // The host lives in the portal, which renders once currentId is set
      await new Promise((r) => requestAnimationFrame(r));
      const host = playerHostRef.current;
      if (!host) return;
      // Spotify swaps the element it's given for its iframe, so hand it a child React doesn't own
      const mount = document.createElement('div');
      host.replaceChildren(mount);
      IFrameAPI.createController(
        mount,
        { uri: trackUri(album), width: EMBED_SIZE, height: EMBED_SIZE },
        (controller) => {
          playerRef.current = controller;
          controller.addListener('ready', () => controller.play());
          controller.addListener('playback_update', onPlaybackUpdate);
        }
      );
    },
    [onPlaybackUpdate]
  );

  playNextRef.current = () => {
    const i = ALBUMS.findIndex((a) => a.id === currentIdRef.current);
    playAlbum(ALBUMS[(i + 1) % ALBUMS.length]);
  };

  const onRecordClick = useCallback(
    (album) => {
      // Same record: play/pause it
      if (album.id === currentIdRef.current && playerRef.current) {
        playerRef.current.togglePlay();
        return;
      }
      playAlbum(album);
    },
    [playAlbum]
  );

  const closePlayer = useCallback(() => {
    playerRef.current?.destroy?.();
    playerRef.current = null;
    setCurrentId(null);
    setPlaying(false);
    // Hand the room back to the background tape
    if (tapeWasPlayingRef.current) {
      tapeWasPlayingRef.current = false;
      getTapeAudio().play().catch(() => {});
    }
  }, []);

  return (
    <div
      id="vinyl-shelf"
      className="vinyl-shelf"
      style={{
        position: 'absolute',
        left: BASE_POS.left + drag.x,
        top: BASE_POS.top + drag.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Favorite songs shelf"
    >
      <div className="vinyl-shelf__outer">
        <div className="vinyl-shelf__label">MY SHELF · PICK A RECORD</div>
        <div className="vinyl-shelf__records">
          {ALBUMS.map((album) => {
            const isCurrent = album.id === currentId;
            return (
              <button
                key={album.id}
                type="button"
                className={`vinyl-shelf__slot${isCurrent ? ' is-current' : ''}${
                  isCurrent && playing ? ' is-playing' : ''
                }`}
                onClick={() => onRecordClick(album)}
                aria-pressed={isCurrent && playing}
                aria-label={`${isCurrent && playing ? 'Pause' : 'Play'} ${album.title} by ${album.artist}`}
              >
                <span className="vinyl-shelf__tooltip" aria-hidden>
                  {album.title} · {album.artist}
                </span>
                <span className="vinyl-shelf__note" aria-hidden>
                  ♪
                </span>
                <span className="vinyl-shelf__sleeve" style={{ backgroundColor: album.sleeveColor }}>
                  <span className="vinyl-shelf__disc" />
                  <span className="vinyl-shelf__stripe" style={{ backgroundColor: album.stripeColor }}>
                    <span className="vinyl-shelf__stripe-title">{album.title}</span>
                    <span className="vinyl-shelf__stripe-artist">{album.artist}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="vinyl-shelf__plank" aria-hidden="true" />
        <div className="vinyl-shelf__supports" aria-hidden="true">
          <div className="vinyl-shelf__leg" />
          <div className="vinyl-shelf__leg" />
        </div>
      </div>

      {/* Pinned to the screen (outside the panning canvas) so it stays visible while you explore */}
      {current
        ? createPortal(
            <div
              className="now-spinning"
              role="region"
              aria-label={`Now spinning: ${current.title} by ${current.artist}`}
              title={`${current.title} · ${current.artist}`}
              onPointerDown={stopBubble}
              onMouseDown={stopBubble}
              onTouchStart={stopBubble}
              onWheel={stopBubble}
              onClick={stopBubble}
            >
              <span className={`now-spinning__dot${playing ? ' is-on' : ''}`} aria-hidden="true" />
              <button
                type="button"
                className="now-spinning__close"
                onClick={closePlayer}
                aria-label="Stop and close player"
              >
                ✕
              </button>
              <div className="now-spinning__screen">
                <div ref={playerHostRef} />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
