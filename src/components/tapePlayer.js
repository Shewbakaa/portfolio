// Background music for the "Now listening" cassette.
// To swap the song: drop the file in src/assets/Audios/ and update TRACK below.
// Only use audio you have the rights to host (royalty-free / licensed / your own).
import trackSrc from '../assets/Audios/lofi-soul.mp3';

export const TRACK = {
  src: trackSrc,
  title: 'Lofi Soul',
  artist: 'Zephira Music',
  side: 'A',
};

const QUIET_VOLUME = 0.25;
const FADE_IN_MS = 3000;

let audio = null;
let fadeTimer = null;

export const getTapeAudio = () => {
  if (!audio) {
    audio = new Audio(TRACK.src);
    audio.loop = true;
    audio.preload = 'auto';
  }
  return audio;
};

const stopFade = () => {
  if (fadeTimer != null) clearInterval(fadeTimer);
  fadeTimer = null;
};

const fadeTo = (target, ms) => {
  const a = getTapeAudio();
  stopFade();
  const from = a.volume;
  const start = performance.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / ms);
    a.volume = from + (target - from) * t;
    if (t >= 1) stopFade();
  }, 50);
};

// Call from a user gesture (the intro "let's go!" click) so browsers allow playback.
export const startTapeQuietly = () => {
  const a = getTapeAudio();
  a.volume = 0;
  a.play()
    .then(() => fadeTo(QUIET_VOLUME, FADE_IN_MS))
    .catch(() => {}); // autoplay refused — the play button still works
};

export const toggleTape = () => {
  const a = getTapeAudio();
  if (a.paused) {
    stopFade();
    if (a.volume === 0) a.volume = QUIET_VOLUME;
    a.play().catch(() => {});
  } else {
    stopFade();
    a.pause();
  }
};
