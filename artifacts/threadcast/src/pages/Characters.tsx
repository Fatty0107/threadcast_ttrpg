import { useListCharacters, useCreateCharacter, useDeleteCharacter } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { calcMod, calcVPMax, ATTRIBUTE_DEFS } from "@/lib/ttrpg-data";
import { cn } from "@/lib/utils";

export default function Characters() {
  const { data: characters, isLoading } = useListCharacters();
  const createMutation = useCreateCharacter();
  const deleteMutation = useDeleteCharacter();
  const [, setLocation] = useLocation();

  function handleCreate() {
    setLocation("/build");
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
            <div key={i} className="h-44 bg-card border border-border animate-pulse" />
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
            const tension = data.tension || {};
            const vpPercent = Math.min(100, Math.max(0, (vpCurrent / maxVP) * 100));

            return (
              <Link key={char.id} href={`/characters/${char.id}`}>
                <div className="block h-full p-5 bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                  {/* Level badge */}
                  <div className="absolute top-0 right-0 bg-muted border-l border-b border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    LVL {level}
                  </div>

                  {/* Name */}
                  <h2 className="text-xl font-[family-name:'Cinzel',serif] text-foreground group-hover:text-primary transition-colors mb-1 pr-12 truncate">
                    {char.name}
                  </h2>

                  {/* Identity pills */}
                  <div className="flex flex-wrap gap-1 mb-3">
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
                  <div>
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
                    <div className="mt-2 flex gap-0.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={cn("h-1 flex-1", i < burnout ? "bg-destructive" : "bg-border/30")} />
                      ))}
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    className="absolute bottom-3 right-3 text-[10px] font-mono text-muted-foreground/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Burn ${char.name}'s thread permanently?`)) {
                        deleteMutation.mutate({ id: char.id });
                      }
                    }}
                  >
                    × DELETE
                  </button>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
