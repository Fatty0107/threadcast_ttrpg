import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListCharacters, useDeleteCharacter, getListCharactersQueryKey, type Character } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { calcMod, calcVPMax, ATTRIBUTE_DEFS } from "@/lib/ttrpg-data";
import { cn } from "@/lib/utils";
import { ArrowRight, BookOpen, Dices, Feather, Flame, Plus, Search, Shield, Sparkles, Trash2, X } from "lucide-react";
import "@/styles/journal-entry.css";

export default function Characters() {
  const { data: characters, isLoading, isError, refetch } = useListCharacters();
  const deleteMutation = useDeleteCharacter();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "drafts">("all");
  const [deleteError, setDeleteError] = useState("");
  const roster = characters ?? [];
  const readyCount = roster.filter(character => !character.isDraft).length;
  const visibleCharacters = roster.filter(character => {
    const data = (character.data as any) || {};
    const query = search.trim().toLowerCase();
    const matchesSearch = [character.name, character.affinity, data.primaryMode || character.mode, data.background, data.guild]
      .some(value => String(value || "").toLowerCase().includes(query));
    return matchesSearch && (filter === "all" || (filter === "drafts" ? character.isDraft : !character.isDraft));
  });

  function handleCreate() { setLocation("/build"); }

  async function handleDelete(charId: number, charName: string) {
    if (confirm(`Burn ${charName}'s thread permanently? This cannot be undone.`)) {
      setDeletingId(charId);
      setDeleteError("");
      await queryClient.cancelQueries({ queryKey: getListCharactersQueryKey() });
      const snapshot = queryClient.getQueryData<Character[]>(getListCharactersQueryKey());
      queryClient.setQueryData(getListCharactersQueryKey(), (old: Character[] | undefined) => old?.filter(c => c.id !== charId) ?? []);
      deleteMutation.mutate({ id: charId }, {
        onError: () => {
          queryClient.setQueryData(getListCharactersQueryKey(), snapshot);
          setDeleteError(`${charName} could not be deleted. Your character is still in the roster.`);
        },
        onSettled: () => {
          setDeletingId(null);
          queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        },
      });
    }
  }

  return (
    <main className="ae-roster">
      <div className="ae-roster-inner">
        <section className="ae-roster-hero" aria-labelledby="roster-heading">
          <div className="ae-roster-hero-art" aria-hidden="true" />
          <div className="ae-roster-hero-copy">
            <p className="ae-kicker"><span /> THE WORLD OF AETHROS</p>
            <h1 id="roster-heading">Every thread,<br /><em>a story.</em></h1>
            <p>Your characters. Their choices. The stories still to be woven.</p>
            <button onClick={handleCreate} className="ae-gold-button"><Plus size={17} aria-hidden="true" /> Weave a new character <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
          <div className="ae-hero-caption" aria-hidden="true"><span>THE WEAVE ENDURES</span><span>✦</span></div>
        </section>

        <div className="ae-roster-heading">
          <div><p className="ae-kicker">YOUR CHRONICLE</p><h2>Character roster <span>{isLoading ? "—" : roster.length}</span></h2></div>
          <div className="ae-library-links"><Link href="/compendium"><BookOpen size={15} aria-hidden="true" /> Compendium</Link><Link href="/dice"><Dices size={16} aria-hidden="true" /> Dice Atelier</Link></div>
        </div>
        <div className="ae-roster-toolbar">
          <div className="ae-roster-filters" role="group" aria-label="Filter characters">
            {([['all', 'All characters', roster.length], ['ready', 'Ready to play', readyCount], ['drafts', 'Drafts', roster.length - readyCount]] as const).map(([value, label, count]) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>
            ))}
          </div>
          <div className="ae-roster-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search characters by name, affinity, mode, background or guild" placeholder="Find a character…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={15} /></button>}</div>
        </div>
        {deleteError && <p role="alert" className="ae-inline-error">{deleteError}</p>}
        <div className="ae-roster-grid" aria-busy={isLoading}>
          {isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="ae-character-skeleton" aria-label="Loading character"><div /><span /><span /><span /></div>) : isError ? (
            <div className="ae-roster-empty" role="alert"><BookOpen size={30} /><h3>The chronicle couldn’t be loaded.</h3><p>Please try again to retrieve your characters.</p><button className="ae-gold-button" onClick={() => void refetch()}>Try again <ArrowRight size={16} /></button></div>
          ) : roster.length === 0 ? (
            <div className="ae-roster-empty"><Feather size={32} /><h3>Your first story starts here.</h3><p>Weave a character and find your place in Aethros.</p><button className="ae-gold-button" onClick={handleCreate}><Plus size={16} /> Create your first character</button></div>
          ) : visibleCharacters.length === 0 ? (
            <div className="ae-roster-empty"><Search size={30} /><h3>No threads found.</h3><p>Try another name, affinity, or mode.</p><button className="ae-outline-button" onClick={() => { setSearch(""); setFilter("all"); }}>Show all characters</button></div>
          ) : visibleCharacters.map((char, index) => {
            const data = (char.data as any) || {};
            const attrs = data.attributes || {};
            const vp = data.vitalityPoints || {};
            const burnout = data.burnout || 0;
            const level = char.level || 1;
            const maxVP = vp.max || calcVPMax(attrs.res || 10, level);
            const vpCurrent = vp.current ?? maxVP;
            const vpPercent = Math.min(100, Math.max(0, (vpCurrent / maxVP) * 100));
            const isDeleting = deletingId === char.id;
            return (
              <article key={char.id} className={cn("ae-character-card", isDeleting && "ae-character-deleting")} style={{ animationDelay: `${Math.min(index, 5) * 55}ms` }}>
                <div className="ae-character-card-top"><span>{char.isDraft ? <><Feather size={12} /> Draft in progress</> : <><span className="ae-ready-dot" /> Ready to play</>}</span><span className="ae-character-level">LEVEL <strong>{String(level).padStart(2, "0")}</strong></span></div>
                <div className="ae-character-identity">
                  <div className="ae-character-portrait">{data.avatarDataUrl ? <img src={data.avatarDataUrl} alt={`${char.name} portrait`} loading="lazy" /> : <span aria-hidden="true">{char.name.charAt(0).toUpperCase()}</span>}</div>
                  <div><h3><Link href={`/characters/${char.id}`}>{char.name}</Link></h3><p>{data.primaryMode || char.mode || "Weaver"}{data.background ? ` · ${data.background}` : ""}</p></div>
                </div>
                <div className="ae-character-affinity"><Sparkles size={13} aria-hidden="true" /><span>{char.affinity || "Affinity unchosen"}</span><span className="ae-affinity-line" /></div>
                <dl className="ae-character-attributes">{ATTRIBUTE_DEFS.map(attribute => {
                  const value = attrs[attribute.key] || 10;
                  const modifier = calcMod(value);
                  return <div key={attribute.key}><dt title={attribute.label}>{attribute.abbr}</dt><dd>{value}<span className={modifier < 0 ? "ae-negative" : ""}>{modifier >= 0 ? "+" : ""}{modifier}</span></dd></div>;
                })}</dl>
                <div className="ae-character-vitality"><div><span><Shield size={13} aria-hidden="true" /> Vitality</span><span>{vpCurrent}<small> / {maxVP} VP</small></span></div><div className="ae-vitality-track" role="progressbar" aria-label={`${char.name} vitality`} aria-valuemin={0} aria-valuemax={maxVP} aria-valuenow={vpCurrent}><span className={cn(vpPercent <= 25 ? "ae-health-low" : vpPercent <= 50 ? "ae-health-mid" : "")} style={{ width: `${vpPercent}%` }} /></div></div>
                {burnout > 0 && <div className="ae-burnout-summary"><Flame size={13} aria-hidden="true" /><span>Burnout {burnout}/6</span><div>{Array.from({ length: 6 }).map((_, step) => <i key={step} data-active={step < burnout} />)}</div></div>}
                <div className="ae-character-actions"><Link href={`/characters/${char.id}`} className="ae-open-sheet" aria-label={`Open ${char.name}'s character sheet`}>Open sheet <ArrowRight size={16} aria-hidden="true" /></Link><Link href={`/characters/${char.id}/build`} className="ae-edit-character" aria-label={`Edit ${char.name}`}><Feather size={15} aria-hidden="true" /><span>Edit</span></Link><button onClick={() => void handleDelete(char.id, char.name)} disabled={isDeleting} className="ae-delete-character" title={`Delete ${char.name}`} aria-label={`Delete ${char.name}`}><Trash2 size={15} aria-hidden="true" /></button></div>
              </article>
            );
          })}
        </div>
        {!isLoading && !isError && roster.length > 0 && <div className="ae-roster-footer"><span aria-live="polite">Showing {visibleCharacters.length} of {roster.length} characters</span><span aria-hidden="true">✦</span><span>Every choice leaves a thread.</span></div>}
      </div>
    </main>
  );
}
