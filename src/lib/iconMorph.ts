export interface MorphPoint {
  x: number;
  y: number;
}

const STROKE_POINTS = 28;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
}

function resamplePoints(pts: MorphPoint[], count: number = STROKE_POINTS): MorphPoint[] {
  if (pts.length === 0) {
    return Array.from({ length: count }, () => ({ x: 32, y: 32 }));
  }
  if (pts.length === 1) {
    return Array.from({ length: count }, () => ({ ...pts[0] }));
  }

  const distances: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
    distances.push(total);
  }

  if (total < 1e-4) {
    return Array.from({ length: count }, () => ({ ...pts[0] }));
  }

  const out: MorphPoint[] = [];
  let seg = 0;
  for (let i = 0; i < count; i++) {
    const targetDist = (i / (count - 1)) * total;
    while (seg < distances.length - 2 && distances[seg + 1] < targetDist) {
      seg++;
    }
    const d0 = distances[seg];
    const d1 = distances[seg + 1];
    const span = d1 - d0;
    const localT = span > 1e-6 ? (targetDist - d0) / span : 0;
    out.push({
      x: lerp(pts[seg].x, pts[seg + 1].x, localT),
      y: lerp(pts[seg].y, pts[seg + 1].y, localT),
    });
  }
  return out;
}

function ptsToPath(pts: MorphPoint[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  return d;
}

function interpPathData(a: MorphPoint[], b: MorphPoint[], t: number): string {
  const len = Math.min(a.length, b.length);
  if (len === 0) return '';
  let d = `M ${lerp(a[0].x, b[0].x, t).toFixed(2)} ${lerp(a[0].y, b[0].y, t).toFixed(2)}`;
  for (let i = 1; i < len; i++) {
    d += ` L ${lerp(a[i].x, b[i].x, t).toFixed(2)} ${lerp(a[i].y, b[i].y, t).toFixed(2)}`;
  }
  return d;
}

// Primitive builders (all resampled to uniform 28-point strokes for seamless morphing)
function poly(coords: [number, number][], closed: boolean = false): MorphPoint[] {
  const pts = coords.map(([x, y]) => ({ x, y }));
  if (closed && pts.length > 0) {
    pts.push({ ...pts[0] });
  }
  return resamplePoints(pts);
}

function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): MorphPoint[] {
  const cr = Math.min(r, w / 2, h / 2);
  const pts: MorphPoint[] = [];
  const pushArc = (cx: number, cy: number, startDeg: number, endDeg: number) => {
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const a = ((startDeg + ((endDeg - startDeg) * i) / steps) * Math.PI) / 180;
      pts.push({ x: cx + cr * Math.cos(a), y: cy + cr * Math.sin(a) });
    }
  };
  pts.push({ x: x + cr, y });
  pts.push({ x: x + w - cr, y });
  pushArc(x + w - cr, y + cr, -90, 0);
  pts.push({ x: x + w, y: y + h - cr });
  pushArc(x + w - cr, y + h - cr, 0, 90);
  pts.push({ x: x + cr, y: y + h });
  pushArc(x + cr, y + h - cr, 90, 180);
  pts.push({ x, y: y + cr });
  pushArc(x + cr, y + cr, 180, 270);
  return resamplePoints(pts);
}

function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startDeg: number,
  endDeg: number
): MorphPoint[] {
  const steps = 28;
  const pts: MorphPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((startDeg + ((endDeg - startDeg) * i) / steps) * Math.PI) / 180;
    pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return resamplePoints(pts);
}

function circle(cx: number, cy: number, r: number): MorphPoint[] {
  return arc(cx, cy, r, r, -90, 270);
}

function heart(cx: number, cy: number, scale: number = 1): MorphPoint[] {
  const pts: MorphPoint[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    );
    pts.push({ x: cx + hx * scale, y: cy + hy * scale });
  }
  return resamplePoints(pts);
}

function star(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number = 5
): MorphPoint[] {
  const pts: MorphPoint[] = [];
  const total = points * 2;
  for (let i = 0; i <= total; i++) {
    const a = (-90 + (i * 360) / total) * (Math.PI / 180);
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return resamplePoints(pts);
}

function lemniscate(cx: number, cy: number, rx: number, ry: number): MorphPoint[] {
  const pts: MorphPoint[] = [];
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x = (rx * Math.cos(t)) / denom;
    const y = (ry * Math.sin(t) * Math.cos(t)) / denom;
    pts.push({ x: cx + x, y: cy + y });
  }
  return resamplePoints(pts);
}

type IconBrand = [MorphPoint[], MorphPoint[], MorphPoint[], MorphPoint[], MorphPoint[]];

