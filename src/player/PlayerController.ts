import * as THREE from 'three';
import { WorldManager } from '../world/WorldManager';
import {
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_JUMP_FORCE,
  PLAYER_RADIUS,
  PLAYER_START_HEALTH,
  GRAVITY,
  BLOCK_SIZE,
} from '../config/constants';

/**
 * First-person player controller with:
 * - WASD movement
 * - Mouse look (pointer lock)
 * - Gravity + jumping
 * - Ladder climbing
 * - Simple AABB collision against voxel world
 */
export class PlayerController {
  readonly camera: THREE.PerspectiveCamera;
  private world: WorldManager;

  // Position / physics
  position = new THREE.Vector3(0, 5, 0);
  velocity = new THREE.Vector3(0, 0, 0);
  onGround = false;
  onLadder = false;

  // Health
  health = PLAYER_START_HEALTH;
  maxHealth = PLAYER_START_HEALTH;

  // Mouse look
  private yaw = 0;
  private pitch = 0;
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  // Input state
  private keys = new Map<string, boolean>();
  private isLocked = false;

  constructor(camera: THREE.PerspectiveCamera, world: WorldManager) {
    this.camera = camera;
    this.world = world;
    this.setupInputs();
  }

  private setupInputs(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    // Pointer lock
    document.addEventListener('click', () => {
      if (!this.isLocked) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === document.body;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * 0.002;
      this.pitch -= e.movementY * 0.002;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    });
  }

  private isKeyDown(code: string): boolean {
    return this.keys.get(code) === true;
  }

  update(dt: number): void {
    // Clamp dt to prevent tunneling on lag spikes
    dt = Math.min(dt, 0.05);

    // Check if player AABB overlaps any ladder block
    this.onLadder = this.checkLadderOverlap(this.position);

    // Movement direction from keys
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) moveDir.z -= 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) moveDir.z += 1;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) moveDir.x -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    // Rotate movement by yaw
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const worldMoveX = moveDir.x * cosYaw - moveDir.z * sinYaw;
    const worldMoveZ = moveDir.x * sinYaw + moveDir.z * cosYaw;

    // Apply horizontal velocity
    this.velocity.x = worldMoveX * PLAYER_SPEED;
    this.velocity.z = worldMoveZ * PLAYER_SPEED;

    if (this.onLadder) {
      // On ladder: suppress gravity, allow vertical movement
      const climbSpeed = PLAYER_SPEED * 0.7;
      if (this.isKeyDown('Space')) {
        this.velocity.y = climbSpeed; // climb up
      } else if (this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight')) {
        this.velocity.y = -climbSpeed; // climb down
      } else if (moveDir.z < 0) {
        // W key: climb up (forward = up on ladder)
        this.velocity.y = climbSpeed;
      } else if (moveDir.z > 0) {
        // S key: climb down
        this.velocity.y = -climbSpeed;
      } else {
        this.velocity.y = 0; // cling to ladder
      }
      this.onGround = false;
    } else {
      // Normal gravity
      this.velocity.y += GRAVITY * dt;

      // Jump
      if ((this.isKeyDown('Space') || this.isKeyDown('KeySpace')) && this.onGround) {
        this.velocity.y = PLAYER_JUMP_FORCE;
        this.onGround = false;
      }
    }

    // Move + collide each axis separately
    this.moveAxis(0, this.velocity.x * dt);
    this.moveAxis(1, this.velocity.y * dt);
    this.moveAxis(2, this.velocity.z * dt);

    // Update camera
    this.euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
    this.camera.position.copy(this.position);
    this.camera.position.y += PLAYER_HEIGHT - 0.1; // eye height
  }

  private moveAxis(axis: number, delta: number): void {
    const newPos = this.position.clone();
    if (axis === 0) newPos.x += delta;
    else if (axis === 1) newPos.y += delta;
    else newPos.z += delta;

    // Check collision with AABB around player
    if (this.collidesAt(newPos)) {
      // On Y axis, check if we landed
      if (axis === 1) {
        if (delta < 0) {
          this.onGround = true;
        }
        this.velocity.y = 0;
      }
      return; // don't move
    }

    if (axis === 0) this.position.x = newPos.x;
    else if (axis === 1) {
      this.position.y = newPos.y;
      this.onGround = false;
    }
    else this.position.z = newPos.z;
  }

  private collidesAt(pos: THREE.Vector3): boolean {
    // Player AABB: centered at pos.x, pos.z; from pos.y to pos.y + PLAYER_HEIGHT
    const minX = pos.x - PLAYER_RADIUS;
    const maxX = pos.x + PLAYER_RADIUS;
    const minY = pos.y;
    const maxY = pos.y + PLAYER_HEIGHT;
    const minZ = pos.z - PLAYER_RADIUS;
    const maxZ = pos.z + PLAYER_RADIUS;

    // Check all blocks that the AABB overlaps
    const bMinX = Math.floor(minX / BLOCK_SIZE);
    const bMaxX = Math.floor(maxX / BLOCK_SIZE);
    const bMinY = Math.floor(minY / BLOCK_SIZE);
    const bMaxY = Math.floor(maxY / BLOCK_SIZE);
    const bMinZ = Math.floor(minZ / BLOCK_SIZE);
    const bMaxZ = Math.floor(maxZ / BLOCK_SIZE);

    for (let bx = bMinX; bx <= bMaxX; bx++) {
      for (let by = bMinY; by <= bMaxY; by++) {
        for (let bz = bMinZ; bz <= bMaxZ; bz++) {
          if (this.world.isSolid(bx, by, bz)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Check if player AABB overlaps any ladder block */
  private checkLadderOverlap(pos: THREE.Vector3): boolean {
    const minX = pos.x - PLAYER_RADIUS;
    const maxX = pos.x + PLAYER_RADIUS;
    const minY = pos.y;
    const maxY = pos.y + PLAYER_HEIGHT;
    const minZ = pos.z - PLAYER_RADIUS;
    const maxZ = pos.z + PLAYER_RADIUS;

    const bMinX = Math.floor(minX / BLOCK_SIZE);
    const bMaxX = Math.floor(maxX / BLOCK_SIZE);
    const bMinY = Math.floor(minY / BLOCK_SIZE);
    const bMaxY = Math.floor(maxY / BLOCK_SIZE);
    const bMinZ = Math.floor(minZ / BLOCK_SIZE);
    const bMaxZ = Math.floor(maxZ / BLOCK_SIZE);

    for (let bx = bMinX; bx <= bMaxX; bx++) {
      for (let by = bMinY; by <= bMaxY; by++) {
        for (let bz = bMinZ; bz <= bMaxZ; bz++) {
          if (this.world.isLadder(bx, by, bz)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** Get the direction the player is looking */
  getLookDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);
    return dir;
  }
}
