/** Tier system: rainbow progression from weakest to strongest */
export enum Tier {
  Stone = 0,
  Red = 1,
  Orange = 2,
  Yellow = 3,
  Green = 4,
  Blue = 5,
  Indigo = 6,
  Violet = 7,
  White = 8,
}

export const TIER_COLORS: Record<Tier, number> = {
  [Tier.Stone]: 0x808080,
  [Tier.Red]: 0xff0000,
  [Tier.Orange]: 0xff8800,
  [Tier.Yellow]: 0xffff00,
  [Tier.Green]: 0x00ff00,
  [Tier.Blue]: 0x0088ff,
  [Tier.Indigo]: 0x4400ff,
  [Tier.Violet]: 0x8800ff,
  [Tier.White]: 0xffffff,
};

export const TIER_NAMES: Record<Tier, string> = {
  [Tier.Stone]: 'Stone',
  [Tier.Red]: 'Red',
  [Tier.Orange]: 'Orange',
  [Tier.Yellow]: 'Yellow',
  [Tier.Green]: 'Green',
  [Tier.Blue]: 'Blue',
  [Tier.Indigo]: 'Indigo',
  [Tier.Violet]: 'Violet',
  [Tier.White]: 'White',
};

/** Block types in the voxel world */
export enum BlockType {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  // Ores match tier indices
  OreRed = 10,
  OreOrange = 11,
  OreYellow = 12,
  OreGreen = 13,
  OreBlue = 14,
  OreIndigo = 15,
  OreViolet = 16,
  OreDiamond = 17,
  // Special
  Bedrock = 50,
  Ladder = 60,
  Teleport = 61,
}

export interface BlockDef {
  type: BlockType;
  name: string;
  color: number;
  hardness: number; // hits to mine
  minTier: Tier; // minimum pickaxe tier required
  dropItem?: string; // item ID dropped when mined
  transparent: boolean;
  solid: boolean;
  emissive?: number; // emissive color (hex), used for ore glow
  emissiveIntensity?: number; // 0-1 emissive strength
}

export interface OreDef {
  blockType: BlockType;
  tier: Tier;
  minDepth: number; // minimum depth level to appear
  maxDepth: number;
  rarity: number; // 0-1, chance per eligible block
  clusterSize: [number, number]; // min, max cluster size
  sellPrice: number;
}

export interface ItemDef {
  id: string;
  name: string;
  category: 'ore' | 'drop' | 'gear' | 'consumable' | 'special';
  tier?: Tier;
  stackable: boolean;
  maxStack: number;
  sellPrice: number;
  buyPrice: number;
}

export interface GearDef extends ItemDef {
  category: 'gear';
  gearSlot: 'pickaxe' | 'weapon' | 'armor' | 'backpack';
  tier: Tier;
  stats: Record<string, number>;
}

export interface EnemyDef {
  type: string;
  name: string;
  health: number;
  meleeDmg: [number, number]; // min, max
  speed: number;
  drops: Record<string, number>; // item ID → drop chance (0-1)
  glowChance: number; // chance to spawn as glowing variant
  minDepth: number;
  maxDepth: number;
}
