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
  },
  {
    name: "Pressured Casting",
    category: "combat",
    minLevel: 4,
    prerequisites: "RES 14+",
    desc: "Once per round, cast normally despite Shaking Hands, Stunned, or Wound — costs 1 extra Tension.",
    mechanical: "1/round: ignore condition Discord on Thread Check. +1 Tension cost.",
  },
  {
    name: "Precision Weave",
    category: "combat",
    minLevel: 4,
    prerequisites: "CTR 16+",
    desc: "Two-String Weaves are made at Harmony. First two-String Weave per Mend costs 1 less Tension.",
    mechanical: "Two-String Weave Thread Check at Harmony. 1st per Mend: −1 Tension cost.",
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
  },
  // DEFENSIVE FEATS
  {
    name: "Iron Constitution",
    category: "defense",
    minLevel: 2,
    prerequisites: "RES 13+",
    desc: "Maximum VP +4. When spending a Recovery Die during a Mend, recover maximum value instead of rolling.",
    mechanical: "+4 VP max. Recovery Dice = max value, no roll needed.",
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
  },
];

// --- INVENTORY ITEMS ---
export type ItemRarity = "common" | "uncommon" | "rare" | "very-rare" | "legendary" | "mythical";

export interface InventoryItem {
  id: string;
  name: string;
  rarity: ItemRarity;
  category: "weapon" | "armor" | "potion" | "tool" | "magical" | "general";
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
  // WEAPONS
  { id: "i1", name: "Thread Blade", rarity: "common", category: "weapon", desc: "A short blade with leyline etching that responds to magical touch. Provides mild resonance.", mechanical: "1d6 + STR slashing. Can be used as casting focus." },
  { id: "i2", name: "Ley Pistol", rarity: "uncommon", category: "weapon", desc: "A single-shot pistol that fires condensed thread force. Requires charging between shots.", mechanical: "1d8+POT mod magical damage. Reload: Minor Action. Range 30/60ft." },
  { id: "i3", name: "Resonance Staff", rarity: "rare", category: "weapon", desc: "A staff carved from leyline-dense heartwood. Reduces Thread Check DC by 1 for any String used through it.", mechanical: "Thread Check DC −1. +1d4 magical damage. Casting focus." },
  { id: "i4", name: "Hollowing Blade", rarity: "very-rare", category: "weapon", desc: "A blade touched by Hollowing corruption. Deals necrotic damage that resists healing.", mechanical: "2d6+POT mod necrotic. Wounds caused resist healing for 1 hour." },
  { id: "i5", name: "Threadbreaker Gauntlet", rarity: "legendary", category: "weapon", desc: "A massive enchanted gauntlet that physically grasps leylines. Can tear Strings from other weavers.", mechanical: "Grapple attack: strip one active String from target on hit. 2d8 damage." },
  // ARMOR
  { id: "i6", name: "Weave Robes", rarity: "common", category: "armor", desc: "Standard-issue mage robes with light leyline reinforcement at the seams.", mechanical: "Guard Rating +1. No arcane impediment." },
  { id: "i7", name: "Scaled Vambraces", rarity: "uncommon", category: "armor", desc: "Scaled Guard-issue forearm guards. Good protection without limiting precision.", mechanical: "Guard Rating +2. Ward Rating +1." },
  { id: "i8", name: "Warded Plate", rarity: "rare", category: "armor", desc: "Heavy plate with inscribed wards. Slows movement but excellent protection.", mechanical: "Guard Rating +5. Ward Rating +3. Movement −10ft." },
  { id: "i9", name: "Signature Cloak", rarity: "uncommon", category: "armor", desc: "A traveling cloak that diffuses magical signatures. Makes you harder to track by sense.", mechanical: "Tracking by magical signature: Discord for pursuers." },
  { id: "i10", name: "Anchor Mantle", rarity: "rare", category: "armor", desc: "A heavy mantle resonant with Anchor magic. Reduces incoming magical force.", mechanical: "Ward Rating +4. Reduce magical damage by 2. Anchor Mode only." },
  // POTIONS
  { id: "i11", name: "Mend Draught", rarity: "common", category: "potion", desc: "A standard-issue recovery tincture. Tastes like copper and regret.", mechanical: "Recover 1d8+2 VP as a Minor Action." },
  { id: "i12", name: "Clarity Serum", rarity: "uncommon", category: "potion", desc: "Clears Thread Pool fog and reduces Tension. Used by overextended weavers.", mechanical: "Reduce current Tension by 3. As a Minor Action." },
  { id: "i13", name: "Burnout Suppressor", rarity: "rare", category: "potion", desc: "An alchemical compound that temporarily numbs Burnout penalties for one scene.", mechanical: "Ignore Burnout mechanical penalties for 1 hour." },
  { id: "i14", name: "Leyline Draught", rarity: "uncommon", category: "potion", desc: "A filtered thread-essence extract. Gives a temporary boost to thread perception.", mechanical: "+2 THS modifier for Thread Checks for 10 minutes." },
  { id: "i15", name: "Emergency Coagulant", rarity: "common", category: "potion", desc: "Stops a wound from worsening. Used by soldiers and field mages.", mechanical: "Stabilize a Dying character to 1 VP. Reaction." },
  // TOOLS
  { id: "i16", name: "Casting Gloves", rarity: "common", category: "tool", desc: "Standard mage gloves with leyline-channeling thread woven in. Required for most formal casting.", mechanical: "Required for formal casting in some contexts. Prevents Shaking Hands from cold environments." },
  { id: "i17", name: "Inscription Kit", rarity: "common", category: "tool", desc: "Inks, styluses, and reference cards for glyphwork.", mechanical: "Required for Inscription-based abilities. Contains 10 uses of standard ink." },
  { id: "i18", name: "Thread Compass", rarity: "uncommon", category: "tool", desc: "A compass that spins toward the nearest leyline node rather than north.", mechanical: "Locate nearest leyline node within 1 mile. Indicates leyline strength direction." },
  { id: "i19", name: "Warding Chalk", rarity: "uncommon", category: "tool", desc: "Ground with trace leyline material. Lines drawn with it create minor barriers.", mechanical: "Draw a line: minor ward (1d4 damage to cross). 5 uses. Duration: 1 hour." },
  { id: "i20", name: "Recovery Die Set", rarity: "common", category: "tool", desc: "Calibrated dice used during Mend procedures. Standard issue in most guild kits.", mechanical: "Recovery Dice. Standard." },
  // MAGICAL
  { id: "i21", name: "Resonance Ring", rarity: "uncommon", category: "magical", desc: "A ring tuned to a specific affinity. Reduces Tension cost of one PL 1 casting per Mend.", mechanical: "1/Mend: one PL 1 cast costs 0 Tension. Must match your affinity." },
  { id: "i22", name: "Lorehall Archive Seal", rarity: "rare", category: "magical", desc: "A sealed document from the Lorehall. Grants access to one restricted archive.", mechanical: "Access one Lorehall restricted archive. Single use." },
  { id: "i23", name: "Thread Anchor Stone", rarity: "rare", category: "magical", desc: "A dense stone naturally formed around a leyline node. Acts as a fixed Tension reservoir.", mechanical: "Store up to 5 Tension Points. Release as free action on your turn." },
  { id: "i24", name: "Hollowing Shard", rarity: "very-rare", category: "magical", desc: "A fragment of Hollowing corruption crystallized into a physical form. Dangerous to hold.", mechanical: "+3 to all damage. Accumulate 1 Corruption per combat you use it. Do not handle without gloves." },
  { id: "i25", name: "Aedan's Fragment", rarity: "mythical", category: "magical", desc: "A splinter of the original leyline from before the Stretching. Reality bends near it.", mechanical: "1/day: reroll any one die. When held, leylines within 60ft operate at reduced tension." },
  // GENERAL
  { id: "i26", name: "Guild License (Basic)", rarity: "common", category: "general", desc: "Basic documentation authorizing civilian magical practice.", mechanical: "Required to cast openly in major cities. No mechanical bonus." },
  { id: "i27", name: "Field Rations (7 days)", rarity: "common", category: "general", desc: "Preserved food supplies for extended travel. Approved by Scaled Guard field kits.", mechanical: "Sustenance for 7 days." },
  { id: "i28", name: "Rope, Leyline-Braided", rarity: "uncommon", category: "general", desc: "50ft of rope woven with leyline thread. Slightly magical — resists cutting.", mechanical: "50ft. Cannot be cut by non-magical means. Holds 800 lbs." },
  { id: "i29", name: "Encrypted Journal", rarity: "uncommon", category: "general", desc: "A journal that can only be read by the person who keyed it. Standard spycraft.", mechanical: "Contents unreadable without key. Key is a mental imprint." },
  { id: "i30", name: "Solar Temple Letter of Safe Passage", rarity: "rare", category: "general", desc: "A formal document from the Solar Temple. Provides sanctuary in any temple and protection from arrest in most jurisdictions.", mechanical: "Sanctuary in Solar Temple holdings. Legal protection in 8/10 city-states." },
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
