import type { PhoneAccentPreset, ThemeMode } from './novayState';

export type MascotEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'wink'
  | 'sleepy'
  | 'focused';

export type MascotState =
  | 'greeting'
  | 'curious'
  | 'playful'
  | 'guiding'
  | 'pondering'
  | 'resting'
  | 'celebrating';

export type MascotZone = 'hero' | 'promise' | 'features' | 'install' | 'faq' | 'ocean';

export interface MascotKeyframe {
  progress: number;
  zone: MascotZone;
  state: MascotState;
  emotion: MascotEmotion;
  xRatio: number;
  yRatio: number;
  sizePx: number;
  ringTiltDeg: number;
  earPerky: number;
}

export interface MascotChoreographyTarget {
  zone: MascotZone;
  state: MascotState;
  emotion: MascotEmotion;
  x: number;
  y: number;
  size: number;
  ringTiltDeg: number;
  earPerky: number;
  isMobile: boolean;
}

export interface EmotionParams {
  opennessL: number;
  opennessR: number;
  /** -1 = sleepy downward arc, 0 = capsule/round, +1 = happy upward crescent */
  arcCurve: number;
  /** >1 widens eye horizontally/vertically for surprise */
  eyeScale: number;
  cheekBlush: number;
  /** -1 = determined/focused brow slant, 0 = neutral, +1 = raised/curious */
  browTilt: number;
  sparkle: number;
  earPerky: number;
}

export interface MascotPalette {
  bodyTop: string;
  bodyBottom: string;
  rim: string;
  eye: string;
  irisGlow: string;
  blush: string;
  hanko: string;
  earOuter: string;
  earInner: string;
}

export interface Spring2DState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface ScalarSpringState {
  value: number;
  velocity: number;
}

