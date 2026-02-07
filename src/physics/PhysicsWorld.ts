import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRAVITY } from '../config/constants';

/**
 * Lightweight cannon-es physics world wrapper.
 * Provides physics simulation for dynamic objects (knockback, projectiles)
 * while voxel collision remains handled by the custom AABB system.
 */
export class PhysicsWorld {
  readonly world: CANNON.World;
  private bodies: Map<string, { body: CANNON.Body; mesh: THREE.Object3D }> = new Map();

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, GRAVITY, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 5;
  }

  /** Step the physics simulation */
  update(dt: number): void {
    this.world.step(1 / 60, dt, 3);

    // Sync meshes to physics bodies
    for (const [, { body, mesh }] of this.bodies) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      );
    }
  }

  /** Add a dynamic body tracked by the physics world */
  addDynamic(
    id: string,
    mesh: THREE.Object3D,
    mass: number,
    shape: CANNON.Shape,
  ): CANNON.Body {
    const body = new CANNON.Body({
      mass,
      shape,
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    });
    this.world.addBody(body);
    this.bodies.set(id, { body, mesh });
    return body;
  }

  /** Remove a tracked body */
  remove(id: string): void {
    const entry = this.bodies.get(id);
    if (entry) {
      this.world.removeBody(entry.body);
      this.bodies.delete(id);
    }
  }

  /** Apply an impulse to a body (e.g., knockback) */
  applyImpulse(id: string, impulse: THREE.Vector3): void {
    const entry = this.bodies.get(id);
    if (entry) {
      entry.body.applyImpulse(
        new CANNON.Vec3(impulse.x, impulse.y, impulse.z),
      );
    }
  }

  /** Get a body by ID */
  getBody(id: string): CANNON.Body | undefined {
    return this.bodies.get(id)?.body;
  }

  dispose(): void {
    for (const [, { body }] of this.bodies) {
      this.world.removeBody(body);
    }
    this.bodies.clear();
  }
}
