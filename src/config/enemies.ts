import { EnemyDef } from './types';

export const ENEMY_DEFS: EnemyDef[] = [
  {
    type: 'zombie',
    name: 'Zombie',
    health: 30,
    meleeDmg: [5, 10],
    speed: 1.5,
    drops: { brain: 0.15 },
    glowChance: 0.12,
    minDepth: 3,
    maxDepth: 50,
  },
  {
    type: 'skeleton',
    name: 'Skeleton',
    health: 25,
    meleeDmg: [7, 12],
    speed: 2.0,
    drops: { bone: 0.15 },
    glowChance: 0.10,
    minDepth: 8,
    maxDepth: 50,
  },
  {
    type: 'mummy',
    name: 'Mummy',
    health: 45,
    meleeDmg: [8, 15],
    speed: 1.2,
    drops: { cloth: 0.10 },
    glowChance: 0.15,
    minDepth: 15,
    maxDepth: 50,
  },
];
