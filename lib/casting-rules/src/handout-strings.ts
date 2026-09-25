type CheckAttribute = "ths" | "ctr" | "pot";
type LevelPairs = readonly [cost: number, dc: number][];
type HandoutEntry = readonly [name: string, checkAttr: CheckAttribute, profile: string];

const profiles: Record<string, LevelPairs> = {
  core: [[1, 8], [3, 11], [6, 14], [10, 17], [15, 20]],
  a: [[1, 11], [2, 13], [4, 15], [6, 17], [9, 19]],
  b: [[2, 12], [3, 14], [5, 16], [7, 18], [10, 20]],
  c: [[2, 13], [4, 15], [6, 17], [8, 19], [11, 21]],
  d: [[1, 10], [2, 12], [3, 14], [5, 16], [8, 18]],
  e: [[1, 11], [3, 13], [4, 15], [6, 17], [9, 19]],
  f: [[1, 10], [2, 13], [4, 15], [6, 17], [8, 19]],
  g: [[1, 11], [2, 13], [4, 15], [6, 17], [9, 20]],
  h: [[1, 11], [3, 13], [5, 15], [7, 17], [10, 20]],
  i: [[1, 12], [2, 14], [4, 16], [6, 18], [9, 20]],
  j: [[1, 12], [3, 14], [4, 16], [6, 18], [9, 20]],
  k: [[1, 11], [2, 13], [4, 15], [6, 17], [9, 20]],
  l: [[1, 11], [2, 13], [4, 15], [6, 17], [9, 19]],
  m: [[1, 11], [3, 13], [5, 15], [7, 17], [10, 20]],
  n: [[1, 12], [2, 14], [4, 16], [6, 18], [9, 20]],
  o: [[2, 12], [4, 15], [6, 17], [8, 19], [11, 21]],
  p: [[1, 10], [2, 12], [4, 14], [6, 17], [8, 19]],
};

const handoutStrings: Record<string, readonly HandoutEntry[]> = {
  luck: [
    ["First Hand", "ctr", "core"], ["Tell", "ctr", "core"], ["Nudge", "ctr", "core"],
    ["Slip", "ctr", "core"], ["Opening", "ctr", "core"], ["Misstep", "ctr", "core"],
    ["Loose Change", "ctr", "core"], ["Fork", "ctr", "core"], ["Wager", "ctr", "core"],
    ["Second Chance", "ctr", "core"], ["Narrow Escape", "ctr", "core"], ["House Edge", "ctr", "core"],
  ],
  "leyline energy conversion": [
    ["Counterpull", "ctr", "a"], ["Impulse", "pot", "a"], ["Spring", "pot", "a"],
    ["Pressure", "pot", "a"], ["Vector", "ctr", "a"], ["Overtone", "ctr", "a"],
    ["Calibration", "ths", "d"], ["Ground", "ctr", "a"], ["Reserve", "ctr", "a"],
    ["Shelter", "ths", "a"], ["Interpose", "ths", "o"], ["Circuit", "ctr", "o"],
  ],
  emotion: [
    ["Echo", "ths", "a"], ["Hush", "ctr", "a"], ["Dread", "pot", "a"],
    ["Valor", "ths", "a"], ["Fury", "pot", "a"], ["Sorrow", "ths", "a"],
    ["Rapture", "pot", "a"], ["Shame", "ths", "a"], ["Veil", "ctr", "a"],
    ["Concord", "ctr", "b"], ["Devotion", "ths", "a"], ["Catharsis", "ctr", "a"],
  ],
  illusions: [
    ["Companion", "ctr", "a"], ["Chime", "ths", "p"], ["Card", "ctr", "a"],
    ["Glamour", "ctr", "a"], ["Sensation", "ths", "b"], ["Reflection", "ctr", "a"],
    ["Curtain", "ctr", "a"], ["Stage", "ths", "b"], ["Misdirection", "pot", "i"],
    ["Labyrinth", "ctr", "b"], ["Seam", "ths", "a"], ["Horizon", "ths", "c"],
  ],
  cosmic: [
    ["Corona", "pot", "a"], ["Starheart", "ctr", "a"], ["Spectrum", "ctr", "a"],
    ["Orbit", "ctr", "a"], ["Constellation", "ths", "b"], ["Vacuum", "ctr", "b"],
    ["Meteor", "pot", "j"], ["Stellar Wind", "pot", "a"], ["Gravity", "pot", "c"],
    ["Eclipse", "ths", "b"], ["Nebula", "ctr", "b"], ["Nova", "pot", "c"],
  ],
  mirror: [
    ["Facet", "ths", "a"], ["Glimmer", "ctr", "a"], ["Echo", "ctr", "a"],
    ["Counterstep", "ctr", "a"], ["Mask", "ctr", "b"], ["Afterimage", "ctr", "b"],
    ["Looking Glass", "ths", "b"], ["Symmetry", "ctr", "a"], ["Borrowed Hand", "ctr", "b"],
    ["Angle", "ctr", "b"], ["Mirrorwalk", "ctr", "c"], ["Trueglass", "ths", "c"],
  ],
  healing: [
    ["Holdfast", "ths", "a"], ["Trace", "ths", "d"], ["Seam", "ctr", "a"],
    ["Set", "ctr", "e"], ["Ease", "ctr", "f"], ["Pulse", "pot", "k"],
    ["Cleanse", "ths", "b"], ["Renewal", "pot", "b"], ["Cradle", "ctr", "m"],
    ["Burden", "ths", "o"], ["Reweave", "ctr", "o"], ["Loom", "ctr", "o"],
  ],
};

function normalized(value: string): string {
  return value.toLowerCase().replace(/\bthe\b/g, "").replace(/\bstring\b/g, "").replace(/[^a-z]/g, "");
}

function affinityKey(affinity: string): string | undefined {
  const key = normalized(affinity);
  return Object.keys(handoutStrings).find(name => normalized(name) === key);
}

/** True when affinity names one of the seven uploaded handout catalogs. */
export function isHandoutAffinity(affinity: string): boolean {
  return affinityKey(affinity) !== undefined;
}

/** Resolves one handout String's server-authoritative TP cost, DC, and check attribute by affinity and PL. */
export function getHandoutStringLevel(
  affinity: string,
  stringName: string,
  powerLevel: number,
): { cost: number; dc: number; checkAttr: CheckAttribute } | undefined {
  if (!Number.isInteger(powerLevel) || powerLevel < 1 || powerLevel > 5) return undefined;
  const key = affinityKey(affinity);
  if (!key) return undefined;
  const target = normalized(stringName);
  const entry = handoutStrings[key].find(([name]) => normalized(name) === target);
  if (!entry) return undefined;
  const [cost, dc] = profiles[entry[2]][powerLevel - 1];
  return { cost, dc, checkAttr: entry[1] };
}

export function getHandoutStringLevelForCharacter(
  character: { affinity?: unknown },
  stringName: string,
  powerLevel: number,
): { cost: number; dc: number; checkAttr: CheckAttribute } | undefined {
  return typeof character.affinity === "string"
    ? getHandoutStringLevel(character.affinity, stringName, powerLevel)
    : undefined;
}