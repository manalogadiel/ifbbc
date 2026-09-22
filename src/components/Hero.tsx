import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Volume2 } from 'lucide-react';
import { MagneticButton } from './ui/MagneticButton';
import { LineMaskReveal } from './ui/LineMaskReveal';

// High-performance WebP frame buffer: 45 discrete frames ensures silky 60FPS scrubbing with fast texture extraction
const TOTAL_FRAMES = 45;
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export interface GatheringScheduleItem {
  time?: string;
  service: string;
  location: string;
  isPrimary?: boolean;
}

export interface WeeklyGathering {
  id: string;
  day: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayName: string;
  hour: number;
  min: number;
  endHour: number;
  endMin: number;
  time: string;
  name: string;
  category: string;
  location?: string;
  topBarText: string;
  scheduleItems: GatheringScheduleItem[];
}

export const WEEKLY_GATHERINGS: WeeklyGathering[] = [
  {
    id: 'sun-lifegroup',
    day: 0,
    dayName: 'Sunday',
    hour: 9,
    min: 0,
    endHour: 10,
    endMin: 0,
    time: '9:00 AM',
    name: 'Life Group & Worship',
    category: 'Sunday Morning Discipleship',
    topBarText: '9:00 AM Life Group & 10:00 AM Worship Service',
    scheduleItems: [
      { time: '9:00 AM', service: 'Life Group', location: 'Departamental Classrooms', isPrimary: true },
      { time: '10:00 AM', service: 'Worship Service', location: 'Worship Hall', isPrimary: false },
    ],
  },
  {
    id: 'sun-worship',
    day: 0,
    dayName: 'Sunday',
    hour: 10,
    min: 0,
    endHour: 12,
    endMin: 0,
    time: '10:00 AM',
    name: 'Worship Service',
    category: "Corporate Lord's Day Gathering",
    topBarText: '10:00 AM Worship Service',
    scheduleItems: [
      { time: '10:00 AM', service: 'Worship Service', location: 'Worship Hall', isPrimary: true },
    ],
  },
  {
    id: 'wed-prayer',
    day: 3,
    dayName: 'Wednesday',
    hour: 18,
    min: 0,
    endHour: 19,
    endMin: 30,
    time: '6:00 PM',
    name: 'Prayer Meeting',
    category: 'Midweek Spiritual Anchor',
    topBarText: '6:00 PM Prayer Meeting',
    scheduleItems: [
      { time: '6:00 PM', service: 'Prayer Meeting', location: 'Worship Hall', isPrimary: true },
    ],
  },
  {
    id: 'fri-cottage',
    day: 5,
    dayName: 'Friday',
    hour: 18,
    min: 0,
    endHour: 19,
    endMin: 30,
    time: '6:00 PM',
    name: 'Cottage Service',
    category: 'Home & Community Fellowship',
    location: 'Designated Member Homes',
    topBarText: '6:00 PM Cottage Service at Member Homes',
    scheduleItems: [
      { time: '6:00 PM', service: 'Cottage Service', location: 'Designated Homes', isPrimary: true },
    ],
  },
  {
    id: 'sat-missions',
    day: 6,
    dayName: 'Saturday',
    hour: 14,
    min: 0,
    endHour: 16,
    endMin: 0,
    time: '2:00 PM',
    name: 'Missions Outreach',
    category: 'Evangelistic Outreach',
    location: 'Mission Outreaches',
    topBarText: '2:00 PM Missions',
    scheduleItems: [
      { time: '2:00 PM', service: 'Missions', location: 'Calumpang & Cupang', isPrimary: true },
    ],
  },
];

export interface NextGatheringState {
  gathering: WeeklyGathering;
  isInSession: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  calendarDate: string;
}

