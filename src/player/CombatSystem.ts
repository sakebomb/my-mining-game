import * as THREE from 'three';
import { PlayerController } from './PlayerController';
import { Inventory } from './Inventory';
import { Enemy } from '../npc/Enemy';
import { ENHANCEMENT_STAT_BOOST } from '../config/constants';

const ATTACK_REACH = 2.5; // meters
const ATTACK_INTERVAL = 400; // ms between attacks
const ATTACK_CONE = Math.cos(Math.PI / 6); // 30-degree half-angle

/**
 * Handles player melee attacks on enemies.
 * Left-click while looking at enemy deals weapon damage.
 */
export class CombatSystem {
  private player: PlayerController;
  private inventory: Inventory;
  private isAttacking = false;
  private attackTimer = 0;

  constructor(player: PlayerController, inventory: Inventory) {
    this.player = player;
    this.inventory = inventory;

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.isAttacking = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isAttacking = false;
    });
  }

  /** Get weapon damage including enhancement bonus */
  private getWeaponDamage(): number {
    const weapon = this.inventory.getEquippedDef('weapon');
    const baseDmg = weapon?.stats?.damage ?? 3; // bare-fist fallback
    const enhanceLevel = this.inventory.getEnhancementLevel('weapon');
    return baseDmg * (1 + enhanceLevel * ENHANCEMENT_STAT_BOOST);
  }

  /**
   * Update combat. Call each frame with current enemies list.
   * Returns the enemy that was hit this frame (if any).
   */
  update(dt: number, enemies: Enemy[]): Enemy | null {
    this.attackTimer = Math.max(0, this.attackTimer - dt * 1000);

    if (!this.isAttacking || this.attackTimer > 0) return null;

    // Find closest enemy in view cone
    const origin = this.player.camera.position;
    const lookDir = this.player.getLookDirection();
    let bestEnemy: Enemy | null = null;
    let bestDist = ATTACK_REACH;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      // Enemy center is at position + half height
      const enemyCenter = enemy.position.clone();
      enemyCenter.y += 0.6;

      const toEnemy = enemyCenter.clone().sub(origin);
      const dist = toEnemy.length();
      if (dist > ATTACK_REACH) continue;

      // Check view cone
      toEnemy.normalize();
      const dot = toEnemy.dot(lookDir);
      if (dot < ATTACK_CONE) continue;

      if (dist < bestDist) {
        bestDist = dist;
        bestEnemy = enemy;
      }
    }

    if (bestEnemy) {
      const dmg = this.getWeaponDamage();
      bestEnemy.takeDamage(dmg);
      this.attackTimer = ATTACK_INTERVAL;

      // Apply knockback in the look direction
      const knockDir = this.player.getLookDirection().clone();
      knockDir.y = 0;
      knockDir.normalize();
      bestEnemy.applyKnockback(knockDir, 5);

      return bestEnemy;
    }

    return null;
  }
}
