import { ItemDef, GearDef, Tier } from './types';

export const ITEMS: Record<string, ItemDef | GearDef> = {
  // Basic materials
  dirt: {
    id: 'dirt',
    name: 'Dirt',
    category: 'ore',
    stackable: true,
    maxStack: 99,
    sellPrice: 0,
    buyPrice: 0,
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    category: 'ore',
    stackable: true,
    maxStack: 99,
    sellPrice: 1,
    buyPrice: 0,
  },

  // Ores
  ore_red: { id: 'ore_red', name: 'Copper Ore', category: 'ore', tier: Tier.Red, stackable: true, maxStack: 99, sellPrice: 5, buyPrice: 0 },
  ore_orange: { id: 'ore_orange', name: 'Iron Ore', category: 'ore', tier: Tier.Orange, stackable: true, maxStack: 99, sellPrice: 12, buyPrice: 0 },
  ore_yellow: { id: 'ore_yellow', name: 'Gold Ore', category: 'ore', tier: Tier.Yellow, stackable: true, maxStack: 99, sellPrice: 25, buyPrice: 0 },
  ore_green: { id: 'ore_green', name: 'Emerald', category: 'ore', tier: Tier.Green, stackable: true, maxStack: 99, sellPrice: 50, buyPrice: 0 },
  ore_blue: { id: 'ore_blue', name: 'Sapphire', category: 'ore', tier: Tier.Blue, stackable: true, maxStack: 99, sellPrice: 100, buyPrice: 0 },
  ore_indigo: { id: 'ore_indigo', name: 'Amethyst', category: 'ore', tier: Tier.Indigo, stackable: true, maxStack: 99, sellPrice: 200, buyPrice: 0 },
  ore_violet: { id: 'ore_violet', name: 'Mythril', category: 'ore', tier: Tier.Violet, stackable: true, maxStack: 99, sellPrice: 400, buyPrice: 0 },
  ore_diamond: { id: 'ore_diamond', name: 'Diamond', category: 'ore', tier: Tier.White, stackable: true, maxStack: 99, sellPrice: 1000, buyPrice: 0 },

  // Enemy drops
  bone: { id: 'bone', name: 'Bone', category: 'drop', stackable: true, maxStack: 99, sellPrice: 8, buyPrice: 0 },
  brain: { id: 'brain', name: 'Brain', category: 'drop', stackable: true, maxStack: 99, sellPrice: 15, buyPrice: 0 },
  cloth: { id: 'cloth', name: 'Cloth', category: 'drop', stackable: true, maxStack: 99, sellPrice: 12, buyPrice: 0 },

  // Ladder
  ladder: { id: 'ladder', name: 'Ladder', category: 'consumable', stackable: true, maxStack: 99, sellPrice: 2, buyPrice: 10 },

  // Pickaxes (gear)
  pick_stone: { id: 'pick_stone', name: 'Stone Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Stone, stackable: false, maxStack: 1, sellPrice: 0, buyPrice: 0, stats: { mineSpeed: 1, mineTier: 0 } },
  pick_red: { id: 'pick_red', name: 'Copper Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Red, stackable: false, maxStack: 1, sellPrice: 25, buyPrice: 50, stats: { mineSpeed: 1.5, mineTier: 1 } },
  pick_orange: { id: 'pick_orange', name: 'Iron Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Orange, stackable: false, maxStack: 1, sellPrice: 60, buyPrice: 120, stats: { mineSpeed: 2, mineTier: 2 } },
  pick_yellow: { id: 'pick_yellow', name: 'Gold Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Yellow, stackable: false, maxStack: 1, sellPrice: 125, buyPrice: 250, stats: { mineSpeed: 2.5, mineTier: 3 } },
  pick_green: { id: 'pick_green', name: 'Emerald Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Green, stackable: false, maxStack: 1, sellPrice: 250, buyPrice: 500, stats: { mineSpeed: 3, mineTier: 4 } },
  pick_blue: { id: 'pick_blue', name: 'Sapphire Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Blue, stackable: false, maxStack: 1, sellPrice: 500, buyPrice: 1000, stats: { mineSpeed: 3.5, mineTier: 5 } },
  pick_indigo: { id: 'pick_indigo', name: 'Amethyst Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Indigo, stackable: false, maxStack: 1, sellPrice: 1000, buyPrice: 2000, stats: { mineSpeed: 4, mineTier: 6 } },
  pick_violet: { id: 'pick_violet', name: 'Mythril Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.Violet, stackable: false, maxStack: 1, sellPrice: 2000, buyPrice: 4000, stats: { mineSpeed: 4.5, mineTier: 7 } },
  pick_white: { id: 'pick_white', name: 'Diamond Pickaxe', category: 'gear', gearSlot: 'pickaxe', tier: Tier.White, stackable: false, maxStack: 1, sellPrice: 5000, buyPrice: 10000, stats: { mineSpeed: 5, mineTier: 8 } },

  // Weapons
  sword_stone: { id: 'sword_stone', name: 'Stone Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Stone, stackable: false, maxStack: 1, sellPrice: 0, buyPrice: 0, stats: { damage: 5, attackSpeed: 1 } },
  sword_red: { id: 'sword_red', name: 'Copper Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Red, stackable: false, maxStack: 1, sellPrice: 25, buyPrice: 50, stats: { damage: 8, attackSpeed: 1.2 } },
  sword_orange: { id: 'sword_orange', name: 'Iron Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Orange, stackable: false, maxStack: 1, sellPrice: 60, buyPrice: 120, stats: { damage: 12, attackSpeed: 1.4 } },
  sword_yellow: { id: 'sword_yellow', name: 'Gold Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Yellow, stackable: false, maxStack: 1, sellPrice: 125, buyPrice: 250, stats: { damage: 18, attackSpeed: 1.6 } },
  sword_green: { id: 'sword_green', name: 'Emerald Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Green, stackable: false, maxStack: 1, sellPrice: 250, buyPrice: 500, stats: { damage: 25, attackSpeed: 1.8 } },
  sword_blue: { id: 'sword_blue', name: 'Sapphire Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Blue, stackable: false, maxStack: 1, sellPrice: 500, buyPrice: 1000, stats: { damage: 35, attackSpeed: 2 } },
  sword_indigo: { id: 'sword_indigo', name: 'Amethyst Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Indigo, stackable: false, maxStack: 1, sellPrice: 1000, buyPrice: 2000, stats: { damage: 48, attackSpeed: 2.2 } },
  sword_violet: { id: 'sword_violet', name: 'Mythril Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.Violet, stackable: false, maxStack: 1, sellPrice: 2000, buyPrice: 4000, stats: { damage: 65, attackSpeed: 2.4 } },
  sword_white: { id: 'sword_white', name: 'Diamond Sword', category: 'gear', gearSlot: 'weapon', tier: Tier.White, stackable: false, maxStack: 1, sellPrice: 5000, buyPrice: 10000, stats: { damage: 90, attackSpeed: 2.6 } },

  // Armor
  armor_red: { id: 'armor_red', name: 'Copper Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Red, stackable: false, maxStack: 1, sellPrice: 25, buyPrice: 50, stats: { defense: 3 } },
  armor_orange: { id: 'armor_orange', name: 'Iron Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Orange, stackable: false, maxStack: 1, sellPrice: 60, buyPrice: 120, stats: { defense: 6 } },
  armor_yellow: { id: 'armor_yellow', name: 'Gold Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Yellow, stackable: false, maxStack: 1, sellPrice: 125, buyPrice: 250, stats: { defense: 10 } },
  armor_green: { id: 'armor_green', name: 'Emerald Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Green, stackable: false, maxStack: 1, sellPrice: 250, buyPrice: 500, stats: { defense: 15 } },
  armor_blue: { id: 'armor_blue', name: 'Blue Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Blue, stackable: false, maxStack: 1, sellPrice: 500, buyPrice: 1000, stats: { defense: 22 } },
  armor_indigo: { id: 'armor_indigo', name: 'Amethyst Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Indigo, stackable: false, maxStack: 1, sellPrice: 1000, buyPrice: 2000, stats: { defense: 30 } },
  armor_violet: { id: 'armor_violet', name: 'Mythril Armor', category: 'gear', gearSlot: 'armor', tier: Tier.Violet, stackable: false, maxStack: 1, sellPrice: 2000, buyPrice: 4000, stats: { defense: 40 } },
  armor_white: { id: 'armor_white', name: 'Diamond Armor', category: 'gear', gearSlot: 'armor', tier: Tier.White, stackable: false, maxStack: 1, sellPrice: 5000, buyPrice: 10000, stats: { defense: 55 } },

  // Backpacks
  backpack_t1: { id: 'backpack_t1', name: 'Small Pouch', category: 'gear', gearSlot: 'backpack', tier: Tier.Stone, stackable: false, maxStack: 1, sellPrice: 0, buyPrice: 0, stats: { slots: 50 } },
  backpack_t2: { id: 'backpack_t2', name: 'Leather Bag', category: 'gear', gearSlot: 'backpack', tier: Tier.Red, stackable: false, maxStack: 1, sellPrice: 15, buyPrice: 30, stats: { slots: 70 } },
  backpack_t3: { id: 'backpack_t3', name: 'Iron Chest', category: 'gear', gearSlot: 'backpack', tier: Tier.Orange, stackable: false, maxStack: 1, sellPrice: 50, buyPrice: 100, stats: { slots: 90 } },
  backpack_t4: { id: 'backpack_t4', name: 'Gold Satchel', category: 'gear', gearSlot: 'backpack', tier: Tier.Yellow, stackable: false, maxStack: 1, sellPrice: 100, buyPrice: 200, stats: { slots: 110 } },
  backpack_t5: { id: 'backpack_t5', name: 'Emerald Pack', category: 'gear', gearSlot: 'backpack', tier: Tier.Green, stackable: false, maxStack: 1, sellPrice: 200, buyPrice: 400, stats: { slots: 130 } },
  backpack_t6: { id: 'backpack_t6', name: 'Sapphire Vault', category: 'gear', gearSlot: 'backpack', tier: Tier.Blue, stackable: false, maxStack: 1, sellPrice: 400, buyPrice: 800, stats: { slots: 150 } },
  backpack_t7: { id: 'backpack_t7', name: 'Amethyst Trunk', category: 'gear', gearSlot: 'backpack', tier: Tier.Indigo, stackable: false, maxStack: 1, sellPrice: 800, buyPrice: 1600, stats: { slots: 170 } },
  backpack_t8: { id: 'backpack_t8', name: 'Diamond Vault', category: 'gear', gearSlot: 'backpack', tier: Tier.White, stackable: false, maxStack: 1, sellPrice: 2000, buyPrice: 4000, stats: { slots: 200 } },

  // Victory item (buyPrice computed below)
  victory_scepter: {
    id: 'victory_scepter',
    name: 'Victory Scepter',
    category: 'special',
    stackable: false,
    maxStack: 1,
    sellPrice: 0,
    buyPrice: 0,
  },
};

// Compute Victory Scepter price: sum of all gear buyPrices + 10 * diamond sell price
const gearTotal = Object.values(ITEMS)
  .filter((item) => item.category === 'gear' && item.buyPrice > 0)
  .reduce((sum, item) => sum + item.buyPrice, 0);
const diamondValue = ITEMS.ore_diamond?.sellPrice ?? 1000;
ITEMS.victory_scepter.buyPrice = gearTotal + 10 * diamondValue;
