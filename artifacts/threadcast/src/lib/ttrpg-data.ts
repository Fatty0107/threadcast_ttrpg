// ============================================================
// THREADCAST — Complete TTRPG Data
// ============================================================

// --- ATTRIBUTE MECHANICS ---
export const calcMod = (score: number) => Math.floor((score - 10) / 2);
export const fmtMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

export function getRefinementBonus(level: number): number {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  if (level <= 8) return 5;
  return 6;
}

export function calcVPMax(resScore: number, level: number): number {
  return resScore + 8 + (level - 1) * 2;
}

export function calcThreadPool(level: number, thsScore: number): number {
  return level + calcMod(thsScore);
}

export function calcSafeLimit(level: number, ctrScore: number): number {
  return level + calcMod(ctrScore);
}

export function calcGuardRating(resScore: number): number {
  return 8 + calcMod(resScore);
}

export function calcWardRating(ctrScore: number): number {
  return 8 + calcMod(ctrScore);
}

export function calcRecoveryDice(resScore: number): number {
  return Math.max(0, calcMod(resScore) + 2);
}

// --- ATTRIBUTES ---
export const ATTRIBUTE_DEFS = [
  { key: "pot", label: "Potency", abbr: "POT", desc: "Raw magical strength. Powers your effects." },
  { key: "ctr", label: "Control", abbr: "CTR", desc: "Precision and accuracy. Ward Rating, combining Strings." },
  { key: "res", label: "Resilience", abbr: "RES", desc: "Toughness. VP, Guard Rating, recovery." },
  { key: "acu", label: "Acuity", abbr: "ACU", desc: "Mental sharpness. Lore, detection, strategy." },
  { key: "pre", label: "Presence", abbr: "PRE", desc: "Personality and social force." },
  { key: "ths", label: "Threadsense", abbr: "THS", desc: "Leyline sensitivity. Thread Pool, magical awareness." },
] as const;

export type AttrKey = "pot" | "ctr" | "res" | "acu" | "pre" | "ths";
export type Attributes = Record<AttrKey, number>;

// --- SKILLS ---
export const ALL_SKILLS = [
  { name: "Thread Reach", attr: "ths" },
  { name: "Surge", attr: "pot" },
  { name: "Weave Reading", attr: "ths" },
  { name: "Signature Suppression", attr: "ctr" },
  { name: "Strand Awareness", attr: "ths" },
  { name: "Ward Craft", attr: "ctr" },
  { name: "Inscription", attr: "acu" },
  { name: "Anatomy of Magic", attr: "acu" },
  { name: "Combat Forms", attr: "acu" },
  { name: "Swift Hands", attr: "ctr" },
  { name: "Grit", attr: "res" },
  { name: "Discernment", attr: "acu" },
  { name: "Lore", attr: "acu" },
  { name: "Guild Protocol", attr: "pre" },
  { name: "Street Sense", attr: "acu" },
  { name: "Survival", attr: "res" },
  { name: "Presence", attr: "pre" },
  { name: "Trade Craft", attr: "acu" },
] as const;

// --- MODES ---
export const ALL_MODES = [
  {
    name: "Striker",
    desc: "Aggressive damage dealer. Specializes in direct offensive Thread attacks and bypassing defenses.",
    flavor: "You pull the leyline taut and release it like a crossbow bolt.",
  },
  {
    name: "Anchor",
    desc: "Defensive fortress. Specializes in barriers, ward projection, and absorbing magical force.",
    flavor: "You hold the Thread in place. The world breaks against you.",
  },
  {
    name: "Slider",
    desc: "Mobile trickster. Specializes in repositioning, misdirection, and hit-and-run Thread manipulation.",
    flavor: "You don't fight the current. You become it.",
  },
  {
    name: "Binder",
    desc: "Utility and trap-setter. Specializes in persistent effects, magical bindings, and area denial.",
    flavor: "Every surface becomes a warning. Every doorway, a consequence.",
  },
  {
    name: "Shearer",
    desc: "Counter-mage. Specializes in disrupting, nullifying, and redirecting other weavers' magic.",
    flavor: "You find the knot in their Thread and pull it apart.",
  },
  {
    name: "Tensioner",
    desc: "Charged attacker. Builds tension over multiple rounds for devastating delayed releases.",
    flavor: "Patience is power. The longer you hold, the harder it breaks.",
  },
  {
    name: "Imprinter",
    desc: "Inscription specialist. Creates runes, glyphs, and persistent magical constructs on surfaces.",
    flavor: "The world is your spellbook. You just have to write in it.",
  },
  {
    name: "Conductor",
    desc: "Support and battlefield controller. Specializes in wide-area effects and buffing allies.",
    flavor: "You don't play the instrument. You orchestrate the whole band.",
  },
];

// --- GUILDS ---
export const GUILDS = [
  { name: "The Scaled Guard", desc: "Military and law enforcement. Rank structure: Ashborn → Thornguard → Solanarch → Ironwall → Vaultkeeper → Wardmarshal." },
  { name: "The Thaumatarch", desc: "Mage specialists and researchers. Rank structure: Initiate → Adept → Specialist → Theorist → Archthaumaturge." },
  { name: "The Highblood Circles", desc: "Nobility and governance. Rank structure: Circlet → Gildthane → Bloodwarden → Circle Regent → High Circle." },
  { name: "The Solar Temple", desc: "Healing and spiritual guidance. Rank structure: Ashpetal → Candlebearer → Warmlight → Sunspeaker → Solarch." },
  { name: "The Lorehall", desc: "Knowledge preservation and research. Rank structure: Loreling → Scrivener → Archivist → Elder Scribe → Hallmaster." },
  { name: "The Forgecrown", desc: "Magical crafting and enchantment. Rank structure: Sparkling → Ironhand → Runewright → Mastersmith → Crownforger." },
];

// --- AFFINITIES ---
export const AFFINITIES = [
  "Fire", "Water", "Earth", "Air", "Metal", "Wood", "Plant",
  "Ice", "Lightning", "Glass", "Stone", "Sound", "Light",
  "Shadow", "Void", "Blood", "Storm", "Ash",
];

// --- BACKGROUNDS ---
export interface Background {
  name: string;
  desc: string;
  attrBonuses: Partial<Record<AttrKey, number>>;
  flexBonus?: number; // number of +1 to choose freely
  startingSkills: string[];
  startingRank?: string;
  startingBurnout?: number;
  penalty?: string;
  benefit?: string;
}

export const BACKGROUNDS: Background[] = [
  {
    name: "Guild-Raised",
    desc: "You grew up inside or adjacent to one of the major guilds. You understand hierarchy, protocols, and how to navigate institutional power.",
    attrBonuses: { ctr: 1, acu: 1, pre: 1 },
    startingSkills: ["Guild Protocol", "Lore", "Discernment"],
    startingRank: "One rank above minimum in your chosen guild",
  },
  {
    name: "Civilian Mage",
    desc: "Your magic was always practical. You used it to work, to trade, to provide.",
    attrBonuses: { ctr: 1, res: 1 },
    flexBonus: 1,
    startingSkills: ["Trade Craft", "Survival", "Street Sense"],
    startingRank: "None (civilian license only)",
  },
  {
    name: "Self-Taught",
    desc: "No academy, no master, no safety net. You figured it out yourself through trial, error, and injuries that still ache in cold weather.",
    attrBonuses: { ths: 2, pot: 1 },
    startingSkills: ["Weave Reading", "Survival"],
    flexBonus: 1,
    startingBurnout: 1,
    penalty: "Begin with 1 level of Burnout (recoverable).",
    benefit: "Choose one Unorthodox Technique — a method that breaks standard rules in a limited way (work with your Weavekeeper).",
  },
  {
    name: "Noble-Born",
    desc: "The Highblood Circles shaped your childhood — etiquette, bloodline politics, the constant weight of inherited expectation.",
    attrBonuses: { pre: 2, acu: 1 },
    flexBonus: 1,
    startingSkills: ["Discernment", "Lore", "Guild Protocol"],
    startingRank: "Gildthane in the Highblood Circles",
  },
  {
    name: "Military Family",
    desc: "The Scaled Guard or blade-culture. You were trained in violence before magic — or at the same time.",
    attrBonuses: { res: 2, acu: 1, pot: 1 },
    startingSkills: ["Combat Forms", "Grit", "Survival"],
    startingRank: "Ashborn in the Scaled Guard",
  },
  {
    name: "Scholar's Lineage",
    desc: "The Lorehall's culture runs in your veins. Precision matters.",
    attrBonuses: { acu: 2, ths: 2 },
    startingSkills: ["Lore", "Weave Reading", "Inscription"],
    startingRank: "Loreling in the Lorehall",
  },
  {
    name: "Temple-Raised",
    desc: "The Solar Temple formed your understanding of magic as something sacred and costly — to be wielded with care, never with carelessness.",
    attrBonuses: { pre: 1, ctr: 1, ths: 1 },
    flexBonus: 1,
    startingSkills: ["Anatomy of Magic", "Discernment", "Ward Craft"],
    startingRank: "Ashpetal in the Solar Temple",
  },
];

// --- FEATS ---
export interface Feat {
  name: string;
  category: "combat" | "defense" | "magic" | "utility";
  minLevel: number;
  prerequisites: string;
  desc: string;
  mechanical: string;
  usesPerRest?: number;
  restType?: "mend" | "long" | "combat";
  passiveBonus?: {
    vpMax?: number;
    wardRating?: number;
    threadPool?: number;
    safeLimit?: number;
    guardRating?: number;
  };
}

