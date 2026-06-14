import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateCharacter, useUpdateCharacter, useGetCharacter } from "@workspace/api-client-react";
import {
  BACKGROUNDS, AFFINITIES, ALL_MODES, GUILDS, ALL_SKILLS,
  ATTRIBUTE_DEFS, type AttrKey, type Attributes,
  calcMod, calcVPMax, calcThreadPool, calcSafeLimit, calcGuardRating, calcWardRating,
  type Background,
} from "@/lib/ttrpg-data";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "identity", label: "Identity" },
  { id: "background", label: "Background" },
  { id: "attributes", label: "Attributes" },
  { id: "mode", label: "Mode" },
  { id: "skills", label: "Skills" },
  { id: "review", label: "Review" },
];

const POINT_BUY_TOTAL = 78;
const ATTR_MIN = 8;
const ATTR_MAX = 16;

interface BuildState {
  name: string;
  affinity: string;
  guild: string;
  guildRank: string;
  background: string;
  flexAttrBonus: AttrKey | "";
  baseAttrs: Attributes;
  primaryMode: string;
  attunedSkills: string[];
  signature: string;
}

const DEFAULT_BASE: Attributes = { pot: 10, ctr: 10, res: 10, acu: 10, pre: 10, ths: 10 };

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

export default function CharacterBuilder({ charId }: { charId?: string }) {
  const [, setLocation] = useLocation();
  const createMutation = useCreateCharacter();
  const updateMutation = useUpdateCharacter();
  const { data: existingChar } = useGetCharacter(charId ? parseInt(charId) : 0, {
    query: { enabled: !!charId } as any,
  });

  const [step, setStep] = useState(0);
  const [build, setBuild] = useState<BuildState>({
    name: "",
    affinity: "",
    guild: "",
    guildRank: "",
    background: "",
    flexAttrBonus: "",
    baseAttrs: DEFAULT_BASE,
    primaryMode: "",
    attunedSkills: [],
    signature: "",
  });

  const bg = BACKGROUNDS.find(b => b.name === build.background);
  const totalAttrs = getTotalAttrs(build);
  const pointsLeft = POINT_BUY_TOTAL - pointsSpent(build.baseAttrs);
  const level = existingChar?.level ?? 1;

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

  // Auto-set starting skills from background when background chosen
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
    if (step === 3) return build.primaryMode !== "";
    return true;
  }

  async function handleFinish() {
    const total = getTotalAttrs(build);
    const data = {
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
      secondaryMode: "",
      tertiaryMode: "",
      refinementBonus: 2,
      attunedSkills: build.attunedSkills,
      strings: [],
      techniques: [],
      feats: [],
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
          affinity: build.affinity,
          mode: build.primaryMode,
          data,
        },
      }, { onSuccess: () => setLocation(`/characters/${charId}`) });
    } else {
      createMutation.mutate({
        data: {
          name: build.name,
          level: 1,
          affinity: build.affinity,
          mode: build.primaryMode,
          isDraft: false,
          data,
        },
      }, { onSuccess: (char) => setLocation(`/characters/${char.id}`) });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

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
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 0: IDENTITY */}
          {step === 0 && (
            <Section title="Identity" subtitle="Who is this weaver?">
              <Field label="Character Name">
                <input
                  className="input-field"
                  value={build.name}
                  onChange={e => updateBuild({ name: e.target.value })}
                  placeholder="Enter your weaver's name..."
                />
              </Field>

              <Field label="Affinity">
                <p className="text-xs text-muted-foreground font-mono mb-2">Your magical element — the type of leyline you can grip.</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {AFFINITIES.map(a => (
                    <button
                      key={a}
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
                {BACKGROUNDS.map(bg => (
                  <button
                    key={bg.name}
                    onClick={() => updateBuild({ background: bg.name, flexAttrBonus: "" })}
                    className={cn(
                      "w-full text-left p-4 border transition-colors",
                      build.background === bg.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-[family-name:'Cinzel',serif] text-base text-foreground">{bg.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {Object.entries(bg.attrBonuses).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(", ")}
                        {bg.flexBonus ? `, +${bg.flexBonus} any` : ""}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed">{bg.desc}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {bg.startingSkills.map(s => (
                        <span key={s} className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5">
                          {s}
                        </span>
                      ))}
                    </div>
                    {bg.startingBurnout && (
                      <div className="mt-2 text-[10px] font-mono text-destructive">⚠ Starts with Burnout 1</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Flex bonus choice */}
              {bg?.flexBonus && (
                <div className="mt-4 p-4 border border-primary/30 bg-primary/5">
                  <p className="text-xs font-mono text-primary mb-3">Choose your +1 free attribute bonus:</p>
                  <div className="flex flex-wrap gap-2">
                    {ATTRIBUTE_DEFS.map(a => (
                      <button
                        key={a.key}
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
                        <button
                          onClick={() => setAttr(attr.key as AttrKey, base - 1)}
                          disabled={base <= ATTR_MIN}
                          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-mono text-lg">{base}</span>
                        <button
                          onClick={() => setAttr(attr.key as AttrKey, base + 1)}
                          disabled={base >= ATTR_MAX || pointsLeft <= 0}
                          className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted disabled:opacity-30 font-mono"
                        >
                          +
                        </button>
                      </div>
                      {bonus > 0 && (
                        <span className="text-xs font-mono text-chart-2">+{bonus} bg</span>
                      )}
                      <div className="ml-auto text-right font-mono">
                        <span className="text-xl text-foreground">{total}</span>
                        <span className="text-sm text-primary ml-2">({mod >= 0 ? "+" : ""}{mod})</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Derived stats preview */}
              {bg && (
                <div className="mt-4 p-3 border border-border/50 bg-muted/20 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-muted-foreground">
                  <StatPreview label="Max VP" value={calcVPMax(totalAttrs.res, 1)} />
                  <StatPreview label="Thread Pool" value={calcThreadPool(1, totalAttrs.ths)} />
                  <StatPreview label="Safe Limit" value={calcSafeLimit(1, totalAttrs.ctr)} />
                  <StatPreview label="Guard Rating" value={calcGuardRating(totalAttrs.res)} />
                  <StatPreview label="Ward Rating" value={calcWardRating(totalAttrs.ctr)} />
                  <StatPreview label="Recovery Dice" value={Math.max(0, calcMod(totalAttrs.res) + 2)} />
                </div>
              )}
            </Section>
          )}

          {/* STEP 3: MODE */}
          {step === 3 && (
            <Section title="Primary Mode" subtitle="Your discipline — how you interact with the Weave in combat and crisis.">
              <div className="space-y-3">
                {ALL_MODES.map(mode => (
                  <button
                    key={mode.name}
                    onClick={() => updateBuild({ primaryMode: mode.name })}
                    className={cn(
                      "w-full text-left p-4 border transition-colors",
                      build.primaryMode === mode.name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="font-[family-name:'Cinzel',serif] text-base text-foreground mb-1">{mode.name}</div>
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-2">{mode.desc}</p>
                    <p className="text-xs font-mono text-primary/70 italic">"{mode.flavor}"</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* STEP 4: SKILLS */}
          {step === 4 && (
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

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <Section title="Review" subtitle="Confirm your character before entering the Weave.">
              <div className="space-y-4 font-mono text-sm">
                <ReviewRow label="Name" value={build.name} />
                <ReviewRow label="Affinity" value={build.affinity} />
                <ReviewRow label="Guild" value={build.guild} />
                <ReviewRow label="Background" value={build.background} />
                <ReviewRow label="Primary Mode" value={build.primaryMode} />
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
                <Field label="Weaver Signature (optional)" className="mt-2">
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
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground font-mono text-sm disabled:opacity-30 transition-colors"
            >
              ← BACK
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="px-6 py-2 bg-primary text-primary-foreground font-mono text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                NEXT →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={isPending}
                className="px-6 py-2 bg-primary text-primary-foreground font-mono text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                {isPending ? "WEAVING..." : "ENTER THE WEAVE →"}
              </button>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-36 space-y-4 border border-border bg-card p-4 font-mono text-xs">
            <h3 className="font-[family-name:'Cinzel',serif] text-sm text-primary uppercase tracking-wider mb-3">Summary</h3>
            <SidebarRow label="Name" value={build.name || "—"} />
            <SidebarRow label="Affinity" value={build.affinity || "—"} />
            <SidebarRow label="Guild" value={build.guild || "—"} />
            <SidebarRow label="Background" value={build.background || "—"} />
            <SidebarRow label="Mode" value={build.primaryMode || "—"} />
            {build.background && (
              <>
                <div className="border-t border-border/30 pt-3 mt-3">
                  <p className="text-muted-foreground/60 uppercase text-[10px] mb-2">Attributes</p>
                  {ATTRIBUTE_DEFS.map(a => (
                    <div key={a.key} className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">{a.abbr}</span>
                      <span className="text-foreground">{totalAttrs[a.key as AttrKey]}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/30 pt-3 mt-3">
                  <p className="text-muted-foreground/60 uppercase text-[10px] mb-2">Derived Stats</p>
                  <SidebarRow label="Max VP" value={calcVPMax(totalAttrs.res, 1)} />
                  <SidebarRow label="Thread Pool" value={calcThreadPool(1, totalAttrs.ths)} />
                  <SidebarRow label="Safe Limit" value={calcSafeLimit(1, totalAttrs.ctr)} />
                  <SidebarRow label="Guard Rating" value={calcGuardRating(totalAttrs.res)} />
                  <SidebarRow label="Ward Rating" value={calcWardRating(totalAttrs.ctr)} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-[family-name:'Cinzel',serif] text-foreground">{title}</h2>
        {subtitle && <p className="text-sm font-mono text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
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

function ReviewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-border/30 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value || "—"}</span>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function StatPreview({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-muted-foreground/60 text-[10px] uppercase">{label}</div>
      <div className="text-foreground text-base font-bold">{value}</div>
    </div>
  );
}
