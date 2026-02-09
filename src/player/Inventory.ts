import { ITEMS } from '../config/items';
import { GearDef } from '../config/types';
import { MAX_ENHANCEMENT_LEVEL, ENHANCEMENT_MATERIALS, ENHANCEMENT_STAT_BOOST } from '../config/constants';

export type GearSlot = 'pickaxe' | 'weapon' | 'armor' | 'backpack';

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

/**
 * Player inventory: stores items with backpack-based capacity,
 * tracks equipped gear, and manages money.
 */
export class Inventory {
  /** Item stacks stored by item ID → quantity */
  private items: Map<string, number> = new Map();

  /** Equipped gear per slot */
  private equipped: Map<GearSlot, string> = new Map();

  /** Enhancement levels per gear slot (0-5) */
  private enhancements: Map<GearSlot, number> = new Map();

  /** Player money */
  money = 0;

  /** Callback fired when inventory changes (for HUD updates) */
  onChange: (() => void) | null = null;

  constructor() {
    // Start with default gear
    this.equipped.set('pickaxe', 'pick_stone');
    this.equipped.set('backpack', 'backpack_t1');
  }

  /** Max number of total item stacks allowed (from equipped backpack) */
  get maxSlots(): number {
    const bpId = this.equipped.get('backpack');
    if (!bpId) return 10;
    const def = ITEMS[bpId] as GearDef | undefined;
    return def?.stats?.slots ?? 10;
  }

  /** Current number of stacks used (items beyond maxStack take additional slots) */
  get usedSlots(): number {
    let slots = 0;
    for (const [itemId, qty] of this.items) {
      const def = ITEMS[itemId];
      const maxStack = def?.maxStack ?? 20;
      slots += Math.ceil(qty / maxStack);
    }
    return slots;
  }

  /** Check if inventory has room for at least 1 of this item */
  canAdd(itemId: string, quantity = 1): boolean {
    const def = ITEMS[itemId];
    if (!def) return false;

    const existing = this.items.get(itemId) ?? 0;
    const maxStack = def.maxStack;
    const currentSlots = existing > 0 ? Math.ceil(existing / maxStack) : 0;
    const newSlots = Math.ceil((existing + quantity) / maxStack);
    const additionalSlots = newSlots - currentSlots;

    return this.usedSlots + additionalSlots <= this.maxSlots;
  }

  /**
   * Add items to inventory. Returns the quantity actually added
   * (may be less if slot capacity is reached).
   */
  addItem(itemId: string, quantity = 1): number {
    const def = ITEMS[itemId];
    if (!def) return 0;

    const existing = this.items.get(itemId) ?? 0;
    const maxStack = def.maxStack;
    const currentSlots = existing > 0 ? Math.ceil(existing / maxStack) : 0;
    const freeSlots = this.maxSlots - this.usedSlots + currentSlots;

    // Max items that fit in freeSlots worth of stacks
    const maxItems = freeSlots * maxStack;
    const toAdd = Math.min(quantity, maxItems - existing);
    if (toAdd <= 0) return 0;

    this.items.set(itemId, existing + toAdd);
    this.onChange?.();
    return toAdd;
  }

  /** Remove items from inventory. Returns quantity actually removed. */
  removeItem(itemId: string, quantity = 1): number {
    const existing = this.items.get(itemId) ?? 0;
    if (existing <= 0) return 0;

    const toRemove = Math.min(quantity, existing);
    const remaining = existing - toRemove;
    if (remaining <= 0) {
      this.items.delete(itemId);
    } else {
      this.items.set(itemId, remaining);
    }
    this.onChange?.();
    return toRemove;
  }

