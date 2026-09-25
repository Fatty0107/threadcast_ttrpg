import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateCharacter, useUpdateCharacter, useGetCharacter, getGetCharacterQueryKey, getListCharactersQueryKey } from "@workspace/api-client-react";
import {
  BACKGROUNDS, GUILDS, ALL_MODES, ALL_SKILLS, FEATS, ATTRIBUTE_DEFS,
  GUILD_RANKS_DATA, getGuildRankData, getGuildRanksForGuild, getGuildEntryRankTitle,
  type AttrKey, type Attributes,
  calcMod, calcVPMax, calcThreadPool, calcSafeLimit, calcGuardRating, calcWardRating,
  getRefinementBonus,
} from "@/lib/ttrpg-data";
import { useHomebrew } from "@/contexts/HomebrewContext";
import { CREATION_AFFINITIES, getCreationAffinity } from "@/lib/creation-affinities";
import { rollDie } from "@/lib/dice-style";
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
const POINT_BUY_MIN = 8;
const POINT_BUY_MAX = 16;
type AttributeMethod = "point-buy" | "manual" | "rolled";

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

function pointsSpent(attrs: Attributes): number {
  return Object.values(attrs).reduce((sum, score) => sum + score, 0);
}

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
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-[family-name:'Cinzel',serif] text-foreground">{title}</h2>
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
interface RolledSlot {
  dice: number[];
  value: number;
  assignedTo: AttrKey | "";
}

function rollOneSlot(): RolledSlot {
  const dice = Array.from({ length: 4 }, () => rollDie(6));
  const sorted = [...dice].sort((a, b) => a - b);
  return { dice, value: sorted[1] + sorted[2] + sorted[3], assignedTo: "" };
}

function parseManualScore(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 1 ? score : null;
}

function emptySlot(): RolledSlot {
  return { dice: [], value: 0, assignedTo: "" };
}

