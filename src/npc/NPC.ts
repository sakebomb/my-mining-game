import * as THREE from 'three';

export interface NPCConfig {
  name: string;
  position: THREE.Vector3;
  color: number;
  interactRadius: number; // distance at which player can interact
  role?: string; // e.g. 'BUYER', 'SELLER' — shown on a sign beside the NPC
}

/**
 * Simple NPC represented as a colored capsule with a floating name label.
 * NPCs stand at fixed positions and can be interacted with when nearby.
 */
export class NPC {
  readonly name: string;
  readonly position: THREE.Vector3;
  readonly interactRadius: number;
  readonly mesh: THREE.Group;

  constructor(config: NPCConfig, scene: THREE.Scene) {
    this.name = config.name;
    this.position = config.position.clone();
    this.interactRadius = config.interactRadius;

    this.mesh = new THREE.Group();

    // Body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.mesh.add(body);

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    this.mesh.add(head);

    // Sign with role text
    if (config.role) {
      const signGroup = new THREE.Group();
      signGroup.position.set(1, 0, 0); // offset to the right of the NPC

      // Wooden post (stops below the sign board)
      const postGeo = new THREE.BoxGeometry(0.08, 1.0, 0.08);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.5;
      post.castShadow = true;
      signGroup.add(post);

      // Sign board
      const boardGeo = new THREE.BoxGeometry(0.8, 0.4, 0.1);
      const boardCanvas = document.createElement('canvas');
      boardCanvas.width = 128;
      boardCanvas.height = 64;
      const ctx = boardCanvas.getContext('2d')!;
      ctx.fillStyle = '#a0784c';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      // Wrap text onto two lines
      const words = config.role.split(' ');
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      if (line2) {
        ctx.fillText(line1, 64, 24);
        ctx.fillText(line2, 64, 48);
      } else {
        ctx.textBaseline = 'middle';
        ctx.fillText(line1, 64, 32);
      }
      const boardTex = new THREE.CanvasTexture(boardCanvas);
      const plainMat = new THREE.MeshStandardMaterial({ color: 0xa0784c, roughness: 0.8 });
      const textMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 });
      // Box faces: +x, -x, +y, -y, +z (front), -z (back)
      const board = new THREE.Mesh(boardGeo, [
        plainMat, plainMat, plainMat, plainMat, textMat, textMat,
      ]);
      board.position.y = 1.2;
      board.castShadow = true;
      signGroup.add(board);

      this.mesh.add(signGroup);
    }

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  /** Check if a world position is within interaction range */
  isInRange(playerPos: THREE.Vector3): boolean {
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    return Math.sqrt(dx * dx + dz * dz) <= this.interactRadius;
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