// Feature 0 (VF & VOSTFR): 25 Original Morphing Brand Icons
export const FEATURE_0_BRANDS: IconBrand[] = [
  // 1. Anime Dialogue Bubble + Subtitle Frame
  [
    poly(
      [
        [11, 18],
        [16, 13],
        [34, 13],
        [39, 18],
        [39, 30],
        [34, 35],
        [21, 35],
        [15, 41],
        [15, 35],
        [11, 31],
      ],
      true
    ),
    poly([
      [18, 25],
      [21, 21],
      [24, 28],
      [28, 19],
      [31, 26],
      [33, 23],
    ]),
    roundedRect(26, 30, 27, 20, 5),
    poly([
      [32, 37],
      [47, 37],
    ]),
    poly([
      [32, 43],
      [42, 43],
    ]),
  ],
  // 2. Studio Voice Condenser Microphone
  [
    roundedRect(24, 11, 16, 26, 8),
    poly([
      [28, 20],
      [36, 20],
      [32, 24],
      [28, 27],
      [36, 27],
    ]),
    arc(32, 27, 15, 17, 175, 5),
    poly([
      [32, 44],
      [32, 53],
      [22, 53],
      [42, 53],
    ]),
    arc(32, 25, 22, 22, -32, 32),
  ],
  // 3. Interlocking Dual Audio Reels (VF ⇄ VO)
  [
    circle(22, 25, 13),
    circle(22, 25, 4.5),
    circle(42, 39, 13),
    circle(42, 39, 4.5),
    poly([
      [38, 14],
      [49, 14],
      [44.5, 10],
      [49, 14],
      [44.5, 18],
    ]),
  ],
  // 4. Japanese Hanko Translation Seal ("文")
  [
    roundedRect(13, 13, 38, 38, 9),
    poly([
      [32, 20],
      [32, 25],
      [21, 25],
      [43, 25],
    ]),
    poly([
      [37, 26],
      [31, 36],
      [21, 44],
    ]),
    poly([
      [26, 31],
      [34, 38],
      [43, 44],
    ]),
    poly(
      [
        [45, 17],
        [47, 19],
        [45, 21],
        [43, 19],
      ],
      true
    ),
  ],
  // 5. Studio Headphones & Voice Pulse
  [
    arc(32, 34, 19, 20, 185, 355),
    roundedRect(10, 32, 9, 17, 4.5),
    roundedRect(45, 32, 9, 17, 4.5),
    poly([
      [24, 34],
      [24, 43],
      [29, 30],
      [29, 44],
    ]),
    poly([
      [35, 32],
      [35, 45],
      [40, 35],
      [40, 41],
    ]),
  ],
  // 6. Kitsune Voice Mask (Dubbing Persona)
  [
    poly(
      [
        [15, 23],
        [13, 11],
        [25, 19],
        [39, 19],
        [51, 11],
        [49, 23],
        [47, 41],
        [32, 53],
        [17, 41],
      ],
      true
    ),
    poly([
      [20, 29],
      [27, 32],
      [21, 33],
    ]),
    poly([
      [44, 29],
      [37, 32],
      [43, 33],
    ]),
    poly([
      [28, 41],
      [32, 44],
      [36, 41],
    ]),
    poly([
      [32, 23],
      [32, 29],
    ]),
  ],
  // 7. Megaphone Voiceover Horn
  [
    poly(
      [
        [12, 26],
        [24, 26],
        [44, 14],
        [44, 46],
        [24, 34],
        [12, 34],
      ],
      true
    ),
    poly([
      [18, 34],
      [22, 50],
      [28, 50],
      [25, 35],
    ]),
    arc(44, 30, 8, 10, -48, 48),
    arc(45, 30, 14, 17, -42, 42),
    poly([
      [17, 30],
      [23, 30],
    ]),
  ],
  // 8. Closed Caption [CC] Cinema Screen
  [
    roundedRect(10, 14, 44, 32, 6),
    arc(27, 30, 7, 8, 45, 315),
    arc(41, 30, 7, 8, 45, 315),
    poly([
      [18, 51],
      [46, 51],
    ]),
    poly([
      [17, 20],
      [24, 20],
    ]),
  ],
  // 9. Katakana Voice Crest ("ア" Frame)
  [
    roundedRect(12, 12, 40, 40, 11),
    poly([
      [21, 22],
      [43, 22],
      [35, 32],
    ]),
    poly([
      [32, 28],
      [31, 38],
      [22, 45],
    ]),
    arc(32, 32, 24, 24, -22, 22),
    arc(32, 32, 24, 24, 158, 202),
  ],
  // 10. Dual Language Globe & Meridians
  [
    circle(32, 32, 20),
    arc(32, 32, 9, 20, -90, 270),
    poly([
      [13, 26],
      [51, 26],
    ]),
    poly([
      [13, 38],
      [51, 38],
    ]),
    circle(47, 17, 4),
  ],
  // 11. Makimono Script Scroll
  [
    roundedRect(16, 13, 32, 38, 4),
    roundedRect(11, 16, 5, 32, 2.5),
    roundedRect(48, 16, 5, 32, 2.5),
    poly([
      [23, 24],
      [41, 24],
    ]),
    poly([
      [23, 32],
      [38, 32],
      [23, 40],
      [35, 40],
    ]),
  ],
  // 12. 5-Band Dubbing Equalizer Console
  [
    poly([
      [14, 46],
      [14, 26],
    ]),
    poly([
      [23, 48],
      [23, 15],
    ]),
    poly([
      [32, 50],
      [32, 20],
    ]),
    poly([
      [41, 47],
      [41, 13],
    ]),
    poly([
      [50, 45],
      [50, 28],
    ]),
  ],
  // 13. Open Bilingual Script Book
  [
    poly(
      [
        [11, 17],
        [27, 17],
        [32, 21],
        [32, 49],
        [27, 45],
        [11, 45],
      ],
      true
    ),
    poly(
      [
        [53, 17],
        [37, 17],
        [32, 21],
        [32, 49],
        [37, 45],
        [53, 45],
      ],
      true
    ),
    poly([
      [16, 25],
      [26, 25],
    ]),
    poly([
      [16, 33],
      [25, 33],
    ]),
    poly([
      [38, 25],
      [48, 25],
      [38, 33],
      [47, 33],
    ]),
  ],
  // 14. Shoji Subtitle Lattice Window
  [
    roundedRect(12, 12, 40, 40, 3),
    poly([
      [32, 12],
      [32, 52],
    ]),
    poly([
      [12, 29],
      [52, 29],
    ]),
    poly([
      [18, 40],
      [27, 40],
    ]),
    poly([
      [37, 40],
      [46, 40],
    ]),
  ],
  // 15. Broadcast Voice Tower
  [
    poly([
      [21, 52],
      [32, 24],
      [43, 52],
    ]),
    poly([
      [25, 42],
      [39, 42],
    ]),
    circle(32, 20, 3.5),
    arc(32, 20, 11, 11, -35, 35),
    arc(32, 20, 17, 17, 145, 215),
  ],
  // 16. Twin Dialogue Masks (VF / VO)
  [
    roundedRect(11, 13, 27, 21, 6),
    roundedRect(26, 30, 27, 21, 6),
    poly([
      [18, 23],
      [31, 23],
    ]),
    poly([
      [33, 38],
      [46, 38],
    ]),
    poly([
      [33, 44],
      [41, 44],
    ]),
  ],
  // 17. Vinyl Dubbing Turntable
  [
    roundedRect(11, 11, 42, 42, 7),
    circle(29, 32, 13),
    circle(29, 32, 4),
    poly([
      [47, 18],
      [47, 34],
      [39, 41],
    ]),
    arc(29, 32, 8.5, 8.5, 205, 320),
  ],
  // 18. Origami Paper Voice Crane
  [
    poly(
      [
        [11, 33],
        [27, 25],
        [43, 33],
        [27, 43],
      ],
      true
    ),
    poly([
      [23, 27],
      [19, 13],
      [35, 27],
    ]),
    poly([
      [39, 30],
      [51, 17],
      [43, 33],
    ]),
    poly([
      [51, 17],
      [55, 20],
    ]),
    poly([
      [21, 39],
      [12, 48],
    ]),
  ],
  // 19. Waveform Oscilloscope Monitor
  [
    roundedRect(10, 14, 44, 31, 6),
    poly([
      [14, 30],
      [21, 30],
      [25, 20],
      [30, 39],
      [35, 19],
      [40, 36],
      [44, 30],
      [50, 30],
    ]),
    poly([
      [24, 51],
      [40, 51],
    ]),
    poly([
      [32, 45],
      [32, 51],
    ]),
    circle(47, 20, 2),
  ],
  // 20. Bilingual Bento Tiles ("あ / A")
  [
    roundedRect(12, 12, 40, 40, 8),
    poly([
      [32, 12],
      [32, 52],
    ]),
    poly([
      [17, 27],
      [27, 27],
      [22, 20],
      [22, 40],
    ]),
    poly([
      [38, 41],
      [43, 22],
      [48, 41],
    ]),
    poly([
      [39.5, 35],
      [46.5, 35],
    ]),
  ],
  // 21. Dubbing Cadence Metronome
  [
    poly(
      [
        [18, 51],
        [25, 14],
        [39, 14],
        [46, 51],
      ],
      true
    ),
    poly([
      [32, 44],
      [45, 21],
    ]),
    circle(43, 25, 3),
    poly([
      [25, 42],
      [39, 42],
    ]),
    poly([
      [28, 10],
      [36, 10],
    ]),
  ],
  // 22. Script Adaptation Fountain Nib
  [
    poly(
      [
        [32, 10],
        [45, 31],
        [39, 45],
        [25, 45],
        [19, 31],
      ],
      true
    ),
    poly([
      [32, 10],
      [32, 29],
    ]),
    circle(32, 32, 3),
    roundedRect(23, 45, 18, 7, 2),
    arc(32, 32, 21, 21, -25, 25),
  ],
  // 23. Dual Audio Track Pill Switch
  [
    roundedRect(11, 20, 42, 24, 12),
    circle(23, 32, 8),
    poly([
      [37, 27],
      [42, 37],
      [47, 27],
    ]),
    poly([
      [19, 13],
      [29, 13],
    ]),
    poly([
      [35, 51],
      [45, 51],
    ]),
  ],
  // 24. Torii Audio Resonance Gate
  [
    poly([
      [12, 16],
      [32, 19],
      [52, 16],
    ]),
    poly([
      [16, 25],
      [48, 25],
    ]),
    poly([
      [21, 18],
      [21, 51],
    ]),
    poly([
      [43, 18],
      [43, 51],
    ]),
    arc(32, 37, 6.5, 6.5, 0, 360),
  ],
  // 25. Earphone & Acoustic Chamber
  [
    arc(27, 28, 12, 14, 130, 385),
    circle(27, 27, 5),
    poly([
      [21, 41],
      [21, 53],
    ]),
    arc(36, 28, 12, 14, -40, 40),
    arc(39, 28, 18, 20, -38, 38),
  ],
];

