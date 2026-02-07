import { Inventory } from '../player/Inventory';
import { ITEMS } from '../config/items';
import { GearDef } from '../config/types';

export type TradeMode = 'buy' | 'sell';

/**
 * HTML overlay for NPC trading. Shows a modal with buy/sell item lists.
 * Player can sell ores/drops for money, or buy gear/consumables.
 */
export class TradingUI {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;
  private inventory: Inventory;
  private mode: TradeMode = 'sell';
  private _isOpen = false;
  private npcName = '';

  /** Called when trading UI opens/closes (for pointer lock management) */
  onToggle: ((isOpen: boolean) => void) | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;

    // Full-screen overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.6); display: none;
      justify-content: center; align-items: center;
      font-family: monospace; color: white;
    `;

    // Modal content
    this.content = document.createElement('div');
    this.content.style.cssText = `
      background: #1a1a2e; border: 2px solid #555; border-radius: 8px;
      padding: 16px 20px; min-width: 320px; max-width: 420px;
      max-height: 70vh; overflow-y: auto;
    `;
    this.overlay.appendChild(this.content);
    document.body.appendChild(this.overlay);

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        this.close();
      }
    });
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  open(npcName: string, mode: TradeMode): void {
    this.npcName = npcName;
    this.mode = mode;
    this._isOpen = true;
    this.overlay.style.display = 'flex';
    this.render();
    this.onToggle?.(true);
  }

  close(): void {
    this._isOpen = false;
    this.overlay.style.display = 'none';
    this.onToggle?.(false);
  }

  private render(): void {
    if (this.mode === 'sell') {
      this.renderSellUI();
    } else {
      this.renderBuyUI();
    }
  }

  private renderSellUI(): void {
    const items = this.inventory.getAllItems();
    const sellable = items.filter((slot) => {
      const def = ITEMS[slot.itemId];
      return def && def.sellPrice > 0;
    });

    let html = `<h3 style="margin:0 0 8px;color:#ffdd44">${this.npcName} — Sell Items</h3>`;
    html += `<div style="margin-bottom:8px;color:#aaa;font-size:12px">Your money: <b style="color:#ffdd44">$${this.inventory.money}</b></div>`;

    if (sellable.length === 0) {
      html += `<p style="color:#888">Nothing to sell.</p>`;
    } else {
      for (const slot of sellable) {
        const def = ITEMS[slot.itemId]!;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #333">`;
        html += `<span>${def.name} x${slot.quantity}</span>`;
        html += `<span>`;
        html += `<button data-action="sell1" data-item="${slot.itemId}" style="${this.btnStyle()}">Sell 1 ($${def.sellPrice})</button>`;
        if (slot.quantity > 1) {
          html += ` <button data-action="sellAll" data-item="${slot.itemId}" style="${this.btnStyle()}">All ($${def.sellPrice * slot.quantity})</button>`;
        }
        html += `</span></div>`;
      }
    }

    html += `<div style="margin-top:12px;display:flex;gap:8px">`;
    html += `<button data-action="switchBuy" style="${this.btnStyle('#446')}">Buy Tab</button>`;
    html += `<button data-action="close" style="${this.btnStyle('#633')}">Close [Esc]</button>`;
    html += `</div>`;

    this.content.innerHTML = html;
    this.attachListeners();
  }

  private renderBuyUI(): void {
    // Collect all buyable items (gear + consumables with buyPrice > 0)
    const buyable = Object.values(ITEMS).filter(
      (def) => def.buyPrice > 0 && (def.category === 'gear' || def.category === 'consumable'),
    );

    let html = `<h3 style="margin:0 0 8px;color:#44ddff">${this.npcName} — Buy Items</h3>`;
    html += `<div style="margin-bottom:8px;color:#aaa;font-size:12px">Your money: <b style="color:#ffdd44">$${this.inventory.money}</b></div>`;

    // Group by category
    const gear = buyable.filter((d) => d.category === 'gear') as GearDef[];
    const consumables = buyable.filter((d) => d.category === 'consumable');

    // Gear by slot
    const slots = ['pickaxe', 'weapon', 'armor', 'backpack'] as const;
    for (const slot of slots) {
      const slotGear = gear.filter((g) => g.gearSlot === slot);
      if (slotGear.length === 0) continue;
      html += `<div style="margin-top:8px;color:#aaa;font-size:11px;text-transform:uppercase">${slot}s</div>`;
      for (const g of slotGear) {
        const canAfford = this.inventory.money >= g.buyPrice;
        const equipped = this.inventory.getEquipped(slot) === g.id;
        const tag = equipped ? ' <span style="color:#4a4">[Equipped]</span>' : '';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #222">`;
        html += `<span style="font-size:12px">${g.name}${tag}</span>`;
        html += `<button data-action="buy" data-item="${g.id}" style="${this.btnStyle(canAfford ? '#464' : '#333')}" ${canAfford ? '' : 'disabled'}>$${g.buyPrice}</button>`;
        html += `</div>`;
      }
    }

    if (consumables.length > 0) {
      html += `<div style="margin-top:8px;color:#aaa;font-size:11px;text-transform:uppercase">Consumables</div>`;
      for (const c of consumables) {
        const canAfford = this.inventory.money >= c.buyPrice;
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #222">`;
        html += `<span style="font-size:12px">${c.name}</span>`;
        html += `<button data-action="buy" data-item="${c.id}" style="${this.btnStyle(canAfford ? '#464' : '#333')}" ${canAfford ? '' : 'disabled'}>$${c.buyPrice}</button>`;
        html += `</div>`;
      }
    }

    html += `<div style="margin-top:12px;display:flex;gap:8px">`;
    html += `<button data-action="switchSell" style="${this.btnStyle('#446')}">Sell Tab</button>`;
    html += `<button data-action="close" style="${this.btnStyle('#633')}">Close [Esc]</button>`;
    html += `</div>`;

    this.content.innerHTML = html;
    this.attachListeners();
  }

  private attachListeners(): void {
    this.content.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLButtonElement;
        const action = el.dataset.action;
        const itemId = el.dataset.item;

        switch (action) {
          case 'sell1':
            if (itemId) this.sellItem(itemId, 1);
            break;
          case 'sellAll':
            if (itemId) this.sellItem(itemId, this.inventory.getQuantity(itemId));
            break;
          case 'buy':
            if (itemId) this.buyItem(itemId);
            break;
          case 'switchBuy':
            this.mode = 'buy';
            this.render();
            break;
          case 'switchSell':
            this.mode = 'sell';
            this.render();
            break;
          case 'close':
            this.close();
            break;
        }
      });
    });
  }

  private sellItem(itemId: string, quantity: number): void {
    const def = ITEMS[itemId];
    if (!def || def.sellPrice <= 0) return;
    const removed = this.inventory.removeItem(itemId, quantity);
    this.inventory.money += removed * def.sellPrice;
    this.inventory.onChange?.();
    this.render();
  }

  private buyItem(itemId: string): void {
    const def = ITEMS[itemId];
    if (!def || def.buyPrice <= 0) return;
    if (this.inventory.money < def.buyPrice) return;

    if (def.category === 'gear') {
      // Gear: just equip directly (don't take inventory slot)
      this.inventory.money -= def.buyPrice;
      this.inventory.equip(itemId);
    } else {
      // Consumable/stackable: add to inventory
      if (!this.inventory.canAdd(itemId)) return;
      this.inventory.money -= def.buyPrice;
      this.inventory.addItem(itemId);
    }
    this.inventory.onChange?.();
    this.render();
  }

  private btnStyle(bg = '#444'): string {
    return `background:${bg};color:white;border:1px solid #666;border-radius:3px;padding:2px 8px;cursor:pointer;font-family:monospace;font-size:11px`;
  }

  dispose(): void {
    this.overlay.remove();
  }
}
