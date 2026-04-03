export const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const MOTION_DURATION = {
  base: 0.24,
  slow: 0.32,
} as const;

export const pageEnterMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
} as const;

export const cardEnterMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
} as const;

export const expandMotion = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
} as const;
