# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based 3D first-person voxel mining game ("Dig Deep to Victory"). Single-player PWA — no backend, no multiplayer. Full design spec lives in `.ralph/PROMPT.md`.

**Core loop:** Dig procedural voxel world (50 levels deep, 0.5m blocks) → mine tiered ores → fight melee enemies → trade at surface NPCs → upgrade gear → buy Victory Scepter to win.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Renderer:** Three.js (r168+) with PBR materials, shadows, bloom/glow post-processing
- **Bundler:** Vite
- **Physics:** cannon-es
- **Audio:** Howler.js (spatial audio)
- **Touch controls:** nipple.js or custom joystick
- **Persistence:** IndexedDB via `idb` library (auto-save every 30s + on blur)
- **PWA:** Service worker + manifest for installable tablet experience
- **Assets:** Free GLTF models (Kenney.nl, Mixamo); tint/emissive shaders for tier coloring

## Build & Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (hot reload)
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run test         # run test suite (vitest)
npm run test -- --run src/path/to/file.test.ts  # run single test file
npm run lint         # lint with ESLint
npm run format       # format with Prettier
```

## Architecture

### World & Voxels
- Chunk-based voxel system (16×16×16 chunks) with LOD and frustum culling for 60 FPS on tablets
- Block size: 0.5×0.5×0.5m. Surface is level 0; max depth is level 50
- Procedural ore generation embedded in dirt/stone layers — ore rarity increases with depth
- World uses a seed for deterministic generation; seed stored in save data

### Game Systems (config-driven)
- **Items, gear, enemies** defined in JSON config files — not hardcoded. Tier system uses rainbow progression (red → orange → yellow → green → blue → indigo → violet → white)
- **Enhancements:** Items can be enhanced up to 5 times using enemy drops (bone/brain/cloth), each with different success rates
- **Combat:** All melee, close-range. Enemies spawn underground; glowing variants (10-15% chance) have double drop rates
- **Helper NPC:** Craftable companion (6 bones + 1 brain), 10-min lifespan (+1 min per cloth), uses player's pickaxe tier at time of creation

### Controls (dual-input)
- **PC:** WASD movement, mouse look, space jump, hold left-click to mine/attack
- **Tablet:** Virtual joystick (movement), swipe (look), tap-hold (mine/attack), jump button

### Save System
- IndexedDB stores: money, equipped gear, enhancements, inventory contents, world seed, player position/depth
- Auto-saves every 30 seconds and on page blur
- Manual reset button available

## Ralph Workflow

This project uses Ralph (`.ralph/` directory) for autonomous development:
- `.ralph/PROMPT.md` — full game design specification (source of truth for features)
- `.ralph/fix_plan.md` — prioritized task checklist (update as tasks complete)
- `.ralph/AGENT.md` — build/test/run commands for Ralph loops
- `.ralph/logs/` — execution history

## Git Conventions

- **Branch naming:** `feat/<desc>`, `fix/<desc>`, `chore/<desc>`, `refactor/<desc>`
- **Commits:** Conventional Commits format: `type(scope): description`
- **Never commit directly to `main`** — use feature branches
- **Remote:** `https://github.com/sakebomb/my-mining-game`
