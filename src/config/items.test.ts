import { describe, it, expect } from 'vitest';
import { ITEMS } from './items';
import { BLOCK_DEFS } from './blocks';
import { BlockType, Tier } from './types';

describe('ITEMS config', () => {
  it('has a valid item definition for every block drop', () => {
    for (const [, blockDef] of Object.entries(BLOCK_DEFS)) {
      if (blockDef.dropItem) {
        expect(ITEMS[blockDef.dropItem], `Missing item for drop: ${blockDef.dropItem}`).toBeDefined();
      }
    }
  });

  it('all gear items have a valid gearSlot', () => {
    const validSlots = ['pickaxe', 'weapon', 'armor', 'backpack'];
    for (const [id, item] of Object.entries(ITEMS)) {
      if (item.category === 'gear') {
        expect(validSlots, `Invalid gearSlot on ${id}`).toContain((item as any).gearSlot);
      }
    }
  });

  it('all gear items have a tier', () => {
    for (const [id, item] of Object.entries(ITEMS)) {
      if (item.category === 'gear') {
        expect((item as any).tier, `Missing tier on ${id}`).toBeDefined();
      }
    }
  });

  it('all gear items have stats', () => {
    for (const [id, item] of Object.entries(ITEMS)) {
      if (item.category === 'gear') {
        expect((item as any).stats, `Missing stats on ${id}`).toBeDefined();
      }
    }
  });

  it('pickaxes have increasing mineTier with tier', () => {
    const pickaxes = Object.entries(ITEMS)
      .filter(([, item]) => item.category === 'gear' && (item as any).gearSlot === 'pickaxe')
      .map(([, item]) => item as any)
      .sort((a, b) => a.tier - b.tier);

    for (let i = 1; i < pickaxes.length; i++) {
      expect(pickaxes[i].stats.mineTier).toBeGreaterThanOrEqual(pickaxes[i - 1].stats.mineTier);
    }
  });

  it('backpacks have increasing slots with tier', () => {
    const backpacks = Object.entries(ITEMS)
      .filter(([, item]) => item.category === 'gear' && (item as any).gearSlot === 'backpack')
      .map(([, item]) => item as any)
      .sort((a, b) => a.tier - b.tier);

    for (let i = 1; i < backpacks.length; i++) {
      expect(backpacks[i].stats.slots).toBeGreaterThanOrEqual(backpacks[i - 1].stats.slots);
    }
  });

  it('victory scepter has a computed positive price', () => {
    const scepter = ITEMS['victory_scepter'];
    expect(scepter).toBeDefined();
    expect(scepter.buyPrice).toBeGreaterThan(0);
    expect(scepter.category).toBe('special');
  });

  it('all items have required fields', () => {
    for (const [id, item] of Object.entries(ITEMS)) {
      expect(item.id, `id mismatch on ${id}`).toBe(id);
      expect(item.name, `missing name on ${id}`).toBeTruthy();
      expect(typeof item.sellPrice, `bad sellPrice on ${id}`).toBe('number');
      expect(typeof item.buyPrice, `bad buyPrice on ${id}`).toBe('number');
      expect(typeof item.maxStack, `bad maxStack on ${id}`).toBe('number');
    }
  });
});

describe('BLOCK_DEFS config', () => {
  it('defines all ore block types', () => {
    const oreTypes = [
      BlockType.OreRed, BlockType.OreOrange, BlockType.OreYellow,
      BlockType.OreGreen, BlockType.OreBlue, BlockType.OreIndigo,
      BlockType.OreViolet, BlockType.OreDiamond,
    ];
    for (const oreType of oreTypes) {
      expect(BLOCK_DEFS[oreType], `Missing block def for ore ${oreType}`).toBeDefined();
      expect(BLOCK_DEFS[oreType].dropItem, `Missing drop for ore ${oreType}`).toBeTruthy();
    }
  });

  it('ore blocks have increasing hardness with tier', () => {
    const oreTypes = [
      BlockType.OreRed, BlockType.OreOrange, BlockType.OreYellow,
      BlockType.OreGreen, BlockType.OreBlue, BlockType.OreIndigo,
      BlockType.OreViolet, BlockType.OreDiamond,
    ];
    for (let i = 1; i < oreTypes.length; i++) {
      expect(BLOCK_DEFS[oreTypes[i]].hardness).toBeGreaterThanOrEqual(
        BLOCK_DEFS[oreTypes[i - 1]].hardness,
      );
    }
  });

  it('ore blocks have emissive properties', () => {
    const oreTypes = [
      BlockType.OreRed, BlockType.OreOrange, BlockType.OreYellow,
      BlockType.OreGreen, BlockType.OreBlue, BlockType.OreIndigo,
      BlockType.OreViolet, BlockType.OreDiamond,
    ];
    for (const oreType of oreTypes) {
      const def = BLOCK_DEFS[oreType];
      expect(def.emissive, `Missing emissive on ${def.name}`).toBeDefined();
      expect(def.emissiveIntensity, `Missing emissiveIntensity on ${def.name}`).toBeGreaterThan(0);
    }
  });

  it('bedrock is indestructible', () => {
    expect(BLOCK_DEFS[BlockType.Bedrock].hardness).toBe(Infinity);
  });

  it('air is transparent and non-solid', () => {
    expect(BLOCK_DEFS[BlockType.Air].transparent).toBe(true);
    expect(BLOCK_DEFS[BlockType.Air].solid).toBe(false);
  });
});
