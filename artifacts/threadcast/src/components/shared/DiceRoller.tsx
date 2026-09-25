import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatModifier } from "@/lib/game-rules";
import { useActiveDiceStyle } from "@/lib/dice-style";
import { useGameplayRoll, rollErrorMessage } from "@/lib/gameplay-roll";
import { DiceStage, ROLL_DURATION_MS, type StageDie } from "./DiceStage";
import { Link } from "wouter";
import { Dices, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import type { DiceStyle, GameplayRoll } from "@workspace/api-client-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type RollMode = "NORMAL" | "HARMONY" | "DISCORD";
type DamageDice = { diceSides: 0 | 4 | 6 | 8 | 10 | 12; diceCount: 0 | 1 | 2; bonusDiceSides?: 4 | 6 | 8 | 10 | 12; bonusDiceCount?: 1 | 2 };

interface DiceRollerContextType {
  openRoll: (title: string, modifier: number, characterName?: string, characterId?: number, damage?: DamageDice) => void;
}

const DiceRollerContext = createContext<DiceRollerContextType | undefined>(undefined);

export function DiceRollerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const recordRoll = useGameplayRoll();
  const { style, isLoading: diceLoading, isError: diceLoadError, refetch: retryDice } = useActiveDiceStyle();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [modifier, setModifier] = useState(0);
  const [characterName, setCharacterName] = useState("Unknown");
  const [characterId, setCharacterId] = useState<number | undefined>();
  const [damage, setDamage] = useState<DamageDice | undefined>();
  const [mode, setMode] = useState<RollMode>("NORMAL");
  const [isRolling, setIsRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState<StageDie[]>([]);
  const [rollKey, setRollKey] = useState(0);
  const [rollStyle, setRollStyle] = useState<DiceStyle | null>(null);
  const [currentResult, setCurrentResult] = useState<GameplayRoll | null>(null);
  const [rollError, setRollError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestLock = useRef(false);
  const accountRef = useRef(user?.id);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (accountRef.current === user?.id) return;
    accountRef.current = user?.id;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    requestLock.current = false;
    setIsOpen(false);
    setCurrentResult(null);
    setIsRolling(false);
    setRollStyle(null);
  }, [user?.id]);

  const openRoll = useCallback((newTitle: string, newModifier: number, newCharacterName = "Unknown", newCharacterId?: number, newDamage?: DamageDice) => {
    if (timer.current) clearTimeout(timer.current);
    returnFocusRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    setTitle(newTitle);
    setModifier(newModifier);
    setCharacterName(newCharacterName);
    setCharacterId(newCharacterId);
    setDamage(newDamage);
    setRollError("");
    setMode("NORMAL");
    setCurrentResult(null);
    setIsRolling(false);
    setRollingDice([]);
    setRollStyle(null);
    setIsOpen(true);
  }, []);

  const executeRoll = async () => {
    if (requestLock.current || isRolling || diceLoading) return;
    requestLock.current = true;
    setIsRolling(true);
    setRollError("");
    let result: GameplayRoll;
    try {
      result = await recordRoll({ title, modifier, characterId, mode: damage ? "NORMAL" : mode,
        category: damage ? "damage" : "check", diceSides: damage?.diceSides ?? 20,
        diceCount: damage?.diceCount ?? (mode === "NORMAL" ? 1 : 2),
        bonusDiceSides: damage?.bonusDiceSides, bonusDiceCount: damage?.bonusDiceCount, multiplier: 1 });
    } catch (error) {
      requestLock.current = false;
      setRollError(rollErrorMessage(error));
      setIsRolling(false);
      return;
    }
    if (accountRef.current !== user?.id) return;
    const { d1, d2 } = result;
    setRollingDice(damage?.diceSides === 0 ? [] : [
      { sides: (damage?.diceSides ?? 20) as StageDie["sides"], value: d1 },
      ...(d2 === undefined ? [] : [{ sides: (damage?.diceSides ?? 20) as StageDie["sides"], value: d2 }]),
      ...result.extraDice.map(d => ({ sides: d.sides as StageDie["sides"], value: d.value })),
    ]);
    setRollStyle(style);
    setRollKey(key => key + 1);
    setCurrentResult(null);
    timer.current = setTimeout(() => {
      setCurrentResult(result);
      requestLock.current = false;
      setIsRolling(false);
      timer.current = null;
    }, ROLL_DURATION_MS);
  };

  return (
    <DiceRollerContext.Provider value={{ openRoll }}>
      {children}

      <DialogPrimitive.Root open={isOpen} onOpenChange={open => { if (!open && !isRolling) setIsOpen(false); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/85" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onInteractOutside={event => event.preventDefault()}
            onEscapeKeyDown={event => { if (isRolling) event.preventDefault(); }}
            onCloseAutoFocus={event => {
              if (returnFocusRef.current?.isConnected) {
                event.preventDefault();
                returnFocusRef.current.focus();
              }
              returnFocusRef.current = null;
            }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-3 sm:p-5 font-mono outline-none"
          >
            <div className="relative w-full max-w-lg max-h-[94dvh] overflow-y-auto bg-card border border-primary/30 p-5 sm:p-7 shadow-[0_25px_100px_rgba(0,0,0,.7)]">
            <button
              onClick={() => setIsOpen(false)}
              disabled={isRolling}
              aria-label="Close dice roller"
              data-testid="button-close-dice-roll"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg leading-none disabled:opacity-30"
            >
              ✕
            </button>

            <div className="mb-2 text-[10px] text-primary uppercase tracking-[.22em]">THREADCAST / DICE TABLE</div>
            <div className="mb-1 text-xs text-muted-foreground uppercase tracking-widest">{characterName}</div>
            <DialogPrimitive.Title className="font-[family-name:'Cinzel',serif] text-2xl text-foreground font-semibold mb-1">{title}</DialogPrimitive.Title>
            <div className="flex items-center justify-between gap-3 mb-5 text-xs text-muted-foreground">
              <span>{damage ? "Damage" : "Thread Check"} · {formatModifier(modifier)} modifier</span>
              <Link href="/dice" aria-disabled={isRolling} onClick={event => {
                if (isRolling) event.preventDefault();
                else setIsOpen(false);
              }} className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-4">
                <Sparkles className="h-3 w-3" /> YOUR DICE
              </Link>
            </div>

            {diceLoading ? (
              <div className="mb-3 flex h-48 items-center justify-center border border-border text-xs uppercase tracking-widest text-muted-foreground" role="status">
                Calling your dice to the table…
              </div>
            ) : damage?.diceSides === 0 ? (
              <div className="mb-3 flex h-48 items-center justify-center border border-border text-sm text-muted-foreground">
                Flat damage · 1 {formatModifier(modifier)} (minimum 1)
              </div>
            ) : (
              <DiceStage
                dice={isRolling || currentResult ? rollingDice : damage
                  ? [...Array.from({ length: damage.diceCount }, () => ({ sides: damage.diceSides as StageDie["sides"], value: damage.diceSides })),
                     ...Array.from({ length: damage.bonusDiceCount ?? 0 }, () => ({ sides: damage.bonusDiceSides as StageDie["sides"], value: damage.bonusDiceSides! }))]
                  : mode === "NORMAL" ? [{ sides: 20, value: 20 }] : [{ sides: 20, value: 16 }, { sides: 20, value: 8 }]}
                style={(isRolling || currentResult) && rollStyle ? rollStyle : style}
                phase={isRolling ? "rolling" : currentResult ? "settled" : "preview"}
                rollKey={rollKey}
                height={mode === "NORMAL" && !isRolling && !currentResult ? 195 : 215}
                className="mb-3"
              />
            )}
            <div className="mb-5 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[.13em] text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border" style={{ backgroundColor: style.bodyColor, borderColor: style.edgeColor }} />
                {(isRolling || currentResult) && rollStyle ? rollStyle.name : style.name}
              </span>
              <span>{style.finish} · {style.motif}</span>
            </div>
            {diceLoadError && (
              <div className="mb-4 border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive" role="alert">
                Your saved dice could not be loaded. Rolls use the house set until they reconnect.{" "}
                <button type="button" className="underline" onClick={() => retryDice()}>Retry</button>
              </div>
            )}
            {rollError && <div className="mb-3 text-xs text-destructive" role="alert">Roll not saved: {rollError}</div>}

            {!currentResult && !isRolling && (
              <div className="space-y-4">
                {!damage && <div className="flex gap-2">
                  {(["NORMAL", "HARMONY", "DISCORD"] as RollMode[]).map(m => (
                    <button
                      key={m}
                      data-testid={`button-roll-mode-${m.toLowerCase()}`}
                      aria-pressed={mode === m}
                      className={`flex-1 py-2 text-xs font-mono border transition-colors ${
                        mode === m
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                      onClick={() => setMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>}
                <div className="text-[10px] text-muted-foreground font-mono text-center">
                  {damage ? `${damage.diceCount ? `${damage.diceCount}d${damage.diceSides}` : "1 flat"}${damage.bonusDiceCount ? ` + ${damage.bonusDiceCount}d${damage.bonusDiceSides}` : ""} ${formatModifier(modifier)} (minimum 1)` : <>
                    {mode === "HARMONY" && "2d20 keep highest — conditions favor you"}
                    {mode === "DISCORD" && "2d20 keep lowest — conditions are against you"}
                    {mode === "NORMAL" && "1d20 — standard Thread Check"}
                  </>}
                </div>
                <Button className="w-full h-14 text-sm sm:text-base tracking-[.16em]" onClick={executeRoll} disabled={diceLoading} data-testid="button-roll-thread-check">
                  <Dices className="mr-2 h-5 w-5" /> {diceLoading ? "LOADING YOUR DICE" : damage ? "ROLL DAMAGE" : "CAST THE DICE"}
                </Button>
              </div>
            )}

            {isRolling && (
              <div className="py-2 text-center text-xs uppercase tracking-[.2em] text-primary animate-pulse" role="status">Thread in motion…</div>
            )}

            {currentResult && !isRolling && (
              <div className="text-center pt-2 animate-in fade-in duration-200" aria-live="polite" data-testid="result-dice-roll">
                {currentResult.isBreak && (
                  <div className="text-primary font-bold text-lg mb-3 tracking-widest animate-pulse">
                    ✦ THREAD BREAK ✦
                  </div>
                )}
                {currentResult.isMisfire && (
                  <div className="text-destructive font-bold text-lg mb-3 tracking-widest">
                    ✸ MISFIRE — SNAPBACK ✸
                  </div>
                )}

                 <div className="flex justify-center items-end gap-3 mb-6">
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {damage ? `${damage.diceCount ? `${damage.diceCount}d${damage.diceSides}` : "flat"}${currentResult.extraDice.length ? ` + ${currentResult.extraDice.length} bonus dice` : ""}` : currentResult.mode === "NORMAL" ? "d20" : currentResult.mode === "HARMONY" ? `[${currentResult.d1}, ${currentResult.d2}] ▲ keep highest` : `[${currentResult.d1}, ${currentResult.d2}] ▼ keep lowest`}
                    </div>
                    <div className="text-3xl text-foreground">
                      {damage ? currentResult.finalDie : currentResult.d2 === undefined ? currentResult.d1 : currentResult.mode === "HARMONY" ? Math.max(currentResult.d1, currentResult.d2) : Math.min(currentResult.d1, currentResult.d2)}
                    </div>
                  </div>
                  <div className="text-xl text-muted-foreground mb-1">{formatModifier(modifier)}</div>
                  <div className="text-xl text-muted-foreground mb-1">=</div>
                  <div
                    className={`text-6xl font-bold ${
                      currentResult.isBreak ? "text-primary" : currentResult.isMisfire ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {currentResult.total}
                  </div>
                </div>

                {damage && <p className="mb-4 text-xs text-muted-foreground">
                  {damage.diceSides === 0 ? "1 flat" : [currentResult.d1, currentResult.d2].filter(v => v !== undefined).join(" + ")}
                  {currentResult.extraDice.map(d => ` + ${d.value} (d${d.sides})`).join("")} {formatModifier(modifier)}
                </p>}
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => { setCurrentResult(null); setRollingDice([]); }} data-testid="button-roll-again">
                    ROLL AGAIN
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} data-testid="button-close-roll-result">
                    CLOSE
                  </Button>
                </div>
              </div>
            )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </DiceRollerContext.Provider>
  );
}

export function useDiceRoller() {
  const context = useContext(DiceRollerContext);
  if (!context) throw new Error("useDiceRoller must be used within DiceRollerProvider");
  return context;
}