export const getNextGathering = (now: Date): NextGatheringState => {
  let inSessionGathering: WeeklyGathering | null = null;
  let inSessionTarget: Date = now;
  let upcomingGathering: WeeklyGathering = WEEKLY_GATHERINGS[0];
  let upcomingTarget: Date = now;
  let minDiff = Infinity;

  for (const g of WEEKLY_GATHERINGS) {
    const target = new Date(now);
    const dayDiff = (g.day - now.getDay() + 7) % 7;
    target.setDate(now.getDate() + dayDiff);

    let activeG = g;
    // Check if the coming Saturday is the 2nd Saturday of the month (dates 8 to 14)
    if (g.day === 6) {
      const isSecondSaturday = target.getDate() >= 8 && target.getDate() <= 14;
      if (isSecondSaturday) {
        activeG = {
          id: 'sat-paraiso',
          day: 6,
          dayName: 'Saturday',
          hour: 11,
          min: 0,
          endHour: 13,
          endMin: 0,
          time: '11:00 AM',
          name: 'Paraiso Mission',
          category: 'Evangelistic Outreach',
          location: 'Paraiso',
          topBarText: '11:00 AM Paraiso Mission',
          scheduleItems: [
            { time: '11:00 AM', service: 'Paraiso Mission', location: 'Paraiso', isPrimary: true },
          ],
        };
      }
    }

    target.setHours(activeG.hour, activeG.min, 0, 0);

    const end = new Date(now);
    end.setDate(now.getDate() + dayDiff);
    end.setHours(activeG.endHour, activeG.endMin, 0, 0);

    // If currently between service start and finish
    if (now >= target && now < end) {
      inSessionGathering = activeG;
      inSessionTarget = target;
      break;
    }

    // If service has already finished today, shift target to next week
    if (now >= end) {
      target.setDate(target.getDate() + 7);
      if (g.day === 6) {
        const isNextSecondSaturday = target.getDate() >= 8 && target.getDate() <= 14;
        if (isNextSecondSaturday) {
          activeG = {
            id: 'sat-paraiso',
            day: 6,
            dayName: 'Saturday',
            hour: 11,
            min: 0,
            endHour: 13,
            endMin: 0,
            time: '11:00 AM',
            name: 'Paraiso Mission',
            category: 'Evangelistic Outreach',
            location: 'Paraiso',
            topBarText: '11:00 AM Paraiso Mission',
            scheduleItems: [
              { time: '11:00 AM', service: 'Paraiso Mission', location: 'Paraiso', isPrimary: true },
            ],
          };
        } else {
          activeG = g;
        }
        target.setHours(activeG.hour, activeG.min, 0, 0);
      }
    }

    const diff = target.getTime() - now.getTime();
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      upcomingGathering = activeG;
      upcomingTarget = target;
    }
  }

  const formatCalendarDate = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return `${month} ${day}`;
  };

  if (inSessionGathering) {
    return {
      gathering: inSessionGathering,
      isInSession: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      calendarDate: formatCalendarDate(inSessionTarget),
    };
  }

  const days = Math.floor(minDiff / 86400000);
  const hours = Math.floor((minDiff / 3600000) % 24);
  const minutes = Math.floor((minDiff / 60000) % 60);
  const seconds = Math.floor((minDiff / 1000) % 60);

  return {
    gathering: upcomingGathering,
    isInSession: false,
    days,
    hours,
    minutes,
    seconds,
    calendarDate: formatCalendarDate(upcomingTarget),
  };
};

