export const CORE_POWER_LEVELS = [
  { pl: 1, cost: 1, dc: 8, effect: "Flicker — a small, trivial effect" },
  { pl: 2, cost: 3, dc: 11, effect: "Touch — meaningful room-scale manipulation" },
  { pl: 3, cost: 6, dc: 14, effect: "Surge — a significant effect on creatures, objects, or an area" },
  { pl: 4, cost: 10, dc: 17, effect: "Fierce — a major effect on groups, structures, or an environment" },
  { pl: 5, cost: 15, dc: 20, effect: "Breaking — catastrophic, enormous-scale magic" },
] as const;

export function maximumSafePowerLevel(level: number, potencyScore: number): number {
  return Math.max(1, Math.min(5, Math.floor(level + Math.floor((potencyScore - 10) / 2) / 3)));
}

export function weaveMultiplier(stringCount: number): number {
  return stringCount === 3 ? 2 : stringCount === 4 ? 3 : 1;
}