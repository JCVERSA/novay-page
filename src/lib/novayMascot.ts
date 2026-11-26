import {
  EmotionParams,
  MascotEmotion,
  MascotPalette,
  MascotState,
  MascotZone,
  ScalarSpringState,
  Spring2DState,
  blendEmotionParams,
  clampLookVector,
  computeScrollChoreography,
  getEmotionParams,
  getMascotReactionMessage,
  resolveMascotPalette,
  stepScalarSpring,
  stepSpring2D,
} from './mascotEngine';
import type { PhoneAccentPreset, ThemeMode } from './novayState';

export interface NovayMascotController {
  setTheme: (theme: ThemeMode, accent: PhoneAccentPreset) => void;
  pulseEmotion: (emotion: MascotEmotion, durationMs?: number, message?: string) => void;
  setVisible: (visible: boolean) => void;
  setChatOpen: (open: boolean, side?: 'left' | 'right', panelHeight?: number) => void;
  destroy: () => void;
}

export interface NovayMascotOptions {
  onToggleChat?: (currentX: number) => void;
}

const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_look;
uniform float u_blink;
uniform float u_openL;
uniform float u_openR;
uniform float u_arcCurve;
uniform float u_wink;
uniform float u_eyeScale;
uniform float u_blush;
uniform float u_browTilt;
uniform float u_sparkle;

uniform vec3 u_bodyTop;
uniform vec3 u_bodyBottom;
uniform vec3 u_rim;
uniform vec3 u_eye;
uniform vec3 u_irisGlow;
uniform vec3 u_blushCol;

vec3 orient(vec3 p, vec2 look) {
  float yaw = look.x * 0.88;
  float pitch = -look.y * 0.72;
  float cy = cos(yaw);
  float sy = sin(yaw);
  float cp = cos(pitch);
  float sp = sin(pitch);
  vec3 q = vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
  return vec3(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy);
}

