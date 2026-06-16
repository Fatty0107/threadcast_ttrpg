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
  {
    id: "mist",
    name: "The Mist String",
    shortName: "Mist String",
    quote: '"In the fog, the hunter becomes the hunted. Silence is its own kind of power."',
    flavor: "Vapor, concealment, and obscuration. Weave water into hanging clouds that blind enemies, muffle sound, and hide your movement.",
    checkAttr: "ths",
    mishap: "Mist clings to the weaver's own eyes and ears, imposing Disadvantage on perception checks for 1 round.",
    snapback: "A pressurized jet of super-cooled vapor blinds the weaver (Blinded condition) for 2 rounds and deals 2d4 cold damage.",
    levels: [
      { pl: 1, cost: 1, dc: 11, effect: "Create a 10ft cube of thick mist. Lightly obscured. Lasts 3 rounds." },
      { pl: 2, cost: 2, dc: 13, effect: "Mist clings to a target, granting you Advantage on your next attack against them." },
      { pl: 3, cost: 4, dc: 15, effect: "Blanket of fog covering 30ft radius. Heavily obscured. Lasts 1 minute or until dispersed by wind." },
      { pl: 4, cost: 6, dc: 17, effect: "Vaporize into mist yourself for 1 round. Invisible, immune to targeted spells, cannot attack." },
      { pl: 5, cost: 9, dc: 19, effect: "Poisonous fog. 40ft radius, lasts 3 rounds. 2d6 damage per turn and Poisoned condition on failed CON save." },
    ],
  },
  {
    id: "current",
    name: "The Current String",
    shortName: "Current String",
    quote: '"The river does not ask which way is fastest. It simply is."',
    flavor: "Speed, flow-state combat, and enhanced movement. Riding leylines like a river grants bursts of impossible acceleration.",
    checkAttr: "ctr",
    mishap: "The current drags the weaver 10ft in an unintended direction, potentially into danger.",
    snapback: "Velocity rebounds. The weaver takes 3d6 bludgeoning damage as they slam into an invisible 'wall' and are knocked Prone.",
    levels: [
      { pl: 1, cost: 1, dc: 10, effect: "+20ft movement speed this turn. No opportunity attacks while moving in a straight line." },
      { pl: 2, cost: 2, dc: 12, effect: "Dash as a Bonus Action and move through difficult terrain without penalty this turn." },
      { pl: 3, cost: 4, dc: 14, effect: "Speed burst. Move up to 60ft in a straight line; targets in your path must save or be knocked Prone." },
      { pl: 4, cost: 5, dc: 16, effect: "Waterwalk. You and up to 4 allies walk on water or vertical wet surfaces for 10 minutes." },
      { pl: 5, cost: 8, dc: 19, effect: "Slipstream. For 1 minute, your movement doesn't provoke reactions and you can pass through occupied spaces." },
    ],
  },
  {
    id: "vortex",
    name: "The Vortex String",
    shortName: "Vortex String",
    quote: '"Everything falls into the center eventually. You just decide where the center is."',
    flavor: "Spinning, gathering, and imploding. Creates localized cyclones of water pressure that tear at everything caught inside.",
    checkAttr: "pot",
    mishap: "A mini-vortex forms on the weaver's hand, dealing 1d6 slashing damage and disarming them.",
    snapback: "The vortex implodes inward at the weaver. 3d8 slashing damage and all items in a 5ft radius are flung 20ft away.",
    levels: [
      { pl: 1, cost: 2, dc: 12, effect: "Spinning water shield. +2 Ward Rating until start of next turn. Attackers take 1d4 slashing." },
      { pl: 2, cost: 3, dc: 14, effect: "Small vortex deals 2d8 slashing to one target and disarms them on failed save." },
      { pl: 3, cost: 5, dc: 16, effect: "Vortex field 10ft radius. 3d6 slashing damage and all targets are pulled 10ft to the center." },
      { pl: 4, cost: 7, dc: 18, effect: "Cyclone column, 5ft wide 30ft tall. 5d8 slashing, lifts targets and drops them (fall damage)." },
      { pl: 5, cost: 10, dc: 20, effect: "Grand Maelstrom. 30ft radius, lasts 2 rounds. 4d10 slashing per round, Restrained on failed save." },
    ],
  },
  {
    id: "deluge",
    name: "The Deluge String",
    shortName: "Deluge String",
    quote: '"I do not bring rain. I bring consequence."',
    flavor: "Torrential downpours, mass area control, and environmental domination. Forces entire fields to become treacherous quagmires.",
    checkAttr: "ths",
    mishap: "Rain backlash soaks the weaver's gear. Scrolls and documents are destroyed; fire-based items are doused.",
    snapback: "A lightning bolt from the storm strikes the weaver (not all weather magic is safe) for 4d6 lightning damage.",
    levels: [
      { pl: 1, cost: 1, dc: 11, effect: "Call light rain in 20ft radius. Extinguishes non-magical fires, ground becomes slick (-5ft move speed)." },
      { pl: 2, cost: 3, dc: 13, effect: "Sudden downpour. 20ft radius, Disadvantage on fire-based actions for all within. Lasts 3 rounds." },
      { pl: 3, cost: 5, dc: 15, effect: "Torrential rain, 40ft radius. Ground becomes difficult terrain; ranged attacks have Disadvantage." },
      { pl: 4, cost: 7, dc: 17, effect: "Cloudburst. 3d6 bludgeoning damage to all in 30ft radius; targets must save or be Prone from the force." },
      { pl: 5, cost: 10, dc: 20, effect: "Monsoon storm. 60ft radius, lasts 5 rounds. 2d8 bludgeoning per round, visibility zero, flying impossible." },
    ],
  },
  {
    id: "brine",
    name: "The Brine String",
    shortName: "Brine String",
    quote: '"Salt preserves the dead. It can also make the living wish they were."',
    flavor: "Corrosive salt water, dissolution, and chemical degradation. Brine eats through armor, poisons wounds, and desiccates flesh.",
    checkAttr: "pot",
    mishap: "Brine splashes back onto the weaver. Their armor's Guard Rating is reduced by 1 until the salt is cleaned off (1 action).",
    snapback: "Corrosive backlash dissolves the weaver's outer layer. 2d8 acid damage and skin becomes raw (Vulnerability to slashing for 1 round).",
    levels: [
      { pl: 1, cost: 1, dc: 12, effect: "Salt spray. 1d6 acid damage. If target has an open wound, they are Poisoned for 1 round." },
      { pl: 2, cost: 3, dc: 14, effect: "Corrode object. Reduce a non-magical armor or weapon's rating by 1d4 permanently." },
      { pl: 3, cost: 4, dc: 16, effect: "Brine lance. 3d8 acid damage. Armor does not reduce this damage (bypasses GR)." },
      { pl: 4, cost: 6, dc: 18, effect: "Salt dissolution. Target takes 4d8 acid over 3 rounds (no save). Non-magical armor destroyed on 0 HP." },
      { pl: 5, cost: 9, dc: 20, effect: "Desiccation nova. 25ft radius, 6d10 acid damage. On failed save, target is Weakened (half damage dealt) for 2 rounds." },
    ],
  },
  {
    id: "vapor",
    name: "The Vapor String",
    shortName: "Vapor String",
    quote: '"Steam is water that has learned to be invisible and lethal at the same time."',
    flavor: "Superheated steam and thermal water manipulation. Burns on contact, clouds machinery, and opens lock mechanisms through expansion.",
    checkAttr: "ctr",
    mishap: "A steam backblast scalds the weaver's hands and face. 1d6 fire damage and Disadvantage on precision checks next turn.",
    snapback: "Vapor condenses explosively inside the weaver's lungs. 3d6 fire damage and one level of Fatigue as they cough out steam.",
    levels: [
      { pl: 1, cost: 1, dc: 11, effect: "Jet of superheated steam. 1d8 fire damage and target is blinded until end of next turn." },
      { pl: 2, cost: 2, dc: 13, effect: "Vapor lock. Lock a mechanical door or container by expanding steam inside its mechanism (Strength DC 18 to open)." },
      { pl: 3, cost: 4, dc: 15, effect: "Scalding cloud. 15ft radius, 2d8 fire damage per round for 2 rounds. Visibility heavily obscured." },
      { pl: 4, cost: 6, dc: 17, effect: "Pressure cooker. A single target takes 4d10 fire damage as steam is forced under their armor." },
      { pl: 5, cost: 9, dc: 19, effect: "Geothermal vent. 20ft radius eruption of 600°C steam. 8d8 fire damage; metal armor becomes too hot to wear (1d6 fire per round if kept on) for 3 rounds." },
    ],
  },
  {
    id: "undertow",
    name: "The Undertow String",
    shortName: "Undertow String",
    quote: '"You cannot fight what you cannot see. You cannot escape what is already beneath you."',
    flavor: "Invisible pulling forces beneath the surface. Undertow operates in total silence, dragging targets into inescapable zones.",
    checkAttr: "pot",
    mishap: "The weaver's own footing becomes treacherous — they must save or be pulled 15ft toward the nearest body of water or low ground.",
    snapback: "A crushing invisible force grabs the weaver and slams them into the ground. 3d8 bludgeoning damage and Stunned 1 round.",
    levels: [
      { pl: 1, cost: 1, dc: 11, effect: "Drag a target 15ft toward you (no save). They must make an Athletics check DC 12 or fall Prone." },
      { pl: 2, cost: 3, dc: 14, effect: "Anchor one target. Their speed is reduced to 0 on failed POT save. Lasts until they succeed." },
      { pl: 3, cost: 5, dc: 16, effect: "Mass drag. All enemies in 20ft cone pulled 20ft toward you and knocked Prone." },
      { pl: 4, cost: 7, dc: 18, effect: "Inescapable current. Target is Restrained and dragged 10ft toward you at the start of each turn for 3 rounds." },
      { pl: 5, cost: 10, dc: 20, effect: "The Depths. 30ft radius zone. All creatures must save at the start of their turn or be dragged 20ft to the center and Restrained. POT check to break free (DC 18)." },
    ],
  },
  {
    id: "ripple",
    name: "The Ripple String",
    shortName: "Ripple String",
    quote: '"Touch the surface gently. The stone at the bottom will tell you everything."',
    flavor: "Vibration sensing, divination through water, and tremorsense. The most subtle of the water strings — purely about information.",
    checkAttr: "ths",
    mishap: "Sensory overload. The weaver is overwhelmed with vibrations and is Stunned for 1 round as their mind floods with echoes.",
    snapback: "Reality feedback. The weaver 'sees' a false image of the area and acts on incorrect information on their next turn (GM determines the error).",
    levels: [
      { pl: 1, cost: 1, dc: 10, effect: "Tremorsense 30ft through wet or moist ground for 1 minute. Feel footsteps and weight." },
      { pl: 2, cost: 2, dc: 12, effect: "Read a body of water. Learn how many creatures have touched it in the last hour, their size, and direction of travel." },
      { pl: 3, cost: 3, dc: 14, effect: "Echolocation pulse through any liquid. Reveals exact positions of all creatures in 60ft through water or mist." },
      { pl: 4, cost: 5, dc: 16, effect: "Magical scrying via water surface. See a location within 1 mile that has any standing water for up to 10 minutes." },
      { pl: 5, cost: 8, dc: 18, effect: "Thread Memory. Touch any water source and witness events that occurred within 30ft of it in the last 24 hours (no saves — this is pure divination)." },
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
