import { CATALOG_ITEMS, KIT_CONTENTS, type ItemRarity } from "./ttrpg-data";

type Gear = string | { name: string; quantity?: number; description?: string };
type GearChoice = { label: string; item: Gear };

export interface EquipmentPack {
  key: string;
  title: string;
  source: string;
  items: Gear[];
  choices?: GearChoice[];
  choiceLabel?: string;
}

export interface StartingInventoryEntry {
  id: string;
  instanceId?: string;
  name: string;
  quantity: number;
  rarity: ItemRarity;
  source?: string;
  bound?: boolean;
  replaceable?: boolean;
  notes?: string;
  desc?: string;
  mechanical?: string;
  category?: string;
  subCategory?: string;
  equipped?: boolean;
  subItems?: { name: string; charges: number; maxCharges: number; desc?: string; canEquip?: boolean; equipped?: boolean }[];
}

const story = (name: string, quantity?: number): Gear => ({ name, quantity, description: "Narrative equipment; no mechanical bonus." });
const healing = { name: "Minor Healing Draught", quantity: 2 };

const BACKGROUND_PACKS: Record<string, Omit<EquipmentPack, "key" | "source">> = {
  "Guild-Raised": {
    title: "Guild-Raised Pack",
    items: ["c1", "c10", "c7", "m1", "m5", story("Guild identification badge"), story("Formal guild attire"), story("Writing supplies")],
  },
  "Civilian Mage": {
    title: "Civilian Mage Pack",
    items: ["c1", "c6", "m1", "c7", story("Practical tool kit"), story("Work clothing"), story("Profession-specific tools"), healing],
    choiceLabel: "Civilian profession (equipment and roleplay only)",
    choices: [
      { label: "Craftsperson", item: story("Crafting tools") },
      { label: "Guide", item: story("Navigation equipment") },
      { label: "Merchant", item: story("Ledger and merchant supplies") },
      { label: "Laborer", item: story("Work equipment") },
      { label: "Independent Mage", item: "c7" },
    ],
  },
  "Self-Taught": {
    title: "Self-Taught Pack",
    items: ["c1", "c6", "c7", "c10", "m1", story("Improvised tool kit"), story("Personal notes and casting journal"), "p1"],
    choiceLabel: "Personal casting tool (narrative only)",
    choices: ["Improvised Focus", "Old Casting Tool", "Handmade Talisman", "Experimental Equipment"]
      .map(label => ({ label, item: story(label) })),
  },
  "Noble-Born": {
    title: "Noble-Born Pack",
    items: ["c2", "c10", "m1", story("Formal clothing"), story("Family identification papers"), story("Writing set"), story("Fine travel case"), healing],
    choiceLabel: "Family heirloom (narrative only)",
    choices: ["Family Signet", "Ceremonial Weapon", "Inherited Talisman"]
      .map(label => ({ label, item: story(label) })),
  },
  "Military Family": {
    title: "Military Family Pack",
    items: ["c1", "a1", "c6", story("Emergency Whistle"), story("Medical Kit"), "m1", "c7"],
    choiceLabel: "Standard weapon",
    choices: [
      ["Dagger", "w1"], ["Short Sword", "w2"], ["Spear", "w3"], ["Arming Sword", "w4"],
      ["War Axe", "w5"], ["Staff", "w9"], ["Shortbow", "wr1"], ["Hand Crossbow", "wr3"],
    ].map(([label, item]) => ({ label, item })),
  },
  "Scholar's Lineage": {
    title: "Scholar's Lineage Pack",
    items: ["c1", "c10", "c7", "m1", story("Writing kit"), story("Research notes"), story("Reference texts"), "co6", story("Portable research supplies")],
  },
  "Temple-Raised": {
    title: "Temple-Raised Pack",
    items: ["c2", "c6", "m1", story("Medical Kit"), healing, story("Temple insignia"), story("Prayer and meditation materials"), "c7"],
  },
};

