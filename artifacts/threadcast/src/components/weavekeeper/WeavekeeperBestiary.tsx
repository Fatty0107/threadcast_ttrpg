import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, ChevronDown, Copy, Dices, Plus, RefreshCw, Search, Shield, Skull, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { useDiceRoller } from "@/components/shared/dice-roller-context";
import { cn } from "@/lib/utils";

type Kind = "NPC" | "Monster" | "Creature" | "Construct" | "Boss";
type Attrs = { pot: number; ctr: number; res: number; acu: number; pre: number; ths: number };
type Damage = { diceSides: 4 | 6 | 8 | 10 | 12; diceCount: 1 | 2; bonusDiceSides?: 4 | 6 | 8 | 10 | 12; bonusDiceCount?: 1; modifier: number };
type Action = { name: string; detail: string; attackModifier?: number; targetDefense?: "GR" | "WR"; damage?: Damage; checkModifier?: number; dc?: number; tensionCost?: number };
type Sheet = {
  section: string; role: string; refinementBonus: number; attributes: Attrs; affinityModes: string;
  skills: { name: string; modifier: number }[]; actions: Action[]; abilities: { name: string; detail: string }[];
  tactics: string; gmNotes: string[]; vitality: { current: number; max: number };
  tension: { current: number; pool: number; safeLimit: number }; guardRating: number; wardRating: number;
  burnout: number; conditions: string[];
};
type Entry = { id: number; slug: string; name: string; kind: Kind; level: number; sheet: Sheet; isSeed: boolean; version: number };
type SkillDraft = { name: string; modifier: string };
type ActionDraft = { name: string; detail: string; attackModifier: string; targetDefense: "" | "GR" | "WR"; diceSides: string; diceCount: string; bonusDiceSides: string; damageModifier: string; dc: string; tensionCost: string };
type AbilityDraft = { name: string; detail: string };
type CreateDraft = { name: string; kind: Kind; level: string; refinementBonus: string; attributes: Attrs; role: string; affinityModes: string; tactics: string; gmNotes: string; skills: SkillDraft[]; actions: ActionDraft[]; abilities: AbilityDraft[] };

const API = "/api/weavekeeper/bestiary";
const ATTRS: [keyof Attrs, string][] = [["pot","POT"],["ctr","CTR"],["res","RES"],["acu","ACU"],["pre","PRE"],["ths","THS"]];
const mod = (score: number) => Math.floor((score - 10) / 2);
const signed = (value: number) => value > 0 ? `+${value}` : String(value);
const emptyDraft = (): CreateDraft => ({ name:"", kind:"NPC", level:"1", refinementBonus:"2", attributes:{pot:10,ctr:10,res:10,acu:10,pre:10,ths:10}, role:"", affinityModes:"", tactics:"", gmNotes:"", skills:[], actions:[], abilities:[] });
const fromEntry = (entry: Entry): CreateDraft => ({
  name: `${entry.name} (copy)`, kind: entry.kind, level: String(entry.level), refinementBonus: String(entry.sheet.refinementBonus),
  attributes: { ...entry.sheet.attributes }, role: entry.sheet.role, affinityModes: entry.sheet.affinityModes, tactics: entry.sheet.tactics,
  gmNotes: entry.sheet.gmNotes.join("\n"), skills: entry.sheet.skills.map(item => ({ name:item.name, modifier:String(item.modifier) })),
  actions: entry.sheet.actions.map(item => ({ name:item.name, detail:item.detail, attackModifier:item.attackModifier === undefined ? "" : String(item.attackModifier), targetDefense:item.targetDefense ?? "", diceSides:item.damage ? String(item.damage.diceSides) : "", diceCount:item.damage ? String(item.damage.diceCount) : "", bonusDiceSides:item.damage?.bonusDiceSides ? String(item.damage.bonusDiceSides) : "", damageModifier:item.damage ? String(item.damage.modifier) : "0", dc:item.dc === undefined ? "" : String(item.dc), tensionCost:item.tensionCost === undefined ? "" : String(item.tensionCost) })),
  abilities: entry.sheet.abilities.map(item => ({...item})),
});

function KindPill({ kind }: { kind: Kind }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary"><Skull className="h-3 w-3" />{kind}</span>;
}

