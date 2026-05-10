"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface SeamlessVideoProps {
  src: string;
  className?: string;
  style?: CSSProperties;
  /** How many seconds before the end of the current video the crossfade starts. */
  fadeAheadSeconds?: number;
  /** Crossfade duration in ms. */
  fadeDurationMs?: number;
}

/**
 * Loops a video without the native end-of-stream "jump". Two stacked
 * `<video>` elements are crossfaded near the end of the active one — the
 * inactive element is rewound to 0 just before it becomes visible, so the
 * loop seam happens during a soft opacity transition, not in a single
 * paused frame.
 *
 * Both elements share the same `src`, are muted and `playsinline`. Total
 * bandwidth is roughly 2× single video, but since hero videos are short
 * loops this is fine and the video file is shared in the HTTP cache after
 * the first request.
 */
export function SeamlessVideo({
  src,
  className,
  style,
  fadeAheadSeconds = 0.9,
  fadeDurationMs = 800,
}: SeamlessVideoProps) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    let activeIsA = true;
    let crossfading = false;
    let raf = 0;

    a.style.opacity = "1";
    b.style.opacity = "0";
    a.style.transition = `opacity ${fadeDurationMs}ms linear`;
    b.style.transition = `opacity ${fadeDurationMs}ms linear`;

    const tryPlay = (v: HTMLVideoElement) => {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    };
    tryPlay(a);

    const tick = () => {
      const active = activeIsA ? a : b;
      const inactive = activeIsA ? b : a;
      const dur = active.duration;
      const cur = active.currentTime;

      if (
        !crossfading &&
        Number.isFinite(dur) &&
        dur > fadeAheadSeconds + 0.2 &&
        dur - cur < fadeAheadSeconds
      ) {
        crossfading = true;
        try {
          inactive.currentTime = 0;
        } catch {
          // ignore — some browsers throw if not yet seekable; fall through
        }
        tryPlay(inactive);
        active.style.opacity = "0";
        inactive.style.opacity = "1";
        window.setTimeout(() => {
          activeIsA = !activeIsA;
          crossfading = false;
        }, fadeDurationMs);
      }

      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [src, fadeAheadSeconds, fadeDurationMs]);

  const sharedProps = {
    src,
    muted: true,
    playsInline: true,
    preload: "auto" as const,
    "aria-hidden": true,
  };

  return (
    <>
      <video
        ref={aRef}
        {...sharedProps}
        className={className}
        style={style}
      />
      <video
        ref={bRef}
        {...sharedProps}
        className={className}
        style={{ ...style, opacity: 0 }}
      />
    </>
  );
}
