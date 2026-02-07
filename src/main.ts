import * as THREE from 'three';
import { WorldManager } from './world/WorldManager';
import { PlayerController } from './player/PlayerController';
import { MiningSystem } from './player/MiningSystem';
import { BLOCK_DEFS } from './config/blocks';
import { CombatSystem } from './player/CombatSystem';
import { ITEMS } from './config/items';
import { TIER_COLORS } from './config/types';
import { Inventory, GearSlot } from './player/Inventory';
import { NPC } from './npc/NPC';
import { EnemyManager } from './npc/EnemyManager';
import { HelperNPC } from './npc/HelperNPC';
import { TradingUI } from './ui/TradingUI';
import { TeleportSystem } from './world/TeleportSystem';
import { PhysicsWorld } from './physics/PhysicsWorld';

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

// --- Inventory ---
const inventory = new Inventory();

// --- Mining ---
const mining = new MiningSystem(world, player, scene);
mining.setInventory(inventory);
mining.onMineBlocked = (blockName) => {
  showPickupText(`Need better pickaxe for ${blockName}!`);
};
mining.onLadderPlaced = (_success, message) => {
  showPickupText(message);
};
mining.onBlockMined = (blockType, _x, _y, _z) => {
  const def = BLOCK_DEFS[blockType];
  if (def?.dropItem) {
    const added = inventory.addItem(def.dropItem);
    if (added > 0) {
      const itemDef = ITEMS[def.dropItem];
      const name = itemDef?.name ?? def.dropItem;
      showPickupText(`+1 ${name}`);
    } else {
      showPickupText('Inventory full!');
    }
  }
};

// --- NPCs ---
const buyerNPC = new NPC({
  name: 'Grumble the Buyer',
  position: new THREE.Vector3(5, 0.0, 5),
  color: 0x44aa44,
  interactRadius: 3,
}, scene);

const sellerNPC = new NPC({
  name: 'Sparkle the Seller',
  position: new THREE.Vector3(-5, 0.0, 5),
  color: 0x4488cc,
  interactRadius: 3,
}, scene);

const npcs = [buyerNPC, sellerNPC];

// --- Trading UI ---
const tradingUI = new TradingUI(inventory);
tradingUI.onToggle = (isOpen) => {
  if (isOpen) {
    document.exitPointerLock();
  }
};

// NPC interaction prompt
const npcPrompt = document.createElement('div');
npcPrompt.style.cssText = `
  position: fixed; bottom: 40%; left: 50%; transform: translateX(-50%);
  color: #88eeff; font-family: monospace; font-size: 15px; font-weight: bold;
  pointer-events: none; z-index: 100; text-shadow: 1px 1px 3px black;
  display: none;
`;
document.body.appendChild(npcPrompt);

let nearbyNPC: NPC | null = null;

// E key to interact with NPCs
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && nearbyNPC && !tradingUI.isOpen) {
    if (nearbyNPC === buyerNPC) {
      tradingUI.open(buyerNPC.name, 'sell');
    } else if (nearbyNPC === sellerNPC) {
      tradingUI.open(sellerNPC.name, 'buy');
    }
  }
});

// --- Teleport system ---
const teleportSystem = new TeleportSystem(world, scene);
teleportSystem.onTeleport = (fromLevel, toLevel) => {
  const label = toLevel === 0 ? 'Surface' : `Level ${toLevel}`;
  showPickupText(`Teleported to ${label}!`);
};

// --- Enemies ---
const enemyManager = new EnemyManager(scene, world);
enemyManager.onEnemyDeath = (enemy) => {
  const drops = enemy.rollDrops();
  for (const drop of drops) {
    const added = inventory.addItem(drop.itemId, drop.quantity);
    if (added > 0) {
      const name = ITEMS[drop.itemId]?.name ?? drop.itemId;
      showPickupText(`+${added} ${name}`);
    }
  }
};

// --- Physics ---
const physics = new PhysicsWorld();

// --- Combat ---
const combat = new CombatSystem(player, inventory);

// --- Helper NPC ---
let helper: HelperNPC | null = null;