export const FEATS: Feat[] = [
  // CORE CHOICES (always available at even levels)
  {
    name: "Attribute Score Improvement",
    category: "utility",
    minLevel: 2,
    prerequisites: "Even level",
    desc: "Increase one Attribute Score by 2, or two by 1 each. No score can exceed 20.",
    mechanical: "Core choice. Can be taken multiple times across different levels.",
  },
  {
    name: "Attunement (Skilled)",
    category: "utility",
    minLevel: 2,
    prerequisites: "Even level",
    desc: "Become Attuned to one skill you don't have. Or swap an unused Attuned skill.",
    mechanical: "Add Refinement Bonus to that skill's checks. Core choice.",
  },
  {
    name: "Expertise",
    category: "utility",
    minLevel: 2,
    prerequisites: "Already Attuned to chosen skill",
    desc: "Double your Refinement Bonus for one Attuned skill. May not apply to same skill twice.",
    mechanical: "RB becomes +4/+6/+8/+10/+12 for chosen skill. Core choice.",
  },
  // COMBAT FEATS
  {
    name: "Snapback Veteran",
    category: "combat",
    minLevel: 2,
    prerequisites: "Striker or Tensioner Primary Mode",
    desc: "Roll twice on the Snapback Table and choose the lower result. Reduce all Snapback damage by RES modifier.",
    mechanical: "Snapback table: roll twice keep lower. Snapback damage −RES mod (min 0).",
  },
  {
    name: "Overcaster",
    category: "combat",
    minLevel: 2,
    prerequisites: "None",
    desc: "Once per Mend, cast at PL one above your safe maximum without automatic Discord.",
    mechanical: "1/Mend: +1 PL over safe max without Discord penalty. Still Discord if +2 over max.",
    usesPerRest: 1,
    restType: "mend",
  },
  {
    name: "Thread Strike",
    category: "combat",
    minLevel: 2,
    prerequisites: "POT 14+",
    desc: "Add your Threadsense modifier to magical damage rolls in addition to Potency modifier.",
    mechanical: "Magical damage +THS modifier on top of POT modifier.",
  },
  {
    name: "War Weaver",
    category: "combat",
    minLevel: 4,
    prerequisites: "None",
    desc: "Casting PL 1–2 as a Minor Action becomes a free action once per round.",
    mechanical: "1/round: PL 1–2 cast = free action (not Minor Action). Get full Minor Action still.",
    usesPerRest: 1,
    restType: "combat",
  },
  {
    name: "Pressured Casting",
    category: "combat",
    minLevel: 4,
    prerequisites: "RES 14+",
    desc: "Once per round, cast normally despite Shaking Hands, Stunned, or Wound — costs 1 extra Tension.",
    mechanical: "1/round: ignore condition Discord on Thread Check. +1 Tension cost.",
    usesPerRest: 1,
    restType: "combat",
  },
  {
    name: "Precision Weave",
    category: "combat",
    minLevel: 4,
    prerequisites: "CTR 16+",
    desc: "Two-String Weaves are made at Harmony. First two-String Weave per Mend costs 1 less Tension.",
    mechanical: "Two-String Weave Thread Check at Harmony. 1st per Mend: −1 Tension cost.",
    usesPerRest: 1,
    restType: "mend",
  },
  {
    name: "Breach Striker",
    category: "combat",
    minLevel: 6,
    prerequisites: "Striker Primary Mode",
    desc: "Damage punches through magical barriers. Excess damage carries to target. Ignore 5 pts magical damage reduction.",
    mechanical: "Damage reduces barrier first, excess carries through. Ignore 5 pts magical DR.",
  },
  {
    name: "Twin String Draw",
    category: "combat",
    minLevel: 6,
    prerequisites: "CTR 16+",
    desc: "Use two same-family Strings simultaneously without it counting as a formal Weave. Normal Thread Check instead of Discord.",
    mechanical: "Two same-family Strings at once = Normal roll (not Discord). Moderate combined effect.",
  },
  {
    name: "Catastrophic Release",
    category: "combat",
    minLevel: 8,
    prerequisites: "Tensioner Primary or Secondary Mode",
    desc: "Max-charge Tensioner doubles area. Targets must RES Check DC(14+POT mod) or be knocked Prone. Max charge +1 round for PL5.",
    mechanical: "Max charge: 2× AoE, Prone on failed RES Check. PL5 max charge now 4+ rounds.",
  },
  {
    name: "Killswitch",
    category: "combat",
    minLevel: 8,
    prerequisites: "Shearer Primary Mode",
    desc: "Successfully counterspelling lets you redirect half the disrupted energy as 2d10+POT mod damage burst (30ft).",
    mechanical: "After successful counterspell: 2d10+POT mod damage, 30ft, any target.",
  },
  {
    name: "Thread of Fate",
    category: "combat",
    minLevel: 10,
    prerequisites: "None",
    desc: "Once per Full Recovery: drop to 1 VP instead of 0. Next Thread Check at Harmony, max damage on hit.",
    mechanical: "1/Full Recovery: survive lethal damage at 1 VP. Next roll: Harmony + max damage.",
    usesPerRest: 1,
    restType: "long",
  },
  // DEFENSIVE FEATS
  {
    name: "Iron Constitution",
    category: "defense",
    minLevel: 2,
    prerequisites: "RES 13+",
    desc: "Maximum VP +4. When spending a Recovery Die during a Mend, recover maximum value instead of rolling.",
    mechanical: "+4 VP max. Recovery Dice = max value, no roll needed.",
    passiveBonus: { vpMax: 4 },
  },
  {
    name: "Burnout Resistance",
    category: "defense",
    minLevel: 2,
    prerequisites: "None",
    desc: "Reduce effective Burnout by one level for mechanical purposes. Burnout 2 suffers only Burnout 1 effects.",
    mechanical: "Effective Burnout level −1 for penalties. Actual Burnout still accumulates normally.",
  },
  {
    name: "Ward Specialist",
    category: "defense",
    minLevel: 2,
    prerequisites: "CTR 14+, Attuned: Ward Craft",
    desc: "+2 Ward Rating. When a magical attack misses you, use Reaction to absorb 1d6+CTR mod as free Tension (up to Safe Limit).",
    mechanical: "+2 Ward Rating. Reaction: missed magic → 1d6+CTR mod free TP (≤ Safe Limit).",
    passiveBonus: { wardRating: 2 },
  },
  {
    name: "Pain Tolerance",
    category: "defense",
    minLevel: 4,
    prerequisites: "RES 15+",
    desc: "First damage taken each round reduced by 3. May reroll Wound Table once per roll.",
    mechanical: "First damage/round −3 (after reductions). Wound Table: reroll once, take either.",
  },
  {
    name: "Scarhanded",
    category: "defense",
    minLevel: 4,
    prerequisites: "None",
    desc: "Snapback damage only causes Shaking Hands if it exceeds 10 pts. Can use damaged casting gloves without penalty.",
    mechanical: "Shaking Hands threshold: >10 damage. Degraded gloves: no penalty.",
  },
  {
    name: "Anchor Mastery",
    category: "defense",
    minLevel: 4,
    prerequisites: "Anchor Primary or Secondary Mode",
    desc: "While maintaining an Anchor barrier, retain full Minor Action economy. Only lose your Major Action.",
    mechanical: "Anchor maintenance: keep all Minor Actions. Only forfeit Major Action.",
  },
  {
    name: "Second Wind",
    category: "defense",
    minLevel: 6,
    prerequisites: "RES 14+",
    desc: "Once per combat, Minor Action + 2 Tension: recover VP equal to your full RES score.",
    mechanical: "1/combat: Minor Action + 2 Tension → +RES score VP. Ignores Wounds/conditions.",
    usesPerRest: 1,
    restType: "combat",
  },
  {
    name: "Elemental Adaptation",
    category: "defense",
    minLevel: 6,
    prerequisites: "None",
    desc: "Resistant to Snapback damage matching your Affinity (half damage). Your Affinity's environment does no incidental damage.",
    mechanical: "Own-element Snapback: half damage. Own-element environment: zero incidental damage.",
  },
  {
    name: "Living Shield",
    category: "defense",
    minLevel: 8,
    prerequisites: "Anchor Primary Mode",
    desc: "Reaction + 2 Tension: teleport to ally within 30ft and intercept an attack targeting them. 1/round.",
    mechanical: "Reaction + 2 TP: swap to ally's position, become target. 1/round.",
    usesPerRest: 1,
    restType: "combat",
  },
  {
    name: "Void Resistance",
    category: "defense",
    minLevel: 8,
    prerequisites: "None",
    desc: "Corruption collapse threshold treated as 8 (not 10). Corruption accumulates at half rate in Hollowing environments. Healers remove 1 extra Corruption/session.",
    mechanical: "Corruption collapse at 8. Half rate in Hollowing areas. +1 removed by healers.",
  },
  {
    name: "Deathless",
    category: "defense",
    minLevel: 10,
    prerequisites: "RES 18+",
    desc: "Succeed on Death's Edge on a roll of 7+ (not 10+). Nat 20 = regain 1d8+RES mod VP. Three failures before death instead of two.",
    mechanical: "Death Check: succeed on 7+. Nat 20 = 1d8+RES mod VP. +1 extra death failure.",
  },
  // MAGIC TECHNIQUE FEATS
  {
    name: "Thread Reader",
    category: "magic",
    minLevel: 2,
    prerequisites: "THS 14+, Attuned: Weave Reading",
    desc: "Minor Action: read local leyline environment (tension level, active magic 60ft, leylines available, Hollowing presence). No Tension, no Signature.",
    mechanical: "Minor Action: environmental scan. No cost, no signature.",
  },
  {
    name: "Efficient Caster",
    category: "magic",
    minLevel: 2,
    prerequisites: "None",
    desc: "When casting PL 1–2 successfully with at least 6 seconds to work, reduce Tension Cost by 1 (min 0). Not in combat.",
    mechanical: "PL 1–2 non-combat: −1 Tension cost (min 0).",
  },
  {
    name: "Signature Suppression (Feat)",
    category: "magic",
    minLevel: 2,
    prerequisites: "CTR 13+, Attuned: Signature Suppression",
    desc: "Once per round when casting, spend 2 extra Tension to fully suppress your Signature. Detection DC = 14+CTR mod.",
    mechanical: "1/round: +2 Tension → invisible signature. Detection DC 14+CTR mod.",
    usesPerRest: 1,
    restType: "combat",
  },
  {
    name: "Resonance Harmony",
    category: "magic",
    minLevel: 4,
    prerequisites: "Two Modes unlocked",
    desc: "Switching from Primary to Secondary Mode within the same round: Secondary Mode check at Normal (not penalized).",
    mechanical: "Same-round mode switch: Secondary Mode = Normal roll (no Discord).",
  },
  {
    name: "Extended Thread Pool",
    category: "magic",
    minLevel: 4,
    prerequisites: "None",
    desc: "Thread Pool maximum +4. Safe Limit +2.",
    mechanical: "+4 Thread Pool max. +2 Safe Limit.",
    passiveBonus: { threadPool: 4, safeLimit: 2 },
  },
  {
    name: "Steady Grip",
    category: "magic",
    minLevel: 4,
    prerequisites: "CTR 15+",
    desc: "When you fail a Thread Check (but don't Misfire), you may spend 2 extra Tension to treat it as a PL 1 success instead.",
    mechanical: "Failed Thread Check (not Nat 1): +2 Tension → treat as PL 1 success.",
  },
  {
    name: "Deep Weave",
    category: "magic",
    minLevel: 6,
    prerequisites: "THS 16+",
    desc: "When you cast at PL 4+, you may choose not to generate a visible Signature. You still generate signature at PL 5. Tension cost +1.",
    mechanical: "PL 4: no signature, +1 Tension. PL 5: signature still generated.",
  },
  {
    name: "Leyline Sense",
    category: "magic",
    minLevel: 6,
    prerequisites: "THS 15+, Attuned: Strand Awareness",
    desc: "Passively detect active magic within 30ft. Sense Thread Pool of nearby weavers. Cannot be surprised by magical effects.",
    mechanical: "Passive: detect magic 30ft. Cannot be surprised by magic.",
  },
  {
    name: "String Mastery",
    category: "magic",
    minLevel: 8,
    prerequisites: "One String at full 5 PL",
    desc: "Choose one String. Its Tension costs reduced by 1 at every PL (min 1). Its DCs reduced by 1.",
    mechanical: "One String: all PL Tension −1 (min 1). All DCs −1.",
  },
  {
    name: "Weave Unraveler",
    category: "magic",
    minLevel: 8,
    prerequisites: "Shearer or Binder Primary Mode",
    desc: "When you successfully counter or unbind a magical effect, you may absorb Tension equal to half the disrupted PL × 2.",
    mechanical: "Successful counter/unbind: absorb PL×1 Tension (free).",
  },
  {
    name: "Infinite Thread",
    category: "magic",
    minLevel: 10,
    prerequisites: "THS 20",
    desc: "Once per Full Recovery, one Thread Check costs 0 Tension regardless of PL or String.",
    mechanical: "1/Full Recovery: one cast at 0 Tension cost.",
    usesPerRest: 1,
    restType: "long",
  },
];

