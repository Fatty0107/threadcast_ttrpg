import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCharacterQueryKey,
  getListCharactersQueryKey,
  useGetCharacter,
  useUpdateWeavekeeperAdditions,
  type Character,
  type WeavekeeperAdditions,
  type WeavekeeperEntry,
  type WeavekeeperItem,
} from "@workspace/api-client-react";
import { useAuth } from "@/components/auth/auth-context";
import { ALL_SKILLS } from "@/lib/ttrpg-data";
import { ArrowLeft, Check, Plus, RotateCcw, Save, ShieldHalf, Trash2 } from "lucide-react";

type EntryKind = "feats" | "items" | "backgrounds" | "notes";
type DraftEntry = WeavekeeperEntry | WeavekeeperItem;

const emptyAdditions = (): WeavekeeperAdditions => ({
  attunements: [], expertise: [], feats: [], items: [], backgrounds: [], notes: [],
});

function fromCharacter(character: Character): WeavekeeperAdditions {
  const source = character.data?.weavekeeperAdditions as Partial<WeavekeeperAdditions> | undefined;
  return {
    attunements: [...(source?.attunements ?? [])],
    expertise: [...(source?.expertise ?? [])],
    feats: (source?.feats ?? []).map(entry => ({ ...entry })),
    items: (source?.items ?? []).map(entry => ({ ...entry })),
    backgrounds: (source?.backgrounds ?? []).map(entry => ({ ...entry })),
    notes: (source?.notes ?? []).map(entry => ({ ...entry })),
  };
}

const sectionTitle = "font-[family-name:'Cinzel',serif] text-lg text-foreground";
const fieldClass = "w-full min-w-0 rounded-none border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20";