// Feature 1 (Lecture Hors Ligne): 25 Original Morphing Brand Icons
export const FEATURE_1_BRANDS: IconBrand[] = [
  // 1. Pocket Film Cassette + Download Arrow
  [
    roundedRect(13, 17, 38, 34, 7),
    roundedRect(25, 11, 14, 6, 3),
    poly([
      [32, 24],
      [32, 39],
    ]),
    poly([
      [25.5, 33.5],
      [32, 40],
      [38.5, 33.5],
    ]),
    poly([
      [23, 45],
      [41, 45],
    ]),
  ],
  // 2. Offline Signal Shield + Saved Check
  [
    poly(
      [
        [32, 10],
        [50, 18],
        [47, 37],
        [32, 54],
        [17, 37],
        [14, 18],
      ],
      true
    ),
    arc(32, 28, 11, 9, 205, 335),
    poly([
      [23.5, 33.5],
      [29.5, 39.5],
      [41.5, 26.5],
    ]),
    poly([
      [24, 24],
      [28, 21],
    ]),
    poly([
      [26, 45.5],
      [38, 45.5],
    ]),
  ],
  // 3. Travel Pocket Cinema Player
  [
    roundedRect(10, 16, 44, 29, 6),
    poly([
      [22, 50],
      [42, 50],
    ]),
    poly(
      [
        [28, 24],
        [39, 30.5],
        [28, 37],
      ],
      true
    ),
    poly([
      [15.5, 22],
      [15.5, 39],
    ]),
    poly([
      [21, 40.5],
      [47, 40.5],
    ]),
  ],
  // 4. Crystal Memory Card (SD Vault)
  [
    poly(
      [
        [18, 11],
        [39, 11],
        [48, 20],
        [48, 52],
        [16, 52],
        [16, 13],
      ],
      true
    ),
    poly([
      [24, 17],
      [24, 25],
    ]),
    poly([
      [31, 17],
      [31, 25],
    ]),
    poly([
      [38, 17],
      [38, 25],
    ]),
    roundedRect(23, 31, 18, 14, 3),
  ],
  // 5. Cloud-to-Local Vault Capsule
  [
    poly(
      [
        [17, 36],
        [12, 32],
        [14, 24],
        [21, 21],
        [27, 15],
        [37, 15],
        [43, 22],
        [50, 25],
        [51, 33],
        [46, 36],
      ],
      true
    ),
    poly([
      [32, 26],
      [32, 43],
    ]),
    poly([
      [26, 37],
      [32, 43],
      [38, 37],
    ]),
    roundedRect(17, 47, 30, 6, 3),
    poly([
      [45, 13],
      [49, 17],
    ]),
  ],
  // 6. Airplane Mode Cinema Jet
  [
    poly(
      [
        [32, 10],
        [36, 23],
        [52, 32],
        [52, 37],
        [36, 33],
        [35, 45],
        [41, 50],
        [41, 53],
        [32, 50],
        [23, 53],
        [23, 50],
        [29, 45],
        [28, 33],
        [12, 37],
        [12, 32],
        [28, 23],
      ],
      true
    ),
    poly([
      [15, 22],
      [21, 22],
    ]),
    poly([
      [43, 22],
      [49, 22],
    ]),
    poly([
      [32, 16],
      [32, 27],
    ]),
    circle(32, 39, 2),
  ],
  // 7. Shinkansen Bullet Train Front
  [
    poly(
      [
        [17, 43],
        [17, 25],
        [24, 13],
        [40, 13],
        [47, 25],
        [47, 43],
      ],
      true
    ),
    roundedRect(22, 19, 20, 11, 4),
    circle(23, 37, 2.5),
    circle(41, 37, 2.5),
    poly([
      [14, 51],
      [24, 45],
      [40, 45],
      [50, 51],
    ]),
  ],
  // 8. Plunge Download Tray
  [
    poly([
      [32, 11],
      [32, 38],
    ]),
    poly([
      [21, 28],
      [32, 39],
      [43, 28],
    ]),
    poly([
      [13, 38],
      [13, 50],
      [51, 50],
      [51, 38],
    ]),
    poly([
      [22, 15],
      [26, 15],
    ]),
    poly([
      [38, 15],
      [42, 15],
    ]),
  ],
  // 9. Portable Pocket SSD Drive
  [
    roundedRect(17, 16, 30, 38, 6),
    roundedRect(26, 10, 12, 6, 1.5),
    circle(32, 32, 7),
    poly([
      [23, 45],
      [41, 45],
    ]),
    circle(39, 22, 1.8),
  ],
  // 10. High-Capacity Cinema Battery
  [
    roundedRect(19, 15, 26, 39, 5),
    roundedRect(27, 10, 10, 5, 1.5),
    poly([
      [34, 23],
      [27, 34],
      [33, 34],
      [30, 45],
      [37, 33],
      [31, 33],
    ]),
    poly([
      [24, 48],
      [40, 48],
    ]),
    poly([
      [24, 20],
      [27, 20],
    ]),
  ],
  // 11. Travel Suitcase Episode Vault
  [
    roundedRect(13, 20, 38, 30, 6),
    roundedRect(25, 12, 14, 8, 3),
    poly([
      [23, 20],
      [23, 50],
    ]),
    poly([
      [41, 20],
      [41, 50],
    ]),
    poly([
      [28, 33],
      [36, 33],
    ]),
  ],
  // 12. Local Vault Padlock
  [
    arc(32, 24, 11, 12, 180, 360),
    roundedRect(16, 26, 32, 26, 6),
    circle(32, 37, 3.5),
    poly([
      [32, 41],
      [32, 46],
    ]),
    poly([
      [21, 21],
      [21, 26],
    ]),
  ],
  // 13. 35mm Unspooling Film Canister
  [
    circle(29, 32, 17),
    circle(29, 32, 5.5),
    poly([
      [31, 15],
      [53, 15],
      [53, 25],
      [45, 25],
    ]),
    circle(29, 21, 2.2),
    circle(29, 43, 2.2),
  ],
  // 14. Off-Grid Explorer Compass
  [
    circle(32, 32, 20),
    poly(
      [
        [38, 22],
        [34, 34],
        [24, 42],
        [28, 30],
      ],
      true
    ),
    circle(32, 32, 2.5),
    poly([
      [32, 14],
      [32, 17],
    ]),
    poly([
      [32, 47],
      [32, 50],
    ]),
  ],
  // 15. Mountain Tunnel Express
  [
    poly([
      [10, 47],
      [24, 19],
      [34, 34],
      [43, 21],
      [54, 47],
    ]),
    arc(32, 47, 9, 11, 180, 360),
    poly([
      [10, 47],
      [54, 47],
    ]),
    poly([
      [28, 52],
      [36, 52],
    ]),
    circle(47, 14, 3.5),
  ],
  // 16. Nomad Backpack Player
  [
    roundedRect(16, 17, 32, 35, 11),
    arc(32, 17, 7, 6, 180, 360),
    roundedRect(21, 33, 22, 14, 4),
    poly([
      [21, 26],
      [43, 26],
    ]),
    poly([
      [28, 38],
      [36, 38],
    ]),
  ],
  // 17. Offline Wi-Fi Slash Guardian
  [
    arc(32, 42, 24, 24, 225, 315),
    arc(32, 42, 15, 15, 225, 315),
    circle(32, 46, 3),
    poly([
      [14, 15],
      [50, 51],
    ]),
    poly([
      [41, 14],
      [48, 21],
    ]),
  ],
  // 18. Batch Season `.ts` Crate
  [
    roundedRect(13, 14, 38, 36, 5),
    poly([
      [28, 14],
      [28, 50],
    ]),
    poly([
      [25, 21],
      [31, 21],
    ]),
    poly([
      [25, 28],
      [31, 28],
    ]),
    poly([
      [37, 31],
      [41, 35],
      [46, 27],
    ]),
  ],
  // 19. OTG Flash Key
  [
    roundedRect(22, 11, 20, 14, 2),
    roundedRect(18, 25, 28, 27, 6),
    circle(32, 43, 4),
    poly([
      [28, 18],
      [28, 20],
    ]),
    poly([
      [36, 18],
      [36, 20],
    ]),
  ],
  // 20. Metro Underground Dome
  [
    roundedRect(17, 13, 30, 35, 10),
    roundedRect(22, 20, 20, 11, 3),
    circle(24, 40, 2.5),
    circle(40, 40, 2.5),
    poly([
      [19, 53],
      [45, 53],
    ]),
  ],
  // 21. Offline Cache Hourglass
  [
    poly([
      [17, 13],
      [47, 13],
    ]),
    poly([
      [17, 51],
      [47, 51],
    ]),
    poly([
      [20, 13],
      [44, 51],
    ]),
    poly([
      [44, 13],
      [20, 51],
    ]),
    poly([
      [25, 47],
      [32, 41],
      [39, 47],
    ]),
  ],
  // 22. Lighthouse Offline Beacon
  [
    poly(
      [
        [24, 51],
        [27, 23],
        [37, 23],
        [40, 51],
      ],
      true
    ),
    roundedRect(26, 13, 12, 10, 4),
    poly([
      [12, 15],
      [22, 18],
      [12, 22],
    ]),
    poly([
      [52, 15],
      [42, 18],
      [52, 22],
    ]),
    poly([
      [15, 51],
      [49, 51],
    ]),
  ],
  // 23. Smartphone Ready Offline Check
  [
    roundedRect(18, 10, 28, 44, 6),
    poly([
      [25, 32],
      [30, 37],
      [40, 25],
    ]),
    poly([
      [28, 48],
      [36, 48],
    ]),
    poly([
      [29, 15],
      [35, 15],
    ]),
    arc(46, 14, 6, 6, -90, 90),
  ],
  // 24. Night Camp Off-Grid Tent
  [
    poly(
      [
        [12, 48],
        [32, 17],
        [52, 48],
      ],
      true
    ),
    poly([
      [26, 48],
      [32, 34],
      [38, 48],
    ]),
    poly([
      [28, 12],
      [36, 22],
    ]),
    arc(48, 16, 6, 6, 40, 250),
    poly([
      [10, 52],
      [54, 52],
    ]),
  ],
  // 25. Pocket Magnet Pin
  [
    arc(32, 31, 16, 17, 0, 180),
    poly([
      [16, 14],
      [16, 31],
    ]),
    poly([
      [48, 14],
      [48, 31],
    ]),
    poly([
      [16, 21],
      [24, 21],
      [24, 14],
      [16, 14],
    ]),
    poly([
      [40, 14],
      [48, 14],
      [48, 21],
      [40, 21],
    ]),
  ],
];

