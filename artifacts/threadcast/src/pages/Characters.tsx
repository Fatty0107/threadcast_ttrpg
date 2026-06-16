import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCharacters, useDeleteCharacter,
  getListCharactersQueryKey, type Character,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { calcMod, calcVPMax, ATTRIBUTE_DEFS } from "@/lib/ttrpg-data";
import { cn } from "@/lib/utils";
import { Scroll, Shield, Zap, Flame } from "lucide-react";

export default function Characters() {
  const { data: characters, isLoading } = useListCharacters();
  const deleteMutation = useDeleteCharacter();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleCreate() {
    setLocation("/build");
  }

  async function handleDelete(charId: number, charName: string) {
    if (confirm(`Burn ${charName}'s thread permanently? This cannot be undone.`)) {
      setDeletingId(charId);
      await queryClient.cancelQueries({ queryKey: getListCharactersQueryKey() });
      const snapshot = queryClient.getQueryData<Character[]>(getListCharactersQueryKey());
      queryClient.setQueryData(
        getListCharactersQueryKey(),
        (old: Character[] | undefined) => old?.filter(c => c.id !== charId) ?? [],
      );
      deleteMutation.mutate({ id: charId }, {
        onError: () => {
          queryClient.setQueryData(getListCharactersQueryKey(), snapshot);
        },
        onSettled: () => {
          setDeletingId(null);
          queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
        },
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-foreground tracking-wider">
              Character Roster
            </h1>
            <p className="font-mono text-xs text-muted-foreground mt-1">Select your thread or weave anew.</p>
          </div>
          <button
            onClick={handleCreate}
            className="group relative px-5 py-2.5 bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 transition-all duration-200 hover:shadow-[0_0_20px_rgba(180,120,60,0.35)] overflow-hidden"
          >
            <span className="relative z-10">+ WEAVE NEW CHARACTER</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 bg-card border border-border animate-pulse" />
            ))
          ) : characters?.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-16 h-16 border border-border/40 flex items-center justify-center text-muted-foreground/20">
                  <Scroll className="w-8 h-8" />
                </div>
                <div className="text-muted-foreground font-mono text-sm">No active threads found.</div>
                <button onClick={handleCreate} className="px-6 py-3 border border-primary/50 text-primary font-mono text-sm hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(180,120,60,0.2)] transition-all">
                  WEAVE YOUR FIRST CHARACTER →
                </button>
              </div>
            </div>
          ) : (
            characters?.map(char => {
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
                <div
                  key={char.id}
                  className={cn(
                    "group relative p-5 bg-card border border-border transition-all duration-200 overflow-hidden flex flex-col",
                    "hover:border-primary/30 hover:shadow-[0_0_20px_rgba(180,120,60,0.08)]",
                    isDeleting && "opacity-40 pointer-events-none"
                  )}
                >
                  {/* Level badge */}
                  <div className="absolute top-0 right-0 bg-primary/10 border-l border-b border-primary/20 px-2 py-0.5 font-mono text-[10px] text-primary">
                    LVL {level}
                  </div>

                  {/* Draft badge */}
                  {char.isDraft && (
                    <div className="absolute top-0 left-0 bg-yellow-600/10 border-r border-b border-yellow-600/20 px-2 py-0.5 font-mono text-[10px] text-yellow-600">
                      DRAFT
                    </div>
                  )}

                  {/* Portrait + Name */}
                  <div className="flex items-start gap-3 mb-3 pr-10 mt-1">
                    {data.avatarDataUrl ? (
                      <img
                        src={data.avatarDataUrl}
                        alt="Portrait"
                        className="w-13 h-13 object-cover border border-border flex-shrink-0 group-hover:border-primary/40 transition-colors"
                        style={{ width: 52, height: 52 }}
                      />
                    ) : (
                      <div className="w-13 h-13 border border-border/50 bg-muted/20 flex items-center justify-center text-muted-foreground/30 font-[family-name:'Cinzel',serif] text-lg flex-shrink-0" style={{ width: 52, height: 52 }}>
                        {char.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-lg font-[family-name:'Cinzel',serif] text-foreground mb-1.5 truncate group-hover:text-primary/90 transition-colors">
                        {char.name}
                      </h2>
                      <div className="flex flex-wrap gap-1">
                        {char.affinity && (
                          <span className="text-[10px] font-mono border border-chart-2/40 text-chart-2 px-1.5 py-0.5">{char.affinity}</span>
                        )}
                        {(data.primaryMode || char.mode) && (
                          <span className="text-[10px] font-mono border border-primary/40 text-primary px-1.5 py-0.5">{data.primaryMode || char.mode}</span>
                        )}
                        {data.background && (
                          <span className="text-[10px] font-mono border border-border text-muted-foreground px-1.5 py-0.5 truncate max-w-[100px]">{data.background}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attribute mini row */}
                  <div className="grid grid-cols-6 gap-1 mb-3 font-mono text-[10px]">
                    {ATTRIBUTE_DEFS.map(a => {
                      const val = attrs[a.key] || 10;
                      const mod = calcMod(val);
                      return (
                        <div key={a.key} className="text-center">
                          <div className="text-muted-foreground/40 mb-0.5">{a.abbr}</div>
                          <div className="text-foreground">{val}</div>
                          <div className={cn("text-[9px]", mod >= 0 ? "text-chart-2/70" : "text-destructive/70")}>
                            {mod >= 0 ? "+" : ""}{mod}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* VP bar */}
                  <div className="mb-2">
                    <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> VP</span>
                      <span className={cn(vpPercent <= 25 ? "text-destructive" : vpPercent <= 50 ? "text-yellow-500" : "text-chart-2")}>
                        {vpCurrent}/{maxVP}
                      </span>
                    </div>
                    <div className="h-1.5 bg-background border border-border/50">
                      <div
                        className={cn("h-full transition-all duration-300", vpPercent <= 25 ? "bg-destructive" : vpPercent <= 50 ? "bg-yellow-500" : "bg-chart-2")}
                        style={{ width: `${vpPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Burnout indicator */}
                  {burnout > 0 && (
                    <div className="mb-2 flex gap-0.5">
                      <Flame className="w-3 h-3 text-destructive/50 mr-0.5 flex-shrink-0" />
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={cn("h-1.5 flex-1", i < burnout ? "bg-destructive/70" : "bg-border/30")} />
                      ))}
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-border/30">
                    <button
                      onClick={() => setLocation(`/characters/${char.id}`)}
                      className="py-1.5 text-[11px] font-mono border border-primary/40 text-primary hover:bg-primary/10 hover:shadow-[0_0_8px_rgba(180,120,60,0.2)] transition-all"
                    >
                      VIEW
                    </button>
                    <button
                      onClick={() => setLocation(`/characters/${char.id}/build`)}
                      className="py-1.5 text-[11px] font-mono border border-chart-2/40 text-chart-2 hover:bg-chart-2/10 transition-all"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(char.id, char.name)}
                      disabled={isDeleting}
                      className="py-1.5 text-[11px] font-mono border border-destructive/30 text-destructive/60 hover:border-destructive hover:text-destructive disabled:opacity-30 transition-all"
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
    </div>
  );
}
