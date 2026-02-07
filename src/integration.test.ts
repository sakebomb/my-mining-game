import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Inventory } from './player/Inventory';
import { ITEMS } from './config/items';
import { BLOCK_DEFS } from './config/blocks';
import { BlockType } from './config/types';

/**
 * Integration tests: verify interactions between game systems
 * without requiring Three.js or DOM.
 */
describe('Game loop integration', () => {
  let inv: Inventory;

  beforeEach(() => {
    inv = new Inventory();
  });

  describe('mining → inventory → selling flow', () => {
    it('mining a block adds its drop to inventory', () => {
      const blockType = BlockType.OreRed;
      const blockDef = BLOCK_DEFS[blockType];
      expect(blockDef.dropItem).toBeTruthy();

      const added = inv.addItem(blockDef.dropItem!, 1);
      expect(added).toBe(1);
      expect(inv.hasItem(blockDef.dropItem!)).toBe(true);
    });

    it('mined ores can be sold for money', () => {
      // Mine some ores
      inv.addItem('ore_red', 10);
      inv.addItem('ore_yellow', 5);

      // Simulate selling
      const redPrice = ITEMS['ore_red'].sellPrice;
      const yellowPrice = ITEMS['ore_yellow'].sellPrice;

      const redQty = inv.getQuantity('ore_red');
      inv.removeItem('ore_red', redQty);
      inv.money += redQty * redPrice;

      const yellowQty = inv.getQuantity('ore_yellow');
      inv.removeItem('ore_yellow', yellowQty);
      inv.money += yellowQty * yellowPrice;

      expect(inv.money).toBe(10 * redPrice + 5 * yellowPrice);
      expect(inv.getQuantity('ore_red')).toBe(0);
      expect(inv.getQuantity('ore_yellow')).toBe(0);
    });
  });

  describe('money → gear purchase → equip flow', () => {
    it('buying and equipping gear improves stats', () => {
      const oldTier = inv.getMineTier();
      const oldSpeed = inv.getMineSpeed();

      // Buy and equip a better pickaxe
      const pickDef = ITEMS['pick_red'];
      inv.money = pickDef.buyPrice;
      inv.money -= pickDef.buyPrice;
      inv.equip('pick_red');

      expect(inv.getMineTier()).toBeGreaterThan(oldTier);
    });
  });

  describe('enemy drops → enhancement flow', () => {
    it('collected bones can enhance equipped gear', () => {
      // Mock random to guarantee success
      vi.spyOn(Math, 'random').mockReturnValue(0);

      inv.addItem('bone', 3);
      const result = inv.tryEnhance('pickaxe', 'bone');
      expect(result.consumed).toBe(true);
      expect(result.success).toBe(true);
      expect(inv.getEnhancementLevel('pickaxe')).toBe(1);

      // Enhanced pickaxe should be faster
      const baseSpeed = inv.getEquippedDef('pickaxe')?.stats?.mineSpeed ?? 1;
      expect(inv.getMineSpeed()).toBeGreaterThan(baseSpeed);

      vi.restoreAllMocks();
    });

    it('failed enhancement still consumes material', () => {
      // Mock random to guarantee failure
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      inv.addItem('bone', 1);
      const result = inv.tryEnhance('pickaxe', 'bone');
      expect(result.consumed).toBe(true);
      expect(result.success).toBe(false);
      expect(inv.getEnhancementLevel('pickaxe')).toBe(0);
      expect(inv.getQuantity('bone')).toBe(0);

      vi.restoreAllMocks();
    });
  });

  describe('save/load round-trip', () => {
    it('preserves full game state through serialize/deserialize', () => {
      // Build up game state
      inv.addItem('ore_red', 15);
      inv.addItem('bone', 4);
      inv.money = 1250;
      inv.equip('pick_red');
      inv.equip('sword_red');
      inv.equip('backpack_t2');

      // Force successful enhancement
      vi.spyOn(Math, 'random').mockReturnValue(0);
      inv.addItem('brain', 1);
      inv.tryEnhance('pickaxe', 'brain');
      vi.restoreAllMocks();

      // Serialize
      const saveData = inv.serialize();

      // Create fresh inventory and deserialize
      const inv2 = new Inventory();
      inv2.deserialize(saveData);

      // Verify all state is restored
      expect(inv2.getQuantity('ore_red')).toBe(15);
      expect(inv2.getQuantity('bone')).toBe(4);
      expect(inv2.money).toBe(1250);
      expect(inv2.getEquipped('pickaxe')).toBe('pick_red');
      expect(inv2.getEquipped('weapon')).toBe('sword_red');
      expect(inv2.getEquipped('backpack')).toBe('backpack_t2');
      expect(inv2.getEnhancementLevel('pickaxe')).toBe(1);
    });
  });

  describe('victory scepter endgame', () => {
    it('victory scepter requires significant money to buy', () => {
      const scepter = ITEMS['victory_scepter'];
      // Price should be sum of all gear + 10 diamonds, i.e. a large number
      expect(scepter.buyPrice).toBeGreaterThan(1000);
    });

    it('player can accumulate enough money through trading', () => {
      // Simulate mining and selling high-tier ores
      const diamondPrice = ITEMS['ore_diamond'].sellPrice;
      inv.addItem('ore_diamond', 99);
      const qty = inv.getQuantity('ore_diamond');
      inv.removeItem('ore_diamond', qty);
      inv.money += qty * diamondPrice;

      // Should be a substantial amount
      expect(inv.money).toBeGreaterThan(0);
      expect(inv.money).toBe(99 * diamondPrice);
    });
  });
});
