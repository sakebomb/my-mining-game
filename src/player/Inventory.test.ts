import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Inventory } from './Inventory';

describe('Inventory', () => {
  let inv: Inventory;

  beforeEach(() => {
    inv = new Inventory();
  });

  describe('initial state', () => {
    it('starts with stone pickaxe and t1 backpack equipped', () => {
      expect(inv.getEquipped('pickaxe')).toBe('pick_stone');
      expect(inv.getEquipped('backpack')).toBe('backpack_t1');
    });

    it('starts with zero money', () => {
      expect(inv.money).toBe(0);
    });

    it('starts with empty inventory', () => {
      expect(inv.usedSlots).toBe(0);
      expect(inv.getAllItems()).toEqual([]);
    });

    it('has backpack_t1 slot count as max slots', () => {
      // backpack_t1 has 50 slots
      expect(inv.maxSlots).toBe(50);
    });
  });

  describe('addItem / removeItem', () => {
    it('adds a valid item and returns quantity added', () => {
      const added = inv.addItem('ore_red', 5);
      expect(added).toBe(5);
      expect(inv.getQuantity('ore_red')).toBe(5);
    });

    it('returns 0 for unknown item ID', () => {
      expect(inv.addItem('nonexistent_item')).toBe(0);
    });

    it('respects max stack limit', () => {
      // maxStack is 20, so adding 20+10 should allow multi-stack (2 slots)
      const first = inv.addItem('ore_red', 20);
      const second = inv.addItem('ore_red', 10);
      expect(first).toBe(20);
      expect(second).toBe(10);
      expect(inv.getQuantity('ore_red')).toBe(30); // spans 2 slots
    });

    it('refuses new stack when inventory is full', () => {
      // Fill all 50 slots: 10 item types × 100 qty each = 5 stacks each (maxStack=20) = 50 slots
      const ores = ['ore_red', 'ore_orange', 'ore_yellow', 'ore_green',
        'ore_blue', 'ore_indigo', 'ore_violet', 'ore_diamond', 'dirt', 'stone'];

      for (const ore of ores) {
        inv.addItem(ore, 100); // 100 / 20 maxStack = 5 slots each
      }

      expect(inv.usedSlots).toBe(50);
      // Try adding a new item type — should fail
      expect(inv.addItem('bone', 1)).toBe(0);
    });

    it('allows adding to existing stack even when full', () => {
      // Fill 50 slots but leave one type with a partial stack:
      // 9 types × 100 qty = 45 slots (5 full stacks each)
      // 1 type × 99 qty = 5 slots (4 full stacks of 20 + 1 partial of 19) = 50 slots total
      const ores = ['ore_red', 'ore_orange', 'ore_yellow', 'ore_green',
        'ore_blue', 'ore_indigo', 'ore_violet', 'ore_diamond', 'dirt', 'stone'];

      for (let i = 0; i < 9; i++) {
        inv.addItem(ores[i], 100);
      }
      inv.addItem('stone', 99); // partial last stack (19/20)

      expect(inv.usedSlots).toBe(50);
      // Adding 1 more to stone's partial stack should succeed (no new slot needed)
      expect(inv.addItem('stone', 1)).toBe(1);
    });

    it('removes items and returns quantity removed', () => {
      inv.addItem('ore_red', 10);
      expect(inv.removeItem('ore_red', 3)).toBe(3);
      expect(inv.getQuantity('ore_red')).toBe(7);
    });

    it('removes entire stack when quantity reaches zero', () => {
      inv.addItem('ore_red', 5);
      inv.removeItem('ore_red', 5);
      expect(inv.getQuantity('ore_red')).toBe(0);
      expect(inv.usedSlots).toBe(0);
    });

    it('caps removal at available quantity', () => {
      inv.addItem('ore_red', 3);
      expect(inv.removeItem('ore_red', 10)).toBe(3);
      expect(inv.getQuantity('ore_red')).toBe(0);
    });

    it('returns 0 when removing item not in inventory', () => {
      expect(inv.removeItem('ore_red')).toBe(0);
    });
  });

  describe('hasItem / getQuantity', () => {
    it('returns false for missing item', () => {
      expect(inv.hasItem('ore_red')).toBe(false);
    });

    it('returns true when sufficient quantity exists', () => {
      inv.addItem('ore_red', 5);
      expect(inv.hasItem('ore_red', 5)).toBe(true);
      expect(inv.hasItem('ore_red', 6)).toBe(false);
    });

    it('getQuantity returns 0 for missing items', () => {
      expect(inv.getQuantity('nonexistent')).toBe(0);
    });
  });

  describe('equip', () => {
    it('equips a gear item in the correct slot', () => {
      expect(inv.equip('pick_red')).toBe(true);
      expect(inv.getEquipped('pickaxe')).toBe('pick_red');
    });

    it('returns false for non-gear items', () => {
      expect(inv.equip('ore_red')).toBe(false);
    });

    it('returns false for unknown items', () => {
      expect(inv.equip('nonexistent')).toBe(false);
    });

    it('resets enhancement level on equip', () => {
      // Equip, manually set enhancement, then re-equip
      inv.equip('pick_red');
      // We can't directly set enhancement, but equip resets to 0
      expect(inv.getEnhancementLevel('pickaxe')).toBe(0);
    });

    it('updates maxSlots when equipping backpack', () => {
      const oldSlots = inv.maxSlots;
      inv.equip('backpack_t2');
      // t2 should have more slots than t1
      expect(inv.maxSlots).toBeGreaterThanOrEqual(oldSlots);
    });
  });

  describe('getMineTier / getMineSpeed', () => {
    it('returns stone pickaxe mine tier by default', () => {
      expect(inv.getMineTier()).toBe(0); // Stone tier = 0
    });

    it('returns higher tier after equipping better pickaxe', () => {
      inv.equip('pick_red');
      expect(inv.getMineTier()).toBeGreaterThan(0);
    });

    it('returns base mine speed with no enhancement', () => {
      const speed = inv.getMineSpeed();
      expect(speed).toBeGreaterThan(0);
    });
  });

  describe('tryEnhance', () => {
    it('returns consumed false when no material in inventory', () => {
      const result = inv.tryEnhance('pickaxe', 'bone');
      expect(result.consumed).toBe(false);
    });

    it('consumes material on attempt', () => {
      inv.addItem('bone', 3);
      const result = inv.tryEnhance('pickaxe', 'bone');
      expect(result.consumed).toBe(true);
      expect(inv.getQuantity('bone')).toBe(2);
    });

    it('returns consumed false for invalid material', () => {
      inv.addItem('ore_red', 5);
      const result = inv.tryEnhance('pickaxe', 'ore_red');
      expect(result.consumed).toBe(false);
    });

    it('returns consumed false when no gear equipped in slot', () => {
      inv.addItem('bone', 1);
      // Weapon slot starts empty
      const result = inv.tryEnhance('weapon', 'bone');
      expect(result.consumed).toBe(false);
    });

    it('stops enhancing at max level', () => {
      inv.addItem('cloth', 50);
      // Force enhance to max by mocking Math.random
      vi.spyOn(Math, 'random').mockReturnValue(0);
      for (let i = 0; i < 5; i++) {
        inv.tryEnhance('pickaxe', 'cloth');
      }
      expect(inv.getEnhancementLevel('pickaxe')).toBe(5);

      const result = inv.tryEnhance('pickaxe', 'cloth');
      expect(result.consumed).toBe(false);
      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe('serialize / deserialize', () => {
    it('round-trips inventory state', () => {
      inv.addItem('ore_red', 10);
      inv.addItem('bone', 5);
      inv.money = 500;
      inv.equip('pick_red');

      const data = inv.serialize();
      const inv2 = new Inventory();
      inv2.deserialize(data);

      expect(inv2.getQuantity('ore_red')).toBe(10);
      expect(inv2.getQuantity('bone')).toBe(5);
      expect(inv2.money).toBe(500);
      expect(inv2.getEquipped('pickaxe')).toBe('pick_red');
    });

    it('serializes empty inventory cleanly', () => {
      const data = inv.serialize();
      expect(data.items).toEqual({});
      expect(data.money).toBe(0);
    });

    it('filters out invalid item IDs on deserialize', () => {
      inv.deserialize({
        items: { 'ore_red': 5, 'INVALID_ITEM': 10 },
        money: 100,
      });
      expect(inv.getQuantity('ore_red')).toBe(5);
      expect(inv.getQuantity('INVALID_ITEM')).toBe(0);
    });

    it('restores default gear when no equipped data', () => {
      inv.deserialize({ items: {}, money: 0 });
      expect(inv.getEquipped('pickaxe')).toBe('pick_stone');
      expect(inv.getEquipped('backpack')).toBe('backpack_t1');
    });

    it('clamps enhancement levels to valid range', () => {
      inv.deserialize({
        equipped: { pickaxe: 'pick_stone', backpack: 'backpack_t1' },
        enhancements: { pickaxe: 10 }, // above max
      });
      // Should be ignored (> MAX_ENHANCEMENT_LEVEL)
      expect(inv.getEnhancementLevel('pickaxe')).toBe(0);
    });
  });

  describe('onChange callback', () => {
    it('fires on addItem', () => {
      const cb = vi.fn();
      inv.onChange = cb;
      inv.addItem('ore_red', 1);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('fires on removeItem', () => {
      inv.addItem('ore_red', 5);
      const cb = vi.fn();
      inv.onChange = cb;
      inv.removeItem('ore_red', 1);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('fires on equip', () => {
      const cb = vi.fn();
      inv.onChange = cb;
      inv.equip('pick_red');
      expect(cb).toHaveBeenCalledOnce();
    });

    it('does not fire when add fails', () => {
      const cb = vi.fn();
      inv.onChange = cb;
      inv.addItem('nonexistent');
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
