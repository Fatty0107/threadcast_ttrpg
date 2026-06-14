import { useState, useEffect, useCallback, useRef } from "react";
import { Character } from "@workspace/api-client-react";
import {
  ATTRIBUTE_DEFS, ALL_SKILLS, FEATS, CATALOG_ITEMS, BURNOUT_LEVELS,
  RARITY_COLORS, RARITY_LABELS, type ItemRarity,
  calcMod, fmtMod, getRefinementBonus,
  calcVPMax, calcThreadPool, calcSafeLimit, calcGuardRating, calcWardRating,
  calcRecoveryDice,
} from "@/lib/ttrpg-data";
import { findString } from "@/lib/affinity-data";
import { TensionGauge } from "@/components/shared/TensionGauge";
import { BurnoutTrack } from "@/components/shared/BurnoutTrack";
import { useDiceRoller } from "@/components/shared/DiceRoller";
import { GameTerm } from "@/components/shared/GameTerm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---- Types ----
interface SheetData {
  avatarDataUrl?: string;
  attributes?: Record<string, number>;
  vitalityPoints?: { current: number; max: number };
  tension?: { current: number; pool: number; safeLimit: number };
  burnout?: number;
  fatigue?: number;
  corruption?: number;
  guardRating?: number;
  wardRating?: number;
  background?: string;
  guild?: string;
  guildRank?: string;
  primaryMode?: string;
  secondaryMode?: string;
  secondaryMode2?: string;
  tertiaryMode?: string;
  tertiaryMode2?: string;
  refinementBonus?: number;
  attunedSkills?: string[];
  skills?: { name: string; attribute: string; attuned: boolean }[];
  strings?: string[];
  techniques?: { name: string; mode?: string; description?: string }[];
  feats?: string[];
  inventory?: InventoryEntry[];
  signature?: string;
  woundsNotes?: string;
  notes?: string;
  recoveryDiceCurrent?: number;
}

interface InventoryEntry {
  id: string;
  name: string;
  quantity: number;
  rarity: ItemRarity;
  notes?: string;
  desc?: string;
  mechanical?: string;
}

interface Props {
  character: Character;
  onUpdate: (data: Partial<Character>) => void;
}

