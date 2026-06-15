export interface StringLevel {
  pl: number;
  cost: number;
  dc: number;
  effect: string;
}

export interface AffinityString {
  id: string;
  name: string;
  shortName: string;
  quote: string;
  flavor: string;
  checkAttr: "ths" | "ctr" | "pot";
  mishap: string;
  snapback: string;
  levels: StringLevel[];
}

export const WATER_STRINGS: AffinityString[] = [
  {
    id: "flow",
    name: "The Flow String",
    shortName: "Flow String",
    quote: '"Water does not fight the stone; it finds the path around it, and in time, wears it to dust."',
    flavor: "Movement, redirection, and adaptation. Manipulate momentum, slip through defenses, and turn an attacker's force against them.",
    checkAttr: "ths",
    mishap: "Water pools at the weaver's feet, making the ground slick and treacherous for them.",
    snapback: "A sudden, violent geyser erupts beneath the weaver, throwing them into the air.",
    levels: [
      { pl: 1, cost: 1, dc: 11, effect: "Shift position up to 10ft without triggering reactions." },
      { pl: 2, cost: 2, dc: 13, effect: "Redirect an incoming melee attack to a new target within 5ft." },
      { pl: 3, cost: 3, dc: 15, effect: "Move up to 30ft through a liquid medium instantly." },
      { pl: 4, cost: 5, dc: 17, effect: "Create a surging current that pushes all enemies within 15ft away by 20ft." },
      { pl: 5, cost: 8, dc: 19, effect: "Become liquid form for 1 round. Immune to physical damage, can flow through any crack." },
    ],
  },
  {
    id: "pressure",
    name: "The Pressure String",
    shortName: "Pressure String",
    quote: '"The deep ocean crushes steel like parchment. Why do you think flesh will fare better?"',
    flavor: "Force, weight, and crushing depth. Used for blunt, overwhelming attacks and restricting movement.",
    checkAttr: "pot",
    mishap: "The weaver's ears pop painfully, imposing Disadvantage on hearing-based checks.",
    snapback: "The pressure rebounds, crushing the weaver for 2d6 bludgeoning damage and reducing speed to 0 for a round.",
    levels: [
      { pl: 1, cost: 1, dc: 12, effect: "Target feels heavy. -10ft movement speed until your next turn." },
      { pl: 2, cost: 3, dc: 14, effect: "Crushing force deals 2d6 bludgeoning damage to one target." },
      { pl: 3, cost: 4, dc: 16, effect: "Target is pinned to the ground (Restrained) if they fail a POT save." },
      { pl: 4, cost: 6, dc: 18, effect: "Create a 15ft radius zone of extreme pressure. 4d6 damage and difficult terrain." },
      { pl: 5, cost: 9, dc: 20, effect: "Implode target. 8d6 damage and armor rating reduced by 4 permanently." },
    ],
  },
  {
    id: "still",
    name: "The Still String",
    shortName: "Still String",
    quote: '"A placid lake reflects perfectly, because it holds no violence."',
    flavor: "Calm, clarity, and freezing. Removes energy, slowing targets down or creating literal ice.",
    checkAttr: "ctr",
    mishap: "Frost forms on the weaver's hands, making precise actions difficult.",
    snapback: "Flash freeze. The weaver takes 2d8 cold damage and drops whatever they are holding.",
    levels: [
      { pl: 1, cost: 1, dc: 10, effect: "Freeze a small volume of water or extinguish a small mundane fire." },
      { pl: 2, cost: 2, dc: 13, effect: "Target must save or lose their reaction this turn." },
      { pl: 3, cost: 4, dc: 15, effect: "Create a 10ft wall of ice. Provides full cover, 20 HP." },
      { pl: 4, cost: 5, dc: 17, effect: "Deep freeze. Target takes 3d8 cold damage and is Stunned for 1 round on failed save." },
      { pl: 5, cost: 7, dc: 19, effect: "Absolute zero aura. 20ft radius. All enemies are Slowed and take 2d8 cold damage per turn." },
    ],
  },
  {
    id: "vital",
    name: "The Vital String",
    shortName: "Vital String",
    quote: '"Blood is just water that remembers."',
    flavor: "Healing, blood manipulation, and bodily humors. Highly restricted in polite society.",
    checkAttr: "ths",
    mishap: "A minor cut reopens, bleeding lazily.",
    snapback: "Violent hemorrhage. Take 3d6 damage and suffer bleeding (1d4 damage start of turn).",
    levels: [
      { pl: 1, cost: 2, dc: 12, effect: "Mend minor wounds, restoring 1d8 VP to a touched ally." },
      { pl: 2, cost: 3, dc: 14, effect: "Purge poison or disease from a target." },
      { pl: 3, cost: 5, dc: 16, effect: "Control blood flow to stabilize a dying target instantly, restoring them to 1 VP." },
      { pl: 4, cost: 7, dc: 18, effect: "Boil blood. Target takes 5d6 necrotic damage (save halves). If they die, they explode." },
      { pl: 5, cost: 10, dc: 21, effect: "Puppet. Control a creature with blood as if dominating them for 1 minute." },
    ],
  },
  {
    id: "tide",
    name: "The Tide String",
    shortName: "Tide String",
    quote: '"The moon pulls. The water answers. You are in the way."',
    flavor: "Rhythm, pulling, and sweeping change. Controls large bodies of water or wide areas.",
    checkAttr: "ths",
    mishap: "A sudden wave knocks the weaver prone.",
    snapback: "A localized undertow pulls the weaver 30ft in a random direction.",
    levels: [
      { pl: 1, cost: 2, dc: 11, effect: "Pull a target 10ft toward you." },
      { pl: 2, cost: 4, dc: 14, effect: "Create a sweeping wave 15ft wide. Pushes targets 15ft and knocks prone." },
      { pl: 3, cost: 5, dc: 16, effect: "High Tide: For 3 rounds, all water strings cost 1 less TP (min 1)." },
      { pl: 4, cost: 7, dc: 18, effect: "Whirlpool. 20ft radius. Traps enemies inside, dealing 3d6 damage per turn." },
      { pl: 5, cost: 10, dc: 20, effect: "Tsunami. A massive wave deals 8d6 damage in a 60ft cone, destroying structures." },
    ],
  },
];

export function findString(name: string, extraStrings: AffinityString[] = []): AffinityString | undefined {
  const all = [...WATER_STRINGS, ...extraStrings];
  const n = name.toLowerCase();
  return all.find(
    s => n.includes(s.id) || n.includes(s.shortName.toLowerCase()) || n === s.name.toLowerCase()
  );
}

export const ATTR_LABELS: Record<string, string> = {
  ths: "THS",
  ctr: "CTR",
  pot: "POT",
};
