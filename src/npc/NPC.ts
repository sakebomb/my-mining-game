import * as THREE from 'three';

export interface NPCConfig {
  name: string;
  position: THREE.Vector3;
  color: number;
  interactRadius: number; // distance at which player can interact
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