// ---- Main Component ----
export default function CharacterBuilder({ charId }: { charId?: string }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateCharacter();
  const updateMutation = useUpdateCharacter();
  const { data: existingChar, isError: characterLoadError } = useGetCharacter(charId ? parseInt(charId) : 0, {
    query: { enabled: !!charId } as any,
  });
  const { getAffinityStrings, getAvailableAffinityNames, publishedAffinities, isLoading: homebrewLoading } = useHomebrew();

  const [step, setStep] = useState(0);
  const [build, setBuild] = useState<BuildState>(DEFAULT_BUILD);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [populated, setPopulated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attrMethod, setAttrMethod] = useState<AttributeMethod>("manual");
  const pointBuyScoresRef = useRef<Attributes>({ ...DEFAULT_BASE });
  const unrestrictedScoresRef = useRef<Attributes>({ ...DEFAULT_BASE });
  const [scoreDrafts, setScoreDrafts] = useState<Partial<Record<AttrKey, string>>>({});
  const [rolledGroups, setRolledGroups] = useState<{ slots: RolledSlot[] }[]>([]);
  const [appliedRolledScores, setAppliedRolledScores] = useState(false);

  useEffect(() => {
    if (!existingChar || populated) return;
    const data = (existingChar.data as any) || {};
    const savedAttrs = data.baseAttributes || data.attributes;
    const baseAttrs: Attributes = savedAttrs ? {
      pot: savedAttrs.pot ?? 10, ctr: savedAttrs.ctr ?? 10,
      res: savedAttrs.res ?? 10, acu: savedAttrs.acu ?? 10,
      pre: savedAttrs.pre ?? 10, ths: savedAttrs.ths ?? 10,
    } : { ...DEFAULT_BASE };
    const savedMethod: AttributeMethod = data.attributeMethod === "point-buy" || data.attributeMethod === "rolled"
      ? data.attributeMethod : "manual";
    pointBuyScoresRef.current = Object.values(baseAttrs).every(v => v >= POINT_BUY_MIN && v <= POINT_BUY_MAX)
      && pointsSpent(baseAttrs) <= POINT_BUY_TOTAL ? { ...baseAttrs } : { ...DEFAULT_BASE };
    unrestrictedScoresRef.current = { ...baseAttrs };
    setAttrMethod(savedMethod);
    setAppliedRolledScores(savedMethod === "rolled");
    setBuild({
      name: existingChar.name || "",
      avatarDataUrl: data.avatarDataUrl || "",
      level: existingChar.level || 1,
      affinity: existingChar.affinity || "",
      guild: data.guild || "",
      guildRank: data.guildRank || "",
      guildFeatChoice: data.guildFeatChoice || "",
      background: data.background || "",
      flexAttrBonus: data.flexAttrBonus || "",
      baseAttrs,
      primaryMode: data.primaryMode || existingChar.mode || "",
      secondaryModes: [data.secondaryMode || "", data.secondaryMode2 || ""],
      tertiaryModes: [data.tertiaryMode || "", data.tertiaryMode2 || ""],
      // Stored attunements include automatic background and guild grants. In the
      // builder, only the two additional player choices are editable.
      attunedSkills: [...new Set(((Array.isArray(data.attunedSkills) ? data.attunedSkills : []) as string[]).filter((skill: string) =>
        ALL_SKILLS.some(known => known.name === skill) &&
        !BACKGROUNDS.find(b => b.name === data.background)?.startingSkills.includes(skill) &&
        !getGuildRankData(data.guild || "", data.guildRank || "")?.attunements.includes(skill)))],
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
  const level = build.level;
  const stringBudget = getStringBudget(level);
  const featSlots = getFeatSlots(level);
  const affinityNames = ["Water", ...CREATION_AFFINITIES.map(a => a.name), ...getAvailableAffinityNames()];
  const availableAffinities = affinityNames.filter((name, index) =>
    affinityNames.findIndex(other => other.toLowerCase() === name.toLowerCase()) === index
  );
  const affinityStrings = publishedAffinities.some(a => a.name === build.affinity)
    ? getAffinityStrings(build.affinity)
    : getCreationAffinity(build.affinity)?.strings ?? getAffinityStrings(build.affinity);

  function updateBuild(patch: Partial<BuildState> | ((prev: BuildState) => Partial<BuildState>)) {
    setBuild(prev => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
    setSubmitError(null);
  }

  function setManualScore(key: AttrKey, text: string) {
    setScoreDrafts(prev => ({ ...prev, [key]: text }));
    const score = parseManualScore(text);
    if (score !== null) {
      const next = { ...unrestrictedScoresRef.current, [key]: score };
      unrestrictedScoresRef.current = next;
      updateBuild({ baseAttrs: next });
      setAppliedRolledScores(false);
    }
  }

  function setPointBuyScore(key: AttrKey, value: number) {
    if (value < POINT_BUY_MIN || value > POINT_BUY_MAX) return;
    const next = { ...pointBuyScoresRef.current, [key]: value };
    if (pointsSpent(next) > POINT_BUY_TOTAL) return;
    pointBuyScoresRef.current = next;
    updateBuild({ baseAttrs: next });
  }

  function switchAttrMethod(method: AttributeMethod) {
    if (method === attrMethod) return;
    if (attrMethod === "point-buy") pointBuyScoresRef.current = { ...build.baseAttrs };
    else unrestrictedScoresRef.current = { ...build.baseAttrs };
    setAttrMethod(method);
    setScoreDrafts({});
    updateBuild({ baseAttrs: { ...(method === "point-buy" ? pointBuyScoresRef.current : unrestrictedScoresRef.current) } });
  }

  function addRolledGroup() {
    setRolledGroups(prev => [...prev, { slots: Array.from({ length: 6 }, emptySlot) }]);
  }

  function deleteGroup(gi: number) {
    setRolledGroups(prev => prev.filter((_, i) => i !== gi));
    setAppliedRolledScores(false);
  }

  function rollSlot(gi: number, si: number) {
    setAppliedRolledScores(false);
    setRolledGroups(prev => prev.map((g, i) => {
      if (i !== gi) return g;
      return { slots: g.slots.map((s, j) => j === si ? rollOneSlot() : s) };
    }));
  }

  function rollGroup(gi: number) {
    setAppliedRolledScores(false);
    setRolledGroups(prev => prev.map((g, i) =>
      i === gi ? { slots: Array.from({ length: 6 }, rollOneSlot) } : g
    ));
  }

  function resetGroup(gi: number) {
    setAppliedRolledScores(false);
    setRolledGroups(prev => prev.map((g, i) =>
      i === gi ? { slots: Array.from({ length: 6 }, emptySlot) } : g
    ));
  }

  function assignSlot(gi: number, si: number, key: AttrKey | "") {
    setAppliedRolledScores(false);
    setRolledGroups(prev => prev.map((g, i) => {
      if (i !== gi) return g;
      return { slots: g.slots.map((s, j) => j === si ? { ...s, assignedTo: key } : s) };
    }));
  }

  function applyGroup(gi: number) {
    const group = rolledGroups[gi];
    if (!group || !group.slots.every(s => s.dice.length === 4 && s.assignedTo)
      || new Set(group.slots.map(s => s.assignedTo)).size !== ATTRIBUTE_DEFS.length) return;
    const next = { ...unrestrictedScoresRef.current };
    group.slots.forEach(s => {
      if (s.assignedTo && s.value > 0) next[s.assignedTo] = s.value;
    });
    unrestrictedScoresRef.current = next;
    updateBuild({ baseAttrs: next });
    setAppliedRolledScores(true);
  }

  function canAdvance(checkStep = step): boolean {
    if (checkStep === 0) {
      if (!build.name.trim() || !build.affinity || !build.guild) return false;
      if (build.guild !== "None (Independent)") {
        if (guildRanks.length > 0 && !build.guildRank) return false;
      }
      return true;
    }
    if (checkStep === 1) return build.background !== "" && (!bg?.flexBonus || build.flexAttrBonus !== "");
    if (checkStep === 2) {
      if (attrMethod === "point-buy") {
        return Object.values(build.baseAttrs).every(v => Number.isInteger(v) && v >= POINT_BUY_MIN && v <= POINT_BUY_MAX)
          && pointsSpent(build.baseAttrs) <= POINT_BUY_TOTAL;
      }
      return Object.values(build.baseAttrs).every(v => Number.isSafeInteger(v) && v >= 1)
        && (attrMethod !== "rolled" || appliedRolledScores)
        && (attrMethod !== "manual" || Object.values(scoreDrafts).every(text => parseManualScore(text) !== null));
    }
    if (checkStep === 3) {
      if (!build.primaryMode) return false;
      if (level >= 4 && (!build.secondaryModes[0] || !build.secondaryModes[1])) return false;
      if (level >= 7 && (!build.tertiaryModes[0] || !build.tertiaryModes[1])) return false;
      return true;
    }
    if (checkStep === 4) {
      const chosen = build.selectedStrings.map(s => s.trim());
      return chosen.every(Boolean) && chosen.length <= stringBudget && new Set(chosen).size === chosen.length;
    }
    if (checkStep === 5) return build.attunedSkills.length === 2 &&
      build.attunedSkills.every(s => ALL_SKILLS.some(skill => skill.name === s) && !lockedSkills.includes(s));
    if (checkStep === 6) return (!guildRankData || guildRankData.featChoices.includes(build.guildFeatChoice)) &&
      build.selectedFeats.length <= featSlots &&
      build.selectedFeats.every(f => FEATS.some(feat => feat.name === f && feat.minLevel <= level));
    return true;
  }

  async function handleFinish() {
    const invalidStep = STEPS.findIndex((_, index) => index < STEPS.length - 1 && !canAdvance(index));
    if (invalidStep !== -1) {
      setStep(invalidStep);
      setSubmitError(invalidStep === 5 ? "Choose exactly 2 additional Attuned skills before saving." :
        `Review the ${STEPS[invalidStep].label.toLowerCase()} choices before saving.`);
      return;
    }
    if (charId && !existingChar) {
      setSubmitError("Character is still loading. Please try again.");
      return;
    }
    const total = getTotalAttrs(build);
    const grd = getGuildRankData(build.guild, build.guildRank);
    const guildAttunements = grd?.attunements ?? [];
    const allAttunedSkills = [...new Set([...(bg?.startingSkills ?? []), ...guildAttunements, ...build.attunedSkills])];
    const allFeats = [...build.selectedFeats];
    if (build.guildFeatChoice && !allFeats.includes(build.guildFeatChoice)) {
      allFeats.unshift(build.guildFeatChoice);
    }

    const previousData = charId ? ((existingChar?.data as Record<string, any>) ?? {}) : {};
    const previousFeats: string[] = Array.isArray(previousData.feats) ? previousData.feats : [];
    const assignedPreviousFeats = new Set<number>();
    const featChoices = Object.fromEntries(allFeats.flatMap((feat, index) => {
      const oldIndex = previousFeats.findIndex((name, i) => name === feat && !assignedPreviousFeats.has(i));
      if (oldIndex < 0) return [];
      assignedPreviousFeats.add(oldIndex);
      const choice = previousData.featChoices?.[String(oldIndex)];
      return choice === undefined ? [] : [[String(index), choice]];
    }));
    const vitalityMax = calcVPMax(total.res, level);
    const tensionPool = calcThreadPool(level, total.pot, total.ctr);
    const data = {
      ...previousData,
      avatarDataUrl: build.avatarDataUrl,
      attributeMethod: attrMethod,
      baseAttributes: build.baseAttrs,
      flexAttrBonus: build.flexAttrBonus,
      attributes: { pot: total.pot, ctr: total.ctr, res: total.res, acu: total.acu, pre: total.pre, ths: total.ths },
      vitalityPoints: { ...previousData.vitalityPoints, current: Math.min(vitalityMax,
        Number.isFinite(previousData.vitalityPoints?.current) ? Math.max(0, previousData.vitalityPoints.current) : vitalityMax), max: vitalityMax },
      tension: { ...previousData.tension, current: Math.min(tensionPool,
        Number.isFinite(previousData.tension?.current) ? Math.max(0, previousData.tension.current) : 0),
        pool: tensionPool, safeLimit: calcSafeLimit(level, total.pot, total.ctr) },
      burnout: previousData.burnout ?? bg?.startingBurnout ?? 0,
      fatigue: previousData.fatigue ?? 0,
      corruption: previousData.corruption ?? 0,
      guardRating: calcGuardRating(total.res),
      wardRating: calcWardRating(total.ctr),
      background: build.background,
      guild: build.guild,
      guildRank: build.guildRank,
      guildFeatChoice: build.guildFeatChoice,
      primaryMode: build.primaryMode,
      secondaryMode: level >= 4 ? build.secondaryModes[0] : "",
      secondaryMode2: level >= 4 ? build.secondaryModes[1] : "",
      tertiaryMode: level >= 7 ? build.tertiaryModes[0] : "",
      tertiaryMode2: level >= 7 ? build.tertiaryModes[1] : "",
      refinementBonus: getRefinementBonus(level),
      attunedSkills: allAttunedSkills,
      strings: build.selectedStrings.filter(s => s.trim()),
      techniques: previousData.techniques ?? [],
      feats: allFeats,
      featChoices,
      inventory: previousData.inventory ?? [],
      signature: build.signature,
      woundsNotes: previousData.woundsNotes ?? "",
      notes: previousData.notes ?? "",
      recoveryDiceCurrent: previousData.recoveryDiceCurrent ?? Math.max(0, calcMod(total.res) + 2),
    };

    setSubmitError(null);
    if (charId) {
      updateMutation.mutate(
        { id: parseInt(charId), data: { name: build.name, level: build.level, affinity: build.affinity, mode: build.primaryMode, data, expectedVersion: existingChar?.version } },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey(parseInt(charId)) });
            void queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
            setLocation(`/characters/${charId}`);
          },
          onError: (err: any) => setSubmitError(err?.message ?? "Failed to save. Please try again."),
        },
      );
    } else {
      createMutation.mutate(
        { data: { name: build.name, level: build.level, affinity: build.affinity, mode: build.primaryMode, isDraft: false, data } },
        {
          onSuccess: (char) => {
            void queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
            setLocation(`/characters/${char.id}`);
          },
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

  if (charId && !populated) {
    return (
      <div className="tc-page bg-background p-8 text-center font-mono text-sm text-muted-foreground">
        {characterLoadError ? "Character could not be loaded. Return to your characters and try again." : "Loading character choices…"}
      </div>
    );
  }

  return (
    <div className="tc-page bg-background">
      {/* Progress Header */}
      <div className="border-b border-border bg-card/95 sticky top-[calc(4rem+51px)] md:top-16 z-30 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-0 overflow-x-auto py-2.5" aria-label="Character creation progress">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 font-mono text-xs transition-all",
                    i === step ? "text-primary border-b-2 border-primary" :
                    i < step ? "text-muted-foreground hover:text-foreground cursor-pointer" :
                    "text-muted-foreground/70 cursor-not-allowed"
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                {getCreationAffinity(build.affinity) && (
                  <p className="text-[10px] font-mono text-muted-foreground/70 mt-2 leading-relaxed">
                    {getCreationAffinity(build.affinity)?.description}
                  </p>
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
                  <Select value={build.guildRank} onValueChange={v => updateBuild(prev => ({
                    guildRank: v, guildFeatChoice: "",
                    attunedSkills: prev.attunedSkills.filter(s => !getGuildRankData(prev.guild, v)?.attunements.includes(s)),
                  }))}>
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
                  <button key={b.name} type="button" onClick={() => updateBuild(prev => ({
                    background: b.name, flexAttrBonus: "",
                    attunedSkills: prev.attunedSkills.filter(s => !b.startingSkills.includes(s)),
                  }))}
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
                ? "Spend up to 78 points across six base scores (8–16 each). Background and guild bonuses are added afterward."
                : attrMethod === "manual"
                  ? "Enter your own whole-number base scores. There is no shared point total or 78-point cap; background and guild bonuses are added afterward."
                  : "Roll four six-sided dice for each score, drop the lowest die, and add the other three (3–18 per roll). Assign the six results, then apply them. There is no total cap."}
            >
              {/* Method selector */}
              <div className="flex flex-wrap gap-2 mb-5">
                {(["point-buy", "manual", "rolled"] as const).map(m => (
                  <button key={m} type="button" onClick={() => switchAttrMethod(m)}
                    aria-pressed={attrMethod === m}
                    className={cn("px-3 py-1.5 text-xs font-mono border transition-colors",
                      attrMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    )}>
                    {m === "point-buy" ? "POINT-BUY (78)" : m === "manual" ? "ENTER SCORES" : "ROLL 4D6"}
                  </button>
                ))}
              </div>

              {attrMethod !== "rolled" ? (
                <>
                  <div className="inline-block px-3 py-1 font-mono text-xs mb-4 border border-border text-muted-foreground">
                    {attrMethod === "point-buy"
                      ? `${POINT_BUY_TOTAL - pointsSpent(build.baseAttrs)} points remaining of ${POINT_BUY_TOTAL}`
                      : `Base score total: ${pointsSpent(build.baseAttrs)} · No point cap`}
                  </div>
                  <div className="space-y-2">
                    {ATTRIBUTE_DEFS.map(attr => {
                      const base = build.baseAttrs[attr.key as AttrKey];
                      const draft = scoreDrafts[attr.key as AttrKey];
                      const invalid = attrMethod === "manual" && draft !== undefined && parseManualScore(draft) === null;
                      const bgBonus = bg?.attrBonuses[attr.key as AttrKey] ?? 0;
                      const flexBonus = build.flexAttrBonus === attr.key ? 1 : 0;
                      const rankBonus = guildRankData?.statBonuses[attr.key as AttrKey] ?? 0;
                      const total = base + bgBonus + flexBonus + rankBonus;
                      const mod = calcMod(total);
                      const totalBonus = bgBonus + flexBonus + rankBonus;
                      return (
                        <div key={attr.key} className="flex items-center gap-4 p-3 border border-border/60 hover:border-border bg-card/40 transition-colors">
                          <div className="w-32">
                            <div className="flex items-center gap-1.5 font-mono text-sm text-foreground">
                              <span className="text-primary/60">{ATTR_ICONS[attr.key as AttrKey]}</span>
                              {attr.abbr}
                            </div>
                            <div className="text-[10px] text-muted-foreground/60">{attr.label}</div>
                          </div>
                          {attrMethod === "point-buy" ? (
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setPointBuyScore(attr.key as AttrKey, base - 1)}
                                disabled={base <= POINT_BUY_MIN} aria-label={`Decrease ${attr.label}`}
                                className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono transition-colors">−</button>
                              <span className="w-8 text-center font-mono text-lg">{base}</span>
                              <button type="button" onClick={() => setPointBuyScore(attr.key as AttrKey, base + 1)}
                                disabled={base >= POINT_BUY_MAX || pointsSpent(build.baseAttrs) >= POINT_BUY_TOTAL}
                                aria-label={`Increase ${attr.label}`}
                                className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono transition-colors">+</button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                inputMode="numeric"
                                aria-label={`${attr.label} base score`}
                                aria-invalid={invalid}
                                data-testid={`input-base-${attr.key}`}
                                value={draft ?? base}
                                onChange={event => setManualScore(attr.key as AttrKey, event.target.value)}
                                onBlur={() => {
                                  if (!invalid) {
                                    setScoreDrafts(prev => {
                                      const next = { ...prev };
                                      delete next[attr.key as AttrKey];
                                      return next;
                                    });
                                  }
                                }}
                                className={cn("w-20 h-9 px-2 text-center font-mono text-lg bg-background border focus:outline-none focus:border-primary",
                                  invalid ? "border-destructive" : "border-border")}
                              />
                              {invalid && <span className="text-[10px] text-destructive font-mono">Whole number, 1 or more</span>}
                            </div>
                          )}
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
                </>
              ) : (
                <>
                  {/* Rolled groups */}
                  <div className="space-y-4">
                    {rolledGroups.map((group, gi) => {
                      const allRolled = group.slots.every(s => s.dice.length > 0);
                      const allAssigned = allRolled && group.slots.every(s => s.assignedTo !== "");
                      const groupTotal = group.slots.reduce((sum, s) => sum + s.value, 0);
                      return (
                        <div key={gi} className="border border-border/60 bg-card/30">
                          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/60">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                              Group {gi + 1}{allRolled ? ` — Total: ${groupTotal}` : ""}
                            </span>
                            <button type="button" onClick={() => deleteGroup(gi)}
                              className="text-[10px] font-mono text-destructive/50 hover:text-destructive border border-destructive/20 hover:border-destructive/50 px-2 py-0.5 transition-colors">
                              DELETE GROUP
                            </button>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                              {group.slots.map((slot, si) => {
                                const isRolled = slot.dice.length > 0;
                                const minDieIdx = isRolled
                                  ? slot.dice.reduce((minI, v, i, arr) => v < arr[minI] ? i : minI, 0)
                                  : -1;
                                return (
                                  <div key={si} className="flex flex-col items-center gap-1.5">
                                    {/* Rolled value */}
                                    <div className="w-14 h-14 flex items-center justify-center border border-border/60 bg-background font-mono text-2xl text-foreground">
                                      {isRolled ? slot.value : <span className="text-muted-foreground/30 text-base">—</span>}
                                    </div>
                                    {/* Individual dice (or spacer) */}
                                    <div className="flex gap-0.5 h-5 items-center">
                                      {isRolled ? slot.dice.map((d, di) => (
                                        <div key={di} className={cn(
                                          "w-5 h-5 flex items-center justify-center text-[9px] font-mono border",
                                          di === minDieIdx
                                            ? "border-border/20 text-muted-foreground/25"
                                            : "border-primary/30 text-foreground/70"
                                        )}>{d}</div>
                                      )) : <div className="h-5" />}
                                    </div>
                                    {/* Attribute dropdown */}
                                    <select
                                      value={slot.assignedTo}
                                      onChange={e => assignSlot(gi, si, e.target.value as AttrKey | "")}
                                      disabled={!isRolled}
                                      className="w-full text-[10px] font-mono bg-background border border-border/60 px-1 py-0.5 disabled:opacity-30 focus:outline-none focus:border-primary"
                                    >
                                      <option value="">—</option>
                                      {ATTRIBUTE_DEFS.map(a => (
                                        <option key={a.key} value={a.key}
                                          disabled={group.slots.some((s2, j) => j !== si && s2.assignedTo === a.key)}>
                                          {a.abbr} — {a.label}
                                        </option>
                                      ))}
                                    </select>
                                    {/* Roll button */}
                                    <button type="button" onClick={() => rollSlot(gi, si)}
                                      className="w-full text-[10px] font-mono border border-primary/40 text-primary hover:bg-primary/10 py-1 transition-colors">
                                      ROLL
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => rollGroup(gi)}
                                className="text-xs font-mono border border-primary/40 text-primary hover:bg-primary/10 px-3 py-1.5 transition-colors">
                                ROLL ALL SIX
                              </button>
                              <button type="button" onClick={() => resetGroup(gi)}
                                className="text-xs font-mono border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 px-3 py-1.5 transition-colors">
                                RESET GROUP
                              </button>
                              <button type="button" onClick={() => applyGroup(gi)} disabled={!allAssigned}
                                className="text-xs font-mono border border-primary/60 bg-primary/5 text-primary hover:bg-primary/15 disabled:opacity-30 px-3 py-1.5 transition-colors">
                                APPLY SCORES
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" onClick={addRolledGroup}
                    className="w-full mt-4 py-3 text-xs font-mono border border-dashed border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                    + ADD GROUP — 6 rolls of 4d6 drop lowest
                  </button>

                  {/* Applied scores summary */}
                  {Object.values(build.baseAttrs).some(v => v !== 10) && (
                    <div className="mt-4 p-3 border border-primary/20 bg-primary/5">
                      <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-3">Applied Scores</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        {ATTRIBUTE_DEFS.map(attr => {
                          const base = build.baseAttrs[attr.key as AttrKey];
                          const bgBonus = bg?.attrBonuses[attr.key as AttrKey] ?? 0;
                          const flexBonus = build.flexAttrBonus === attr.key ? 1 : 0;
                          const rankBonus = guildRankData?.statBonuses[attr.key as AttrKey] ?? 0;
                          const total = base + bgBonus + flexBonus + rankBonus;
                          const mod = calcMod(total);
                          return (
                            <div key={attr.key}>
                              <div className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">{attr.abbr}</div>
                              <div className="text-xl font-mono text-foreground">{total}</div>
                              <div className="text-[10px] font-mono text-primary">({mod >= 0 ? "+" : ""}{mod})</div>
                              {(bgBonus + flexBonus + rankBonus) > 0 && (
                                <div className="text-[8px] font-mono text-chart-2">base {base}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Derived stats — both modes */}
              {bg && (
                <div className="mt-4 p-3 border border-border/50 bg-muted/20 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-muted-foreground">
                  <StatPreview label="Max VP" value={calcVPMax(totalAttrs.res, level)} />
                  <StatPreview label="Thread Pool" value={calcThreadPool(level, totalAttrs.pot, totalAttrs.ctr)} />
                  <StatPreview label="Safe Limit" value={calcSafeLimit(level, totalAttrs.pot, totalAttrs.ctr)} />
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
                        updateBuild(prev => ({
                          primaryMode: mode.name,
                          secondaryModes: prev.secondaryModes.map(m => m === mode.name ? "" : m) as [string, string],
                          tertiaryModes: prev.tertiaryModes.map(m => m === mode.name ? "" : m) as [string, string],
                        }));
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
                                updateBuild(prev => {
                                  if (prev.primaryMode === name || prev.secondaryModes[otherIdx] === name) return {};
                                  const next: [string, string] = [...prev.secondaryModes];
                                  next[idx] = next[idx] === name ? "" : name;
                                  return {
                                    secondaryModes: next,
                                    tertiaryModes: prev.tertiaryModes.map(m => next.includes(m) ? "" : m) as [string, string],
                                  };
                                });
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
                                updateBuild(prev => {
                                  if (prev.primaryMode === name || prev.secondaryModes.includes(name) || prev.tertiaryModes[otherIdx] === name) return {};
                                  const next: [string, string] = [...prev.tertiaryModes];
                                  next[idx] = next[idx] === name ? "" : name;
                                  return { tertiaryModes: next };
                                });
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
                          updateBuild(prev => ({
                            selectedStrings: prev.selectedStrings.includes(s.shortName)
                              ? prev.selectedStrings.filter(x => x !== s.shortName)
                              : prev.selectedStrings.filter(x => x.trim()).length < getStringBudget(prev.level)
                                ? [...prev.selectedStrings, s.shortName] : prev.selectedStrings,
                          }));
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
                          const value = e.target.value;
                          updateBuild(prev => ({ selectedStrings: prev.selectedStrings.map((s, j) => j === i ? value : s) }));
                        }}
                        placeholder="String name..."
                      />
                      <button type="button" onClick={() => updateBuild(prev => ({ selectedStrings: prev.selectedStrings.filter((_, j) => j !== i) }))}
                        className="text-muted-foreground/50 hover:text-destructive font-mono text-sm px-2 transition-colors">×</button>
                    </div>
                  ))}
                  {build.selectedStrings.length < stringBudget && (
                    <button type="button" onClick={() => updateBuild(prev => ({
                      selectedStrings: prev.selectedStrings.length < getStringBudget(prev.level)
                        ? [...prev.selectedStrings, ""] : prev.selectedStrings,
                    }))}
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
            <Section title="Skills" subtitle="Your background and guild rank grant starting skills automatically. Choose 2 more from the available skills below.">
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
                Additional attuned: {build.attunedSkills.length}/2 chosen
              </p>
              {build.attunedSkills.length !== 2 && (
                <p className="text-[10px] font-mono text-amber-500 mb-3">
                  Choose {2 - build.attunedSkills.length} more available skill{build.attunedSkills.length === 1 ? "" : "s"} to continue. Gold skills are already granted.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_SKILLS.map(skill => {
                  const isLocked = lockedSkills.includes(skill.name);
                  const isAttuned = build.attunedSkills.includes(skill.name);
                  return (
                    <button key={skill.name} type="button"
                      onClick={() => {
                        if (isLocked) return;
                        updateBuild(prev => ({
                          attunedSkills: prev.attunedSkills.includes(skill.name)
                            ? prev.attunedSkills.filter(s => s !== skill.name)
                            : prev.attunedSkills.length < 2 ? [...prev.attunedSkills, skill.name] : prev.attunedSkills,
                        }));
                      }}
                      disabled={isLocked}
                      aria-pressed={isAttuned || isLocked}
                      title={isLocked ? "Already granted by your background or guild rank" : undefined}
                      className={cn("flex items-center justify-between p-3 border text-left font-mono text-sm transition-colors",
                        isLocked ? "border-primary/40 bg-primary/5 text-primary cursor-not-allowed" :
                        isAttuned ? "border-chart-2 bg-chart-2/10 text-chart-2" :
                        "border-border text-muted-foreground hover:border-primary/40"
                      )}>
                      <span>{skill.name}</span>
                      <span className="text-[10px] opacity-60">{isLocked ? "GRANTED" : skill.attr.toUpperCase()}</span>
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
                            <button type="button" onClick={() => updateBuild(prev => ({ selectedFeats: prev.selectedFeats.filter(f => f !== featName) }))}
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
                                  onClick={() => updateBuild(prev => ({
                                    selectedFeats: prev.selectedFeats.includes(feat.name) || prev.selectedFeats.length >= getFeatSlots(prev.level)
                                      ? prev.selectedFeats : [...prev.selectedFeats, feat.name],
                                  }))}
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
                    {[...new Set([...bgStartingSkills, ...guildAttunements, ...build.attunedSkills])].map(s => (
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
          <div className="lg:sticky lg:top-36 self-start space-y-4">
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
