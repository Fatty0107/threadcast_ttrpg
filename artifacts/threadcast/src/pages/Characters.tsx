import { useState } from "react";
import { useListCharacters, useCreateCharacter, useDeleteCharacter } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { calcMod, calcVPMax, ATTRIBUTE_DEFS } from "@/lib/ttrpg-data";
import { cn } from "@/lib/utils";

export default function Characters() {
  const { data: characters, isLoading } = useListCharacters();
  const createMutation = useCreateCharacter();
  const deleteMutation = useDeleteCharacter();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleCreate() {
    setLocation("/build");
  }

  function handleDelete(charId: number, charName: string) {
    if (confirm(`Burn ${charName}'s thread permanently? This cannot be undone.`)) {
      setDeletingId(charId);
      deleteMutation.mutate({ id: charId }, {
        onSettled: () => setDeletingId(null),
      });
    }
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-foreground">Character Roster</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">Select your thread or weave anew.</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 transition-colors"
        >
          + WEAVE NEW CHARACTER
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 bg-card border border-border animate-pulse" />
          ))
        ) : characters?.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <div className="text-muted-foreground font-mono text-sm mb-4">No active threads found.</div>
            <button onClick={handleCreate} className="px-6 py-3 border border-primary/50 text-primary font-mono text-sm hover:bg-primary/10 transition-colors">
              WEAVE YOUR FIRST CHARACTER →
            </button>
          </div>
        ) : (
          characters?.map(char => {
            const data = (char.data as any) || {};
            const attrs = data.attributes || {};
            const vp = data.vitalityPoints || {};
            const burnout = data.burnout || 0;
            const level = char.level || 1;
            const maxVP = vp.max || calcVPMax(attrs.res || 10, level);
            const vpCurrent = vp.current || 0;
            const vpPercent = Math.min(100, Math.max(0, (vpCurrent / maxVP) * 100));
            const isDeleting = deletingId === char.id;

            return (
              <div
                key={char.id}
                className={cn(
                  "p-5 bg-card border border-border transition-all relative overflow-hidden flex flex-col",
                  isDeleting && "opacity-50 pointer-events-none"
                )}
              >
                {/* Level badge */}
                <div className="absolute top-0 right-0 bg-muted border-l border-b border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  LVL {level}
                </div>

                {/* Portrait + Name */}
                <div className="flex items-start gap-3 mb-3 pr-10">
                  {data.avatarDataUrl ? (
                    <img
                      src={data.avatarDataUrl}
                      alt="Portrait"
                      className="w-12 h-12 object-cover border border-border flex-shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="text-xl font-[family-name:'Cinzel',serif] text-foreground mb-1 truncate">
                      {char.name}
                    </h2>
                    {/* Identity pills */}
                    <div className="flex flex-wrap gap-1">
                      {char.affinity && (
                        <span className="text-[10px] font-mono border border-chart-2/40 text-chart-2 px-1.5 py-0.5">{char.affinity}</span>
                      )}
                      {(data.primaryMode || char.mode) && (
                        <span className="text-[10px] font-mono border border-primary/40 text-primary px-1.5 py-0.5">{data.primaryMode || char.mode}</span>
                      )}
                      {data.background && (
                        <span className="text-[10px] font-mono border border-border text-muted-foreground px-1.5 py-0.5">{data.background}</span>
                      )}
                      {char.isDraft && (
                        <span className="text-[10px] font-mono border border-yellow-600/40 text-yellow-600 px-1.5 py-0.5">DRAFT</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attribute mini row */}
                <div className="grid grid-cols-6 gap-1 mb-3 font-mono text-[10px]">
                  {ATTRIBUTE_DEFS.map(a => (
                    <div key={a.key} className="text-center">
                      <div className="text-muted-foreground/40">{a.abbr}</div>
                      <div className="text-foreground">{attrs[a.key] || "—"}</div>
                    </div>
                  ))}
                </div>

                {/* VP bar */}
                <div className="mb-3">
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-0.5">
                    <span>VP</span>
                    <span className={vpPercent <= 25 ? "text-destructive" : ""}>{vpCurrent}/{maxVP}</span>
                  </div>
                  <div className="h-1.5 bg-background border border-border/50">
                    <div
                      className={cn("h-full transition-all", vpPercent <= 25 ? "bg-destructive" : vpPercent <= 50 ? "bg-primary" : "bg-accent")}
                      style={{ width: `${vpPercent}%` }}
                    />
                  </div>
                </div>

                {/* Burnout indicator */}
                {burnout > 0 && (
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={cn("h-1 flex-1", i < burnout ? "bg-destructive" : "bg-border/30")} />
                    ))}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-border/30">
                  <button
                    onClick={() => setLocation(`/characters/${char.id}`)}
                    className="py-1.5 text-[11px] font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                  >
                    VIEW
                  </button>
                  <button
                    onClick={() => setLocation(`/characters/${char.id}/build`)}
                    className="py-1.5 text-[11px] font-mono border border-chart-2/40 text-chart-2 hover:bg-chart-2/10 transition-colors"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete(char.id, char.name)}
                    disabled={isDeleting}
                    className="py-1.5 text-[11px] font-mono border border-destructive/30 text-destructive/60 hover:border-destructive hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    {isDeleting ? "..." : "DELETE"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
