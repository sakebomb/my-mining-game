/**
 * Simple seeded pseudo-random number generator (xoshiro128**)
 * and 2D/3D value noise for procedural world generation.
 */

export class SeededRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    // Initialize state from seed using splitmix32
    this.s = new Uint32Array(4);
    let z = seed | 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) | 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      t = t ^ (t >>> 15);
      this.s[i] = t >>> 0;
    }
  }

  /** Returns float in [0, 1) */
  next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);
    return (result >>> 0) / 0x100000000;
  }

  /** Returns integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/**
 * Simple 2D hash-based noise.
 * Not perlin/simplex quality but fast and deterministic.
 */
function hash2d(x: number, y: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 0xffffffff;
}

function hash3d(x: number, y: number, z: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263 + z * 1440670441;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 0xffffffff;
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** 2D value noise, returns [0, 1] */
export function noise2d(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const a = hash2d(ix, iy, seed);
  const b = hash2d(ix + 1, iy, seed);
  const c = hash2d(ix, iy + 1, seed);
  const d = hash2d(ix + 1, iy + 1, seed);

  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/** 3D value noise, returns [0, 1] */
export function noise3d(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const fz = smoothstep(z - iz);

  const a = hash3d(ix, iy, iz, seed);
  const b = hash3d(ix + 1, iy, iz, seed);
  const c = hash3d(ix, iy + 1, iz, seed);
  const d = hash3d(ix + 1, iy + 1, iz, seed);
  const e = hash3d(ix, iy, iz + 1, seed);
  const f = hash3d(ix + 1, iy, iz + 1, seed);
  const g = hash3d(ix, iy + 1, iz + 1, seed);
  const h = hash3d(ix + 1, iy + 1, iz + 1, seed);

  const x1 = lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  const x2 = lerp(lerp(e, f, fx), lerp(g, h, fx), fy);
  return lerp(x1, x2, fz);
}

/** Fractal brownian motion (multi-octave noise) */
export function fbm2d(
  x: number,
  y: number,
  seed: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2d(x * frequency, y * frequency, seed + i * 1000);
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}
