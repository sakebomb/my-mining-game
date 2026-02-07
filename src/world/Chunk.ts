import * as THREE from 'three';
import { BlockType } from '../config/types';
import { BLOCK_DEFS } from '../config/blocks';
import { CHUNK_SIZE, BLOCK_SIZE } from '../config/constants';

/**
 * A 16×16×16 voxel chunk.
 * Stores block data as a flat Uint8Array for performance.
 * Generates a merged mesh (greedy-ish face culling) for rendering.
 */
export class Chunk {
  readonly cx: number; // chunk coordinate
  readonly cy: number;
  readonly cz: number;
  readonly blocks: Uint8Array;
  mesh: THREE.Mesh | null = null;
  dirty = true;

  constructor(cx: number, cy: number, cz: number) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
  }

  private index(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
      return BlockType.Air;
    }
    return this.blocks[this.index(x, y, z)] as BlockType;
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[this.index(x, y, z)] = type;
    this.dirty = true;
  }

  /**
   * Get a neighbor block, crossing chunk boundaries via the getNeighborBlock callback.
   */
  getBlockOrNeighbor(
    lx: number, ly: number, lz: number,
    getNeighborBlock: (wx: number, wy: number, wz: number) => BlockType,
  ): BlockType {
    if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
      return this.blocks[this.index(lx, ly, lz)] as BlockType;
    }
    // Convert to world coords
    const wx = this.cx * CHUNK_SIZE + lx;
    const wy = this.cy * CHUNK_SIZE + ly;
    const wz = this.cz * CHUNK_SIZE + lz;
    return getNeighborBlock(wx, wy, wz);
  }

  /**
   * Build mesh with face culling: only emit faces adjacent to air/transparent blocks.
   * Uses per-face colors (no texture atlas yet).
   */
  buildMesh(getNeighborBlock: (wx: number, wy: number, wz: number) => BlockType): THREE.Mesh | null {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const tmpColor = new THREE.Color();

    // Face definitions: [dx, dy, dz, face vertices, normal]
    const faces: Array<{
      dir: [number, number, number];
      corners: Array<[number, number, number]>;
      normal: [number, number, number];
    }> = [
      { // +X
        dir: [1, 0, 0],
        corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
        normal: [1, 0, 0],
      },
      { // -X
        dir: [-1, 0, 0],
        corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
        normal: [-1, 0, 0],
      },
      { // +Y
        dir: [0, 1, 0],
        corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
        normal: [0, 1, 0],
      },
      { // -Y
        dir: [0, -1, 0],
        corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
        normal: [0, -1, 0],
      },
      { // +Z
        dir: [0, 0, 1],
        corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
        normal: [0, 0, 1],
      },
      { // -Z
        dir: [0, 0, -1],
        corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
        normal: [0, 0, -1],
      },
    ];

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const blockType = this.blocks[this.index(x, y, z)] as BlockType;
          if (blockType === BlockType.Air) continue;

          const blockDef = BLOCK_DEFS[blockType];
          if (!blockDef || !blockDef.solid) continue;

          tmpColor.set(blockDef.color);

          for (const face of faces) {
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];

            const neighbor = this.getBlockOrNeighbor(nx, ny, nz, getNeighborBlock);
            const neighborDef = BLOCK_DEFS[neighbor];

            // Only emit face if neighbor is air or transparent
            if (neighbor !== BlockType.Air && neighborDef && !neighborDef.transparent) continue;

            const vertexOffset = positions.length / 3;

            for (const [cx, cy, cz] of face.corners) {
              positions.push(
                (x + cx) * BLOCK_SIZE,
                (y + cy) * BLOCK_SIZE,
                (z + cz) * BLOCK_SIZE,
              );
              normals.push(...face.normal);

              // Slight color variation for visual interest
              const variation = 0.9 + 0.1 * ((x + y + z) % 3) / 2;
              colors.push(
                tmpColor.r * variation,
                tmpColor.g * variation,
                tmpColor.b * variation,
              );
            }

            indices.push(
              vertexOffset, vertexOffset + 1, vertexOffset + 2,
              vertexOffset, vertexOffset + 2, vertexOffset + 3,
            );
          }
        }
      }
    }

    // Clean up old mesh
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    }

    if (positions.length === 0) {
      this.mesh = null;
      this.dirty = false;
      return null;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      this.cx * CHUNK_SIZE * BLOCK_SIZE,
      this.cy * CHUNK_SIZE * BLOCK_SIZE,
      this.cz * CHUNK_SIZE * BLOCK_SIZE,
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.dirty = false;
    return this.mesh;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    }
  }
}