// Feature 2 (Reprends là où tu en étais): 25 Original Morphing Brand Icons
export const FEATURE_2_BRANDS: IconBrand[] = [
  // 1. Tanzaku Bookmark & Circular Resume Dial
  [
    poly(
      [
        [16, 11],
        [42, 11],
        [42, 52],
        [29, 43],
        [16, 52],
      ],
      true
    ),
    arc(29, 29, 9.5, 9.5, -90, 195),
    poly(
      [
        [26.5, 24.5],
        [34.5, 29],
        [26.5, 33.5],
      ],
      true
    ),
    poly([
      [48, 16],
      [52, 12],
    ]),
    poly([
      [49, 26],
      [54, 26],
    ]),
  ],
  // 2. Fanned Anime Library Volumes
  [
    roundedRect(12, 15, 11, 33, 2.5),
    roundedRect(26, 12, 11, 36, 2.5),
    poly(
      [
        [40, 16],
        [50, 14],
        [55, 47],
        [45, 49],
      ],
      true
    ),
    poly([
      [10, 52.5],
      [55, 52.5],
    ]),
    poly([
      [31.5, 18],
      [31.5, 27],
    ]),
  ],
  // 3. Rewind & Resume Chronometer
  [
    arc(32, 33, 18.5, 18.5, 215, 505),
    poly([
      [13.5, 20.5],
      [14, 28],
      [21.5, 25],
    ]),
    poly([
      [32, 22],
      [32, 33],
      [40, 38],
    ]),
    poly([
      [27.5, 10.5],
      [36.5, 10.5],
    ]),
    circle(32, 33, 2.5),
  ],
  // 4. Cinema Clapper & Slate
  [
    roundedRect(12, 24, 40, 27, 4),
    poly(
      [
        [12, 21],
        [49, 11],
        [51, 17],
        [14, 27],
      ],
      true
    ),
    poly([
      [22, 18.5],
      [26, 23.5],
    ]),
    poly([
      [36, 15],
      [40, 20],
    ]),
    poly(
      [
        [28, 32],
        [38.5, 37.5],
        [28, 43],
      ],
      true
    ),
  ],
  // 5. Favorites Emblem & Orbit Ring
  [
    heart(32, 33, 0.92),
    arc(32, 33, 23, 12, 160, 410),
    poly([
      [12, 17],
      [18, 17],
    ]),
    poly([
      [15, 14],
      [15, 20],
    ]),
    circle(49, 44, 2.5),
  ],
  // 6. Pocket Watch & Instant Play
  [
    circle(32, 34, 18),
    roundedRect(28, 10, 8, 5, 2),
    poly(
      [
        [28, 27],
        [40, 34],
        [28, 41],
      ],
      true
    ),
    arc(32, 34, 13, 13, -90, 150),
    poly([
      [46, 18],
      [50, 14],
    ]),
  ],
  // 7. Favorite Starburst Crest
  [
    star(32, 32, 18, 8, 5),
    arc(32, 32, 23, 23, 20, 290),
    poly([
      [13, 15],
      [17, 19],
    ]),
    poly([
      [49, 49],
      [52, 52],
    ]),
    circle(32, 32, 3.5),
  ],
  // 8. 4-Tile Anime Library Grid
  [
    roundedRect(12, 12, 17, 17, 4),
    roundedRect(35, 12, 17, 17, 4),
    roundedRect(12, 35, 17, 17, 4),
    roundedRect(35, 35, 17, 17, 4),
    poly(
      [
        [41, 40],
        [48, 43.5],
        [41, 47],
      ],
      true
    ),
  ],
  // 9. Stacked Episode Queue Cards
  [
    roundedRect(14, 19, 36, 33, 5),
    poly([
      [19, 14],
      [45, 14],
    ]),
    poly([
      [23, 10],
      [41, 10],
    ]),
    poly([
      [21, 43],
      [43, 43],
    ]),
    poly(
      [
        [28, 27],
        [38, 32.5],
        [28, 38],
      ],
      true
    ),
  ],
  // 10. Continuity Lemniscate Loop (∞)
  [
    lemniscate(32, 32, 21, 14),
    poly([
      [43, 21],
      [48, 25],
      [42, 28],
    ]),
    circle(21, 32, 3.5),
    circle(43, 32, 3.5),
    poly([
      [32, 14],
      [32, 18],
    ]),
  ],
  // 11. Analog History Dial
  [
    circle(32, 32, 20),
    poly([
      [32, 20],
      [32, 32],
      [42, 32],
    ]),
    poly([
      [32, 14],
      [32, 17],
    ]),
    poly([
      [14, 32],
      [17, 32],
    ]),
    poly([
      [32, 47],
      [32, 50],
    ]),
  ],
  // 12. Episode Archive Drawers
  [
    roundedRect(14, 12, 36, 40, 5),
    poly([
      [14, 25],
      [50, 25],
    ]),
    poly([
      [14, 39],
      [50, 39],
    ]),
    poly([
      [28, 19],
      [36, 19],
    ]),
    poly([
      [28, 32],
      [36, 32],
    ]),
  ],
  // 13. Dual-Spool Cinema Projector
  [
    circle(22, 20, 8),
    circle(39, 20, 8),
    roundedRect(16, 30, 27, 18, 4),
    poly(
      [
        [43, 34],
        [53, 30],
        [53, 48],
        [43, 44],
      ],
      true
    ),
    poly([
      [21, 52],
      [39, 52],
    ]),
  ],
  // 14. Season Mastery Crown
  [
    poly(
      [
        [13, 43],
        [11, 21],
        [23, 30],
        [32, 14],
        [41, 30],
        [53, 21],
        [51, 43],
      ],
      true
    ),
    poly([
      [15, 49],
      [49, 49],
    ]),
    circle(32, 34, 3.5),
    circle(20, 36, 2),
    circle(44, 36, 2),
  ],
  // 15. Time-Warp History Spiral
  [
    arc(32, 32, 20, 20, 180, 440),
    arc(34, 32, 13, 13, 80, 350),
    arc(32, 33, 6.5, 6.5, -10, 250),
    poly([
      [11, 25],
      [12, 32],
      [19, 30],
    ]),
    circle(32, 32, 2),
  ],
  // 16. Queue Playlist & Play Triangle
  [
    poly([
      [13, 18],
      [49, 18],
    ]),
    poly([
      [13, 29],
      [49, 29],
    ]),
    poly([
      [13, 40],
      [31, 40],
    ]),
    poly(
      [
        [38, 34],
        [50, 41],
        [38, 48],
      ],
      true
    ),
    circle(16, 48, 2),
  ],
  // 17. Katana Scabbard Chapter Marker
  [
    poly(
      [
        [13, 49],
        [18, 40],
        [46, 12],
        [51, 14],
        [23, 44],
      ],
      true
    ),
    poly([
      [16, 36],
      [27, 47],
    ]),
    poly([
      [12, 51],
      [17, 46],
    ]),
    circle(43, 38, 5),
    poly([
      [41, 38],
      [45, 38],
    ]),
  ],
  // 18. Release Bell & Season Alert
  [
    poly(
      [
        [18, 41],
        [20, 24],
        [25, 15],
        [39, 15],
        [44, 24],
        [46, 41],
      ],
      true
    ),
    poly([
      [13, 41],
      [51, 41],
    ]),
    arc(32, 43, 5, 5, 0, 180),
    circle(46, 15, 4),
    poly([
      [32, 10],
      [32, 15],
    ]),
  ],
  // 19. Memory Episode Polaroid
  [
    roundedRect(14, 11, 36, 42, 4),
    roundedRect(19, 16, 26, 22, 2),
    heart(32, 27, 0.42),
    poly([
      [21, 45],
      [35, 45],
    ]),
    circle(42, 45, 2),
  ],
  // 20. Origami Shuriken Season Seal
  [
    poly(
      [
        [32, 11],
        [37, 25],
        [53, 32],
        [37, 39],
        [32, 53],
        [27, 39],
        [11, 32],
        [27, 25],
      ],
      true
    ),
    circle(32, 32, 5),
    poly([
      [20, 20],
      [24, 24],
    ]),
    poly([
      [44, 20],
      [40, 24],
    ]),
    poly([
      [20, 44],
      [24, 40],
    ]),
  ],
  // 21. Season Complete Pennant Flag
  [
    poly([
      [16, 12],
      [16, 52],
    ]),
    poly(
      [
        [16, 14],
        [50, 21],
        [44, 28],
        [50, 36],
        [16, 36],
      ],
      true
    ),
    poly([
      [25, 22],
      [34, 22],
    ]),
    poly([
      [25, 29],
      [39, 29],
    ]),
    poly([
      [11, 52],
      [21, 52],
    ]),
  ],
  // 22. Next-Episode Finder Binoculars
  [
    circle(20, 39, 9.5),
    circle(44, 39, 9.5),
    poly([
      [15, 31],
      [21, 16],
      [27, 16],
      [27, 32],
    ]),
    poly([
      [49, 31],
      [43, 16],
      [37, 16],
      [37, 32],
    ]),
    poly([
      [27, 25],
      [37, 25],
    ]),
  ],
  // 23. Progress Arc & Resume Chevron
  [
    arc(32, 32, 20, 20, -90, 180),
    arc(32, 32, 13, 13, 0, 270),
    poly(
      [
        [28, 25],
        [39, 32],
        [28, 39],
      ],
      true
    ),
    circle(32, 12, 2.5),
    poly([
      [12, 32],
      [15, 32],
    ]),
  ],
  // 24. Watchlist Horizon Telescope
  [
    poly(
      [
        [14, 33],
        [43, 17],
        [47, 25],
        [18, 41],
      ],
      true
    ),
    poly([
      [30, 34],
      [21, 52],
    ]),
    poly([
      [30, 34],
      [39, 52],
    ]),
    poly([
      [30, 34],
      [30, 50],
    ]),
    star(50, 13, 4.5, 2, 4),
  ],
  // 25. Faceted Collection Gem Crest
  [
    poly(
      [
        [20, 14],
        [44, 14],
        [52, 25],
        [32, 51],
        [12, 25],
      ],
      true
    ),
    poly([
      [12, 25],
      [52, 25],
    ]),
    poly([
      [23, 14],
      [27, 25],
      [32, 51],
    ]),
    poly([
      [41, 14],
      [37, 25],
      [32, 51],
    ]),
    poly([
      [27, 25],
      [37, 25],
    ]),
  ],
];

