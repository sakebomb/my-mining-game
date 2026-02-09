import * as THREE from 'three';
import { EnemyDef } from '../config/types';
import { BLOCK_SIZE, GRAVITY } from '../config/constants';
import { WorldManager } from '../world/WorldManager';

const ENEMY_COLORS: Record<string, number> = {
  zombie: 0x558833,
  skeleton: 0xccccaa,
  mummy: 0xaa9966,
};

const GLOW_EMISSIVE = 0x44ff88;

/**
 * A single enemy entity with 3D mesh, simple AI, and combat stats.
 */
export class Enemy {
  readonly def: EnemyDef;
  readonly isGlowing: boolean;
  health: number;
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  velocity = new THREE.Vector3();
  private attackCooldown = 0;
  private onGround = false;

  /** Set to true when dead and animation finished (ready for cleanup) */
  isDead = false;

  /** True during death animation (publicly readable for drop collection) */
  isDying = false;
  /** Set by EnemyManager after processing death drops */
  deathHandled = false;
  private deathTimer = 0;
  private static readonly DEATH_ANIM_DURATION = 0.5;

  /** Depth-based stat multiplier: 1.0 at surface, 2.0 at max depth */
  private readonly scaleFactor: number;

  constructor(def: EnemyDef, spawnPos: THREE.Vector3, isGlowing: boolean, scene: THREE.Scene, depthLevel = 0) {
    this.def = def;
    this.isGlowing = isGlowing;
    this.scaleFactor = 1 + (depthLevel / 50);
    this.health = Math.round(def.health * this.scaleFactor);
    this.position = spawnPos.clone();

    this.mesh = new THREE.Group();

    const baseColor = ENEMY_COLORS[def.type] ?? 0x888888;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.9, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      emissive: isGlowing ? GLOW_EMISSIVE : 0x000000,
      emissiveIntensity: isGlowing ? 0.4 : 0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    this.mesh.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const headMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.6,
      emissive: isGlowing ? GLOW_EMISSIVE : 0x000000,
      emissiveIntensity: isGlowing ? 0.3 : 0,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.1;
    head.castShadow = true;
    this.mesh.add(head);

    // Eyes (red dots)
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.08, 1.15, 0.18);
    this.mesh.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.08, 1.15, 0.18);
    this.mesh.add(eyeR);

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  /**
   * Simple AI: move toward player if within detection range.
   * Returns damage dealt to player this frame (0 if not attacking).
   */
  update(dt: number, playerPos: THREE.Vector3, world: WorldManager): number {
    if (this.isDead) return 0;

    // Death animation: shrink and fade over DEATH_ANIM_DURATION
    if (this.isDying) {
      this.deathTimer -= dt;
      const t = Math.max(0, this.deathTimer / Enemy.DEATH_ANIM_DURATION);
      this.mesh.scale.setScalar(t);
      this.mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.MeshStandardMaterial).opacity = t;
        }
      });
      if (this.deathTimer <= 0) {
        this.isDead = true;
        this.mesh.visible = false;
      }
      return 0;
    }

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;
    const detectionRange = 12;

    let dmg = 0;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (distSq < detectionRange * detectionRange) {
      const dist = Math.sqrt(distSq);
      if (dist > 1.0) {
        // Move toward player
        const nx = dx / dist;
        const nz = dz / dist;
        const speed = this.def.speed;
        const moveX = nx * speed * dt;
        const moveZ = nz * speed * dt;

        // Simple collision: check if target position is solid
        const newX = this.position.x + moveX;
        const newZ = this.position.z + moveZ;
        const bx = Math.floor(newX / BLOCK_SIZE);
        const by = Math.floor(this.position.y / BLOCK_SIZE);
        const bz = Math.floor(newZ / BLOCK_SIZE);

        if (!world.isSolid(bx, by, bz) && !world.isSolid(bx, by + 1, bz)) {
          this.position.x = newX;
          this.position.z = newZ;
        }

        // Face toward player
        this.mesh.rotation.y = Math.atan2(nx, nz);
      }

      // Attack if close enough
      if (dist < 1.5 && this.attackCooldown <= 0) {
        const [minDmg, maxDmg] = this.def.meleeDmg;
        dmg = (minDmg + Math.random() * (maxDmg - minDmg)) * this.scaleFactor;
        this.attackCooldown = 1.0; // 1 second between attacks
      }
    }

    // Gravity with proper acceleration
    this.velocity.y += GRAVITY * dt;

    // Apply vertical velocity
    const newY = this.position.y + this.velocity.y * dt;
    const feetX = Math.floor(this.position.x / BLOCK_SIZE);
    const feetZ = Math.floor(this.position.z / BLOCK_SIZE);
    const feetBlock = Math.floor(newY / BLOCK_SIZE) - 1;

    if (this.velocity.y <= 0 && world.isSolid(feetX, feetBlock, feetZ)) {
      // Landed on ground
      this.velocity.y = 0;
      this.onGround = true;
      // Snap to top of block
      this.position.y = (feetBlock + 1) * BLOCK_SIZE;
    } else {
      this.position.y = newY;
      this.onGround = false;
    }

    // Apply knockback (horizontal velocity decays)
    if (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01) {
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      // Friction/decay
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;
    }

    this.mesh.position.copy(this.position);
    return dmg;
  }

  takeDamage(amount: number): void {
    if (this.isDying || this.isDead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDying = true;
      this.deathTimer = Enemy.DEATH_ANIM_DURATION;
      // Make materials transparent for fade-out
      this.mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
        }
      });
    }
  }

  /** Apply knockback impulse (direction should be normalized) */
  applyKnockback(direction: THREE.Vector3, force: number): void {
    this.velocity.x += direction.x * force;
    this.velocity.y += Math.max(2, force * 0.3); // slight upward pop
    this.velocity.z += direction.z * force;
  }

  /** Get drops on death (respects glowing 2x rate) */
  rollDrops(): { itemId: string; quantity: number }[] {
    const drops: { itemId: string; quantity: number }[] = [];
    for (const [itemId, chance] of Object.entries(this.def.drops)) {
      const effectiveChance = this.isGlowing ? chance * 2 : chance;
      if (Math.random() < effectiveChance) {
        drops.push({ itemId, quantity: 1 });
      }
    }
    return drops;
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