function spawnHelper(): void {
  // Requires 6 bones + 1 brain
  if (!inventory.hasItem('bone', 6) || !inventory.hasItem('brain', 1)) {
    showPickupText('Need 6 Bones + 1 Brain to craft Helper!');
    return;
  }
  if (helper && !helper.expired) {
    showPickupText('Helper already active!');
    return;
  }
  inventory.removeItem('bone', 6);
  inventory.removeItem('brain', 1);

  const spawnPos = player.position.clone();
  spawnPos.x += 2;
  const mineTier = inventory.getMineTier();
  const lifespan = 600; // 10 minutes

  if (helper) helper.dispose(scene);
  helper = new HelperNPC(spawnPos, mineTier, lifespan, scene);
  helper.onBlockMined = (blockType, _x, _y, _z) => {
    const def = BLOCK_DEFS[blockType];
    if (def?.dropItem) {
      inventory.addItem(def.dropItem);
    }
  };
  showPickupText('Helper spawned! (10 min)');
  inventory.onChange?.();
}

// H key to craft helper, C key to feed cloth
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyH' && !tradingUI.isOpen) {
    spawnHelper();
  }
  if (e.code === 'KeyC' && !tradingUI.isOpen && helper && !helper.expired) {
    if (inventory.hasItem('cloth', 1)) {
      inventory.removeItem('cloth', 1);
      helper.extendLife(60); // +1 min
      showPickupText('Helper +1 min!');
      inventory.onChange?.();
    } else {
      showPickupText('No Cloth to feed Helper!');
    }
  }
});

// --- HUD: info overlay (top-left: depth + position) ---
const hud = document.createElement('div');
hud.style.cssText = `
  position: fixed; top: 10px; left: 10px; color: white; font-family: monospace;
  font-size: 14px; pointer-events: none; z-index: 100; text-shadow: 1px 1px 2px black;
`;
document.body.appendChild(hud);

// --- Health bar (bottom-left) ---
const healthBar = document.createElement('div');
healthBar.style.cssText = `
  position: fixed; bottom: 20px; left: 20px; pointer-events: none; z-index: 100;
  font-family: monospace; font-size: 12px; color: white; text-shadow: 1px 1px 2px black;
`;
healthBar.innerHTML = `
  <div style="margin-bottom:2px">HP</div>
  <div style="width:180px;height:14px;background:rgba(0,0,0,0.5);border-radius:3px;overflow:hidden">
    <div id="hp-fill" style="width:100%;height:100%;background:#44cc44;transition:width 0.3s"></div>
  </div>
  <div id="hp-text" style="font-size:11px;margin-top:1px">100/100</div>
`;
document.body.appendChild(healthBar);

const hpFill = document.getElementById('hp-fill')!;
const hpText = document.getElementById('hp-text')!;

function updateHealthBar(): void {
  const pct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  hpFill.style.width = `${pct}%`;
  // Color shifts: green > 50%, yellow > 25%, red <= 25%
  hpFill.style.background = pct > 50 ? '#44cc44' : pct > 25 ? '#ccaa22' : '#cc3333';
  hpText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
}

// --- Right-side HUD panel (money, equipped gear, inventory) ---
const sidePanel = document.createElement('div');
sidePanel.style.cssText = `
  position: fixed; top: 10px; right: 10px; color: white; font-family: monospace;
  font-size: 13px; pointer-events: none; z-index: 100; text-shadow: 1px 1px 2px black;
  background: rgba(0,0,0,0.45); padding: 10px 14px; border-radius: 6px;
  min-width: 170px; max-height: 70vh; overflow-y: auto;
`;
document.body.appendChild(sidePanel);

/** Format a gear slot line with tier color and enhancement stars */
function gearLine(label: string, slot: GearSlot): string {
  const def = inventory.getEquippedDef(slot);
  if (!def) return `<span style="color:#666">${label}: —</span>`;
  const color = def.tier !== undefined ? '#' + TIER_COLORS[def.tier].toString(16).padStart(6, '0') : '#fff';
  const level = inventory.getEnhancementLevel(slot);
  const stars = level > 0 ? ` <span style="color:#ffcc00">${'★'.repeat(level)}</span>` : '';
  return `<span style="color:${color}">${label}: ${def.name}${stars}</span>`;
}