function NumberAdjuster({ label, value, max, onChange, disabled }: { label: string; value: number; max: number; onChange: (value: number) => void; disabled: boolean }) {
  return <div className="rounded-xl border border-border/70 bg-background/55 p-3">
    <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-[.15em] text-muted-foreground"><span>{label}</span><span>{value}<span className="opacity-50"> / {max}</span></span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{width:`${max ? Math.max(0,Math.min(100,value/max*100)) : 0}%`}} /></div>
    <div className="mt-2 flex items-center justify-between gap-2">
      <div className="flex gap-1.5"><button disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0,value-1))} aria-label={`Decrease ${label}`} className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-primary/50 disabled:opacity-30">−</button><button disabled={disabled || value >= max} onClick={() => onChange(Math.min(max,value+1))} aria-label={`Increase ${label}`} className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-primary/50 disabled:opacity-30">+</button></div>
      <button disabled={disabled || value === max} onClick={() => onChange(max)} className="text-[10px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-primary disabled:opacity-30">Restore</button>
    </div>
  </div>;
}

export default function WeavekeeperBestiary() {
  const { user } = useAuth();
  const { openRoll } = useDiceRoller();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CreateDraft>(emptyDraft);
  const [conditionDraft, setConditionDraft] = useState("");
  const selected = entries.find(entry => entry.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (user?.role !== "weavekeeper") return;
    setLoading(true); setError("");
    try {
      const response = await fetch(API, { credentials:"include" });
      if (!response.ok) throw new Error(response.status === 403 ? "Weavekeeper access required." : "The bestiary could not be loaded.");
      const next = await response.json() as Entry[];
      setEntries(next);
      setSelectedId(current => current && next.some(entry => entry.id === current) ? current : next[0]?.id ?? null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The bestiary could not be loaded."); }
    finally { setLoading(false); }
  }, [user?.role]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { void load(); };
    window.addEventListener("weavekeeper-bestiary-updated", refresh);
    return () => window.removeEventListener("weavekeeper-bestiary-updated", refresh);
  }, [load]);

  const visible = useMemo(() => entries.filter(entry => {
    const matchKind = kindFilter === "All" || entry.kind === kindFilter;
    const haystack = `${entry.name} ${entry.sheet.role} ${entry.sheet.section} ${entry.sheet.affinityModes}`.toLowerCase();
    return matchKind && haystack.includes(query.trim().toLowerCase());
  }), [entries, kindFilter, query]);

  async function patchSelected(patch: Record<string, unknown>) {
    if (!selected || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API}/${selected.id}`, { method:"PATCH", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ expectedVersion:selected.version, ...patch }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "The sheet could not be saved.");
      const updated = body as Entry;
      setEntries(current => current.map(entry => entry.id === updated.id ? updated : entry));
      setSelectedId(updated.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The sheet could not be saved."); }
    finally { setSaving(false); }
  }

  async function createSheet(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !draft.name.trim() || !draft.role.trim()) return;
    setSaving(true); setError("");
    const actions = draft.actions.filter(item => item.name.trim()).map(item => ({
      name:item.name.trim(), detail:item.detail.trim() || "Custom action",
      ...(item.attackModifier.trim() ? {attackModifier:Number(item.attackModifier)} : {}),
      ...(item.targetDefense ? {targetDefense:item.targetDefense} : {}),
      ...(item.diceSides ? {damage:{diceSides:Number(item.diceSides),diceCount:Number(item.diceCount || 1),modifier:Number(item.damageModifier || 0),...(item.bonusDiceSides?{bonusDiceSides:Number(item.bonusDiceSides),bonusDiceCount:1}: {})}} : {}),
      ...(item.dc ? {dc:Number(item.dc)} : {}), ...(item.tensionCost ? {tensionCost:Number(item.tensionCost)} : {}),
    }));
    const sheet = {
      kind:draft.kind, level:Number(draft.level), role:draft.role.trim(), refinementBonus:Number(draft.refinementBonus), attributes:draft.attributes,
      affinityModes:draft.affinityModes.trim() || "None specified", tactics:draft.tactics.trim() || "No tactics recorded.",
      skills:draft.skills.filter(item => item.name.trim()).map(item => ({name:item.name.trim(),modifier:Number(item.modifier || 0)})),
      actions, abilities:draft.abilities.filter(item => item.name.trim()).map(item => ({name:item.name.trim(),detail:item.detail.trim() || "No description."})),
      gmNotes:draft.gmNotes.split("\n").map(item => item.trim()).filter(Boolean),
    };
    try {
      const response = await fetch(API, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:draft.name.trim(),kind:draft.kind,level:Number(draft.level),sheet}) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "The new sheet could not be saved.");
      const created = body as Entry;
      setEntries(current => [...current,created]); setSelectedId(created.id); setCreating(false); setDraft(emptyDraft());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The new sheet could not be saved."); }
    finally { setSaving(false); }
  }

  async function deleteCustom(entry: Entry) {
    if (entry.isSeed || !confirm(`Delete ${entry.name}?`)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API}/${entry.id}`, {method:"DELETE",credentials:"include"});
      if (!response.ok) throw new Error("The custom sheet could not be deleted.");
      setEntries(current => current.filter(item => item.id !== entry.id)); setSelectedId(current => current === entry.id ? null : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The custom sheet could not be deleted."); }
    finally { setSaving(false); }
  }

  function rollCheck(title: string, modifier: number, tensionCost = 0) {
    if (!selected) return;
    openRoll(title, modifier, selected.name, undefined, undefined, selected.id, tensionCost);
  }
  function rollDamage(title: string, damage: Damage, tensionCost = 0) {
    if (!selected) return;
    openRoll(title, damage.modifier, selected.name, undefined, damage, selected.id, tensionCost);
  }

  if (user?.role !== "weavekeeper") return <div className="rounded-xl border border-destructive/30 p-6 text-sm text-destructive">Weavekeeper clearance required.</div>;

  return <section className="space-y-5" aria-label="Private Weavekeeper bestiary">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-1 font-mono text-[10px] uppercase tracking-[.2em] text-primary">Private field folio</div><h2 className="font-[family-name:'Cinzel',serif] text-2xl text-foreground">Bestiary &amp; cast</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ready-to-play Rank F sheets, plus your own NPCs. Checks and damage use the shared dice roller and Discord roll channel.</p></div>
      <button onClick={() => { setDraft(emptyDraft()); setCreating(true); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-mono text-primary-foreground shadow-md shadow-primary/10 transition hover:brightness-110"><Plus className="h-4 w-4"/>Create sheet</button>
    </div>

    {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss" className="rounded p-1 hover:bg-destructive/10"><X className="h-4 w-4"/></button></div>}

    {loading ? <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><div className="h-96 animate-pulse rounded-2xl border border-border bg-card"/><div className="h-96 animate-pulse rounded-2xl border border-border bg-card"/></div> : entries.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Your private field folio is empty. Create your first sheet to begin.</div> : <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-border/70 bg-card/70 p-3 shadow-lg shadow-black/5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3"><Search className="h-4 w-4 text-muted-foreground"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a name or faction" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" aria-label="Search bestiary"/></div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{["All","NPC","Monster","Creature","Construct","Boss"].map(kind => <button key={kind} onClick={() => setKindFilter(kind)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-mono transition",kindFilter===kind?"border-primary/50 bg-primary/10 text-primary":"border-border text-muted-foreground hover:border-primary/30")}>{kind}</button>)}</div>
        <div className="mt-2 max-h-[68vh] space-y-1 overflow-y-auto pr-1">{visible.map(entry => <button key={entry.id} onClick={() => setSelectedId(entry.id)} className={cn("w-full rounded-xl border p-3 text-left transition", selectedId===entry.id?"border-primary/40 bg-primary/[.07] shadow-sm":"border-transparent hover:border-border hover:bg-background/60")}>
          <div className="flex items-start justify-between gap-2"><span className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{entry.name}</span><span className="shrink-0 font-mono text-[10px] text-primary">Lv {entry.level}</span></div><div className="mt-1 truncate text-xs text-muted-foreground">{entry.sheet.role}</div><div className="mt-2 flex items-center justify-between"><KindPill kind={entry.kind}/><span className="font-mono text-[10px] text-muted-foreground">{entry.sheet.vitality.current}/{entry.sheet.vitality.max} VP</span></div>
        </button>)}{visible.length===0&&<div className="p-6 text-center text-xs text-muted-foreground">No matching sheets.</div>}</div>
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] font-mono text-muted-foreground"><span>{entries.length} private sheets</span><button onClick={() => void load()} className="inline-flex items-center gap-1 hover:text-primary"><RefreshCw className="h-3 w-3"/>Refresh</button></div>
      </aside>

      {selected ? <article className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-xl shadow-black/10">
        <header className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-primary/10 via-background/30 to-transparent p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"/>
          <div className="relative flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><KindPill kind={selected.kind}/><span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-mono text-muted-foreground">{selected.sheet.section}</span>{!selected.isSeed&&<span className="rounded-full border border-chart-2/30 bg-chart-2/10 px-2.5 py-1 text-[10px] font-mono text-chart-2">Custom</span>}</div><h3 className="font-[family-name:'Cinzel',serif] text-3xl leading-tight text-foreground sm:text-4xl">{selected.name}</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{selected.sheet.role}</p></div><div className="flex gap-2"><button onClick={() => {setDraft(fromEntry(selected));setCreating(true);}} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"><Copy className="h-3.5 w-3.5"/>Make a copy</button>{!selected.isSeed&&<button onClick={() => void deleteCustom(selected)} disabled={saving} aria-label="Delete custom sheet" className="rounded-lg border border-destructive/30 p-2 text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"><Trash2 className="h-4 w-4"/></button>}</div></div>
          <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><NumberAdjuster label="Vitality" value={selected.sheet.vitality.current} max={selected.sheet.vitality.max} disabled={saving} onChange={current => void patchSelected({vitality:{...selected.sheet.vitality,current}})}/><NumberAdjuster label="Tension" value={selected.sheet.tension.current} max={selected.sheet.tension.pool} disabled={saving} onChange={current => void patchSelected({tension:{...selected.sheet.tension,current}})}/><div className="rounded-xl border border-border/70 bg-background/55 p-3"><div className="text-[10px] font-mono uppercase tracking-[.15em] text-muted-foreground">Guard</div><div className="mt-1 flex items-center gap-2"><Shield className="h-4 w-4 text-primary"/><span className="font-[family-name:'Cinzel',serif] text-2xl">{selected.sheet.guardRating}</span><span className="text-[10px] text-muted-foreground">GR</span></div><div className="mt-1 text-[10px] text-muted-foreground">Ward {selected.sheet.wardRating} · WR</div></div><div className="rounded-xl border border-border/70 bg-background/55 p-3"><div className="text-[10px] font-mono uppercase tracking-[.15em] text-muted-foreground">Thread Pool</div><div className="mt-1 flex items-center gap-2"><Activity className="h-4 w-4 text-chart-2"/><span className="font-[family-name:'Cinzel',serif] text-2xl">{selected.sheet.tension.current}</span><span className="text-[10px] text-muted-foreground">/ {selected.sheet.tension.pool}</span></div><div className="mt-1 text-[10px] text-muted-foreground">Safe limit {selected.sheet.tension.safeLimit} · RB +{selected.sheet.refinementBonus}</div></div></div>
          <div className="relative mt-2 flex flex-wrap items-center gap-2"><button disabled={saving || selected.sheet.burnout===0} onClick={() => void patchSelected({burnout:Math.max(0,selected.sheet.burnout-1)})} className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-30">− Burnout</button><span className="rounded-md border border-border px-2 py-1 text-[10px] font-mono text-muted-foreground">Burnout {selected.sheet.burnout}</span><button disabled={saving || selected.sheet.burnout>=6} onClick={() => void patchSelected({burnout:Math.min(6,selected.sheet.burnout+1)})} className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-30">+ Burnout</button><span className="ml-auto text-[10px] text-muted-foreground">Tension spent by a cast is applied when its roll is saved.</span></div>
        </header>

        <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-5">
            <section><h4 className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-primary">Attributes</h4><div className="grid grid-cols-3 gap-2">{ATTRS.map(([key,label])=><div key={key} className="rounded-xl border border-border/70 bg-background/50 p-3 text-center"><div className="font-mono text-[9px] tracking-widest text-muted-foreground">{label}</div><div className="mt-1 font-[family-name:'Cinzel',serif] text-2xl text-foreground">{selected.sheet.attributes[key]}</div><div className="mt-0.5 font-mono text-xs text-primary">{signed(mod(selected.sheet.attributes[key]))}</div></div>)}</div><p className="mt-2 text-[10px] text-muted-foreground">Affinity / Modes: {selected.sheet.affinityModes}</p></section>
            <section><div className="mb-3 flex items-center justify-between"><h4 className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Skills &amp; checks</h4><span className="text-[10px] text-muted-foreground">Click to roll d20</span></div>{selected.sheet.skills.length?<div className="flex flex-wrap gap-2">{selected.sheet.skills.map(item=><button key={item.name} onClick={()=>rollCheck(`${item.name} check`,item.modifier)} className="rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"><span className="block text-xs text-foreground">{item.name}</span><span className="font-mono text-[10px] text-primary">{signed(item.modifier)}</span></button>)}</div>:<p className="text-xs text-muted-foreground">No skill checks listed.</p>}</section>
            <section><h4 className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-primary">Condition tracker</h4><div className="flex flex-wrap gap-2">{selected.sheet.conditions.map(condition=><button key={condition} disabled={saving} onClick={()=>void patchSelected({conditions:selected.sheet.conditions.filter(item=>item!==condition)})} title="Remove condition" className="rounded-full border border-chart-2/30 bg-chart-2/10 px-3 py-1.5 text-xs text-chart-2">{condition}<span className="ml-2 opacity-60">×</span></button>)}{selected.sheet.conditions.length===0&&<span className="text-xs text-muted-foreground">No active conditions.</span>}</div><form onSubmit={event=>{event.preventDefault();const value=conditionDraft.trim();if(value&&!selected.sheet.conditions.includes(value)){void patchSelected({conditions:[...selected.sheet.conditions,value]});setConditionDraft("");}}} className="mt-2 flex gap-2"><input value={conditionDraft} onChange={event=>setConditionDraft(event.target.value)} maxLength={100} placeholder="Add condition" className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-3 text-xs outline-none focus:border-primary/50"/><button disabled={!conditionDraft.trim()||saving} className="rounded-lg border border-border px-3 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40">Add</button></form></section>
            {selected.sheet.gmNotes.length>0&&<section className="rounded-xl border border-amber-500/20 bg-amber-500/[.04] p-4"><h4 className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-amber-500"><BookOpen className="h-3.5 w-3.5"/>Weavekeeper notes</h4><ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">{selected.sheet.gmNotes.map(note=><li key={note}>• {note}</li>)}</ul></section>}
          </div>

          <div className="space-y-5">
            <section><h4 className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-primary">Actions</h4>{selected.sheet.actions.length?<div className="space-y-2.5">{selected.sheet.actions.map((action,index)=><div key={`${action.name}-${index}`} className="rounded-xl border border-border/70 bg-background/45 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h5 className="font-[family-name:'Cinzel',serif] text-base text-foreground">{action.name}</h5><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.detail}</p></div><div className="flex shrink-0 flex-wrap gap-1.5">{action.attackModifier!==undefined&&<button onClick={()=>rollCheck(`${action.name} · attack`,action.attackModifier??0,action.tensionCost)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-mono text-primary hover:bg-primary/20"><Dices className="h-3.5 w-3.5"/>Attack {signed(action.attackModifier)}</button>}{action.damage&&<button onClick={()=>rollDamage(`${action.name} · ${action.detail.toLowerCase().includes("recover")?"recovery":"damage"}`,action.damage!,0)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary"><Dices className="h-3.5 w-3.5"/>{action.detail.toLowerCase().includes("recover")?"Recovery":"Damage"}</button>}{action.attackModifier===undefined&&(action.checkModifier!==undefined||action.dc!==undefined||action.tensionCost!==undefined||!action.damage)&&<button onClick={()=>rollCheck(`${action.name} · check`,action.checkModifier??0,action.tensionCost)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-mono text-primary hover:bg-primary/20"><Dices className="h-3.5 w-3.5"/>Roll check</button>}</div></div>{(action.dc!==undefined||action.tensionCost!==undefined)&&<div className="mt-2 flex flex-wrap gap-x-3 text-[10px] font-mono text-muted-foreground">{action.dc!==undefined&&<span>DC {action.dc}</span>}{action.tensionCost!==undefined&&<span>{action.tensionCost} Tension</span>}</div>}</div>)}</div>:<div className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">No actions recorded. Use skills and checks above.</div>}</section>
            <section><h4 className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-primary">Special abilities</h4>{selected.sheet.abilities.length?<div className="space-y-2">{selected.sheet.abilities.map((item,index)=><details key={`${item.name}-${index}`} className="group rounded-xl border border-border/70 bg-background/45"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 text-sm text-foreground"><span>{item.name}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180"/></summary><p className="border-t border-border/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">{item.detail}</p></details>)}</div>:<p className="text-xs text-muted-foreground">No special abilities listed.</p>}</section>
            <section className="rounded-xl border border-border/70 bg-background/35 p-4"><h4 className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary">Tactics &amp; roleplay</h4><p className="text-xs leading-relaxed text-muted-foreground">{selected.sheet.tactics}</p></section>
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-[10px] text-muted-foreground"><span>Private to the Weavekeeper account</span><span>{saving?"Saving…":"Saved"}</span></footer>
      </article> : <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No sheet selected.</div>}
    </div>}

    {creating&&<div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)setCreating(false);}}><form onSubmit={createSheet} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="bestiary-create-title">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 p-4 backdrop-blur"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Private folio</p><h3 id="bestiary-create-title" className="font-[family-name:'Cinzel',serif] text-xl">Create a sheet</h3></div><button type="button" onClick={()=>setCreating(false)} disabled={saving} aria-label="Close" className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button></div>
      {error&&<div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive" role="alert">{error}</div>}
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Name<input required maxLength={100} value={draft.name} onChange={event=>setDraft(current=>({...current,name:event.target.value}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" placeholder="Name of this character"/></label><label className="text-xs text-muted-foreground">Type<select value={draft.kind} onChange={event=>setDraft(current=>({...current,kind:event.target.value as Kind}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">{["NPC","Monster","Creature","Construct","Boss"].map(kind=><option key={kind}>{kind}</option>)}</select></label><label className="text-xs text-muted-foreground">Level<input required type="number" min={1} max={30} value={draft.level} onChange={event=>setDraft(current=>({...current,level:event.target.value}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"/></label><label className="text-xs text-muted-foreground">Refinement Bonus<input required type="number" min={0} max={10} value={draft.refinementBonus} onChange={event=>setDraft(current=>({...current,refinementBonus:event.target.value}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"/></label></div>
        <div><h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">Attributes</h4><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{ATTRS.map(([key,label])=><label key={key} className="text-center font-mono text-[10px] text-muted-foreground">{label}<input type="number" min={1} max={30} value={draft.attributes[key]} onChange={event=>setDraft(current=>({...current,attributes:{...current.attributes,[key]:Number(event.target.value)}}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background text-center text-base text-foreground"/></label>)}</div><p className="mt-1 text-[10px] text-muted-foreground">Vitality, Thread Pool, Safe Limit, GR and WR are calculated from these scores.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Role / description<input required maxLength={180} value={draft.role} onChange={event=>setDraft(current=>({...current,role:event.target.value}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" placeholder="Faction, role, or encounter purpose"/></label><label className="text-xs text-muted-foreground">Affinity / Modes<input maxLength={400} value={draft.affinityModes} onChange={event=>setDraft(current=>({...current,affinityModes:event.target.value}))} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" placeholder="Optional"/></label></div>
        <div><div className="mb-2 flex items-center justify-between"><h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Skills</h4><button type="button" onClick={()=>setDraft(current=>({...current,skills:[...current.skills,{name:"",modifier:"0"}]}))} className="inline-flex items-center gap-1 text-[10px] text-primary"><Plus className="h-3 w-3"/>Add skill</button></div>{draft.skills.map((skill,index)=><div key={index} className="mb-2 grid grid-cols-[1fr_90px_34px] gap-2"><input placeholder="Skill" value={skill.name} onChange={event=>setDraft(current=>({...current,skills:current.skills.map((item,i)=>i===index?{...item,name:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-3 text-xs"/><input aria-label="Skill modifier" type="number" min={-20} max={50} value={skill.modifier} onChange={event=>setDraft(current=>({...current,skills:current.skills.map((item,i)=>i===index?{...item,modifier:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-center text-xs"/><button type="button" onClick={()=>setDraft(current=>({...current,skills:current.skills.filter((_,i)=>i!==index)}))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4"/></button></div>)}</div>
        <div><div className="mb-2 flex items-center justify-between"><h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Actions</h4><button type="button" onClick={()=>setDraft(current=>({...current,actions:[...current.actions,{name:"",detail:"",attackModifier:"",targetDefense:"GR",diceSides:"",diceCount:"1",bonusDiceSides:"",damageModifier:"0",dc:"",tensionCost:""}]}))} className="inline-flex items-center gap-1 text-[10px] text-primary"><Plus className="h-3 w-3"/>Add action</button></div>{draft.actions.map((action,index)=><div key={index} className="mb-3 rounded-xl border border-border p-3"><div className="grid gap-2 sm:grid-cols-[1fr_120px_34px]"><input placeholder="Action name" value={action.name} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,name:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-3 text-xs"/><input type="number" min={-20} max={50} placeholder="Attack bonus" value={action.attackModifier} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,attackModifier:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/><button type="button" onClick={()=>setDraft(current=>({...current,actions:current.actions.filter((_,i)=>i!==index)}))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4"/></button></div><textarea placeholder="Description or special effect" value={action.detail} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,detail:event.target.value}:item)}))} className="mt-2 min-h-16 w-full rounded-lg border border-border bg-background p-3 text-xs"/><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6"><select aria-label="Target defense" value={action.targetDefense} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,targetDefense:event.target.value as ActionDraft['targetDefense']}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"><option value="">No target</option><option value="GR">Target GR</option><option value="WR">Target WR</option></select><select aria-label="Damage die" value={action.diceSides} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,diceSides:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"><option value="">No damage dice</option>{[4,6,8,10,12].map(value=><option key={value} value={value}>d{value}</option>)}</select><input aria-label="Damage dice count" type="number" min={1} max={2} value={action.diceCount} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,diceCount:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"/><select aria-label="Extra damage die" value={action.bonusDiceSides} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,bonusDiceSides:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs"><option value="">No extra die</option>{[4,6,8,10,12].map(value=><option key={value} value={value}>+d{value}</option>)}</select><input aria-label="Damage modifier" type="number" min={-50} max={50} value={action.damageModifier} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,damageModifier:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs" placeholder="Damage +"/><input aria-label="Action DC" type="number" min={1} max={40} value={action.dc} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,dc:event.target.value}:item)}))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs" placeholder="DC"/></div><input aria-label="Tension cost" type="number" min={0} max={1000} value={action.tensionCost} onChange={event=>setDraft(current=>({...current,actions:current.actions.map((item,i)=>i===index?{...item,tensionCost:event.target.value}:item)}))} className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-xs sm:w-40" placeholder="Tension cost"/></div>)}</div>
        <div><div className="mb-2 flex items-center justify-between"><h4 className="font-mono text-[10px] uppercase tracking-widest text-primary">Special abilities</h4><button type="button" onClick={()=>setDraft(current=>({...current,abilities:[...current.abilities,{name:"",detail:""}]}))} className="inline-flex items-center gap-1 text-[10px] text-primary"><Plus className="h-3 w-3"/>Add ability</button></div>{draft.abilities.map((ability,index)=><div key={index} className="mb-2 grid grid-cols-[1fr_34px] gap-2"><div><input placeholder="Ability name" value={ability.name} onChange={event=>setDraft(current=>({...current,abilities:current.abilities.map((item,i)=>i===index?{...item,name:event.target.value}:item)}))} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"/><textarea placeholder="What it does" value={ability.detail} onChange={event=>setDraft(current=>({...current,abilities:current.abilities.map((item,i)=>i===index?{...item,detail:event.target.value}:item)}))} className="mt-1 min-h-14 w-full rounded-lg border border-border bg-background p-3 text-xs"/></div><button type="button" onClick={()=>setDraft(current=>({...current,abilities:current.abilities.filter((_,i)=>i!==index)}))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4"/></button></div>)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Tactics / roleplay<textarea maxLength={2000} value={draft.tactics} onChange={event=>setDraft(current=>({...current,tactics:event.target.value}))} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-xs" placeholder="How this character approaches a scene"/></label><label className="text-xs text-muted-foreground">Private Weavekeeper notes<textarea maxLength={4000} value={draft.gmNotes} onChange={event=>setDraft(current=>({...current,gmNotes:event.target.value}))} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-xs" placeholder="One note per line"/></label></div>
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card/95 p-4 backdrop-blur"><button type="button" disabled={saving} onClick={()=>setCreating(false)} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground">Cancel</button><button disabled={saving||!draft.name.trim()||!draft.role.trim()} className="rounded-lg bg-primary px-5 py-2 text-xs font-mono text-primary-foreground disabled:opacity-50">{saving?"Saving…":"Create sheet"}</button></div>
    </form></div>}
  </section>;
}
