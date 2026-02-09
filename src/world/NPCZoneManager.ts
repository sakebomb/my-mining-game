import { WorldManager } from './WorldManager';
import { BlockType } from '../config/types';
import { NPC_ZONES } from '../config/npcZones';
import { BLOCK_SIZE } from '../config/constants';

interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Manages NPC stone patios and protected zones.
 * - Places a stone floor and clears air above each NPC zone
 * - Provides isProtected() to prevent mining in NPC areas
 */
export class NPCZoneManager {
  private world: WorldManager;
  private protectedAABBs: AABB[] = [];

  constructor(world: WorldManager) {
    this.world = world;
  }

  /** Find the surface Y coordinate at a given XZ block position */
  private findSurfaceY(bx: number, bz: number): number {
    for (let by = 20; by >= -10; by--) {
      const block = this.world.getBlock(bx, by, bz);
      if (block !== BlockType.Air) {
        return by;
      }
    }
    return 0;
  }

  /**
   * Place stone patios and clear air above each NPC zone.
   * Must be called BEFORE setNPCZoneManager() so the protection guard
   * doesn't block the patio placement.
   */
  placePatios(): void {
    for (const zone of NPC_ZONES) {
      // Convert world-space center to block coords
      const centerBX = Math.floor(zone.worldX / BLOCK_SIZE);
      const centerBZ = Math.floor(zone.worldZ / BLOCK_SIZE);

      const halfW = Math.floor(zone.protectWidth / 2);
      const halfD = Math.floor(zone.protectDepth / 2);

      const minBX = centerBX - halfW;
      const maxBX = centerBX + halfW - 1;
      const minBZ = centerBZ - halfD;
      const maxBZ = centerBZ + halfD - 1;

      // Find surface Y at the center of the zone
      const surfaceY = this.findSurfaceY(centerBX, centerBZ);

      // Place stone floor at surface level
      for (let bx = minBX; bx <= maxBX; bx++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          this.world.setBlock(bx, surfaceY, bz, BlockType.Stone);
        }
      }

      // Clear air above the patio (protectHeight blocks)
      // Extend clearing 2 blocks beyond the stone floor to prevent terrain
      // walls from trapping players at the patio edge (player AABB overlap).
      const clearBuffer = 2;
      for (let bx = minBX - clearBuffer; bx <= maxBX + clearBuffer; bx++) {
        for (let bz = minBZ - clearBuffer; bz <= maxBZ + clearBuffer; bz++) {
          for (let dy = 1; dy <= zone.protectHeight; dy++) {
            this.world.setBlock(bx, surfaceY + dy, bz, BlockType.Air);
          }
        }
      }

      // Store the AABB for protection checks
      this.protectedAABBs.push({
        minX: minBX,
        maxX: maxBX,
        minY: surfaceY,
        maxY: surfaceY + zone.protectHeight,
        minZ: minBZ,
        maxZ: maxBZ,
      });
    }
  }

  /** Check if a block coordinate is inside any protected NPC zone */
  isProtected(bx: number, by: number, bz: number): boolean {
    for (const aabb of this.protectedAABBs) {
      if (
        bx >= aabb.minX && bx <= aabb.maxX &&
        by >= aabb.minY && by <= aabb.maxY &&
        bz >= aabb.minZ && bz <= aabb.maxZ
      ) {
        return true;
      }
    }
    return false;
  }
}
