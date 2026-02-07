import * as THREE from 'three';
import { WorldManager } from '../world/WorldManager';
import { PlayerController } from './PlayerController';
import { BlockType } from '../config/types';
import { BLOCK_DEFS } from '../config/blocks';
import { MINE_REACH, BLOCK_SIZE, MINE_INTERVAL } from '../config/constants';
import { Inventory } from './Inventory';

interface MineTarget {
  blockX: number;
  blockY: number;
  blockZ: number;
  blockType: BlockType;
  hitsRemaining: number;
  faceNormal: THREE.Vector3;
}

/**
 * Handles block mining via raycasting from the player's view.
 * Hold left-click to mine. Visual crosshair + highlight.
 */
export class MiningSystem {
  private world: WorldManager;
  private player: PlayerController;
  private scene: THREE.Scene;
  private inventory: Inventory | null = null;

  // Mining state
  private isMining = false;
  private mineTimer = 0;
  private currentTarget: MineTarget | null = null;

  // Visual indicators
  private crosshair: HTMLDivElement;
  private highlightMesh: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  // Callback when a block is mined
  onBlockMined: ((blockType: BlockType, x: number, y: number, z: number) => void) | null = null;

  // Callback when mining is blocked by tier
  onMineBlocked: ((blockName: string) => void) | null = null;

  // Callback when a ladder placement is attempted
  onLadderPlaced: ((success: boolean, message: string) => void) | null = null;

  // Right-click state for ladder placement
  private isRightClick = false;

