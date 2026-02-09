import * as THREE from 'three';
import { BLOCK_SIZE } from '../config/constants';

const MAX_ACTIVE_LIGHTS = 32;

/** Manages PointLights attached to placed Light blocks */
export class LightManager {
  private scene: THREE.Scene;
  private lights = new Map<string, THREE.PointLight>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private key(bx: number, by: number, bz: number): string {
    return `${bx},${by},${bz}`;
  }

  /** Add a PointLight at a block position. Returns false if at cap. */
  addLight(bx: number, by: number, bz: number): boolean {
    const k = this.key(bx, by, bz);
    if (this.lights.has(k)) return true; // already exists
    if (this.lights.size >= MAX_ACTIVE_LIGHTS) return false;

    const light = new THREE.PointLight(0xffdd44, 1.5, 8, 1);
    light.position.set(
      (bx + 0.5) * BLOCK_SIZE,
      (by + 0.5) * BLOCK_SIZE,
      (bz + 0.5) * BLOCK_SIZE,
    );
    this.scene.add(light);
    this.lights.set(k, light);
    return true;
  }

  /** Remove a PointLight at a block position */
  removeLight(bx: number, by: number, bz: number): void {
    const k = this.key(bx, by, bz);
    const light = this.lights.get(k);
    if (light) {
      this.scene.remove(light);
      light.dispose();
      this.lights.delete(k);
    }
  }

  get activeCount(): number {
    return this.lights.size;
  }

  dispose(): void {
    for (const [, light] of this.lights) {
      this.scene.remove(light);
      light.dispose();
    }
    this.lights.clear();
  }
}
