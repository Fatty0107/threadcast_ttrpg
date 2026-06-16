import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateCharacter, useUpdateCharacter, useGetCharacter } from "@workspace/api-client-react";
import {
  BACKGROUNDS, GUILDS, ALL_MODES, ALL_SKILLS, FEATS, ATTRIBUTE_DEFS,
  GUILD_RANKS_DATA, getGuildRankData, getGuildRanksForGuild, getGuildEntryRankTitle,
  type AttrKey, type Attributes,
  calcMod, calcVPMax, calcThreadPool, calcSafeLimit, calcGuardRating, calcWardRating,
  getRefinementBonus,
} from "@/lib/ttrpg-data";
import { useHomebrew } from "@/contexts/HomebrewContext";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Shield, BookOpen, Star, Sparkles, ChevronDown, Check, AlertCircle } from "lucide-react";

const STEPS = [
  { id: "identity",   label: "Identity" },
  { id: "background", label: "Background" },
  { id: "attributes", label: "Attributes" },
  { id: "mode",       label: "Mode" },
  { id: "strings",    label: "Strings" },
  { id: "skills",     label: "Skills" },
  { id: "feats",      label: "Feats" },
  { id: "review",     label: "Review" },
];

const POINT_BUY_TOTAL = 78;
const ATTR_MIN = 8;
const ATTR_MAX = 16;

interface BuildState {
  name: string;
  avatarDataUrl: string;
  level: number;
  affinity: string;
  guild: string;
  guildRank: string;
  guildFeatChoice: string;
  background: string;
  flexAttrBonus: AttrKey | "";
  baseAttrs: Attributes;
  primaryMode: string;
  secondaryModes: [string, string];
  tertiaryModes: [string, string];
  attunedSkills: string[];
  selectedStrings: string[];
  selectedFeats: string[];
  signature: string;
}

const DEFAULT_BASE: Attributes = { pot: 10, ctr: 10, res: 10, acu: 10, pre: 10, ths: 10 };

const DEFAULT_BUILD: BuildState = {
  name: "",
  avatarDataUrl: "",
  level: 1,
  affinity: "",
  guild: "",
  guildRank: "",
  guildFeatChoice: "",
  background: "",
  flexAttrBonus: "",
  baseAttrs: DEFAULT_BASE,
  primaryMode: "",
  secondaryModes: ["", ""],
  tertiaryModes: ["", ""],
  attunedSkills: [],
  selectedStrings: [],
  selectedFeats: [],
  signature: "",
};

function pointsSpent(attrs: Attributes): number {
  return (Object.values(attrs) as number[]).reduce((a, b) => a + b, 0);
}

function getTotalAttrs(state: BuildState): Attributes {
  const bg = BACKGROUNDS.find(b => b.name === state.background);
  const guildRankData = getGuildRankData(state.guild, state.guildRank);
  const bgBonuses = bg?.attrBonuses ?? {};
  const rankBonuses = guildRankData?.statBonuses ?? {};
  const result = { ...state.baseAttrs };
  for (const [k, v] of Object.entries(bgBonuses)) result[k as AttrKey] = (result[k as AttrKey] ?? 10) + (v as number);
  for (const [k, v] of Object.entries(rankBonuses)) result[k as AttrKey] = (result[k as AttrKey] ?? 10) + (v as number);
  if (state.flexAttrBonus) result[state.flexAttrBonus] = (result[state.flexAttrBonus] ?? 10) + 1;
  return result;
}

function getStringBudget(level: number): number {
  let count = 2;
  for (let l = 2; l <= level; l++) count += (l === 5 || l === 10) ? 2 : 1;
  return count;
}

function getFeatSlots(level: number): number {
  return Math.floor(level / 2);
}

const ATTR_ICONS: Record<AttrKey, React.ReactNode> = {
  pot: <Zap className="w-3 h-3" />,
  ctr: <Sparkles className="w-3 h-3" />,
  res: <Shield className="w-3 h-3" />,
  acu: <BookOpen className="w-3 h-3" />,
  pre: <Star className="w-3 h-3" />,
  ths: <ChevronDown className="w-3 h-3" />,
};