export function CharacterSheetContent({ character, onUpdate }: Props) {
  const { openRoll } = useDiceRoller();
  const [localData, setLocalData] = useState<SheetData>((character.data as SheetData) || {});
  const [showFeatPicker, setShowFeatPicker] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [showMendPanel, setShowMendPanel] = useState(false);
  const [recoveryDiceUsed, setRecoveryDiceUsed] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocalData((character.data as SheetData) || {});
  }, [character.id]);

  const save = useCallback((next: SheetData) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate({ data: next as any }), 800);
  }, [onUpdate]);

  function patch(partial: Partial<SheetData>) {
    setLocalData(prev => { const n = { ...prev, ...partial }; save(n); return n; });
  }
  function patchNested<K extends keyof SheetData>(key: K, field: string, value: unknown) {
    setLocalData(prev => {
      const n = { ...prev, [key]: { ...(prev[key] as object || {}), [field]: value } };
      save(n as SheetData);
      return n;
    });
  }

  // ---- Derived ----
  const attrs = localData.attributes || {};
  const vp = localData.vitalityPoints || { current: 0, max: 0 };
  const tension = localData.tension || { current: 0, pool: 0, safeLimit: 0 };
  const burnout = localData.burnout || 0;
  const fatigue = localData.fatigue || 0;
  const corruption = localData.corruption || 0;
  const level = character.level || 1;
  const rb = getRefinementBonus(level);
  const maxVP = calcVPMax(attrs.res || 10, level);
  const maxPool = calcThreadPool(level, attrs.ths || 10);
  const safeLimit = calcSafeLimit(level, attrs.ctr || 10);
  const guardRating = calcGuardRating(attrs.res || 10);
  const wardRating = calcWardRating(attrs.ctr || 10);
  const maxRecoveryDice = calcRecoveryDice(attrs.res || 10);
  const recoveryDiceCurrent = localData.recoveryDiceCurrent ?? maxRecoveryDice;
  const feats = localData.feats || [];
  const inventory = localData.inventory || [];

  const attunedSkills: string[] = localData.attunedSkills
    || (localData.skills || []).filter(s => s.attuned).map(s => s.name)
    || [];

  const featSlots = Math.floor(level / 2);
  const featSlotsRemaining = featSlots - feats.length;

  // ---- Mend handler ----
  function doMend() {
    const diceRoll = recoveryDiceUsed * (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1);
    const healed = Math.min(diceRoll, maxVP - vp.current);
    patch({
      tension: { ...tension, current: 0 },
      vitalityPoints: { ...vp, current: Math.min(maxVP, vp.current + healed) },
      recoveryDiceCurrent: Math.max(0, recoveryDiceCurrent - recoveryDiceUsed),
    });
    setRecoveryDiceUsed(0);
    setShowMendPanel(false);
  }

  function doLongRest() {
    patch({
      vitalityPoints: { current: maxVP, max: maxVP },
      tension: { ...tension, current: 0 },
      fatigue: Math.max(0, fatigue - 1),
      burnout: Math.max(0, burnout - 1),
      recoveryDiceCurrent: maxRecoveryDice,
    });
  }

  // ---- Feat helpers ----
  const activeFeatDefs = FEATS.filter(f => feats.includes(f.name));
  const availableFeats = FEATS.filter(f => {
    if (feats.includes(f.name)) return false;
    if (f.minLevel > level) return false;
    return true;
  });

  function addFeat(name: string) {
    patch({ feats: [...feats, name] });
    setShowFeatPicker(false);
  }
  function removeFeat(name: string) {
    patch({ feats: feats.filter(f => f !== name) });
  }

  // ---- Inventory helpers ----
  const filteredCatalog = CATALOG_ITEMS.filter(item =>
    !inventory.find(i => i.id === item.id) &&
    (inventorySearch === "" || item.name.toLowerCase().includes(inventorySearch.toLowerCase()))
  );

  function addFromCatalog(item: typeof CATALOG_ITEMS[0]) {
    patch({ inventory: [...inventory, { id: item.id, name: item.name, quantity: 1, rarity: item.rarity, desc: item.desc, mechanical: item.mechanical }] });
  }
  function addCustomItem() {
    const newItem: InventoryEntry = {
      id: `custom-${Date.now()}`,
      name: "New Item",
      quantity: 1,
      rarity: "common",
      notes: "",
    };
    patch({ inventory: [...inventory, newItem] });
  }
  function updateItem(id: string, changes: Partial<InventoryEntry>) {
    patch({ inventory: inventory.map(i => i.id === id ? { ...i, ...changes } : i) });
  }
  function removeItem(id: string) {
    patch({ inventory: inventory.filter(i => i.id !== id) });
  }

  // ---- PDF Export ----
  function handleExportPDF() {
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) { alert("Allow pop-ups to export PDF."); return; }

    const totalStr = (localData.strings || []).length;
    const activeFeatDefsAll = FEATS.filter(f => feats.includes(f.name));

    const burnoutLabel = ["Clear","Frayed","Stretched","Scorched","Cracked","Breaking","Thread Death"][burnout] || "Clear";
    const trackDots = (val: number, max: number, filled: string) =>
      Array.from({ length: max }).map((_, i) => `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #444;background:${i < val ? filled : "transparent"};margin-right:2px;"></span>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${character.name} — Character Sheet</title>
<style>
@page{size:A4;margin:18mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;font-size:10pt;color:#111;line-height:1.45}
h1{font-size:20pt;letter-spacing:.04em;margin-bottom:3px}
h2{font-size:12pt;border-bottom:1.5px solid #222;padding-bottom:3px;margin:18px 0 8px}
h3{font-size:9pt;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:4px}
.page{page-break-before:always;padding-top:4px}
.page:first-child{page-break-before:auto}
.header{display:flex;align-items:flex-start;gap:14px;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}
.portrait{width:60px;height:60px;object-fit:cover;border:1px solid #333;flex-shrink:0}
.pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px}
.pill{font-family:monospace;font-size:7.5pt;border:1px solid #555;padding:1px 5px;color:#333;border-radius:2px}
.g6{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.stat-box{border:1px solid #ccc;padding:5px;text-align:center}
.stat-lbl{font-family:monospace;font-size:7pt;color:#666;text-transform:uppercase;letter-spacing:.07em}
.stat-val{font-family:monospace;font-size:13pt;font-weight:bold}
.stat-mod{font-family:monospace;font-size:8.5pt;color:#444}
table{width:100%;border-collapse:collapse;font-size:9pt}
th{font-family:monospace;font-size:7pt;text-align:left;padding:3px 5px;border-bottom:1px solid #333;color:#555;text-transform:uppercase}
td{padding:3px 5px;border-bottom:1px solid #e0e0e0;vertical-align:middle}
.at{color:#8b5e00;font-weight:bold}
.feat-block{border:1px solid #ccc;padding:6px 8px;margin-bottom:5px}
.feat-nm{font-family:monospace;font-size:9pt;font-weight:bold}
.feat-cat{font-family:monospace;font-size:7pt;color:#777}
.feat-desc{font-size:8.5pt;color:#333;margin-top:2px;line-height:1.5}
.feat-mech{font-family:monospace;font-size:8pt;color:#555;border-left:2px solid #a07030;padding-left:5px;margin-top:3px}
.notes-box{border:1px solid #ccc;padding:8px;min-height:70px;font-size:9pt;white-space:pre-wrap}
.section-label{font-family:monospace;font-size:7pt;text-transform:uppercase;letter-spacing:.1em;color:#666;margin-bottom:2px}
</style></head><body>
<div class="header">
  ${localData.avatarDataUrl ? `<img src="${localData.avatarDataUrl}" class="portrait" alt="Portrait">` : ""}
  <div style="flex:1">
    <h1>${character.name}</h1>
    <div class="pills">
      <span class="pill">Level ${level}</span>
      ${character.affinity ? `<span class="pill">${character.affinity} Affinity</span>` : ""}
      ${localData.primaryMode ? `<span class="pill">${localData.primaryMode} (Primary)</span>` : ""}
      ${localData.secondaryMode ? `<span class="pill">${localData.secondaryMode}${localData.secondaryMode2 ? " / " + localData.secondaryMode2 : ""} (Secondary)</span>` : ""}
      ${localData.tertiaryMode ? `<span class="pill">${localData.tertiaryMode}${localData.tertiaryMode2 ? " / " + localData.tertiaryMode2 : ""} (Tertiary)</span>` : ""}
      ${localData.background ? `<span class="pill">${localData.background}</span>` : ""}
      ${localData.guild ? `<span class="pill">${localData.guild}${localData.guildRank ? " · " + localData.guildRank : ""}</span>` : ""}
    </div>
  </div>
</div>

<h2>Attributes</h2>
<div class="g6">
${ATTRIBUTE_DEFS.map(a => {
  const score = attrs[a.key] || 10;
  const mod = calcMod(score);
  return `<div class="stat-box"><div class="stat-lbl">${a.abbr}</div><div class="stat-val">${score}</div><div class="stat-mod">${mod >= 0 ? "+" : ""}${mod}</div></div>`;
}).join("")}
</div>

<div class="g2" style="margin-bottom:14px">
<div>
<h3>Vital Statistics</h3>
<div class="g3" style="margin-top:5px">
  <div class="stat-box"><div class="stat-lbl">VP</div><div class="stat-val" style="font-size:11pt">${vp.current}/${vp.max || maxVP}</div></div>
  <div class="stat-box"><div class="stat-lbl">Thread Pool</div><div class="stat-val" style="font-size:11pt">${tension.current}/${tension.pool || maxPool}</div></div>
  <div class="stat-box"><div class="stat-lbl">Safe Limit</div><div class="stat-val" style="font-size:11pt">${tension.safeLimit || safeLimit}</div></div>
  <div class="stat-box"><div class="stat-lbl">Guard</div><div class="stat-val" style="font-size:11pt">${localData.guardRating ?? guardRating}</div></div>
  <div class="stat-box"><div class="stat-lbl">Ward</div><div class="stat-val" style="font-size:11pt">${localData.wardRating ?? wardRating}</div></div>
  <div class="stat-box"><div class="stat-lbl">Ref. Bonus</div><div class="stat-val" style="font-size:11pt">+${rb}</div></div>
  <div class="stat-box"><div class="stat-lbl">Recovery Dice</div><div class="stat-val" style="font-size:11pt">${recoveryDiceCurrent}/${maxRecoveryDice}</div></div>
  <div class="stat-box"><div class="stat-lbl">Fatigue</div><div class="stat-val" style="font-size:11pt">${fatigue}/5</div></div>
  <div class="stat-box"><div class="stat-lbl">Corruption</div><div class="stat-val" style="font-size:11pt">${corruption}/10</div></div>
</div>
</div>
<div>
<h3>Burnout</h3>
<div style="margin-top:5px">${trackDots(burnout, 6, "#8b0000")} <span style="font-family:monospace;font-size:8pt;margin-left:4px">${burnout}/6 — ${burnoutLabel}</span></div>
${localData.signature ? `<h3 style="margin-top:12px">Weaver Signature</h3><div style="font-size:8.5pt;margin-top:3px;border:1px solid #ccc;padding:5px">${localData.signature}</div>` : ""}
${localData.woundsNotes ? `<h3 style="margin-top:10px">Wounds &amp; Conditions</h3><div style="font-size:8.5pt;margin-top:3px;border:1px solid #ccc;padding:5px;white-space:pre-wrap">${localData.woundsNotes}</div>` : ""}
</div>
</div>

<!-- PAGE 2: SKILLS & STRINGS -->
<div class="page">
<h2>Skills</h2>
<table><thead><tr><th>Skill</th><th>Attr</th><th>Attuned</th><th>Modifier</th><th>Total</th></tr></thead><tbody>
${ALL_SKILLS.map(skill => {
  const attrScore = attrs[skill.attr] || 10;
  const mod = calcMod(attrScore);
  const isAt = attunedSkills.includes(skill.name);
  const total = mod + (isAt ? rb : 0);
  return `<tr><td class="${isAt ? "at" : ""}">${skill.name}</td><td style="font-family:monospace;font-size:8pt">${skill.attr.toUpperCase()}</td><td style="text-align:center">${isAt ? "●" : "○"}</td><td style="font-family:monospace">${mod >= 0 ? "+" : ""}${mod}${isAt ? " +"+rb : ""}</td><td style="font-family:monospace;font-weight:bold">${total >= 0 ? "+" : ""}${total}</td></tr>`;
}).join("")}
</tbody></table>

${totalStr > 0 ? `<h2>Strings (${totalStr})</h2><div style="font-size:9pt">${(localData.strings || []).map((s: string) => `<div style="border:1px solid #ccc;padding:4px 7px;margin-bottom:4px;font-family:Georgia,serif">${s}</div>`).join("")}</div>` : ""}
</div>

<!-- PAGE 3: FEATS, BACKGROUND & NOTES -->
<div class="page">
${activeFeatDefsAll.length > 0 ? `<h2>Feats (${activeFeatDefsAll.length}/${Math.floor(level/2)} slots)</h2>${activeFeatDefsAll.map(feat => `<div class="feat-block"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px"><span class="feat-nm">${feat.name}</span><span class="feat-cat">${feat.category.toUpperCase()} · LV${feat.minLevel}</span></div><div class="feat-desc">${feat.desc}</div><div class="feat-mech">${feat.mechanical}</div></div>`).join("")}` : ""}

<h2>Background &amp; Identity</h2>
<div class="g2" style="font-size:9pt">
<div>
  ${localData.background ? `<div><strong>Background:</strong> ${localData.background}</div>` : ""}
  ${localData.guild ? `<div style="margin-top:3px"><strong>Guild:</strong> ${localData.guild}</div>` : ""}
  ${localData.guildRank ? `<div style="margin-top:3px"><strong>Rank:</strong> ${localData.guildRank}</div>` : ""}
</div>
<div></div>
</div>

${localData.notes ? `<h2>Notes</h2><div class="notes-box">${localData.notes}</div>` : ""}
</div>

<script>window.onload=()=>{window.print()}</script>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  const vpPercent = Math.min(100, Math.max(0, (vp.current / (vp.max || maxVP)) * 100));

  // Mode arrays for casting
  const primaryMode = localData.primaryMode || character.mode || "";
  const secondaryModes = [localData.secondaryMode || "", localData.secondaryMode2 || ""].filter(m => m);
  const tertiaryModes = [localData.tertiaryMode || "", localData.tertiaryMode2 || ""].filter(m => m);

  return (
    <div className="max-w-7xl mx-auto bg-background">
      {/* ===== HEADER ===== */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            {localData.avatarDataUrl && (
              <img
                src={localData.avatarDataUrl}
                alt="Portrait"
                className="w-14 h-14 object-cover border border-border flex-shrink-0 hidden sm:block"
              />
            )}
            {/* Name & Identity */}
            <div className="flex-1 min-w-0">
              <input
                className="bg-transparent text-3xl font-[family-name:'Cinzel',serif] text-primary focus:outline-none w-full"
                value={character.name}
                onChange={e => onUpdate({ name: e.target.value })}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge>{character.affinity || "No Affinity"}</Badge>
                <Badge variant="mode">{localData.primaryMode || character.mode || "No Mode"}</Badge>
                <Badge variant="level">Level {level}</Badge>
                {localData.background && <Badge variant="dim">{localData.background}</Badge>}
                {localData.guild && <Badge variant="dim">{localData.guild}</Badge>}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowMendPanel(v => !v)}
              className="px-3 py-1.5 text-xs font-mono border border-chart-2/50 text-chart-2 hover:bg-chart-2/10 transition-colors"
            >
              MEND
            </button>
            <button
              onClick={doLongRest}
              className="px-3 py-1.5 text-xs font-mono border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              LONG REST
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 text-xs font-mono border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              EXPORT PDF
            </button>
          </div>
        </div>

        {/* VP Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1 font-mono text-xs">
            <GameTerm term="vitality points" className="text-muted-foreground uppercase">Vitality Points</GameTerm>
            <div className="flex items-center gap-3">
              <button className="w-6 h-6 border border-border hover:bg-muted font-mono text-sm" onClick={() => patchNested("vitalityPoints", "current", Math.max(0, vp.current - 1))}>−</button>
              <span className={vp.current <= vp.max * 0.25 ? "text-destructive font-bold" : "text-foreground"}>
                {vp.current} <span className="text-muted-foreground">/ {vp.max || maxVP}</span>
              </span>
              <button className="w-6 h-6 border border-border hover:bg-muted font-mono text-sm" onClick={() => patchNested("vitalityPoints", "current", Math.min(vp.max || maxVP, vp.current + 1))}>+</button>
            </div>
          </div>
          <div className="h-2 bg-background border border-border">
            <div
              className={cn("h-full transition-all duration-300", vpPercent <= 25 ? "bg-destructive" : vpPercent <= 50 ? "bg-primary" : "bg-accent")}
              style={{ width: `${vpPercent}%` }}
            />
          </div>
        </div>

        {/* Mend Panel */}
        {showMendPanel && (
          <div className="mt-3 p-4 border border-chart-2/30 bg-chart-2/5 font-mono text-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-chart-2 uppercase text-xs tracking-widest">Mend — Spend Recovery Dice</span>
              <span className="text-muted-foreground text-xs">{recoveryDiceCurrent}/{maxRecoveryDice} dice remaining</span>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-muted-foreground text-xs">Dice to spend:</span>
              {Array.from({ length: recoveryDiceCurrent }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setRecoveryDiceUsed(i + 1)}
                  className={cn(
                    "w-8 h-8 border text-xs font-bold transition-colors",
                    recoveryDiceUsed > i ? "border-chart-2 bg-chart-2/20 text-chart-2" : "border-border text-muted-foreground"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              {recoveryDiceCurrent === 0 && <span className="text-muted-foreground text-xs">No dice remaining. Long Rest to recover.</span>}
            </div>
            {recoveryDiceUsed > 0 && (
              <button onClick={doMend} className="mt-3 px-4 py-1.5 bg-chart-2/20 border border-chart-2/50 text-chart-2 text-xs hover:bg-chart-2/30 transition-colors">
                SPEND {recoveryDiceUsed}d6+{calcMod(attrs.res || 10)} → MEND
              </button>
            )}
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-xs">
          <QuickStat label={<GameTerm term="guard rating">GUARD</GameTerm>} value={localData.guardRating ?? guardRating} />
          <QuickStat label={<GameTerm term="ward rating">WARD</GameTerm>} value={localData.wardRating ?? wardRating} />
          <QuickStat label={<GameTerm term="refinement bonus">RB</GameTerm>} value={`+${rb}`} highlight />
          <QuickStat label="RECOVERY DICE" value={`${recoveryDiceCurrent}/${maxRecoveryDice}`} />
          <QuickStat label={<GameTerm term="corruption">CORRUPTION</GameTerm>} value={`${corruption}/10`} warning={corruption >= 6} />
          <QuickStat label={<GameTerm term="fatigue">FATIGUE</GameTerm>} value={`${fatigue}/5`} warning={fatigue >= 3} />
        </div>
      </div>

      {/* ===== TABS ===== */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-card h-11 justify-start overflow-x-auto">
          {["overview","skills","strings","feats","inventory","background","notes"].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="font-mono text-[11px] rounded-none data-[state=active]:bg-background data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 capitalize tracking-wide"
            >
              {tab === "feats" && featSlotsRemaining > 0
                ? <span className="flex items-center gap-1">{tab} <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">{featSlotsRemaining}</span></span>
                : tab
              }
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ===== OVERVIEW ===== */}
        <TabsContent value="overview" className="p-0 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Attributes column */}
            <div className="lg:col-span-5 border-r border-border p-5 space-y-4">
              <h3 className="font-[family-name:'Cinzel',serif] text-xs text-muted-foreground uppercase tracking-widest">Attributes</h3>
              <div>
                {ATTRIBUTE_DEFS.map(attr => {
                  const score = attrs[attr.key] || 10;
                  const mod = calcMod(score);
                  return (
                    <div key={attr.key} className="flex items-center py-2 border-b border-border/20 last:border-0 hover:bg-muted/20 px-1 group">
                      <GameTerm term={attr.key} className="w-24 font-mono text-xs text-muted-foreground">{attr.abbr} <span className="text-muted-foreground/50">{attr.label}</span></GameTerm>
                      <input
                        type="number"
                        className="w-14 bg-transparent text-center font-mono text-lg focus:outline-none"
                        value={score}
                        min={1} max={20}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 10;
                          patch({ attributes: { ...attrs, [attr.key]: v } });
                        }}
                      />
                      <button
                        className="ml-auto w-14 text-center text-primary font-mono font-bold hover:bg-primary/15 py-1 rounded transition-colors"
                        onClick={() => openRoll(`${attr.label} Check`, mod, character.name)}
                      >
                        {fmtMod(mod)}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {[
                  { key: "guardRating", label: "Guard Rating", computed: guardRating, term: "guard rating" },
                  { key: "wardRating", label: "Ward Rating", computed: wardRating, term: "ward rating" },
                ].map(stat => (
                  <div key={stat.key} className="text-center p-2 border border-border/50 bg-background/50">
                    <GameTerm term={stat.term} className="text-[10px] font-mono text-muted-foreground block mb-1">{stat.label.toUpperCase()}</GameTerm>
                    <input
                      type="number"
                      className="w-full bg-transparent text-center text-2xl font-mono focus:outline-none"
                      value={(localData as any)[stat.key] ?? stat.computed}
                      onChange={e => patch({ [stat.key]: parseInt(e.target.value) || stat.computed } as any)}
                    />
                    <div className="text-[9px] text-muted-foreground/50 font-mono">auto: {stat.computed}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <TrackerRow
                  label={<GameTerm term="corruption">Corruption</GameTerm>}
                  value={corruption} max={10}
                  color={corruption >= 6 ? "bg-destructive" : "bg-purple-500"}
                  onDec={() => patch({ corruption: Math.max(0, corruption - 1) })}
                  onInc={() => patch({ corruption: Math.min(10, corruption + 1) })}
                />
                <TrackerRow
                  label={<GameTerm term="fatigue">Fatigue</GameTerm>}
                  value={fatigue} max={5}
                  color={fatigue >= 3 ? "bg-destructive" : "bg-yellow-600"}
                  onDec={() => patch({ fatigue: Math.max(0, fatigue - 1) })}
                  onInc={() => patch({ fatigue: Math.min(5, fatigue + 1) })}
                />
              </div>
            </div>

            {/* Tension + Burnout column */}
            <div className="lg:col-span-7 p-5 flex flex-col items-center gap-6">
              <TensionGauge
                current={tension.current}
                max={tension.pool || maxPool}
                safeLimit={tension.safeLimit || safeLimit}
                onSpend={() => patchNested("tension", "current", Math.min(tension.pool || maxPool, tension.current + 1))}
                onRelease={() => patchNested("tension", "current", Math.max(0, tension.current - 1))}
              />
              <div className="w-full max-w-sm">
                <BurnoutTrack level={burnout} />
                <div className="flex gap-2 justify-center mt-3">
                  <button className="px-3 py-1 text-xs border border-border hover:bg-muted font-mono transition-colors" onClick={() => patch({ burnout: Math.max(0, burnout - 1) })}>− BURN</button>
                  <button className="px-3 py-1 text-xs border border-destructive/40 text-destructive/70 hover:bg-destructive/10 font-mono transition-colors" onClick={() => patch({ burnout: Math.min(6, burnout + 1) })}>+ BURN</button>
                </div>
                <div className="mt-4 space-y-1">
                  {BURNOUT_LEVELS.map(bl => (
                    <div key={bl.level} className={cn("flex gap-2 text-[10px] font-mono py-1 px-2", bl.level === burnout && "bg-destructive/10 border-l-2 border-destructive")}>
                      <span className={cn("font-bold w-16 flex-shrink-0", bl.level === burnout ? "text-destructive" : "text-muted-foreground/40")}>
                        {bl.level}: {bl.label}
                      </span>
                      <span className="text-muted-foreground/60">{bl.penalty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== SKILLS ===== */}
        <TabsContent value="skills" className="p-5 m-0">
          <div className="mb-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span><GameTerm term="refinement bonus">Refinement Bonus</GameTerm>: <strong className="text-primary">+{rb}</strong></span>
            <span>Attuned: {attunedSkills.length}/{ALL_SKILLS.length}</span>
          </div>
          <table className="w-full text-left font-mono text-sm">
            <thead>
              <tr className="text-muted-foreground/50 border-b border-border text-xs">
                <th className="pb-2 font-normal">Skill</th>
                <th className="pb-2 font-normal text-center w-12">Attr</th>
                <th className="pb-2 font-normal text-center w-16">Attuned</th>
                <th className="pb-2 font-normal text-center w-20">Modifier</th>
                <th className="pb-2 font-normal text-center w-16">Roll</th>
              </tr>
            </thead>
            <tbody>
              {ALL_SKILLS.map(skill => {
                const attrScore = attrs[skill.attr] || 10;
                const mod = calcMod(attrScore);
                const isAttuned = attunedSkills.includes(skill.name);
                const total = mod + (isAttuned ? rb : 0);
                return (
                  <tr key={skill.name} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-2.5">
                      <GameTerm term={skill.name.toLowerCase()} className="text-foreground">{skill.name}</GameTerm>
                    </td>
                    <td className="py-2.5 text-center">
                      <GameTerm term={skill.attr} className="text-muted-foreground text-xs">{skill.attr.toUpperCase()}</GameTerm>
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        className={cn("w-5 h-5 inline-flex items-center justify-center border transition-colors text-xs",
                          isAttuned ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40")}
                        onClick={() => {
                          const next = isAttuned ? attunedSkills.filter(s => s !== skill.name) : [...attunedSkills, skill.name];
                          patch({ attunedSkills: next });
                        }}
                      >
                        {isAttuned ? "●" : ""}
                      </button>
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground">
                      {fmtMod(mod)}{isAttuned ? <span className="text-primary"> +{rb}</span> : ""}
                      {" "}= <strong className={isAttuned ? "text-primary" : ""}>{fmtMod(total)}</strong>
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        className="text-primary hover:bg-primary/15 px-2 py-0.5 rounded font-bold transition-colors"
                        onClick={() => openRoll(`${skill.name} Check`, total, character.name)}
                      >
                        {fmtMod(total)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabsContent>

        {/* ===== STRINGS ===== */}
        <TabsContent value="strings" className="p-4 m-0 space-y-4">
          {(localData.strings || []).length === 0 && (
            <div className="py-8 text-center font-mono text-muted-foreground text-sm">No Strings attuned. Add them via character editing.</div>
          )}
          {/* Mode legend */}
          {(localData.strings || []).length > 0 && (
            <div className="flex flex-wrap gap-2 font-mono text-[10px] pb-2 border-b border-border/30">
              {primaryMode && <span className="px-2 py-0.5 border border-chart-2/40 text-chart-2"><span className="opacity-60">Primary:</span> {primaryMode} → HARMONY</span>}
              {secondaryModes.map(m => <span key={m} className="px-2 py-0.5 border border-border text-muted-foreground"><span className="opacity-60">Secondary:</span> {m} → NORMAL</span>)}
              {tertiaryModes.map(m => <span key={m} className="px-2 py-0.5 border border-destructive/30 text-destructive/70"><span className="opacity-60">Tertiary:</span> {m} → DISCORD</span>)}
            </div>
          )}
          {(localData.strings || []).map((sName, i) => {
            const strData = findString(sName);
            const checkAttrKey = strData?.checkAttr ?? "ths";
            const attrScore = attrs[checkAttrKey] || 10;
            if (!strData) {
              return (
                <div key={i} className="border border-border p-4 font-mono text-sm flex justify-between">
                  <span className="text-primary">{sName}</span>
                  <span className="text-muted-foreground text-xs">See Compendium</span>
                </div>
              );
            }
            return (
              <CastStringPanel
                key={i}
                str={strData}
                attrScore={attrScore}
                characterName={character.name}
                onCast={cost => patchNested("tension", "current", Math.min(tension.pool || maxPool, tension.current + cost))}
                primaryMode={primaryMode}
                secondaryModes={secondaryModes}
                tertiaryModes={tertiaryModes}
                level={level}
              />
            );
          })}
          {/* Add String */}
          <div className="border border-dashed border-border/50 p-3">
            <p className="text-xs font-mono text-muted-foreground mb-2">Add a String name:</p>
            <div className="flex gap-2">
              <input
                id="add-string-input"
                className="flex-1 bg-background border border-border px-2 py-1 font-mono text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. Flow String"
              />
              <button
                className="px-3 py-1 text-xs border border-primary/50 text-primary hover:bg-primary/10 font-mono"
                onClick={() => {
                  const el = document.getElementById("add-string-input") as HTMLInputElement;
                  if (el.value.trim()) {
                    patch({ strings: [...(localData.strings || []), el.value.trim()] });
                    el.value = "";
                  }
                }}
              >
                + ADD
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ===== FEATS ===== */}
        <TabsContent value="feats" className="p-4 m-0">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-xs text-muted-foreground">
              <GameTerm term="refinement bonus">Refinement Bonus</GameTerm> +{rb} · Level {level} · Feat slots: {featSlots} · Used: {feats.length}
            </div>
            {featSlotsRemaining > 0 && (
              <button
                onClick={() => setShowFeatPicker(v => !v)}
                className="px-3 py-1.5 text-xs font-mono border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
              >
                {showFeatPicker ? "CANCEL" : `+ CHOOSE FEAT (${featSlotsRemaining} remaining)`}
              </button>
            )}
          </div>

          {showFeatPicker && (
            <div className="mb-6 border border-primary/20 bg-primary/5 p-4 space-y-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-mono text-primary mb-3">Select a feat (available at your level with prerequisites met):</p>
              {["utility", "combat", "defense", "magic"].map(cat => {
                const catFeats = availableFeats.filter(f => f.category === cat);
                if (!catFeats.length) return null;
                return (
                  <div key={cat} className="mb-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">{cat}</p>
                    <div className="space-y-1">
                      {catFeats.map(feat => (
                        <button
                          key={feat.name}
                          onClick={() => addFeat(feat.name)}
                          className="w-full text-left p-3 border border-border hover:border-primary/50 bg-background transition-colors"
                        >
                          <div className="flex justify-between items-baseline">
                            <span className="font-mono text-sm text-foreground">{feat.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground ml-2">Lv{feat.minLevel}{feat.prerequisites !== "None" && feat.prerequisites !== "Even level" ? ` · ${feat.prerequisites}` : ""}</span>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-1 leading-relaxed">{feat.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {activeFeatDefs.length === 0 && !showFeatPicker && (
              <div className="py-8 text-center font-mono text-muted-foreground text-sm">
                {featSlots === 0 ? "Reach Level 2 to choose your first feat." : "No feats selected yet."}
              </div>
            )}
            {activeFeatDefs.map(feat => (
              <div key={feat.name} className="border border-border p-4 bg-card group relative">
                <button
                  onClick={() => removeFeat(feat.name)}
                  className="absolute top-3 right-3 text-muted-foreground/40 hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  × Remove
                </button>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-[family-name:'Cinzel',serif] text-foreground">{feat.name}</span>
                  <span className={cn("text-[10px] font-mono px-1.5 py-0.5",
                    feat.category === "combat" ? "bg-destructive/20 text-destructive" :
                    feat.category === "defense" ? "bg-chart-2/20 text-chart-2" :
                    feat.category === "magic" ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>{feat.category}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-2">{feat.desc}</p>
                <p className="text-xs font-mono text-primary/70 bg-primary/5 border border-primary/10 px-2 py-1">{feat.mechanical}</p>
              </div>
            ))}
            {feats.filter(name => !activeFeatDefs.find(f => f.name === name)).map(name => (
              <div key={name} className="border border-border p-4 bg-card group relative">
                <button onClick={() => removeFeat(name)} className="absolute top-3 right-3 text-muted-foreground/40 hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity">× Remove</button>
                <span className="font-[family-name:'Cinzel',serif] text-foreground">{name}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ===== INVENTORY ===== */}
        <TabsContent value="inventory" className="p-4 m-0">
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-xs text-muted-foreground">{inventory.length} items carried</span>
            <div className="flex gap-2">
              <button onClick={addCustomItem} className="px-3 py-1.5 text-xs font-mono border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">+ CUSTOM ITEM</button>
              <button onClick={() => setShowInventoryPicker(v => !v)} className="px-3 py-1.5 text-xs font-mono border border-primary/50 text-primary hover:bg-primary/10 transition-colors">
                {showInventoryPicker ? "CLOSE CATALOG" : "+ FROM CATALOG"}
              </button>
            </div>
          </div>

          {showInventoryPicker && (
            <div className="mb-4 border border-border bg-card p-3">
              <input
                className="w-full bg-background border border-border px-3 py-1.5 font-mono text-sm mb-3 focus:outline-none focus:border-primary"
                placeholder="Search items..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredCatalog.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { addFromCatalog(item); }}
                    className="w-full text-left p-2 border border-border hover:border-primary/50 flex items-baseline gap-2 transition-colors"
                  >
                    <span className={cn("text-[10px] font-mono w-16 flex-shrink-0", RARITY_COLORS[item.rarity])}>{RARITY_LABELS[item.rarity]}</span>
                    <span className="font-mono text-sm text-foreground">{item.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{item.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {inventory.length === 0 && !showInventoryPicker && (
            <div className="py-8 text-center font-mono text-muted-foreground text-sm">Inventory empty. Add items from catalog or create custom items.</div>
          )}

          <div className="space-y-2">
            {inventory.map(item => (
              <div key={item.id} className="border border-border p-3 bg-card group flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <input
                      className="bg-transparent font-mono text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border"
                      value={item.name}
                      onChange={e => updateItem(item.id, { name: e.target.value })}
                    />
                    <select
                      className="bg-transparent font-mono text-[10px] border-none focus:outline-none cursor-pointer"
                      value={item.rarity}
                      onChange={e => updateItem(item.id, { rarity: e.target.value as ItemRarity })}
                    >
                      {(Object.keys(RARITY_LABELS) as ItemRarity[]).map(r => (
                        <option key={r} value={r}>{RARITY_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  {item.desc && <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{item.desc}</p>}
                  {item.mechanical && <p className="text-[11px] font-mono text-primary/60 mt-0.5">{item.mechanical}</p>}
                  <input
                    className="mt-1 w-full bg-transparent font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none border-b border-transparent focus:border-border/30"
                    placeholder="Notes..."
                    value={item.notes || ""}
                    onChange={e => updateItem(item.id, { notes: e.target.value })}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Qty</span>
                  <div className="flex items-center gap-1">
                    <button className="w-5 h-5 border border-border hover:bg-muted font-mono text-xs" onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}>−</button>
                    <span className="w-6 text-center font-mono text-sm">{item.quantity}</span>
                    <button className="w-5 h-5 border border-border hover:bg-muted font-mono text-xs" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}>+</button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground/30 hover:text-destructive text-[10px] font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">× DEL</button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ===== BACKGROUND ===== */}
        <TabsContent value="background" className="p-5 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
            <div className="space-y-4">
              <EditableField label="Background" value={localData.background || ""} onChange={v => patch({ background: v })} placeholder="Guild-Raised, Self-Taught..." />
              <EditableField label="Guild" value={localData.guild || ""} onChange={v => patch({ guild: v })} placeholder="The Scaled Guard..." />
              <EditableField label="Guild Rank" value={localData.guildRank || ""} onChange={v => patch({ guildRank: v })} placeholder="Thornguard, Solanarch..." />
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Primary Mode <span className="text-chart-2/60 ml-1">Harmony</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.primaryMode || character.mode || ""} onChange={e => patch({ primaryMode: e.target.value })} placeholder="Anchor, Striker..." />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Secondary Mode 1 <span className="text-muted-foreground/40 ml-1">Normal · Level 4+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.secondaryMode || ""} onChange={e => patch({ secondaryMode: e.target.value })} placeholder="Unlocked at Level 4..." disabled={level < 4} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Secondary Mode 2 <span className="text-muted-foreground/40 ml-1">Normal · Level 4+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.secondaryMode2 || ""} onChange={e => patch({ secondaryMode2: e.target.value })} placeholder="Unlocked at Level 4..." disabled={level < 4} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Tertiary Mode 1 <span className="text-destructive/40 ml-1">Discord · Level 7+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.tertiaryMode || ""} onChange={e => patch({ tertiaryMode: e.target.value })} placeholder="Unlocked at Level 7..." disabled={level < 7} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Tertiary Mode 2 <span className="text-destructive/40 ml-1">Discord · Level 7+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.tertiaryMode2 || ""} onChange={e => patch({ tertiaryMode2: e.target.value })} placeholder="Unlocked at Level 7..." disabled={level < 7} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Weaver Signature</label>
                <textarea
                  className="w-full bg-background border border-border px-2 py-2 focus:outline-none focus:border-primary text-sm min-h-[100px] resize-none"
                  value={localData.signature || ""}
                  onChange={e => patch({ signature: e.target.value })}
                  placeholder="Visual: ..., Auditory: ..., Tactile: ..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Wounds & Conditions</label>
                <textarea
                  className="w-full bg-background border border-border px-2 py-2 focus:outline-none focus:border-primary text-sm min-h-[100px] resize-none"
                  value={localData.woundsNotes || ""}
                  onChange={e => patch({ woundsNotes: e.target.value })}
                  placeholder="Current wounds, active conditions..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Level</label>
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 border border-border hover:bg-muted font-mono" onClick={() => onUpdate({ level: Math.max(1, level - 1) })}>−</button>
                  <span className="text-2xl font-mono">{level}</span>
                  <button className="w-8 h-8 border border-border hover:bg-muted font-mono" onClick={() => onUpdate({ level: Math.min(10, level + 1) })}>+</button>
                  <span className="text-xs text-muted-foreground">RB: +{rb}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== NOTES ===== */}
        <TabsContent value="notes" className="p-0 m-0 flex flex-col" style={{ minHeight: 400 }}>
          <textarea
            className="flex-1 w-full min-h-[500px] bg-transparent p-5 font-mono text-sm focus:outline-none resize-none placeholder:text-muted-foreground/30"
            value={localData.notes || ""}
            onChange={e => patch({ notes: e.target.value })}
            placeholder={"Character notes, campaign log, inventory ideas, NPC names, session summaries...\n\n"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Sub-components ----

function Badge({ children, variant = "affinity" }: { children: React.ReactNode; variant?: "affinity" | "mode" | "level" | "dim" }) {
  return (
    <span className={cn("text-[10px] font-mono px-2 py-0.5 border",
      variant === "affinity" && "border-chart-2/50 text-chart-2 bg-chart-2/10",
      variant === "mode" && "border-primary/50 text-primary bg-primary/10",
      variant === "level" && "border-border text-muted-foreground",
      variant === "dim" && "border-border/40 text-muted-foreground/60",
    )}>{children}</span>
  );
}

function QuickStat({ label, value, highlight, warning }: { label: React.ReactNode; value: string | number; highlight?: boolean; warning?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[9px] text-muted-foreground/60 uppercase mb-0.5 leading-tight">{label}</div>
      <div className={cn("font-mono text-base font-bold", highlight && "text-primary", warning && "text-destructive")}>{value}</div>
    </div>
  );
}

function TrackerRow({ label, value, max, color, onDec, onInc }: { label: React.ReactNode; value: number; max: number; color: string; onDec: () => void; onInc: () => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex gap-1 items-center">
          <button className="w-5 h-5 border border-border hover:bg-muted font-mono text-xs" onClick={onDec}>−</button>
          <span className="w-12 text-center">{value}/{max}</span>
          <button className="w-5 h-5 border border-border hover:bg-muted font-mono text-xs" onClick={onInc}>+</button>
        </div>
      </div>
      <div className="h-1.5 bg-background border border-border">
        <div className={cn("h-full transition-all", color)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</label>
      <input
        className="w-full bg-background border border-border px-2 py-1 font-mono text-sm focus:outline-none focus:border-primary"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

interface CastPL { pl: number; cost: number; dc: number; effect: string }
interface CastResult { d1: number; d2?: number; finalDie: number; total: number; rollType: "HARMONY" | "NORMAL" | "DISCORD"; chosenMode: string; dc: number }

function CastStringPanel({
  str, attrScore, characterName, onCast,
  primaryMode, secondaryModes, tertiaryModes, level,
}: {
  str: any; attrScore: number; characterName: string; onCast: (cost: number) => void;
  primaryMode: string; secondaryModes: string[]; tertiaryModes: string[]; level: number;
}) {
  const mod = calcMod(attrScore);
  const [expanded, setExpanded] = useState(true);
  const [castPL, setCastPL] = useState<CastPL | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [castResult, setCastResult] = useState<CastResult | null>(null);

  type ModeOption = { name: string; rollType: "HARMONY" | "NORMAL" | "DISCORD"; tier: "Primary" | "Secondary" | "Tertiary" };
  const availableModes: ModeOption[] = [
    ...(primaryMode ? [{ name: primaryMode, rollType: "HARMONY" as const, tier: "Primary" as const }] : []),
    ...(level >= 4 ? secondaryModes.map(m => ({ name: m, rollType: "NORMAL" as const, tier: "Secondary" as const })) : []),
    ...(level >= 7 ? tertiaryModes.map(m => ({ name: m, rollType: "DISCORD" as const, tier: "Tertiary" as const })) : []),
  ];

  function initiateCast(pl: number, cost: number, dc: number, effect: string) {
    setCastPL({ pl, cost, dc, effect });
    setCastResult(null);
  }

  function selectModeAndRoll(modeName: string, rollType: "HARMONY" | "NORMAL" | "DISCORD", cost: number, dc: number) {
    onCast(cost);
    setIsRolling(true);
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 20) + 1;
      let d2: number | undefined;
      let finalDie = d1;
      if (rollType === "HARMONY") { d2 = Math.floor(Math.random() * 20) + 1; finalDie = Math.max(d1, d2); }
      if (rollType === "DISCORD") { d2 = Math.floor(Math.random() * 20) + 1; finalDie = Math.min(d1, d2); }
      const total = finalDie + mod;
      setIsRolling(false);
      setCastResult({ d1, d2, finalDie, total, rollType, chosenMode: modeName, dc });
    }, 700);
  }

  const rollTypeBadge = (rt: string) => ({
    HARMONY: "text-chart-2 bg-chart-2/10 border-chart-2/40",
    NORMAL: "text-muted-foreground bg-muted/30 border-border",
    DISCORD: "text-destructive bg-destructive/10 border-destructive/30",
  }[rt] ?? "");

  return (
    <div className="border border-border bg-background">
      <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded(v => !v)}>
        <span className="font-[family-name:'Cinzel',serif] text-base text-chart-2">{str.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            <GameTerm term="thread check">Thread Check</GameTerm>: {str.checkAttr?.toUpperCase()} {fmtMod(mod)}
          </span>
          <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30">
          <p className="text-xs font-mono text-muted-foreground my-3 leading-relaxed">{str.flavor}</p>

          {/* Cast Overlay */}
          {castPL && (
            <div className="mb-4 border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-primary uppercase tracking-widest">
                  {str.name} PL{castPL.pl} — DC {castPL.dc}
                </span>
                <button
                  onClick={() => { setCastPL(null); setCastResult(null); }}
                  className="text-muted-foreground hover:text-foreground text-xs font-mono"
                >
                  CLOSE ✕
                </button>
              </div>

              {isRolling ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="text-3xl text-primary animate-spin">⬡</div>
                </div>
              ) : castResult ? (
                /* RESULT */
                <div className={cn("p-3 border", castResult.finalDie === 1 ? "border-destructive/50 bg-destructive/5" : castResult.total >= castResult.dc ? "border-chart-2/40 bg-chart-2/5" : "border-border bg-muted/10")}>
                  <div className="flex items-center justify-between mb-2 font-mono text-xs text-muted-foreground">
                    <span>
                      {castResult.chosenMode} · {castResult.rollType}
                      {castResult.d2 !== undefined
                        ? ` [${castResult.d1}, ${castResult.d2}]`
                        : ` [${castResult.d1}]`}
                      {" "}{fmtMod(mod)} =
                    </span>
                    <span className={cn("text-2xl font-bold font-mono",
                      castResult.finalDie === 1 ? "text-destructive" :
                      castResult.finalDie === 20 ? "text-primary" :
                      castResult.total >= castResult.dc ? "text-chart-2" : "text-muted-foreground"
                    )}>
                      {castResult.total}
                    </span>
                  </div>
                  {castResult.finalDie === 20 && (
                    <div className="font-mono text-xs text-primary font-bold mb-1">✦ THREAD BREAK — Exceptional effect!</div>
                  )}
                  {castResult.finalDie === 1 ? (
                    <div>
                      <div className="font-mono text-xs text-destructive font-bold mb-1">✸ MISFIRE — SNAPBACK</div>
                      <div className="font-mono text-xs text-muted-foreground leading-relaxed">{str.snapback}</div>
                    </div>
                  ) : castResult.total >= castResult.dc ? (
                    <div>
                      <div className="font-mono text-xs text-chart-2 font-bold mb-1">SUCCESS (vs DC {castResult.dc})</div>
                      <div className="font-mono text-xs text-foreground leading-relaxed">{castPL.effect}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-mono text-xs text-muted-foreground font-bold mb-1">MISHAP — DC {castResult.dc} not met</div>
                      <div className="font-mono text-xs text-muted-foreground leading-relaxed">{str.mishap}</div>
                    </div>
                  )}
                  <button
                    onClick={() => setCastResult(null)}
                    className="mt-3 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border/40 px-2 py-0.5"
                  >
                    ← SELECT MODE AGAIN
                  </button>
                </div>
              ) : (
                /* MODE SELECTION */
                <div>
                  {availableModes.length === 0 ? (
                    <p className="text-xs font-mono text-muted-foreground">No modes configured. Set your Primary Mode in the Background tab.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Select casting mode:</p>
                      {availableModes.map(m => (
                        <button
                          key={m.name}
                          onClick={() => selectModeAndRoll(m.name, m.rollType, castPL.cost, castPL.dc)}
                          className="w-full text-left p-3 border border-border hover:border-primary/50 bg-background flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-mono text-sm text-foreground">{m.name}</span>
                            <span className="ml-2 text-[10px] font-mono text-muted-foreground">{m.tier} Mode</span>
                          </div>
                          <span className={cn("text-[10px] font-mono px-2 py-0.5 border", rollTypeBadge(m.rollType))}>
                            {m.rollType}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PL table */}
          <table className="w-full text-left font-mono text-xs mb-3">
            <thead>
              <tr className="text-muted-foreground/50 border-b border-border/30">
                <th className="pb-1 font-normal w-8 text-center"><GameTerm term="pl">PL</GameTerm></th>
                <th className="pb-1 font-normal w-10 text-center"><GameTerm term="tp">TP</GameTerm></th>
                <th className="pb-1 font-normal w-10 text-center"><GameTerm term="dc">DC</GameTerm></th>
                <th className="pb-1 font-normal">Effect</th>
                <th className="pb-1 font-normal w-16 text-right">Cast</th>
              </tr>
            </thead>
            <tbody>
              {str.levels.map((lvl: any) => (
                <tr key={lvl.pl} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                  <td className="py-1.5 text-center text-muted-foreground">{lvl.pl}</td>
                  <td className="py-1.5 text-center text-primary">{lvl.cost}</td>
                  <td className="py-1.5 text-center">{lvl.dc}</td>
                  <td className="py-1.5 pr-2 leading-relaxed">{lvl.effect}</td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => initiateCast(lvl.pl, lvl.cost, lvl.dc, lvl.effect)}
                      className="px-2 py-0.5 text-[10px] border border-chart-2/50 text-chart-2 hover:bg-chart-2/10 transition-colors font-mono"
                    >
                      CAST
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-2 border border-border/30 bg-muted/10">
              <span className="text-primary font-bold block mb-0.5">MISHAP</span>
              <span className="text-muted-foreground leading-relaxed">{str.mishap}</span>
            </div>
            <div className="p-2 border border-destructive/20 bg-destructive/5">
              <span className="text-destructive font-bold block mb-0.5">SNAPBACK</span>
              <span className="text-muted-foreground leading-relaxed">{str.snapback}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