// Material 3 6-Petal Expressive Backdrop Keyframes (normalized 16-cubic-segment coordinates)
const M3_DISC_KEYFRAMES: number[][] = [
  [
    188, 100, 188, 109.31, 175.27, 121.1, 167.44, 127.94, 159.61, 134.77, 147.6,
    134.43, 141.01, 141.01, 134.43, 147.6, 134.77, 159.61, 127.94, 167.44, 121.1,
    175.27, 109.31, 188, 100, 188, 90.69, 188, 78.9, 175.27, 72.06, 167.44, 65.23,
    159.61, 65.57, 147.6, 58.99, 141.01, 52.4, 134.43, 40.39, 134.77, 32.56, 127.94,
    24.73, 121.1, 12, 109.31, 12, 100, 12, 90.69, 24.73, 78.9, 32.56, 72.06, 40.39,
    65.23, 52.4, 65.57, 58.99, 58.99, 65.57, 52.4, 65.23, 40.39, 72.06, 32.56, 78.9,
    24.73, 90.69, 12, 100, 12, 109.31, 12, 121.1, 24.73, 127.94, 32.56, 134.77,
    40.39, 134.43, 52.4, 141.01, 58.99, 147.6, 65.57, 159.61, 65.23, 167.44, 72.06,
    175.27, 78.9, 188, 90.69, 188, 100,
  ],
  [
    180, 100, 180, 110.97, 181.54, 121.69, 179.42, 132.9, 177.3, 144.11, 175.03,
    159.52, 167.27, 167.27, 159.52, 175.03, 144.11, 177.3, 132.9, 179.42, 121.69,
    181.54, 110.97, 180, 100, 180, 89.03, 180, 78.31, 181.54, 67.1, 179.42, 55.89,
    177.3, 40.48, 175.03, 32.73, 167.27, 24.97, 159.52, 22.7, 144.11, 20.58, 132.9,
    18.46, 121.69, 20, 110.97, 20, 100, 20, 89.03, 18.46, 78.31, 20.58, 67.1, 22.7,
    55.89, 24.97, 40.48, 32.73, 32.73, 40.48, 24.97, 55.89, 22.7, 67.1, 20.58,
    78.31, 18.46, 89.03, 20, 100, 20, 110.97, 20, 121.69, 18.46, 132.9, 20.58,
    144.11, 22.7, 159.52, 24.97, 167.27, 32.73, 175.03, 40.48, 177.3, 55.89, 179.42,
    67.1, 181.54, 78.31, 180, 89.03, 180, 100,
  ],
  [
    187, 100, 187, 108.55, 166.15, 115.39, 161.9, 125.64, 157.65, 135.89, 167.56,
    155.47, 161.52, 161.52, 155.47, 167.56, 135.89, 157.65, 125.64, 161.9, 115.39,
    166.15, 108.55, 187, 100, 187, 91.45, 187, 84.61, 166.15, 74.36, 161.9, 64.11,
    157.65, 44.53, 167.56, 38.48, 161.52, 32.44, 155.47, 42.35, 135.89, 38.1, 125.64,
    33.85, 115.39, 13, 108.55, 13, 100, 13, 91.45, 33.85, 84.61, 38.1, 74.36, 42.35,
    64.11, 32.44, 44.53, 38.48, 38.48, 44.53, 32.44, 64.11, 42.35, 74.36, 38.1,
    84.61, 33.85, 91.45, 13, 100, 13, 108.55, 13, 115.39, 33.85, 125.64, 38.1,
    135.89, 42.35, 155.47, 32.44, 161.52, 38.48, 167.56, 44.53, 157.65, 64.11, 161.9,
    74.36, 166.15, 84.61, 187, 91.45, 187, 100,
  ],
  [
    187, 100, 187, 110.15, 180.19, 122.62, 173.53, 130.46, 166.87, 138.3, 155.21,
    142.27, 147.03, 147.03, 138.85, 151.8, 132.3, 154.39, 124.46, 159.05, 116.62,
    163.71, 109.57, 171.59, 100, 175, 90.43, 178.41, 76.89, 182.19, 67.06, 179.53,
    57.22, 176.87, 46.32, 167.8, 40.97, 159.03, 35.62, 150.27, 35.61, 136.78, 34.95,
    126.94, 34.29, 117.11, 37, 108.98, 37, 100, 37, 91.02, 34.29, 82.89, 34.95,
    73.06, 35.61, 63.22, 35.62, 49.73, 40.97, 40.97, 46.32, 32.2, 57.22, 23.13,
    67.06, 20.47, 76.89, 17.81, 90.43, 21.59, 100, 25, 109.57, 28.41, 116.62, 36.29,
    124.46, 40.95, 132.3, 45.61, 138.85, 48.2, 147.03, 52.97, 155.21, 57.73, 166.87,
    61.7, 173.53, 69.54, 180.19, 77.38, 187, 89.85, 187, 100,
  ],
  [
    176, 100, 176, 109.15, 170.76, 119.25, 166.3, 127.46, 161.85, 135.68, 155.75,
    142.81, 149.28, 149.28, 142.81, 155.75, 135.68, 161.85, 127.46, 166.3, 119.25,
    170.76, 109.15, 176, 100, 176, 90.85, 176, 80.75, 170.76, 72.54, 166.3, 64.32,
    161.85, 57.19, 155.75, 50.72, 149.28, 44.25, 142.81, 38.15, 135.68, 33.7, 127.46,
    29.24, 119.25, 24, 109.15, 24, 100, 24, 90.85, 29.24, 80.75, 33.7, 72.54, 38.15,
    64.32, 44.25, 57.19, 50.72, 50.72, 57.19, 44.25, 64.32, 38.15, 72.54, 33.7,
    80.75, 29.24, 90.85, 24, 100, 24, 109.15, 24, 119.25, 29.24, 127.46, 33.7,
    135.68, 38.15, 142.81, 44.25, 149.28, 50.72, 155.75, 57.19, 161.85, 64.32, 166.3,
    72.54, 170.76, 80.75, 176, 90.85, 176, 100,
  ],
  [
    182, 100, 182, 110.46, 179.76, 121.72, 175.76, 131.38, 171.76, 141.04, 165.38,
    150.59, 157.98, 157.98, 150.59, 165.38, 141.04, 171.76, 131.38, 175.76, 121.72,
    179.76, 110.46, 182, 100, 182, 89.54, 182, 78.28, 179.76, 68.62, 175.76, 58.96,
    171.76, 49.41, 165.38, 42.02, 157.98, 34.62, 150.59, 28.24, 141.04, 24.24, 131.38,
    20.24, 121.72, 18, 110.46, 18, 100, 18, 89.54, 20.24, 78.28, 24.24, 68.62, 28.24,
    58.96, 34.62, 49.41, 42.02, 42.02, 49.41, 34.62, 58.96, 28.24, 68.62, 24.24,
    78.28, 20.24, 89.54, 18, 100, 18, 110.46, 18, 121.72, 20.24, 131.38, 24.24,
    141.04, 28.24, 150.59, 34.62, 157.98, 42.02, 165.38, 49.41, 171.76, 58.96, 175.76,
    68.62, 179.76, 78.28, 182, 89.54, 182, 100,
  ],
];

