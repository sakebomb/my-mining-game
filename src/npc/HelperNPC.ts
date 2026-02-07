import * as THREE from 'three';
import { WorldManager } from '../world/WorldManager';
import { Enemy } from './Enemy';
import { BlockType } from '../config/types';
import { BLOCK_DEFS } from '../config/blocks';
import { BLOCK_SIZE } from '../config/constants';

const HELPER_SPEED = 3;
const HELPER_ATTACK_DMG = 10;
const HELPER_ATTACK_CD = 1.0; // seconds
const HELPER_MINE_CD = 0.5; // seconds
const HELPER_MINE_REACH = 2; // blocks
const HELPER_WANDER_RADIUS = 8; // meters from player

/**
 * AI helper NPC that mines blocks and fights enemies near the player.
 * Crafted from 6 bones + 1 brain. Has a timed lifespan.
 */
export class HelperNPC {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  private mineTier: number;
  private remainingTime: number; // seconds
  private attackCD = 0;
  private mineCD = 0;
  private wanderTarget: THREE.Vector3 | null = null;
  private wanderTimer = 0;
  expired = false;

  /** Called when helper mines a block */
  onBlockMined: ((blockType: BlockType, x: number, y: number, z: number) => void) | null = null;

  constructor(
    spawnPos: THREE.Vector3,
    mineTier: number,
    lifespanSeconds: number,
    scene: THREE.Scene,
  ) {
    this.position = spawnPos.clone();
    this.mineTier = mineTier;
    this.remainingTime = lifespanSeconds;

    this.mesh = new THREE.Group();

    // Body — friendly blue/teal color
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x44ccaa,
      roughness: 0.5,
      emissive: 0x224444,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 6, 4);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x66eebb,
      roughness: 0.4,
      emissive: 0x224444,
      emissiveIntensity: 0.3,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.0;
    head.castShadow = true;
    this.mesh.add(head);

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  get timeRemaining(): number {
    return this.remainingTime;
  }

  /** Extend lifespan by seconds (cloth usage) */
  extendLife(seconds: number): void {
    this.remainingTime += seconds;
  }

  update(dt: number, playerPos: THREE.Vector3, world: WorldManager, enemies: Enemy[]): void {
    if (this.expired) return;

    this.remainingTime -= dt;
    if (this.remainingTime <= 0) {
      this.expired = true;
      this.mesh.visible = false;
      return;
    }

    this.attackCD = Math.max(0, this.attackCD - dt);
    this.mineCD = Math.max(0, this.mineCD - dt);

    // Priority 1: attack nearby enemies
    const attacked = this.tryAttackEnemy(enemies);
    if (attacked) return;

    // Priority 2: mine nearby blocks
    const mined = this.tryMineBlock(world);
    if (mined) return;

    // Priority 3: wander near player
    this.wander(dt, playerPos, world);

    this.mesh.position.copy(this.position);
  }

  private tryAttackEnemy(enemies: Enemy[]): boolean {
    if (this.attackCD > 0) return false;

    let closest: Enemy | null = null;
    let closestDist = 2.0;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = this.position.distanceTo(enemy.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }

    if (closest) {
      closest.takeDamage(HELPER_ATTACK_DMG);
      this.attackCD = HELPER_ATTACK_CD;
      // Face enemy
      const dx = closest.position.x - this.position.x;
      const dz = closest.position.z - this.position.z;
      this.mesh.rotation.y = Math.atan2(dx, dz);
      return true;
    }

    return false;
  }

  private tryMineBlock(world: WorldManager): boolean {
    if (this.mineCD > 0) return false;

    // Scan nearby blocks to mine
    const bx = Math.floor(this.position.x / BLOCK_SIZE);
    const by = Math.floor(this.position.y / BLOCK_SIZE);
    const bz = Math.floor(this.position.z / BLOCK_SIZE);

    for (let dx = -HELPER_MINE_REACH; dx <= HELPER_MINE_REACH; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -HELPER_MINE_REACH; dz <= HELPER_MINE_REACH; dz++) {
          const tx = bx + dx;
          const ty = by + dy;
          const tz = bz + dz;
          const block = world.getBlock(tx, ty, tz);
          if (block === BlockType.Air) continue;
          const def = BLOCK_DEFS[block];
          if (!def || !def.solid || def.hardness === Infinity) continue;
          if (def.minTier > this.mineTier) continue;

          // Only mine ores (skip dirt/stone/grass)
          if (!def.dropItem || def.dropItem === 'dirt' || def.dropItem === 'stone') continue;

          // Mine it
          world.setBlock(tx, ty, tz, BlockType.Air);
          this.onBlockMined?.(block, tx, ty, tz);
          this.mineCD = HELPER_MINE_CD;
          return true;
        }
      }
    }

    return false;
  }

  private wander(dt: number, playerPos: THREE.Vector3, world: WorldManager): void {
    this.wanderTimer -= dt;

    // Check if too far from player — move back
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer > HELPER_WANDER_RADIUS || this.wanderTimer <= 0) {
      // Pick new wander target near player
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 4;
      this.wanderTarget = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * dist,
        playerPos.y,
        playerPos.z + Math.sin(angle) * dist,
      );
      this.wanderTimer = 2 + Math.random() * 3;
    }

    if (this.wanderTarget) {
      const dx = this.wanderTarget.x - this.position.x;
      const dz = this.wanderTarget.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.5) {
        const nx = dx / dist;
        const nz = dz / dist;
        const moveX = nx * HELPER_SPEED * dt;
        const moveZ = nz * HELPER_SPEED * dt;

        const newX = this.position.x + moveX;
        const newZ = this.position.z + moveZ;
        const checkBx = Math.floor(newX / BLOCK_SIZE);
        const checkBy = Math.floor(this.position.y / BLOCK_SIZE);
        const checkBz = Math.floor(newZ / BLOCK_SIZE);

        if (!world.isSolid(checkBx, checkBy, checkBz)) {
          this.position.x = newX;
          this.position.z = newZ;
        }
        this.mesh.rotation.y = Math.atan2(nx, nz);
      }
    }

    // Simple gravity
    const feetX = Math.floor(this.position.x / BLOCK_SIZE);
    const feetBlock = Math.floor(this.position.y / BLOCK_SIZE) - 1;
    const feetZ = Math.floor(this.position.z / BLOCK_SIZE);
    if (!world.isSolid(feetX, feetBlock, feetZ)) {
      this.position.y -= 4 * dt;
    }

    this.mesh.position.copy(this.position);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
