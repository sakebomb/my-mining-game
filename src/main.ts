import * as THREE from 'three';
import { WorldManager } from './world/WorldManager';
import { PlayerController } from './player/PlayerController';
import { MiningSystem } from './player/MiningSystem';
import { BLOCK_DEFS } from './config/blocks';

// --- Scene setup ---
const container = document.querySelector<HTMLDivElement>('#app')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.05,
  200,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// --- Lighting ---
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(30, 50, 30);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);

const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
scene.add(ambient);

// Hemisphere light for sky/ground color blending
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a3520, 0.4);
scene.add(hemi);

// --- World ---
const world = new WorldManager(scene);

// --- Player ---
const player = new PlayerController(camera, world);

// --- Mining ---
const mining = new MiningSystem(world, player, scene);
mining.onBlockMined = (blockType, _x, _y, _z) => {
  const def = BLOCK_DEFS[blockType];
  if (def?.dropItem) {
    console.log(`Mined ${def.name} → got ${def.dropItem}`);
    // TODO: add to inventory
  }
};

// --- HUD: simple info overlay ---
const hud = document.createElement('div');
hud.style.cssText = `
  position: fixed; top: 10px; left: 10px; color: white; font-family: monospace;
  font-size: 14px; pointer-events: none; z-index: 100; text-shadow: 1px 1px 2px black;
`;
document.body.appendChild(hud);

// Instructions overlay
const instructions = document.createElement('div');
instructions.style.cssText = `
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  color: white; font-family: sans-serif; font-size: 18px; text-align: center;
  pointer-events: none; z-index: 100; text-shadow: 1px 1px 4px black;
  background: rgba(0,0,0,0.5); padding: 20px 30px; border-radius: 8px;
`;
instructions.innerHTML = `
  <h2>Dig Deep to Victory</h2>
  <p>Click to start</p>
  <p style="font-size: 14px; margin-top: 10px;">
    WASD — Move &nbsp;|&nbsp; Mouse — Look<br>
    Space — Jump &nbsp;|&nbsp; Hold Left Click — Mine
  </p>
`;
document.body.appendChild(instructions);

document.addEventListener('pointerlockchange', () => {
  instructions.style.display = document.pointerLockElement ? 'none' : 'block';
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Game loop ---
const clock = new THREE.Clock();
let frameCount = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  frameCount++;

  // Update player
  player.update(dt);

  // Update world chunks around player (every 10 frames to reduce load)
  if (frameCount % 10 === 0) {
    world.update(player.position.x, player.position.y, player.position.z);
  }

  // Update mining
  mining.update(dt);

  // Move sun shadow camera with player
  sun.position.set(
    player.position.x + 30,
    player.position.y + 50,
    player.position.z + 30,
  );
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();

  // HUD update
  const depth = Math.max(0, -player.position.y).toFixed(1);
  const pos = player.position;
  hud.textContent = `Depth: ${depth}m | Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;

  renderer.render(scene, camera);
}

// Initial world generation
world.update(player.position.x, player.position.y, player.position.z);

animate();
console.log('Dig Deep to Victory — engine initialized');
