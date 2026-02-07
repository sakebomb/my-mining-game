# Ralph Fix Plan — Dig Deep to Victory

## Phase 1: Core Engine (MVP Gameplay Loop)
- [x] Scaffold Vite + TypeScript project with game configs
- [x] Game config system (block types, ore tiers, items, enemies)
- [x] Voxel chunk system (16×16×16 chunks, face culling)
- [x] Procedural world generation (surface + underground, ore placement)
- [x] First-person camera + PC controls (WASD, mouse look, jump)
- [x] Block mining mechanics (raycasting, block removal, drops)
- [ ] Basic inventory system (pickup items, backpack capacity)
- [ ] Player HUD (health, money, equipped gear, inventory panel)

## Phase 2: Economy & NPCs
- [ ] Item/gear tier system (rainbow tiers, stats)
- [ ] Surface NPCs (buyer + seller) with trading UI
- [ ] Pickaxe/weapon/armor/backpack purchasing
- [ ] Enhancement system (bones/brains/cloth, success rates)

## Phase 3: Combat & Enemies
- [ ] Enemy spawning system (underground, config-driven)
- [ ] Melee combat (player attacks, enemy AI, damage/health)
- [ ] Enemy drops (brain/bone/cloth, glowing variants)
- [ ] Helper NPC (craft from drops, AI mining/fighting)

## Phase 4: World Features
- [ ] Ladder placement and climbing
- [ ] Teleport system (bidirectional, levels 10/20/30/40)
- [ ] World boundaries (500m invisible walls)
- [ ] Physics integration (cannon-es for player/enemy movement)

## Phase 5: Polish & UX
- [ ] Audio system (Howler.js, spatial audio, chiptune BGM)
- [ ] Touch controls (nipplejs joystick, swipe look, tap-hold mine)
- [ ] Save/load system (IndexedDB, auto-save 30s + blur)
- [ ] PWA setup (manifest, service worker, installable)
- [ ] Victory Scepter endgame (purchase → win screen + confetti)
- [ ] Visual polish (bloom, glow shaders, tier coloring, particles)

## Phase 6: Testing & QA
- [ ] Unit tests for core systems (mining, combat, inventory, save)
- [ ] Integration tests (full game loop)
- [ ] Performance profiling (60 FPS on tablet)
- [ ] Build verification (npm run build → clean dist)

## Completed
- [x] Project enabled for Ralph
- [x] Vite + TypeScript + Three.js scaffold

## Notes
- Work incrementally: one feature per loop, verify, commit
- Config-driven design: items/enemies/tiers in JSON configs
- Test each system in isolation before integration
