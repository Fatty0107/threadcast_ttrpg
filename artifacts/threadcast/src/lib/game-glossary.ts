export interface GlossaryEntry {
  term: string;
  short: string;
  detail?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  pot: {
    term: "Potency (POT)",
    short: "Raw magical force. Governs damage output and overpowering effects.",
    detail: "Used for offensive Thread Checks where brute force matters. High POT means your magic hits harder.",
  },
  ctr: {
    term: "Control (CTR)",
    short: "Precision and shaping of Threads. Governs Ward Rating and technique accuracy.",
    detail: "Used for defensive Thread Checks, Ward Rating calculation, and any technique requiring fine manipulation.",
  },
  res: {
    term: "Resilience (RES)",
    short: "Physical and magical endurance. Governs Vitality Points and Guard Rating.",
    detail: "Used for saving throws vs physical effects, Guard Rating calculation, and VP at level-up.",
  },
  acu: {
    term: "Acuity (ACU)",
    short: "Mental sharpness. Governs perception, knowledge, and analytical checks.",
    detail: "Used for any check requiring intelligence, recall, detection, or tactical assessment.",
  },
  pre: {
    term: "Presence (PRE)",
    short: "Force of personality and social influence.",
    detail: "Used for persuasion, intimidation, performance, and social conflict.",
  },
  ths: {
    term: "Threadsense (THS)",
    short: "Sensitivity to the Weave. Governs Thread Pool and magical awareness.",
    detail: "Used for reading the Weave, detecting magical effects, and Thread Pool size calculation.",
  },
  potency: {
    term: "Potency (POT)",
    short: "Raw magical force. Governs damage output and overpowering effects.",
  },
  control: {
    term: "Control (CTR)",
    short: "Precision and shaping of Threads. Governs Ward Rating and technique accuracy.",
  },
  resilience: {
    term: "Resilience (RES)",
    short: "Physical and magical endurance. Governs Vitality Points and Guard Rating.",
  },
  acuity: {
    term: "Acuity (ACU)",
    short: "Mental sharpness. Governs perception, knowledge, and analytical checks.",
  },
  presence: {
    term: "Presence (PRE)",
    short: "Force of personality and social influence.",
  },
  threadsense: {
    term: "Threadsense (THS)",
    short: "Sensitivity to the Weave. Governs Thread Pool and magical awareness.",
  },
  vp: {
    term: "Vitality Points (VP)",
    short: "Your life total. Reaches 0 = Incapacitated.",
    detail: "Base 16 + (RES modifier × level). Reduced by damage, recovered by rest or Vital String.",
  },
  "vitality points": {
    term: "Vitality Points (VP)",
    short: "Your life total. At 0 VP you are Incapacitated.",
    detail: "Base 16 + (RES modifier × level). Reduced by damage, recovered by rest or Vital String.",
  },
  guard: {
    term: "Guard Rating",
    short: "Physical defense. Attackers must beat this to deal damage.",
    detail: "8 + RES modifier. Represents armor, toughness, and physical resilience.",
  },
  "guard rating": {
    term: "Guard Rating",
    short: "Physical defense. Attackers must beat this to deal damage.",
    detail: "8 + RES modifier. Represents armor, toughness, and physical resilience.",
  },
  ward: {
    term: "Ward Rating",
    short: "Magical defense. Incoming magical attacks must beat this.",
    detail: "8 + CTR modifier. Represents your ability to deflect and absorb magical force.",
  },
  "ward rating": {
    term: "Ward Rating",
    short: "Magical defense. Incoming magical attacks must beat this.",
    detail: "8 + CTR modifier. Represents your ability to deflect and absorb magical force.",
  },
  tension: {
    term: "Tension",
    short: "The magical pressure building in your Threads. Spend it to cast; too much causes Snapback.",
    detail: "Each String you cast costs Tension Points (TP). Exceeding your Safe Limit risks a Snapback on any roll of 1–5.",
  },
  "thread pool": {
    term: "Thread Pool",
    short: "Your total Tension capacity. Level + THS modifier.",
    detail: "This is the maximum Tension you can hold. Exceeding the Safe Limit is risky — approaching the Thread Pool cap is catastrophic.",
  },
  "safe limit": {
    term: "Safe Limit",
    short: "The Tension threshold below which you are safe from Snapback.",
    detail: "Level + CTR modifier. Below this, Snapback only triggers on a natural 1. Above it, any roll of 1–5 causes Snapback.",
  },
  sl: {
    term: "Safe Limit (SL)",
    short: "The Tension threshold below which you are safe from Snapback.",
    detail: "Level + CTR modifier. Below this, Snapback only triggers on a natural 1.",
  },
  tp: {
    term: "Tension Points (TP)",
    short: "The cost of casting a String at a given Power Level.",
    detail: "Spending TP increases your current Tension. Each String level has a listed TP cost.",
  },
  burnout: {
    term: "Burnout",
    short: "Permanent magical exhaustion. Accumulates when you Snapback or push too hard.",
    detail: "Track 0–6. Each level imposes escalating penalties: disadvantage → can't recover safely → damage per TP spent → locked out of high PL strings → complete Thread Death at 6.",
  },
  "thread check": {
    term: "Thread Check",
    short: "The dice roll to cast a String. Roll 1d20 + modifier vs the DC.",
    detail: "Most Thread Checks use THS or CTR modifier. Meeting or exceeding the DC = success. Rolling a 20 = Thread Break (exceptional). Rolling a 1 = Misfire.",
  },
  "thread break": {
    term: "Thread Break",
    short: "Natural 20 on a Thread Check. The effect is amplified or perfect.",
    detail: "On a Thread Break, the cast succeeds with exceptional power — double damage, extended duration, or an additional rider effect chosen by the Weavekeeper.",
  },
  misfire: {
    term: "Misfire",
    short: "Natural 1 on a Thread Check. The cast fails and a Snapback may occur.",
    detail: "On a Misfire, the Thread snaps back — you take the string's Snapback damage and the tension cost is still spent.",
  },
  snapback: {
    term: "Snapback",
    short: "When a Thread rebounds on the caster due to failure or overextension.",
    detail: "Each String has a specific Snapback effect. Also triggers on any roll of 1–5 when Tension exceeds Safe Limit.",
  },
  harmony: {
    term: "Harmony",
    short: "Roll 2d20, keep the highest. Used when conditions favor you.",
    detail: "Granted by terrain advantages, prepared positions, favoring techniques, or Weavekeeper discretion.",
  },
  discord: {
    term: "Discord",
    short: "Roll 2d20, keep the lowest. Used when conditions are against you.",
    detail: "Imposed by injury, environmental hazards, contested magic, or opposing techniques.",
  },
  pl: {
    term: "Power Level (PL)",
    short: "The tier of a String effect. PL 1 is weakest; PL 5 is most powerful.",
    detail: "Each PL costs more Tension Points (TP) and has a higher DC. You must know the String to attempt any PL.",
  },
  "power level": {
    term: "Power Level (PL)",
    short: "The tier of a String effect. Higher PL = more power, more cost.",
    detail: "PL 1–5 for most Strings. Cost and DC both scale up. You can always cast a lower PL than your maximum.",
  },
  dc: {
    term: "Difficulty Class (DC)",
    short: "The target number your Thread Check must meet or exceed.",
    detail: "Fixed per String level. Must roll 1d20 + modifier ≥ DC to succeed.",
  },
  string: {
    term: "String",
    short: "A named magical ability granted by your Affinity. Each String has 5 Power Levels.",
    detail: "Strings are the primary way weavers cast magic. Each uses a Thread Check (usually THS or CTR) and costs Tension Points.",
  },
  strings: {
    term: "Strings",
    short: "Named magical abilities granted by your Affinity, each with 5 Power Levels.",
    detail: "Strings are the primary way weavers cast magic. Each uses a Thread Check and costs Tension Points.",
  },
  technique: {
    term: "Technique",
    short: "A specialized named ability tied to your Mode. Combines multiple Strings or adds unique effects.",
    detail: "Techniques represent mastered combinations. Most require specific String prerequisites and use CTR for Thread Checks.",
  },
  techniques: {
    term: "Techniques",
    short: "Specialized named abilities tied to your Mode.",
    detail: "Techniques represent mastered combinations of Strings and Mode training. Most require CTR Thread Checks.",
  },
  affinity: {
    term: "Affinity",
    short: "Your magical element. Determines which Strings you can learn.",
    detail: "e.g. Water, Fire, Stone. Your Affinity determines your String list and your signature's color/sound/feel.",
  },
  mode: {
    term: "Mode",
    short: "Your combat/casting discipline. Determines your Technique list and playstyle.",
    detail: "Modes include Anchor (defense/control), Striker (offense), Conductor (support/area), and Binder (utility/trap). Your primary Mode is chosen at character creation.",
  },
  anchor: {
    term: "Anchor Mode",
    short: "Defensive and control-focused. Specializes in barriers, protection, and absorbing magical force.",
    detail: "Anchors use Still and Flow Strings most effectively. Signature technique: Tidal Lock. Best for front-line protection.",
  },
  striker: {
    term: "Striker Mode",
    short: "Aggressive and damage-focused. Specializes in direct attacks and breaching defenses.",
    detail: "Strikers favor Pressure and Tide Strings. Best for dealing damage and knocking enemies back.",
  },
  conductor: {
    term: "Conductor Mode",
    short: "Support and area-control. Specializes in buffing allies and controlling the battlefield.",
    detail: "Conductors excel at combining Strings for wide-area effects. High value in large encounters.",
  },
  binder: {
    term: "Binder Mode",
    short: "Utility and trap-setting. Specializes in persistent effects and magical binding.",
    detail: "Binders leave lingering effects and create reactive triggers in the environment.",
  },
  "refinement bonus": {
    term: "Refinement Bonus",
    short: "Your proficiency modifier applied to attuned skills. Scales with level.",
    detail: "Added to skill checks for skills you are Attuned to. Equivalent to proficiency bonus in other games.",
  },
  attuned: {
    term: "Attuned",
    short: "Marked proficiency in a skill. Adds your Refinement Bonus to that skill's check.",
  },
  "weave reading": {
    term: "Weave Reading",
    short: "THS-based skill. Used to detect, analyze, and identify magical effects.",
  },
  "ward craft": {
    term: "Ward Craft",
    short: "CTR-based skill. Used to construct magical wards, counterspells, and protective barriers.",
  },
  "combat forms": {
    term: "Combat Forms",
    short: "RES-based skill. Used for physical combat maneuvers and martial techniques.",
  },
  grit: {
    term: "Grit",
    short: "RES-based skill. Used for endurance, pain tolerance, and resisting debilitating effects.",
  },
  survival: {
    term: "Survival",
    short: "RES-based skill. Used for wilderness navigation, foraging, and enduring harsh environments.",
  },
  lore: {
    term: "Lore",
    short: "ACU-based skill. Used for historical knowledge, identifying places, and recalling facts.",
  },
  discernment: {
    term: "Discernment",
    short: "ACU-based skill. Used to detect lies, read motivations, and see through deception.",
  },
  "street sense": {
    term: "Street Sense",
    short: "ACU-based skill. Used for navigating urban environments, criminal underworld, and social danger.",
  },
  "guild protocol": {
    term: "Guild Protocol",
    short: "PRE-based skill. Used for formal interactions with guilds, hierarchies, and institutions.",
  },
  "trade craft": {
    term: "Trade Craft",
    short: "CTR-based skill. Used for negotiation, bartering, appraisal, and commerce.",
  },
  "anatomy of magic": {
    term: "Anatomy of Magic",
    short: "THS-based skill. Used to understand how magic physically affects the body and world.",
  },
  inscription: {
    term: "Inscription",
    short: "ACU-based skill. Used to write, read, and craft magical glyphs and runes.",
  },
};

export function lookupTerm(term: string): GlossaryEntry | undefined {
  const normalized = term.toLowerCase().trim();
  return GLOSSARY[normalized];
}
