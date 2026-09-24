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
import { useAuth } from "@/components/auth/AuthContext";
import { DiceStage, ROLL_DURATION_MS } from "@/components/shared/DiceStage";
import { DEFAULT_DICE_STYLE, rollDie } from "@/lib/dice-style";
import { CircleDot, Diamond, Droplets, Layers2, Plus, RotateCcw, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import "./dice-atelier.css";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
const designSchema = z.object({
  name: z.string().trim().min(1, "Give this set a name.").max(40, "Keep the name within 40 characters."),
  bodyColor: hex,
  inkColor: hex,
  edgeColor: hex,
  finish: z.enum(["matte", "polished", "glass"]),
  motif: z.enum(["plain", "weave", "stars", "etched"]),
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
};

const finishes = [
  { value: "matte", label: "Matte", icon: CircleDot },
  { value: "polished", label: "Polished", icon: Diamond },
  { value: "glass", label: "Glass", icon: Droplets },
] as const;
const motifs = [
  { value: "plain", label: "Plain", icon: CircleDot },
  { value: "weave", label: "Weave", icon: Layers2 },
  { value: "stars", label: "Stars", icon: Sparkles },
  { value: "etched", label: "Etched", icon: Diamond },
] as const;
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

  const draft = form.watch();
  const previewStyle: DiceStyle = {
    id: editingId ?? DEFAULT_DICE_STYLE.id,
    name: draft.name || "Untitled set",
    bodyColor: hex.safeParse(draft.bodyColor).success ? draft.bodyColor : startingDesign.bodyColor,
    inkColor: hex.safeParse(draft.inkColor).success ? draft.inkColor : startingDesign.inkColor,
    edgeColor: hex.safeParse(draft.edgeColor).success ? draft.edgeColor : startingDesign.edgeColor,
    finish: draft.finish,
    motif: draft.motif,
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
    form.reset({
      name: set.name, bodyColor: set.bodyColor, inkColor: set.inkColor,
      edgeColor: set.edgeColor, finish: set.finish, motif: set.motif,
    });
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
          <section className="atelier-stage-wrap" aria-label="Live dice preview">
            <div className="atelier-stage-head"><span>01 / The proving table</span><span>Live specimen</span></div>
            <div className="atelier-stage" data-testid="preview-dice-stage">
              <DiceStage dice={practiceDice} style={previewStyle} phase={practicePhase} height={310} rollKey={practiceRollKey} />
            </div>
            <div className="atelier-practice">
              <div className="atelier-practice-heading"><span>Try the instrument</span><span>Practice only / not recorded</span></div>
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
              <strong>THE SHAPE OF CHANCE</strong>
            </div>
          </section>

          <section className="atelier-controls" aria-label="Design your dice">
            <div className="atelier-panel-title">
              <h2>{editingId ? "Refine the set" : "Forge a set"}</h2>
              <small>{editingId ? "EDITING SAVED SET" : "NEW DESIGN"}</small>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => saveDesign(values, false))}>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <label className="atelier-label" htmlFor="atelier-name">Name your instrument</label>
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
                <div className="atelier-subheading">Pigments / three parts</div>
                <div className="atelier-colors">
                  {colorControl("bodyColor", "Body")}
                  {colorControl("inkColor", "Ink")}
                  {colorControl("edgeColor", "Edge")}
                </div>
                <div className="atelier-divider" />
                <FormField control={form.control} name="finish" render={({ field }) => (
                  <FormItem>
                    <div className="atelier-subheading">Surface / finish</div>
                    <div className="atelier-options" role="group" aria-label="Surface finish">
                      {finishes.map(({ value, label, icon: Icon }) => (
                        <button key={value} type="button" className="atelier-option" aria-pressed={field.value === value}
                          data-testid={`button-finish-${value}`} onClick={() => field.onChange(value)} disabled={working}>
                          <Icon aria-hidden="true" />{label}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
                <div className="atelier-divider" />
                <FormField control={form.control} name="motif" render={({ field }) => (
                  <FormItem>
                    <div className="atelier-subheading">Inscription / motif</div>
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
                <p className="atelier-note">Saving alone leaves your current set equipped. Save & equip puts this design into every roll.</p>
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
                    <span className="atelier-card-detail">{set.finish} · {set.motif}</span>
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
              <button type="button" className="atelier-secondary" onClick={() => setDeleteTarget(null)} disabled={working} data-testid="button-cancel-delete-dice">Keep set</button>
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