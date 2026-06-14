import { useState } from "react";
import { useDiceRoller } from "@/components/shared/DiceRoller";
import { formatModifier } from "@/lib/game-rules";
import { cn } from "@/lib/utils";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function RollLog() {
  const { rolls } = useDiceRoller();
  const [open, setOpen] = useState(false);

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
        title="Toggle Roll Log"
      >
        <span>⬡</span>
        <span>ROLL LOG</span>
        {rolls.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
              open ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
            )}
          >
            {Math.min(rolls.length, 99)}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-16 right-5 z-40 w-80 max-h-[60vh] flex flex-col bg-card border border-border shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <span className="font-[family-name:'Cinzel',serif] text-sm text-primary uppercase tracking-wider">Roll Log</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground leading-none"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {rolls.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                No rolls yet.
              </div>
            )}
            {rolls.map((roll, i) => (
              <div
                key={roll.id}
                className={cn(
                  "px-3 py-2 border-b border-border/40 flex gap-2",
                  i === 0 && "bg-muted/20"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-9 h-9 flex items-center justify-center border text-base font-bold",
                    roll.isBreak
                      ? "border-primary text-primary bg-primary/10"
                      : roll.isMisfire
                      ? "border-destructive text-destructive bg-destructive/10"
                      : "border-border text-foreground"
                  )}
                >
                  {roll.total}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-primary truncate font-bold">{roll.characterName}</span>
                    {roll.isBreak && <span className="text-primary text-[9px]">BREAK</span>}
                    {roll.isMisfire && <span className="text-destructive text-[9px]">MISFIRE</span>}
                  </div>
                  <div className="text-muted-foreground truncate">{roll.title}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
                    <span>
                      {roll.mode !== "NORMAL"
                        ? `[${roll.d1},${roll.d2}]`
                        : roll.d1}
                      {" "}{formatModifier(roll.modifier)}
                    </span>
                    <span>·</span>
                    <span className={cn(
                      roll.mode === "HARMONY" ? "text-chart-2" : roll.mode === "DISCORD" ? "text-destructive/70" : ""
                    )}>
                      {roll.mode}
                    </span>
                    <span className="ml-auto">{formatTime(roll.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rolls.length > 0 && (
            <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground text-center">
              {rolls.length} roll{rolls.length !== 1 ? "s" : ""} this session
            </div>
          )}
        </div>
      )}
    </>
  );
}