function interpDiscPath(cyclePhase: number): string {
  const n = M3_DISC_KEYFRAMES.length;
  const scaled = (cyclePhase % 1) * n;
  const idx = Math.floor(scaled);
  const nextIdx = (idx + 1) % n;
  const localT = easeInOutSine(scaled - idx);
  const a = M3_DISC_KEYFRAMES[idx];
  const b = M3_DISC_KEYFRAMES[nextIdx];

  const nums = new Array<string>(a.length);
  for (let i = 0; i < a.length; i++) {
    nums[i] = lerp(a[i], b[i], localT).toFixed(2);
  }

  let d = `M ${nums[0]} ${nums[1]}`;
  for (let i = 2; i < nums.length; i += 6) {
    d += ` C ${nums[i]} ${nums[i + 1]} ${nums[i + 2]} ${nums[i + 3]} ${nums[i + 4]} ${nums[i + 5]}`;
  }
  return `${d} Z`;
}

export function getMorphBrandState(
  brands: IconBrand[],
  elapsedMs: number,
  offsetMs: number = 0
): { paths: string[]; scale: number } {
  const stepMs = 2600;
  const holdFraction = 0.44;
  const totalMs = brands.length * stepMs;
  const wrapped = ((elapsedMs + offsetMs) % totalMs + totalMs) % totalMs;
  const idx = Math.floor(wrapped / stepMs);
  const nextIdx = (idx + 1) % brands.length;
  const rawSegment = (wrapped - idx * stepMs) / stepMs;

  const morphT =
    rawSegment <= holdFraction
      ? 0
      : easeInOutSine((rawSegment - holdFraction) / (1 - holdFraction));

  // Gentle fluid dip during morph apex (no jarring bounce)
  const scale = 1 - 0.045 * Math.sin(morphT * Math.PI);
  const current = brands[idx];
  const next = brands[nextIdx];

  const paths = current.map((strokeA, sIdx) =>
    morphT === 0 ? ptsToPath(strokeA) : interpPathData(strokeA, next[sIdx], morphT)
  );

  return { paths, scale };
}