// ---- Small helper components ----
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="border-b border-border/30 pb-3">
        <h2 className="text-xl font-[family-name:'Cinzel',serif] text-foreground">{title}</h2>
        {subtitle && <p className="text-xs font-mono text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-mono text-muted-foreground tracking-wider uppercase">{label}</label>
      {children}
      {hint && <p className="text-[10px] font-mono text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/20">
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono text-foreground max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function StatPreview({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-muted-foreground/60 mb-0.5">{label}</div>
      <div className="text-lg text-foreground font-mono">{value}</div>
    </div>
  );
}

function BonusBadge({ attrKey, value }: { attrKey: string; value: number }) {
  const def = ATTRIBUTE_DEFS.find(a => a.key === attrKey);
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-chart-2/15 border border-chart-2/30 text-chart-2 px-1.5 py-0.5">
      +{value} {def?.abbr ?? attrKey.toUpperCase()}
    </span>
  );
}

// ---- Dice rolling helpers ----
function roll4d6DropLowest(): number {
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  const sorted = [...dice].sort((a, b) => a - b);
  return sorted[1] + sorted[2] + sorted[3];
}

function rollStatGroup(): number[] {
  return Array.from({ length: 6 }, roll4d6DropLowest);
}

// ---- Main Component ----
export default function CharacterBuilder({ charId }: { charId?: string }) {
  const [, setLocation] = useLocation();
  const createMutation = useCreateCharacter();
  const updateMutation = useUpdateCharacter();
  const { data: existingChar } = useGetCharacter(charId ? parseInt(charId) : 0, {
    query: { enabled: !!charId } as any,
  });
  const { getAffinityStrings, getAvailableAffinityNames, isLoading: homebrewLoading } = useHomebrew();

  const [step, setStep] = useState(0);
  const [build, setBuild] = useState<BuildState>(DEFAULT_BUILD);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [populated, setPopulated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attrMethod, setAttrMethod] = useState<"point-buy" | "rolled">("point-buy");
  const [rolledGroups, setRolledGroups] = useState<number[][]>([]);

  useEffect(() => {
    if (!existingChar || populated) return;
    const data = (existingChar.data as any) || {};
    setBuild({
      name: existingChar.name || "",
      avatarDataUrl: data.avatarDataUrl || "",
      level: existingChar.level || 1,
      affinity: existingChar.affinity || "",
      guild: data.guild || "",
      guildRank: data.guildRank || "",
      guildFeatChoice: data.guildFeatChoice || "",
      background: data.background || "",
      flexAttrBonus: "",
      baseAttrs: data.attributes ? {
        pot: data.attributes.pot || 10, ctr: data.attributes.ctr || 10,
        res: data.attributes.res || 10, acu: data.attributes.acu || 10,
        pre: data.attributes.pre || 10, ths: data.attributes.ths || 10,
      } : DEFAULT_BASE,
      primaryMode: data.primaryMode || existingChar.mode || "",
      secondaryModes: [data.secondaryMode || "", data.secondaryMode2 || ""],
      tertiaryModes: [data.tertiaryMode || "", data.tertiaryMode2 || ""],
      attunedSkills: Array.isArray(data.attunedSkills) ? data.attunedSkills : [],
      selectedStrings: Array.isArray(data.strings) ? data.strings : [],
      selectedFeats: Array.isArray(data.feats) ? data.feats.filter((f: string) => {
        const grd = getGuildRankData(data.guild || "", data.guildRank || "");
        return !grd?.featChoices.includes(f);
      }) : [],
      signature: data.signature || "",
    });
    setPopulated(true);
  }, [existingChar?.id]);

  const bg = BACKGROUNDS.find(b => b.name === build.background);
  const guildRankData = getGuildRankData(build.guild, build.guildRank);
  const guildRanks = getGuildRanksForGuild(build.guild);
  const totalAttrs = getTotalAttrs(build);
  const pointsLeft = POINT_BUY_TOTAL - pointsSpent(build.baseAttrs);
  const level = build.level;
  const stringBudget = getStringBudget(level);
  const featSlots = getFeatSlots(level);
  const availableAffinities = getAvailableAffinityNames();
  const affinityStrings = getAffinityStrings(build.affinity);

  function updateBuild(patch: Partial<BuildState>) {
    setBuild(prev => ({ ...prev, ...patch }));
  }

  function setAttr(key: AttrKey, value: number) {
    if (attrMethod === "rolled") {
      if (value < 3 || value > 18) return;
      updateBuild({ baseAttrs: { ...build.baseAttrs, [key]: value } });
    } else {
      if (value < ATTR_MIN) return;
      const next = { ...build.baseAttrs, [key]: value };
      if ((Object.values(next) as number[]).reduce((a, b) => a + b, 0) > POINT_BUY_TOTAL) return;
      updateBuild({ baseAttrs: next });
    }
  }

  function switchAttrMethod(method: "point-buy" | "rolled") {
    setAttrMethod(method);
    updateBuild({ baseAttrs: DEFAULT_BASE });
    if (method === "point-buy") setRolledGroups([]);
  }

  function addRolledGroup() {
    setRolledGroups(prev => [...prev, rollStatGroup()]);
  }

  function rerollGroup(idx: number) {
    setRolledGroups(prev => prev.map((g, i) => i === idx ? rollStatGroup() : g));
  }

  function applyGroup(group: number[]) {
    const keys: AttrKey[] = ["pot", "ctr", "res", "acu", "pre", "ths"];
    const next = {} as Attributes;
    keys.forEach((k, i) => { next[k] = group[i]; });
    updateBuild({ baseAttrs: next });
  }

  useEffect(() => {
    if (!bg) return;
    setBuild(prev => {
      const existing = prev.attunedSkills.filter(s => !BACKGROUNDS.flatMap(b => b.startingSkills).includes(s));
      return { ...prev, attunedSkills: [...new Set([...bg.startingSkills, ...existing])] };
    });
  }, [build.background]);

  function canAdvance(): boolean {
    if (step === 0) {
      if (!build.name.trim() || !build.affinity || !build.guild) return false;
      if (build.guild !== "None (Independent)") {
        if (guildRanks.length > 0 && !build.guildRank) return false;
      }
      return true;
    }
    if (step === 1) return build.background !== "" && (!bg?.flexBonus || build.flexAttrBonus !== "");
    if (step === 2) {
      if (attrMethod === "rolled") return Object.values(build.baseAttrs).every(v => v >= 3 && v <= 18);
      return pointsLeft >= 0;
    }
    if (step === 3) {
      if (!build.primaryMode) return false;
      if (level >= 4 && (!build.secondaryModes[0] || !build.secondaryModes[1])) return false;
      if (level >= 7 && (!build.tertiaryModes[0] || !build.tertiaryModes[1])) return false;
      return true;
    }
    if (step === 6) {
      if (guildRankData && !build.guildFeatChoice) return false;
      return true;
    }
    return true;
  }

  async function handleFinish() {
    const total = getTotalAttrs(build);
    const grd = getGuildRankData(build.guild, build.guildRank);
    const guildAttunements = grd?.attunements ?? [];
    const allAttunedSkills = [...new Set([...build.attunedSkills, ...guildAttunements])];
    const allFeats = [...build.selectedFeats];
    if (build.guildFeatChoice && !allFeats.includes(build.guildFeatChoice)) {
      allFeats.unshift(build.guildFeatChoice);
    }

    const data = {
      avatarDataUrl: build.avatarDataUrl,
      attributes: { pot: total.pot, ctr: total.ctr, res: total.res, acu: total.acu, pre: total.pre, ths: total.ths },
      vitalityPoints: { current: calcVPMax(total.res, level), max: calcVPMax(total.res, level) },
      tension: { current: 0, pool: calcThreadPool(level, total.ths), safeLimit: calcSafeLimit(level, total.ctr) },
      burnout: bg?.startingBurnout ?? 0,
      fatigue: 0,
      corruption: 0,
      guardRating: calcGuardRating(total.res),
      wardRating: calcWardRating(total.ctr),
      background: build.background,
      guild: build.guild,
      guildRank: build.guildRank,
      guildFeatChoice: build.guildFeatChoice,
      primaryMode: build.primaryMode,
      secondaryMode: build.secondaryModes[0],
      secondaryMode2: build.secondaryModes[1],
      tertiaryMode: build.tertiaryModes[0],
      tertiaryMode2: build.tertiaryModes[1],
      refinementBonus: getRefinementBonus(level),
      attunedSkills: allAttunedSkills,
      strings: build.selectedStrings.filter(s => s.trim()),
      techniques: [],
      feats: allFeats,
      inventory: [],
      signature: build.signature,
      woundsNotes: "",
      notes: "",
      recoveryDiceCurrent: Math.max(0, calcMod(total.res) + 2),
    };

    setSubmitError(null);
    if (charId) {
      updateMutation.mutate(
        { id: parseInt(charId), data: { name: build.name, level: build.level, affinity: build.affinity, mode: build.primaryMode, data } },
        {
          onSuccess: () => setLocation(`/characters/${charId}`),
          onError: (err: any) => setSubmitError(err?.message ?? "Failed to save. Please try again."),
        },
      );
    } else {
      createMutation.mutate(
        { data: { name: build.name, level: build.level, affinity: build.affinity, mode: build.primaryMode, isDraft: false, data } },
        {
          onSuccess: (char) => setLocation(`/characters/${char.id}`),
          onError: (err: any) => setSubmitError(err?.message ?? "Failed to create character. Please try again."),
        },
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const allModeNames = ALL_MODES.map(m => m.name);
  const secondaryAvailable = allModeNames.filter(m => m !== build.primaryMode);
  const tertiaryAvailable = allModeNames.filter(m => m !== build.primaryMode && !build.secondaryModes.includes(m));
  const bgStartingSkills = bg?.startingSkills ?? [];
  const guildAttunements = guildRankData?.attunements ?? [];
  const lockedSkills = [...new Set([...bgStartingSkills, ...guildAttunements])];

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="border-b border-border bg-card/80 sticky top-14 z-30 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-0 overflow-x-auto py-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 font-mono text-xs transition-all",
                    i === step ? "text-primary border-b-2 border-primary" :
                    i < step ? "text-muted-foreground hover:text-foreground cursor-pointer" :
                    "text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border transition-all",
                    i === step ? "border-primary text-primary bg-primary/10" :
                    i < step ? "border-chart-2 bg-chart-2/20 text-chart-2" :
                    "border-muted-foreground/30"
                  )}>
                    {i < step ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </span>
                  {s.label.toUpperCase()}
                </button>
                {i < STEPS.length - 1 && <span className="text-muted-foreground/20 mx-0.5 text-xs">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 0: IDENTITY */}
          {step === 0 && (
            <Section title="Identity" subtitle="Name your weaver, set their portrait, level, magical affinity, and guild rank.">
              <Field label="Character Name">
                <input className="input-field" value={build.name} onChange={e => updateBuild({ name: e.target.value })} placeholder="Enter your weaver's name..." />
              </Field>

              <Field label="Character Portrait (optional)">
                <div className="flex items-start gap-4">
                  {build.avatarDataUrl ? (
                    <img src={build.avatarDataUrl} alt="Portrait" className="w-20 h-20 object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 border border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30 text-[10px] font-mono flex-shrink-0">NO IMAGE</div>
                  )}
                  <div className="space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateBuild({ avatarDataUrl: reader.result as string });
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-xs font-mono border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                      {build.avatarDataUrl ? "CHANGE IMAGE" : "UPLOAD IMAGE"}
                    </button>
                    {build.avatarDataUrl && (
                      <button type="button" onClick={() => updateBuild({ avatarDataUrl: "" })}
                        className="ml-2 text-xs font-mono text-destructive/50 hover:text-destructive transition-colors">× Remove</button>
                    )}
                  </div>
                </div>
              </Field>

              <Field label="Level">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateBuild({ level: Math.max(1, build.level - 1) })} className="w-8 h-8 border border-border hover:bg-muted font-mono transition-colors">−</button>
                  <span className="w-12 text-center font-mono text-2xl text-foreground">{build.level}</span>
                  <button type="button" onClick={() => updateBuild({ level: Math.min(10, build.level + 1) })} className="w-8 h-8 border border-border hover:bg-muted font-mono transition-colors">+</button>
                </div>
                {build.level > 1 && (
                  <p className="text-[10px] font-mono text-primary mt-2">
                    {getStringBudget(build.level)} strings · {getFeatSlots(build.level)} feat{getFeatSlots(build.level) !== 1 ? "s" : ""}
                    {build.level >= 4 && " · Secondary modes unlock"}
                    {build.level >= 7 && " · Tertiary modes unlock"}
                  </p>
                )}
              </Field>

              <Field label="Affinity" hint="Your magical element — the type of leyline you can grip.">
                {homebrewLoading ? (
                  <div className="h-10 bg-muted/30 border border-border animate-pulse" />
                ) : (
                  <Select value={build.affinity} onValueChange={v => updateBuild({ affinity: v, selectedStrings: [] })}>
                    <SelectTrigger className="font-mono bg-background border-border/60">
                      <SelectValue placeholder="Select an affinity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAffinities.map(a => (
                        <SelectItem key={a} value={a} className="font-mono">{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {availableAffinities.length === 1 && !homebrewLoading && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">Only Water is available. The Weavekeeper can add more affinities via Homebrew.</p>
                )}
              </Field>

              <Field label="Guild Affiliation">
                <Select value={build.guild} onValueChange={v => updateBuild({ guild: v, guildRank: "", guildFeatChoice: "" })}>
                  <SelectTrigger className="font-mono bg-background border-border/60">
                    <SelectValue placeholder="Select a guild..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GUILDS.map(g => (
                      <SelectItem key={g.name} value={g.name} className="font-mono">{g.name}</SelectItem>
                    ))}
                    <SelectItem value="None (Independent)" className="font-mono text-muted-foreground">None (Independent)</SelectItem>
                  </SelectContent>
                </Select>
                {build.guild && build.guild !== "None (Independent)" && (
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                    {GUILDS.find(g => g.name === build.guild)?.desc.split(".")[0]}.
                  </p>
                )}
              </Field>

              {build.guild && build.guild !== "None (Independent)" && guildRanks.length > 0 && (
                <Field label="Guild Rank / Title" hint="Your current standing within the guild.">
                  <Select value={build.guildRank} onValueChange={v => updateBuild({ guildRank: v, guildFeatChoice: "" })}>
                    <SelectTrigger className="font-mono bg-background border-border/60">
                      <SelectValue placeholder="Select your rank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[...guildRanks].sort((a, b) => b.rank - a.rank).map(r => (
                        <SelectItem key={r.title} value={r.title} className="font-mono">
                          {r.title} <span className="text-muted-foreground text-xs ml-2">(Rank {r.rank})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {guildRankData && (
                    <div className="mt-3 p-3 border border-primary/20 bg-primary/5 space-y-3">
                      <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Rank Bonuses — {guildRankData.title}</p>

                      {Object.keys(guildRankData.statBonuses).length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">Stat Bonuses:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(guildRankData.statBonuses).map(([k, v]) => (
                              <BonusBadge key={k} attrKey={k} value={v as number} />
                            ))}
                          </div>
                        </div>
                      )}

                      {guildRankData.attunements.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">Attunements (auto-added):</p>
                          <div className="flex flex-wrap gap-1">
                            {guildRankData.attunements.map(a => (
                              <span key={a} className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 border border-border/40">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-1">Feat Choice (pick one in step 7):</p>
                        <div className="flex flex-wrap gap-1">
                          {guildRankData.featChoices.map(f => (
                            <span key={f} className="text-[10px] font-mono bg-chart-2/10 text-chart-2 px-2 py-0.5 border border-chart-2/20">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Field>
              )}
            </Section>
          )}

          {/* STEP 1: BACKGROUND */}
          {step === 1 && (
            <Section title="Background" subtitle="Where did you come from? This shapes your starting skills and attributes.">
              <div className="space-y-3">
                {BACKGROUNDS.map(b => (
                  <button key={b.name} type="button" onClick={() => updateBuild({ background: b.name, flexAttrBonus: "" })}
                    className={cn(
                      "w-full text-left p-4 border transition-all",
                      build.background === b.name ? "border-primary bg-primary/8 shadow-[0_0_12px_rgba(180,120,60,0.15)]" : "border-border hover:border-primary/40 hover:bg-card/50"
                    )}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-[family-name:'Cinzel',serif] text-base text-foreground">{b.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {Object.entries(b.attrBonuses).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(", ")}
                        {b.flexBonus ? `, +${b.flexBonus} any` : ""}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed">{b.desc}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b.startingSkills.map(s => (
                        <span key={s} className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                    {b.startingBurnout && <div className="mt-2 text-[10px] font-mono text-destructive">⚠ Starts with Burnout 1</div>}
                  </button>
                ))}
              </div>

              {bg?.flexBonus && (
                <div className="mt-4 p-4 border border-primary/30 bg-primary/5">
                  <p className="text-xs font-mono text-primary mb-3">Choose your +1 free attribute bonus:</p>
                  <div className="flex flex-wrap gap-2">
                    {ATTRIBUTE_DEFS.map(a => (
                      <button key={a.key} type="button" onClick={() => updateBuild({ flexAttrBonus: a.key as AttrKey })}
                        className={cn("px-3 py-1.5 text-xs font-mono border transition-colors",
                          build.flexAttrBonus === a.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                        )}>
                        {a.abbr}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* STEP 2: ATTRIBUTES */}
          {step === 2 && (
            <Section
              title="Attributes"
              subtitle={attrMethod === "point-buy"
                ? `Distribute ${POINT_BUY_TOTAL} points across 6 attributes. Min: 8, Max: ${ATTR_MAX} before background & guild bonuses.`
                : "Roll 4d6 drop lowest for each stat (range 3–18). Generate sets below and apply one, then adjust freely."}
            >
              {/* Method selector */}
              <div className="flex gap-2 mb-4">
                {(["point-buy", "rolled"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchAttrMethod(m)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-mono border transition-colors",
                      attrMethod === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {m === "point-buy" ? "POINT-BUY" : "MANUAL / ROLLED"}
                  </button>
                ))}
              </div>

              {/* Point-buy budget indicator */}
              {attrMethod === "point-buy" && (
                <div className={cn(
                  "inline-block px-3 py-1 font-mono text-sm mb-4 border transition-colors",
                  pointsLeft < 0 ? "border-destructive text-destructive bg-destructive/10" :
                  pointsLeft === 0 ? "border-chart-2 text-chart-2 bg-chart-2/10" :
                  "border-border text-muted-foreground"
                )}>
                  {pointsLeft} points remaining
                </div>
              )}

              {/* Rolled groups panel */}
              {attrMethod === "rolled" && (
                <div className="mb-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={addRolledGroup}
                      className="px-3 py-1.5 text-xs font-mono border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                    >
                      + ROLL NEW SET
                    </button>
                    <span className="text-[10px] font-mono text-muted-foreground/60">Each set = 6 rolls of 4d6 drop lowest</span>
                  </div>
                  {rolledGroups.length > 0 && (
                    <div className="space-y-2">
                      {rolledGroups.map((group, gi) => (
                        <div key={gi} className="p-3 border border-border/60 bg-card/40">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Set {gi + 1} — Total: {group.reduce((a, b) => a + b, 0)}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => rerollGroup(gi)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border/60 px-2 py-0.5 transition-colors">REROLL</button>
                              <button type="button" onClick={() => applyGroup(group)} className="text-[10px] font-mono text-primary border border-primary/40 bg-primary/5 hover:bg-primary/15 px-2 py-0.5 transition-colors">USE SET</button>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {group.map((v, vi) => (
                              <div key={vi} className="text-center">
                                <div className="text-[10px] font-mono text-muted-foreground/50">{ATTRIBUTE_DEFS[vi]?.abbr ?? vi}</div>
                                <div className="w-8 h-8 flex items-center justify-center border border-border font-mono text-sm text-foreground">{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {ATTRIBUTE_DEFS.map(attr => {
                  const base = build.baseAttrs[attr.key as AttrKey];
                  const bgBonus = bg?.attrBonuses[attr.key as AttrKey] ?? 0;
                  const flexBonus = build.flexAttrBonus === attr.key ? 1 : 0;
                  const rankBonus = guildRankData?.statBonuses[attr.key as AttrKey] ?? 0;
                  const total = base + bgBonus + flexBonus + rankBonus;
                  const mod = calcMod(total);
                  const totalBonus = bgBonus + flexBonus + rankBonus;
                  const atMin = attrMethod === "rolled" ? base <= 3 : base <= ATTR_MIN;
                  const atMax = attrMethod === "rolled" ? base >= 18 : base >= ATTR_MAX || pointsLeft <= 0;
                  return (
                    <div key={attr.key} className="flex items-center gap-4 p-3 border border-border/60 hover:border-border bg-card/40 transition-colors">
                      <div className="w-32">
                        <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                          <span className="text-primary/60">{ATTR_ICONS[attr.key as AttrKey]}</span>
                          {attr.abbr}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">{attr.label}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAttr(attr.key as AttrKey, base - 1)} disabled={atMin} className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono transition-colors">−</button>
                        <span className="w-8 text-center font-mono text-lg">{base}</span>
                        <button type="button" onClick={() => setAttr(attr.key as AttrKey, base + 1)} disabled={atMax} className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono transition-colors">+</button>
                      </div>
                      {totalBonus > 0 && (
                        <div className="flex gap-1">
                          {bgBonus + flexBonus > 0 && <span className="text-[10px] font-mono text-chart-2">+{bgBonus + flexBonus} bg</span>}
                          {rankBonus > 0 && <span className="text-[10px] font-mono text-primary">+{rankBonus} rank</span>}
                        </div>
                      )}
                      <div className="ml-auto text-right font-mono">
                        <span className="text-xl text-foreground">{total}</span>
                        <span className="text-sm text-primary ml-2">({mod >= 0 ? "+" : ""}{mod})</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {bg && (
                <div className="mt-4 p-3 border border-border/50 bg-muted/20 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-muted-foreground">
                  <StatPreview label="Max VP" value={calcVPMax(totalAttrs.res, level)} />
                  <StatPreview label="Thread Pool" value={calcThreadPool(level, totalAttrs.ths)} />
                  <StatPreview label="Safe Limit" value={calcSafeLimit(level, totalAttrs.ctr)} />
                  <StatPreview label="Guard Rating" value={calcGuardRating(totalAttrs.res)} />
                  <StatPreview label="Ward Rating" value={calcWardRating(totalAttrs.ctr)} />
                  <StatPreview label="Recovery Dice" value={Math.max(0, calcMod(totalAttrs.res) + 2)} />
                </div>
              )}
            </Section>
          )}

          {/* STEP 3: MODE */}
          {step === 3 && (
            <div className="space-y-6">
              <Section title="Primary Mode" subtitle="Your discipline — how you interact with the Weave. Primary mode always rolls at Harmony (2d20 keep highest).">
                <div className="space-y-2">
                  {ALL_MODES.map(mode => (
                    <button key={mode.name} type="button"
                      onClick={() => {
                        const newSecondary: [string, string] = [
                          build.secondaryModes[0] === mode.name ? "" : build.secondaryModes[0],
                          build.secondaryModes[1] === mode.name ? "" : build.secondaryModes[1],
                        ];
                        updateBuild({ primaryMode: mode.name, secondaryModes: newSecondary });
                      }}
                      className={cn(
                        "w-full text-left p-4 border transition-all",
                        build.primaryMode === mode.name ? "border-primary bg-primary/8 shadow-[0_0_12px_rgba(180,120,60,0.1)]" : "border-border hover:border-primary/40"
                      )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-[family-name:'Cinzel',serif] text-base text-foreground">{mode.name}</span>
                        {build.primaryMode === mode.name && (
                          <span className="text-[10px] font-mono text-chart-2 bg-chart-2/10 border border-chart-2/30 px-2 py-0.5">HARMONY</span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-1.5">{mode.desc}</p>
                      <p className="text-xs font-[family-name:'IM_Fell_English',serif] italic text-primary/60">{mode.flavor}</p>
                    </button>
                  ))}
                </div>
              </Section>

              {level >= 4 && (
                <Section title="Secondary Modes (Level 4+)" subtitle="Choose 2 secondary modes. Roll Normal (1d20) when casting.">
                  {([0, 1] as const).map(idx => (
                    <div key={idx} className="mb-4">
                      <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-widest">
                        Secondary Mode {idx + 1} {build.secondaryModes[idx] ? `— ${build.secondaryModes[idx]}` : "(not selected)"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {secondaryAvailable.map(name => {
                          const otherIdx = idx === 0 ? 1 : 0;
                          const takenByOther = build.secondaryModes[otherIdx] === name;
                          const selected = build.secondaryModes[idx] === name;
                          return (
                            <button key={name} type="button" disabled={takenByOther}
                              onClick={() => {
                                const next: [string, string] = [...build.secondaryModes] as [string, string];
                                next[idx] = selected ? "" : name;
                                const newTertiary: [string, string] = [
                                  next.includes(build.tertiaryModes[0]) ? "" : build.tertiaryModes[0],
                                  next.includes(build.tertiaryModes[1]) ? "" : build.tertiaryModes[1],
                                ];
                                updateBuild({ secondaryModes: next, tertiaryModes: newTertiary });
                              }}
                              className={cn("p-2 text-xs font-mono border text-left transition-colors",
                                selected ? "border-chart-2 bg-chart-2/10 text-chart-2" :
                                takenByOther ? "border-border/20 text-muted-foreground/30 cursor-not-allowed" :
                                "border-border text-muted-foreground hover:border-primary/50"
                              )}>
                              {selected ? "● " : "○ "}{name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {level >= 7 && (
                <Section title="Tertiary Modes (Level 7+)" subtitle="Choose 2 tertiary modes. Roll Normal (1d20) when casting.">
                  {([0, 1] as const).map(idx => (
                    <div key={idx} className="mb-4">
                      <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-widest">
                        Tertiary Mode {idx + 1} {build.tertiaryModes[idx] ? `— ${build.tertiaryModes[idx]}` : "(not selected)"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {tertiaryAvailable.map(name => {
                          const otherIdx = idx === 0 ? 1 : 0;
                          const takenByOther = build.tertiaryModes[otherIdx] === name;
                          const selected = build.tertiaryModes[idx] === name;
                          return (
                            <button key={name} type="button" disabled={takenByOther}
                              onClick={() => {
                                const next: [string, string] = [...build.tertiaryModes] as [string, string];
                                next[idx] = selected ? "" : name;
                                updateBuild({ tertiaryModes: next });
                              }}
                              className={cn("p-2 text-xs font-mono border text-left transition-colors",
                                selected ? "border-destructive/50 bg-destructive/10 text-destructive" :
                                takenByOther ? "border-border/20 text-muted-foreground/30 cursor-not-allowed" :
                                "border-border text-muted-foreground hover:border-primary/50"
                              )}>
                              {selected ? "● " : "○ "}{name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* STEP 4: STRINGS */}
          {step === 4 && (
            <Section title="Strings" subtitle={`Select up to ${stringBudget} strings for level ${level}. Strings are magical abilities tied to your Affinity.`}>
              <div className="mb-4 p-3 border border-primary/20 bg-primary/5 font-mono text-xs flex items-center justify-between">
                <span>
                  <span className="text-primary font-bold">{build.selectedStrings.filter(s => s.trim()).length}</span>
                  <span className="text-muted-foreground"> / {stringBudget} strings selected</span>
                </span>
                <span className="text-muted-foreground/60">Level {level} budget</span>
              </div>

              {affinityStrings.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground mb-3">Known {build.affinity} strings — select up to {stringBudget}:</p>
                  {affinityStrings.map(s => {
                    const selected = build.selectedStrings.includes(s.shortName);
                    const filledCount = build.selectedStrings.filter(x => x.trim()).length;
                    const canAdd = !selected && filledCount < stringBudget;
                    return (
                      <button key={s.id} type="button"
                        onClick={() => {
                          if (selected) updateBuild({ selectedStrings: build.selectedStrings.filter(x => x !== s.shortName) });
                          else if (canAdd) updateBuild({ selectedStrings: [...build.selectedStrings, s.shortName] });
                        }}
                        disabled={!selected && !canAdd}
                        className={cn("w-full text-left p-3 border font-mono text-sm transition-colors",
                          selected ? "border-chart-2 bg-chart-2/10 text-chart-2" :
                          canAdd ? "border-border text-muted-foreground hover:border-primary/50" :
                          "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                        )}>
                        <div className="flex items-center gap-2">
                          {selected ? "● " : "○ "}{s.shortName}
                        </div>
                        <p className="text-[10px] mt-1 opacity-70 leading-relaxed">{s.flavor}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    {build.affinity ? `Enter ${build.affinity} affinity string names:` : "Select an affinity first."}
                  </p>
                  {build.selectedStrings.map((sName, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className="flex-1 bg-background border border-border px-3 py-1.5 font-mono text-sm focus:outline-none focus:border-primary"
                        value={sName}
                        onChange={e => {
                          const next = [...build.selectedStrings];
                          next[i] = e.target.value;
                          updateBuild({ selectedStrings: next });
                        }}
                        placeholder="String name..."
                      />
                      <button type="button" onClick={() => updateBuild({ selectedStrings: build.selectedStrings.filter((_, j) => j !== i) })}
                        className="text-muted-foreground/50 hover:text-destructive font-mono text-sm px-2 transition-colors">×</button>
                    </div>
                  ))}
                  {build.selectedStrings.length < stringBudget && (
                    <button type="button" onClick={() => updateBuild({ selectedStrings: [...build.selectedStrings, ""] })}
                      className="w-full py-2 text-xs font-mono border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                      + ADD STRING ({build.selectedStrings.length}/{stringBudget})
                    </button>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* STEP 5: SKILLS */}
          {step === 5 && (
            <Section title="Skills" subtitle="Your background and guild rank grant starting skills. Choose 2 additional Attuned skills.">
              <div className="space-y-2 mb-4">
                {bgStartingSkills.length > 0 && (
                  <div className="p-3 bg-muted/20 border border-border/50">
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">From <strong className="text-foreground">{bg?.name}</strong>:</p>
                    <div className="flex flex-wrap gap-1">
                      {bgStartingSkills.map(s => (
                        <span key={s} className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 border border-primary/30">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {guildAttunements.length > 0 && (
                  <div className="p-3 bg-chart-2/5 border border-chart-2/20">
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">From <strong className="text-chart-2">{build.guildRank} ({build.guild})</strong>:</p>
                    <div className="flex flex-wrap gap-1">
                      {guildAttunements.map(s => (
                        <span key={s} className="text-xs font-mono bg-chart-2/10 text-chart-2 px-2 py-1 border border-chart-2/30">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs font-mono text-muted-foreground mb-3">
                Additional attuned: {Math.max(0, build.attunedSkills.filter(s => !lockedSkills.includes(s)).length)}/2 chosen
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_SKILLS.map(skill => {
                  const isLocked = lockedSkills.includes(skill.name);
                  const isAttuned = build.attunedSkills.includes(skill.name);
                  const extraCount = build.attunedSkills.filter(s => !lockedSkills.includes(s)).length;
                  return (
                    <button key={skill.name} type="button"
                      onClick={() => {
                        if (isLocked) return;
                        if (isAttuned) updateBuild({ attunedSkills: build.attunedSkills.filter(s => s !== skill.name) });
                        else if (extraCount < 2) updateBuild({ attunedSkills: [...build.attunedSkills, skill.name] });
                      }}
                      disabled={isLocked}
                      className={cn("flex items-center justify-between p-3 border text-left font-mono text-sm transition-colors",
                        isLocked ? "border-primary/40 bg-primary/5 text-primary cursor-not-allowed" :
                        isAttuned ? "border-chart-2 bg-chart-2/10 text-chart-2" :
                        "border-border text-muted-foreground hover:border-primary/40"
                      )}>
                      <span>{skill.name}</span>
                      <span className="text-[10px] opacity-60">{skill.attr.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* STEP 6: FEATS */}
          {step === 6 && (
            <Section title="Feats"
              subtitle={level >= 2 ? `Select up to ${featSlots} feat${featSlots !== 1 ? "s" : ""} for level ${level}.` : "Feats unlock at level 2."}>

              {/* Guild Rank Feat Choice */}
              {guildRankData && (
                <div className="p-4 border border-primary/30 bg-primary/5 space-y-3 mb-6">
                  <p className="text-xs font-mono text-primary uppercase tracking-widest">
                    Guild Rank Feat — {guildRankData.title} ({build.guild})
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">Choose one feat granted by your guild rank. This is in addition to your regular feat slots.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {guildRankData.featChoices.map(f => (
                      <button key={f} type="button"
                        onClick={() => updateBuild({ guildFeatChoice: f })}
                        className={cn("p-3 border text-left font-mono text-sm transition-all",
                          build.guildFeatChoice === f
                            ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(180,120,60,0.2)]"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}>
                        {build.guildFeatChoice === f ? "● " : "○ "}{f}
                      </button>
                    ))}
                  </div>
                  {!build.guildFeatChoice && (
                    <p className="text-[10px] font-mono text-destructive/70 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> You must choose one guild feat to continue.
                    </p>
                  )}
                </div>
              )}

              {level < 2 ? (
                <div className="py-8 text-center font-mono text-muted-foreground text-sm">No feat slots at level 1.</div>
              ) : (
                <>
                  <div className="mb-4 p-3 border border-primary/20 bg-primary/5 font-mono text-xs flex items-center justify-between">
                    <span>
                      <span className="text-primary font-bold">{build.selectedFeats.length}</span>
                      <span className="text-muted-foreground"> / {featSlots} feat slots filled</span>
                    </span>
                  </div>

                  {build.selectedFeats.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Selected</p>
                      {build.selectedFeats.map(featName => {
                        const featDef = FEATS.find(f => f.name === featName);
                        return (
                          <div key={featName} className="p-3 border border-chart-2/30 bg-chart-2/5 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm text-foreground">{featName}</div>
                              {featDef && <p className="text-xs font-mono text-muted-foreground mt-1">{featDef.desc}</p>}
                            </div>
                            <button type="button" onClick={() => updateBuild({ selectedFeats: build.selectedFeats.filter(f => f !== featName) })}
                              className="text-xs font-mono text-muted-foreground/50 hover:text-destructive transition-colors">× Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {build.selectedFeats.length < featSlots && (
                    <div className="space-y-4">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Available Feats</p>
                      {(["utility", "combat", "defense", "magic"] as const).map(cat => {
                        const catFeats = FEATS.filter(f => f.category === cat && f.minLevel <= level && !build.selectedFeats.includes(f.name));
                        if (!catFeats.length) return null;
                        return (
                          <div key={cat}>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/30 pb-1">{cat}</p>
                            <div className="space-y-2">
                              {catFeats.map(feat => (
                                <button key={feat.name} type="button"
                                  onClick={() => updateBuild({ selectedFeats: [...build.selectedFeats, feat.name] })}
                                  className="w-full text-left p-3 border border-border hover:border-primary/50 bg-background transition-colors">
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-mono text-sm text-foreground">{feat.name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground ml-2">Lv{feat.minLevel}</span>
                                  </div>
                                  <p className="text-xs font-mono text-muted-foreground">{feat.desc}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {/* STEP 7: REVIEW */}
          {step === 7 && (
            <Section title="Review" subtitle="Confirm your weaver before entering the Weave.">
              <div className="space-y-4 font-mono text-sm">
                {build.avatarDataUrl && (
                  <div className="flex justify-center mb-4">
                    <img src={build.avatarDataUrl} alt="Portrait" className="w-24 h-24 object-cover border border-primary/40 shadow-[0_0_20px_rgba(180,120,60,0.2)]" />
                  </div>
                )}
                <ReviewRow label="Name" value={build.name} />
                <ReviewRow label="Level" value={String(build.level)} />
                <ReviewRow label="Affinity" value={build.affinity} />
                <ReviewRow label="Guild" value={build.guild} />
                {build.guildRank && <ReviewRow label="Guild Rank" value={build.guildRank} />}
                {build.guildFeatChoice && <ReviewRow label="Guild Feat" value={build.guildFeatChoice} />}
                <ReviewRow label="Background" value={build.background} />
                <ReviewRow label="Primary Mode" value={build.primaryMode ? `${build.primaryMode} (Harmony)` : "—"} />
                {level >= 4 && build.secondaryModes.some(m => m) && (
                  <ReviewRow label="Secondary Modes" value={build.secondaryModes.filter(m => m).join(", ") + " (Normal)"} />
                )}
                {level >= 7 && build.tertiaryModes.some(m => m) && (
                  <ReviewRow label="Tertiary Modes" value={build.tertiaryModes.filter(m => m).join(", ") + " (Normal)"} />
                )}
                <ReviewRow label="Strings" value={build.selectedStrings.filter(s => s.trim()).join(", ") || "None"} />
                {build.selectedFeats.length > 0 && (
                  <ReviewRow label="Feats" value={build.selectedFeats.join(", ")} />
                )}

                {guildRankData && (
                  <div className="pt-2 pb-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Guild Rank Bonuses</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(guildRankData.statBonuses).map(([k, v]) => (
                        <BonusBadge key={k} attrKey={k} value={v as number} />
                      ))}
                    </div>
                    {guildRankData.attunements.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {guildRankData.attunements.map(a => (
                          <span key={a} className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Final Attributes</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ATTRIBUTE_DEFS.map(a => (
                      <div key={a.key} className="text-center p-2 border border-border/50">
                        <div className="text-[10px] text-muted-foreground">{a.abbr}</div>
                        <div className="text-lg text-foreground">{totalAttrs[a.key as AttrKey]}</div>
                        <div className="text-xs text-primary">{calcMod(totalAttrs[a.key as AttrKey]) >= 0 ? "+" : ""}{calcMod(totalAttrs[a.key as AttrKey])}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Attuned Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set([...build.attunedSkills, ...guildAttunements])].map(s => (
                      <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4">
                  <label className="block text-xs font-mono text-muted-foreground tracking-wider uppercase mb-1.5">Weaver Signature (optional)</label>
                  <textarea className="input-field min-h-[80px] resize-none" value={build.signature}
                    onChange={e => updateBuild({ signature: e.target.value })}
                    placeholder="Visual: ..., Auditory: ..., Tactile: ..."
                  />
                </div>
              </div>
            </Section>
          )}

          {/* Navigation */}
          <div className="space-y-2 pt-2">
            {submitError && (
              <div className="w-full px-3 py-2 bg-destructive/10 border border-destructive/40 font-mono text-xs text-destructive">
                ⚠ {submitError}
              </div>
            )}
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                className="px-4 py-2 font-mono text-sm border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                ← BACK
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                  className="px-6 py-2 font-mono text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-all hover:shadow-[0_0_15px_rgba(180,120,60,0.3)]">
                  CONTINUE →
                </button>
              ) : (
                <button type="button" onClick={handleFinish} disabled={isPending}
                  className="px-6 py-2 font-mono text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-[0_0_15px_rgba(180,120,60,0.3)]">
                  {isPending ? "WEAVING..." : charId ? "SAVE CHANGES" : "ENTER THE WEAVE →"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-32 space-y-4">
            <div className="border border-border/60 bg-card/60 p-4 font-mono text-xs">
              <div className="text-muted-foreground/50 uppercase tracking-widest mb-3 text-[10px]">Character Preview</div>
              <div className="space-y-2.5">
                {build.name && <div><span className="text-muted-foreground/50">Name </span><span className="text-foreground">{build.name}</span></div>}
                {build.affinity && <div><span className="text-muted-foreground/50">Affinity </span><span className="text-chart-2">{build.affinity}</span></div>}
                {build.guild && <div><span className="text-muted-foreground/50">Guild </span><span className="text-foreground text-[10px]">{build.guild.replace("The ", "")}</span></div>}
                {build.guildRank && <div><span className="text-muted-foreground/50">Rank </span><span className="text-primary">{build.guildRank}</span></div>}
                {build.background && <div><span className="text-muted-foreground/50">Background </span><span className="text-foreground">{build.background}</span></div>}
                {build.primaryMode && <div><span className="text-muted-foreground/50">Mode </span><span className="text-primary">{build.primaryMode}</span></div>}
                <div><span className="text-muted-foreground/50">Level </span><span className="text-foreground">{build.level}</span></div>
              </div>
              {(build.background || guildRankData) && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                  {ATTRIBUTE_DEFS.map(a => {
                    const val = totalAttrs[a.key as AttrKey];
                    const mod = calcMod(val);
                    return (
                      <div key={a.key} className="flex justify-between">
                        <span className="text-muted-foreground/50">{a.abbr}</span>
                        <span className="text-foreground">{val} <span className="text-primary/70">({mod >= 0 ? "+" : ""}{mod})</span></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