// --- INVENTORY ITEMS ---
export type ItemRarity = "common" | "uncommon" | "rare" | "very-rare" | "legendary" | "mythical";

export interface InventoryItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  category: "weapon" | "armor" | "casting" | "potion" | "consumable" | "magical" | "kit" | "mount";
  subCategory?: string;
  desc: string;
  mechanical?: string;
  cost?: string;
}

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: "text-muted-foreground",
  uncommon: "text-chart-2",
  rare: "text-blue-400",
  "very-rare": "text-purple-400",
  legendary: "text-primary",
  mythical: "text-destructive",
};

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "very-rare": "Very Rare",
  legendary: "Legendary",
  mythical: "Mythical",
};

export const CATALOG_ITEMS: InventoryItem[] = [
  // ── WEAPONS: Melee Standard ───────────────────────────────────────────────
  { id: "w1",  name: "Dagger",               rarity: "common",    category: "weapon", subCategory: "Melee · Light",    desc: "A short double-edged blade, easily concealed. Favoured by mages who need a weapon that doesn't interfere with casting grip. Fits in a boot or sleeve.", mechanical: "1d6 + ACU mod | Concealable; throwable 20 ft" },
  { id: "w2",  name: "Short Sword",          rarity: "common",    category: "weapon", subCategory: "Melee · Light",    desc: "A one-handed blade with a broad guard, common across all guilds. Reliable, well-balanced, easy to maintain.", mechanical: "1d6 + ACU mod | One-handed, military standard" },
  { id: "w3",  name: "Spear",                rarity: "common",    category: "weapon", subCategory: "Melee · Standard", desc: "A long shaft with an iron or steel tip. Useful for keeping enemies at distance while your other hand maintains a leyline grip.", mechanical: "1d8 + RES mod | Reach 10 ft; one or two-handed" },
  { id: "w4",  name: "Arming Sword",         rarity: "common",    category: "weapon", subCategory: "Melee · Standard", desc: "The standard weapon of guild soldiers and trained fighters across Aethros. Single-handed, well-balanced, a century of battlefield refinement.", mechanical: "1d8 + RES mod | One-handed, military standard" },
  { id: "w5",  name: "War Axe",              rarity: "common",    category: "weapon", subCategory: "Melee · Standard", desc: "A broad-headed axe built for chopping through armor and obstacles. Brutally simple. Popular with Conductor-Mode mages who go into melee.", mechanical: "1d8 + RES mod | Cleaving: on kill, attack adjacent enemy for free (once)" },
  { id: "w6",  name: "Greatsword",           rarity: "common",    category: "weapon", subCategory: "Melee · Heavy",    desc: "A two-handed sword requiring significant strength. Deals devastating damage but leaves no hand free for casting.", mechanical: "1d10 + RES mod | Two-handed; reach 5 ft; −1 CTR checks while held" },
  { id: "w7",  name: "War Hammer",           rarity: "common",    category: "weapon", subCategory: "Melee · Heavy",    desc: "A blunt crushing weapon that ignores some physical armor. Favoured by those facing armored opponents. The sound it makes on contact is deeply unpleasant.", mechanical: "1d10 + RES mod | Two-handed; ignores 2 pts physical damage reduction" },
  { id: "w8",  name: "Boarding Knife",       rarity: "common",    category: "weapon", subCategory: "Melee · Light",    desc: "A thick, short blade designed for close quarters. Standard naval and city-guard issue. Cheap, reliable, and terrible in its simplicity.", mechanical: "1d6 + ACU mod | Free Action draw if already in combat" },
  { id: "w9",  name: "Staff",                rarity: "common",    category: "weapon", subCategory: "Melee · Standard", desc: "A plain wooden or iron staff used by mages who want reach without metal interference. Wooden staffs cause slightly less Thread Sense interference than metal weapons.", mechanical: "1d8 + RES mod | Two-handed; +1 Ward Rating while wielded" },
  // ── WEAPONS: Ranged Standard ─────────────────────────────────────────────
  { id: "wr1", name: "Shortbow",             rarity: "common",    category: "weapon", subCategory: "Ranged",           desc: "A compact bow that can be used on horseback or in tight spaces. Common among scouts and Slider-Mode mages who need ranged backup.", mechanical: "1d6 + ACU mod | Range 80/320 ft | Two-handed; Minor Action to draw" },
  { id: "wr2", name: "Longbow",              rarity: "common",    category: "weapon", subCategory: "Ranged",           desc: "Standard military ranged weapon. Requires training to use effectively. The Scaled Guard issues these to every unit's ranged contingent.", mechanical: "1d8 + ACU mod | Range 150/600 ft | Two-handed; requires RES 12+" },
  { id: "wr3", name: "Hand Crossbow",        rarity: "common",    category: "weapon", subCategory: "Ranged",           desc: "A small crossbow that can be used one-handed. Slower to reload than a bow but easier to use while maintaining a half-grip on leylines.", mechanical: "1d6 + ACU mod | Range 30/120 ft | One-handed; reload Minor Action" },
  { id: "wr4", name: "Heavy Crossbow",       rarity: "common",    category: "weapon", subCategory: "Ranged",           desc: "A powerful crossbow that punches through armor. Slow to reload but devastating at range. Requires two hands and full focus to operate.", mechanical: "1d10 + ACU mod | Range 100/400 ft | Two-handed; reload Major Action; ignores 3 pts physical DR" },
  { id: "wr5", name: "Throwing Knives (×3)", rarity: "common",    category: "weapon", subCategory: "Ranged",           desc: "Balanced throwing knives, weighted for accurate short-range throwing. A mage's backup option for situations where casting would draw too much attention.", mechanical: "1d4 + ACU mod | Range 30 ft | Three separate knives; all 3 throwable in one Major Action" },
  // ── WEAPONS: Enchanted Uncommon ──────────────────────────────────────────
  { id: "we1", name: "Warded Blade",         rarity: "uncommon",  category: "weapon", subCategory: "Melee · Enchanted", desc: "A sword enchanted with a basic protective ward. While held, the wielder's Ward Rating increases by 1. The runes along the blade glow faintly when magic is cast nearby — a useful warning system.", mechanical: "1d8 + RES mod | +1 Ward Rating while held | Glows faintly near active magic" },
  { id: "we2", name: "Heatsteel Dagger",     rarity: "uncommon",  category: "weapon", subCategory: "Melee · Enchanted", desc: "Forged using a fire mage's sustained heat grip during metalworking. Retains warmth permanently. Deals bonus fire damage and lights fires as a Minor Action.", mechanical: "1d6 + ACU mod + 1d4 fire | Always warm; lights fires as Minor Action (blade tip)" },
  { id: "we3", name: "Resonance Spear",      rarity: "uncommon",  category: "weapon", subCategory: "Melee · Enchanted", desc: "Attuned to a specific Affinity at time of creation. When wielded by a mage with matching Affinity, damage increases and it functions as a magical conduit.", mechanical: "1d8 + RES mod (+1d6 if Affinity matches) | PL1 effects through blade cost −1 Tension" },
  { id: "we4", name: "Silenced Blade",       rarity: "uncommon",  category: "weapon", subCategory: "Melee · Enchanted", desc: "Enchanted to produce no sound when it strikes. Attacks produce no auditory alert. Also suppresses minor ambient noise within 5 ft. Prized by Slider-Mode mages.", mechanical: "1d6 + ACU mod | Silent strikes | No sound within 5 ft of wielder" },
  { id: "we5", name: "Counterweight Axe",    rarity: "uncommon",  category: "weapon", subCategory: "Melee · Enchanted", desc: "Enchanted so its weight subtly adjusts while in motion. Easier to swing than its size suggests. Wielders feel as though the axe wants to complete its arc.", mechanical: "1d10 + RES mod | No CTR penalty while wielded; +1 to attack rolls" },
  { id: "we6", name: "Coldsteel Sword",      rarity: "uncommon",  category: "weapon", subCategory: "Melee · Enchanted", desc: "Treated with ice-affinity enchantment during forging. Deals cold bonus damage and leaves frost on wounds, causing brief numbing.", mechanical: "1d8 + RES mod + 1d4 cold | Targets hit: RES DC 12 or −5 ft movement for 1 round" },
  // ── WEAPONS: Enchanted Rare ───────────────────────────────────────────────
  { id: "we7", name: "Threadblade",          rarity: "rare",      category: "weapon", subCategory: "Melee · Rare",     desc: "A sword whose edge is partially made of condensed leyline energy. Bypasses normal physical armor entirely. Occasionally vibrates when strong magic is nearby.", mechanical: "1d8 + RES mod + 2d6 magical (Affinity-typed) | Ignores all physical DR | Vibrates near PL4+ magic" },
  { id: "we8", name: "Memory Blade",         rarity: "rare",      category: "weapon", subCategory: "Melee · Rare",     desc: "Forged by a Memory-Affinity mage over years of work. Strikes deal psychic disorientation damage. Does not work on mindless targets.", mechanical: "1d8 + RES mod + 1d10 disorientation | Targets: PRE DC 16 or lose Reaction" },
  { id: "we9", name: "Snapback Hammer",      rarity: "rare",      category: "weapon", subCategory: "Melee · Rare",     desc: "An artificer's masterwork that absorbs kinetic energy from blocked attacks and releases it into the next strike. Visible as a faint amber glow.", mechanical: "1d10 + RES mod (+2d6 if charge stored) | Stores charge when attack against wielder misses by 5+" },
  { id: "we10", name: "Void-Edge Dagger",    rarity: "rare",      category: "weapon", subCategory: "Melee · Rare",     desc: "Recovered from near the Hollowing boundary and reworked by a Forgecrown master. Wounds resist magical healing. Gives the wielder a constant sense of mild unease.", mechanical: "1d6 + ACU mod + 2d6 cold/necrotic | Wounds resist healing (Anatomy DC 15 to be effective)" },
  // ── WEAPONS: Legendary & Mythical ────────────────────────────────────────
  { id: "wl1", name: "The Unstrung Bow",     rarity: "legendary", category: "weapon", subCategory: "Ranged · Legendary", desc: "A bow with no physical string. The archer grips a leyline and fires. Range and damage scale with Tension spent. Requires POT 16+ to use without constant Snapback risk.", mechanical: "1d8 + ACU mod + 1d6/Tension spent (max +2d8) | No physical ammo; unlimited range" },
  { id: "wl2", name: "Wyrmlord's Greatsword",rarity: "legendary", category: "weapon", subCategory: "Melee · Legendary", desc: "The ceremonial and combat weapon of the Scaled Guard's supreme rank. Ignites in the wielder's Affinity element. Requires Steelfang rank or above.", mechanical: "1d10 + RES mod + 2d8 Affinity | Free PL3 cast 1×/Full Recovery (no Tension, no Check)" },
  { id: "wm1", name: "Thread-Ripper",        rarity: "mythical",  category: "weapon", subCategory: "Melee · Mythical",  desc: "An artifact of uncertain origin. This massive cleaving blade can physically cut leylines, severing active magic in its arc. Extremely dangerous to hold.", mechanical: "2d12 + RES mod | Severs active magic in path | CTR DC 18 or lose 1 String for 1 hour | Wielder: RES DC 14/round or 1d6 internal damage" },
  // ── ARMOR ─────────────────────────────────────────────────────────────────
  { id: "a1",  name: "Leather Armor",        rarity: "common",    category: "armor",  subCategory: "Light",            desc: "Tanned leather, reinforced at key strike points. Standard issue for scouts and mages who value mobility over protection. Does not interfere with Thread Sense.", mechanical: "+1 Guard Rating | No Thread Sense penalty | Weight: Light, no movement penalty" },
  { id: "a2",  name: "Chainmail",            rarity: "common",    category: "armor",  subCategory: "Medium",           desc: "Interlocking metal rings covering the torso and arms. Solid general-purpose protection used across the Scaled Guard. The metal interferes slightly with Thread Sense.", mechanical: "+2 Guard Rating | −1 Thread Sense checks | −5 ft movement" },
  { id: "a3",  name: "Plate Armor",          rarity: "common",    category: "armor",  subCategory: "Heavy",            desc: "Full metal plate. Excellent physical protection but significant magical interference. Casting while wearing full plate imposes Discord on all Thread Checks.", mechanical: "+4 Guard Rating | Discord on all Thread Checks | −10 ft movement | Requires RES 14+" },
  { id: "a4",  name: "Shield (Standard)",    rarity: "common",    category: "armor",  subCategory: "Shield",           desc: "A standard round or kite shield. One hand occupied. Cannot cast two-handed while using a shield, but single-handed casting remains possible.", mechanical: "+2 Guard Rating | One hand occupied | Compatible with single-handed casting" },
  { id: "a5",  name: "Warded Leather",       rarity: "uncommon",  category: "armor",  subCategory: "Light · Enchanted", desc: "Leather armor with protective wards worked into the material at the tanning stage. Better physical protection without any Thread Sense interference.", mechanical: "+2 Guard Rating | No Thread Sense penalty | First Snapback damage/encounter reduced by 1d4" },
  { id: "a6",  name: "Runed Chainmail",      rarity: "uncommon",  category: "armor",  subCategory: "Medium · Enchanted", desc: "Chainmail with Thread-Sense-smoothing runes etched into every third ring. The interference with magical perception is almost entirely eliminated. A Forgecrown achievement.", mechanical: "+2 Guard Rating | No Thread Sense penalty | −5 ft movement" },
  { id: "a7",  name: "Mage's Warding Cloak", rarity: "uncommon",  category: "armor",  subCategory: "Light · Enchanted", desc: "A heavy cloak woven from warded fabric. Minimal physical protection but significant magical defense. Identifiable as a mage's protection by guild members.", mechanical: "+0 GR | +2 Ward Rating | No Thread Sense penalty" },
  { id: "a8",  name: "Snapback Vest",        rarity: "rare",      category: "armor",  subCategory: "Light · Enchanted", desc: "A padded vest containing warded crystals that fracture under pressure to absorb magical impact. Each crystal absorbs one Snapback event; 3 events per crystal set before they're spent.", mechanical: "+1 GR | Reduce Snapback damage by 2d8 (3 uses per crystal set) | Crystals replaceable" },
  { id: "a9",  name: "Threaded Plate",       rarity: "rare",      category: "armor",  subCategory: "Heavy · Enchanted", desc: "Full plate armor with leyline-conducting threads woven through it, designed by the Scaled Guard and Forgecrown. Casting in this armor is possible at only −1 CTR instead of Discord.", mechanical: "+4 GR | Only −1 CTR modifier on Thread Checks (not Discord) | −5 ft movement | Requires RES 14+" },
  { id: "a10", name: "Living Carapace",      rarity: "very-rare", category: "armor",  subCategory: "Medium · Rare",    desc: "Grown rather than forged, this armor responds to the wearer's magical output. Guard Rating is variable — low during casting, high during physical combat. Self-repairs minor damage over 24 hours.", mechanical: "+1 GR normally | +3 GR in physical combat | +2 WR during casting | No THS penalty | Self-repairing" },
  { id: "a11", name: "Hollowing-Warded Plate",rarity:"legendary",  category: "armor",  subCategory: "Heavy · Legendary", desc: "Plate armor specifically enchanted to resist Hollowing corruption. Requires maintenance from a Solar Temple priest once per month or the wards begin to degrade. Has a faint gold inner luminescence.", mechanical: "+5 GR | Corruption accumulates at half rate | Shadow/Void damage halved | Requires monthly Temple maintenance | −5 ft movement" },
  // ── CASTING EQUIPMENT: Gloves ─────────────────────────────────────────────
  { id: "c1",  name: "Basic Warded Leather Gloves", rarity: "common",   category: "casting", subCategory: "Gloves", desc: "Entry-level casting protection. Every student gets a pair. Reduces Snapback damage slightly but the leather gets uncomfortably stiff after extended sessions.", mechanical: "Reduce Snapback damage by 1d4 | −1 Thread Sense checks | Durable for ~6 months regular use" },
  { id: "c2",  name: "Runed Silk Gloves",            rarity: "uncommon", category: "casting", subCategory: "Gloves", desc: "Silk woven with heat-resistance runes. Better protection than leather without the sensitivity loss. The gold-thread runing visibly identifies the wearer as a journeyman mage or above.", mechanical: "Reduce Snapback damage by 1d6 | No Thread Sense penalty | Identifies wearer as trained mage" },
  { id: "c3",  name: "Crystalline Weave Gloves",     rarity: "rare",     category: "casting", subCategory: "Gloves", desc: "Gloves incorporating thread-thin crystalline strands that distribute leyline friction across a larger surface area. Excellent heat protection, though precise multi-String work is slightly harder.", mechanical: "Reduce Snapback damage by 2d6 | −1 CTR modifier on Thread Checks requiring precise String isolation" },
  { id: "c4",  name: "Living Fabric Gloves",          rarity: "very-rare",category: "casting", subCategory: "Gloves", desc: "Grown from a Forgecrown plant-affinity master's specialized cultivation. The gloves adapt to the wearer's casting style over 1d4 weeks. Once adapted, they self-repair minor damage overnight. Cannot be sold or transferred once adapted.", mechanical: "Reduce Snapback damage by 2d8 | No THS penalty once adapted | Self-repairing | Permanently attuned to one wearer" },
  { id: "c5",  name: "Bare Grip (No Gloves)",         rarity: "common",   category: "casting", subCategory: "Gloves", desc: "Some veteran mages refuse gloves entirely. Their hands are permanently scarred, heavily calloused, and extraordinarily sensitive. A casting technique as much as an equipment choice.", mechanical: "No Snapback protection | +1 Thread Sense checks | Character accumulates visible scarring over time" },
  // ── CASTING EQUIPMENT: Talismans & Focus ─────────────────────────────────
  { id: "c6",  name: "Grounding Talisman",            rarity: "common",   category: "casting", subCategory: "Talisman", desc: "A small enchanted stone worn around the neck. Helps dissipate minor magical feedback before it reaches the caster's body. Not powerful enough to stop a true Snapback.", mechanical: "Reduce minor feedback damage (non-Snapback) by 2 | Recharges after Full Recovery" },
  { id: "c7",  name: "Tension Counter (Bead String)", rarity: "common",   category: "casting", subCategory: "Focus",    desc: "A practical tool: a string of 20 beads, each representing 1 Tension Point. Mages slide beads as they cast. More reliable than mental tracking during high-pressure situations. Standard issue at most academies.", mechanical: "No mechanical benefit | Prevents Tension tracking errors under stress | Standard mage equipment" },
  { id: "c8",  name: "Signature Suppressor Pin",      rarity: "uncommon", category: "casting", subCategory: "Focus",    desc: "A small enchanted pin worn on the collar or lapel. When activated, it dampens your casting Signature for 3 rounds before needing a 10-minute Mend to recharge. Not perfect — DC 17 can still detect faint residue.", mechanical: "Minor Action to activate | Suppress Signature for 3 rounds | Recharges on Mend | DC 17 Thread Sense to detect residue" },
  { id: "c9",  name: "Resonance Compass",             rarity: "uncommon", category: "casting", subCategory: "Focus",    desc: "Enchanted to detect strong leyline activity within 1 mile. The needle points toward the nearest Leyline Nexus. In Dead Zones, the needle spins. Near the Hollowing, it points consistently toward it.", mechanical: "Detects Nexuses and major magic within 1 mile | Dead Zone and Hollowing direction indication | No Tension cost" },
  { id: "c10", name: "Mage's Journal (Attuned)",      rarity: "uncommon", category: "casting", subCategory: "Focus",    desc: "A specially prepared journal that records magical experiences more accurately than memory alone. After each casting session, 10 minutes of writing counts as a partial analysis. Builds a bonus to Weave Reading over time.", mechanical: "After 1 month regular use: +1 Weave Reading | Accurate record of magical experiences" },
  { id: "c11", name: "Thread Anchor Stone",           rarity: "rare",     category: "casting", subCategory: "Focus",    desc: "A palm-sized stone worked by an Anchor-mode mage for years until it holds a stabilizing presence. Held or placed, it affects nearby Strain Checks and Safe Limit.", mechanical: "Held: +2 Safe Limit | Placed: Harmony on Strain Checks in 10 ft radius | Weight: 0.5 lb | Passive, always active" },
  { id: "c12", name: "Hollowing Ward Medallion",      rarity: "rare",     category: "casting", subCategory: "Talisman", desc: "A Solar Temple-crafted medallion, blessed by a Solanarch and enchanted by a Forgecrown master. The medallion grows warm when Corruption Points are being accumulated — a warning system as much as protection.", mechanical: "Reduce Corruption Point gain by 1 (minimum 0) | Warmth warning in corrupting environments" },
  { id: "c13", name: "Dual-String Focus Crystal",     rarity: "very-rare",category: "casting", subCategory: "Focus",    desc: "A faceted crystal grown under specialized conditions by a Binder-mode mage. When held in the casting hand, two-String Weaves become slightly more intuitive. Resonates visibly with the mage's Affinity colors during casting.", mechanical: "Two-String Weave DC reduced by 2 | Must be held in casting hand" },
  { id: "c14", name: "Archon's Lens",                 rarity: "legendary",category: "casting", subCategory: "Focus",    desc: "One of six known to exist, created by the original Archon of the Thaumatarch. Looking through this thin slice of enchanted crystal allows true visual perception of the leylines. The experience is overwhelming at first.", mechanical: "Harmony on Thread Sense checks | −5 DC magical environment assessment | PRE DC 14 on first use (Stunned 1 round)" },
  // ── POTIONS: Healing & Recovery ───────────────────────────────────────────
  { id: "p1",  name: "Minor Healing Draught",  rarity: "common",   category: "potion", subCategory: "Healing", desc: "A small vial of standard healing compound, mass-produced in Solar Temple workshops. Tastes bitter and metallic. Standard field issue for Scaled Guard units and common at any apothecary.", mechanical: "Minor Action: Recover 1d8 + 2 VP | Common stock item" },
  { id: "p2",  name: "Standard Healing Draught",rarity: "common",  category: "potion", subCategory: "Healing", desc: "A larger vial, more concentrated formula. Requires a full Major Action to drink but provides meaningful recovery. The amber liquid smells faintly of copper and dried herbs.", mechanical: "Major Action: Recover 2d8 + 4 VP" },
  { id: "p3",  name: "Superior Healing Draught",rarity: "uncommon", category: "potion", subCategory: "Healing", desc: "A refined formula incorporating rare botanical extracts. Noticeably more effective than standard issue. The Solar Temple sells these at their better-stocked temples and charges accordingly.", mechanical: "Minor Action: Recover 4d8 + 6 VP" },
  { id: "p4",  name: "Burnout Tonic",          rarity: "uncommon", category: "potion", subCategory: "Recovery", desc: "A specialized preparation specifically targeting magical exhaustion rather than physical injury. Reduces Burnout by 1 level when consumed. Not a true cure — it's more like forcing your body to fake feeling rested. Tastes genuinely terrible.", mechanical: "Major Action: Reduce Burnout by 1 level | Will not reduce below Level 1" },
  { id: "p5",  name: "Tension Flush",          rarity: "uncommon", category: "potion", subCategory: "Recovery", desc: "A cold, buzzing liquid that forcibly resets the body's accumulated leyline tension. Immediately reduces Tension to 0. The crash that follows is unpleasant — 1 level of Fatigue regardless.", mechanical: "Minor Action: Reduce Tension to 0 | Gain 1 Fatigue after use | Useful emergency safety option" },
  { id: "p6",  name: "Snapback Nullifier",     rarity: "rare",     category: "potion", subCategory: "Recovery", desc: "Applied to hands before a high-risk casting session, not consumed. The alchemical compound bonds with the skin and provides extraordinary protection against the next Snapback event. A Forgecrown/Solar Temple collaboration.", mechanical: "Apply as Minor Action (pre-combat): Negate next Snapback entirely | Single use | Applied not drunk" },
  { id: "p7",  name: "Greater Healing Elixir", rarity: "rare",     category: "potion", subCategory: "Healing", desc: "A carefully prepared alchemical masterwork. Full VP recovery in a bottle. The Solar Temple reserves these for temple members in good standing. The liquid is pure, golden, and smells of warm sunlight.", mechanical: "Major Action: Recover all VP | Also ends Shaking Hands, Burned, and Prone conditions" },
  { id: "p8",  name: "Burnout Purge",          rarity: "rare",     category: "potion", subCategory: "Recovery", desc: "A two-stage treatment. The body effectively processes magical damage in fast-forward. Not comfortable — may cause temporary tremors for 1d4 hours afterward.", mechanical: "Drink + 30 min rest: Reduce Burnout by 3 levels | 1d4 hours mild tremors after | Single use" },
  { id: "p9",  name: "Phoenix Draught",        rarity: "legendary",category: "potion", subCategory: "Healing", desc: "A legendary alchemical preparation; perhaps 50 known to exist. Can be administered to an Incapacitated character or consumed as a Major Action. The drinker gains Harmony on all checks for 1 minute.", mechanical: "Major Action: All VP restored | All conditions ended | Burnout and Tension reset to 0 | Harmony on all checks for 1 minute" },
  // ── CONSUMABLES: Combat & Utility ────────────────────────────────────────
  { id: "co1", name: "Flash Powder (Pouch)",         rarity: "common",   category: "consumable", subCategory: "Throwable", desc: "A chemical compound that produces a brilliant flash when ignited. Does not affect creatures without visual light-based sight. 3 pouches per purchase.", mechanical: "Minor Action throw (20 ft): Flash in 10 ft radius | ACU DC 13 or Discord on next action | Qty: 3 per pouch" },
  { id: "co2", name: "Silence Dust",                 rarity: "uncommon", category: "consumable", subCategory: "Throwable", desc: "A powdered preparation that creates a zone of near-silence for 2 rounds. Useful for suppressing auditory magical signatures and general stealth operations.", mechanical: "Minor Action throw (20 ft): Silence zone 15 ft radius | 2 rounds | Suppresses auditory Signatures | Qty: 1" },
  { id: "co3", name: "Tension Spike Charge",         rarity: "uncommon", category: "consumable", subCategory: "Throwable", desc: "A small alchemical device that forces a Strain Check when triggered near a mage. Used by Shearers and anti-mage operatives. Does not affect non-casters.", mechanical: "Minor Action throw (30 ft): Targeted mage Strain Check DC 17 immediately | No effect on non-casters | Qty: 1" },
  { id: "co4", name: "Null Field Grenade",            rarity: "rare",     category: "consumable", subCategory: "Throwable", desc: "A Forgecrown creation that temporarily suppresses leyline activity in an area. Creates a Dead Zone effect in a 15 ft radius for 3 rounds. Affects all mages including the thrower.", mechanical: "Major Action throw (30 ft): Dead Zone 15 ft radius for 3 rounds | All magic costs double Tension; no PL4+ magic" },
  { id: "co5", name: "Hollowing Fragment (Sealed)",   rarity: "very-rare",category: "consumable", subCategory: "Throwable", desc: "A shard of Hollowing material, sealed in lead and warded crystal. When unsealed and thrown, releases a burst of corruption and cold. The casing requires careful handling without protection.", mechanical: "Major Action throw (20 ft): 3d10 cold/necrotic in 10 ft | All in range gain 1d4 Corruption Points | Dangerous to handle" },
  { id: "co6", name: "Weave Tracer Ink",              rarity: "uncommon", category: "consumable", subCategory: "Utility",   desc: "An alchemical ink that, when applied to a surface, renders recent leyline activity visible for 1 hour. Shows where Thread Checks were performed, approximate Power Level, and rough direction of the caster.", mechanical: "Apply (Minor Action): Reveals last 1 hour of leyline activity | 1 hour visibility | Enough for one room" },
  { id: "co7", name: "Thread-Meld Incense",           rarity: "rare",     category: "consumable", subCategory: "Utility",   desc: "Burned during rest, not combat. One hour of exposure during a Full Recovery accelerates magical recovery, reducing the number of recoveries needed to lower Burnout.", mechanical: "Burn during Full Recovery: Reduce Burnout 2 levels instead of 1 | Must burn entire stick (1 hour) | Single use" },
  // ── MAGICAL OBJECTS ───────────────────────────────────────────────────────
  { id: "m1",  name: "Mage Light Stone",              rarity: "common",   category: "magical", subCategory: "Utility",     desc: "A small river stone enchanted with a persistent Light affinity Imprint. Produces consistent illumination equivalent to a lantern. Toggle on/off by squeezing twice. Lasts indefinitely.", mechanical: "Produces lantern-level light | Toggle: squeeze twice | Indefinite duration | No Tension cost" },
  { id: "m2",  name: "Warming Stone",                 rarity: "common",   category: "magical", subCategory: "Utility",     desc: "A flat stone with a basic heat enchantment. Placed in bedding, clothing, or against skin, it maintains a comfortable warmth for 8 hours before requiring 10 minutes of sunlight to recharge.", mechanical: "Comfortable warmth for 8 hours | Recharge: 10 min sunlight | No effect on magical temperature" },
  { id: "m3",  name: "Mage's Compass (Sig.-Tuned)",   rarity: "uncommon", category: "magical", subCategory: "Utility",     desc: "A compass attuned to a specific mage's Signature (requires 1 hour process). Points toward the target mage within 1 mile. Used by guilds tracking members, families tracking missing mages.", mechanical: "Points to attuned mage within 1 mile | Oscillates if Signature is suppressed | Re-attunement: 1 hour" },
  { id: "m4",  name: "Inscription Desk (Portable)",   rarity: "uncommon", category: "magical", subCategory: "Utility",     desc: "A small, folding writing surface with a leyline-stabilizing mat underneath. Inscription work performed on this surface has reduced DC due to the stable, enhanced environment.", mechanical: "Thread Check DC −2 for Inscription/Binder work on this surface | Portable, folds flat | Weight: 3 lb" },
  { id: "m5",  name: "Familiar Beacon",               rarity: "uncommon", category: "magical", subCategory: "Utility",     desc: "A palm-sized enchanted disk that functions as a magical distress signal. When activated, it broadcasts the holder's Signature at maximum intensity in a 1-mile radius for 5 minutes. Guild-issued to all students.", mechanical: "Activate: Broadcasts Signature 1-mile radius for 5 minutes | Detectable by any THS check | 1×/Full Recovery" },
  { id: "m6",  name: "Void Flask",                    rarity: "rare",     category: "magical", subCategory: "Utility",     desc: "A stoppered flask containing a small sealed pocket of Hollowing void. Objects placed inside experience no time — food stays fresh indefinitely. Living creatures can survive (uncomfortably) for up to 1 hour inside.", mechanical: "Internal time stop | Food fresh indefinitely | Living beings: survive ≤1 hour | ~0.5 cubic ft capacity" },
  { id: "m7",  name: "Leyline Map",                   rarity: "rare",     category: "magical", subCategory: "Utility",     desc: "A map showing leyline locations as they were surveyed at time of creation. Leylines shift, so older maps may be partially inaccurate. Current Lorehall maps are highly valuable.", mechanical: "Harmony on Thread Reach/Weave Reading in mapped region | Accuracy degrades −1 bonus/decade of age" },
  { id: "m8",  name: "Tension Reservoir",             rarity: "rare",     category: "magical", subCategory: "Focus",       desc: "An enchanted crystal vessel that can store excess Tension Points. When you safely release Tension, you may direct up to 4 of those points into the Reservoir instead of dispersing them.", mechanical: "Store up to 8 Tension | Draw to reduce casting Tension cost | Transfer: Minor Action (both directions)" },
  { id: "m9",  name: "Memory Chalice",                rarity: "rare",     category: "magical", subCategory: "Utility",     desc: "A cup that can store a memory for later viewing. Used by the Lorehall for testimony and historical preservation. The donor concentrates for 1 minute; the viewer experiences the memory in 1 minute.", mechanical: "Store/replay 5 min of memory | 1 min to record, 1 min to view | Single memory storage at a time" },
  { id: "m10", name: "Architect's Anchor Stone",      rarity: "rare",     category: "magical", subCategory: "Focus",       desc: "A cornerstone-sized Anchor enchantment in solid form. When placed at a location, creates a permanent mild stabilizing effect. Cannot be moved without destroying the enchantment.", mechanical: "Placed: Strain Check DC −2 and Thread Pool +4 in 30 ft radius | Permanent | Destroyed if moved" },
  { id: "m11", name: "Warden's Eye",                  rarity: "rare",     category: "magical", subCategory: "Utility",     desc: "A glass orb that can be left in a location and linked to a matching Viewing Stone. The owner can see and hear through the Eye at will at up to 10 miles. Magical signatures appear highlighted.", mechanical: "Remote sight/sound to 10 miles | Magical signatures highlighted | Linked pair (Eye + Viewing Stone)" },
  { id: "m12", name: "Threadweaver's Mantle",         rarity: "very-rare",category: "magical", subCategory: "Wondrous",    desc: "A cloak woven by a Binder master over 7 years of continuous work. Visibly alive with shifting patterns that match the wearer's affinity colors. Enchantments created while wearing it have doubled VP and increased duration.", mechanical: "Harmony on Binder Thread Checks | Enchantment VP doubled | Duration increased one tier (temp → short-term, etc.)" },
  { id: "m13", name: "Null Sphere",                   rarity: "very-rare",category: "magical", subCategory: "Wondrous",    desc: "A perfect sphere of black metal that radiates an anti-magic field when concentrated on. Within 15 ft, all magic costs triple Tension and Power Level maximum is reduced by 2. Affects the holder equally.", mechanical: "Major Action: 15 ft radius — triple Tension cost, PL max −2 | Concentration ≤1 min | 1×/Full Recovery" },
  { id: "m14", name: "The Sightless Weave",           rarity: "legendary",category: "magical", subCategory: "Artifact",    desc: "A set of gloves and headband that together suppress all magical perception of the wearer. Complete magical invisibility — but the wearer also cannot perceive leylines or cast while wearing the full set.", mechanical: "Full set: Complete magical invisibility | Cannot perceive/use leylines | Casting impossible | Individual pieces give partial suppression" },
  { id: "m15", name: "Aedan's Shard",                 rarity: "mythical", category: "magical", subCategory: "Artifact",    desc: "A fragment of what historians believe is a piece of the original Golden Thread, crystallized during the Stretching. Three of these are confirmed to exist. Holding it connects you to the pain of the Stretched leylines.", mechanical: "Harmony all Thread Checks | Snapback damage halved | True leyline sight 100 ft | Cannot cast PL5 | 1d4 psychic damage/hour held" },
  { id: "m16", name: "Aradoth's Whisper",             rarity: "mythical", category: "magical", subCategory: "Artifact",    desc: "A black stone sealed in six Solar Temple warding layers. Breaking all six seals releases a whisper — an auditory impression of Aradoth trapped during the Banishing. The stone cannot be re-sealed.", mechanical: "Break seals (weeks of work): Access Forbidden Affinities for THS mod weeks | +1d6 permanent Corruption on expiry | Cannot be re-sealed" },
  // ── KITS & PROFESSIONAL EQUIPMENT ────────────────────────────────────────
  { id: "k1",  name: "Mage's Field Kit",              rarity: "common",   category: "kit", subCategory: "Field",           desc: "Standard kit issued to all academy graduates taking fieldwork positions. Contains essential supplies for a mage operating away from institutional support.", mechanical: "Contains: Burn Salve ×3, Bandages ×5, Tension Counter, Mage Light Stone, Flash Powder ×3, Emergency Whistle, Field Journal | Weight: 4 lb" },
  { id: "k2",  name: "Healer's Bag",                  rarity: "common",   category: "kit", subCategory: "Medical",         desc: "Standard medical kit for a trained healer. Includes supplies for conventional and magically-assisted treatment. Supplies for approximately 10 treatments before restocking.", mechanical: "+2 Anatomy of Magic checks (physical wounds) | 10 uses before restocking | Contents: bandages, splints, antiseptics, burn treatment, bone-set tools" },
  { id: "k3",  name: "Shearer's Protection Kit",      rarity: "uncommon", category: "kit", subCategory: "Specialist",      desc: "A professional-grade protective kit for Shearer-mode practitioners who work in hazardous magical environments. Everything needed to safely handle disrupted or contaminated magical fields.", mechanical: "Heavy warded gloves (Snapback −1d6) | Eye protection | Grounding Talisman | Contamination neutralizer ×2 | Tension Flush ×1" },
  { id: "k4",  name: "Infiltrator's Pack",            rarity: "uncommon", category: "kit", subCategory: "Specialist",      desc: "Professional kit for Slider-mode operatives and espionage-oriented mages. Contains everything needed for a stealth-focused mage working in hostile environments.", mechanical: "Silence Dust ×2 | Signature Suppressor Pin | Throwing Knives ×3 | Weave Tracer Ink | Warded Rope 50ft | Lockpicks | Disguise Kit" },
  { id: "k5",  name: "Binder's Workshop Case",        rarity: "rare",     category: "kit", subCategory: "Specialist",      desc: "A leather case containing everything a Binder needs for complex enchanting work in the field. The specialized inks enhance Thread Check precision and the Thread Anchor Stone stabilizes the workspace.", mechanical: "+1 Binder Thread Checks with included inks | Inscription Desk (portable) | Pre-drawn rune templates | Thread Anchor Stone included" },
  // ── MOUNTS & TRANSPORTATION ───────────────────────────────────────────────
  { id: "mo1", name: "Standard Horse",                rarity: "common",   category: "mount", subCategory: "Mount",         desc: "A working horse, neither exceptional nor poor. Carries one rider and moderate gear. Does not spook at minor magical effects — most horses in Aethros are acclimated to mages through generations of exposure.", mechanical: "Speed: 60 ft/round travel | Carry: 1 rider + 200 lb gear | Tolerates minor magical effects" },
  { id: "mo2", name: "Resonance-Trained Horse",       rarity: "uncommon", category: "mount", subCategory: "Mount",         desc: "A horse specifically trained to tolerate significant magical effects, including visible Signatures and minor Snapback events. Certified by the Scaled Guard. Will not bolt at anything below a Power Level 4 discharge.", mechanical: "Speed: 60 ft/round | Carry: 1 rider + 250 lb | Remains calm through PL3 magical events | Scaled Guard certified" },
  { id: "mo3", name: "Warded Carriage",               rarity: "rare",     category: "mount", subCategory: "Vehicle",       desc: "A carriage with warding worked into the frame and exterior panels. Interior lined with material that suppresses the occupants' Signatures — useful for discreet travel of identifiable mages.", mechanical: "PL1–2 hits: half damage to occupants | Signature suppression inside | 4 passengers | Requires driver" },
];