function SkillSection({
  title, index, detail, selected, onToggle,
}: {
  title: string; index: string; detail: string; selected: string[]; onToggle: (skill: string) => void;
}) {
  return (
    <section className="border border-border bg-card/80 p-4 sm:p-6" aria-label={title}>
      <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">{index} / SKILL RECORD</span>
          <h2 className={`${sectionTitle} mt-1`}>{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
        <span className="shrink-0 border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground" data-testid={`count-${title.toLowerCase()}`}>{selected.length} selected</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_SKILLS.map(skill => {
          const active = selected.includes(skill.name);
          return (
            <button
              key={skill.name}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(skill.name)}
              data-testid={`toggle-${title.toLowerCase()}-${skill.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
            >
              {active && <Check className="h-3 w-3" aria-hidden="true" />}
              {skill.name}
              <span className="font-mono text-[9px] uppercase opacity-60">{skill.attr}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EntrySection({
  kind, title, index, detail, entries, onAdd, onChange, onRemove,
}: {
  kind: EntryKind; title: string; index: string; detail: string;
  entries: DraftEntry[];
  onAdd: (kind: EntryKind) => void;
  onChange: (kind: EntryKind, id: string, patch: Partial<WeavekeeperItem>) => void;
  onRemove: (kind: EntryKind, id: string) => void;
}) {
  return (
    <section className="border border-border bg-card/80 p-4 sm:p-6" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">{index} / CHARACTER RECORD</span>
          <h2 className={`${sectionTitle} mt-1`}>{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
        <button type="button" onClick={() => onAdd(kind)} disabled={entries.length >= 40}
          data-testid={`button-add-${kind}`}
          className="inline-flex items-center gap-1.5 border border-primary/50 px-3 py-2 font-mono text-[11px] text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add {kind === "items" ? "item" : kind === "notes" ? "note" : kind === "feats" ? "feat" : "background"}
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-[family-name:'Cinzel',serif] text-sm text-muted-foreground">No {title.toLowerCase()} recorded</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">Use Add to make the first entry.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map((entry, position) => (
            <div key={entry.id} className="border border-border/70 bg-background/40 p-3 sm:p-4" data-testid={`entry-${kind}-${entry.id}`}>
              <div className="flex items-start gap-2">
                <span className="mt-2 hidden w-6 shrink-0 font-mono text-[10px] text-primary/70 sm:block">{String(position + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className={`grid grid-cols-1 gap-3 ${kind === "items" ? "sm:grid-cols-[minmax(0,1fr)_100px]" : ""}`}>
                    <label className="block">
                      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Name</span>
                      <input className={fieldClass} value={entry.name} maxLength={100}
                        onChange={event => onChange(kind, entry.id, { name: event.target.value })}
                        placeholder={kind === "items" ? "Item name" : "Entry name"}
                        data-testid={`input-${kind}-name-${entry.id}`} />
                    </label>
                    {kind === "items" && (
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Quantity</span>
                        <input className={fieldClass} type="number" min={1} max={999} step={1}
                          value={(entry as WeavekeeperItem).quantity}
                          onChange={event => onChange(kind, entry.id, { quantity: Number(event.target.value) })}
                          data-testid={`input-items-quantity-${entry.id}`} />
                      </label>
                    )}
                  </div>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Description <span className="normal-case tracking-normal opacity-60">optional</span></span>
                    <textarea className={`${fieldClass} min-h-20 resize-y`} value={entry.description ?? ""} maxLength={2000}
                      onChange={event => onChange(kind, entry.id, { description: event.target.value })}
                      placeholder="A detail worth keeping on the sheet..."
                      data-testid={`input-${kind}-description-${entry.id}`} />
                  </label>
                </div>
                <button type="button" aria-label={`Remove ${entry.name || title.toLowerCase()} entry`} title="Remove entry"
                  onClick={() => onRemove(kind, entry.id)} data-testid={`button-remove-${kind}-${entry.id}`}
                  className="mt-5 shrink-0 border border-border p-2 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function WeavekeeperAdditions() {
  const [, params] = useRoute("/weavekeeper/characters/:id/additions");
  const id = Number(params?.id);
  const validId = Number.isSafeInteger(id) && id > 0;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: character, isLoading, isError, isFetchedAfterMount, refetch } = useGetCharacter(validId ? id : 0, {
    query: { enabled: validId && user?.role === "weavekeeper", queryKey: getGetCharacterQueryKey(validId ? id : 0), staleTime: 0, refetchOnMount: "always" },
  });
  const mutation = useUpdateWeavekeeperAdditions();
  const [draft, setDraft] = useState<WeavekeeperAdditions>(emptyAdditions);
  const [baseline, setBaseline] = useState<WeavekeeperAdditions>(emptyAdditions);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "conflict"; text: string } | null>(null);
  const initializedId = useRef<number | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    if (character && isFetchedAfterMount && !isError && initializedId.current !== character.id) {
      const initial = fromCharacter(character);
      initializedId.current = character.id;
      setDraft(initial);
      setBaseline(initial);
      setNotice(null);
    }
  }, [character, isFetchedAfterMount, isError]);

  function toggleSkill(kind: "attunements" | "expertise", skill: string) {
    setDraft(previous => ({
      ...previous,
      [kind]: previous[kind].includes(skill)
        ? previous[kind].filter(value => value !== skill)
        : previous[kind].length < 40 ? [...previous[kind], skill] : previous[kind],
    }));
    setNotice(previous => previous?.type === "conflict" ? previous : null);
  }

  function addEntry(kind: EntryKind) {
    const entry = { id: crypto.randomUUID(), name: "", ...(kind === "items" ? { quantity: 1 } : {}) };
    setDraft(previous => ({ ...previous, [kind]: [...previous[kind], entry] }));
    setNotice(previous => previous?.type === "conflict" ? previous : null);
  }

  function changeEntry(kind: EntryKind, entryId: string, patch: Partial<WeavekeeperItem>) {
    setDraft(previous => ({
      ...previous,
      [kind]: previous[kind].map(entry => entry.id === entryId ? { ...entry, ...patch } : entry),
    }));
    setNotice(previous => previous?.type === "conflict" ? previous : null);
  }

  function removeEntry(kind: EntryKind, entryId: string) {
    setDraft(previous => ({ ...previous, [kind]: previous[kind].filter(entry => entry.id !== entryId) }));
    setNotice(previous => previous?.type === "conflict" ? previous : null);
  }

  async function reloadDraft() {
    if (!character) return;
    let source = character;
    if (notice?.type === "conflict") {
      const result = await refetch();
      if (!result.data || result.isError) {
        setNotice({ type: "conflict", text: "The latest character could not be loaded. Your edits are still here. Try reloading again when your connection is restored." });
        return;
      }
      source = result.data;
    }
    const latest = fromCharacter(source);
    setDraft(latest);
    setBaseline(latest);
    setNotice(null);
  }

  async function save() {
    if (!character || !validId || user?.role !== "weavekeeper" || mutation.isPending || notice?.type === "conflict") return;
    const emptyName = (["feats", "items", "backgrounds", "notes"] as EntryKind[])
      .some(kind => draft[kind].some(entry => !entry.name.trim()));
    const invalidQuantity = draft.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999);
    if (emptyName || invalidQuantity) {
      setNotice({ type: "error", text: emptyName ? "Every entry needs a name before it can be saved." : "Item quantities must be whole numbers from 1 to 999." });
      return;
    }
    const additions: WeavekeeperAdditions = {
      ...draft,
      feats: draft.feats.map(entry => ({ ...entry, name: entry.name.trim() })),
      items: draft.items.map(entry => ({ ...entry, name: entry.name.trim() })),
      backgrounds: draft.backgrounds.map(entry => ({ ...entry, name: entry.name.trim() })),
      notes: draft.notes.map(entry => ({ ...entry, name: entry.name.trim() })),
    };
    try {
      const updated = await mutation.mutateAsync({ id, data: { expectedVersion: character.version, additions } });
      queryClient.setQueryData(getGetCharacterQueryKey(id), updated);
      void queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
      const saved = fromCharacter(updated);
      setDraft(saved);
      setBaseline(saved);
      setNotice({ type: "success", text: "Sheet additions saved. The player's character sheet is now up to date." });
    } catch (error) {
      if ((error as { status?: number })?.status === 409) {
        setNotice({ type: "conflict", text: "This character changed elsewhere. Your edits are still here, but cannot be saved over the newer sheet. Review your work, then reload the latest version to discard this draft and start again." });
        void refetch();
      } else {
        setNotice({ type: "error", text: "Could not save these additions. Your edits are still here; please try again." });
      }
    }
  }

  if (user?.role !== "weavekeeper") {
    return <main className="tc-page flex min-h-[100dvh] items-center justify-center bg-background p-6 text-center">
      <div><ShieldHalf className="mx-auto mb-4 h-10 w-10 text-destructive/60" aria-hidden="true" />
        <h1 className="font-[family-name:'Cinzel',serif] text-2xl text-foreground">Access denied</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">Weavekeeper clearance required.</p>
      </div>
    </main>;
  }

  return (
    <main className="tc-page min-h-[100dvh] bg-background pb-32 text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/weavekeeper" data-testid="link-back-weavekeeper"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Weavekeeper / Characters
        </Link>

        <header className="mt-8 border-b border-primary/30 pb-7 sm:mt-10 sm:pb-9">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">The keeper's ledger</span>
          </div>
          <h1 className="font-[family-name:'Cinzel',serif] text-3xl leading-tight text-foreground sm:text-5xl">Sheet additions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Add what the story has earned: skills, feats, belongings, histories, and notes. These appear alongside the character's existing sheet, without changing their creation choices.
          </p>
        </header>

        {!validId ? (
          <div className="mt-8 border border-destructive/40 bg-card p-6 text-sm text-destructive" role="alert">Invalid character address.</div>
        ) : isLoading && !isFetchedAfterMount ? (
          <div className="mt-8 space-y-4" aria-label="Loading character">
            <div className="h-24 animate-pulse border border-border bg-card" />
            <div className="h-56 animate-pulse border border-border bg-card" />
            <div className="h-40 animate-pulse border border-border bg-card" />
          </div>
        ) : isError && initializedId.current !== id ? (
          <div className="mt-8 border border-destructive/40 bg-card p-6" role="alert">
            <h2 className={sectionTitle}>Character unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">The character could not be loaded. Check your connection and try again.</p>
            <button type="button" onClick={() => void refetch()} data-testid="button-retry-character"
              className="mt-4 border border-primary/50 px-4 py-2 font-mono text-xs text-primary hover:bg-primary/10">Retry loading</button>
          </div>
        ) : character && initializedId.current === character.id ? (
          <>
            <div className="my-7 flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 font-[family-name:'Cinzel',serif] text-lg text-primary">
                  {character.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-[family-name:'Cinzel',serif] text-lg" data-testid="text-character-name">{character.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Level {character.level} · {character.affinity || "No affinity"} · Revision {character.version}</p>
                </div>
              </div>
              <Link href={`/characters/${id}`} data-testid="link-view-character"
                className="border border-border px-3 py-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                View player sheet
              </Link>
            </div>

            {notice && (
              <div role={notice.type === "success" ? "status" : "alert"} data-testid={`status-additions-${notice.type}`}
                className={`mb-6 border p-4 text-sm leading-relaxed ${notice.type === "success" ? "border-primary/50 bg-primary/10 text-foreground" : "border-destructive/50 bg-destructive/10 text-foreground"}`}>
                <p>{notice.text}</p>
                {notice.type === "conflict" && (
                  <button type="button" onClick={() => void reloadDraft()} data-testid="button-reload-latest"
                    className="mt-3 inline-flex items-center gap-2 border border-primary/60 px-3 py-2 font-mono text-[11px] text-primary hover:bg-primary/10">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Discard my edits and load latest
                  </button>
                )}
              </div>
            )}

            <fieldset disabled={mutation.isPending} className="min-w-0">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <SkillSection title="Attunements" index="01" detail="Mark skills this character has become attuned to." selected={draft.attunements} onToggle={skill => toggleSkill("attunements", skill)} />
              <SkillSection title="Expertise" index="02" detail="Mark skills with doubled refinement bonus." selected={draft.expertise} onToggle={skill => toggleSkill("expertise", skill)} />
              <EntrySection kind="feats" title="Custom feats" index="03" detail="Extra abilities granted beyond creation and leveling." entries={draft.feats} onAdd={addEntry} onChange={changeEntry} onRemove={removeEntry} />
              <EntrySection kind="items" title="Items" index="04" detail="Treasures, tools, and provisions acquired in play." entries={draft.items} onAdd={addEntry} onChange={changeEntry} onRemove={removeEntry} />
              <EntrySection kind="backgrounds" title="Backgrounds" index="05" detail="Additional histories and origins revealed through play." entries={draft.backgrounds} onAdd={addEntry} onChange={changeEntry} onRemove={removeEntry} />
              <EntrySection kind="notes" title="Other notes" index="06" detail="Named details that belong on this character's record." entries={draft.notes} onAdd={addEntry} onChange={changeEntry} onRemove={removeEntry} />
            </div>
            </fieldset>

            <div className="mt-8 flex flex-col gap-3 border-t border-primary/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[11px] text-muted-foreground" data-testid="status-draft">
                {dirty ? "Unsaved changes in this ledger" : "All changes recorded"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void reloadDraft()} disabled={!dirty || mutation.isPending}
                  data-testid="button-discard-additions"
                  className="border border-border px-4 py-2.5 font-mono text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">
                  Discard changes
                </button>
                <button type="button" onClick={() => void save()} disabled={!dirty || mutation.isPending || notice?.type === "conflict"}
                  data-testid="button-save-additions"
                  className="inline-flex items-center justify-center gap-2 border border-primary bg-primary px-5 py-2.5 font-mono text-xs text-primary-foreground transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">
                  <Save className="h-3.5 w-3.5" aria-hidden="true" /> {mutation.isPending ? "Saving..." : "Save additions"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 h-24 animate-pulse border border-border bg-card" aria-label="Preparing character record" />
        )}
      </div>
    </main>
  );
}