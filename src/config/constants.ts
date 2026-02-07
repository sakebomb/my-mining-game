/** Core world/game constants */
export const BLOCK_SIZE = 0.5;
export const CHUNK_SIZE = 16; // blocks per chunk axis
export const CHUNK_WORLD_SIZE = CHUNK_SIZE * BLOCK_SIZE; // 8m per chunk axis
export const MAX_DEPTH_LEVELS = 50;
export const MAX_DEPTH_BLOCKS = MAX_DEPTH_LEVELS * 2; // 2 blocks per 1m level = 100 blocks deep
export const WORLD_BORDER = 500; // meters from origin
export const SURFACE_Y = 0; // y=0 is surface

/** Player defaults */
export const PLAYER_HEIGHT = 1.6; // meters
export const PLAYER_RADIUS = 0.3;
export const PLAYER_SPEED = 5; // m/s
export const PLAYER_JUMP_FORCE = 6;
export const PLAYER_START_HEALTH = 100;
export const GRAVITY = -20;

/** Render distances */
export const RENDER_DISTANCE = 6; // chunks
export const LOD_DISTANCE = 4; // chunks for full detail

/** Mining */
export const MINE_REACH = 3; // meters
export const MINE_INTERVAL = 200; // ms between hits while holding

/** Enhancements */
export const MAX_ENHANCEMENT_LEVEL = 5;
export const ENHANCEMENT_MATERIALS: Record<string, number> = {
  bone: 0.3,   // 30% success rate
  brain: 0.5,  // 50% success rate
  cloth: 0.7,  // 70% success rate
};
/** Stat boost per enhancement level (multiplicative: 1 + level * boost) */
export const ENHANCEMENT_STAT_BOOST = 0.1; // +10% per level

/** Save */
export const AUTO_SAVE_INTERVAL = 30_000; // ms
