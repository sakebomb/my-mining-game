import * as THREE from 'three';
import { Chunk } from './Chunk';
import { BlockType } from '../config/types';
import { BLOCK_DEFS } from '../config/blocks';
import { ORE_DEFS } from '../config/ores';
import {
  CHUNK_SIZE,
  BLOCK_SIZE,
  RENDER_DISTANCE,
  SHADOW_DISTANCE,
  MAX_DEPTH_BLOCKS,
} from '../config/constants';
import { noise2d, fbm2d, noise3d, SeededRNG } from '../utils/noise';

const chunkKey = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;

const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _sphere = new THREE.Sphere();

export class WorldManager {
  readonly scene: THREE.Scene;
  readonly seed: number;
  private chunks = new Map<string, Chunk>();
  private rng: SeededRNG;

  constructor(scene: THREE.Scene, seed?: number) {
    this.scene = scene;
    this.seed = seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.rng = new SeededRNG(this.seed);
  }

  /** Get block type at world block coordinates */
  getBlock(wx: number, wy: number, wz: number): BlockType {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(chunkKey(cx, cy, cz));
    if (!chunk) return BlockType.Air;

    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, ly, lz);
  }

  /** Set block at world block coordinates, marks chunk dirty */
  setBlock(wx: number, wy: number, wz: number, type: BlockType): void {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const key = chunkKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) return;

    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, ly, lz, type);

    // Mark neighbor chunks dirty if on border
    if (lx === 0) this.markDirty(cx - 1, cy, cz);
    if (lx === CHUNK_SIZE - 1) this.markDirty(cx + 1, cy, cz);
    if (ly === 0) this.markDirty(cx, cy - 1, cz);
    if (ly === CHUNK_SIZE - 1) this.markDirty(cx, cy + 1, cz);
    if (lz === 0) this.markDirty(cx, cy, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markDirty(cx, cy, cz + 1);
  }

  private markDirty(cx: number, cy: number, cz: number): void {
    const chunk = this.chunks.get(chunkKey(cx, cy, cz));
    if (chunk) chunk.dirty = true;
  }

  /** Convert world position (meters) to block coordinates */
  worldToBlock(x: number, y: number, z: number): [number, number, number] {
    return [
      Math.floor(x / BLOCK_SIZE),
      Math.floor(y / BLOCK_SIZE),
      Math.floor(z / BLOCK_SIZE),
    ];
  }

  /** Convert block coordinates to chunk coordinates */
  blockToChunk(bx: number, by: number, bz: number): [number, number, number] {
    return [
      Math.floor(bx / CHUNK_SIZE),
      Math.floor(by / CHUNK_SIZE),
      Math.floor(bz / CHUNK_SIZE),
    ];
  }

  /** Get block type at a world position in meters */
  getBlockAtPosition(x: number, y: number, z: number): BlockType {
    const [bx, by, bz] = this.worldToBlock(x, y, z);
    return this.getBlock(bx, by, bz);
  }

  /** Check if a block position is solid */
  isSolid(wx: number, wy: number, wz: number): boolean {
    const block = this.getBlock(wx, wy, wz);
    const def = BLOCK_DEFS[block];
    return def ? def.solid : false;
  }

  /** Check if a world-space position (meters) is inside a solid block */
  isSolidAtPosition(x: number, y: number, z: number): boolean {
    const [bx, by, bz] = this.worldToBlock(x, y, z);
    return this.isSolid(bx, by, bz);
  }

  /** Check if a block position is a ladder */
  isLadder(wx: number, wy: number, wz: number): boolean {
    return this.getBlock(wx, wy, wz) === BlockType.Ladder;
  }

  /** Check if a world-space position (meters) overlaps a ladder block */
  isLadderAtPosition(x: number, y: number, z: number): boolean {
    const [bx, by, bz] = this.worldToBlock(x, y, z);
    return this.isLadder(bx, by, bz);
  }

  /** Generate terrain for a chunk */
  private generateChunk(chunk: Chunk): void {
    const { cx, cy, cz } = chunk;
    const seed = this.seed;

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        // World block coordinates
        const bx = cx * CHUNK_SIZE + lx;
        const bz = cz * CHUNK_SIZE + lz;

        // Surface height: gentle rolling hills using fractal noise
        // World x/z in block coords → scale for noise
        const surfaceNoise = fbm2d(bx * 0.02, bz * 0.02, seed, 4, 2, 0.5);
        const surfaceHeight = Math.floor(surfaceNoise * 6 - 2); // -2 to 4 blocks above/below y=0

        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const by = cy * CHUNK_SIZE + ly;

          // Below bedrock floor
          if (by <= -MAX_DEPTH_BLOCKS) {
            chunk.setBlock(lx, ly, lz, BlockType.Bedrock);
            continue;
          }

          // Above surface = air
          if (by > surfaceHeight) {
            chunk.setBlock(lx, ly, lz, BlockType.Air);
            continue;
          }

          // Surface block = grass
          if (by === surfaceHeight) {
            chunk.setBlock(lx, ly, lz, BlockType.Grass);
            continue;
          }

          // Just below surface = dirt (2-3 layers)
          if (by > surfaceHeight - 3) {
            chunk.setBlock(lx, ly, lz, BlockType.Dirt);
            continue;
          }

          // Default underground = stone
          let blockType = BlockType.Stone;

          // Ore generation: check each ore type
          const depth = -by; // depth increases as y decreases
          const depthLevel = Math.floor(depth / 2); // 2 blocks per level

          for (const ore of ORE_DEFS) {
            if (depthLevel < ore.minDepth || depthLevel > ore.maxDepth) continue;

            // Use 3D noise for ore clusters
            const oreNoise = noise3d(
              bx * 0.15,
              by * 0.15,
              bz * 0.15,
              seed + ore.tier * 7919,
            );

            // Threshold based on rarity
            if (oreNoise > 1 - ore.rarity * 2) {
              blockType = ore.blockType;
              break; // First matching ore wins (higher tiers checked first won't matter — list is ascending)
            }
          }

          chunk.setBlock(lx, ly, lz, blockType);
        }
      }
    }
  }

  /**
   * Load/generate chunks around a world position.
   * @param maxChunksPerFrame Max new chunks to generate per call (0 = unlimited).
   * @returns true if all needed chunks are generated and meshed, false if still loading.
   */
  update(playerX: number, playerY: number, playerZ: number, maxChunksPerFrame = 0): boolean {
    const [bx, by, bz] = this.worldToBlock(playerX, playerY, playerZ);
    const [pcx, pcy, pcz] = this.blockToChunk(bx, by, bz);

    const needed = new Set<string>();

    // Generate chunks in cylindrical render distance
    let generated = 0;
    let pendingGeneration = false;

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        // Cylindrical culling: skip corners beyond circular radius
        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;

        const minCy = Math.floor(-MAX_DEPTH_BLOCKS / CHUNK_SIZE) - 1;
        const maxCy = 2; // a couple chunks above surface

        for (let dy = minCy; dy <= maxCy; dy++) {
          const cx = pcx + dx;
          const cy = dy;
          const cz = pcz + dz;
          const key = chunkKey(cx, cy, cz);
          needed.add(key);

          if (!this.chunks.has(key)) {
            if (maxChunksPerFrame > 0 && generated >= maxChunksPerFrame) {
              pendingGeneration = true;
              continue;
            }
            const chunk = new Chunk(cx, cy, cz);
            this.generateChunk(chunk);
            this.chunks.set(key, chunk);
            generated++;
          }
        }
      }
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      if (!needed.has(key)) {
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
        }
        chunk.dispose();
        this.chunks.delete(key);
      }
    }

    // Rebuild dirty chunk meshes (max 4 per update to avoid frame hitches)
    const getNeighborBlock = (wx: number, wy: number, wz: number) => this.getBlock(wx, wy, wz);
    let rebuilds = 0;
    const maxRebuilds = maxChunksPerFrame > 0 ? maxChunksPerFrame : 4;
    let pendingRebuilds = false;

    for (const [_key, chunk] of this.chunks) {
      if (chunk.dirty) {
        if (rebuilds >= maxRebuilds) {
          pendingRebuilds = true;
          continue;
        }
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
        }
        const mesh = chunk.buildMesh(getNeighborBlock);
        if (mesh) {
          // Only enable shadows on nearby chunks
          const dx = chunk.cx - pcx;
          const dy = chunk.cy - pcy;
          const dz = chunk.cz - pcz;
          const distSq = dx * dx + dz * dz;
          const nearVertically = Math.abs(dy) <= 1;
          mesh.castShadow = distSq <= SHADOW_DISTANCE * SHADOW_DISTANCE && nearVertically;
          mesh.receiveShadow = distSq <= SHADOW_DISTANCE * SHADOW_DISTANCE && nearVertically;
          this.scene.add(mesh);
        }
        rebuilds++;
      }
    }

    return !pendingGeneration && !pendingRebuilds;
  }

  /** Count total needed chunks for progress tracking */
  countNeededChunks(playerX: number, playerY: number, playerZ: number): number {
    const [bx, by, bz] = this.worldToBlock(playerX, playerY, playerZ);
    const [pcx, , pcz] = this.blockToChunk(bx, by, bz);
    let count = 0;
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
        const minCy = Math.floor(-MAX_DEPTH_BLOCKS / CHUNK_SIZE) - 1;
        const maxCy = 2;
        count += maxCy - minCy + 1;
      }
    }
    return count;
  }

  /** Count currently loaded chunks */
  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  /** Toggle chunk mesh visibility based on camera frustum */
  updateFrustumCulling(camera: THREE.Camera): void {
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    const chunkWorldSize = CHUNK_SIZE * BLOCK_SIZE;
    const radius = chunkWorldSize * 0.87; // sqrt(3)/2 ≈ 0.87
    for (const [, chunk] of this.chunks) {
      if (!chunk.mesh) continue;
      _sphere.center.set(
        (chunk.cx + 0.5) * chunkWorldSize,
        (chunk.cy + 0.5) * chunkWorldSize,
        (chunk.cz + 0.5) * chunkWorldSize,
      );
      _sphere.radius = radius;
      chunk.mesh.visible = _frustum.intersectsSphere(_sphere);
    }
  }

  dispose(): void {
    for (const [_key, chunk] of this.chunks) {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh);
      }
      chunk.dispose();
    }
    this.chunks.clear();
  }
}
