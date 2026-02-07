# 3D Mining Game: Dig Deep to Victory

## Project Goals
Browser-based 3D first-person voxel mining game with fine PBR graphics. Dig down (0.5m blocks), mine tiered ores (stone → diamond), fight melee enemies, craft helpers, trade/sell, enhance gear with drops. **Win condition**: Buy "Victory Scepter" (config: price = sum(all other items) + 10 diamonds) → show "You Win!" message + confetti/reset option.

## Core Features
- **World**: Procedural voxels (0.5×0.5×0.5m blocks); surface field (level 0); max depth 50; 500m invisible/hard borders. Dig removes dirt/stone; ores embedded (procedural shapes). Ladders (placeable), bidirectional teleports at levels ~10/20/30/40.
- **Mining**: Tap/hold (PC: left-click hold; touch: tap-hold) to mine. Pickaxe tiers required (mines own + below).
- **Inventory/Backpack**: Tiered capacity (e.g., T1=10 slots total → T8=100+). HUD: Right-side panel with item icons + quantities (equipped pick/backpack/weapon/armor show level/tier/glow).
- **NPCs/Trading**: Surface buyer (ores/drops → money); seller (gear/enhancements). Config-driven (config.json): rainbow tiers (red low → purple → white max), glowing auras, cool names.
- **Enhancements**: Apply bones/brains/cloth at seller (5 max per item; success %: bone low, brain med, cloth high). Boost stats (e.g., pick speed, weapon dmg); visual +glow/stars.
- **Combat**: All melee close-range. enemies.json config: zombie (brain 15%), skeleton (bone 15%), mummy (cloth 10%). Glowing variants (10–15% spawns): double drop %. Player buys weapons/armor.
- **Helper**: Craft 6 bones + 1 brain (10 min life timer; +1 min per cloth). Uses your pickaxe tier (fixed at spawn); AI mines/fights nearby.
- **Progression/Save**: Local IndexedDB auto-save/load (money, gear, enhancements, inventory, world seed, depth position). Reset button. No ads.
- **Controls**: PC: WASD move, mouse look, space jump (over blocks/ladders), hold left-click mine/attack. Tablet: Touch joystick move, swipe look, tap-hold mine/attack, jump button.
- **Audio**: Fun, upbeat, bumpy chiptune/cave style (free from OpenGameArt/Freesound: mining cracks, hits, enemy grunts, buy ding, background loop). Howler.js + spatial.
- **HUD/UI**: Right-side: icons + quantities (money top, equipped gear with tier/level, backpack slots).
- **Endgame**: Buy Victory Scepter → "You Win!" screen + particles/confetti.

## Tech Stack
- TypeScript + Three.js (r168+) + Vite + Cannon-es (physics) + Howler.js (audio).
- Touch: nipple.js or custom joystick/swipe.
- Save: IndexedDB (idb lib; auto every 30s + on blur).
- PWA: Manifest + service worker for Android tablet install/fullscreen.
- Free GLTF: Kenney.nl/Mixamo (enemies/NPCs/items); tint/emissive/glow shaders for tiers/glowing drops.

## Scope/Boundaries
In: Single-player; local save/reset; touch/PWA; audio; configs (items/enemies). Out: Multiplayer; backend DB; ads.

## Non-Functional
- 60 FPS on tablet/mid-range; PBR/shadows/particles/glow/bloom.
- Chunk-based voxels (16×16×16) + LOD/culling.
- Tests: 90% coverage (mining, combat, save/load, enhancements).
- `npm run build` → PWA.

## Examples
**enemies.json** snippet:
```json
[
  {"type": "zombie", "drop": {"brain": 0.15}, "glowDouble": true, "meleeDmg": 5–10}
]
