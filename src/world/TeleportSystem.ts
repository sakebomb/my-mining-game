import * as THREE from 'three';
import { WorldManager } from './WorldManager';
import { BlockType } from '../config/types';
import {
  BLOCK_SIZE,
  TELEPORT_LEVELS,
  TELEPORT_COOLDOWN,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
} from '../config/constants';

/** A pair of teleport pads: surface ↔ underground */
interface TeleportPair {
  level: number;
  surfacePos: THREE.Vector3; // world position (meters) of surface pad
  undergroundPos: THREE.Vector3; // world position (meters) of underground pad
}

/**
 * Manages bidirectional teleport pads at preset depth levels.
 * Each level has a pad on the surface and a pad underground.
 * Player steps on a pad → teleported to the paired pad.
 */
export class TeleportSystem {
  private world: WorldManager;
  private pairs: TeleportPair[] = [];
  private cooldownTimer = 0;
  private scene: THREE.Scene;
  private glowMeshes: THREE.Mesh[] = [];

  /** Callback when player teleports */
  onTeleport: ((fromLevel: number, toLevel: number) => void) | null = null;

  constructor(world: WorldManager, scene: THREE.Scene) {
    this.world = world;
    this.scene = scene;
  }

  /**
   * Place teleport pads in the world. Call after initial world generation.
   * Surface pads are placed at x offsets so they don't overlap each other.
   */
  placePads(): void {
    for (let i = 0; i < TELEPORT_LEVELS.length; i++) {
      const level = TELEPORT_LEVELS[i];

      // Surface pad position: offset each pad along X axis for visibility
      const surfaceX = 10 + i * 4; // 10, 14, 18, 22 blocks from origin
      const surfaceZ = 0;

      // Find surface height at this position
      const surfaceY = this.findSurfaceY(surfaceX, surfaceZ);

      // Underground pad: depth level → block Y coordinate
      // Depth levels: 2 blocks per meter-level, negative Y
      const underY = -(level * 2);

      // Underground pad position: same X/Z so it's easy to find
      const underX = surfaceX;
      const underZ = surfaceZ;

      // Place 3×3 teleport pad platforms (surface)
      this.placePadBlocks(surfaceX, surfaceY, surfaceZ);

      // Clear space above surface pad (ensure player can stand)
      this.clearAbove(surfaceX, surfaceY + 1, surfaceZ, 3);

      // Place 3×3 teleport pad platform (underground)
      this.placePadBlocks(underX, underY, underZ);

      // Clear space above underground pad (ensure player can stand)
      this.clearAbove(underX, underY + 1, underZ, 4);

      // Store pair positions (center of pad, in world meters, standing on top)
      const surfaceWorldPos = new THREE.Vector3(
        (surfaceX + 0.5) * BLOCK_SIZE,
        (surfaceY + 1) * BLOCK_SIZE,
        (surfaceZ + 0.5) * BLOCK_SIZE,
      );
      const underWorldPos = new THREE.Vector3(
        (underX + 0.5) * BLOCK_SIZE,
        (underY + 1) * BLOCK_SIZE,
        (underZ + 0.5) * BLOCK_SIZE,
      );

      this.pairs.push({
        level,
        surfacePos: surfaceWorldPos,
        undergroundPos: underWorldPos,
      });

      // Add glow effect meshes
      this.addGlowEffect(surfaceWorldPos);
      this.addGlowEffect(underWorldPos);
    }
  }

  /** Place a 3×3 platform of teleport blocks centered at (cx, cy, cz) */
  private placePadBlocks(cx: number, cy: number, cz: number): void {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.world.setBlock(cx + dx, cy, cz + dz, BlockType.Teleport);
      }
    }
  }

  /** Clear blocks above a position to ensure headroom */
  private clearAbove(cx: number, startY: number, cz: number, height: number): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const block = this.world.getBlock(cx + dx, startY + dy, cz + dz);
          if (block !== BlockType.Air && block !== BlockType.Teleport) {
            this.world.setBlock(cx + dx, startY + dy, cz + dz, BlockType.Air);
          }
        }
      }
    }
  }

  /** Find the surface Y coordinate at a given XZ block position */
  private findSurfaceY(bx: number, bz: number): number {
    // Scan from high to low to find the first solid block
    for (let by = 20; by >= -10; by--) {
      const block = this.world.getBlock(bx, by, bz);
      if (block !== BlockType.Air) {
        return by;
      }
    }
    return 0; // default to y=0
  }

  /** Add a glowing column effect above a teleport pad */
  private addGlowEffect(pos: THREE.Vector3): void {
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 2, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44eeff,
      transparent: true,
      opacity: 0.25,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + 1, pos.z);
    this.scene.add(mesh);
    this.glowMeshes.push(mesh);
  }

  /**
   * Check if player is standing on a teleport pad and teleport them.
   * Returns new player position if teleported, null otherwise.
   */
  update(dt: number, playerPos: THREE.Vector3): THREE.Vector3 | null {
    // Update cooldown
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt * 1000;
      return null;
    }

    // Animate glow meshes
    const time = performance.now() * 0.001;
    for (const mesh of this.glowMeshes) {
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.15 * Math.sin(time * 2);
    }

    // Check if player feet are on a teleport pad
    const feetY = playerPos.y;
    const centerX = playerPos.x;
    const centerZ = playerPos.z;

    for (const pair of this.pairs) {
      // Check surface pad
      if (this.isOnPad(centerX, feetY, centerZ, pair.surfacePos)) {
        this.cooldownTimer = TELEPORT_COOLDOWN;
        this.onTeleport?.(0, pair.level);
        return pair.undergroundPos.clone();
      }

      // Check underground pad
      if (this.isOnPad(centerX, feetY, centerZ, pair.undergroundPos)) {
        this.cooldownTimer = TELEPORT_COOLDOWN;
        this.onTeleport?.(pair.level, 0);
        return pair.surfacePos.clone();
      }
    }

    return null;
  }

  /** Check if player is standing on a teleport pad at a given position */
  private isOnPad(px: number, py: number, pz: number, padPos: THREE.Vector3): boolean {
    // Pad is a 3×3 area (1.5m × 1.5m in world space), padPos is center top
    const halfSize = 1.5 * BLOCK_SIZE;
    const dx = Math.abs(px - padPos.x);
    const dz = Math.abs(pz - padPos.z);
    // Player feet must be within ~0.2m above the pad surface
    const dy = py - padPos.y;
    return dx < halfSize && dz < halfSize && dy >= -0.1 && dy < 0.3;
  }

  dispose(): void {
    for (const mesh of this.glowMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.glowMeshes = [];
  }
}