interface HeroProps {
  onOpenPrayer: () => void;
  onScrollToSermons: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenPrayer, onScrollToSermons }) => {
  // ── 1. Dynamic Next Weekly Gathering Countdown ──────────────────────────────
  const [nextGatheringState, setNextGatheringState] = useState<NextGatheringState>(() =>
    getNextGathering(new Date())
  );

  useEffect(() => {
    const updateCountdown = () => {
      setNextGatheringState(getNextGathering(new Date()));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── 2. Canvas & Frame-Sequence Engine Refs ─────────────────────────────────
  const heroRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);

  // ── 3D Parallax Tilt + Two-Stage Lighting System ────────────────────────────
  // Stage 0 (idle):    Soft ambient radial spotlight resting at center
  // Stage 1 (flash):   Hover-enter → central core flashes & expands as shockwave
  // Stage 2 (track):   Post-shockwave → cursor-tracking spotlight + border beam
  // Leave:             Smooth ease-out spring decay back to centered idle state
  const cardRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const shockwaveRef = useRef<HTMLDivElement>(null);
  const trackGlowRef = useRef<HTMLDivElement>(null);
  const borderBeamRef = useRef<HTMLDivElement>(null);

  const tiltRafRef = useRef<number | null>(null);
  const tiltTargetRef = useRef({ rx: 0, ry: 0, ox: 50, oy: 50 });
  const tiltCurrentRef = useRef({ rx: 0, ry: 0, ox: 50, oy: 50 });
  const lightPhaseRef = useRef<'idle' | 'flash' | 'tracking'>('idle');
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyTilt = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const t = tiltTargetRef.current;
    const c = tiltCurrentRef.current;

    // Spring factor varies by phase: faster snapping while tracking, gentler on leave
    const factor = lightPhaseRef.current === 'tracking' ? 0.10 : 0.08;
    c.rx += (t.rx - c.rx) * factor;
    c.ry += (t.ry - c.ry) * factor;
    c.ox += (t.ox - c.ox) * factor;
    c.oy += (t.oy - c.oy) * factor;

    // GPU-composited transform
    const scaleVal = lightPhaseRef.current === 'idle' ? 1 : 1.015;
    card.style.transform = `perspective(900px) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg) scale3d(${scaleVal}, ${scaleVal}, 1)`;

    // Update CSS custom properties for glow layer positioning
    const ox = `${c.ox.toFixed(2)}%`;
    const oy = `${c.oy.toFixed(2)}%`;
    card.style.setProperty('--glow-ox', ox);
    card.style.setProperty('--glow-oy', oy);

    // Update tracking glow + border beam positions directly (avoids React re-renders)
    if (trackGlowRef.current) {
      trackGlowRef.current.style.background =
        `radial-gradient(340px circle at ${ox} ${oy}, rgba(99,102,241,0.16), rgba(99,102,241,0.04) 50%, transparent 75%)`;
    }
    if (borderBeamRef.current) {
      borderBeamRef.current.style.background =
        `radial-gradient(220px circle at ${ox} ${oy}, rgba(99,102,241,0.40), transparent 80%)`;
      borderBeamRef.current.style.webkitMaskImage =
        `radial-gradient(250px circle at ${ox} ${oy}, black 0%, transparent 80%)`;
    }

    // Continue loop only while not at rest
    const isResting =
      Math.abs(c.rx - t.rx) < 0.005 &&
      Math.abs(c.ry - t.ry) < 0.005 &&
      Math.abs(c.ox - t.ox) < 0.03 &&
      Math.abs(c.oy - t.oy) < 0.03;
    if (!isResting) {
      tiltRafRef.current = requestAnimationFrame(applyTilt);
    } else {
      tiltRafRef.current = null;
    }
  }, []);

  const startRafLoop = useCallback(() => {
    if (!tiltRafRef.current) {
      tiltRafRef.current = requestAnimationFrame(applyTilt);
    }
  }, [applyTilt]);

  // ── Mouse Enter: Flash → Shockwave → Tracking ──
  const handleCardMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    // Compute entry position for the flash origin
    const rect = card.getBoundingClientRect();
    const entryOx = ((e.clientX - rect.left) / rect.width) * 100;
    const entryOy = ((e.clientY - rect.top) / rect.height) * 100;

    // Snap glow origin to entry point immediately
    tiltCurrentRef.current.ox = entryOx;
    tiltCurrentRef.current.oy = entryOy;
    tiltTargetRef.current.ox = entryOx;
    tiltTargetRef.current.oy = entryOy;

    // Phase 1: Flash — hide ambient, show shockwave
    lightPhaseRef.current = 'flash';

    if (ambientRef.current) {
      ambientRef.current.style.opacity = '0';
      ambientRef.current.style.transition = 'opacity 0.15s ease-out';
    }
    if (shockwaveRef.current) {
      const sw = shockwaveRef.current;
      sw.style.left = `${entryOx}%`;
      sw.style.top = `${entryOy}%`;
      sw.style.opacity = '1';
      sw.style.transform = 'translate(-50%, -50%) scale(0.15)';
      // Force reflow to reset animation
      void sw.offsetWidth;
      sw.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease-out';
      sw.style.transform = 'translate(-50%, -50%) scale(2.8)';
      sw.style.opacity = '0';
    }

    // Phase 2: After shockwave completes → enter tracking mode
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      lightPhaseRef.current = 'tracking';

      if (trackGlowRef.current) {
        trackGlowRef.current.style.opacity = '1';
        trackGlowRef.current.style.transition = 'opacity 0.35s ease-out';
      }
      if (borderBeamRef.current) {
        borderBeamRef.current.style.opacity = '1';
        borderBeamRef.current.style.transition = 'opacity 0.35s ease-out';
      }
    }, 320);

    startRafLoop();
  }, [startRafLoop]);

  // ── Mouse Move: Tilt + track spotlight ──
  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    tiltTargetRef.current = {
      rx: -dy * 8,
      ry: dx * 8,
      ox: ((e.clientX - rect.left) / rect.width) * 100,
      oy: ((e.clientY - rect.top) / rect.height) * 100,
    };
    startRafLoop();
  }, [startRafLoop]);

  // ── Mouse Leave: Decay to idle center ──
  const handleCardMouseLeave = useCallback(() => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    lightPhaseRef.current = 'idle';
    tiltTargetRef.current = { rx: 0, ry: 0, ox: 50, oy: 50 };

    // Fade out tracking layers
    if (trackGlowRef.current) {
      trackGlowRef.current.style.opacity = '0';
      trackGlowRef.current.style.transition = 'opacity 0.6s ease-out';
    }
    if (borderBeamRef.current) {
      borderBeamRef.current.style.opacity = '0';
      borderBeamRef.current.style.transition = 'opacity 0.6s ease-out';
    }
    if (shockwaveRef.current) {
      shockwaveRef.current.style.opacity = '0';
    }

    // Fade ambient back in after glow fades
    setTimeout(() => {
      if (lightPhaseRef.current === 'idle' && ambientRef.current) {
        ambientRef.current.style.opacity = '1';
        ambientRef.current.style.transition = 'opacity 0.8s ease-in';
      }
    }, 350);

    startRafLoop();
  }, [startRafLoop]);

  // Cleanup tilt RAF + timers on unmount
  useEffect(() => {
    return () => {
      if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // ── 3. High-Performance WebP Frame-Sequence Scrubbing Engine ────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Cache of pre-decoded WebP frame images (45 frames, ~1.2 MB total payload)
    const frameImages: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);
    const loadedFlags: boolean[] = new Array(TOTAL_FRAMES).fill(false);

    let targetFrame = 0;
    let currentFrame = 0;
    let rafId: number;

    // Cover Aspect-Ratio Helper (mimics object-fit: cover with zero distortion)
    const drawFrameCover = (drawable: HTMLImageElement) => {
      if (!canvas || !ctx) return;
      const cWidth = canvas.width;
      const cHeight = canvas.height;
      const sWidth = drawable.naturalWidth || drawable.width;
      const sHeight = drawable.naturalHeight || drawable.height;

      if (!sWidth || !sHeight || cWidth === 0 || cHeight === 0) return;

      const canvasRatio = cWidth / cHeight;
      const sourceRatio = sWidth / sHeight;

      let renderWidth = sWidth;
      let renderHeight = sHeight;
      let sx = 0;
      let sy = 0;

      if (sourceRatio > canvasRatio) {
        renderWidth = sHeight * canvasRatio;
        sx = (sWidth - renderWidth) / 2;
      } else {
        renderHeight = sWidth / canvasRatio;
        sy = (sHeight - renderHeight) / 2;
      }

      ctx.drawImage(drawable, sx, sy, renderWidth, renderHeight, 0, 0, cWidth, cHeight);
    };

    // Canvas DPR & Sizing Adjuster
    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || window.innerWidth;
      const displayHeight = rect.height || window.innerHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }
      handleScroll();
    };

    // 0ms Instant Frame 0 Rendering: Load frame_00.webp (with hero-poster.webp fallback) immediately
    let initialPoster: HTMLImageElement | null = new Image();
    initialPoster.onload = () => {
      if (initialPoster) {
        frameImages[0] = initialPoster;
        loadedFlags[0] = true;
        setIsEngineReady(true);
        drawFrameCover(initialPoster);
      }
    };
    initialPoster.onerror = () => {
      if (initialPoster && initialPoster.src.includes('frame_00')) {
        initialPoster.src = '/hero-poster.webp';
      }
    };
    initialPoster.src = '/hero-frames/frame_00.webp';
    if (initialPoster.complete && initialPoster.naturalWidth > 0) {
      frameImages[0] = initialPoster;
      loadedFlags[0] = true;
      setIsEngineReady(true);
      drawFrameCover(initialPoster);
    }

    // Asynchronously preload all remaining WebP frames in the background
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(2, '0');
      img.src = `/hero-frames/frame_${frameNum}.webp`;
      img.onload = () => {
        frameImages[i] = img;
        loadedFlags[i] = true;
      };
    }

    // Precision Keyframe Mapping Confined Strictly to Section 1
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroEl = heroRef.current;
      if (!heroEl) return;

      // The exact scroll distance to traverse Section 1 (Hero)
      const scrollRange = Math.max(heroEl.offsetHeight - window.innerHeight, 450);

      // Progress scales smoothly from 0.0 at top of Section 1 to 1.0 at bottom of Section 1
      const normalizedProgress = Math.min(Math.max(scrollY / scrollRange, 0), 1.0);

      // Moving forward on scroll down, backward on scroll up
      if (normalizedProgress >= 0.995) {
        targetFrame = TOTAL_FRAMES - 1;
      } else {
        targetFrame = normalizedProgress * (TOTAL_FRAMES - 1);
      }
    };

    // 60-120 FPS High-Precision Fluid Interpolation Loop
    const renderLoop = () => {
      // Smooth floating-point spring interpolation prevents jumping over chunks of frames
      currentFrame = lerp(currentFrame, targetFrame, 0.20);

      // Snap tightly when near the extremes
      if (targetFrame === TOTAL_FRAMES - 1 && currentFrame >= TOTAL_FRAMES - 1.2) {
        currentFrame = TOTAL_FRAMES - 1;
      } else if (targetFrame === 0 && currentFrame <= 0.2) {
        currentFrame = 0;
      }

      const frameIndex = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);

      // Find exact or closest available frame image
      let imgToDraw = loadedFlags[frameIndex] ? frameImages[frameIndex] : null;
      if (!imgToDraw) {
        for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
          if (frameIndex - offset >= 0 && loadedFlags[frameIndex - offset] && frameImages[frameIndex - offset]) {
            imgToDraw = frameImages[frameIndex - offset];
            break;
          }
          if (frameIndex + offset < TOTAL_FRAMES && loadedFlags[frameIndex + offset] && frameImages[frameIndex + offset]) {
            imgToDraw = frameImages[frameIndex + offset];
            break;
          }
        }
      }

      if (imgToDraw) {
        drawFrameCover(imgToDraw);
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('load', handleResize);

    // Re-run layout calculations after web fonts load to prevent layout shift shortening
    if (document.fonts?.ready) {
      document.fonts.ready.then(handleResize).catch(() => {});
    }

    handleResize();
    rafId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', handleResize);
      cancelAnimationFrame(rafId);
      initialPoster = null;
    };
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative w-full overflow-visible bg-chalk-50 dark:bg-obsidian-950"
    >
      {/* ── Sticky Background Viewport: Locked in Viewport Center across Hero & Vision/Values ── */}
      <div className="sticky top-0 w-full h-screen overflow-hidden pointer-events-none z-0">
        <div className="relative w-full h-full bg-chalk-50 dark:bg-obsidian-950 flex items-center justify-center">
          {/* Hardware-Accelerated 60FPS Canvas Frame Player */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover filter grayscale-[20%] dark:grayscale-[30%] contrast-[1.05] brightness-[0.88] dark:brightness-[0.68] transition-opacity duration-700 ${isEngineReady ? 'opacity-75 dark:opacity-65' : 'opacity-0'
              }`}
          />

          {/* Neutral Site Theme Overlay (Balanced tone: comfortable on eyes, readable text, clear video detail) */}
          <div className="absolute inset-0 bg-gradient-to-b from-chalk-50/60 via-chalk-50/40 to-chalk-50/75 dark:from-obsidian-950/75 dark:via-obsidian-950/55 dark:to-obsidian-950/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-chalk-50/15 to-chalk-50/35 dark:via-obsidian-950/15 dark:to-obsidian-950/50" />

          {/* Architectural Swiss Grid Texture */}
          <div className="absolute inset-0 swiss-grid-pattern opacity-20 dark:opacity-15" />
        </div>
      </div>

      {/* ── Foreground Interactive Content: Scrolls normally over pinned canvas background ── */}
      <div className="relative z-10 -mt-[100vh] w-full pt-24 sm:pt-28 md:pt-28 pb-10 sm:pb-14 md:pb-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          {/* Top Architectural Metadata Strip */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-5 sm:mb-6 font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {nextGatheringState.gathering.dayName} Gathering
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <span className="hidden sm:inline">
                {nextGatheringState.gathering.topBarText}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span>Brgy. Inicbulan, Bauan, Batangas</span>
            </div>
          </motion.div>

          {/* Master Typographic Statement */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-royal-500/10 dark:bg-cobalt-500/20 text-royal-600 dark:text-cobalt-400 font-mono text-xs font-bold uppercase tracking-widest mb-3.5">
              <span>HELLO!, WE ARE</span>
            </div>

            <LineMaskReveal
              as="h1"
              lines={[
                "INICBULAN FUNDAMENTAL BAPTIST",
                "BIBLE CHURCH, INCORPORATED",
              ]}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[0.92] text-slate-900 dark:text-white uppercase text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] dark:drop-shadow-[0_2px_18px_rgba(0,0,0,0.75)]"
              lineClassName="text-slate-900 dark:text-white"
            />

            <p className="mt-4 font-mono text-sm sm:text-base md:text-lg uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
              THE CHURCH WITH AN OPEN BIBLE
            </p>
          </div>

          {/* Grid Split: Philosophy Statement & Countdown Action Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left Column: Statement & CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-7"
            >
              <div className="space-y-3">
                <span className="font-mono text-xs uppercase tracking-widest text-royal-500 dark:text-cobalt-400 font-bold block">
                  Our Purpose
                </span>
                <p className="text-base sm:text-lg lg:text-xl font-normal text-slate-600 dark:text-slate-300 leading-[1.68] tracking-tight max-w-2xl text-pretty">
                  A church that values <strong className="text-slate-900 dark:text-white font-bold">Worship</strong>, grows in <strong className="text-slate-900 dark:text-white font-bold">Fellowship</strong>, engages in <strong className="text-slate-900 dark:text-white font-bold">Evangelism</strong>, equips through <strong className="text-slate-900 dark:text-white font-bold">Discipleship</strong>, trains <strong className="text-slate-900 dark:text-white font-bold">Leaders</strong>, and develops <strong className="text-slate-900 dark:text-white font-bold">Ministries</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <MagneticButton variant="primary" size="lg" onClick={onOpenPrayer}>
                  <span>Prayer Wall</span>
                </MagneticButton>

                <MagneticButton variant="outline" size="lg" onClick={onScrollToSermons}>
                  <span>Listen to Sermons</span>
                  <Volume2 className="w-4 h-4 ml-1" />
                </MagneticButton>
              </div>

              {/* Core Pillar Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                    Location
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                    Inicbulan, Bauan
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                    Foundation
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                    Open Bible Exposition
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                    Community
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                    5 Core Groups
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Next Gathering Countdown Card — 3D Parallax Tilt + Border Glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              {/* Tilt wrapper: pointer events drive 3D tilt + two-stage lighting */}
              <div
                ref={cardRef}
                onMouseEnter={handleCardMouseEnter}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="ambient-card rounded-3xl p-6 sm:p-8 lg:p-9 relative overflow-hidden"
                style={{
                  willChange: 'transform',
                  transformStyle: 'preserve-3d',
                  transition: 'box-shadow 0.35s ease',
                }}
              >
                {/* ── Layer 1: Ambient idle glow (always visible at rest, fades on hover) ── */}
                <div
                  ref={ambientRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.07) 0%, transparent 65%)',
                    opacity: 1,
                    zIndex: 0,
                  }}
                />

                {/* ── Layer 2: Shockwave flash (hidden, triggered on hover enter) ── */}
                <div
                  ref={shockwaveRef}
                  aria-hidden
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    width: '300px',
                    height: '300px',
                    background:
                      'radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)',
                    opacity: 0,
                    transform: 'translate(-50%, -50%) scale(0.15)',
                    zIndex: 0,
                  }}
                />

                {/* ── Layer 3: Cursor-tracking radial fill glow (appears after shockwave) ── */}
                <div
                  ref={trackGlowRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl"
                  style={{
                    background:
                      'radial-gradient(340px circle at 50% 50%, rgba(99,102,241,0.16), rgba(99,102,241,0.04) 50%, transparent 75%)',
                    opacity: 0,
                    zIndex: 0,
                  }}
                />

                {/* ── Layer 4: Border beam spotlight (masked edge glow tracking pointer) ── */}
                <div
                  ref={borderBeamRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-[1px] rounded-3xl"
                  style={{
                    background:
                      'radial-gradient(220px circle at 50% 50%, rgba(99,102,241,0.40), transparent 80%)',
                    WebkitMaskImage:
                      'radial-gradient(250px circle at 50% 50%, black 0%, transparent 80%)',
                    maskImage:
                      'radial-gradient(250px circle at 50% 50%, black 0%, transparent 80%)',
                    boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.12)',
                    opacity: 0,
                    zIndex: 0,
                  }}
                />
                <div className="flex items-center justify-between pb-5 mb-6">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-royal-500 dark:text-cobalt-400 flex items-center justify-center"
                    >
                      <Users className="w-4 h-4" />
                    </motion.div>
                    <span className="font-mono text-xs uppercase font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                      Next Gathering In
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-royal-500/10 dark:bg-cobalt-500/15 border border-royal-500/20 dark:border-cobalt-400/20 text-royal-600 dark:text-cobalt-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{nextGatheringState.calendarDate}</span>
                  </div>
                </div>

                {/* Countdown Grid */}
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3 text-center mb-6 sm:mb-7">
                  {[
                    { value: nextGatheringState.days, label: 'Days', accent: false },
                    { value: nextGatheringState.hours, label: 'Hours', accent: false },
                    { value: nextGatheringState.minutes, label: 'Mins', accent: false },
                    { value: nextGatheringState.seconds, label: 'Secs', accent: true },
                  ].map(({ value, label, accent }) => (
                    <div key={label} className="bg-slate-50/80 dark:bg-obsidian-850 p-3 sm:p-4 rounded-2xl">
                      <span
                        className={`font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold block ${accent ? 'text-royal-500 dark:text-cobalt-400' : 'text-slate-900 dark:text-white'
                          }`}
                      >
                        {String(value).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1 block font-semibold">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dynamic Gathering Schedule Preview */}
                <div className="bg-slate-50/80 dark:bg-obsidian-850 p-4 sm:p-5 rounded-2xl space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-200/60 dark:border-white/5 gap-2">
                    <span className="uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">
                      {nextGatheringState.gathering.dayName} Schedule
                    </span>
                    {nextGatheringState.gathering.location && (
                      <span className="truncate text-right min-w-0 pr-1 sm:pr-0">
                        {nextGatheringState.gathering.location}
                      </span>
                    )}
                  </div>

                  {nextGatheringState.gathering.scheduleItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs gap-2 sm:gap-3 min-w-0">
                      <span
                        className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-bold text-xs whitespace-nowrap shrink-0 ${item.isPrimary
                          ? 'bg-royal-500/10 dark:bg-cobalt-500/20 text-royal-600 dark:text-cobalt-400'
                          : 'bg-slate-200/70 dark:bg-obsidian-800 text-slate-600 dark:text-slate-400 font-medium'
                          }`}
                      >
                        {item.time ? `${item.time} - ` : ''}{item.service}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 text-right truncate min-w-0 pr-1.5 sm:pr-0">
                        {item.location}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Seamless bottom transition into Section 2 (Vision & Values) */}
      <div className="relative w-full h-24 -mt-24 bg-gradient-to-b from-transparent to-chalk-50 dark:to-obsidian-950 pointer-events-none z-20" />
    </div>
  );
};
