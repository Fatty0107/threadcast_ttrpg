import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useListCharacters, type Character } from "@workspace/api-client-react";
import { useHomebrew } from "@/contexts/HomebrewContext";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterSheetContent } from "@/components/character/CharacterSheetContent";
import { ATTRIBUTE_DEFS } from "@/lib/ttrpg-data";
import { type AffinityString } from "@/lib/affinity-data";
import {
  Users, Scroll, Plus, Trash2, Eye, EyeOff, Edit3, Globe,
  ShieldHalf, Swords, Flame, Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_CHARACTER: Character = {
  id: 999, userId: 999, name: "Meren Vail", level: 7,
  affinity: "Water", mode: "Anchor", isDraft: false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  data: {
    attributes: { pot: 14, ctr: 16, res: 13, acu: 12, pre: 11, ths: 15 },
    vitalityPoints: { current: 30, max: 30 },
    tension: { current: 4, pool: 18, safeLimit: 9 },
    burnout: 0, guardRating: 12, wardRating: 16,
    background: "Guild-Raised — Scaled Guard",
    guild: "The Scaled Guard", guildRank: "Wyrmlord",
    primaryMode: "Anchor", refinementBonus: 4,
    strings: ["Flow String", "Pressure String", "Still String", "Vital String", "Tide String"],
    techniques: [{name: "Fortify"}, {name: "Surge Absorb"}, {name: "Shared Ground"}, {name: "Tidal Lock"}],
    skills: [
      { name: "Combat Forms", attribute: "RES", attuned: true },
      { name: "Ward Craft", attribute: "CTR", attuned: true },
      { name: "Weave Reading", attribute: "THS", attuned: true }
    ],
    feats: ["Snapback Veteran", "Overcaster"],
    notes: "Signature: Pale blue-green luminescence at hands; resonant tone like water through stone channels.",
    attunedSkills: ["Combat Forms", "Ward Craft", "Weave Reading"],
  }
};

// ── Wizard Types ──────────────────────────────────────────────────────────

interface StringDraft {
  name: string; shortName: string; quote: string; flavor: string;
  checkAttr: "ths" | "ctr" | "pot"; mishap: string; snapback: string;
  levels: { pl: number; cost: number; dc: number; effect: string }[];
}

const defaultStringDraft = (): StringDraft => ({
  name: "", shortName: "", quote: "", flavor: "", checkAttr: "ths", mishap: "", snapback: "",
  levels: [
    { pl: 1, cost: 1, dc: 10, effect: "" },
    { pl: 2, cost: 2, dc: 13, effect: "" },
    { pl: 3, cost: 4, dc: 15, effect: "" },
    { pl: 4, cost: 6, dc: 17, effect: "" },
    { pl: 5, cost: 8, dc: 19, effect: "" },
  ],
});

// ── Affinity Wizard ───────────────────────────────────────────────────────

function AffinityWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [wizStep, setWizStep] = useState(0);
  const [activeStringIdx, setActiveStringIdx] = useState(0);
  const [draft, setDraft] = useState({ name: "", description: "", strings: [defaultStringDraft()] });
  const [saving, setSaving] = useState(false);
  const WIZ_STEPS = ["Basic Info", "Strings", "Power Levels", "Review"];

  function updateString(idx: number, patch: Partial<StringDraft>) {
    const next = [...draft.strings]; next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, strings: next });
  }
  function updateLevel(si: number, li: number, patch: Partial<{cost:number;dc:number;effect:string}>) {
    const next = [...draft.strings]; const levels = [...next[si].levels];
    levels[li] = { ...levels[li], ...patch }; next[si] = { ...next[si], levels };
    setDraft({ ...draft, strings: next });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = {
        description: draft.description,
        strings: draft.strings.map(s => ({
          id: s.shortName.toLowerCase().replace(/\s+/g, "_") || s.name.toLowerCase().replace(/\s+/g, "_"),
          name: s.name, shortName: s.shortName, quote: s.quote, flavor: s.flavor,
          checkAttr: s.checkAttr, mishap: s.mishap, snapback: s.snapback, levels: s.levels,
        })) as AffinityString[],
      };
      const res = await fetch("/api/homebrew", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ type: "affinity", name: draft.name, data }),
      });
      if (res.ok) { onSave(); onClose(); }
    } finally { setSaving(false); }
  }

  const activeStr = draft.strings[activeStringIdx];

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-[family-name:'Cinzel',serif] text-lg">New Affinity</h2>
            <div className="flex gap-3 mt-1">
              {WIZ_STEPS.map((s, i) => (
                <span key={s} className={cn("text-[10px] font-mono", i === wizStep ? "text-primary" : i < wizStep ? "text-muted-foreground" : "text-muted-foreground/30")}>
                  {i < wizStep ? "✓ " : `${i+1}. `}{s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-mono w-6 h-6 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {wizStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1">Affinity Name</label>
                <input className="input-field" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="e.g., Fire, Shadow, Storm..." />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1">Description</label>
                <textarea className="input-field min-h-[80px] resize-none" value={draft.description} onChange={e => setDraft({...draft, description: e.target.value})} placeholder="What is this affinity about?" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Strings ({draft.strings.length}/5)</label>
                  {draft.strings.length < 5 && (
                    <button type="button" onClick={() => setDraft({...draft, strings: [...draft.strings, defaultStringDraft()]})}
                      className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add String
                    </button>
                  )}
                </div>
                {draft.strings.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <input className="flex-1 input-field text-sm" value={s.name} onChange={e => updateString(i, {name: e.target.value})} placeholder={`String ${i+1} full name...`} />
                    <input className="w-32 input-field text-sm" value={s.shortName} onChange={e => updateString(i, {shortName: e.target.value})} placeholder="Short name..." />
                    {draft.strings.length > 1 && (
                      <button type="button" onClick={() => setDraft({...draft, strings: draft.strings.filter((_,j)=>j!==i)})} className="text-destructive/50 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {wizStep === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {draft.strings.map((s, i) => (
                  <button key={i} type="button" onClick={() => setActiveStringIdx(i)}
                    className={cn("px-3 py-1 text-xs font-mono border flex-shrink-0 transition-colors", i === activeStringIdx ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                    {s.shortName || `String ${i+1}`}
                  </button>
                ))}
              </div>
              {activeStr && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Quote</label>
                    <textarea className="input-field min-h-[50px] resize-none text-sm" value={activeStr.quote} onChange={e => updateString(activeStringIdx, {quote: e.target.value})} placeholder='"A flavor quote for this string..."' />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Flavor / Description</label>
                    <textarea className="input-field min-h-[60px] resize-none text-sm" value={activeStr.flavor} onChange={e => updateString(activeStringIdx, {flavor: e.target.value})} placeholder="What does this string do thematically?" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Check Attribute</label>
                    <div className="flex gap-2">
                      {(["ths","ctr","pot"] as const).map(attr => (
                        <button key={attr} type="button" onClick={() => updateString(activeStringIdx, {checkAttr: attr})}
                          className={cn("flex-1 py-2 text-xs font-mono border uppercase transition-colors", activeStr.checkAttr === attr ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                          {attr}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-mono text-muted-foreground block mb-1">Mishap (Nat 1)</label>
                      <textarea className="input-field min-h-[50px] resize-none text-xs" value={activeStr.mishap} onChange={e => updateString(activeStringIdx, {mishap: e.target.value})} placeholder="Effect on a natural 1..." />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-muted-foreground block mb-1">Snapback</label>
                      <textarea className="input-field min-h-[50px] resize-none text-xs" value={activeStr.snapback} onChange={e => updateString(activeStringIdx, {snapback: e.target.value})} placeholder="Critical failure effect..." />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {wizStep === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {draft.strings.map((s, i) => (
                  <button key={i} type="button" onClick={() => setActiveStringIdx(i)}
                    className={cn("px-3 py-1 text-xs font-mono border flex-shrink-0 transition-colors", i === activeStringIdx ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                    {s.shortName || `String ${i+1}`}
                  </button>
                ))}
              </div>
              {activeStr && (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground mb-2">Set cost, DC, and effect for each power level:</p>
                  {activeStr.levels.map((lv, li) => (
                    <div key={li} className="p-3 border border-border/60 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-primary w-6 flex-shrink-0">PL{li+1}</span>
                        <div className="flex gap-2">
                          <div>
                            <label className="text-[9px] font-mono text-muted-foreground/60 block">Cost</label>
                            <input type="number" min={1} className="w-12 input-field text-center text-xs" value={lv.cost} onChange={e => updateLevel(activeStringIdx, li, {cost: parseInt(e.target.value)||1})} />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono text-muted-foreground/60 block">DC</label>
                            <input type="number" min={5} className="w-12 input-field text-center text-xs" value={lv.dc} onChange={e => updateLevel(activeStringIdx, li, {dc: parseInt(e.target.value)||10})} />
                          </div>
                        </div>
                      </div>
                      <input className="input-field text-xs" value={lv.effect} onChange={e => updateLevel(activeStringIdx, li, {effect: e.target.value})} placeholder={`PL${li+1} effect description...`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {wizStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 border border-primary/20 bg-primary/5">
                <p className="font-[family-name:'Cinzel',serif] text-sm text-primary mb-1">{draft.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{draft.description}</p>
              </div>
              {draft.strings.map((s, i) => (
                <div key={i} className="p-3 border border-border/60 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm text-foreground">{s.name || `String ${i+1}`}</span>
                    <span className="text-[10px] font-mono text-primary uppercase">{s.checkAttr} check</span>
                  </div>
                  {s.quote && <p className="text-[10px] font-[family-name:'IM_Fell_English',serif] italic text-primary/60">{s.quote}</p>}
                  {s.flavor && <p className="text-xs font-mono text-muted-foreground">{s.flavor}</p>}
                  <div className="space-y-0.5 mt-1">
                    {s.levels.map(l => (
                      <div key={l.pl} className="text-[10px] font-mono text-muted-foreground/70">
                        PL{l.pl}: {l.cost}tp | DC {l.dc} | {l.effect || "(no effect set)"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between p-4 border-t border-border">
          <button onClick={() => wizStep > 0 ? setWizStep(s => s-1) : onClose()}
            className="px-4 py-2 text-xs font-mono border border-border text-muted-foreground hover:bg-muted transition-colors">
            {wizStep === 0 ? "Cancel" : "← Back"}
          </button>
          {wizStep < WIZ_STEPS.length - 1 ? (
            <button onClick={() => setWizStep(s => s+1)} disabled={wizStep === 0 && !draft.name.trim()}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !draft.name.trim()}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              {saving ? "Saving..." : "Save Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Item Wizard ───────────────────────────────────────────────────────────

function ItemWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [wizStep, setWizStep] = useState(0);
  const [draft, setDraft] = useState({ name: "", category: "Magical", subCategory: "", rarity: "Common", desc: "", mechanical: "", cost: "" });
  const [saving, setSaving] = useState(false);
  const WIZ_STEPS = ["Basic Info", "Mechanical", "Review"];
  const RARITIES = ["Common", "Uncommon", "Rare", "Exotic", "Legendary"];
  const CATEGORIES = ["Magical", "Weapon", "Armor", "Consumable", "Tool", "Artifact", "Kit"];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/homebrew", {
        method: "POST", headers: {"Content-Type":"application/json"}, credentials: "include",
        body: JSON.stringify({ type: "item", name: draft.name, data: draft }),
      });
      if (res.ok) { onSave(); onClose(); }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-[family-name:'Cinzel',serif] text-lg">New Item</h2>
            <div className="flex gap-3 mt-1">
              {WIZ_STEPS.map((s, i) => (
                <span key={s} className={cn("text-[10px] font-mono", i === wizStep ? "text-primary" : i < wizStep ? "text-muted-foreground" : "text-muted-foreground/30")}>
                  {i < wizStep ? "✓ " : `${i+1}. `}{s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-mono">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {wizStep === 0 && (
            <>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Name</label>
                <input className="input-field" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="Item name..." /></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Rarity</label>
                <div className="flex flex-wrap gap-1">{RARITIES.map(r => (
                  <button key={r} type="button" onClick={() => setDraft({...draft, rarity: r})}
                    className={cn("px-3 py-1 text-xs font-mono border transition-colors", draft.rarity === r ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{r}</button>
                ))}</div></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Category</label>
                <div className="flex flex-wrap gap-1">{CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setDraft({...draft, category: c})}
                    className={cn("px-3 py-1 text-xs font-mono border transition-colors", draft.category === c ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{c}</button>
                ))}</div></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Sub-category</label>
                <input className="input-field" value={draft.subCategory} onChange={e => setDraft({...draft, subCategory: e.target.value})} placeholder="e.g., Ranged, Scroll..." /></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Description</label>
                <textarea className="input-field min-h-[80px] resize-none" value={draft.desc} onChange={e => setDraft({...draft, desc: e.target.value})} placeholder="Flavor and physical description..." /></div>
            </>
          )}
          {wizStep === 1 && (
            <>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Mechanical Effect</label>
                <textarea className="input-field min-h-[100px] resize-none" value={draft.mechanical} onChange={e => setDraft({...draft, mechanical: e.target.value})} placeholder="What does it do? Bonuses, charges, actions..." /></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Cost / Availability</label>
                <input className="input-field" value={draft.cost} onChange={e => setDraft({...draft, cost: e.target.value})} placeholder="e.g., 150 Gold, Rare vendor..." /></div>
            </>
          )}
          {wizStep === 2 && (
            <div className="space-y-3">
              <div className="p-3 border border-primary/20 bg-primary/5">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-mono text-foreground text-sm">{draft.name}</span>
                  <span className="text-[10px] font-mono text-primary">{draft.rarity} · {draft.category}</span>
                </div>
                {draft.subCategory && <p className="text-[10px] font-mono text-muted-foreground">{draft.subCategory}</p>}
                <p className="text-xs font-mono text-muted-foreground mt-1">{draft.desc}</p>
              </div>
              {draft.mechanical && <div className="p-3 border border-border/60">
                <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Effect</p>
                <p className="text-xs font-mono text-foreground">{draft.mechanical}</p>
              </div>}
              {draft.cost && <p className="text-xs font-mono text-muted-foreground">Cost: {draft.cost}</p>}
            </div>
          )}
        </div>
        <div className="flex justify-between p-4 border-t border-border">
          <button onClick={() => wizStep > 0 ? setWizStep(s => s-1) : onClose()}
            className="px-4 py-2 text-xs font-mono border border-border text-muted-foreground hover:bg-muted transition-colors">
            {wizStep === 0 ? "Cancel" : "← Back"}
          </button>
          {wizStep < WIZ_STEPS.length - 1 ? (
            <button onClick={() => setWizStep(s => s+1)} disabled={!draft.name.trim()}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !draft.name.trim()}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              {saving ? "Saving..." : "Save Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Background Wizard ─────────────────────────────────────────────────────

function BackgroundWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [wizStep, setWizStep] = useState(0);
  const [draft, setDraft] = useState({ name: "", desc: "", attrBonuses: {} as Record<string,number>, flexBonus: 0, startingSkills: [] as string[], startingBurnout: 0, benefit: "", penalty: "" });
  const [saving, setSaving] = useState(false);
  const WIZ_STEPS = ["Basic Info", "Attributes", "Skills & Extras", "Review"];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/homebrew", {
        method: "POST", headers: {"Content-Type":"application/json"}, credentials: "include",
        body: JSON.stringify({ type: "background", name: draft.name, data: { ...draft } }),
      });
      if (res.ok) { onSave(); onClose(); }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-[family-name:'Cinzel',serif] text-lg">New Background</h2>
            <div className="flex gap-3 mt-1">
              {WIZ_STEPS.map((s, i) => (
                <span key={s} className={cn("text-[10px] font-mono", i === wizStep ? "text-primary" : i < wizStep ? "text-muted-foreground" : "text-muted-foreground/30")}>
                  {i < wizStep ? "✓ " : `${i+1}. `}{s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-mono">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {wizStep === 0 && (
            <>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Background Name</label>
                <input className="input-field" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="e.g., Street Urchin, Temple Scholar..." /></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Description</label>
                <textarea className="input-field min-h-[100px] resize-none" value={draft.desc} onChange={e => setDraft({...draft, desc: e.target.value})} placeholder="Who comes from this background?" /></div>
            </>
          )}
          {wizStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground">Choose up to 3 stat bonuses (+1 each):</p>
              <div className="grid grid-cols-3 gap-2">
                {ATTRIBUTE_DEFS.map(attr => {
                  const current = draft.attrBonuses[attr.key] ?? 0;
                  const total = Object.values(draft.attrBonuses).reduce((a,b)=>a+b,0);
                  return (
                    <button key={attr.key} type="button"
                      onClick={() => { const next = {...draft.attrBonuses}; if (current) { delete next[attr.key]; } else if (total < 3) { next[attr.key] = 1; } setDraft({...draft, attrBonuses: next}); }}
                      className={cn("p-3 border text-center font-mono text-xs transition-colors", current ? "border-chart-2 bg-chart-2/10 text-chart-2" : "border-border text-muted-foreground hover:border-primary/40")}>
                      <div className="text-sm mb-0.5">{current ? "+1" : "—"}</div>
                      <div>{attr.abbr}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">Flex bonus:</span>
                {[0,1].map(v => (
                  <button key={v} type="button" onClick={() => setDraft({...draft, flexBonus: v})}
                    className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.flexBonus === v ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {v === 0 ? "None" : "+1 (any attr)"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {wizStep === 2 && (
            <div className="space-y-4">
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Starting Skills (comma-separated)</label>
                <input className="input-field" value={draft.startingSkills.join(", ")} onChange={e => setDraft({...draft, startingSkills: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} placeholder="e.g., Lore, Discernment" /></div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">Starting Burnout:</span>
                {[0,1].map(v => (
                  <button key={v} type="button" onClick={() => setDraft({...draft, startingBurnout: v})}
                    className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.startingBurnout === v ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {v === 0 ? "None" : "Level 1"}
                  </button>
                ))}
              </div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Benefit</label>
                <textarea className="input-field min-h-[60px] resize-none" value={draft.benefit} onChange={e => setDraft({...draft, benefit: e.target.value})} placeholder="Special mechanical benefit..." /></div>
              <div><label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Penalty (optional)</label>
                <textarea className="input-field min-h-[60px] resize-none" value={draft.penalty} onChange={e => setDraft({...draft, penalty: e.target.value})} placeholder="Drawback or complication..." /></div>
            </div>
          )}
          {wizStep === 3 && (
            <div className="space-y-3">
              <div className="p-3 border border-primary/20 bg-primary/5">
                <p className="font-mono text-foreground text-sm mb-1">{draft.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{draft.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {Object.entries(draft.attrBonuses).map(([k,v]) => (
                  <span key={k} className="text-chart-2">+{v} {ATTRIBUTE_DEFS.find(a=>a.key===k)?.abbr}</span>
                ))}
                {draft.flexBonus > 0 && <span className="text-primary">+{draft.flexBonus} (any)</span>}
              </div>
              {draft.startingSkills.length > 0 && <div className="flex flex-wrap gap-1">{draft.startingSkills.map(s => <span key={s} className="text-xs font-mono bg-muted px-2 py-0.5">{s}</span>)}</div>}
              {draft.benefit && <p className="text-xs font-mono border-l-2 border-primary/40 pl-3 text-foreground">{draft.benefit}</p>}
              {draft.penalty && <p className="text-xs font-mono border-l-2 border-destructive/30 pl-3 text-destructive/70">{draft.penalty}</p>}
            </div>
          )}
        </div>
        <div className="flex justify-between p-4 border-t border-border">
          <button onClick={() => wizStep > 0 ? setWizStep(s => s-1) : onClose()}
            className="px-4 py-2 text-xs font-mono border border-border text-muted-foreground hover:bg-muted transition-colors">
            {wizStep === 0 ? "Cancel" : "← Back"}
          </button>
          {wizStep < WIZ_STEPS.length - 1 ? (
            <button onClick={() => setWizStep(s => s+1)} disabled={!draft.name.trim()}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !draft.name.trim()}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
              {saving ? "Saving..." : "Save Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Homebrew List ─────────────────────────────────────────────────────────

function HomebrewList({ items, onTogglePublish, onDelete }: { items: any[]; onTogglePublish: (id: number) => void; onDelete: (id: number) => void }) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-border/30">
        <p className="text-muted-foreground/40 font-mono text-xs">No entries yet. Click the button above to create one.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 border border-border bg-card hover:border-border/80 transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", item.published ? "bg-chart-2" : "bg-muted-foreground/30")} />
            <div>
              <span className="font-mono text-sm text-foreground">{item.name}</span>
              {item.published && (
                <span className="ml-2 text-[10px] font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">PUBLISHED</span>
              )}
              {!item.published && (
                <span className="ml-2 text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-1.5 py-0.5">DRAFT</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onTogglePublish(item.id)}
              className={cn("flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono border transition-colors",
                item.published
                  ? "border-chart-2/40 text-chart-2 hover:bg-chart-2/10"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
              {item.published ? <><EyeOff className="w-3 h-3" /> Unpublish</> : <><Globe className="w-3 h-3" /> Publish</>}
            </button>
            <button onClick={() => onDelete(item.id)}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono border border-border text-destructive/50 hover:border-destructive/40 hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function Weavekeeper() {
  const { user } = useAuth();
  const { data: allCharacters = [], isLoading: charsLoading } = useListCharacters();
  const { allHomebrew, refetch } = useHomebrew();
  const [tension, setTension] = useState(0);
  const [campaignNotes, setCampaignNotes] = useState("");
  const [showDemoChar, setShowDemoChar] = useState(false);
  const [affinityWizard, setAffinityWizard] = useState(false);
  const [itemWizard, setItemWizard] = useState(false);
  const [bgWizard, setBgWizard] = useState(false);
  const [activeHBTab, setActiveHBTab] = useState("affinities");

  async function togglePublish(id: number) {
    await fetch(`/api/homebrew/${id}/publish`, { method: "POST", credentials: "include" });
    refetch();
  }

  async function deleteHomebrew(id: number) {
    if (!confirm("Delete this homebrew entry? This cannot be undone.")) return;
    await fetch(`/api/homebrew/${id}`, { method: "DELETE", credentials: "include" });
    refetch();
  }

  if (user?.role !== "weavekeeper") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center font-mono space-y-3">
          <ShieldHalf className="w-12 h-12 text-destructive/50 mx-auto" />
          <h1 className="text-2xl text-destructive font-[family-name:'Cinzel',serif]">Access Denied</h1>
          <p className="text-muted-foreground text-sm">Weavekeeper clearance required.</p>
        </div>
      </div>
    );
  }

  const hbAffinities = allHomebrew.filter(h => h.type === "affinity");
  const hbItems = allHomebrew.filter(h => h.type === "item");
  const hbBackgrounds = allHomebrew.filter(h => h.type === "background");

  return (
    <div className="min-h-screen bg-background">
      {affinityWizard && <AffinityWizard onClose={() => setAffinityWizard(false)} onSave={refetch} />}
      {itemWizard && <ItemWizard onClose={() => setItemWizard(false)} onSave={refetch} />}
      {bgWizard && <BackgroundWizard onClose={() => setBgWizard(false)} onSave={refetch} />}

      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <ShieldHalf className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-primary">Weavekeeper</h1>
            <p className="text-xs font-mono text-muted-foreground">Campaign control panel · {user.displayName}</p>
          </div>
        </div>

        <Tabs defaultValue="campaign">
          <TabsList className="mb-6 bg-card border border-border h-auto p-1 flex flex-wrap gap-0.5">
            <TabsTrigger value="campaign" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Swords className="w-3.5 h-3.5" /> Campaign
            </TabsTrigger>
            <TabsTrigger value="characters" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="w-3.5 h-3.5" /> Player Characters
            </TabsTrigger>
            <TabsTrigger value="homebrew" className="font-mono text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Hammer className="w-3.5 h-3.5" /> Homebrew
            </TabsTrigger>
          </TabsList>

          {/* ── CAMPAIGN ─────────────────────────────────────────── */}
          <TabsContent value="campaign">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div className="border border-border bg-card p-4">
                  <h3 className="font-mono text-xs text-muted-foreground mb-4 uppercase tracking-widest flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-primary" /> Environment Tension
                  </h3>
                  <div className="h-3 w-full bg-background border border-border overflow-hidden mb-3">
                    <div className="h-full transition-all duration-300 ease-out" style={{
                      width: `${Math.min(100, (tension / 20) * 100)}%`,
                      background: tension > 15 ? "hsl(var(--destructive))" : tension > 10 ? "hsl(28 65% 55%)" : "hsl(var(--chart-2))"
                    }} />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-3xl text-foreground">{tension}</span>
                    <span className="text-sm font-mono text-muted-foreground">/ 20</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {[-5,-1,+1,+5].map(d => (
                      <button key={d} onClick={() => setTension(t => Math.max(0, Math.min(20, t + d)))}
                        className="py-1.5 text-xs font-mono border border-border hover:bg-muted transition-colors">
                        {d > 0 ? "+" : ""}{d}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setTension(0)} className="w-full py-1.5 text-xs font-mono border border-border hover:bg-muted text-muted-foreground transition-colors">
                    RESET
                  </button>
                </div>

                <div className="border border-border bg-card p-4">
                  <h3 className="font-mono text-xs text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Scroll className="w-3.5 h-3.5 text-primary" /> Campaign Notes
                  </h3>
                  <textarea className="input-field min-h-[180px] resize-none text-xs" value={campaignNotes}
                    onChange={e => setCampaignNotes(e.target.value)} placeholder="Session notes, plot hooks, NPC details..." />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Demo Character — Meren Vail</h3>
                    <button onClick={() => setShowDemoChar(v => !v)}
                      className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors border border-border px-2.5 py-1">
                      {showDemoChar ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>}
                    </button>
                  </div>
                  {showDemoChar ? (
                    <div className="border border-border/50">
                      <CharacterSheetContent character={DEMO_CHARACTER} onUpdate={() => {}} />
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground/20 font-mono text-xs border border-dashed border-border/30">
                      Lv.7 · Water Anchor · Scaled Guard Wyrmlord
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── CHARACTERS ────────────────────────────────────────── */}
          <TabsContent value="characters">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-[family-name:'Cinzel',serif] text-lg text-foreground">All Player Characters</h2>
              <span className="text-xs font-mono text-muted-foreground">{allCharacters.length} total</span>
            </div>

            {charsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({length: 6}).map((_,i) => (
                  <div key={i} className="h-28 border border-border bg-card animate-pulse" />
                ))}
              </div>
            ) : allCharacters.length === 0 ? (
              <div className="py-16 text-center font-mono text-muted-foreground/50 text-sm border border-dashed border-border/30">
                No characters yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCharacters.map(char => {
                  const data = (char.data as any) || {};
                  return (
                    <div key={char.id} className="border border-border bg-card hover:border-primary/30 transition-all duration-200 group p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {data.avatarDataUrl ? (
                          <img src={data.avatarDataUrl} alt="" className="w-10 h-10 object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 border border-border/50 flex items-center justify-center text-muted-foreground/30 text-xs font-mono flex-shrink-0 bg-muted/20">
                            {char.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-[family-name:'Cinzel',serif] text-sm text-foreground truncate">{char.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            Lv.{char.level} · {char.affinity || "—"} · {char.mode || "—"}
                          </div>
                          {(data.guildRank || data.guild) && (
                            <div className="text-[10px] font-mono text-muted-foreground/60 truncate mt-0.5">
                              {data.guildRank ? `${data.guildRank}, ` : ""}{data.guild && data.guild !== "None (Independent)" ? data.guild.replace("The ", "") : "Independent"}
                            </div>
                          )}
                          {data.background && (
                            <div className="text-[10px] font-mono text-primary/50 truncate mt-0.5">{data.background}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/characters/${char.id}`} className="flex-1">
                          <button className="w-full py-1.5 text-[10px] font-mono border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </Link>
                        <Link href={`/characters/${char.id}/build`} className="flex-1">
                          <button className="w-full py-1.5 text-[10px] font-mono border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── HOMEBREW ─────────────────────────────────────────── */}
          <TabsContent value="homebrew">
            <div className="mb-5">
              <h2 className="font-[family-name:'Cinzel',serif] text-lg text-foreground mb-1">Homebrew Creation</h2>
              <p className="text-xs font-mono text-muted-foreground">Create custom content. Publish to make it available to players.</p>
            </div>

            <Tabs value={activeHBTab} onValueChange={setActiveHBTab}>
              <TabsList className="mb-4 bg-card/50 border border-border/50 h-auto p-0.5">
                <TabsTrigger value="affinities" className="font-mono text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  Affinities ({hbAffinities.length})
                </TabsTrigger>
                <TabsTrigger value="items" className="font-mono text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  Items ({hbItems.length})
                </TabsTrigger>
                <TabsTrigger value="backgrounds" className="font-mono text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  Backgrounds ({hbBackgrounds.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="affinities">
                <div className="mb-3 flex justify-end">
                  <button onClick={() => setAffinityWizard(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_12px_rgba(180,120,60,0.3)]">
                    <Plus className="w-3.5 h-3.5" /> New Affinity
                  </button>
                </div>
                <HomebrewList items={hbAffinities} onTogglePublish={togglePublish} onDelete={deleteHomebrew} />
              </TabsContent>

              <TabsContent value="items">
                <div className="mb-3 flex justify-end">
                  <button onClick={() => setItemWizard(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_12px_rgba(180,120,60,0.3)]">
                    <Plus className="w-3.5 h-3.5" /> New Item
                  </button>
                </div>
                <HomebrewList items={hbItems} onTogglePublish={togglePublish} onDelete={deleteHomebrew} />
              </TabsContent>

              <TabsContent value="backgrounds">
                <div className="mb-3 flex justify-end">
                  <button onClick={() => setBgWizard(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_12px_rgba(180,120,60,0.3)]">
                    <Plus className="w-3.5 h-3.5" /> New Background
                  </button>
                </div>
                <HomebrewList items={hbBackgrounds} onTogglePublish={togglePublish} onDelete={deleteHomebrew} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
