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
  ShieldHalf, Swords, Flame, Hammer, ChevronDown, ChevronRight, X,
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

const ALL_MODES = ["Striker", "Anchor", "Slider", "Binder", "Shearer", "Tensioner", "Imprinter", "Conductor"];
const ALL_SKILLS = [
  "Thread Reach","Surge","Weave Reading","Signature Suppression","Strand Awareness",
  "Ward Craft","Inscription","Anatomy of Magic","Combat Forms","Swift Hands",
  "Grit","Discernment","Lore","Guild Protocol","Street Sense","Survival","Presence","Trade Craft",
];

// ── Wizard Types ────────────────────────────────────────────────────────────

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

function WizardShell({ title, steps, step, onClose, canBack, onBack, canNext, onNext, saveLabel, onSave, saving, children }: {
  title: string; steps: string[]; step: number; onClose: () => void;
  canBack?: boolean; onBack: () => void;
  canNext?: boolean; onNext: () => void;
  saveLabel?: string; onSave: () => void; saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-[family-name:'Cinzel',serif] text-lg">{title}</h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {steps.map((s, i) => (
                <span key={s} className={cn(
                  "text-[10px] font-mono transition-colors",
                  i === step ? "text-primary" : i < step ? "text-muted-foreground" : "text-muted-foreground/30"
                )}>
                  {i < step ? "✓" : `${i+1}.`} {s}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">{children}</div>
        <div className="flex justify-between p-4 border-t border-border gap-2">
          <button
            onClick={() => step > 0 ? onBack() : onClose()}
            className="px-4 py-2 text-xs font-mono border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={onNext}
              disabled={!canNext}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={onSave}
              disabled={saving || !canNext}
              className="px-6 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
            >
              {saving ? "Saving..." : saveLabel || "Save Draft"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">{children}</label>;
}

// ── Affinity Wizard ─────────────────────────────────────────────────────────

function AffinityWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(0);
  const [activeStringIdx, setActiveStringIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "", description: "", category: "Common", innateCantrip: "",
    compatibleModes: [] as string[], snapbackType: "Elemental",
    strings: [defaultStringDraft()],
  });

  const STEPS = ["Basic Info", "Strings", "Power Levels", "Advanced", "Review"];
  const CATEGORIES = ["Common", "Uncommon", "Rare", "Unique (Homebrewed)"];
  const SNAPBACK_TYPES = ["Elemental", "Force", "Necrotic", "Psychic", "Fire", "Cold", "Lightning", "Acid", "Radiant"];

  function updateString(idx: number, patch: Partial<StringDraft>) {
    const next = [...draft.strings]; next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, strings: next });
  }
  function updateLevel(si: number, li: number, patch: Partial<{cost:number;dc:number;effect:string}>) {
    const next = [...draft.strings]; const levels = [...next[si].levels];
    levels[li] = { ...levels[li], ...patch }; next[si] = { ...next[si], levels };
    setDraft({ ...draft, strings: next });
  }
  function toggleMode(mode: string) {
    const modes = draft.compatibleModes;
    setDraft({ ...draft, compatibleModes: modes.includes(mode) ? modes.filter(m => m !== mode) : [...modes, mode] });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = {
        description: draft.description, category: draft.category,
        innateCantrip: draft.innateCantrip, compatibleModes: draft.compatibleModes,
        snapbackType: draft.snapbackType,
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
    <WizardShell
      title="New Affinity" steps={STEPS} step={step} onClose={onClose}
      onBack={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)}
      canNext={step === 0 ? !!draft.name.trim() : true}
      onSave={handleSave} saving={saving}
    >
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Affinity Name *</FieldLabel>
            <input className="input-field" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="e.g., Fire, Shadow, Storm, Glass..." />
          </div>
          <div>
            <FieldLabel>Rarity Category</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setDraft({...draft, category: c})}
                  className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.category === c ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Description — What element, concept, or force does this channel?</FieldLabel>
            <textarea className="input-field min-h-[80px] resize-none" value={draft.description} onChange={e => setDraft({...draft, description: e.target.value})} placeholder="Describe the affinity's nature, thematic feel, and where it comes from in the world..." />
          </div>
          <div>
            <FieldLabel>Innate Cantrip — Safe, zero-cost ability (no rolls, no Tension)</FieldLabel>
            <textarea className="input-field min-h-[60px] resize-none" value={draft.innateCantrip} onChange={e => setDraft({...draft, innateCantrip: e.target.value})} placeholder="e.g., Conjure a small flame in your palm at will, light a candle, or feel heat sources within 5ft..." />
          </div>
          <div>
            <FieldLabel>Strings — Define up to 13 strings for this affinity</FieldLabel>
            <div className="space-y-1.5">
              {draft.strings.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="flex-1 input-field text-sm" value={s.name} onChange={e => updateString(i, {name: e.target.value})} placeholder={`String ${i+1} full name (e.g., "The Flow String")...`} />
                  <input className="w-32 input-field text-sm" value={s.shortName} onChange={e => updateString(i, {shortName: e.target.value})} placeholder="Short name" />
                  {draft.strings.length > 1 && (
                    <button type="button" onClick={() => setDraft({...draft, strings: draft.strings.filter((_,j)=>j!==i)})} className="text-destructive/40 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {draft.strings.length < 13 && (
                <button type="button" onClick={() => setDraft({...draft, strings: [...draft.strings, defaultStringDraft()]})}
                  className="mt-1 text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Add String ({draft.strings.length}/13)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5">
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
                <FieldLabel>Flavor Quote</FieldLabel>
                <textarea className="input-field min-h-[50px] resize-none text-sm" value={activeStr.quote} onChange={e => updateString(activeStringIdx, {quote: e.target.value})} placeholder="A memorable quote in character voice..." />
              </div>
              <div>
                <FieldLabel>Flavor / Thematic Description</FieldLabel>
                <textarea className="input-field min-h-[70px] resize-none text-sm" value={activeStr.flavor} onChange={e => updateString(activeStringIdx, {flavor: e.target.value})} placeholder="What does this string do thematically? What does casting it feel like?" />
              </div>
              <div>
                <FieldLabel>Check Attribute — Which stat governs this string's rolls?</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {([["ths", "Thread Sense", "Sensing, timing, intuition"], ["ctr", "Control", "Precision, technique, safety"], ["pot", "Potency", "Raw force, brute power"]] as const).map(([attr, name, desc]) => (
                    <button key={attr} type="button" onClick={() => updateString(activeStringIdx, {checkAttr: attr as any})}
                      className={cn("p-2 text-xs font-mono border text-left transition-colors", activeStr.checkAttr === attr ? "border-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                      <div className={cn("font-bold uppercase mb-0.5", activeStr.checkAttr === attr ? "text-primary" : "")}>{attr}</div>
                      <div className="text-[10px] text-muted-foreground/70">{name}</div>
                      <div className="text-[9px] text-muted-foreground/50 mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Mishap Effect (failed roll, not nat 1)</FieldLabel>
                  <textarea className="input-field min-h-[70px] resize-none text-xs" value={activeStr.mishap} onChange={e => updateString(activeStringIdx, {mishap: e.target.value})} placeholder="Minor failure effect, embarrassing but survivable..." />
                </div>
                <div>
                  <FieldLabel>Snapback (nat 1 or Strain Check fail)</FieldLabel>
                  <textarea className="input-field min-h-[70px] resize-none text-xs" value={activeStr.snapback} onChange={e => updateString(activeStringIdx, {snapback: e.target.value})} placeholder="Catastrophic failure effect — costly and dramatic..." />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5">
            {draft.strings.map((s, i) => (
              <button key={i} type="button" onClick={() => setActiveStringIdx(i)}
                className={cn("px-3 py-1 text-xs font-mono border flex-shrink-0 transition-colors", i === activeStringIdx ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                {s.shortName || `String ${i+1}`}
              </button>
            ))}
          </div>
          <p className="text-xs font-mono text-muted-foreground">For each Power Level: set Tension cost, DC, and effect. Higher PLs = more dangerous.</p>
          {activeStr && (
            <div className="space-y-2">
              {activeStr.levels.map((lv, li) => (
                <div key={li} className={cn("p-3 border space-y-2 transition-colors", li > 2 ? "border-destructive/20" : "border-border/60")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-mono w-7 flex-shrink-0 font-bold", li > 2 ? "text-destructive/80" : "text-primary")}>PL{li+1}</span>
                    <div className="flex gap-3 items-end flex-1">
                      <div>
                        <div className="text-[9px] font-mono text-muted-foreground/60 mb-0.5">Tension cost</div>
                        <input type="number" min={1} max={20} className="w-14 input-field text-center text-xs py-1" value={lv.cost} onChange={e => updateLevel(activeStringIdx, li, {cost: parseInt(e.target.value)||1})} />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-muted-foreground/60 mb-0.5">DC</div>
                        <input type="number" min={5} max={30} className="w-14 input-field text-center text-xs py-1" value={lv.dc} onChange={e => updateLevel(activeStringIdx, li, {dc: parseInt(e.target.value)||10})} />
                      </div>
                      {li > 2 && <span className="text-[9px] font-mono text-destructive/60">⚠ High risk</span>}
                    </div>
                  </div>
                  <input className="input-field text-xs" value={lv.effect} onChange={e => updateLevel(activeStringIdx, li, {effect: e.target.value})} placeholder={`PL${li+1} effect — what happens? Describe damage, duration, area, conditions...`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Compatible Modes — which casting modes synergize best with this affinity?</FieldLabel>
            <div className="grid grid-cols-4 gap-1.5">
              {ALL_MODES.map(m => (
                <button key={m} type="button" onClick={() => toggleMode(m)}
                  className={cn("px-2 py-1.5 text-[10px] font-mono border text-center transition-colors", draft.compatibleModes.includes(m) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Snapback Damage Type — what kind of damage does overloading this affinity deal?</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {SNAPBACK_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setDraft({...draft, snapbackType: t})}
                  className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.snapbackType === t ? "border-destructive text-destructive bg-destructive/10" : "border-border text-muted-foreground hover:border-destructive/40")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 bg-background border border-border/40 text-xs font-mono text-muted-foreground space-y-1">
            <p className="text-foreground/70 mb-1">Common Affinity Conventions:</p>
            <p>• Common affinities have 5–8 strings (Fire, Water, Earth, Air)</p>
            <p>• Uncommon affinities have 3–5 strings (Glass, Sound, Gravity)</p>
            <p>• Rare/Unique affinities may have 2–4 strings with very high PLs</p>
            <p>• Starting strings for a new character: 2 (regardless of affinity tier)</p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="p-4 border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-[family-name:'Cinzel',serif] text-primary">{draft.name}</span>
              <span className="text-[10px] font-mono border border-primary/30 text-primary px-2 py-0.5">{draft.category}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-2">{draft.description}</p>
            {draft.innateCantrip && <p className="text-[10px] font-mono text-chart-2 border-l-2 border-chart-2/40 pl-2">Innate: {draft.innateCantrip}</p>}
            {draft.compatibleModes.length > 0 && <div className="flex gap-1 mt-2 flex-wrap">{draft.compatibleModes.map(m => <span key={m} className="text-[9px] font-mono border border-primary/20 text-primary/70 px-1.5 py-0.5">{m}</span>)}</div>}
          </div>
          {draft.strings.map((s, i) => (
            <div key={i} className="p-3 border border-border/60">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="font-mono text-sm text-foreground">{s.name || `String ${i+1}`}</span>
                <span className="text-[10px] font-mono text-primary uppercase">{s.checkAttr}</span>
              </div>
              {s.quote && <p className="text-[10px] italic text-primary/60 mb-1">{s.quote}</p>}
              {s.flavor && <p className="text-xs font-mono text-muted-foreground mb-2">{s.flavor}</p>}
              <div className="space-y-0.5">
                {s.levels.map(l => (
                  <div key={l.pl} className="text-[10px] font-mono text-muted-foreground/70">
                    <span className="text-primary/50">PL{l.pl}</span> {l.cost}tp DC{l.dc}: {l.effect || <span className="italic text-muted-foreground/40">(no effect)</span>}
                  </div>
                ))}
              </div>
              {(s.mishap || s.snapback) && (
                <div className="mt-1.5 pt-1.5 border-t border-border/20 grid grid-cols-2 gap-1 text-[9px] font-mono">
                  {s.mishap && <p><span className="text-yellow-600/60">Mishap: </span><span className="text-muted-foreground/60">{s.mishap}</span></p>}
                  {s.snapback && <p><span className="text-destructive/60">Snapback: </span><span className="text-muted-foreground/60">{s.snapback}</span></p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </WizardShell>
  );
}

// ── Item Wizard ─────────────────────────────────────────────────────────────

interface StatBonus { attr: string; bonus: number; }

function ItemWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "", category: "Magical", subCategory: "", rarity: "Common",
    desc: "", loreText: "",
    statBonuses: [] as StatBonus[],
    vpBonus: 0, charges: "Unlimited", chargesPer: "short rest",
    attunement: "None", slot: "Held",
    requirements: "", stringType: "",
    mechanical: "", cost: "",
  });

  const STEPS = ["Identity", "Stat Effects", "Mechanics", "Review"];
  const RARITIES = ["Common", "Uncommon", "Rare", "Exotic", "Legendary", "Artifact"];
  const CATEGORIES = ["Magical", "Weapon", "Armor", "Consumable", "Tool", "Jewelry", "Artifact", "Kit", "Focus"];
  const SLOTS = ["Held", "Two-Handed", "Armor", "Ring", "Neck", "Belt", "Head", "Cape", "Pack", "Implanted"];
  const ATTUNEMENTS = ["None", "Required", "Optional"];
  const CHARGES_OPTS = ["Unlimited", "1", "2", "3", "5", "10"];
  const REST_OPTS = ["short rest", "long rest", "dawn", "week", "permanent"];

  function addStatBonus() {
    if (draft.statBonuses.length < 6) setDraft({...draft, statBonuses: [...draft.statBonuses, { attr: "pot", bonus: 1 }]});
  }
  function updateBonus(i: number, patch: Partial<StatBonus>) {
    const next = [...draft.statBonuses]; next[i] = {...next[i], ...patch};
    setDraft({...draft, statBonuses: next});
  }
  function removeBonus(i: number) {
    setDraft({...draft, statBonuses: draft.statBonuses.filter((_,j) => j !== i)});
  }

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
    <WizardShell
      title="New Item" steps={STEPS} step={step} onClose={onClose}
      onBack={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)}
      canNext={step === 0 ? !!draft.name.trim() : true}
      onSave={handleSave} saving={saving}
    >
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Item Name *</FieldLabel>
            <input className="input-field" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="e.g., Deepwater Compass, Ember Gauntlet..." />
          </div>
          <div>
            <FieldLabel>Rarity</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {RARITIES.map(r => (
                <button key={r} type="button" onClick={() => setDraft({...draft, rarity: r})}
                  className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.rarity === r ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setDraft({...draft, category: c})}
                  className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.category === c ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Slot</FieldLabel>
              <select className="input-field" value={draft.slot} onChange={e => setDraft({...draft, slot: e.target.value})}>
                {SLOTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Sub-category</FieldLabel>
              <input className="input-field" value={draft.subCategory} onChange={e => setDraft({...draft, subCategory: e.target.value})} placeholder="e.g., Shortsword, Scroll..." />
            </div>
          </div>
          <div>
            <FieldLabel>Physical Description / Lore</FieldLabel>
            <textarea className="input-field min-h-[70px] resize-none" value={draft.desc} onChange={e => setDraft({...draft, desc: e.target.value})} placeholder="What does it look like? Who made it? Where does it come from?" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Attribute Bonuses (passive, always active when equipped)</FieldLabel>
              {draft.statBonuses.length < 6 && (
                <button type="button" onClick={addStatBonus} className="text-xs font-mono text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Add bonus
                </button>
              )}
            </div>
            {draft.statBonuses.length === 0 ? (
              <div className="py-4 text-center font-mono text-xs text-muted-foreground/40 border border-dashed border-border/30">
                No stat bonuses. Click "Add bonus" above.
              </div>
            ) : (
              <div className="space-y-2">
                {draft.statBonuses.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select className="input-field text-xs flex-1" value={b.attr} onChange={e => updateBonus(i, {attr: e.target.value})}>
                      {ATTRIBUTE_DEFS.map(a => <option key={a.key} value={a.key}>{a.abbr} — {a.name}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateBonus(i, {bonus: Math.max(-5, b.bonus - 1)})} className="w-6 h-6 flex items-center justify-center border border-border text-muted-foreground hover:bg-muted text-xs">−</button>
                      <span className={cn("w-8 text-center font-mono text-sm", b.bonus >= 0 ? "text-chart-2" : "text-destructive")}>{b.bonus >= 0 ? `+${b.bonus}` : b.bonus}</span>
                      <button type="button" onClick={() => updateBonus(i, {bonus: Math.min(10, b.bonus + 1)})} className="w-6 h-6 flex items-center justify-center border border-border text-muted-foreground hover:bg-muted text-xs">+</button>
                    </div>
                    <button type="button" onClick={() => removeBonus(i)} className="text-destructive/40 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Max VP Bonus</FieldLabel>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDraft({...draft, vpBonus: Math.max(0, draft.vpBonus - 1)})} className="w-7 h-7 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">−</button>
                <span className="w-10 text-center font-mono text-sm text-foreground">{draft.vpBonus > 0 ? `+${draft.vpBonus}` : "0"}</span>
                <button type="button" onClick={() => setDraft({...draft, vpBonus: Math.min(50, draft.vpBonus + 1)})} className="w-7 h-7 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">+</button>
                <span className="text-xs font-mono text-muted-foreground">to max VP</span>
              </div>
            </div>
            <div>
              <FieldLabel>Attunement</FieldLabel>
              <div className="flex gap-1">
                {ATTUNEMENTS.map(a => (
                  <button key={a} type="button" onClick={() => setDraft({...draft, attunement: a})}
                    className={cn("flex-1 py-1.5 text-xs font-mono border transition-colors", draft.attunement === a ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{a}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>Requirements (optional) — minimum attribute or level</FieldLabel>
            <input className="input-field text-xs" value={draft.requirements} onChange={e => setDraft({...draft, requirements: e.target.value})} placeholder="e.g., POT 14+, Level 5+, Water Affinity..." />
          </div>
          <div>
            <FieldLabel>String Synergy (optional) — which string types does this item enhance?</FieldLabel>
            <input className="input-field text-xs" value={draft.stringType} onChange={e => setDraft({...draft, stringType: e.target.value})} placeholder="e.g., Water strings, Vital String, any THS-check strings..." />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Mechanical Effect — active abilities, on-use powers, conditions</FieldLabel>
            <textarea className="input-field min-h-[100px] resize-none" value={draft.mechanical} onChange={e => setDraft({...draft, mechanical: e.target.value})} placeholder="What does it do when you use it? Include range, duration, targets, damage, saves..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Charges (if applicable)</FieldLabel>
              <div className="flex gap-1 flex-wrap">
                {CHARGES_OPTS.map(c => (
                  <button key={c} type="button" onClick={() => setDraft({...draft, charges: c})}
                    className={cn("px-2.5 py-1 text-xs font-mono border transition-colors", draft.charges === c ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{c}</button>
                ))}
              </div>
            </div>
            {draft.charges !== "Unlimited" && (
              <div>
                <FieldLabel>Recharges per</FieldLabel>
                <div className="flex gap-1 flex-wrap">
                  {REST_OPTS.map(r => (
                    <button key={r} type="button" onClick={() => setDraft({...draft, chargesPer: r})}
                      className={cn("px-2 py-1 text-[10px] font-mono border transition-colors", draft.chargesPer === r ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{r}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <FieldLabel>Cost / Market Availability</FieldLabel>
            <input className="input-field" value={draft.cost} onChange={e => setDraft({...draft, cost: e.target.value})} placeholder="e.g., 200 Gold, Guild vendor only, quest reward..." />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="p-4 border border-primary/20 bg-primary/5">
            <div className="flex items-start justify-between mb-2">
              <span className="font-[family-name:'Cinzel',serif] text-foreground">{draft.name}</span>
              <div className="text-right">
                <span className="text-[10px] font-mono text-primary">{draft.rarity}</span>
                <span className="text-[10px] font-mono text-muted-foreground"> · {draft.category}</span>
              </div>
            </div>
            <div className="flex gap-2 mb-2 text-[10px] font-mono">
              <span className="border border-border/40 px-1.5 py-0.5 text-muted-foreground">{draft.slot}</span>
              {draft.subCategory && <span className="border border-border/40 px-1.5 py-0.5 text-muted-foreground">{draft.subCategory}</span>}
              {draft.attunement !== "None" && <span className="border border-primary/30 text-primary px-1.5 py-0.5">Attunement {draft.attunement}</span>}
            </div>
            {draft.desc && <p className="text-xs font-mono text-muted-foreground mb-2 italic">{draft.desc}</p>}
            {draft.statBonuses.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {draft.statBonuses.map((b, i) => <span key={i} className="text-xs font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">{b.bonus >= 0 ? "+" : ""}{b.bonus} {ATTRIBUTE_DEFS.find(a=>a.key===b.attr)?.abbr}</span>)}
                {draft.vpBonus > 0 && <span className="text-xs font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">+{draft.vpBonus} Max VP</span>}
              </div>
            )}
            {draft.requirements && <p className="text-[10px] font-mono text-destructive/70">Requires: {draft.requirements}</p>}
            {draft.stringType && <p className="text-[10px] font-mono text-chart-4/70 mt-0.5">Synergy: {draft.stringType}</p>}
          </div>
          {draft.mechanical && (
            <div className="p-3 border border-border/60">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1">Effect</p>
              <p className="text-xs font-mono text-foreground">{draft.mechanical}</p>
              {draft.charges !== "Unlimited" && <p className="text-[10px] font-mono text-primary/60 mt-1">{draft.charges} charge{draft.charges !== "1" ? "s" : ""} / {draft.chargesPer}</p>}
            </div>
          )}
          {draft.cost && <p className="text-xs font-mono text-muted-foreground">Market: {draft.cost}</p>}
        </div>
      )}
    </WizardShell>
  );
}

// ── Background Wizard ───────────────────────────────────────────────────────

function BackgroundWizard({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "", desc: "", socialStanding: "Common",
    attrBonuses: {} as Record<string, number>, flexBonus: 0,
    startingSkills: [] as string[],
    startingBurnout: 0,
    startingTechnique: "",
    startingGear: "",
    loreTrait: "",
    benefit: "", penalty: "",
  });

  const STEPS = ["Identity", "Attributes", "Skills & Extras", "Lore", "Review"];
  const SOCIAL = ["Outcast", "Common", "Minor Guild", "Major Guild", "Noble Lineage"];

  function toggleSkill(s: string) {
    setDraft(d => ({
      ...d,
      startingSkills: d.startingSkills.includes(s)
        ? d.startingSkills.filter(x => x !== s)
        : d.startingSkills.length < 4 ? [...d.startingSkills, s] : d.startingSkills
    }));
  }

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
    <WizardShell
      title="New Background" steps={STEPS} step={step} onClose={onClose}
      onBack={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)}
      canNext={step === 0 ? !!draft.name.trim() : true}
      onSave={handleSave} saving={saving}
    >
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Background Name *</FieldLabel>
            <input className="input-field" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="e.g., Street Urchin, Guild Scholar, Temple Initiate..." />
          </div>
          <div>
            <FieldLabel>Social Standing — where this background sits in Aethros society</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {SOCIAL.map(s => (
                <button key={s} type="button" onClick={() => setDraft({...draft, socialStanding: s})}
                  className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.socialStanding === s ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Description — who comes from this background?</FieldLabel>
            <textarea className="input-field min-h-[90px] resize-none" value={draft.desc} onChange={e => setDraft({...draft, desc: e.target.value})} placeholder="What life did they live? What shaped them? What do they know that others don't?" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Attribute Bonuses — choose up to 3 (+1 each)</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {ATTRIBUTE_DEFS.map(attr => {
                const current = draft.attrBonuses[attr.key] ?? 0;
                const total = Object.values(draft.attrBonuses).reduce((a,b)=>a+b,0);
                return (
                  <button key={attr.key} type="button"
                    onClick={() => {
                      const next = {...draft.attrBonuses};
                      if (current) { delete next[attr.key]; }
                      else if (total < 3) { next[attr.key] = 1; }
                      setDraft({...draft, attrBonuses: next});
                    }}
                    className={cn("p-3 border text-center font-mono text-xs transition-colors", current ? "border-chart-2 bg-chart-2/10 text-chart-2" : "border-border text-muted-foreground hover:border-primary/40")}>
                    <div className="text-base font-bold mb-0.5">{current ? "+1" : "—"}</div>
                    <div className="text-[10px] opacity-70">{attr.abbr}</div>
                    <div className="text-[9px] opacity-50 truncate">{attr.name}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs font-mono text-muted-foreground">Flex bonus:</span>
              {[0,1].map(v => (
                <button key={v} type="button" onClick={() => setDraft({...draft, flexBonus: v})}
                  className={cn("px-3 py-1.5 text-xs font-mono border transition-colors", draft.flexBonus === v ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {v === 0 ? "None" : "+1 any attribute (player's choice)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Starting Attuned Skills — pick up to 4 (player gets these for free at character creation)</FieldLabel>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {ALL_SKILLS.map(s => {
                const selected = draft.startingSkills.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleSkill(s)}
                    className={cn("px-2.5 py-1.5 text-[10px] font-mono border text-left transition-colors", selected ? "border-chart-2 text-chart-2 bg-chart-2/10" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {selected && "✓ "}{s}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">{draft.startingSkills.length}/4 selected</p>
          </div>
          <div>
            <FieldLabel>Starting Burnout Level — some harsh backgrounds begin with Burnout</FieldLabel>
            <div className="flex gap-1.5">
              {[0,1,2,3].map(v => (
                <button key={v} type="button" onClick={() => setDraft({...draft, startingBurnout: v})}
                  className={cn("flex-1 py-2 text-xs font-mono border text-center transition-colors",
                    draft.startingBurnout === v
                      ? v === 0 ? "border-chart-2 text-chart-2 bg-chart-2/10" : "border-destructive text-destructive bg-destructive/10"
                      : "border-border text-muted-foreground hover:border-primary/40")}>
                  {v === 0 ? "None" : `Level ${v}`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Starting Technique — unique combat/magic technique known from background</FieldLabel>
            <input className="input-field" value={draft.startingTechnique} onChange={e => setDraft({...draft, startingTechnique: e.target.value})} placeholder="e.g., Ironwall Stance, Pressure Release, Vault Step..." />
          </div>
          <div>
            <FieldLabel>Starting Gear — equipment they start with beyond standard issue</FieldLabel>
            <textarea className="input-field min-h-[60px] resize-none" value={draft.startingGear} onChange={e => setDraft({...draft, startingGear: e.target.value})} placeholder="e.g., Worn guild pendant (+1 social checks), 50ft rope, poison kit..." />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <FieldLabel>Lore Trait — a unique role-playing or world-knowledge benefit</FieldLabel>
            <textarea className="input-field min-h-[70px] resize-none" value={draft.loreTrait} onChange={e => setDraft({...draft, loreTrait: e.target.value})} placeholder="e.g., Knows the location of 1d4 black-market contacts in any major city. Advantage on checks related to criminal organizations." />
          </div>
          <div>
            <FieldLabel>Mechanical Benefit — in-game advantage or rule exception</FieldLabel>
            <textarea className="input-field min-h-[70px] resize-none" value={draft.benefit} onChange={e => setDraft({...draft, benefit: e.target.value})} placeholder="e.g., May spend TP as if it were gold (2 TP = 1 GP) when bribing city officials..." />
          </div>
          <div>
            <FieldLabel>Penalty / Complication (optional) — drawback for balance</FieldLabel>
            <textarea className="input-field min-h-[60px] resize-none" value={draft.penalty} onChange={e => setDraft({...draft, penalty: e.target.value})} placeholder="e.g., Guild contacts view you with suspicion. Disadvantage on PRE checks with law enforcement..." />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="p-4 border border-primary/20 bg-primary/5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-[family-name:'Cinzel',serif] text-foreground">{draft.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground border border-border/40 px-1.5 py-0.5">{draft.socialStanding}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-3">{draft.desc}</p>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {Object.entries(draft.attrBonuses).map(([k,v]) => (
                <span key={k} className="text-chart-2">+{v} {ATTRIBUTE_DEFS.find(a=>a.key===k)?.abbr}</span>
              ))}
              {draft.flexBonus > 0 && <span className="text-primary">+{draft.flexBonus} any</span>}
              {draft.startingBurnout > 0 && <span className="text-destructive">Burnout L{draft.startingBurnout}</span>}
            </div>
          </div>
          {draft.startingSkills.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1.5">Attuned Skills</p>
              <div className="flex flex-wrap gap-1">{draft.startingSkills.map(s => <span key={s} className="text-xs font-mono bg-chart-2/10 border border-chart-2/30 text-chart-2 px-2 py-0.5">{s}</span>)}</div>
            </div>
          )}
          {draft.startingTechnique && <div className="p-2 border border-border/50"><p className="text-[10px] font-mono text-muted-foreground mb-0.5">Technique</p><p className="text-xs font-mono text-foreground">{draft.startingTechnique}</p></div>}
          {draft.startingGear && <div className="p-2 border border-border/50"><p className="text-[10px] font-mono text-muted-foreground mb-0.5">Starting Gear</p><p className="text-xs font-mono text-foreground">{draft.startingGear}</p></div>}
          {draft.loreTrait && <p className="text-xs font-mono border-l-2 border-chart-4/40 pl-3 text-foreground/80">{draft.loreTrait}</p>}
          {draft.benefit && <p className="text-xs font-mono border-l-2 border-primary/40 pl-3 text-foreground">{draft.benefit}</p>}
          {draft.penalty && <p className="text-xs font-mono border-l-2 border-destructive/30 pl-3 text-destructive/70">{draft.penalty}</p>}
        </div>
      )}
    </WizardShell>
  );
}

// ── Homebrew List ───────────────────────────────────────────────────────────

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
              {item.published
                ? <span className="ml-2 text-[10px] font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">PUBLISHED</span>
                : <span className="ml-2 text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-1.5 py-0.5">DRAFT</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onTogglePublish(item.id)}
              className={cn("flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono border transition-colors",
                item.published ? "border-chart-2/40 text-chart-2 hover:bg-chart-2/10" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
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

// ── Main Component ──────────────────────────────────────────────────────────

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
                {Array.from({length: 6}).map((_,i) => <div key={i} className="h-28 border border-border bg-card animate-pulse" />)}
              </div>
            ) : allCharacters.length === 0 ? (
              <div className="py-16 text-center font-mono text-muted-foreground/50 text-sm border border-dashed border-border/30">No characters yet.</div>
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
                          <div className="text-[10px] font-mono text-muted-foreground">Lv.{char.level} · {char.affinity || "—"} · {char.mode || "—"}</div>
                          {(data.guildRank || data.guild) && (
                            <div className="text-[10px] font-mono text-muted-foreground/60 truncate mt-0.5">
                              {data.guildRank ? `${data.guildRank}, ` : ""}{data.guild && data.guild !== "None (Independent)" ? data.guild.replace("The ", "") : "Independent"}
                            </div>
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
                  <button onClick={() => setAffinityWizard(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_12px_rgba(180,120,60,0.3)]">
                    <Plus className="w-3.5 h-3.5" /> New Affinity
                  </button>
                </div>
                <HomebrewList items={hbAffinities} onTogglePublish={togglePublish} onDelete={deleteHomebrew} />
              </TabsContent>
              <TabsContent value="items">
                <div className="mb-3 flex justify-end">
                  <button onClick={() => setItemWizard(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_12px_rgba(180,120,60,0.3)]">
                    <Plus className="w-3.5 h-3.5" /> New Item
                  </button>
                </div>
                <HomebrewList items={hbItems} onTogglePublish={togglePublish} onDelete={deleteHomebrew} />
              </TabsContent>
              <TabsContent value="backgrounds">
                <div className="mb-3 flex justify-end">
                  <button onClick={() => setBgWizard(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-[0_0_12px_rgba(180,120,60,0.3)]">
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
