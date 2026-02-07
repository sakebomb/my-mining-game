import * as THREE from 'three';
import { BLOCK_SIZE } from '../config/constants';

const PARTICLE_COUNT = 12;
const PARTICLE_LIFE = 0.6; // seconds
const GRAVITY = 9.8;

interface ParticleBurst {
  mesh: THREE.Points;
  velocities: Float32Array;
  age: number;
}

/**
 * Spawns small cube-colored particles when a block is mined.
 * Uses a pool of point-sprite bursts recycled after they expire.
 */
export class BreakParticles {
  private scene: THREE.Scene;
  private bursts: ParticleBurst[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Spawn a burst of particles at the given block position */
  emit(wx: number, wy: number, wz: number, color: number): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    const center = new THREE.Vector3(
      (wx + 0.5) * BLOCK_SIZE,
      (wy + 0.5) * BLOCK_SIZE,
      (wz + 0.5) * BLOCK_SIZE,
    );

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = center.x + (Math.random() - 0.5) * BLOCK_SIZE * 0.5;
      positions[i3 + 1] = center.y + (Math.random() - 0.5) * BLOCK_SIZE * 0.5;
      positions[i3 + 2] = center.z + (Math.random() - 0.5) * BLOCK_SIZE * 0.5;

      velocities[i3] = (Math.random() - 0.5) * 3;
      velocities[i3 + 1] = Math.random() * 2 + 1;
      velocities[i3 + 2] = (Math.random() - 0.5) * 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: BLOCK_SIZE * 0.3,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    this.bursts.push({ mesh, velocities, age: 0 });
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.age += dt;

      if (burst.age >= PARTICLE_LIFE) {
        this.scene.remove(burst.mesh);
        burst.mesh.geometry.dispose();
        (burst.mesh.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      const posAttr = burst.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;

      for (let j = 0; j < PARTICLE_COUNT; j++) {
        const j3 = j * 3;
        pos[j3] += burst.velocities[j3] * dt;
        pos[j3 + 1] += burst.velocities[j3 + 1] * dt;
        pos[j3 + 2] += burst.velocities[j3 + 2] * dt;
        burst.velocities[j3 + 1] -= GRAVITY * dt;
      }
      posAttr.needsUpdate = true;

      // Fade out
      const mat = burst.mesh.material as THREE.PointsMaterial;
      mat.opacity = 1 - burst.age / PARTICLE_LIFE;
    }
  }

  dispose(): void {
    for (const burst of this.bursts) {
      this.scene.remove(burst.mesh);
      burst.mesh.geometry.dispose();
      (burst.mesh.material as THREE.Material).dispose();
    }
    this.bursts.length = 0;
  }
}
