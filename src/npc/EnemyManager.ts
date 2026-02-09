import * as THREE from 'three';
import { ENEMY_DEFS } from '../config/enemies';
import { BLOCK_SIZE } from '../config/constants';
import { WorldManager } from '../world/WorldManager';
import { Enemy } from './Enemy';

const MAX_ENEMIES = 8;
const SPAWN_INTERVAL = 5; // seconds between spawn attempts
const SPAWN_RADIUS_MIN = 8; // meters from player
const SPAWN_RADIUS_MAX = 20;
const DESPAWN_DISTANCE = 40;

/**
 * Manages enemy spawning and despawning based on player depth.
 */
export class EnemyManager {
  private scene: THREE.Scene;
  private world: WorldManager;
  readonly enemies: Enemy[] = [];
  private spawnTimer = 0;

  /** Called when enemy dies — return drops */
  onEnemyDeath: ((enemy: Enemy) => void) | null = null;

  constructor(scene: THREE.Scene, world: WorldManager) {
    this.scene = scene;
    this.world = world;
  }

  update(dt: number, playerPos: THREE.Vector3): number {
    let totalDamage = 0;

    // Update existing enemies
    for (const enemy of this.enemies) {
      const dmg = enemy.update(dt, playerPos, this.world);
      totalDamage += dmg;

      // Trigger drops when enemy starts dying (not after animation)
      if (enemy.isDying && !enemy.deathHandled) {
        enemy.deathHandled = true;
        this.onEnemyDeath?.(enemy);
      }
    }

    // Remove dead and despawned enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = enemy.position.distanceTo(playerPos);
      if (enemy.isDead || dist > DESPAWN_DISTANCE) {
        enemy.dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }

    // Spawn new enemies
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.enemies.length < MAX_ENEMIES) {
      this.spawnTimer = 0;
      this.trySpawn(playerPos);
    }

    return totalDamage;
  }

  private trySpawn(playerPos: THREE.Vector3): void {
    // Calculate depth level
    const depthLevel = Math.max(0, Math.floor(-playerPos.y / 1));

    // Filter eligible enemy types by depth
    const eligible = ENEMY_DEFS.filter(
      (def) => depthLevel >= def.minDepth && depthLevel <= def.maxDepth,
    );
    if (eligible.length === 0) return;

    // Pick random enemy type
    const def = eligible[Math.floor(Math.random() * eligible.length)];

    // Random spawn position around player (within radius)
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const spawnX = playerPos.x + Math.cos(angle) * dist;
    const spawnZ = playerPos.z + Math.sin(angle) * dist;

    // Find valid Y (non-solid block with solid below)
    const bx = Math.floor(spawnX / BLOCK_SIZE);
    const bz = Math.floor(spawnZ / BLOCK_SIZE);
    const byStart = Math.floor(playerPos.y / BLOCK_SIZE);

    // Scan downward from player level to find floor
    let spawnY: number | null = null;
    for (let by = byStart + 4; by >= byStart - 10; by--) {
      if (
        !this.world.isSolid(bx, by, bz) &&
        !this.world.isSolid(bx, by + 1, bz) &&
        this.world.isSolid(bx, by - 1, bz)
      ) {
        spawnY = by * BLOCK_SIZE;
        break;
      }
    }

    if (spawnY === null) return; // no valid position

    const isGlowing = Math.random() < def.glowChance;
    const spawnPos = new THREE.Vector3(spawnX, spawnY, spawnZ);
    const enemy = new Enemy(def, spawnPos, isGlowing, this.scene, depthLevel);
    this.enemies.push(enemy);
  }

  dispose(): void {
    for (const enemy of this.enemies) {
      enemy.dispose(this.scene);
    }
    this.enemies.length = 0;
  }
}