export const MASCOT_DESKTOP_KEYFRAMES: readonly MascotKeyframe[] = [
  {
    progress: 0.0,
    zone: 'hero',
    state: 'greeting',
    emotion: 'neutral',
    xRatio: 0.948,
    yRatio: 0.85,
    sizePx: 98,
    ringTiltDeg: -10,
    earPerky: 0.88,
  },
  {
    progress: 0.18,
    zone: 'promise',
    state: 'curious',
    emotion: 'focused',
    xRatio: 0.044,
    yRatio: 0.78,
    sizePx: 80,
    ringTiltDeg: 14,
    earPerky: 0.72,
  },
  {
    progress: 0.34,
    zone: 'features',
    state: 'playful',
    emotion: 'excited',
    xRatio: 0.952,
    yRatio: 0.56,
    sizePx: 86,
    ringTiltDeg: -16,
    earPerky: 0.85,
  },
  {
    progress: 0.5,
    zone: 'features',
    state: 'playful',
    emotion: 'neutral',
    xRatio: 0.044,
    yRatio: 0.62,
    sizePx: 82,
    ringTiltDeg: 12,
    earPerky: 0.9,
  },
  {
    progress: 0.66,
    zone: 'install',
    state: 'guiding',
    emotion: 'focused',
    xRatio: 0.952,
    yRatio: 0.74,
    sizePx: 78,
    ringTiltDeg: -8,
    earPerky: 0.74,
  },
  {
    progress: 0.82,
    zone: 'faq',
    state: 'pondering',
    emotion: 'neutral',
    xRatio: 0.044,
    yRatio: 0.80,
    sizePx: 76,
    ringTiltDeg: 10,
    earPerky: 0.56,
  },
  {
    progress: 1.0,
    zone: 'ocean',
    state: 'resting',
    emotion: 'sleepy',
    xRatio: 0.94,
    yRatio: 0.85,
    sizePx: 90,
    ringTiltDeg: 4,
    earPerky: 0.2,
  },
];

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep01(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

/**
 * Computes safe target coordinates, size, state, and emotion from scroll progress (0..1)
 * and viewport dimensions so the mascot glides across outer gutters without overlapping copy.
 */
export function computeScrollChoreography(
  scrollProgress: number,
  viewportWidth: number,
  viewportHeight: number
): MascotChoreographyTarget {
  const p = clamp01(scrollProgress);
  const vw = Math.max(320, viewportWidth || 1440);
  const vh = Math.max(480, viewportHeight || 900);
  const isMobile = vw < 900;

  // Locate surrounding keyframes
  let prev = MASCOT_DESKTOP_KEYFRAMES[0];
  let next = MASCOT_DESKTOP_KEYFRAMES[MASCOT_DESKTOP_KEYFRAMES.length - 1];

  for (let i = 0; i < MASCOT_DESKTOP_KEYFRAMES.length - 1; i++) {
    const a = MASCOT_DESKTOP_KEYFRAMES[i];
    const b = MASCOT_DESKTOP_KEYFRAMES[i + 1];
    if (p >= a.progress && p <= b.progress) {
      prev = a;
      next = b;
      break;
    }
  }

  const span = Math.max(0.0001, next.progress - prev.progress);
  const localT = smoothstep01((p - prev.progress) / span);
  const active = localT < 0.5 ? prev : next;

  if (isMobile) {
    // Compact screens: stay cleanly tucked in lower-right corner above safe margin
    const mobileSize = Math.round(lerp(54, 46, Math.sin(p * Math.PI) * 0.85));
    const pad = mobileSize * 0.5 + 14;
    const x = vw - pad;
    const y = Math.max(
      pad + 72,
      Math.min(vh - pad - 6, lerp(vh - pad - 8, vh - pad - 24, Math.sin(p * Math.PI)))
    );

    return {
      zone: active.zone,
      state: active.state,
      emotion: active.emotion,
      x,
      y,
      size: mobileSize,
      ringTiltDeg: lerp(prev.ringTiltDeg, next.ringTiltDeg, localT),
      earPerky: lerp(prev.earPerky, next.earPerky, localT),
      isMobile: true,
    };
  }

  // On narrower desktops (< 1320px) without wide side gutters, stay along bottom corners
  const hasWideGutters = vw >= 1320;
  const rawSize = lerp(prev.sizePx, next.sizePx, localT);
  const size = Math.round(hasWideGutters ? rawSize : rawSize * 0.82);
  const half = size * 0.5;
  const safeMarginX = half + 18;
  const safeMarginTop = half + 92;
  const safeMarginBottom = half + 20;

  let rawX = lerp(prev.xRatio, next.xRatio, localT) * vw;
  let rawY = lerp(prev.yRatio, next.yRatio, localT) * vh;

  if (hasWideGutters) {
    // Arc slightly downward when crossing horizontally between left & right gutters
    const crossDist = Math.abs(next.xRatio - prev.xRatio);
    if (crossDist > 0.5) {
      const arcDip = Math.sin(localT * Math.PI) * (vh * 0.14);
      rawY = Math.min(vh - safeMarginBottom, rawY + arcDip);
    }
  } else {
    rawX = lerp(prev.xRatio, next.xRatio, localT) > 0.5 ? vw - safeMarginX : safeMarginX;
    rawY = vh - safeMarginBottom - 6;
  }

  const x = Math.min(vw - safeMarginX, Math.max(safeMarginX, rawX));
  const y = Math.min(vh - safeMarginBottom, Math.max(safeMarginTop, rawY));

  return {
    zone: active.zone,
    state: active.state,
    emotion: active.emotion,
    x,
    y,
    size,
    ringTiltDeg: lerp(prev.ringTiltDeg, next.ringTiltDeg, localT),
    earPerky: lerp(prev.earPerky, next.earPerky, localT),
    isMobile: false,
  };
}

/**
 * Normalizes and smoothly clamps a pointer delta into [-1, 1] gaze coordinates.
 */
export function clampLookVector(
  dxPx: number,
  dyPx: number,
  radiusPx: number
): { x: number; y: number } {
  const safeRadius = Math.max(60, radiusPx);
  const nx = dxPx / safeRadius;
  const ny = dyPx / safeRadius;
  const mag = Math.hypot(nx, ny);
  if (mag <= 1) {
    return { x: nx, y: ny };
  }
  return { x: nx / mag, y: ny / mag };
}

/**
 * Damped spring integrator with sub-stepping for frame-rate-independent smoothness.
 */
export function stepScalarSpring(
  spring: ScalarSpringState,
  target: number,
  stiffness: number,
  damping: number,
  dtSeconds: number
): ScalarSpringState {
  const dt = Math.min(0.05, Math.max(0.001, dtSeconds));
  const subSteps = 2;
  const h = dt / subSteps;

  let value = spring.value;
  let velocity = spring.velocity;

  for (let i = 0; i < subSteps; i++) {
    const force = (target - value) * stiffness;
    const drag = velocity * damping;
    velocity += (force - drag) * h;
    value += velocity * h;
  }

  return { value, velocity };
}

export function stepSpring2D(
  spring: Spring2DState,
  targetX: number,
  targetY: number,
  stiffness: number,
  damping: number,
  dtSeconds: number
): Spring2DState {
  const sx = stepScalarSpring(
    { value: spring.x, velocity: spring.vx },
    targetX,
    stiffness,
    damping,
    dtSeconds
  );
  const sy = stepScalarSpring(
    { value: spring.y, velocity: spring.vy },
    targetY,
    stiffness,
    damping,
    dtSeconds
  );
  return {
    x: sx.value,
    y: sy.value,
    vx: sx.velocity,
    vy: sy.velocity,
  };
}

export function getEmotionParams(emotion: MascotEmotion): EmotionParams {
  switch (emotion) {
    case 'happy':
      return {
        opennessL: 0.92,
        opennessR: 0.92,
        arcCurve: 1.0,
        eyeScale: 1.05,
        cheekBlush: 0.85,
        browTilt: 0.35,
        sparkle: 0.45,
        earPerky: 0.9,
      };
    case 'excited':
      return {
        opennessL: 1.12,
        opennessR: 1.12,
        arcCurve: 0.18,
        eyeScale: 1.24,
        cheekBlush: 1.0,
        browTilt: 0.65,
        sparkle: 1.0,
        earPerky: 1.0,
      };
    case 'surprised':
      return {
        opennessL: 1.22,
        opennessR: 1.22,
        arcCurve: 0.0,
        eyeScale: 1.32,
        cheekBlush: 0.3,
        browTilt: 0.8,
        sparkle: 0.35,
        earPerky: 1.0,
      };
    case 'wink':
      return {
        opennessL: 0.92,
        opennessR: 1.0,
        arcCurve: 0.5, // shader handles asymmetric left happy arc when wink weight > 0
        eyeScale: 1.04,
        cheekBlush: 0.8,
        browTilt: 0.4,
        sparkle: 0.65,
        earPerky: 0.88,
      };
    case 'sleepy':
      return {
        opennessL: 0.34,
        opennessR: 0.34,
        arcCurve: -1.0,
        eyeScale: 0.94,
        cheekBlush: 0.45,
        browTilt: -0.2,
        sparkle: 0.0,
        earPerky: 0.18,
      };
    case 'focused':
      return {
        opennessL: 0.82,
        opennessR: 0.82,
        arcCurve: 0.0,
        eyeScale: 0.96,
        cheekBlush: 0.15,
        browTilt: -0.65,
        sparkle: 0.3,
        earPerky: 0.78,
      };
    case 'neutral':
    default:
      return {
        opennessL: 1.0,
        opennessR: 1.0,
        arcCurve: 0.0,
        eyeScale: 1.0,
        cheekBlush: 0.25,
        browTilt: 0.1,
        sparkle: 0.22,
        earPerky: 0.7,
      };
  }
}

export function blendEmotionParams(
  current: EmotionParams,
  target: EmotionParams,
  factor: number
): EmotionParams {
  const t = clamp01(factor);
  return {
    opennessL: lerp(current.opennessL, target.opennessL, t),
    opennessR: lerp(current.opennessR, target.opennessR, t),
    arcCurve: lerp(current.arcCurve, target.arcCurve, t),
    eyeScale: lerp(current.eyeScale, target.eyeScale, t),
    cheekBlush: lerp(current.cheekBlush, target.cheekBlush, t),
    browTilt: lerp(current.browTilt, target.browTilt, t),
    sparkle: lerp(current.sparkle, target.sparkle, t),
    earPerky: lerp(current.earPerky, target.earPerky, t),
  };
}

/**
 * Resolves theme-reactive colors matching NoVaY's editorial light/dark surfaces
 * and active phone accent preset.
 */
export function resolveMascotPalette(
  theme: ThemeMode,
  accent: PhoneAccentPreset
): MascotPalette {
  const accentColors: Record<PhoneAccentPreset, { rim: string; hanko: string; blush: string }> = {
    noir_crimson: {
      rim: '#FB3758',
      hanko: '#FB3758',
      blush: '#FB3758',
    },
    midnight_slate: {
      rim: '#38BDF8',
      hanko: '#0284C7',
      blush: '#F472B6',
    },
    warm_amber: {
      rim: '#F59E0B',
      hanko: '#D97706',
      blush: '#FB7185',
    },
  };

  const ac = accentColors[accent] ?? accentColors.noir_crimson;

  if (theme === 'dark') {
    return {
      bodyTop: '#F5F3EA',
      bodyBottom: '#DFD9C6',
      rim: ac.rim,
      eye: '#171612',
      irisGlow: accent === 'noir_crimson' ? '#FB3758' : ac.rim,
      blush: ac.blush,
      hanko: ac.hanko,
      earOuter: '#EAE5D4',
      earInner: ac.rim,
    };
  }

  return {
    bodyTop: '#2D2E29',
    bodyBottom: '#191A17',
    rim: accent === 'noir_crimson' ? '#EDCE56' : ac.rim,
    eye: '#F8F7F2',
    irisGlow: accent === 'noir_crimson' ? '#EDCE56' : ac.rim,
    blush: ac.blush,
    hanko: ac.hanko,
    earOuter: '#252623',
    earInner: ac.rim,
  };
}

export function getMascotReactionMessage(emotion: MascotEmotion, zone: MascotZone): string {
  switch (emotion) {
    case 'excited':
      return zone === 'install' ? 'Prêt pour ton premier épisode !' : 'À ton rythme, sans pub.';
    case 'wink':
      return 'VF ou VOSTFR ? Toujours net.';
    case 'happy':
      return 'On continue la série ?';
    case 'surprised':
      return 'Oh ! Tu vas vite !';
    case 'sleepy':
      return 'Mode nuit… bon visionnage.';
    case 'focused':
      return 'Téléchargement hors ligne prêt.';
    case 'neutral':
    default:
      return 'Toujours avec toi.';
  }
}
