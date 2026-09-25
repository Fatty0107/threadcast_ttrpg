import { useState } from "react";
import { getListRollsQueryKey, getGetRollDiscordStatusQueryKey, useListRolls, useGetRollDiscordStatus } from "@workspace/api-client-react";
import { formatModifier } from "@/lib/game-rules";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";

function formatTime(date: string) {
  return new Date(date).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

export function RollLog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: rolls = [], isLoading, isError, refetch } = useListRolls({
    query: {
      enabled: !!user,
      queryKey: [...getListRollsQueryKey(), user?.id],
      refetchInterval: 4000,
    },
  });
  const { data: discord } = useGetRollDiscordStatus({
    query: { enabled: user?.role === "weavekeeper" && open,
      queryKey: [...getGetRollDiscordStatusQueryKey(), user?.id], refetchInterval: 10000 },
  });

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3 py-2 font-mono text-xs border shadow-lg transition-all",
          open
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
        )}
        aria-expanded={open}
        aria-controls="shared-roll-log"
        title="Toggle Roll Log"
      >
        <span>⬡</span>
        <span>ROLL LOG</span>
        {rolls.length > 0 && (
          <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
            open ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>
            {Math.min(rolls.length, 99)}
          </span>
        )}
      </button>

      {open && (
        <div id="shared-roll-log" className="fixed bottom-16 right-3 sm:right-5 z-40 w-[min(22rem,calc(100vw-1.5rem))] max-h-[70vh] flex flex-col bg-card border border-border shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <span className="font-[family-name:'Cinzel',serif] text-sm text-primary uppercase tracking-wider">Shared Roll Log</span>
            <button onClick={() => setOpen(false)} aria-label="Close Roll Log" className="text-muted-foreground hover:text-foreground leading-none">✕</button>
          </div>

          {user.role === "weavekeeper" && discord && (
            <div className="border-b border-border px-3 py-2 text-[10px] text-muted-foreground space-y-1">
              {!discord.configured ? (
                <p className="text-destructive">Discord delivery is off in this deployment. Rolls still save to the shared log. In Render, open the threadcast service → Environment, add <strong>DISCORD_WEBHOOK_URL</strong>, then redeploy. Do not paste the URL in chat.</p>
              ) : !discord.valid ? (
                <p className="text-destructive">The Discord webhook URL is invalid. Check <strong>DISCORD_WEBHOOK_URL</strong> in the Render service's Environment settings. Use the complete Discord webhook URL with no trailing slash or query string. Rolls still save here.</p>
              ) : (
                <p>Rolls saved here · Discord delivery: {discord.recentSent} sent, {discord.recentFailed} failed, {discord.recentPending} pending (last 100 rolls).</p>
              )}
              {discord.recentFailed > 0 && discord.valid && (
                <p className="text-destructive">Some messages failed to deliver. Check the Discord webhook and Render service logs; in-app rolls are safe.</p>
              )}
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {isLoading && <div className="p-6 text-center text-muted-foreground">Loading rolls…</div>}
            {isError && (
              <div className="p-4 text-center text-destructive" role="alert">
                Could not load rolls. <button className="underline" onClick={() => refetch()}>Retry</button>
              </div>
            )}
            {!isLoading && !isError && rolls.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">No gameplay rolls yet.</div>
            )}
            {rolls.map((roll, i) => (
              <div key={roll.id} className={cn("px-3 py-2 border-b border-border/40 flex gap-2", i === 0 && "bg-muted/20")}>
                <div
                  className={cn("flex-shrink-0 w-9 h-9 flex items-center justify-center border text-base font-bold",
                    roll.isBreak ? "border-primary text-primary bg-primary/10"
                      : roll.isMisfire ? "border-destructive text-destructive bg-destructive/10"
                      : "border-border text-foreground")}
                  title={`Rolled with ${roll.diceName}`}
                  style={{ borderColor: roll.diceColor }}
                >
                  {roll.total}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-primary truncate font-bold">{roll.characterName}</span>
                    <span className="text-muted-foreground/70 truncate text-[10px]">({roll.playerName})</span>
                  </div>
                  <div className="text-muted-foreground truncate" title={roll.title}>{roll.title}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground/70 mt-0.5">
                    <span>
                      {roll.diceSides === 0 ? "1 flat" : roll.d2 === undefined ? `d${roll.diceSides}: ${roll.d1}` : `2d${roll.diceSides}: [${roll.d1}, ${roll.d2}]`}
                      {roll.extraDice.map(d => ` + d${d.sides}: ${d.value}`).join("")}
                      {roll.multiplier !== 1 && ` ×${roll.multiplier}`}
                      {roll.modifier !== 0 && ` ${formatModifier(roll.modifier)}`}
                      {roll.category === "damage" && " (min 1)"}
                    </span>
                    <span className={cn(roll.mode === "HARMONY" ? "text-chart-2" : roll.mode === "DISCORD" ? "text-destructive/70" : "")}>{roll.mode}</span>
                    {roll.dc && <span>DC {roll.dc}</span>}
                    <span className={cn(roll.outcome === "Failure" || roll.isMisfire ? "text-destructive" : "text-primary")}>{roll.outcome}</span>
                    <span className="ml-auto">{formatTime(roll.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground text-center">
            {rolls.length} recent shared roll{rolls.length !== 1 ? "s" : ""} · updates automatically
          </div>
        </div>
      )}
    </>
  );
}