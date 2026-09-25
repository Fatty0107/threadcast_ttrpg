import { useState } from "react";
import { CATALOG_ITEMS, RARITY_LABELS } from "@/lib/ttrpg-data";
import {
  gearName, gearQuantity, getStartingPacks, type StartingInventoryEntry,
} from "@/lib/starting-equipment";
import { cn } from "@/lib/utils";

interface Props {
  background: string;
  guild: string;
  editing: boolean;
  includePacks: boolean;
  onIncludePacks: (value: boolean) => void;
  choices: Record<string, string>;
  onChoose: (packKey: string, label: string) => void;
  customized: string[];
  onCustomize: (packKey: string) => void;
  excluded: string[];
  onToggleItem: (key: string) => void;
  personalItems: StartingInventoryEntry[];
  onAddCatalog: (id: string) => void;
  onAddCustom: (name: string) => void;
  onRemovePersonal: (instanceId: string) => void;
  existingItems: StartingInventoryEntry[];
}

export function StartingEquipmentStep({
  background, guild, editing, includePacks, onIncludePacks,
  choices, onChoose, customized, onCustomize, excluded, onToggleItem,
  personalItems, onAddCatalog, onAddCustom, onRemovePersonal, existingItems,
}: Props) {
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const packs = getStartingPacks(background, guild);
  const catalog = CATALOG_ITEMS.filter(item =>
    item.rarity === "common" && item.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-[family-name:'Cinzel',serif] text-foreground">Starting Equipment</h2>
        <p className="text-xs font-mono text-muted-foreground mt-1 leading-relaxed">
          Your background and guild each provide a pack. Choose required options, accept the whole pack or customize its items, and add personal equipment.
        </p>
      </div>

      {editing && (
        <div className="p-4 border border-border bg-card/60 space-y-2">
          <p className="text-sm font-mono text-foreground">Existing inventory · {existingItems.length} entries</p>
          <p className="text-xs font-mono text-muted-foreground">
            Your current gear remains untouched. Packs are not granted to existing characters unless you choose to add them.
          </p>
          <label className="flex gap-2 items-start text-xs font-mono text-primary cursor-pointer">
            <input type="checkbox" checked={includePacks} onChange={e => onIncludePacks(e.target.checked)} className="mt-0.5 accent-primary" />
            Add selected background and guild packs to this character
          </label>
        </div>
      )}

      {includePacks ? packs.map(pack => {
        const isCustom = customized.includes(pack.key);
        const selected = choices[pack.key];
        const rows = pack.items.map((item, index) => ({ item, key: `${pack.key}:base:${index}` }));
        const chosen = pack.choices?.find(choice => choice.label === selected);
        if (chosen) rows.push({ item: chosen.item, key: `${pack.key}:choice` });
        return (
          <section key={pack.key} className="border border-border bg-card/50">
            <div className="p-4 border-b border-border/50 flex flex-wrap gap-3 items-start justify-between">
              <div>
                <p className="text-[10px] font-mono text-primary uppercase tracking-widest">{pack.source}</p>
                <h3 className="font-[family-name:'Cinzel',serif] text-lg text-foreground">{pack.title}</h3>
              </div>
              <button type="button" onClick={() => onCustomize(pack.key)}
                className="px-3 py-1.5 text-[10px] font-mono border border-primary/50 text-primary hover:bg-primary/10">
                {isCustom ? "ACCEPT FULL PACKAGE" : "CUSTOMIZE ITEMS"}
              </button>
            </div>
            {pack.choices && (
              <div className="p-4 border-b border-border/30">
                <p className="text-xs font-mono text-foreground mb-2">{pack.choiceLabel ?? "Choose one"} <span className="text-destructive">*</span></p>
                <div className="flex flex-wrap gap-2">
                  {pack.choices.map(choice => (
                    <button key={choice.label} type="button" onClick={() => onChoose(pack.key, choice.label)}
                      aria-pressed={selected === choice.label}
                      className={cn("px-2.5 py-1.5 text-xs font-mono border transition-colors",
                        selected === choice.label ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                      {choice.label}
                    </button>
                  ))}
                </div>
                {!selected && <p className="mt-2 text-[10px] font-mono text-destructive">Choose one to continue.</p>}
              </div>
            )}
            <ul className="divide-y divide-border/20">
              {rows.map(({ item, key }) => {
                const omitted = isCustom && excluded.includes(key);
                return (
                  <li key={key} className={cn("flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-mono", omitted && "opacity-50")}>
                    <label className="flex items-center gap-2 min-w-0">
                      <input type="checkbox" checked={!omitted} disabled={!isCustom || key.endsWith(":choice")}
                        onChange={() => onToggleItem(key)} className="accent-primary" />
                      <span className={cn("text-foreground", omitted && "line-through")}>{gearName(item)}</span>
                    </label>
                    {gearQuantity(item) > 1 && <span className="text-primary flex-shrink-0">×{gearQuantity(item)}</span>}
                  </li>
                );
              })}
            </ul>
            <p className="px-4 py-2 border-t border-border/30 text-[10px] font-mono text-muted-foreground">
              Catalog items retain their listed effects. Narrative gear has no added mechanical bonus.
            </p>
          </section>
        );
      }) : editing ? null : <p className="text-xs font-mono text-muted-foreground">Choose a background and guild to see your packs.</p>}

      <section className="border border-border bg-card/50 p-4 space-y-3">
        <div>
          <h3 className="font-[family-name:'Cinzel',serif] text-lg text-foreground">Personal Equipment</h3>
          <p className="text-xs font-mono text-muted-foreground">
            Add common items from the existing catalog or name a narrative item. Rarer items stay within the packs above or the character sheet.
          </p>
        </div>
        <input className="input-field" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search common starting items…" aria-label="Search common starting items" />
        <div className="max-h-44 overflow-y-auto border border-border/50 divide-y divide-border/20">
          {catalog.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-mono">
              <span className="text-foreground">{item.name} <span className="text-muted-foreground">· {RARITY_LABELS[item.rarity]}</span></span>
              <button type="button" onClick={() => onAddCatalog(item.id)}
                className="text-primary hover:underline flex-shrink-0">+ ADD</button>
            </div>
          ))}
          {catalog.length === 0 && <p className="px-3 py-2 text-xs font-mono text-muted-foreground">No common items match.</p>}
        </div>
        <div className="flex gap-2">
          <input className="input-field min-w-0" value={customName} maxLength={80}
            onChange={e => setCustomName(e.target.value)} placeholder="Name a narrative item…"
            aria-label="Narrative item name" />
          <button type="button" disabled={!customName.trim()} onClick={() => { onAddCustom(customName.trim()); setCustomName(""); }}
            className="px-3 border border-primary/50 text-primary text-xs font-mono disabled:opacity-40 whitespace-nowrap">+ ADD</button>
        </div>
        {personalItems.length > 0 && (
          <ul className="space-y-1">
            {personalItems.map(item => (
              <li key={item.instanceId} className="flex justify-between gap-3 text-xs font-mono p-2 bg-background border border-border/40">
                <span>{item.name} <span className="text-muted-foreground">· {item.source}</span></span>
                <button type="button" onClick={() => onRemovePersonal(item.instanceId!)} className="text-destructive">REMOVE</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}