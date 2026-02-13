/** Defines protected zones around NPC locations */

export interface NPCZone {
  /** Label for debug / feedback */
  name: string;
  /** World-space X (meters) — center of the zone */
  worldX: number;
  /** World-space Z (meters) — center of the zone */
  worldZ: number;
  /** Width of the protected zone in blocks (X axis) */
  protectWidth: number;
  /** Depth of the protected zone in blocks (Z axis) */
  protectDepth: number;
  /** Height of the protected zone in blocks (Y axis, upward from surface) */
  protectHeight: number;
}

export const NPC_ZONES: NPCZone[] = [
  {
    name: 'Grumble the Buyer',
    worldX: 5,
    worldZ: 5,
    protectWidth: 20,
    protectDepth: 20,
    protectHeight: 10,
  },
  {
    name: 'Sparkle the Seller',
    worldX: -5,
    worldZ: 5,
    protectWidth: 20,
    protectDepth: 20,
    protectHeight: 10,
  },
];