// --- BURNOUT TRACK ---
export const BURNOUT_LEVELS = [
  { level: 0, label: "Clear", penalty: "No penalty." },
  { level: 1, label: "Frayed", penalty: "Disadvantage on all mental checks." },
  { level: 2, label: "Stretched", penalty: "Cannot recover Tension safely. Snapback on 1–3 instead of 1." },
  { level: 3, label: "Scorched", penalty: "Take 1d6 damage per Tension spent above Safe Limit." },
  { level: 4, label: "Cracked", penalty: "Cannot cast Strings above PL 2." },
  { level: 5, label: "Breaking", penalty: "Cannot cast Strings. Threads are snapping." },
  { level: 6, label: "Thread Death", penalty: "Thread Death. Permanent unless treated by a Solarch or equivalent." },
];

// --- DC TABLE ---
export const DC_TABLE = [
  { dc: 8, label: "Trivial", desc: "Something you'd do without thinking" },
  { dc: 11, label: "Easy", desc: "Requires effort but well within your ability" },
  { dc: 14, label: "Moderate", desc: "A genuine challenge for a competent person" },
  { dc: 17, label: "Hard", desc: "Pushes most experts" },
  { dc: 20, label: "Very Hard", desc: "Upper edge of reliable skill" },
  { dc: 23, label: "Extreme", desc: "Upper edge of mortal capability" },
  { dc: 26, label: "Near-Impossible", desc: "Legends are made of this" },
];

