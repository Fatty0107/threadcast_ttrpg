export interface NamedStringLevel {
  cost: number;
  dc: number;
  checkAttr: "ths" | "ctr" | "pot";
}

export const CORE_POWER_LEVELS: NamedStringLevel[] = [
  { cost: 1, dc: 8, checkAttr: "ctr" },
  { cost: 3, dc: 11, checkAttr: "ctr" },
  { cost: 6, dc: 14, checkAttr: "ctr" },
  { cost: 10, dc: 17, checkAttr: "ctr" },
  { cost: 15, dc: 20, checkAttr: "ctr" },
];

// Numeric-only catalog copied from the named Water Strings in affinity-data.ts.
// Keep names/level values in sync with the game catalog when that catalog changes.
const waterStrings: Record<string, { checkAttr: NamedStringLevel["checkAttr"]; levels: [number, number][] }> = {
  flow: { checkAttr: "ths", levels: [[1,11],[2,13],[3,15],[5,17],[8,19]] },
  pressure: { checkAttr: "pot", levels: [[1,12],[3,14],[4,16],[6,18],[9,20]] },
  still: { checkAttr: "ctr", levels: [[1,10],[2,13],[4,15],[5,17],[7,19]] },
  vital: { checkAttr: "ths", levels: [[2,12],[3,14],[5,16],[7,18],[10,21]] },
  tide: { checkAttr: "ths", levels: [[2,11],[4,14],[5,16],[7,18],[10,20]] },
  mist: { checkAttr: "ths", levels: [[1,11],[2,13],[4,15],[6,17],[9,19]] },
  current: { checkAttr: "ctr", levels: [[1,10],[2,12],[4,14],[5,16],[8,19]] },
  vortex: { checkAttr: "pot", levels: [[2,12],[3,14],[5,16],[7,18],[10,20]] },
  deluge: { checkAttr: "ths", levels: [[1,11],[3,13],[5,15],[7,17],[10,20]] },
  brine: { checkAttr: "pot", levels: [[1,12],[3,14],[4,16],[6,18],[9,20]] },
  vapor: { checkAttr: "ctr", levels: [[1,11],[2,13],[4,15],[6,17],[9,19]] },
  undertow: { checkAttr: "pot", levels: [[1,11],[3,14],[5,16],[7,18],[10,20]] },
  ripple: { checkAttr: "ths", levels: [[1,10],[2,12],[3,14],[5,16],[8,18]] },
};

export function namedStringLevel(name: string, powerLevel: number): NamedStringLevel | undefined {
  const normalized = name.toLowerCase().replace(/the\s+/g, "").replace(/string/g, "").replace(/[^a-z]/g, "");
  const key = Object.keys(waterStrings).find(id => normalized === id || normalized.includes(id));
  if (!key) return undefined;
  const row = waterStrings[key];
  const [cost, dc] = row.levels[powerLevel - 1] ?? [];
  return cost === undefined || dc === undefined ? undefined : { cost, dc, checkAttr: row.checkAttr };
}

export function calcMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calcThreadPool(level: number, potency: number, control: number): number {
  return Math.max(6, (calcMod(potency) + calcMod(control) + level) * 2);
}

export function calcSafeLimit(level: number, potency: number, control: number): number {
  return Math.max(0, calcMod(potency) + calcMod(control) + level);
}

export function maximumSafePowerLevel(level: number, potency: number): number {
  return Math.max(1, Math.min(5, Math.floor(level + Math.floor((potency - 10) / 2) / 3)));
}

export function weaveMultiplier(stringCount: number): number {
  return stringCount === 3 ? 2 : stringCount === 4 ? 3 : 1;
}

export function weaveCheckMode(
  stringCount: number,
  hasPrecisionWeave: boolean,
  overSafePowerLevel: boolean,
  forcedDiscord: boolean,
): "NORMAL" | "HARMONY" | "DISCORD" {
  if (overSafePowerLevel || forcedDiscord || stringCount > 2) return "DISCORD";
  return hasPrecisionWeave ? "HARMONY" : "NORMAL";
}

const relevantGuildBonuses: Record<string, Record<string, Partial<Record<"pot" | "ctr" | "res" | "ths", number>>>> = {
  "The Scaled Guard": {
    Ashborn: { res: 1 }, Embercloak: { res: 1 }, Ironbrand: { res: 1, ctr: 1 },
    Steelfang: { pot: 1, res: 1 }, Talonarch: { pot: 1 }, Drakeward: { pot: 1, res: 1 }, Wyrmlord: { pot: 2, res: 1 },
  },
  "The Thaumatarch": {
    Spark: { ths: 1 }, Gleamer: { ths: 1 }, Sigilist: { ths: 1, ctr: 1 },
    Runecaller: { ctr: 1 }, Magister: { ctr: 1, ths: 1 }, Archon: { ths: 2, ctr: 1 },
  },
  "The Solar Temple": {
    Ashpetal: { ths: 1 }, Whisperkin: {}, Gracehand: { ctr: 1 }, Lightbearer: { ctr: 1 },
    Flameward: { res: 1 }, Dawnseer: { ths: 1 }, Luminary: { ths: 1, ctr: 1 }, Solanarch: { ths: 1 },
  },
  "The Lorehall": {
    Loreling: { ths: 1 }, Quillborn: {}, Glyphscribe: { ctr: 1 }, Pagewarden: { ths: 1 },
    Inkwright: { ctr: 1, ths: 1 }, Scriptor: { ths: 1 }, Archivarch: { ths: 1 },
  },
  "The Forgecrown": {
    Sparkwright: { ctr: 1 }, Cindertouch: { ctr: 1 }, Shapebinder: { ctr: 1, pot: 1 },
    Metalmind: { ctr: 1 }, Glyphmason: { ctr: 1, pot: 1 }, Artifex: { pot: 1, ctr: 1, ths: 1 },
    Forgeheart: { ctr: 2, pot: 1 },
  },
  "The Highblood Circles": {
    Circlet: {}, Gildthane: { ctr: 1 }, Bloodwarden: {}, "Circle Regent": { ths: 1 }, "High Circle": {},
  },
};

export function guildAttributeBonus(guild: unknown, rank: unknown, attribute: "pot" | "ctr" | "res" | "ths"): number {
  if (typeof guild !== "string" || typeof rank !== "string") return 0;
  return relevantGuildBonuses[guild]?.[rank]?.[attribute] ?? 0;
}