// Evaluates a single expressive eye on the sphere surface and returns
// vec3(mainEyeMask, irisGlowMask, catchlightMask)
vec3 evalEye(
  vec3 n,
  vec3 e,
  vec3 right,
  vec3 up,
  float openVal,
  float arcVal,
  float eyeScale,
  float browTilt,
  float sparkle,
  float sideSign
) {
  float facing = dot(n, e);
  float vis = smoothstep(0.10, 0.34, facing);
  if (vis <= 0.001) return vec3(0.0);

  float x = dot(n, right) - dot(e, right);
  float y = dot(n, up) - dot(e, up);

  // 1) Capsule / Round Eye SDF
  float blinkClosed = u_blink;
  float effOpen = max(0.08, openVal * (1.0 - blinkClosed * 0.94));
  float halfH = mix(0.010, 0.118 * effOpen * eyeScale, 1.0 - blinkClosed * 0.88);
  float rad = mix(0.056, 0.064, blinkClosed) * mix(1.0, 1.15, max(0.0, eyeScale - 1.0));
  float cy = y - clamp(y, -halfH, halfH);
  float dCap = length(vec2(x * 0.96, cy)) - rad;

  // Determined brow cut when browTilt < 0
  if (browTilt < -0.05) {
    float slant = y - (0.048 + x * sideSign * 0.36 * (-browTilt));
    dCap = max(dCap, slant);
  }
  float capMask = (1.0 - smoothstep(-0.011, 0.011, dCap)) * vis;

  // Anime iris lower tint & catchlight glint inside open capsule eyes
  float irisMask = 0.0;
  float glintMask = 0.0;
  if (effOpen > 0.45 && blinkClosed < 0.35) {
    float dIris = length(vec2(x, y + 0.062 * effOpen)) - (rad * 0.86);
    irisMask = capMask * (1.0 - smoothstep(-0.015, 0.025, dIris)) * 0.42;

    float dGlint1 = length(vec2(x - 0.024, y - 0.048 * effOpen)) - (0.020 + sparkle * 0.008);
    float dGlint2 = length(vec2(x + 0.022, y + 0.032 * effOpen)) - (0.010 + sparkle * 0.004);
    glintMask = capMask * (
      (1.0 - smoothstep(-0.006, 0.006, dGlint1)) +
      (1.0 - smoothstep(-0.006, 0.006, dGlint2)) * (0.45 + sparkle * 0.55)
    );
  }

  // 2) Happy Crescent Arc (^ ^)
  float happyArcR = 0.108 * eyeScale;
  float dHappyRing = abs(length(vec2(x * 0.90, y + 0.058)) - happyArcR) - 0.026;
  float dHappyClip = -y - 0.014;
  float dHappy = max(dHappyRing, dHappyClip);
  float happyMask = (1.0 - smoothstep(-0.011, 0.011, dHappy)) * vis;

  // 3) Sleepy Cozy Arc (v v)
  float sleepyArcR = 0.108;
  float dSleepyRing = abs(length(vec2(x * 0.90, y - 0.058)) - sleepyArcR) - 0.022;
  float dSleepyClip = y - 0.014;
  float dSleepy = max(dSleepyRing, dSleepyClip);
  float sleepyMask = (1.0 - smoothstep(-0.011, 0.011, dSleepy)) * vis;

  float happyWeight = smoothstep(0.15, 0.85, arcVal);
  float sleepyWeight = smoothstep(0.15, 0.85, -arcVal);
  float capWeight = clamp(1.0 - happyWeight - sleepyWeight, 0.0, 1.0);

  float finalEye = capMask * capWeight + happyMask * happyWeight + sleepyMask * sleepyWeight;
  return vec3(
    clamp(finalEye, 0.0, 1.0),
    clamp(irisMask * capWeight, 0.0, 1.0),
    clamp(glintMask * capWeight, 0.0, 1.0)
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  uv.x *= aspect;

  float radius = 0.92;
  vec2 p = uv / radius;
  float r2 = dot(p, p);
  float dist = sqrt(max(r2, 0.0));
  float edge = 1.0 - smoothstep(0.982, 1.012, dist);
  if (edge <= 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float z = sqrt(max(1.0 - r2, 0.0));
  vec3 n = normalize(vec3(p, z));

  vec2 look = u_look;
  float lm = length(look);
  if (lm > 1.0) look /= lm;

  // Editorial silk-matte sphere gradient + warm directional highlight + colored rim
  float shadeGrad = smoothstep(-0.68, 0.84, n.y * 0.68 - n.x * 0.34 + 0.16);
  vec3 body = mix(u_bodyBottom, u_bodyTop, shadeGrad);

  float fresnel = pow(1.0 - max(n.z, 0.0), 2.5);
  float shimmer = 0.88 + 0.12 * sin(u_time * 1.8 + n.x * 2.0);
  body = mix(body, u_rim, clamp(fresnel * 0.34 * shimmer, 0.0, 0.45));

  // Subtle top-left silk sheen
  float spec = pow(max(dot(n, normalize(vec3(-0.38, 0.56, 0.74))), 0.0), 14.0);
  body += vec3(0.08) * spec;

  vec3 right = orient(vec3(1.0, 0.0, 0.0), look);
  vec3 up = orient(vec3(0.0, 1.0, 0.0), look);

  // Soft anime cheek blush projected on sphere face
  if (u_blush > 0.01) {
    vec3 cL = orient(normalize(vec3(-0.48, -0.20, 0.86)), look);
    vec3 cR = orient(normalize(vec3(0.48, -0.20, 0.86)), look);
    float dBL = length(vec2((dot(n, right) - dot(cL, right)) * 0.72, dot(n, up) - dot(cL, up)));
    float dBR = length(vec2((dot(n, right) - dot(cR, right)) * 0.72, dot(n, up) - dot(cR, up)));
    float blushL = smoothstep(0.14, 0.0, dBL) * smoothstep(0.12, 0.45, dot(n, cL));
    float blushR = smoothstep(0.14, 0.0, dBR) * smoothstep(0.12, 0.45, dot(n, cR));
    float blushAmt = clamp((blushL + blushR) * 0.58 * u_blush, 0.0, 0.65);
    body = mix(body, u_blushCol, blushAmt);
  }

  vec3 eL = orient(normalize(vec3(-0.31, 0.06, 1.0)), look);
  vec3 eR = orient(normalize(vec3(0.31, 0.06, 1.0)), look);

  float arcL = mix(u_arcCurve, 1.0, u_wink);
  float arcR = mix(u_arcCurve, 0.0, u_wink * 0.65);

  vec3 resL = evalEye(n, eL, right, up, u_openL, arcL, u_eyeScale, u_browTilt, u_sparkle, -1.0);
  vec3 resR = evalEye(n, eR, right, up, u_openR, arcR, u_eyeScale, u_browTilt, u_sparkle, 1.0);

  float eyeMask = max(resL.x, resR.x);
  float irisGlow = max(resL.y, resR.y);
  float glint = max(resL.z, resR.z);

  vec3 eyeColor = mix(u_eye, u_irisGlow, irisGlow);
  eyeColor = mix(eyeColor, mix(u_rim, vec3(1.0), 0.78), clamp(glint, 0.0, 0.92));

  vec3 col = mix(body, eyeColor, clamp(eyeMask, 0.0, 1.0));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), edge);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const parsed = Number.parseInt(full, 16);
  if (Number.isNaN(parsed)) return [0.15, 0.15, 0.14];
  return [
    ((parsed >> 16) & 255) / 255,
    ((parsed >> 8) & 255) / 255,
    (parsed & 255) / 255,
  ];
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const CLICK_EMOTION_CYCLE: MascotEmotion[] = ['wink', 'happy', 'excited', 'surprised'];
const BASE_STAGE_SIZE = 112;
const IDLE_GLANCE_MS = 2800;

export function mountNovayMascot(
  hostEl: HTMLElement,
  initialTheme: ThemeMode,
  initialAccent: PhoneAccentPreset,
  options: NovayMascotOptions = {}
): NovayMascotController {
  let theme: ThemeMode = initialTheme;
  let accent: PhoneAccentPreset = initialAccent;
  let palette: MascotPalette = resolveMascotPalette(theme, accent);

  hostEl.innerHTML = `
    <div class="mascot-spring-shell" id="mascot-spring-shell">
      <div class="mascot-float-rig" id="mascot-float-rig" aria-hidden="true">
        <svg class="mascot-hanko-ring" viewBox="0 0 256 256" fill="none">
          <path class="mascot-hanko-arc" d="M 155.95 23.68 A 108 108 0 0 1 221.53 182 L 212.87 177 A 98 98 0 0 0 153.36 33.34 Z" />
          <path class="mascot-hanko-arc" d="M 100.05 232.32 A 108 108 0 0 1 34.47 74 L 43.13 79 A 98 98 0 0 0 102.64 222.66 Z" />
          <polygon class="mascot-spark-gem" points="214,44 221,54 214,64 207,54" />
        </svg>

        <svg class="mascot-ears-svg" viewBox="0 0 120 120" fill="none">
          <g class="mascot-ear mascot-ear-left">
            <path class="mascot-ear-outer" d="M 24 44 L 15 10 L 45 26 Z" />
            <path class="mascot-ear-inner" d="M 26 39 L 21 18 L 39 28 Z" />
          </g>
          <g class="mascot-ear mascot-ear-right">
            <path class="mascot-ear-outer" d="M 96 44 L 105 10 L 75 26 Z" />
            <path class="mascot-ear-inner" d="M 94 39 L 99 18 L 81 28 Z" />
          </g>
        </svg>

        <div class="mascot-core-surface">
          <span class="mascot-fallback" id="mascot-fallback">
            <span class="mascot-fb-eye left"></span>
            <span class="mascot-fb-eye right"></span>
          </span>
          <canvas class="mascot-webgl" id="mascot-webgl"></canvas>
        </div>
      </div>
      <button
        type="button"
        class="mascot-core-btn"
        id="mascot-core-btn"
        aria-expanded="false"
        aria-controls="noa-chat-panel"
        aria-label="Ouvrir le chat avec Noa, guide NoVaY"
      ></button>
      <div class="mascot-bubble" id="mascot-bubble" role="status" aria-live="polite" hidden></div>
    </div>
  `;

  const shellEl = hostEl.querySelector<HTMLElement>('#mascot-spring-shell')!;
  const floatRigEl = hostEl.querySelector<HTMLElement>('#mascot-float-rig')!;
  const coreBtn = hostEl.querySelector<HTMLButtonElement>('#mascot-core-btn')!;
  const fallbackEl = hostEl.querySelector<HTMLElement>('#mascot-fallback')!;
  const canvas = hostEl.querySelector<HTMLCanvasElement>('#mascot-webgl')!;
  const bubbleEl = hostEl.querySelector<HTMLElement>('#mascot-bubble')!;

  const syncPaletteCss = () => {
    palette = resolveMascotPalette(theme, accent);
    hostEl.style.setProperty('--mascot-body-top', palette.bodyTop);
    hostEl.style.setProperty('--mascot-body-bottom', palette.bodyBottom);
    hostEl.style.setProperty('--mascot-rim', palette.rim);
    hostEl.style.setProperty('--mascot-eye', palette.eye);
    hostEl.style.setProperty('--mascot-hanko', palette.hanko);
    hostEl.style.setProperty('--mascot-ear-outer', palette.earOuter);
    hostEl.style.setProperty('--mascot-ear-inner', palette.earInner);
    hostEl.style.setProperty('--mascot-blush', palette.blush);
  };
  syncPaletteCss();

  // WebGL initialization
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });

  let vs: WebGLShader | null = null;
  let fs: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let hasGl = false;
  let contextLost = false;

  let uResolution: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uLook: WebGLUniformLocation | null = null;
  let uBlink: WebGLUniformLocation | null = null;
  let uOpenL: WebGLUniformLocation | null = null;
  let uOpenR: WebGLUniformLocation | null = null;
  let uArcCurve: WebGLUniformLocation | null = null;
  let uWink: WebGLUniformLocation | null = null;
  let uEyeScale: WebGLUniformLocation | null = null;
  let uBlush: WebGLUniformLocation | null = null;
  let uBrowTilt: WebGLUniformLocation | null = null;
  let uSparkle: WebGLUniformLocation | null = null;
  let uBodyTop: WebGLUniformLocation | null = null;
  let uBodyBottom: WebGLUniformLocation | null = null;
  let uRim: WebGLUniformLocation | null = null;
  let uEye: WebGLUniformLocation | null = null;
  let uIrisGlow: WebGLUniformLocation | null = null;
  let uBlushCol: WebGLUniformLocation | null = null;

  const initGl = (): boolean => {
    if (!gl) return false;
    vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    if (!prog) return false;
    program = prog;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;

    gl.useProgram(prog);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    uResolution = gl.getUniformLocation(prog, 'u_resolution');
    uTime = gl.getUniformLocation(prog, 'u_time');
    uLook = gl.getUniformLocation(prog, 'u_look');
    uBlink = gl.getUniformLocation(prog, 'u_blink');
    uOpenL = gl.getUniformLocation(prog, 'u_openL');
    uOpenR = gl.getUniformLocation(prog, 'u_openR');
    uArcCurve = gl.getUniformLocation(prog, 'u_arcCurve');
    uWink = gl.getUniformLocation(prog, 'u_wink');
    uEyeScale = gl.getUniformLocation(prog, 'u_eyeScale');
    uBlush = gl.getUniformLocation(prog, 'u_blush');
    uBrowTilt = gl.getUniformLocation(prog, 'u_browTilt');
    uSparkle = gl.getUniformLocation(prog, 'u_sparkle');
    uBodyTop = gl.getUniformLocation(prog, 'u_bodyTop');
    uBodyBottom = gl.getUniformLocation(prog, 'u_bodyBottom');
    uRim = gl.getUniformLocation(prog, 'u_rim');
    uEye = gl.getUniformLocation(prog, 'u_eye');
    uIrisGlow = gl.getUniformLocation(prog, 'u_irisGlow');
    uBlushCol = gl.getUniformLocation(prog, 'u_blushCol');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(BASE_STAGE_SIZE * dpr);
    canvas.height = Math.round(BASE_STAGE_SIZE * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    hasGl = true;
    fallbackEl.hidden = true;
    canvas.style.visibility = '';
    return true;
  };

  if (!initGl()) {
    hasGl = false;
    fallbackEl.hidden = false;
    canvas.style.visibility = 'hidden';
  }

  // Runtime choreography, spring physics & emotion state
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false;
  let visible = false;
  let rafId = 0;
  let lastPerf = performance.now();
  let animClockMs = 0;

  const getScrollProgress = () => {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    return Math.min(1, Math.max(0, (window.scrollY || doc.scrollTop) / max));
  };

  let targetChoreo = computeScrollChoreography(
    getScrollProgress(),
    window.innerWidth,
    window.innerHeight
  );

  let posSpring: Spring2DState = {
    x: targetChoreo.x,
    y: targetChoreo.y,
    vx: 0,
    vy: 0,
  };
  let sizeSpring: ScalarSpringState = { value: targetChoreo.size, velocity: 0 };
  let popSpring: ScalarSpringState = { value: 1, velocity: 0 };
  let ringSpring: ScalarSpringState = { value: targetChoreo.ringTiltDeg, velocity: 0 };

  let currentZone: MascotZone = targetChoreo.zone;
  let currentState: MascotState = targetChoreo.state;
  let baseEmotion: MascotEmotion = targetChoreo.emotion;
  let overrideEmotion: MascotEmotion | null = null;
  let overrideUntilMs = 0;
  let clickIndex = 0;
  let bubbleTimer: number | null = null;

  let currentParams: EmotionParams = getEmotionParams(baseEmotion);
  let winkWeight = baseEmotion === 'wink' ? 1 : 0;
  let floatAmp = 1;
  let lastZone: MascotZone = currentZone;
  let chatOpen = false;
  let chatSide: 'left' | 'right' = 'right';
  let chatPanelHeight = 460;

  const computeChatPerchTarget = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 640) {
      return {
        x: Math.max(46, vw - 52),
        y: Math.max(88, vh - 14 - chatPanelHeight - 34),
        size: 54,
        ringTiltDeg: 8,
      };
    }
    const x = chatSide === 'left' ? 76 : vw - 76;
    const y = Math.max(106, vh - 22 - chatPanelHeight - 40);
    return {
      x,
      y,
      size: vw < 768 ? 64 : 76,
      ringTiltDeg: chatSide === 'left' ? -10 : 10,
    };
  };

  // Gaze & blink state
  const look = { x: 0, y: 0.08 };
  const targetLook = { x: 0, y: 0.08 };
  const glance = { x: 0, y: 0.08 };
  let pointerClient = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 };
  let pointerAt = -Infinity;
  let nextGlanceMs = 900;
  let nextBlinkMs = 1900 + Math.random() * 2000;
  let blinkAtMs = -10_000;
  let hovered = false;

  // Scroll velocity feedback
  let lastScrollY = window.scrollY || 0;
  let lastScrollTime = performance.now();
  let scrollVelocity = 0;

  const updateLookFromPointer = () => {
    const dx = pointerClient.x - posSpring.x;
    const dy = posSpring.y - pointerClient.y;
    const trackRadius = Math.max(200, Math.min(window.innerWidth, window.innerHeight) * 0.42);
    const clamped = clampLookVector(dx, dy, trackRadius);
    targetLook.x = clamped.x;
    targetLook.y = clamped.y;
  };

  const showBubble = (text: string, ms = 2400) => {
    if (bubbleTimer !== null) {
      window.clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    bubbleEl.textContent = text;
    bubbleEl.hidden = false;
    bubbleEl.dataset.side = posSpring.x > window.innerWidth * 0.5 ? 'left' : 'right';
    requestAnimationFrame(() => bubbleEl.classList.add('is-visible'));
    bubbleTimer = window.setTimeout(() => {
      bubbleEl.classList.remove('is-visible');
      bubbleTimer = window.setTimeout(() => {
        bubbleEl.hidden = true;
      }, 220);
    }, ms);
  };

  const syncDomAttributes = (activeEmotion: MascotEmotion) => {
    hostEl.dataset.zone = currentZone;
    hostEl.dataset.state = currentState;
    hostEl.dataset.emotion = activeEmotion;
    hostEl.classList.toggle('is-excited', activeEmotion === 'excited' || activeEmotion === 'happy');
    hostEl.classList.toggle('is-sleepy', activeEmotion === 'sleepy');
  };

  const onPointerMove = (e: PointerEvent) => {
    pointerClient = { x: e.clientX, y: e.clientY };
    pointerAt = performance.now();
    updateLookFromPointer();
  };

  const onScroll = () => {
    const now = performance.now();
    const sy = window.scrollY || document.documentElement.scrollTop;
    const dt = Math.max(8, now - lastScrollTime);
    const rawVel = ((sy - lastScrollY) / dt) * 16; // px per 16ms frame
    scrollVelocity = scrollVelocity * 0.55 + Math.max(-36, Math.min(36, rawVel)) * 0.45;
    lastScrollY = sy;
    lastScrollTime = now;

    // Fast flick scrolling triggers brief wide-eyed surprise if not overridden by click
    if (Math.abs(rawVel) > 28 && !overrideEmotion) {
      overrideEmotion = 'surprised';
      overrideUntilMs = now + 520;
    }

    targetChoreo = computeScrollChoreography(
      getScrollProgress(),
      window.innerWidth,
      window.innerHeight
    );
    const prevZone = lastZone;
    currentZone = targetChoreo.zone;
    currentState = targetChoreo.state;
    baseEmotion = targetChoreo.emotion;
    if (currentZone !== prevZone) {
      lastZone = currentZone;
      if (currentZone === 'features') {
        overrideEmotion = 'wink';
        overrideUntilMs = now + 950;
      } else if (currentZone === 'install') {
        overrideEmotion = 'excited';
        overrideUntilMs = now + 950;
      }
    }
  };

  const onResize = () => {
    targetChoreo = computeScrollChoreography(
      getScrollProgress(),
      window.innerWidth,
      window.innerHeight
    );
    const maxSafeX = Math.max(46, window.innerWidth - 46);
    if (posSpring.x > maxSafeX) {
      posSpring.x = maxSafeX;
      posSpring.vx = 0;
    }
    if (hasGl && gl && !contextLost) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(BASE_STAGE_SIZE * dpr);
      if (canvas.width !== w) {
        canvas.width = w;
        canvas.height = w;
        gl.viewport(0, 0, w, w);
      }
    }
  };

  const onCoreEnter = () => {
    hovered = true;
    popSpring.velocity += 2.2;
  };

  const onCoreLeave = () => {
    hovered = false;
  };

  const onCoreClick = () => {
    popSpring.velocity += 4.6;
    if (options.onToggleChat) {
      options.onToggleChat(posSpring.x);
      return;
    }
    const nextEmotion = CLICK_EMOTION_CYCLE[clickIndex % CLICK_EMOTION_CYCLE.length]!;
    clickIndex += 1;
    overrideEmotion = nextEmotion;
    overrideUntilMs = performance.now() + 2500;
    showBubble(getMascotReactionMessage(nextEmotion, currentZone), 2400);
    syncDomAttributes(nextEmotion);
  };

  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    hasGl = false;
    canvas.style.visibility = 'hidden';
    fallbackEl.hidden = false;
  };

  const onContextRestored = () => {
    contextLost = false;
    initGl();
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  coreBtn.addEventListener('pointerenter', onCoreEnter);
  coreBtn.addEventListener('pointerleave', onCoreLeave);
  coreBtn.addEventListener('click', onCoreClick);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  const renderFrame = (now: number) => {
    if (destroyed) return;
    rafId = requestAnimationFrame(renderFrame);

    const dtMs = Math.min(50, Math.max(1, now - lastPerf));
    const dtSec = dtMs / 1000;
    lastPerf = now;

    if (document.visibilityState === 'hidden') return;

    const reduced = mqReduce.matches;
    if (!reduced) {
      animClockMs += dtMs;
    }

    // Decay scroll velocity smoothly
    scrollVelocity *= Math.pow(0.86, dtMs / 16.67);

    // Clear expired temporary emotion override
    if (overrideEmotion && now > overrideUntilMs) {
      overrideEmotion = null;
    }

    const activeEmotion: MascotEmotion = overrideEmotion
      ? overrideEmotion
      : hovered && baseEmotion !== 'excited'
      ? 'happy'
      : baseEmotion;

    syncDomAttributes(activeEmotion);

    const effectiveTarget = chatOpen ? computeChatPerchTarget() : targetChoreo;

    // Update choreography spring physics
    if (reduced) {
      posSpring = { x: effectiveTarget.x, y: effectiveTarget.y, vx: 0, vy: 0 };
      sizeSpring = { value: effectiveTarget.size, velocity: 0 };
      popSpring = { value: 1, velocity: 0 };
      ringSpring = { value: effectiveTarget.ringTiltDeg, velocity: 0 };
    } else {
      posSpring = stepSpring2D(posSpring, effectiveTarget.x, effectiveTarget.y, 85, 13.5, dtSec);
      sizeSpring = stepScalarSpring(sizeSpring, effectiveTarget.size, 95, 14, dtSec);
      const popTarget = hovered ? 1.07 : 1.0;
      popSpring = stepScalarSpring(popSpring, popTarget, 220, 14, dtSec);
      ringSpring = stepScalarSpring(
        ringSpring,
        effectiveTarget.ringTiltDeg + scrollVelocity * 0.65,
        90,
        12,
        dtSec
      );
    }

    // Smoothly track pointer when active; otherwise autonomous ambient glancing
    const steering = now - pointerAt < IDLE_GLANCE_MS;
    if (steering) {
      updateLookFromPointer();
    } else if (!reduced && animClockMs >= nextGlanceMs) {
      const centerChance = Math.random() < 0.34;
      glance.x = centerChance ? 0 : (Math.random() * 2 - 1) * 0.72;
      glance.y = centerChance ? 0.08 : (Math.random() * 2 - 1) * 0.42;
      nextGlanceMs = animClockMs + 1100 + Math.random() * 2200;
    }

    const lookGoal = reduced ? { x: 0, y: 0.08 } : steering ? targetLook : glance;
    const lookEase = reduced ? 1 : Math.min(1, dtSec * (steering ? 10 : 5.5));
    look.x += (lookGoal.x - look.x) * lookEase;
    look.y += (lookGoal.y - look.y) * lookEase;

    // Blink scheduler (less frequent when already happy/sleepy crescent arcs)
    if (!reduced && animClockMs >= nextBlinkMs) {
      blinkAtMs = animClockMs;
      nextBlinkMs = animClockMs + 2400 + Math.random() * 3400;
    }
    const bt = (animClockMs - blinkAtMs) / 1000;
    let blink = 0;
    if (!reduced && activeEmotion !== 'sleepy' && activeEmotion !== 'happy') {
      if (bt >= 0 && bt < 0.055) blink = bt / 0.055;
      else if (bt >= 0.055 && bt < 0.1) blink = 1;
      else if (bt >= 0.1 && bt < 0.18) blink = 1 - (bt - 0.1) / 0.08;
    }

    // Smoothly interpolate emotion shader parameters
    const targetParams = getEmotionParams(activeEmotion);
    const paramEase = reduced ? 1 : Math.min(1, dtSec * 8.5);
    currentParams = blendEmotionParams(currentParams, targetParams, paramEase);

    const targetWink = activeEmotion === 'wink' ? 1 : 0;
    winkWeight += (targetWink - winkWeight) * (reduced ? 1 : Math.min(1, dtSec * 10));

    // Levitation & organic squash/tilt (damps smoothly on hover so clicking feels steady)
    const timeSec = animClockMs / 1000;
    const targetFloatAmp = hovered ? 0.06 : 1;
    floatAmp += (targetFloatAmp - floatAmp) * (reduced ? 1 : Math.min(1, dtSec * 12));
    const floatY = reduced ? 0 : Math.sin(timeSec * 1.65) * 6.0 * floatAmp;
    const floatX = reduced ? 0 : Math.cos(timeSec * 1.05) * 2.8 * floatAmp;
    const breathe = reduced ? 1 : 1 + Math.sin(timeSec * 2.1) * 0.016 * floatAmp;

    const velStretch = reduced ? 0 : Math.max(-0.08, Math.min(0.08, scrollVelocity * 0.0022));
    const scaleBase = (sizeSpring.value / BASE_STAGE_SIZE) * popSpring.value;
    const sx = scaleBase * breathe * (1 - velStretch * 0.55);
    const sy = scaleBase * breathe * (1 + velStretch);
    const tiltDeg = reduced
      ? 0
      : Math.max(-14, Math.min(14, posSpring.vx * 0.015 + look.x * 4.5 + Math.sin(timeSec * 1.1) * 2.2));

    // Apply GPU-only transforms (keep spring shell stationary when settled so hit target never drifts)
    const hitScale = sizeSpring.value / BASE_STAGE_SIZE;
    shellEl.style.transform = `translate3d(${posSpring.x.toFixed(2)}px, ${posSpring.y.toFixed(2)}px, 0)`;
    coreBtn.style.transform = `translate(-50%, -50%) scale(${hitScale.toFixed(4)})`;
    floatRigEl.style.transform = `translate(-50%, -50%) translate3d(${floatX.toFixed(2)}px, ${floatY.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) rotate(${tiltDeg.toFixed(2)}deg)`;

    // Update auxiliary CSS variables for Hanko ring & dynamic Kitsune ears
    hostEl.style.setProperty('--mascot-ring-rot', `${(ringSpring.value + timeSec * 10).toFixed(2)}deg`);
    hostEl.style.setProperty('--mascot-ear-perky', currentParams.earPerky.toFixed(3));
    hostEl.style.setProperty('--mascot-ear-tilt', `${(look.x * 6).toFixed(2)}deg`);

    // Keep speech bubble facing inward if currently visible
    if (!bubbleEl.hidden) {
      bubbleEl.dataset.side = posSpring.x > window.innerWidth * 0.5 ? 'left' : 'right';
    }

    // Update SVG fallback face if WebGL unavailable
    if (!hasGl || contextLost || !gl) {
      const fbEyes = fallbackEl.querySelectorAll<HTMLElement>('.mascot-fb-eye');
      fbEyes.forEach((eyeEl, idx) => {
        const isLeft = idx === 0;
        const openScale = isLeft ? currentParams.opennessL : currentParams.opennessR;
        const arc = currentParams.arcCurve;
        const eyeY = arc > 0.5 || (winkWeight > 0.5 && isLeft) ? 0.28 : 1 - blink * 0.85;
        eyeEl.style.transform = `translate(${(look.x * 6).toFixed(1)}px, ${(-look.y * 5).toFixed(1)}px) scaleY(${(openScale * eyeY).toFixed(2)})`;
      });
      return;
    }

    const cTop = hexToRgb(palette.bodyTop);
    const cBot = hexToRgb(palette.bodyBottom);
    const cRim = hexToRgb(palette.rim);
    const cEye = hexToRgb(palette.eye);
    const cIris = hexToRgb(palette.irisGlow);
    const cBlush = hexToRgb(palette.blush);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeSec);
    gl.uniform2f(uLook, look.x, look.y);
    gl.uniform1f(uBlink, blink);
    gl.uniform1f(uOpenL, currentParams.opennessL);
    gl.uniform1f(uOpenR, currentParams.opennessR);
    gl.uniform1f(uArcCurve, currentParams.arcCurve);
    gl.uniform1f(uWink, winkWeight);
    gl.uniform1f(uEyeScale, currentParams.eyeScale);
    gl.uniform1f(uBlush, currentParams.cheekBlush);
    gl.uniform1f(uBrowTilt, currentParams.browTilt);
    gl.uniform1f(uSparkle, currentParams.sparkle);

    gl.uniform3f(uBodyTop, cTop[0], cTop[1], cTop[2]);
    gl.uniform3f(uBodyBottom, cBot[0], cBot[1], cBot[2]);
    gl.uniform3f(uRim, cRim[0], cRim[1], cRim[2]);
    gl.uniform3f(uEye, cEye[0], cEye[1], cEye[2]);
    gl.uniform3f(uIrisGlow, cIris[0], cIris[1], cIris[2]);
    gl.uniform3f(uBlushCol, cBlush[0], cBlush[1], cBlush[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  rafId = requestAnimationFrame(renderFrame);

  return {
    setTheme(nextTheme, nextAccent) {
      theme = nextTheme;
      accent = nextAccent;
      syncPaletteCss();
    },
    pulseEmotion(emotion, durationMs = 2000, message) {
      overrideEmotion = emotion;
      overrideUntilMs = performance.now() + durationMs;
      popSpring.velocity += 3.2;
      syncDomAttributes(emotion);
      if (message && !chatOpen) {
        showBubble(message, Math.min(2400, durationMs));
      }
    },
    setChatOpen(open, side = chatSide, panelHeight = chatPanelHeight) {
      chatOpen = open;
      chatSide = side;
      if (panelHeight > 0) {
        chatPanelHeight = panelHeight;
      }
      hostEl.dataset.chatOpen = open ? 'true' : 'false';
      coreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      coreBtn.setAttribute(
        'aria-label',
        open ? 'Fermer le chat avec Noa' : 'Ouvrir le chat avec Noa, guide NoVaY'
      );
      if (open) {
        if (bubbleTimer !== null) {
          window.clearTimeout(bubbleTimer);
          bubbleTimer = null;
        }
        bubbleEl.classList.remove('is-visible');
        bubbleEl.hidden = true;
      }
    },
    setVisible(nextVisible) {
      if (visible === nextVisible) return;
      visible = nextVisible;
      hostEl.classList.toggle('is-ready', nextVisible);
      if (nextVisible) {
        popSpring.value = 0.72;
        popSpring.velocity = 4.2;
        if (!mqReduce.matches) {
          overrideEmotion = 'happy';
          overrideUntilMs = performance.now() + 1450;
        }
      }
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (bubbleTimer !== null) window.clearTimeout(bubbleTimer);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      coreBtn.removeEventListener('pointerenter', onCoreEnter);
      coreBtn.removeEventListener('pointerleave', onCoreLeave);
      coreBtn.removeEventListener('click', onCoreClick);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);

      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buffer);
      }
      hostEl.innerHTML = '';
    },
  };
}
