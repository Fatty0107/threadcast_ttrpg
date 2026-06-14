import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateCharacter, useUpdateCharacter, useGetCharacter } from "@workspace/api-client-react";
import {
  BACKGROUNDS, AFFINITIES, ALL_MODES, GUILDS, ALL_SKILLS, FEATS,
  ATTRIBUTE_DEFS, type AttrKey, type Attributes,
  calcMod, calcVPMax, calcThreadPool, calcSafeLimit, calcGuardRating, calcWardRating,
  getRefinementBonus, type Background,
} from "@/lib/ttrpg-data";
import { WATER_STRINGS } from "@/lib/affinity-data";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "identity", label: "Identity" },
  { id: "background", label: "Background" },
  { id: "attributes", label: "Attributes" },
  { id: "mode", label: "Mode" },
  { id: "strings", label: "Strings" },
  { id: "skills", label: "Skills" },
  { id: "feats", label: "Feats" },
  { id: "review", label: "Review" },
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
  const bonuses = bg?.attrBonuses ?? {};
  const result = { ...state.baseAttrs };
  for (const [k, v] of Object.entries(bonuses)) {
    result[k as AttrKey] = (result[k as AttrKey] ?? 10) + (v as number);
  }
  if (state.flexAttrBonus) {
    result[state.flexAttrBonus] = (result[state.flexAttrBonus] ?? 10) + 1;
  }
  return result;
}

function getStringBudget(level: number): number {
  let count = 2;
  for (let l = 2; l <= level; l++) {
    count += (l === 5 || l === 10) ? 2 : 1;
  }
  return count;
}

function getFeatSlots(level: number): number {
  return Math.floor(level / 2);
}