  constructor(world: WorldManager, player: PlayerController, scene: THREE.Scene) {
    this.world = world;
    this.player = player;
    this.scene = scene;

    // Crosshair
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 4px; height: 4px; background: white; border-radius: 50%;
      pointer-events: none; z-index: 100; mix-blend-mode: difference;
    `;
    document.body.appendChild(this.crosshair);

    // Block highlight wireframe
    const highlightGeo = new THREE.BoxGeometry(BLOCK_SIZE + 0.01, BLOCK_SIZE + 0.01, BLOCK_SIZE + 0.01);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    this.setupInputs();
  }

  /** Connect inventory for tier gating and mine speed */
  setInventory(inv: Inventory): void {
    this.inventory = inv;
  }

  private setupInputs(): void {
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.isMining = true;
      if (e.button === 2) this.isRightClick = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMining = false;
        this.currentTarget = null;
      }
      if (e.button === 2) this.isRightClick = false;
    });
    // Prevent context menu on right-click
    window.addEventListener('contextmenu', (e) => {
      if (document.pointerLockElement) {
        e.preventDefault();
      }
    });
  }

  update(dt: number): void {
    // Raycast to find targeted block
    const target = this.raycastBlock();

    if (target) {
      // Show highlight
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        (target.blockX + 0.5) * BLOCK_SIZE,
        (target.blockY + 0.5) * BLOCK_SIZE,
        (target.blockZ + 0.5) * BLOCK_SIZE,
      );
    } else {
      this.highlightMesh.visible = false;
    }

    // Handle right-click ladder placement
    if (this.isRightClick && target) {
      this.isRightClick = false; // consume the click (one placement per click)
      this.placeLadder(target);
    }

    // Handle mining
    if (this.isMining && target) {
      // Tier gate: check if pickaxe is strong enough
      const blockDef = BLOCK_DEFS[target.blockType];
      const playerTier = this.inventory?.getMineTier() ?? 0;
      if (blockDef && playerTier < blockDef.minTier) {
        // Can't mine this block — pickaxe tier too low
        this.onMineBlocked?.(blockDef.name);
        this.currentTarget = null;
        this.mineTimer = 0;
      } else {
        // Check if target changed
        if (
          !this.currentTarget ||
          this.currentTarget.blockX !== target.blockX ||
          this.currentTarget.blockY !== target.blockY ||
          this.currentTarget.blockZ !== target.blockZ
        ) {
          this.currentTarget = target;
          this.mineTimer = 0;
        }

        // Mine speed multiplier from pickaxe
        const mineSpeed = this.inventory?.getMineSpeed() ?? 1;
        this.mineTimer += dt * 1000 * mineSpeed;
        if (this.mineTimer >= MINE_INTERVAL) {
          this.mineTimer -= MINE_INTERVAL;
          this.currentTarget.hitsRemaining--;

          if (this.currentTarget.hitsRemaining <= 0) {
            // Block broken!
            const { blockX, blockY, blockZ, blockType } = this.currentTarget;
            this.world.setBlock(blockX, blockY, blockZ, BlockType.Air);
            this.onBlockMined?.(blockType, blockX, blockY, blockZ);
            this.currentTarget = null;
          }
        }
      }
    } else {
      this.currentTarget = null;
      this.mineTimer = 0;
    }
  }

  /**
   * Step-based voxel raycast (DDA algorithm).
   * Returns the first solid block hit within MINE_REACH.
   */
  private raycastBlock(): MineTarget | null {
    const origin = this.player.camera.position.clone();
    const direction = this.player.getLookDirection();

    // DDA voxel traversal
    let x = Math.floor(origin.x / BLOCK_SIZE);
    let y = Math.floor(origin.y / BLOCK_SIZE);
    let z = Math.floor(origin.z / BLOCK_SIZE);

    const stepX = direction.x >= 0 ? 1 : -1;
    const stepY = direction.y >= 0 ? 1 : -1;
    const stepZ = direction.z >= 0 ? 1 : -1;

    const tDeltaX = direction.x !== 0 ? Math.abs(BLOCK_SIZE / direction.x) : Infinity;
    const tDeltaY = direction.y !== 0 ? Math.abs(BLOCK_SIZE / direction.y) : Infinity;
    const tDeltaZ = direction.z !== 0 ? Math.abs(BLOCK_SIZE / direction.z) : Infinity;

    let tMaxX = direction.x !== 0
      ? ((stepX > 0 ? (x + 1) * BLOCK_SIZE - origin.x : x * BLOCK_SIZE - origin.x) / direction.x)
      : Infinity;
    let tMaxY = direction.y !== 0
      ? ((stepY > 0 ? (y + 1) * BLOCK_SIZE - origin.y : y * BLOCK_SIZE - origin.y) / direction.y)
      : Infinity;
    let tMaxZ = direction.z !== 0
      ? ((stepZ > 0 ? (z + 1) * BLOCK_SIZE - origin.z : z * BLOCK_SIZE - origin.z) / direction.z)
      : Infinity;

    const maxSteps = Math.ceil(MINE_REACH / BLOCK_SIZE) * 2;
    const normal = new THREE.Vector3();

    for (let i = 0; i < maxSteps; i++) {
      const block = this.world.getBlock(x, y, z);
      if (block !== BlockType.Air) {
        const def = BLOCK_DEFS[block];
        // Target solid blocks AND ladder blocks (ladders are non-solid but interactable)
        if (def && (def.solid || block === BlockType.Ladder)) {
          return {
            blockX: x,
            blockY: y,
            blockZ: z,
            blockType: block,
            hitsRemaining: def.hardness,
            faceNormal: normal.clone(),
          };
        }
      }

      // Step to next voxel boundary
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          if (tMaxX > MINE_REACH) break;
          x += stepX;
          tMaxX += tDeltaX;
          normal.set(-stepX, 0, 0);
        } else {
          if (tMaxZ > MINE_REACH) break;
          z += stepZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      } else {
        if (tMaxY < tMaxZ) {
          if (tMaxY > MINE_REACH) break;
          y += stepY;
          tMaxY += tDeltaY;
          normal.set(0, -stepY, 0);
        } else {
          if (tMaxZ > MINE_REACH) break;
          z += stepZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      }
    }

    return null;
  }

  /** Place a ladder on the face of the targeted block */
  private placeLadder(target: MineTarget): void {
    if (!this.inventory) return;

    // Check if player has ladders
    if (!this.inventory.hasItem('ladder', 1)) {
      this.onLadderPlaced?.(false, 'No ladders in inventory!');
      return;
    }

    // Place adjacent to the targeted block face
    const placeX = target.blockX + Math.round(target.faceNormal.x);
    const placeY = target.blockY + Math.round(target.faceNormal.y);
    const placeZ = target.blockZ + Math.round(target.faceNormal.z);

    // Check that the placement spot is air
    const existing = this.world.getBlock(placeX, placeY, placeZ);
    if (existing !== BlockType.Air) {
      this.onLadderPlaced?.(false, 'Can\'t place ladder there!');
      return;
    }

    // Place the ladder
    this.world.setBlock(placeX, placeY, placeZ, BlockType.Ladder);
    this.inventory.removeItem('ladder', 1);
    this.onLadderPlaced?.(true, 'Ladder placed!');
  }

  dispose(): void {
    this.crosshair.remove();
    this.scene.remove(this.highlightMesh);
    this.highlightMesh.geometry.dispose();
    (this.highlightMesh.material as THREE.Material).dispose();
  }
}
