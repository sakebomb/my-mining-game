import { ITEMS } from '../config/items';
import { GearDef } from '../config/types';

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

  /** Current number of distinct item stacks in inventory */
  get usedSlots(): number {
    return this.items.size;
  }

  /** Check if inventory has room for a new item (or existing stack) */
  canAdd(itemId: string, quantity = 1): boolean {
    const existing = this.items.get(itemId) ?? 0;
    const def = ITEMS[itemId];
    if (!def) return false;

    if (existing > 0) {
      // Already have a stack — check max stack
      return existing + quantity <= def.maxStack;
    }
    // New item — need a free slot
    return this.usedSlots < this.maxSlots;
  }

  /**
   * Add items to inventory. Returns the quantity actually added
   * (may be less if stack/capacity limit reached).
   */
  addItem(itemId: string, quantity = 1): number {
    const def = ITEMS[itemId];
    if (!def) return 0;

    const existing = this.items.get(itemId) ?? 0;

    if (existing === 0 && this.usedSlots >= this.maxSlots) {
      // No room for new stack
      return 0;
    }

    const maxCanAdd = def.maxStack - existing;
    const toAdd = Math.min(quantity, maxCanAdd);
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

  /** Equip a gear item (must be in inventory or be starter gear) */
  equip(itemId: string): boolean {
    const def = ITEMS[itemId];
    if (!def || def.category !== 'gear') return false;
    const gearDef = def as GearDef;
    this.equipped.set(gearDef.gearSlot, itemId);
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

  /** Get equipped pickaxe mine speed multiplier */
  getMineSpeed(): number {
    const pick = this.getEquippedDef('pickaxe');
    return pick?.stats?.mineSpeed ?? 1;
  }

  /** Serialize inventory state for saving */
  serialize(): {
    items: Record<string, number>;
    equipped: Record<string, string>;
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
    return { items, equipped, money: this.money };
  }

  /** Restore inventory state from saved data */
  deserialize(data: {
    items?: Record<string, number>;
    equipped?: Record<string, string>;
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
      // Restore defaults
      this.equipped.set('pickaxe', 'pick_stone');
      this.equipped.set('backpack', 'backpack_t1');
    }
    this.money = data.money ?? 0;
    this.onChange?.();
  }
}
