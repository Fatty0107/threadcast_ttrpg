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

export type CastTableResult = {
  name: string;
  description: string;
  damage?: { sides: 4 | 6 | 8 | 10 | 12; count: number };
  burnout?: number;
  resetTension?: boolean;
  condition?: string;
};

export type CastAftermath = {
  tension: number;
  pool: number;
  safeLimit: number;
  cost: number;
  overflow: boolean;
  table?: {
    kind: "Mishap" | "Snapback";
    die: number;
    effect: CastTableResult;
    damage?: number;
    direction?: { id: string; die: number; name: string };
    permanentInjury?: { id: string; die: number; name: string; description: string };
  };
  additionalTable?: {
    kind: "Snapback";
    die: number;
    effect: CastTableResult;
    damage?: number;
    direction?: { id: string; die: number; name: string };
    permanentInjury?: { id: string; die: number; name: string; description: string };
  };
  damage?: number;
  strain?: { die: number; total: number; dc: number; failed: boolean };
  warning?: string;
};

export function mishapResult(die: number): CastTableResult {
  if (die <= 2) return { name: "Flinch", description: "Effect fails. Lose your Minor Action next turn and take 1d4 feedback damage.", damage: { sides: 4, count: 1 }, condition: "Lose Minor Action next turn" };
  if (die <= 4) return { name: "Backlash", description: "Effect occurs at half power. Discord on Thread Checks until Mend.", condition: "Discord on Thread Checks until Mend" };
  if (die === 5) return { name: "Wild Release", description: "Effect occurs at full power but hits the wrong target. Choose the target at the table." };
  return { name: "Tension Spike", description: "Add the casting cost again and make an immediate Strain Check." };
}

export function snapbackResult(die: number): CastTableResult {
  if (die <= 2) return { name: "Flinch", description: "Take 1d6 affinity-typed damage and lose your Minor Action next turn.", damage: { sides: 6, count: 1 }, condition: "Lose Minor Action next turn" };
  if (die <= 4) return { name: "Burn", description: "Take 2d8 affinity-typed damage. −1 to Thread Checks until Mend.", damage: { sides: 8, count: 2 }, condition: "−1 to Thread Checks until Mend" };
  if (die <= 6) return { name: "Rupture", description: "Take 2d10 damage. Make a RES check (DC 14); on failure gain Shaking Hands.", damage: { sides: 10, count: 2 } };
  if (die <= 8) return { name: "Discharge", description: "Take 3d10 damage. Effect releases in a random direction (d8).", damage: { sides: 10, count: 3 } };
  if (die <= 10) return { name: "Overload", description: "Take 3d12 damage. Stunned until end of next turn; all Tension resets to 0.", damage: { sides: 12, count: 3 }, resetTension: true, condition: "Stunned until end of next turn" };
  if (die === 11) return { name: "Collapse", description: "Take 4d12 damage. Unconscious for 1 minute; gain 2 Burnout.", damage: { sides: 12, count: 4 }, burnout: 2, condition: "Unconscious for 1 minute" };
  return { name: "Total Break", description: "Maximum possible damage, a Permanent Injury Table roll, and 3 Burnout. Resolve damage and injury at the table.", burnout: 3, condition: "Permanent injury — resolve at the table" };
}

export function strainDC(current: number, safeLimit: number): number | null {
  return current > safeLimit ? 10 + current - safeLimit : null;
}