const GUILD_PACKS: Record<string, Omit<EquipmentPack, "key" | "source">> = {
  "The Scaled Guard": {
    title: "Scaled Guard Pack",
    items: ["a1", "c1", "w4", story("Emergency Whistle"), story("Medical Kit"), "m1", "c7"],
    choiceLabel: "Additional issued equipment",
    choices: [
      ["Spear", "w3"], ["Shortbow", "wr1"], ["Shield", "a4"], ["Dagger", "w1"], ["Short Sword", "w2"],
    ].map(([label, item]) => ({ label, item })),
  },
  "The Thaumatarch": {
    title: "Thaumatarch Pack",
    items: ["c2", "c10", "c7", "c6", "m1", "co6", "m5", story("Research supplies")],
    choiceLabel: "Specialist focus",
    choices: [{ label: "Resonance Compass", item: "c9" }, { label: "Signature Suppressor Pin", item: "c8" }],
  },
  "The Highblood Circles": {
    title: "Highblood Pack",
    items: ["c2", "c10", "m1", story("Formal attire"), story("Family signet"), story("Fine writing set"), story("Guild identification"), "c6"],
    choiceLabel: "House equipment (narrative only)",
    choices: ["Ceremonial Weapon", "Family Talisman", "Fine Staff"].map(label => ({ label, item: story(label) })),
  },
  "The Solar Temple": {
    title: "Solar Temple Pack",
    items: ["c2", "c6", story("Medical Kit"), healing, "m1", story("Temple insignia"), "c7", story("Healing supplies"), story("Temple Focus")],
  },
  "The Lorehall": {
    title: "Lorehall Pack",
    items: ["c1", "c10", "c7", "m1", "co6", story("Research supplies"), story("Writing kit"), story("Reference texts")],
    choiceLabel: "Research accessory",
    choices: [{ label: "Resonance Compass", item: "c9" }, { label: "Additional Weave Tracer Ink", item: "co6" }],
  },
  "The Forgecrown": {
    title: "Forgecrown Pack",
    items: ["c1", "c10", "c7", "m1", "c6", story("Crafting tools"), story("Enchanting supplies"), story("Repair tools")],
    choiceLabel: "Workshop equipment",
    choices: [{ label: "Portable Inscription Desk", item: "m4" }, { label: "Specialist Crafting Kit", item: story("Specialist Crafting Kit") }],
  },
};

export function getStartingPacks(background: string, guild: string): EquipmentPack[] {
  const packs: EquipmentPack[] = [];
  if (BACKGROUND_PACKS[background]) {
    packs.push({ ...BACKGROUND_PACKS[background], key: `background:${background}`, source: `Background — ${background}` });
  }
  if (GUILD_PACKS[guild]) {
    packs.push({ ...GUILD_PACKS[guild], key: `guild:${guild}`, source: `Guild — ${guild}` });
  }
  return packs;
}

export function gearName(gear: Gear): string {
  return typeof gear === "string" ? CATALOG_ITEMS.find(item => item.id === gear)?.name ?? gear : gear.name;
}

export function gearQuantity(gear: Gear): number {
  return typeof gear === "string" ? 1 : gear.quantity ?? 1;
}

export function makeGearEntry(gear: Gear, source: string, instanceId: string): StartingInventoryEntry {
  if (typeof gear === "string") {
    const item = CATALOG_ITEMS.find(entry => entry.id === gear);
    if (!item) throw new Error(`Unknown starting equipment item: ${gear}`);
    return {
      ...item, instanceId, quantity: 1, source, bound: false, replaceable: true, equipped: false,
      ...(KIT_CONTENTS[item.id] ? { subItems: KIT_CONTENTS[item.id].map(sub => ({ ...sub })) } : {}),
    };
  }
  return {
    id: `narrative:${gear.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    instanceId, name: gear.name, quantity: gear.quantity ?? 1, rarity: "common",
    category: "narrative", desc: gear.description ?? "Narrative equipment; no mechanical bonus.",
    source, bound: false, replaceable: true, equipped: false,
  };
}

export function resolveStartingPack(
  pack: EquipmentPack,
  selectedChoice: string | undefined,
  excluded: string[],
): StartingInventoryEntry[] {
  const chosen = pack.choices?.find(choice => choice.label === selectedChoice);
  if (pack.choices && !chosen) throw new Error(`Choose one item for ${pack.title}.`);
  const gear = pack.items.map((item, index) => ({ item, key: `${pack.key}:base:${index}` }));
  if (chosen) gear.push({ item: chosen.item, key: `${pack.key}:choice` });
  return gear.filter(({ key }) => !excluded.includes(key))
    .map(({ item, key }) => makeGearEntry(item, pack.source, key));
}