  /** Get quantity of an item in inventory */
  getQuantity(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  /** Check if player has at least `quantity` of an item */
  hasItem(itemId: string, quantity = 1): boolean {
    return this.getQuantity(itemId) >= quantity;
  }

  /** Get all inventory items as an array of slots */
  getAllItems(): InventorySlot[] {
    const slots: InventorySlot[] = [];
    for (const [itemId, quantity] of this.items) {
      slots.push({ itemId, quantity });
    }
    return slots;
  }

  /** Equip a gear item. Resets enhancement level for that slot. */
  equip(itemId: string): boolean {
    const def = ITEMS[itemId];
    if (!def || def.category !== 'gear') return false;
    const gearDef = def as GearDef;
    this.equipped.set(gearDef.gearSlot, itemId);
    this.enhancements.set(gearDef.gearSlot, 0); // reset on new gear
    this.onChange?.();
    return true;
  }

  /** Get the item ID of equipped gear in a slot */
  getEquipped(slot: GearSlot): string | undefined {
    return this.equipped.get(slot);
  }

  /** Get the GearDef for equipped gear in a slot */
  getEquippedDef(slot: GearSlot): GearDef | undefined {
    const id = this.equipped.get(slot);
    if (!id) return undefined;
    const def = ITEMS[id];
    if (def?.category !== 'gear') return undefined;
    return def as GearDef;
  }

  /** Get equipped pickaxe mine tier (for tier-gating ore mining) */
  getMineTier(): number {
    const pick = this.getEquippedDef('pickaxe');
    return pick?.stats?.mineTier ?? 0;
  }

  /** Get equipped pickaxe mine speed multiplier (with enhancement bonus) */
  getMineSpeed(): number {
    const pick = this.getEquippedDef('pickaxe');
    const base = pick?.stats?.mineSpeed ?? 1;
    return base * (1 + this.getEnhancementLevel('pickaxe') * ENHANCEMENT_STAT_BOOST);
  }

  /** Get enhancement level for a gear slot */
  getEnhancementLevel(slot: GearSlot): number {
    return this.enhancements.get(slot) ?? 0;
  }

  /**
   * Attempt to enhance equipped gear in a slot using a material.
   * Consumes 1 material. Returns true on success, false on failure.
   * Enhancement level increases on success.
   */
  tryEnhance(slot: GearSlot, materialId: string): { success: boolean; consumed: boolean } {
    // Must have gear equipped
    if (!this.equipped.get(slot)) return { success: false, consumed: false };

    // Must have material
    if (!this.hasItem(materialId)) return { success: false, consumed: false };

    // Must not be at max
    const currentLevel = this.getEnhancementLevel(slot);
    if (currentLevel >= MAX_ENHANCEMENT_LEVEL) return { success: false, consumed: false };

    // Get success rate
    const rate = ENHANCEMENT_MATERIALS[materialId];
    if (rate === undefined) return { success: false, consumed: false };

    // Consume the material
    this.removeItem(materialId, 1);

    // Roll for success
    const success = Math.random() < rate;
    if (success) {
      this.enhancements.set(slot, currentLevel + 1);
    }

    this.onChange?.();
    return { success, consumed: true };
  }

  /** Serialize inventory state for saving */
  serialize(): {
    items: Record<string, number>;
    equipped: Record<string, string>;
    enhancements: Record<string, number>;
    money: number;
  } {
    const items: Record<string, number> = {};
    for (const [id, qty] of this.items) {
      items[id] = qty;
    }
    const equipped: Record<string, string> = {};
    for (const [slot, id] of this.equipped) {
      equipped[slot] = id;
    }
    const enhancements: Record<string, number> = {};
    for (const [slot, level] of this.enhancements) {
      if (level > 0) enhancements[slot] = level;
    }
    return { items, equipped, enhancements, money: this.money };
  }

  /** Restore inventory state from saved data */
  deserialize(data: {
    items?: Record<string, number>;
    equipped?: Record<string, string>;
    enhancements?: Record<string, number>;
    money?: number;
  }): void {
    this.items.clear();
    if (data.items) {
      for (const [id, qty] of Object.entries(data.items)) {
        if (ITEMS[id] && qty > 0) {
          this.items.set(id, qty);
        }
      }
    }
    this.equipped.clear();
    if (data.equipped) {
      for (const [slot, id] of Object.entries(data.equipped)) {
        if (ITEMS[id]) {
          this.equipped.set(slot as GearSlot, id);
        }
      }
    } else {
      this.equipped.set('pickaxe', 'pick_stone');
      this.equipped.set('backpack', 'backpack_t1');
    }
    this.enhancements.clear();
    if (data.enhancements) {
      for (const [slot, level] of Object.entries(data.enhancements)) {
        if (level > 0 && level <= MAX_ENHANCEMENT_LEVEL) {
          this.enhancements.set(slot as GearSlot, level);
        }
      }
    }
    this.money = data.money ?? 0;
    this.onChange?.();
  }
}