export function initFeatureIconMorphing(reducedMotion: boolean): void {
  const configs: {
    selector: string;
    brands: IconBrand[];
    offsetMs: number;
  }[] = [
    { selector: '.feature.f0 .illustration-disc', brands: FEATURE_0_BRANDS, offsetMs: 0 },
    { selector: '.feature.f1 .illustration-disc', brands: FEATURE_1_BRANDS, offsetMs: 4200 },
    { selector: '.feature.f2 .illustration-disc', brands: FEATURE_2_BRANDS, offsetMs: 8400 },
  ];

  const targets = configs
    .map((cfg) => {
      const disc = document.querySelector<HTMLElement>(cfg.selector);
      if (!disc) return null;
      const backdrop = disc.querySelector<SVGElement>('.morph-backdrop');
      const petal = disc.querySelector<SVGPathElement>('.morph-path');
      const iconSvg = disc.querySelector<SVGElement>('.illustration-icon');
      if (!iconSvg) return null;
      const strokes = Array.from(
        iconSvg.querySelectorAll<SVGPathElement>('path[data-morph-stroke]')
      );
      if (strokes.length !== 5) return null;
      return { ...cfg, backdrop, petal, iconSvg, strokes };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (targets.length === 0) return;

  // Apply initial Variant 0 immediately
  targets.forEach((target) => {
    const initial = getMorphBrandState(target.brands, 0, 0);
    target.strokes.forEach((pathEl, idx) => {
      pathEl.setAttribute('d', initial.paths[idx]);
    });
  });

  if (reducedMotion) return;

  const discCycleMs = 15600;
  let startTime: number | null = null;

  const tick = (now: number) => {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;

    for (const target of targets) {
      const iconState = getMorphBrandState(target.brands, elapsed, target.offsetMs);
      for (let i = 0; i < target.strokes.length; i++) {
        target.strokes[i].setAttribute('d', iconState.paths[i]);
      }
      target.iconSvg.style.transform = `scale(${iconState.scale.toFixed(4)})`;

      const discPhase = ((elapsed + target.offsetMs) % discCycleMs) / discCycleMs;
      if (target.petal) {
        target.petal.setAttribute('d', interpDiscPath(discPhase));
      }
      if (target.backdrop) {
        const angle = (((elapsed + target.offsetMs) / 1000) * 14) % 360;
        target.backdrop.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      }
    }

    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
}
