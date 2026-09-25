import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  getGetDicePreferencesQueryKey,
  useGetDicePreferences,
  usePutDicePreferences,
  type DicePreferences,
  type DiceStyle,
} from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/components/auth/auth-context";
import { DiceStage, ROLL_DURATION_MS } from "@/components/shared/DiceStage";
import { DEFAULT_DICE_STYLE, rollDie } from "@/lib/dice-style";
import { CircleDot, Diamond, Droplets, Layers2, Plus, RotateCcw, Sparkles, Trash2, TriangleAlert, Check, WandSparkles } from "lucide-react";
import "./dice-atelier.css";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
const designSchema = z.object({
  name: z.string().trim().min(1, "Give this set a name.").max(40, "Keep the name within 40 characters."),
  bodyColor: hex,
  inkColor: hex,
  edgeColor: hex,
  finish: z.enum(["matte", "polished", "glass", "frosted", "metallic", "iridescent", "liquid-core"]),
  motif: z.enum(["plain", "weave", "stars", "etched", "moon", "thorn", "eye"]),
  font: z.enum(["classic", "arcane", "modern", "mono"]),
  pattern: z.enum(["none", "marble", "nebula", "fractures", "constellation", "gilded"]),
  inclusion: z.enum(["none", "stardust", "gold-flake", "ember"]),
  animation: z.enum(["classic", "tumble", "comet", "ritual"]),
  inscription: z.string().max(12, "Use 12 characters or fewer.").regex(/^[^\u0000-\u001f\u007f-\u009f]*$/, "Control characters are not allowed."),
});
type Design = z.infer<typeof designSchema>;
type ColorField = "bodyColor" | "inkColor" | "edgeColor";

const startingDesign: Design = {
  name: "",
  bodyColor: DEFAULT_DICE_STYLE.bodyColor,
  inkColor: DEFAULT_DICE_STYLE.inkColor,
  edgeColor: DEFAULT_DICE_STYLE.edgeColor,
  finish: DEFAULT_DICE_STYLE.finish,
  motif: DEFAULT_DICE_STYLE.motif,
  font: "classic",
  pattern: "none",
  inclusion: "none",
  animation: "classic",
  inscription: "",
};

const finishes = [
  { value: "matte", label: "Matte", detail: "Soft, unlit surface", icon: CircleDot },
  { value: "polished", label: "Polished", detail: "A clean resin sheen", icon: Diamond },
  { value: "glass", label: "Glass", detail: "Clear, luminous depth", icon: Droplets },
  { value: "frosted", label: "Frosted", detail: "Diffused, misted light", icon: CircleDot },
  { value: "metallic", label: "Metallic", detail: "Forged reflection", icon: Diamond },
  { value: "iridescent", label: "Iridescent", detail: "Light-shifting color", icon: Sparkles },
  { value: "liquid-core", label: "Liquid core", detail: "Suspended inner shimmer", icon: Droplets },
] as const;
const motifs = [
  { value: "plain", label: "Plain", icon: CircleDot },
  { value: "weave", label: "Weave", icon: Layers2 },
  { value: "stars", label: "Stars", icon: Sparkles },
  { value: "etched", label: "Etched", icon: Diamond },
  { value: "moon", label: "Moon", icon: CircleDot },
  { value: "thorn", label: "Thorn", icon: Layers2 },
  { value: "eye", label: "Eye", icon: CircleDot },
] as const;
const patterns = [
  { value: "none", label: "None", detail: "Pure pigment" },
  { value: "marble", label: "Marble", detail: "Veins of color" },
  { value: "nebula", label: "Nebula", detail: "Drifting clouds" },
  { value: "fractures", label: "Fractures", detail: "Fine split lines" },
  { value: "constellation", label: "Constellation", detail: "Mapped stars" },
  { value: "gilded", label: "Gilded", detail: "Traces of gold" },
] as const;
const inclusions = [
  { value: "none", label: "None", detail: "Clear body" },
  { value: "stardust", label: "Stardust", detail: "Fine suspended flecks" },
  { value: "gold-flake", label: "Gold flake", detail: "Floating gold accents" },
  { value: "ember", label: "Ember", detail: "Warm inner sparks" },
] as const;
const fonts = [
  { value: "classic", label: "Classic", sample: "20" },
  { value: "arcane", label: "Arcane", sample: "20" },
  { value: "modern", label: "Modern", sample: "20" },
  { value: "mono", label: "Mono", sample: "20" },
] as const;
const animations = [
  { value: "classic", label: "Classic", detail: "A familiar cast" },
  { value: "tumble", label: "Tumble", detail: "A lively turn" },
  { value: "comet", label: "Comet", detail: "A swift arc" },
  { value: "ritual", label: "Ritual", detail: "A deliberate reveal" },
] as const;
const inspirations: { title: string; note: string; design: Design }[] = [
  { title: "Tideglass", note: "Aqua · violet · suspended light", design: { name: "Tideglass", bodyColor: "#78C9C5", inkColor: "#613D83", edgeColor: "#C7A8DC", finish: "liquid-core", motif: "moon", font: "arcane", pattern: "nebula", inclusion: "stardust", animation: "ritual", inscription: "" } },
  { title: "Ash & Omen", note: "Smoke · copper · embers", design: { name: "Ash & Omen", bodyColor: "#525663", inkColor: "#F0D8AE", edgeColor: "#B46B51", finish: "frosted", motif: "etched", font: "classic", pattern: "fractures", inclusion: "ember", animation: "tumble", inscription: "" } },
  { title: "Night Cartographer", note: "Ink · stars · fine gold", design: { name: "Night Cartographer", bodyColor: "#343D62", inkColor: "#E9D9AA", edgeColor: "#A997CE", finish: "iridescent", motif: "stars", font: "mono", pattern: "constellation", inclusion: "gold-flake", animation: "comet", inscription: "" } },
];
function designFromSet(set: DiceStyle): Design {
  return {
    ...startingDesign,
    name: set.name,
    bodyColor: set.bodyColor,
    inkColor: set.inkColor,
    edgeColor: set.edgeColor,
    finish: set.finish,
    motif: set.motif,
    font: set.font ?? startingDesign.font,
    pattern: set.pattern ?? startingDesign.pattern,
    inclusion: set.inclusion ?? startingDesign.inclusion,
    animation: set.animation ?? startingDesign.animation,
    inscription: set.inscription ?? startingDesign.inscription,
  };
}
const dieShapes = [4, 6, 8, 10, 12, 20] as const;
type DieShape = typeof dieShapes[number];

function readableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "The weave did not hold. Please try again.";
}

export default function DiceAtelier() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const accountId = user?.id;
  const scopedKey = [...getGetDicePreferencesQueryKey(), accountId];
  const { data: preferences, isLoading, isError, refetch } = useGetDicePreferences({
    query: { enabled: !!user, queryKey: scopedKey },
  });
  const update = usePutDicePreferences();
  const form = useForm<Design>({
    resolver: zodResolver(designSchema),
    defaultValues: startingDesign,
    mode: "onSubmit",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiceStyle | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [working, setWorking] = useState(false);
  const [practiceSides, setPracticeSides] = useState<DieShape>(20);
  const [practicePhase, setPracticePhase] = useState<"preview" | "rolling" | "settled">("preview");
  const [practiceResult, setPracticeResult] = useState<number | null>(null);
  const [practiceRollKey, setPracticeRollKey] = useState(0);
  const practiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceBusy = useRef(false);
  const busy = useRef(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const stageWrapRef = useRef<HTMLElement>(null);
  const accountRef = useRef(accountId);
  accountRef.current = accountId;
  const lastAccount = useRef(accountId);

  useEffect(() => {
    if (lastAccount.current !== accountId) {
      lastAccount.current = accountId;
      form.reset(startingDesign);
      setEditingId(null);
      setDeleteTarget(null);
      setMessage(null);
    }
  }, [accountId, form]);

  useEffect(() => () => {
    if (practiceTimer.current !== null) clearTimeout(practiceTimer.current);
    practiceBusy.current = false;
  }, []);

  useEffect(() => {
    if (!deleteTarget || working) return;
    cancelDeleteRef.current?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleteTarget(null);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [deleteTarget, working]);

  const draft = form.watch();
  const previewStyle: DiceStyle = {
    id: editingId ?? DEFAULT_DICE_STYLE.id,
    name: draft.name || "Untitled set",
    bodyColor: hex.safeParse(draft.bodyColor).success ? draft.bodyColor : startingDesign.bodyColor,
    inkColor: hex.safeParse(draft.inkColor).success ? draft.inkColor : startingDesign.inkColor,
    edgeColor: hex.safeParse(draft.edgeColor).success ? draft.edgeColor : startingDesign.edgeColor,
    finish: draft.finish,
    motif: draft.motif,
    font: draft.font, pattern: draft.pattern, inclusion: draft.inclusion,
    animation: draft.animation, inscription: draft.inscription,
  };
  const practiceDice = useMemo(() => [{
    sides: practiceSides,
    value: practiceResult ?? Math.max(1, Math.ceil(practiceSides * .7)),
  }], [practiceSides, practiceResult]);
  const sets = preferences?.sets ?? [];
  const selected = sets.find((set) => set.id === preferences?.selectedId);

  async function commit(next: DicePreferences, success: string, after?: () => void) {
    if (!accountId || busy.current || !preferences) return;
    busy.current = true;
    setWorking(true);
    setMessage(null);
    try {
      const result = await update.mutateAsync({ data: next });
      queryClient.setQueryData([...getGetDicePreferencesQueryKey(), accountId], result);
      await queryClient.invalidateQueries({ queryKey: getGetDicePreferencesQueryKey() });
      if (accountRef.current === accountId) {
        after?.();
        setMessage({ text: success, error: false });
      }
    } catch (error) {
      if (accountRef.current === accountId) setMessage({ text: readableError(error), error: true });
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  function freshDesign() {
    form.reset(startingDesign);
    setEditingId(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editSet(set: DiceStyle) {
    form.reset(designFromSet(set));
    setEditingId(set.id);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDesign(values: Design, equip: boolean) {
    if (!preferences || working) return;
    if (!editingId && sets.length >= 12) {
      setMessage({ text: "The case is full. Retire a set before forging another.", error: true });
      return;
    }
    const id = editingId ?? crypto.randomUUID();
    const style: DiceStyle = { ...values, name: values.name.trim(), id };
    const nextSets = editingId
      ? sets.map((set) => set.id === editingId ? style : set)
      : [...sets, style];
    const next: DicePreferences = {
      sets: nextSets,
      selectedId: equip ? id : preferences.selectedId,
    };
    await commit(next, equip ? `${style.name} is saved and equipped.` : `${style.name} is saved to your case. Your equipped set is unchanged.`, () => setEditingId(id));
  }

  async function selectSet(id: string | null) {
    if (!preferences || working || preferences.selectedId === id) return;
    const name = id === null ? "The standard set" : sets.find((set) => set.id === id)?.name;
    if (id !== null && !name) return;
    await commit({ sets, selectedId: id }, `${name} is now equipped.`);
  }

  async function removeSet() {
    if (!preferences || !deleteTarget || working) return;
    const target = deleteTarget;
    const nextSets = sets.filter((set) => set.id !== target.id);
    await commit({
      sets: nextSets,
      selectedId: preferences.selectedId === target.id ? null : preferences.selectedId,
    }, `${target.name} was removed${preferences.selectedId === target.id ? "; the standard set is now equipped" : ""}.`, () => {
      setDeleteTarget(null);
      if (editingId === target.id) freshDesign();
    });
  }

  function choosePracticeDie(sides: DieShape) {
    if (practiceBusy.current) return;
    setPracticeSides(sides);
    setPracticeResult(null);
    setPracticePhase("preview");
  }

  function tryRoll() {
    if (practiceBusy.current) return;
    practiceBusy.current = true;
    const rolled = rollDie(practiceSides);
    setPracticeResult(rolled);
    setPracticePhase("rolling");
    setPracticeRollKey((key) => key + 1);
    practiceTimer.current = setTimeout(() => {
      setPracticePhase("settled");
      practiceBusy.current = false;
      practiceTimer.current = null;
    }, ROLL_DURATION_MS);
  }

  function previewMotion() {
    if (practiceBusy.current) return;
    const bounds = stageWrapRef.current?.getBoundingClientRect();
    if (bounds && (bounds.bottom < 120 || bounds.top > window.innerHeight - 180)) {
      stageWrapRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    }
    tryRoll();
  }

  function colorControl(fieldName: ColorField, label: string) {
    return (
      <FormField control={form.control} name={fieldName} render={({ field }) => (
        <FormItem className="atelier-color-item">
          <label className="atelier-label" htmlFor={`atelier-${fieldName}`}>{label}</label>
          <FormControl>
            <div className="atelier-color-well">
              <input
                aria-label={`Choose ${label.toLowerCase()} color`}
                data-testid={`input-${fieldName}-picker`}
                type="color"
                value={hex.safeParse(field.value).success ? field.value : "#777777"}
                onChange={(event) => field.onChange(event.target.value)}
                disabled={working}
              />
              <input
                id={`atelier-${fieldName}`}
                aria-label={`${label} hex color`}
                data-testid={`input-${fieldName}-hex`}
                type="text"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                maxLength={7}
                spellCheck={false}
                disabled={working}
              />
            </div>
          </FormControl>
          <FormMessage className="atelier-field-error" />
        </FormItem>
      )} />
    );
  }

  if (!user || isLoading) {
    return (
      <main className="dice-atelier">
        <div className="atelier-shell atelier-loading" aria-label="Loading dice atelier" data-testid="status-dice-loading">
          <div className="atelier-skeleton bar" /><div className="atelier-skeleton title" /><div className="atelier-skeleton block" />
        </div>
      </main>
    );
  }

  if (isError || !preferences) {
    return (
      <main className="dice-atelier">
        <div className="atelier-shell">
          <div className="atelier-failed" role="alert" data-testid="status-dice-error">
            <TriangleAlert size={29} />
            <h2>The case will not open.</h2>
            <p>Your saved instruments could not be reached. Nothing has been changed.</p>
            <button type="button" className="atelier-secondary" onClick={() => refetch()} data-testid="button-retry-dice">Try again</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dice-atelier">
      <div className="atelier-shell">
        <div className="atelier-topline"><span>THREADCAST / THE INSTRUMENTS</span><span>PERSONAL ATELIER · 01</span></div>
        <header className="atelier-heading">
          <div>
            <div className="atelier-eyebrow">An instrument of chance</div>
            <h1>The Dice <em>Atelier</em></h1>
          </div>
          <p>Give the instruments of your fate a form of their own. Every Thread Check begins here.</p>
        </header>

        <div className="atelier-workbench">
          <section ref={stageWrapRef} className="atelier-stage-wrap" aria-label="Live dice preview">
            <div className="atelier-stage-head"><span>01 / The proving table</span><span>Live specimen · unsaved draft</span></div>
            <div className="atelier-stage" data-testid="preview-dice-stage">
              <DiceStage dice={practiceDice} style={previewStyle} phase={practicePhase} height={310} rollKey={practiceRollKey} />
            </div>
            <div className="atelier-practice">
              <div className="atelier-practice-heading"><span>Test a shape</span><span>Practice only / not recorded</span></div>
              <div className="atelier-practice-controls">
                <div className="atelier-shape-options" role="group" aria-label="Choose a practice die">
                  {dieShapes.map((sides) => (
                    <button
                      key={sides}
                      type="button"
                      aria-pressed={practiceSides === sides}
                      className="atelier-shape"
                      onClick={() => choosePracticeDie(sides)}
                      disabled={practicePhase === "rolling"}
                      data-testid={`button-practice-d${sides}`}
                    >
                      d{sides}
                    </button>
                  ))}
                </div>
                <button type="button" className="atelier-roll" onClick={tryRoll}
                  disabled={practicePhase === "rolling"} data-testid="button-try-roll">
                  {practicePhase === "rolling" ? "Casting…" : "Try roll"}
                </button>
              </div>
              <div className="atelier-roll-result" aria-live="polite" aria-atomic="true" data-testid="status-practice-roll">
                {practicePhase === "rolling"
                  ? `Casting d${practiceSides}…`
                  : practicePhase === "settled" && practiceResult !== null
                    ? <>d{practiceSides} result <strong>{practiceResult}</strong></>
                    : "Choose a shape, then cast a practice roll."}
              </div>
            </div>
            <div className="atelier-stage-foot">
               <span>FORM / d{practiceSides} · {draft.finish} · {draft.motif}</span>
               <strong>{draft.inscription ? `“${draft.inscription}”` : "THE SHAPE OF CHANCE"}</strong>
            </div>
          </section>

          <section className="atelier-controls" aria-label="Design your dice">
            <div className="atelier-panel-title">
              <div><span className="atelier-step">02 / THE WORKBENCH</span><h2>{editingId ? "Refine the set" : "Forge a set"}</h2></div>
              <small>{editingId ? "EDITING SAVED SET" : "NEW DESIGN"}</small>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => saveDesign(values, false))}>
                <div className="atelier-inspirations">
                  <div className="atelier-section-intro"><div><span className="atelier-section-number">STARTING POINTS</span><h3>Begin with a mood</h3></div><p>Optional. Applying a study only changes this draft.</p></div>
                  <div className="atelier-inspiration-list">
                    {inspirations.map(({ title, note, design }) => (
                      <button key={title} type="button" className="atelier-inspiration" onClick={() => { form.reset(design); setMessage(null); }} disabled={working} data-testid={`button-preset-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                        <span className="atelier-inspiration-stone" style={{ "--stone-body": design.bodyColor, "--stone-edge": design.edgeColor, "--stone-ink": design.inkColor } as React.CSSProperties} aria-hidden="true">20</span>
                        <span><strong>{title}</strong><small>{note}</small></span>
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="atelier-section-intro atelier-identity"><div><span className="atelier-section-number">I / IDENTITY</span><h3>Give it a name</h3></div></div>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <label className="atelier-label" htmlFor="atelier-name">Set name</label>
                    <FormControl>
                      <input
                        {...field}
                        id="atelier-name"
                        data-testid="input-dice-name"
                        className="atelier-name"
                        placeholder="e.g. Ash and Omen"
                        maxLength={40}
                        disabled={working}
                      />
                    </FormControl>
                    <FormMessage className="atelier-field-error" />
                  </FormItem>
                )} />

                 <div className="atelier-divider" />
                 <div className="atelier-section-intro"><div><span className="atelier-section-number">II / MATERIAL</span><h3>Color & substance</h3></div><p>Body, numbering ink, and edge each take their own pigment.</p></div>
                <div className="atelier-colors">
                   {colorControl("bodyColor", "Body resin")}
                   {colorControl("inkColor", "Numeral ink")}
                   {colorControl("edgeColor", "Edge accent")}
                </div>
                <FormField control={form.control} name="finish" render={({ field }) => (
                  <FormItem>
                     <div className="atelier-subheading">Surface finish <span>How the light meets the die</span></div>
                     <div className="atelier-options atelier-finish-options" role="group" aria-label="Surface finish">
                       {finishes.map(({ value, label, detail, icon: Icon }) => (
                        <button key={value} type="button" className="atelier-option" aria-pressed={field.value === value}
                          data-testid={`button-finish-${value}`} onClick={() => field.onChange(value)} disabled={working}>
                           <Icon aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span>
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
                <div className="atelier-divider" />
                 <div className="atelier-section-intro"><div><span className="atelier-section-number">III / INNER WORLD</span><h3>Detail in the depths</h3></div><p>Layer a pattern and suspended accents into the visual design.</p></div>
                 <FormField control={form.control} name="pattern" render={({ field }) => (
                   <FormItem className="atelier-choice-field">
                     <div className="atelier-subheading">Body pattern</div>
                     <div className="atelier-options atelier-detail-options" role="group" aria-label="Body pattern">
                       {patterns.map(({ value, label, detail }) => (
                         <button key={value} type="button" className="atelier-option" aria-pressed={field.value === value} onClick={() => field.onChange(value)} disabled={working} data-testid={`button-pattern-${value}`}>
                           <span><strong>{label}</strong><small>{detail}</small></span>
                         </button>
                       ))}
                     </div>
                   </FormItem>
                 )} />
                 <FormField control={form.control} name="inclusion" render={({ field }) => (
                   <FormItem className="atelier-choice-field">
                     <div className="atelier-subheading">Suspended accents</div>
                     <div className="atelier-options atelier-detail-options" role="group" aria-label="Suspended accents">
                       {inclusions.map(({ value, label, detail }) => (
                         <button key={value} type="button" className="atelier-option" aria-pressed={field.value === value} onClick={() => field.onChange(value)} disabled={working} data-testid={`button-inclusion-${value}`}>
                           <span><strong>{label}</strong><small>{detail}</small></span>
                         </button>
                       ))}
                     </div>
                   </FormItem>
                 )} />
                 <div className="atelier-divider" />
                 <div className="atelier-section-intro"><div><span className="atelier-section-number">IV / MARKS</span><h3>Signs & lettering</h3></div><p>A motif for the faces; a voice for the numbers.</p></div>
                <FormField control={form.control} name="motif" render={({ field }) => (
                  <FormItem>
                     <div className="atelier-subheading">Face motif</div>
                    <div className="atelier-options motifs" role="group" aria-label="Dice motif">
                      {motifs.map(({ value, label, icon: Icon }) => (
                        <button key={value} type="button" className="atelier-option" aria-pressed={field.value === value}
                          data-testid={`button-motif-${value}`} onClick={() => field.onChange(value)} disabled={working}>
                          <Icon aria-hidden="true" />{label}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
                 <FormField control={form.control} name="font" render={({ field }) => (
                   <FormItem className="atelier-choice-field">
                     <div className="atelier-subheading">Numeral style</div>
                     <div className="atelier-options atelier-font-options" role="group" aria-label="Numeral style">
                       {fonts.map(({ value, label, sample }) => (
                         <button key={value} type="button" className={`atelier-option atelier-font-option is-${value}`} aria-pressed={field.value === value} onClick={() => field.onChange(value)} disabled={working} data-testid={`button-font-${value}`}>
                           <b aria-hidden="true">{sample}</b><span>{label}</span>
                         </button>
                       ))}
                     </div>
                   </FormItem>
                 )} />
                 <FormField control={form.control} name="inscription" render={({ field }) => (
                   <FormItem className="atelier-choice-field">
                     <label className="atelier-subheading" htmlFor="atelier-inscription">Personal inscription <span>Optional · 12 characters maximum</span></label>
                     <FormControl><input {...field} id="atelier-inscription" className="atelier-name atelier-inscription-input" maxLength={12} placeholder="A word to carry" disabled={working} data-testid="input-dice-inscription" /></FormControl>
                     <div className="atelier-input-meta"><span>A small signature for your instrument.</span><span>{field.value.length} / 12</span></div>
                     <FormMessage className="atelier-field-error" />
                   </FormItem>
                 )} />
                 <div className="atelier-divider" />
                  <div className="atelier-section-intro"><div><span className="atelier-section-number">V / THE CAST</span><h3>How it moves</h3></div><p>Choose a motion to see it cast immediately. Practice rolls are not recorded.</p></div>
                 <FormField control={form.control} name="animation" render={({ field }) => (
                   <FormItem>
                     <div className="atelier-options atelier-animation-options" role="group" aria-label="Roll animation">
                       {animations.map(({ value, label, detail }) => (
                          <button key={value} type="button" className="atelier-option" aria-pressed={field.value === value} onClick={() => { field.onChange(value); previewMotion(); }} disabled={working || practicePhase === "rolling"} data-testid={`button-animation-${value}`}>
                           <WandSparkles size={15} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span>
                         </button>
                       ))}
                     </div>
                   </FormItem>
                 )} />
                 <div className="atelier-save-divider" />
                <div className="atelier-actions">
                  <button type="submit" className="atelier-primary" disabled={working || (!editingId && sets.length >= 12)}
                    data-testid="button-save-dice">
                    {working ? "Working…" : editingId ? "Save changes" : "Save to case"}
                  </button>
                  <button type="button" className="atelier-secondary" disabled={working || (!editingId && sets.length >= 12)}
                    onClick={form.handleSubmit((values) => saveDesign(values, true))}
                    data-testid="button-save-equip-dice">
                    Save & equip
                  </button>
                </div>
                 <p className="atelier-note"><Check size={13} aria-hidden="true" /> Saving alone leaves your current set equipped. Save & equip uses this design for future rolls. The proving table is never recorded. These are digital visual designs, not physical dice.</p>
                {editingId && <button type="button" className="atelier-text-button" onClick={freshDesign} disabled={working}
                  data-testid="button-cancel-dice-edit"><RotateCcw size={12} /> Start a new design</button>}
                {!editingId && sets.length >= 12 && <p className="atelier-message error">Your case is full. Remove a saved set to make room.</p>}
                {message && <p role={message.error ? "alert" : "status"} className={`atelier-message${message.error ? " error" : ""}`}
                  data-testid="status-dice-action">{message.text}</p>}
              </form>
            </Form>
          </section>
        </div>

        <section className="atelier-collection" aria-labelledby="dice-collection-title">
          <div className="atelier-collection-header">
            <div><div className="atelier-eyebrow">Kept close at hand</div><h2 id="dice-collection-title">The instrument case</h2><p>Choose the set that accompanies every cast.</p></div>
            <span className="atelier-count" data-testid="text-dice-count">{String(sets.length).padStart(2, "0")} / 12 SLOTS</span>
          </div>
          <div className="atelier-list">
            <article className={`atelier-card${preferences.selectedId === null ? " is-active" : ""}`} data-testid="card-dice-default">
              {preferences.selectedId === null && <span className="atelier-active-tag" data-testid="status-dice-equipped">Equipped</span>}
              <div className="atelier-card-top">
                <div className="atelier-swatch" style={{ "--body": DEFAULT_DICE_STYLE.bodyColor, "--ink": DEFAULT_DICE_STYLE.inkColor, "--edge": DEFAULT_DICE_STYLE.edgeColor } as React.CSSProperties}>◇</div>
                <div className="atelier-card-meta"><span className="atelier-card-index">STANDARD / ALWAYS AVAILABLE</span><h3>Standard issue</h3><span className="atelier-card-detail">The original instrument</span></div>
              </div>
              <div className="atelier-card-actions">
                <button type="button" onClick={() => selectSet(null)} disabled={working || preferences.selectedId === null}
                  data-testid="button-equip-dice-default">{preferences.selectedId === null ? "In use" : "Equip standard"}</button>
              </div>
            </article>
            {sets.map((set, index) => (
              <article key={set.id} className={`atelier-card${preferences.selectedId === set.id ? " is-active" : ""}`} data-testid={`card-dice-${set.id}`}>
                {preferences.selectedId === set.id && <span className="atelier-active-tag" data-testid={`status-dice-equipped-${set.id}`}>Equipped</span>}
                <div className="atelier-card-top">
                  <div className="atelier-swatch" aria-hidden="true" style={{ "--body": set.bodyColor, "--ink": set.inkColor, "--edge": set.edgeColor } as React.CSSProperties}>◇</div>
                  <div className="atelier-card-meta">
                    <span className="atelier-card-index">SET / {String(index + 1).padStart(2, "0")}</span>
                    <h3 title={set.name} data-testid={`text-dice-name-${set.id}`}>{set.name}</h3>
                     <span className="atelier-card-detail">{set.finish} · {set.motif}{designFromSet(set).pattern !== "none" ? ` · ${designFromSet(set).pattern}` : ""}</span>
                  </div>
                </div>
                <div className="atelier-card-actions">
                  <button type="button" onClick={() => selectSet(set.id)} disabled={working || preferences.selectedId === set.id}
                    data-testid={`button-equip-dice-${set.id}`}>{preferences.selectedId === set.id ? "In use" : "Equip"}</button>
                  <button type="button" onClick={() => editSet(set)} disabled={working} data-testid={`button-edit-dice-${set.id}`}>Edit</button>
                  <button type="button" className="danger" onClick={() => { setDeleteTarget(set); setMessage(null); }} disabled={working}
                    data-testid={`button-delete-dice-${set.id}`}>Remove</button>
                </div>
              </article>
            ))}
          </div>
          {sets.length === 0 && <div className="atelier-empty" data-testid="status-dice-empty">
            <Plus size={22} strokeWidth={1} />
            <strong>The case is waiting.</strong>
            <span>Your first design will live here beside the standard set.</span><br />
            <button type="button" className="atelier-secondary" onClick={freshDesign} data-testid="button-forge-first-dice">Forge your first set</button>
          </div>}
        </section>
        <footer className="atelier-footer"><span>THREADCAST / INSTRUMENTS OF FATE</span><span>{selected ? `IN HAND: ${selected.name}` : "IN HAND: STANDARD ISSUE"}</span></footer>
      </div>

      {deleteTarget && (
        <div className="atelier-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) setDeleteTarget(null); }}>
          <div className="atelier-confirm" role="alertdialog" aria-modal="true" aria-labelledby="atelier-confirm-title" aria-describedby="atelier-confirm-description">
            <div className="atelier-eyebrow">A permanent choice</div>
            <h2 id="atelier-confirm-title">Retire this set?</h2>
            <p id="atelier-confirm-description">“{deleteTarget.name}” will leave your case. {preferences.selectedId === deleteTarget.id ? "The standard set will take its place in every roll." : "Your equipped set will not change."}</p>
            {message?.error && <p role="alert" className="atelier-message error" data-testid="status-dice-delete-error">{message.text}</p>}
            <div className="atelier-confirm-actions">
               <button ref={cancelDeleteRef} type="button" className="atelier-secondary" onClick={() => setDeleteTarget(null)} disabled={working} data-testid="button-cancel-delete-dice">Keep set</button>
              <button type="button" className="atelier-primary" onClick={removeSet} disabled={working} data-testid="button-confirm-delete-dice">
                <Trash2 size={13} /> {working ? "Removing…" : "Retire set"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}