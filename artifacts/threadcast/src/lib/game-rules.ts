export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function calculateThreadPool(level: number, thsScore: number): number {
  return level + calculateModifier(thsScore);
}

export function calculateSafeLimit(level: number, ctrScore: number): number {
  return level + calculateModifier(ctrScore);
}

export function calculateVP(level: number, resScore: number): number {
  return 16 + (calculateModifier(resScore) * level);
}

export function calculateGuardRating(resScore: number): number {
  return 8 + calculateModifier(resScore);
}

export function calculateWardRating(ctrScore: number): number {
  return 8 + calculateModifier(ctrScore);
}

export const ATTRIBUTES = [
  { key: 'pot', name: 'Potency', abbr: 'POT' },
  { key: 'ctr', name: 'Control', abbr: 'CTR' },
  { key: 'res', name: 'Resilience', abbr: 'RES' },
  { key: 'acu', name: 'Acuity', abbr: 'ACU' },
  { key: 'pre', name: 'Presence', abbr: 'PRE' },
  { key: 'ths', name: 'Threadsense', abbr: 'THS' },
] as const;

export type AttributeKey = typeof ATTRIBUTES[number]['key'];

export const SKILL_LIST = [
  { name: "Combat Forms", attribute: "RES" },
  { name: "Grit", attribute: "RES" },
  { name: "Survival", attribute: "RES" },
  { name: "Weave Reading", attribute: "THS" },
  { name: "Lore", attribute: "ACU" },
  { name: "Discernment", attribute: "ACU" },
  { name: "Street Sense", attribute: "ACU" },
  { name: "Guild Protocol", attribute: "PRE" },
  { name: "Trade Craft", attribute: "CTR" },
  { name: "Anatomy of Magic", attribute: "THS" },
  { name: "Ward Craft", attribute: "CTR" },
  { name: "Inscription", attribute: "ACU" }
] as const;