export default function CharacterBuilder({ charId }: { charId?: string }) {
  const [, setLocation] = useLocation();
  const createMutation = useCreateCharacter();
  const updateMutation = useUpdateCharacter();
  const { data: existingChar } = useGetCharacter(charId ? parseInt(charId) : 0, {
    query: { enabled: !!charId } as any,
  });

  const [step, setStep] = useState(0);
  const [build, setBuild] = useState<BuildState>(DEFAULT_BUILD);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [populated, setPopulated] = useState(false);

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
      background: data.background || "",
      flexAttrBonus: "",
      baseAttrs: data.attributes ? {
        pot: data.attributes.pot || 10,
        ctr: data.attributes.ctr || 10,
        res: data.attributes.res || 10,
        acu: data.attributes.acu || 10,
        pre: data.attributes.pre || 10,
        ths: data.attributes.ths || 10,
      } : DEFAULT_BASE,
      primaryMode: data.primaryMode || existingChar.mode || "",
      secondaryModes: [data.secondaryMode || "", data.secondaryMode2 || ""],
      tertiaryModes: [data.tertiaryMode || "", data.tertiaryMode2 || ""],
      attunedSkills: Array.isArray(data.attunedSkills) ? data.attunedSkills : [],
      selectedStrings: Array.isArray(data.strings) ? data.strings : [],
      selectedFeats: Array.isArray(data.feats) ? data.feats : [],
      signature: data.signature || "",
    });
    setPopulated(true);
  }, [existingChar?.id]);

  const bg = BACKGROUNDS.find(b => b.name === build.background);
  const totalAttrs = getTotalAttrs(build);
  const pointsLeft = POINT_BUY_TOTAL - pointsSpent(build.baseAttrs);
  const level = build.level;
  const stringBudget = getStringBudget(level);
  const featSlots = getFeatSlots(level);

  function updateBuild(patch: Partial<BuildState>) {
    setBuild(prev => ({ ...prev, ...patch }));
  }

  function setAttr(key: AttrKey, value: number) {
    if (value < ATTR_MIN) return;
    const next = { ...build.baseAttrs, [key]: value };
    const spent = (Object.values(next) as number[]).reduce((a, b) => a + b, 0);
    if (spent > POINT_BUY_TOTAL) return;
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
    if (step === 0) return build.name.trim().length > 0 && build.affinity !== "" && build.guild !== "";
    if (step === 1) return build.background !== "" && (!bg?.flexBonus || build.flexAttrBonus !== "");
    if (step === 2) return pointsLeft >= 0;
    if (step === 3) {
      if (!build.primaryMode) return false;
      if (level >= 4 && (!build.secondaryModes[0] || !build.secondaryModes[1])) return false;
      if (level >= 7 && (!build.tertiaryModes[0] || !build.tertiaryModes[1])) return false;
      return true;
    }
    return true;
  }

  async function handleFinish() {
    const total = getTotalAttrs(build);
    const data = {
      avatarDataUrl: build.avatarDataUrl,
      attributes: {
        pot: total.pot, ctr: total.ctr, res: total.res,
        acu: total.acu, pre: total.pre, ths: total.ths,
      },
      vitalityPoints: {
        current: calcVPMax(total.res, level),
        max: calcVPMax(total.res, level),
      },
      tension: {
        current: 0,
        pool: calcThreadPool(level, total.ths),
        safeLimit: calcSafeLimit(level, total.ctr),
      },
      burnout: bg?.startingBurnout ?? 0,
      fatigue: 0,
      corruption: 0,
      guardRating: calcGuardRating(total.res),
      wardRating: calcWardRating(total.ctr),
      background: build.background,
      guild: build.guild,
      guildRank: build.guildRank || (bg?.startingRank ?? ""),
      primaryMode: build.primaryMode,
      secondaryMode: build.secondaryModes[0],
      secondaryMode2: build.secondaryModes[1],
      tertiaryMode: build.tertiaryModes[0],
      tertiaryMode2: build.tertiaryModes[1],
      refinementBonus: getRefinementBonus(level),
      attunedSkills: build.attunedSkills,
      strings: build.selectedStrings.filter(s => s.trim()),
      techniques: [],
      feats: build.selectedFeats,
      inventory: [],
      signature: build.signature,
      woundsNotes: "",
      notes: "",
      recoveryDiceCurrent: Math.max(0, calcMod(total.res) + 2),
    };

    if (charId) {
      updateMutation.mutate({
        id: parseInt(charId),
        data: {
          name: build.name,
          level: build.level,
          affinity: build.affinity,
          mode: build.primaryMode,
          data,
        },
      }, { onSuccess: () => setLocation(`/characters/${charId}`) });
    } else {
      createMutation.mutate({
        data: {
          name: build.name,
          level: build.level,
          affinity: build.affinity,
          mode: build.primaryMode,
          isDraft: false,
          data,
        },
      }, { onSuccess: (char) => setLocation(`/characters/${char.id}`) });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const allModeNames = ALL_MODES.map(m => m.name);
  const secondaryAvailable = allModeNames.filter(m => m !== build.primaryMode);
  const tertiaryAvailable = allModeNames.filter(m => m !== build.primaryMode && !build.secondaryModes.includes(m));
  const waterStringOptions = WATER_STRINGS.map(s => s.shortName);

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Header */}
      <div className="border-b border-border bg-card sticky top-14 z-30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-0 overflow-x-auto py-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 font-mono text-xs transition-colors",
                    i === step
                      ? "text-primary border-b-2 border-primary"
                      : i < step
                      ? "text-muted-foreground hover:text-foreground cursor-pointer"
                      : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border",
                    i === step ? "border-primary text-primary" : i < step ? "border-muted-foreground bg-muted-foreground text-background" : "border-muted-foreground/40"
                  )}>
                    {i < step ? "✓" : i + 1}
                  </span>
                  {s.label.toUpperCase()}
                </button>
                {i < STEPS.length - 1 && <span className="text-muted-foreground/30 mx-1 text-xs">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 0: IDENTITY */}
          {step === 0 && (
            <Section title="Identity" subtitle="Who is this weaver? Set their name, portrait, level, and affiliation.">
              <Field label="Character Name">
                <input
                  className="input-field"
                  value={build.name}
                  onChange={e => updateBuild({ name: e.target.value })}
                  placeholder="Enter your weaver's name..."
                />
              </Field>

              <Field label="Character Portrait (optional)">
                <div className="flex items-start gap-4">
                  {build.avatarDataUrl ? (
                    <img src={build.avatarDataUrl} alt="Portrait" className="w-20 h-20 object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 border border-dashed border-border/50 flex items-center justify-center text-muted-foreground/30 text-[10px] font-mono flex-shrink-0">
                      NO IMAGE
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateBuild({ avatarDataUrl: reader.result as string });
                        reader.readAsDataURL(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-xs font-mono border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      {build.avatarDataUrl ? "CHANGE IMAGE" : "UPLOAD IMAGE"}
                    </button>
                    {build.avatarDataUrl && (
                      <button
                        type="button"
                        onClick={() => updateBuild({ avatarDataUrl: "" })}
                        className="ml-2 text-xs font-mono text-destructive/50 hover:text-destructive transition-colors"
                      >
                        × Remove
                      </button>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground">PNG, JPG, JPEG, or WebP.</p>
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
                  <p className="text-[10px] font-mono text-primary mt-2 space-x-2">
                    <span>{getStringBudget(build.level)} strings</span>
                    <span>·</span>
                    <span>{getFeatSlots(build.level)} feat{getFeatSlots(build.level) !== 1 ? "s" : ""}</span>
                    {build.level >= 4 && <><span>·</span><span>Secondary modes unlock</span></>}
                    {build.level >= 7 && <><span>·</span><span>Tertiary modes unlock</span></>}
                  </p>
                )}
              </Field>

              <Field label="Affinity">
                <p className="text-xs text-muted-foreground font-mono mb-2">Your magical element — the type of leyline you can grip.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {AFFINITIES.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => updateBuild({ affinity: a })}
                      className={cn(
                        "py-2 px-3 text-xs font-mono border transition-colors",
                        build.affinity === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Guild Affiliation">
                <div className="space-y-2">
                  {GUILDS.map(g => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => updateBuild({ guild: g.name })}
                      className={cn(
                        "w-full text-left p-3 border transition-colors",
                        build.guild === g.name
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="font-mono text-sm text-foreground">{g.name}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">{g.desc.split(".")[0]}.</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateBuild({ guild: "None (Independent)" })}
                    className={cn(
                      "w-full text-left p-3 border transition-colors",
                      build.guild === "None (Independent)"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-mono text-sm text-foreground">None (Independent)</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">No guild affiliation.</div>
                  </button>
                </div>
              </Field>
            </Section>
          )}

          {/* STEP 1: BACKGROUND */}
          {step === 1 && (
            <Section title="Background" subtitle="Where did you come from? This shapes your starting skills and attributes.">
              <div className="space-y-3">
                {BACKGROUNDS.map(b => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => updateBuild({ background: b.name, flexAttrBonus: "" })}
                    className={cn(
                      "w-full text-left p-4 border transition-colors",
                      build.background === b.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
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
                    {b.startingBurnout && (
                      <div className="mt-2 text-[10px] font-mono text-destructive">⚠ Starts with Burnout 1</div>
                    )}
                  </button>
                ))}
              </div>

              {bg?.flexBonus && (
                <div className="mt-4 p-4 border border-primary/30 bg-primary/5">
                  <p className="text-xs font-mono text-primary mb-3">Choose your +1 free attribute bonus:</p>
                  <div className="flex flex-wrap gap-2">
                    {ATTRIBUTE_DEFS.map(a => (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => updateBuild({ flexAttrBonus: a.key as AttrKey })}
                        className={cn(
                          "px-3 py-1.5 text-xs font-mono border transition-colors",
                          build.flexAttrBonus === a.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
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
              subtitle={`Distribute ${POINT_BUY_TOTAL} points across 6 attributes. Min: 8, Max: ${ATTR_MAX} before background bonuses.`}
            >
              <div className={cn(
                "inline-block px-3 py-1 font-mono text-sm mb-4 border",
                pointsLeft < 0 ? "border-destructive text-destructive bg-destructive/10" :
                pointsLeft === 0 ? "border-chart-2 text-chart-2 bg-chart-2/10" :
                "border-border text-muted-foreground"
              )}>
                {pointsLeft} points remaining
              </div>

              <div className="space-y-3">
                {ATTRIBUTE_DEFS.map(attr => {
                  const base = build.baseAttrs[attr.key as AttrKey];
                  const bonus = (bg?.attrBonuses[attr.key as AttrKey] ?? 0) + (build.flexAttrBonus === attr.key ? 1 : 0);
                  const total = base + bonus;
                  const mod = calcMod(total);
                  return (
                    <div key={attr.key} className="flex items-center gap-4 p-3 border border-border hover:border-border/80 bg-card">
                      <div className="w-28">
                        <div className="font-mono text-sm text-foreground">{attr.abbr}</div>
                        <div className="text-[10px] text-muted-foreground">{attr.label}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setAttr(attr.key as AttrKey, base - 1)} disabled={base <= ATTR_MIN} className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono">−</button>
                        <span className="w-8 text-center font-mono text-lg">{base}</span>
                        <button type="button" onClick={() => setAttr(attr.key as AttrKey, base + 1)} disabled={base >= ATTR_MAX || pointsLeft <= 0} className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono">+</button>
                      </div>
                      {bonus > 0 && <span className="text-xs font-mono text-chart-2">+{bonus} bg</span>}
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
                <div className="space-y-3">
                  {ALL_MODES.map(mode => (
                    <button
                      key={mode.name}
                      type="button"
                      onClick={() => {
                        const newSecondary: [string, string] = [
                          build.secondaryModes[0] === mode.name ? "" : build.secondaryModes[0],
                          build.secondaryModes[1] === mode.name ? "" : build.secondaryModes[1],
                        ];
                        updateBuild({ primaryMode: mode.name, secondaryModes: newSecondary });
                      }}
                      className={cn(
                        "w-full text-left p-4 border transition-colors",
                        build.primaryMode === mode.name
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-[family-name:'Cinzel',serif] text-base text-foreground">{mode.name}</span>
                        {build.primaryMode === mode.name && (
                          <span className="text-[10px] font-mono text-chart-2 bg-chart-2/10 border border-chart-2/30 px-2 py-0.5">HARMONY</span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-2">{mode.desc}</p>
                      <p className="text-xs font-mono text-primary/70 italic">"{mode.flavor}"</p>
                    </button>
                  ))}
                </div>
              </Section>

              {/* Secondary Modes — Level 4+ */}
              {level >= 4 && (
                <Section title="Secondary Modes (Level 4+)" subtitle="Choose 2 secondary modes. When casting in a secondary mode, roll Normal (1d20).">
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
                            <button
                              key={name}
                              type="button"
                              disabled={takenByOther}
                              onClick={() => {
                                const next: [string, string] = [...build.secondaryModes] as [string, string];
                                next[idx] = selected ? "" : name;
                                const newTertiary: [string, string] = [
                                  next.includes(build.tertiaryModes[0]) ? "" : build.tertiaryModes[0],
                                  next.includes(build.tertiaryModes[1]) ? "" : build.tertiaryModes[1],
                                ];
                                updateBuild({ secondaryModes: next, tertiaryModes: newTertiary });
                              }}
                              className={cn(
                                "p-2 text-xs font-mono border text-left transition-colors",
                                selected ? "border-chart-2 bg-chart-2/10 text-chart-2" :
                                takenByOther ? "border-border/20 text-muted-foreground/30 cursor-not-allowed" :
                                "border-border text-muted-foreground hover:border-primary/50"
                              )}
                            >
                              {selected ? "● " : "○ "}{name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Tertiary Modes — Level 7+ */}
              {level >= 7 && (
                <Section title="Tertiary Modes (Level 7+)" subtitle="Choose 2 tertiary modes. When casting in a tertiary mode, roll Discord (2d20 keep lowest).">
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
                            <button
                              key={name}
                              type="button"
                              disabled={takenByOther}
                              onClick={() => {
                                const next: [string, string] = [...build.tertiaryModes] as [string, string];
                                next[idx] = selected ? "" : name;
                                updateBuild({ tertiaryModes: next });
                              }}
                              className={cn(
                                "p-2 text-xs font-mono border text-left transition-colors",
                                selected ? "border-destructive/50 bg-destructive/10 text-destructive" :
                                takenByOther ? "border-border/20 text-muted-foreground/30 cursor-not-allowed" :
                                "border-border text-muted-foreground hover:border-primary/50"
                              )}
                            >
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
            <Section
              title="Strings"
              subtitle={`Select up to ${stringBudget} strings for level ${level}. Strings are magical abilities tied to your Affinity.`}
            >
              <div className="mb-4 p-3 border border-primary/20 bg-primary/5 font-mono text-xs flex items-center justify-between">
                <span>
                  <span className="text-primary font-bold">{build.selectedStrings.filter(s => s.trim()).length}</span>
                  <span className="text-muted-foreground"> / {stringBudget} strings selected</span>
                </span>
                <span className="text-muted-foreground/60">Level {level} budget</span>
              </div>

              {build.affinity === "Water" ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground mb-3">Known Water strings — select up to {stringBudget}:</p>
                  {waterStringOptions.map(sName => {
                    const selected = build.selectedStrings.includes(sName);
                    const filledCount = build.selectedStrings.filter(s => s.trim()).length;
                    const canAdd = !selected && filledCount < stringBudget;
                    return (
                      <button
                        key={sName}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            updateBuild({ selectedStrings: build.selectedStrings.filter(s => s !== sName) });
                          } else if (canAdd) {
                            updateBuild({ selectedStrings: [...build.selectedStrings, sName] });
                          }
                        }}
                        disabled={!selected && !canAdd}
                        className={cn(
                          "w-full text-left p-3 border font-mono text-sm transition-colors",
                          selected ? "border-chart-2 bg-chart-2/10 text-chart-2" :
                          canAdd ? "border-border text-muted-foreground hover:border-primary/50" :
                          "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                        )}
                      >
                        {selected ? "● " : "○ "}{sName}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    {build.affinity
                      ? `Enter ${build.affinity} affinity string names:`
                      : "Select an affinity in step 1 to see predefined strings, or enter custom names below."}
                  </p>
                  {build.selectedStrings.map((sName, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="flex-1 bg-background border border-border px-3 py-1.5 font-mono text-sm focus:outline-none focus:border-primary"
                        value={sName}
                        onChange={e => {
                          const next = [...build.selectedStrings];
                          next[i] = e.target.value;
                          updateBuild({ selectedStrings: next });
                        }}
                        placeholder="String name..."
                      />
                      <button
                        type="button"
                        onClick={() => updateBuild({ selectedStrings: build.selectedStrings.filter((_, j) => j !== i) })}
                        className="text-muted-foreground/50 hover:text-destructive font-mono text-sm px-2 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {build.selectedStrings.length < stringBudget && (
                    <button
                      type="button"
                      onClick={() => updateBuild({ selectedStrings: [...build.selectedStrings, ""] })}
                      className="w-full py-2 text-xs font-mono border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      + ADD STRING ({build.selectedStrings.length}/{stringBudget})
                    </button>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* STEP 5: SKILLS */}
          {step === 5 && (
            <Section title="Skills" subtitle="Your background grants starting skills. Choose 2 additional Attuned skills.">
              {bg && (
                <div className="mb-4 p-3 bg-muted/20 border border-border/50">
                  <p className="text-xs font-mono text-muted-foreground mb-2">Starting skills from <strong className="text-foreground">{bg.name}</strong>:</p>
                  <div className="flex flex-wrap gap-1">
                    {bg.startingSkills.map(s => (
                      <span key={s} className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 border border-primary/30">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs font-mono text-muted-foreground mb-3">
                Additional attuned: {Math.max(0, build.attunedSkills.filter(s => !bg?.startingSkills.includes(s)).length)}/2 chosen
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_SKILLS.map(skill => {
                  const isFromBg = bg?.startingSkills.includes(skill.name);
                  const isAttuned = build.attunedSkills.includes(skill.name);
                  const extraCount = build.attunedSkills.filter(s => !bg?.startingSkills.includes(s)).length;
                  return (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => {
                        if (isFromBg) return;
                        if (isAttuned) {
                          updateBuild({ attunedSkills: build.attunedSkills.filter(s => s !== skill.name) });
                        } else if (extraCount < 2) {
                          updateBuild({ attunedSkills: [...build.attunedSkills, skill.name] });
                        }
                      }}
                      disabled={isFromBg}
                      className={cn(
                        "flex items-center justify-between p-3 border text-left font-mono text-sm transition-colors",
                        isFromBg
                          ? "border-primary/40 bg-primary/5 text-primary cursor-not-allowed"
                          : isAttuned
                          ? "border-chart-2 bg-chart-2/10 text-chart-2"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
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
            <Section
              title="Feats"
              subtitle={level >= 2
                ? `Select up to ${featSlots} feat${featSlots !== 1 ? "s" : ""} for level ${level}. Feats are available at levels 2, 4, 6, 8, and 10.`
                : "Feats unlock at level 2. Increase your level in step 1 to select feats."}
            >
              {level < 2 ? (
                <div className="py-8 text-center font-mono text-muted-foreground text-sm">
                  No feat slots at level 1. Feats are gained at even levels (2, 4, 6, 8, 10).
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3 border border-primary/20 bg-primary/5 font-mono text-xs flex items-center justify-between">
                    <span>
                      <span className="text-primary font-bold">{build.selectedFeats.length}</span>
                      <span className="text-muted-foreground"> / {featSlots} feat slots filled</span>
                    </span>
                    <span className="text-muted-foreground/60">Feats at levels 2, 4, 6, 8, 10</span>
                  </div>

                  {build.selectedFeats.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Selected Feats</p>
                      {build.selectedFeats.map(featName => {
                        const featDef = FEATS.find(f => f.name === featName);
                        return (
                          <div key={featName} className="p-3 border border-chart-2/30 bg-chart-2/5 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm text-foreground">{featName}</div>
                              {featDef && <p className="text-xs font-mono text-muted-foreground mt-1 leading-relaxed">{featDef.desc}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateBuild({ selectedFeats: build.selectedFeats.filter(f => f !== featName) })}
                              className="text-xs font-mono text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0"
                            >
                              × Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {build.selectedFeats.length < featSlots && (
                    <div className="space-y-4">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Available Feats</p>
                      {(["utility", "combat", "defense", "magic"] as const).map(cat => {
                        const catFeats = FEATS.filter(f =>
                          f.category === cat &&
                          f.minLevel <= level &&
                          !build.selectedFeats.includes(f.name)
                        );
                        if (!catFeats.length) return null;
                        return (
                          <div key={cat}>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/30 pb-1">{cat}</p>
                            <div className="space-y-2">
                              {catFeats.map(feat => (
                                <button
                                  key={feat.name}
                                  type="button"
                                  onClick={() => updateBuild({ selectedFeats: [...build.selectedFeats, feat.name] })}
                                  className="w-full text-left p-3 border border-border hover:border-primary/50 bg-background transition-colors"
                                >
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-mono text-sm text-foreground">{feat.name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground ml-2">Lv{feat.minLevel}{feat.prerequisites !== "None" && feat.prerequisites !== "Even level" ? ` · ${feat.prerequisites}` : ""}</span>
                                  </div>
                                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">{feat.desc}</p>
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
            <Section title="Review" subtitle="Confirm your character before entering the Weave.">
              <div className="space-y-4 font-mono text-sm">
                {build.avatarDataUrl && (
                  <div className="flex justify-center mb-4">
                    <img src={build.avatarDataUrl} alt="Portrait" className="w-24 h-24 object-cover border border-border" />
                  </div>
                )}
                <ReviewRow label="Name" value={build.name} />
                <ReviewRow label="Level" value={String(build.level)} />
                <ReviewRow label="Affinity" value={build.affinity} />
                <ReviewRow label="Guild" value={build.guild} />
                <ReviewRow label="Background" value={build.background} />
                <ReviewRow label="Primary Mode" value={build.primaryMode ? `${build.primaryMode} (Harmony)` : "—"} />
                {level >= 4 && build.secondaryModes.some(m => m) && (
                  <ReviewRow label="Secondary Modes" value={build.secondaryModes.filter(m => m).join(", ") + " (Normal)"} />
                )}
                {level >= 7 && build.tertiaryModes.some(m => m) && (
                  <ReviewRow label="Tertiary Modes" value={build.tertiaryModes.filter(m => m).join(", ") + " (Discord)"} />
                )}
                <ReviewRow label="Strings" value={build.selectedStrings.filter(s => s.trim()).join(", ") || "None"} />
                {build.selectedFeats.length > 0 && (
                  <ReviewRow label="Feats" value={build.selectedFeats.join(", ")} />
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
                    {build.attunedSkills.map(s => (
                      <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>
                <Field label="Weaver Signature (optional)">
                  <textarea
                    className="input-field min-h-[80px] resize-none"
                    value={build.signature}
                    onChange={e => updateBuild({ signature: e.target.value })}
                    placeholder="Visual: ..., Auditory: ..., Tactile: ..."
                  />
                </Field>
              </div>
            </Section>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-4 py-2 font-mono text-sm border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              ← BACK
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="px-6 py-2 font-mono text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
              >
                CONTINUE →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isPending}
                className="px-6 py-2 font-mono text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? "WEAVING..." : charId ? "SAVE CHANGES" : "ENTER THE WEAVE →"}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-32 space-y-4">
            <div className="border border-border bg-card p-4 font-mono text-xs">
              <div className="text-muted-foreground/50 uppercase tracking-widest mb-3 text-[10px]">Character Preview</div>
              {build.avatarDataUrl && (
                <img src={build.avatarDataUrl} alt="Portrait" className="w-16 h-16 object-cover border border-border mb-3" />
              )}
              <div className="text-foreground font-bold text-base mb-1 truncate">{build.name || "—"}</div>
              <div className="text-muted-foreground text-[10px] space-y-0.5">
                <div>Level {build.level} · {build.affinity || "No Affinity"}</div>
                {build.primaryMode && <div>Primary: {build.primaryMode} (Harmony)</div>}
                {level >= 4 && build.secondaryModes.some(m => m) && (
                  <div>Secondary: {build.secondaryModes.filter(m => m).join(", ")}</div>
                )}
                {level >= 7 && build.tertiaryModes.some(m => m) && (
                  <div>Tertiary: {build.tertiaryModes.filter(m => m).join(", ")}</div>
                )}
                {build.background && <div>{build.background}</div>}
                {build.guild && <div>{build.guild}</div>}
                {build.selectedStrings.filter(s => s.trim()).length > 0 && (
                  <div>{build.selectedStrings.filter(s => s.trim()).length} string{build.selectedStrings.filter(s => s.trim()).length !== 1 ? "s" : ""} / {stringBudget} max</div>
                )}
              </div>
            </div>

            <div className="border border-border bg-card p-4 font-mono text-xs space-y-2">
              <div className="text-muted-foreground/50 uppercase tracking-widest text-[10px] mb-2">Progress</div>
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className={cn(
                    "w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-full text-[9px]",
                    i < step ? "bg-primary text-primary-foreground" :
                    i === step ? "border border-primary text-primary" :
                    "border border-border/40 text-muted-foreground/30"
                  )}>
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className={cn(
                    "text-[10px]",
                    i < step ? "text-muted-foreground" :
                    i === step ? "text-foreground font-bold" :
                    "text-muted-foreground/30"
                  )}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card p-6">
      <h2 className="font-[family-name:'Cinzel',serif] text-xl text-foreground mb-1">{title}</h2>
      <p className="font-mono text-xs text-muted-foreground mb-6 leading-relaxed">{subtitle}</p>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  );
}

function StatPreview({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground/60 uppercase mb-0.5">{label}</div>
      <div className="text-foreground font-bold">{value}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/20 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}