// --- ITEM BONUS TABLE ---
// Stat bonuses and attack data for equipped items (keyed by item ID)
export type ItemBonus = {
  guardRating?: number;
  wardRating?: number;
  vpMax?: number;
  threadPool?: number;
  safeLimit?: number;
  attackAttr?: string;
  damageDice?: string;
  damageType?: string;
  damageBonusDice?: string;
  range?: string;
  twoHanded?: boolean;
};

export const ITEM_BONUS: Record<string, ItemBonus> = {
  // Melee weapons
  "w1":  { attackAttr: "acu", damageDice: "1d6",  damageType: "piercing",    range: "Melee / 20 ft" },
  "w2":  { attackAttr: "acu", damageDice: "1d6",  damageType: "slashing",    range: "Melee" },
  "w3":  { attackAttr: "res", damageDice: "1d8",  damageType: "piercing",    range: "Melee / 10 ft" },
  "w4":  { attackAttr: "res", damageDice: "1d8",  damageType: "slashing",    range: "Melee" },
  "w5":  { attackAttr: "res", damageDice: "1d8",  damageType: "slashing",    range: "Melee" },
  "w6":  { attackAttr: "res", damageDice: "1d10", damageType: "slashing",    range: "Melee", twoHanded: true },
  "w7":  { attackAttr: "res", damageDice: "1d10", damageType: "bludgeoning", range: "Melee", twoHanded: true },
  "w8":  { attackAttr: "acu", damageDice: "1d6",  damageType: "piercing",    range: "Melee" },
  "w9":  { attackAttr: "res", damageDice: "1d8",  damageType: "bludgeoning", range: "Melee", twoHanded: true, wardRating: 1 },
  // Ranged weapons
  "wr1": { attackAttr: "acu", damageDice: "1d6",  damageType: "piercing",    range: "80/320 ft",   twoHanded: true },
  "wr2": { attackAttr: "acu", damageDice: "1d8",  damageType: "piercing",    range: "150/600 ft",  twoHanded: true },
  "wr3": { attackAttr: "acu", damageDice: "1d6",  damageType: "piercing",    range: "30/120 ft" },
  "wr4": { attackAttr: "acu", damageDice: "1d10", damageType: "piercing",    range: "100/400 ft",  twoHanded: true },
  "wr5": { attackAttr: "acu", damageDice: "1d4",  damageType: "piercing",    range: "30 ft" },
  // Enchanted weapons
  "we1":  { attackAttr: "res", damageDice: "1d8",  damageType: "slashing",    range: "Melee", wardRating: 1 },
  "we2":  { attackAttr: "acu", damageDice: "1d6",  damageType: "piercing",    range: "Melee", damageBonusDice: "+1d4 fire" },
  "we3":  { attackAttr: "res", damageDice: "1d8",  damageType: "piercing",    range: "Melee" },
  "we4":  { attackAttr: "acu", damageDice: "1d6",  damageType: "slashing",    range: "Melee" },
  "we5":  { attackAttr: "res", damageDice: "1d10", damageType: "slashing",    range: "Melee" },
  "we6":  { attackAttr: "res", damageDice: "1d8",  damageType: "slashing",    range: "Melee", damageBonusDice: "+1d4 cold" },
  "we7":  { attackAttr: "res", damageDice: "1d8",  damageType: "magical",     range: "Melee", damageBonusDice: "+2d6 magical" },
  "we8":  { attackAttr: "res", damageDice: "1d8",  damageType: "psychic",     range: "Melee", damageBonusDice: "+1d10 disorientation" },
  "we9":  { attackAttr: "res", damageDice: "1d10", damageType: "bludgeoning", range: "Melee", damageBonusDice: "+2d6 charged" },
  "we10": { attackAttr: "acu", damageDice: "1d6",  damageType: "void",        range: "Melee", damageBonusDice: "+2d6 necrotic" },
  // Legendary + mythical weapons
  "wl1": { attackAttr: "acu", damageDice: "1d8",  damageType: "piercing",    range: "Unlimited", twoHanded: true },
  "wl2": { attackAttr: "res", damageDice: "1d10", damageType: "Affinity",    range: "Melee",     twoHanded: true, damageBonusDice: "+2d8 Affinity" },
  "wm1": { attackAttr: "res", damageDice: "2d12", damageType: "slashing",    range: "Melee" },
  // Armor (Guard Rating bonuses)
  "a1":  { guardRating: 1 },
  "a2":  { guardRating: 2 },
  "a3":  { guardRating: 4 },
  "a4":  { guardRating: 2 },
  "a5":  { guardRating: 2 },
  "a6":  { guardRating: 2 },
  "a7":  { wardRating: 2 },
  "a8":  { guardRating: 1 },
  "a9":  { guardRating: 4 },
  "a10": { guardRating: 1 },
  "a11": { guardRating: 5 },
};

