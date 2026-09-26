import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import '../styles/BB8animation.css';
import bb8Sound from '../assets/Audios/bb8.mp3';
import bb8Sound2 from '../assets/Audios/bb8-2.mp3';
import bb8Sound3 from '../assets/Audios/bb8-3.mp3';
import bb8Sound4 from '../assets/Audios/bb8-4.mp3';
import bb8Exit from '../assets/Audios/bb8-exit.mp3';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Fraction of the remaining gap closed per 10ms (speed 2 * accelMod 1 / 100),
// converted to a per-second decay rate so motion is identical at 60Hz and 120Hz.
const FOLLOW_PER_10MS = 0.02;
const FOLLOW_RATE = -Math.log(1 - FOLLOW_PER_10MS) / 0.01;
const MAX_DT = 0.05; // avoid a big jump after a tab switch / dropped frames
const SETTLE_PX = 0.5;

export const BB8animation = ({ audioEnabled, onExit, exitInProgress = false }) => {
    const bb8Ref = useRef(null);
    const ballRef = useRef(null);
    const droidXRef = useRef(0);
    const mouseXRef = useRef(300);
    const rafRef = useRef(null);
    const lastTimeRef = useRef(null);
    const toTheRightRef = useRef(true);
    const [look, setLook] = useState({
        headTx: 0,
        headRz: 0,
        headRx: 0,
        antTx: 0,
        antRz: 0,
    });
    const [toTheRight, setToTheRight] = useState(true);
    const [isExiting, setIsExiting] = useState(false); // Exit state
    const stoppedRef = useRef(false);
    stoppedRef.current = isExiting || exitInProgress;

    const sounds = [bb8Sound, bb8Sound2, bb8Sound3, bb8Sound4];
    const audioRef = useRef(new Audio());
    const bb8ExitRef = useRef(new Audio(bb8Exit));

    const setDirection = (right) => {
        if (toTheRightRef.current !== right) {
            toTheRightRef.current = right;
            setToTheRight(right);
        }
    };

    const applyDroidTransform = () => {
        const x = droidXRef.current;
        if (bb8Ref.current) bb8Ref.current.style.transform = `translateX(${x}px)`;
        if (ballRef.current) ballRef.current.style.transform = `rotateZ(${x / 2}deg)`;
    };

    // Movement loop — one rAF per display frame, eased by elapsed time.
    const tick = (now) => {
        rafRef.current = null;
        if (stoppedRef.current) return;

        const last = lastTimeRef.current ?? now;
        const dt = Math.min((now - last) / 1000, MAX_DT);
        lastTimeRef.current = now;

        const distance = mouseXRef.current - droidXRef.current;
        if (Math.abs(distance) < SETTLE_PX) {
            droidXRef.current = mouseXRef.current;
            applyDroidTransform();
            lastTimeRef.current = null;
            return; // settled — loop restarts on next mousemove
        }

        droidXRef.current += distance * (1 - Math.exp(-FOLLOW_RATE * dt));
        setDirection(distance > 0);
        applyDroidTransform();
        rafRef.current = requestAnimationFrame(tick);
    };

    const startLoop = () => {
        if (rafRef.current == null && !stoppedRef.current) {
            rafRef.current = requestAnimationFrame(tick);
        }
    };

    const playRandomSound = () => {
        if (audioRef.current.paused) {
            const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
            audioRef.current.src = randomSound;
            audioRef.current.play().catch((err) => console.error("Audio play failed", err));
        }
      };

    // Handle mouse movement — head/antennas aim toward cursor (screen-space)
    const handleMouseMove = (event) => {
        if (!isExiting && !exitInProgress) {
            mouseXRef.current = event.pageX;
            startLoop();
            const el = bb8Ref.current;
            if (el) {
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const chaseDx = event.clientX - cx;
                const chaseGap = Math.abs(mouseXRef.current - droidXRef.current);
                const stationary = chaseGap < 28;

                if (stationary) {
                    const margin = 14;
                    if (event.clientX > cx + margin) setDirection(true);
                    else if (event.clientX < cx - margin) setDirection(false);
                }

                let headTx;
                let headRz;
                let headRx;
                let antTx;
                let antRz;

                if (stationary) {
                    const nx = (event.clientX / window.innerWidth - 0.5) * 2;
                    headTx = clamp(nx * 22, -18, 18);
                    headRz = clamp(nx * 32, -30, 30);
                    headRx = 0;
                    antTx = clamp(nx * 14, -12, 12);
                    antRz = clamp(nx * 16, -14, 14);
                } else {
                    headTx = clamp(chaseDx / 15, -18, 18);
                    headRz = clamp(chaseDx / 20, -30, 30);
                    headRx = 0;
                    antTx = clamp(chaseDx / 30, -12, 12);
                    antRz = clamp(chaseDx / 80, -14, 14);
                }

                setLook({ headTx, headRz, headRx, antTx, antRz });
            }
            if (audioEnabled) {
              playRandomSound();
            }
            else {
              audioRef.current.pause();
            }
        }
    };

    // Optional: Enter key triggers onExit (only when parent supplies onExit)
    useEffect(() => {
        if (!onExit) return undefined;

        const handleKeyDown = (event) => {
        if (event.key === "Enter" && !isExiting) {
            setIsExiting(true);

            gsap.to(".bb8 .ball", {
            x: window.innerWidth,
            rotation: 360 * 3,
            duration: 3,
            ease: "power1.inOut",
            onStart: () => {
                gsap.to(".enterButton", { opacity: 0, duration: 2 });
                if(audioEnabled){
                  bb8ExitRef.current.play().catch((err) => console.error("Audio play failed", err));
                }
            },
            onComplete: () => {
                if(audioEnabled) bb8ExitRef.current.pause();
                onExit();
            },
            });

            gsap.to(".bb8 .head", {
            x: window.innerWidth,
            duration: 3,
            ease: "power1.inOut",
            });

            gsap.to(".bb8 .antennas", {
                x: window.innerWidth,
                duration: 3,
                ease: "power1.inOut",
            });

            gsap.to(".bb8 .shadow", {
                x: window.innerWidth,
                duration: 3,
                ease: "power1.inOut",
            });
        }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isExiting, onExit, audioEnabled]);

    // Run the movement loop; stop it (leaving transforms in place for GSAP) on exit
    useEffect(() => {
        if (isExiting || exitInProgress) return undefined;
        applyDroidTransform();
        startLoop();
        return () => {
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            lastTimeRef.current = null;
        };
    }, [isExiting, exitInProgress]);

    // Attach event listener for mouse movement
    useEffect(() => {
        document.addEventListener("mousemove", handleMouseMove);
        return () => document.removeEventListener("mousemove", handleMouseMove);
    }, [audioEnabled, isExiting, exitInProgress]);

    return (
        <div id="bb8-animate">

        {/* BB-8 */}
        <div ref={bb8Ref} className="bb8">
            <div
            className={`antennas ${toTheRight ? "right" : ""}`}
            style={{
                transform: `translateX(${look.antTx}px) rotateZ(${look.antRz}deg)`,
            }}
            >
                <div className="antenna short"></div>
                <div className="antenna long"></div>
            </div>
            <div
            className="head"
            style={{
                transform: `translateX(${look.headTx}px) rotateX(${look.headRx}deg) rotateZ(${look.headRz}deg)`,
            }}
            >
                <div className="stripe one"></div>
                <div className="stripe two"></div>
                <div className={`eyes ${toTheRight ? "right" : ""}`}>
                    <div className="eye one"></div>
                    <div className="eye two"></div>
                </div>
                <div className={`stripe detail ${toTheRight ? "right" : ""}`}>
                    <div className="detail zero"></div>
                    <div className="detail zero"></div>
                    <div className="detail one"></div>
                    <div className="detail two"></div>
                    <div className="detail three"></div>
                    <div className="detail four"></div>
                    <div className="detail five"></div>
                    <div className="detail five"></div>
                </div>
                <div className="stripe three"></div>
            </div>
            <div ref={ballRef} className="ball">
                <div className="lines one"></div>
                <div className="lines two"></div>
                <div className="ring one"></div>
                <div className="ring two"></div>
                <div className="ring three"></div>
            </div>
            <div className="shadow"></div>
        </div>

        {/* Instructions */}
        <div className="instructions">
            <p>Move your mouse.</p>
        </div>
        </div>
    );
};