function updateSidePanel(): void {
  const items = inventory.getAllItems();

  let html = `<b style="color:#ffdd44">$${inventory.money}</b><br>`;
  html += `<hr style="border-color:#555;margin:4px 0">`;

  // Equipped gear
  html += gearLine('Pick', 'pickaxe') + '<br>';
  html += gearLine('Weapon', 'weapon') + '<br>';
  html += gearLine('Armor', 'armor') + '<br>';
  html += gearLine('Bag', 'backpack') + '<br>';

  html += `<hr style="border-color:#555;margin:4px 0">`;
  html += `<span style="font-size:11px;color:#aaa">Bag: ${inventory.usedSlots}/${inventory.maxSlots}</span><br>`;

  if (items.length === 0) {
    html += `<span style="color:#666;font-size:12px">Empty</span>`;
  } else {
    for (const slot of items) {
      const def = ITEMS[slot.itemId];
      const name = def?.name ?? slot.itemId;
      html += `<span style="font-size:12px">${name} x${slot.quantity}</span><br>`;
    }
  }

  sidePanel.innerHTML = html;
}

// Update side panel when inventory changes
inventory.onChange = updateSidePanel;
updateSidePanel();

// --- Pickup text (floating feedback) ---
const pickupTextEl = document.createElement('div');
pickupTextEl.style.cssText = `
  position: fixed; bottom: 30%; left: 50%; transform: translateX(-50%);
  color: #ffdd44; font-family: monospace; font-size: 16px; font-weight: bold;
  pointer-events: none; z-index: 100; text-shadow: 1px 1px 3px black;
  opacity: 0; transition: opacity 0.3s;
`;
document.body.appendChild(pickupTextEl);

let pickupTimer: ReturnType<typeof setTimeout> | null = null;
function showPickupText(text: string): void {
  pickupTextEl.textContent = text;
  pickupTextEl.style.opacity = '1';
  if (pickupTimer) clearTimeout(pickupTimer);
  pickupTimer = setTimeout(() => {
    pickupTextEl.style.opacity = '0';
  }, 1200);
}

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
    Space — Jump &nbsp;|&nbsp; Hold Left Click — Mine<br>
    Right Click — Place Ladder &nbsp;|&nbsp; Space/Shift — Climb Up/Down<br>
    E — Talk to NPC &nbsp;|&nbsp; H — Craft Helper &nbsp;|&nbsp; C — Feed Cloth
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

  // Check teleport pads
  const teleportDest = teleportSystem.update(dt, player.position);
  if (teleportDest) {
    player.position.copy(teleportDest);
    player.velocity.set(0, 0, 0);
    player.onGround = false;
    // Update world chunks around new position
    world.update(player.position.x, player.position.y, player.position.z);
  }

  // Update physics world
  physics.update(dt);

  // Update enemies and combat
  if (!tradingUI.isOpen) {
    const enemyDmg = enemyManager.update(dt, player.position);
    if (enemyDmg > 0) {
      player.health = Math.max(0, player.health - enemyDmg);
    }
    combat.update(dt, enemyManager.enemies);

    // Update helper NPC
    if (helper && !helper.expired) {
      helper.update(dt, player.position, world, enemyManager.enemies);
    }
  }

  // Move sun shadow camera with player
  sun.position.set(
    player.position.x + 30,
    player.position.y + 50,
    player.position.z + 30,
  );
  sun.target.position.copy(player.position);
  sun.target.updateMatrixWorld();

  // NPC proximity check
  nearbyNPC = null;
  for (const npc of npcs) {
    if (npc.isInRange(player.position)) {
      nearbyNPC = npc;
      break;
    }
  }
  if (nearbyNPC && !tradingUI.isOpen) {
    npcPrompt.style.display = 'block';
    npcPrompt.textContent = `[E] Talk to ${nearbyNPC.name}`;
  } else {
    npcPrompt.style.display = 'none';
  }

  // HUD update
  const depth = Math.max(0, -player.position.y).toFixed(1);
  const pos = player.position;
  hud.textContent = `Depth: ${depth}m | Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
  updateHealthBar();

  renderer.render(scene, camera);
}

// Initial world generation
world.update(player.position.x, player.position.y, player.position.z);

// Place teleport pads after world is generated
teleportSystem.placePads();
// Re-update world to rebuild chunk meshes with teleport blocks
world.update(player.position.x, player.position.y, player.position.z);

animate();
console.log('Dig Deep to Victory — engine initialized');