// --- KIT CONTENTS ---
export type KitSubItem = {
  name: string;
  charges: number;
  maxCharges: number;
  desc?: string;
  canEquip?: boolean;
};

export const KIT_CONTENTS: Record<string, KitSubItem[]> = {
  "k1": [
    { name: "Burn Salve",       charges: 3, maxCharges: 3, desc: "Apply to Snapback burns (Minor Action)." },
    { name: "Bandages",         charges: 5, maxCharges: 5, desc: "Stabilize wounds. Anatomy DC 8." },
    { name: "Tension Counter",  charges: 1, maxCharges: 1, desc: "Track Tension total.", canEquip: true },
    { name: "Mage Light Stone", charges: 1, maxCharges: 1, desc: "Lantern-level light, indefinite.", canEquip: true },
    { name: "Flash Powder",     charges: 3, maxCharges: 3, desc: "Throw 20ft: Discord on next action (ACU DC 13)." },
    { name: "Whistle",          charges: 1, maxCharges: 1, desc: "Emergency signal, audible 500ft.", canEquip: true },
    { name: "Field Journal",    charges: 1, maxCharges: 1, desc: "Blank journal for notes and maps.", canEquip: true },
  ],
  "k2": [
    { name: "Bandages",         charges: 4, maxCharges: 4, desc: "Standard wound dressing." },
    { name: "Splints",          charges: 2, maxCharges: 2, desc: "Set broken bones (+2 Anatomy check)." },
    { name: "Antiseptic",       charges: 3, maxCharges: 3, desc: "Prevent infection, treat minor wounds." },
    { name: "Burn Treatment",   charges: 2, maxCharges: 2, desc: "Treat Snapback burns and heat wounds." },
    { name: "Bone-Set Tools",   charges: 1, maxCharges: 1, desc: "Professional bone realignment kit.", canEquip: true },
  ],
  "k3": [
    { name: "Heavy Warded Gloves",       charges: 1, maxCharges: 1, desc: "Snapback −1d6 while worn.", canEquip: true },
    { name: "Eye Protection",            charges: 1, maxCharges: 1, desc: "Shields from magical flash.", canEquip: true },
    { name: "Grounding Talisman",        charges: 1, maxCharges: 1, desc: "Reduces Corruption accumulation.", canEquip: true },
    { name: "Contamination Neutralizer", charges: 2, maxCharges: 2, desc: "Flush contaminated magical residue." },
    { name: "Tension Flush",             charges: 1, maxCharges: 1, desc: "Clear 2 Tension safely as Minor Action." },
  ],
  "k4": [
    { name: "Silence Dust",          charges: 2, maxCharges: 2, desc: "Silence 15ft zone for 2 rounds." },
    { name: "Sig. Suppressor Pin",   charges: 1, maxCharges: 1, desc: "Suppress Signature for 1 hour.", canEquip: true },
    { name: "Throwing Knives ×3",    charges: 3, maxCharges: 3, desc: "1d4+ACU mod | Range 30ft." },
    { name: "Weave Tracer Ink",      charges: 1, maxCharges: 1, desc: "Reveals 1hr of leyline activity." },
    { name: "Warded Rope (50ft)",    charges: 1, maxCharges: 1, desc: "Magically reinforced rope.", canEquip: true },
    { name: "Lockpicks",             charges: 1, maxCharges: 1, desc: "Guild-quality lockpicks.", canEquip: true },
    { name: "Disguise Kit",          charges: 1, maxCharges: 1, desc: "Cosmetic disguise materials.", canEquip: true },
  ],
  "k5": [
    { name: "Binder's Inks",     charges: 1, maxCharges: 1, desc: "+1 Binder Thread Checks.", canEquip: true },
    { name: "Inscription Desk",  charges: 1, maxCharges: 1, desc: "−2 DC on Binder work.", canEquip: true },
    { name: "Rune Templates",    charges: 5, maxCharges: 5, desc: "Pre-drawn; skip rune design step." },
    { name: "Thread Anchor Stone", charges: 1, maxCharges: 1, desc: "+2 Safe Limit in 30ft workspace.", canEquip: true },
  ],
};

