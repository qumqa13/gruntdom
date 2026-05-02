"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Motion primitives for Gruntdom.
 *
 * Discrete, slow, paper-like — never bouncy, never spring-y. We trust
 * users to read; the page should feel like turning pages of a magazine,
 * not a SaaS marketing site.
 *
 * All effects respect `prefers-reduced-motion` via the global CSS guard
 * in globals.css (which forces transition/animation durations to ~0ms).
 */

const ATELIER_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  /** Vertical offset on entry, in px. Default 12. */
  y?: number;
  /** Animation duration in seconds. Default 0.6. */
  duration?: number;
  /** Tailwind className applied to the wrapper div. */
  className?: string;
  /** Margin around the viewport for the trigger. Default "-10% 0px". */
  margin?: string;
  as?: "div" | "section" | "article" | "li" | "header";
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Fades + slides children into view once, when 10% of the element is visible.
 * Use sparingly — wrap section roots, not every card. Cards animate via
 * <RevealStagger> below.
 */
export function Reveal({
  children,
  delay = 0,
  y = 12,
  duration = 0.6,
  className,
  margin = "-10% 0px -10% 0px",
  as = "div",
}: RevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: margin as never });
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, delay, ease: ATELIER_EASE }}
      className={className}
      variants={revealVariants}
    >
      {children}
    </Tag>
  );
}

/**
 * Reveals a list of children with a small staggered delay between them.
 * Wrap a grid of cards in this and the cards will fade in left-to-right.
 */
export function RevealStagger({
  children,
  className,
  staggerSeconds = 0.07,
}: {
  children: ReactNode;
  className?: string;
  staggerSeconds?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-10% 0px -10% 0px" as never,
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerSeconds },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Single child meant to live inside <RevealStagger>. Picks up the stagger
 * timing from the parent.
 */
export function RevealStaggerItem({
  children,
  className,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: ATELIER_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Lightweight hover lift. Use as a wrapper around a card to add a subtle
 * translate-up + shadow on hover, with smooth atelier easing.
 *
 * Implementation note: we use motion.div with whileHover so reduced-motion
 * users still see the shadow change (instant) without the translate.
 */
export function HoverLift({
  children,
  className,
  liftPx = 4,
}: {
  children: ReactNode;
  className?: string;
  liftPx?: number;
}) {
  return (
    <motion.div
      whileHover={{ y: -liftPx }}
      transition={{ duration: 0.25, ease: ATELIER_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
