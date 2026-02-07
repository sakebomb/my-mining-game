# Dig Deep to Victory

Browser-based 3D first-person voxel mining game. Dig through procedural underground layers, mine tiered ores, fight melee enemies, trade at surface NPCs, upgrade gear, and buy the Victory Scepter to win.

Single-player PWA — no backend, no multiplayer. Installable on tablets.

## Quick Start

```bash
npm install
npm run dev        # dev server with hot reload
```

Open `http://localhost:5173` in your browser.

## Build & Commands

```bash
npm run build      # production build → dist/
npm run preview    # preview production build
npm run test       # run tests (vitest)
npm run lint       # lint with ESLint
npm run format     # format with Prettier
```

## Tech Stack

- **TypeScript** (strict mode)
- **Three.js** r168+ — PBR materials, shadows, bloom post-processing
- **Vite** — bundler with hot reload
- **cannon-es** — physics (gravity, collisions)
- **Howler.js** — spatial audio
- **nipplejs** — touch joystick for mobile
- **idb** — IndexedDB wrapper for save/load
- **PWA** — service worker + manifest for installable tablet experience

## Controls

| Action | PC | Tablet |
|---|---|---|
| Move | WASD | Virtual joystick |
| Look | Mouse | Swipe |
| Mine / Attack | Hold left-click | Tap-hold |
| Jump | Space | Jump button |
| Craft Helper | H | H |
| Feed Helper | C | C |

## Game Systems

### World
- Chunk-based voxel system (16x16x16, 0.5m blocks)
- 50 levels deep with procedural ore generation
- Ladders (placeable) and bidirectional teleport pads at depths 10/20/30/40
- 500m invisible world boundaries

### Progression
8 tiers following rainbow progression: Stone → Red → Orange → Yellow → Green → Blue → Indigo → Violet → White (Diamond). Higher-tier pickaxes unlock deeper ores.

### Combat
Underground enemies — Zombie (brain drops), Skeleton (bone drops), Mummy (cloth drops). Glowing variants (10-15% chance) have double drop rates.

### Economy
- **Buyer NPC** — sell ores and enemy drops for money
- **Seller NPC** — buy gear (pickaxes, weapons, armor, backpacks)
- **Enhancements** — upgrade gear up to +5 using bones/brains/cloth

### Helper NPC
Craft with 6 bones + 1 brain. 10-minute lifespan (+1 min per cloth fed). Uses your pickaxe tier at time of creation; AI mines and fights nearby.

### Save System
IndexedDB auto-save every 30 seconds and on page blur. Stores money, gear, enhancements, inventory, world seed, and player position.

### Win Condition
Purchase the Victory Scepter (costs sum of all other items + 10 diamonds) to win.

## Project Structure

```
src/
├── audio/       AudioManager — spatial audio, procedural sounds
├── config/      Game data (blocks, ores, items, enemies, constants, types)
├── effects/     Break particles
├── input/       Touch controls (nipplejs)
├── npc/         Enemy, EnemyManager, HelperNPC, surface NPCs
├── physics/     cannon-es integration
├── player/      PlayerController, MiningSystem, CombatSystem, Inventory
├── save/        IndexedDB save/load
├── ui/          TradingUI, WinScreen
├── utils/       Noise functions for procedural generation
├── world/       Chunk, WorldManager, TeleportSystem
└── main.ts      Entry point — scene setup, game loop
```

## License

Private project.