// ============================================================
// GUILD RANKS
// ============================================================

export interface GuildRank {
  rank: number;
  title: string;
  statBonuses: Partial<Record<AttrKey, number>>;
  attunements: string[];
  featChoices: [string, string];
}

export interface GuildWithRanks {
  name: string;
  desc: string;
  entryRank: number;
  ranks: GuildRank[];
}

export const GUILD_RANKS_DATA: GuildWithRanks[] = [
  {
    name: "The Scaled Guard",
    desc: "Military and law enforcement. Discipline, chain of command, and the right to controlled violence.",
    entryRank: 7,
    ranks: [
      { rank: 7, title: "Ashborn",   statBonuses: { res: 1, acu: 1 },           attunements: ["Combat Forms", "Grit"],             featChoices: ["Iron Constitution", "Burnout Resistance"] },
      { rank: 6, title: "Embercloak", statBonuses: { res: 1 },                   attunements: ["Grit"],                             featChoices: ["Snapback Veteran", "Overcaster"] },
      { rank: 5, title: "Ironbrand", statBonuses: { res: 1, ctr: 1 },            attunements: ["Ward Craft"],                       featChoices: ["Pressured Casting", "War Weaver"] },
      { rank: 4, title: "Steelfang", statBonuses: { pot: 1, res: 1 },            attunements: ["Surge"],                            featChoices: ["Pain Tolerance", "Precision Weave"] },
      { rank: 3, title: "Talonarch", statBonuses: { pot: 1, pre: 1 },            attunements: ["Guild Protocol"],                   featChoices: ["Thread Strike", "Breach Striker"] },
      { rank: 2, title: "Drakeward", statBonuses: { pot: 1, res: 1, pre: 1 },    attunements: ["Presence"],                         featChoices: ["Command Presence", "Thread Sense Fighter"] },
      { rank: 1, title: "Wyrmlord",  statBonuses: { pot: 2, res: 1 },            attunements: ["Surge", "Strand Awareness"],        featChoices: ["Thread of Fate", "Catastrophic Release"] },
    ],
  },
  {
    name: "The Thaumatarch",
    desc: "Mage specialists and researchers. Academic excellence, dangerous-application licenses, and the pursuit of magical theory.",
    entryRank: 6,
    ranks: [
      { rank: 6, title: "Spark",      statBonuses: { ths: 1, acu: 1 },           attunements: ["Weave Reading", "Lore"],             featChoices: ["Thread Reader", "Efficient Caster"] },
      { rank: 5, title: "Gleamer",    statBonuses: { ths: 1 },                   attunements: ["Anatomy of Magic"],                 featChoices: ["Signature Suppression", "Scholar's Eye"] },
      { rank: 4, title: "Sigilist",   statBonuses: { ths: 1, ctr: 1 },           attunements: ["Inscription"],                      featChoices: ["Extended Thread Pool", "Steady Grip"] },
      { rank: 3, title: "Runecaller", statBonuses: { ctr: 1, acu: 1 },           attunements: ["Strand Awareness"],                 featChoices: ["Third String Attunement", "Twin String Draw"] },
      { rank: 2, title: "Magister",   statBonuses: { ctr: 1, ths: 1, acu: 1 },  attunements: ["Weave Reading"],                    featChoices: ["Leyline Sight", "Catastrophic Precision"] },
      { rank: 1, title: "Archon",     statBonuses: { ths: 2, ctr: 1 },           attunements: ["Thread Reach", "Surge"],            featChoices: ["String Communion", "Legacy Technique"] },
    ],
  },
  {
    name: "The Solar Temple",
    desc: "Healing and spiritual guidance. The sacred cost of magic, care over destruction, and the long war against Hollowing corruption.",
    entryRank: 8,
    ranks: [
      { rank: 8, title: "Ashpetal",   statBonuses: { pre: 1, ths: 1 },           attunements: ["Anatomy of Magic", "Discernment"],  featChoices: ["Combat Medic", "Burnout Resistance"] },
      { rank: 7, title: "Whisperkin", statBonuses: { pre: 1 },                   attunements: ["Ward Craft"],                       featChoices: ["Efficient Caster", "Iron Constitution"] },
      { rank: 6, title: "Gracehand",  statBonuses: { ctr: 1, pre: 1 },           attunements: ["Anatomy of Magic"],                 featChoices: ["Conductor's Grace", "Scarhanded"] },
      { rank: 5, title: "Lightbearer",statBonuses: { pre: 1, ctr: 1 },           attunements: ["Guild Protocol"],                   featChoices: ["Second Wind", "Void Resistance"] },
      { rank: 4, title: "Flameward",  statBonuses: { pre: 1, res: 1 },           attunements: ["Signature Suppression"],            featChoices: ["Living Shield", "The Still Eye"] },
      { rank: 3, title: "Dawnseer",   statBonuses: { ths: 1, acu: 1, pre: 1 },  attunements: ["Strand Awareness"],                 featChoices: ["Soul of the Weave", "Leyline Sight"] },
      { rank: 2, title: "Luminary",   statBonuses: { pre: 1, ths: 1, ctr: 1 },  attunements: ["Presence"],                         featChoices: ["Command Presence", "Marked by Magic"] },
      { rank: 1, title: "Solanarch",  statBonuses: { pre: 2, ths: 1 },           attunements: ["Weave Reading", "Anatomy of Magic"],featChoices: ["Thread of Fate", "Legend in the Making"] },
    ],
  },
  {
    name: "The Lorehall",
    desc: "Knowledge preservation and research. Precision, record-keeping, and the belief that understanding is its own form of power.",
    entryRank: 7,
    ranks: [
      { rank: 7, title: "Loreling",   statBonuses: { acu: 1, ths: 1 },           attunements: ["Lore", "Weave Reading"],            featChoices: ["Scholar's Eye", "Thread Reader"] },
      { rank: 6, title: "Quillborn",  statBonuses: { acu: 1 },                   attunements: ["Inscription"],                      featChoices: ["Efficient Caster", "Signature Suppression"] },
      { rank: 5, title: "Glyphscribe",statBonuses: { acu: 1, ctr: 1 },           attunements: ["Inscription"],                      featChoices: ["Crafter's Hand", "Steady Grip"] },
      { rank: 4, title: "Pagewarden", statBonuses: { acu: 1, ths: 1 },           attunements: ["Strand Awareness"],                 featChoices: ["Extended Thread Pool", "Quick Study"] },
      { rank: 3, title: "Inkwright",  statBonuses: { acu: 1, ctr: 1, ths: 1 },  attunements: ["Weave Reading"],                    featChoices: ["Third String Attunement", "Leyline Sight"] },
      { rank: 2, title: "Scriptor",   statBonuses: { acu: 1, ths: 1, pre: 1 },  attunements: ["Lore"],                             featChoices: ["Soul of the Weave", "Deep Cover"] },
      { rank: 1, title: "Archivarch", statBonuses: { acu: 2, ths: 1 },           attunements: ["Thread Reach", "Strand Awareness"], featChoices: ["String Communion", "Legend in the Making"] },
    ],
  },
  {
    name: "The Forgecrown",
    desc: "Magical crafting and enchantment. Practical mastery over materials, enchantment, and the belief that the best magic is the kind you can hold in your hands.",
    entryRank: 7,
    ranks: [
      { rank: 7, title: "Sparkwright",statBonuses: { ctr: 1, acu: 1 },           attunements: ["Trade Craft", "Inscription"],       featChoices: ["Crafter's Hand", "Efficient Caster"] },
      { rank: 6, title: "Cindertouch",statBonuses: { ctr: 1 },                   attunements: ["Trade Craft"],                      featChoices: ["Scarhanded", "Burnout Resistance"] },
      { rank: 5, title: "Shapebinder",statBonuses: { ctr: 1, pot: 1 },           attunements: ["Ward Craft"],                       featChoices: ["Steady Grip", "Twin String Draw"] },
      { rank: 4, title: "Metalmind",  statBonuses: { ctr: 1, acu: 1 },           attunements: ["Inscription"],                      featChoices: ["Precision Weave", "Extended Thread Pool"] },
      { rank: 3, title: "Glyphmason", statBonuses: { ctr: 1, pot: 1, acu: 1 },  attunements: ["Strand Awareness"],                 featChoices: ["Third String Attunement", "Catastrophic Precision"] },
      { rank: 2, title: "Artifex",    statBonuses: { pot: 1, ctr: 1, ths: 1 },  attunements: ["Trade Craft"],                      featChoices: ["Soul of the Weave", "Arcane Recovery"] },
      { rank: 1, title: "Forgeheart", statBonuses: { ctr: 2, pot: 1 },           attunements: ["Surge", "Ward Craft"],              featChoices: ["Legacy Technique", "String Communion"] },
    ],
  },
  {
    name: "The Highblood Circles",
    desc: "Nobility and governance. Rank structure, bloodline politics, and the weight of inherited expectation.",
    entryRank: 5,
    ranks: [
      { rank: 5, title: "Circlet",      statBonuses: { pre: 1, acu: 1 },         attunements: ["Guild Protocol", "Discernment"],    featChoices: ["Scholar's Eye", "Deep Cover"] },
      { rank: 4, title: "Gildthane",    statBonuses: { pre: 1, ctr: 1 },         attunements: ["Discernment"],                      featChoices: ["Command Presence", "Efficient Caster"] },
      { rank: 3, title: "Bloodwarden",  statBonuses: { pre: 1, acu: 1 },         attunements: ["Presence"],                         featChoices: ["Soul of the Weave", "Thread Reader"] },
      { rank: 2, title: "Circle Regent",statBonuses: { pre: 1, ths: 1 },         attunements: ["Lore"],                             featChoices: ["Marked by Magic", "Leyline Sight"] },
      { rank: 1, title: "High Circle",  statBonuses: { pre: 2, acu: 1 },         attunements: ["Weave Reading", "Guild Protocol"],  featChoices: ["Thread of Fate", "Legend in the Making"] },
    ],
  },
];

export function getGuildWithRanks(guildName: string): GuildWithRanks | undefined {
  return GUILD_RANKS_DATA.find(g => g.name === guildName);
}

export function getGuildRanksForGuild(guildName: string): GuildRank[] {
  return getGuildWithRanks(guildName)?.ranks ?? [];
}

export function getGuildRankData(guildName: string, rankTitle: string): GuildRank | undefined {
  const guild = getGuildWithRanks(guildName);
  return guild?.ranks.find(r => r.title === rankTitle);
}

export function getGuildEntryRankTitle(guildName: string): string {
  const guild = getGuildWithRanks(guildName);
  if (!guild) return "";
  const entryRankNum = guild.entryRank;
  return guild.ranks.find(r => r.rank === entryRankNum)?.title ?? "";
}
