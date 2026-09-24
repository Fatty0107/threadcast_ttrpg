import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatModifier } from "@/lib/game-rules";
import { useActiveDiceStyle, rollDie } from "@/lib/dice-style";
import { DiceStage, ROLL_DURATION_MS, type StageDie } from "./DiceStage";
import { Link } from "wouter";
import { Dices, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import type { DiceStyle } from "@workspace/api-client-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type RollMode = "NORMAL" | "HARMONY" | "DISCORD";

export interface RollResult {
  id: string;
  characterName: string;
  title: string;
  mode: RollMode;
  d1: number;
  d2?: number;
  modifier: number;
  total: number;
  isBreak: boolean;
  isMisfire: boolean;
  diceName: string;
  diceColor: string;
  timestamp: number;
}

interface DiceRollerContextType {
  openRoll: (title: string, modifier: number, characterName?: string) => void;
  rolls: RollResult[];
}

const DiceRollerContext = createContext<DiceRollerContextType | undefined>(undefined);

export function DiceRollerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { style, isLoading: diceLoading, isError: diceLoadError, refetch: retryDice } = useActiveDiceStyle();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [modifier, setModifier] = useState(0);
  const [characterName, setCharacterName] = useState("Unknown");
  const [mode, setMode] = useState<RollMode>("NORMAL");
  const [isRolling, setIsRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState<StageDie[]>([]);
  const [rollKey, setRollKey] = useState(0);
  const [rollStyle, setRollStyle] = useState<DiceStyle | null>(null);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountRef = useRef(user?.id);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (accountRef.current === user?.id) return;
    accountRef.current = user?.id;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRolls([]);
    setIsOpen(false);
    setCurrentResult(null);
    setIsRolling(false);
    setRollStyle(null);
  }, [user?.id]);

  const openRoll = useCallback((newTitle: string, newModifier: number, newCharacterName = "Unknown") => {
    if (timer.current) clearTimeout(timer.current);
    returnFocusRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    setTitle(newTitle);
    setModifier(newModifier);
    setCharacterName(newCharacterName);
    setMode("NORMAL");
    setCurrentResult(null);
    setIsRolling(false);
    setRollingDice([]);
    setRollStyle(null);
    setIsOpen(true);
  }, []);

  const executeRoll = () => {
    if (isRolling || diceLoading) return;
    const d1 = rollDie(20);
    const d2 = mode === "NORMAL" ? undefined : rollDie(20);
    const finalDie = d2 === undefined ? d1 : mode === "HARMONY" ? Math.max(d1, d2) : Math.min(d1, d2);
    const result: RollResult = {
      id: crypto.randomUUID(),
      characterName,
      title,
      mode,
      d1,
      d2,
      modifier,
      total: finalDie + modifier,
      isBreak: finalDie === 20,
      isMisfire: finalDie === 1,
      diceName: style.name,
      diceColor: style.edgeColor,
      timestamp: Date.now(),
    };
    setRollingDice([{ sides: 20, value: d1 }, ...(d2 === undefined ? [] : [{ sides: 20 as const, value: d2 }])]);
    setRollStyle(style);
    setRollKey(key => key + 1);
    setIsRolling(true);
    setCurrentResult(null);
    timer.current = setTimeout(() => {
      setCurrentResult(result);
      setRolls(prev => [result, ...prev].slice(0, 100));
      setIsRolling(false);
      timer.current = null;
    }, ROLL_DURATION_MS);
  };

  return (
    <DiceRollerContext.Provider value={{ openRoll, rolls }}>
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
              <span>Thread Check · {formatModifier(modifier)} modifier</span>
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
            ) : (
              <DiceStage
                dice={isRolling || currentResult ? rollingDice : mode === "NORMAL" ? [{ sides: 20, value: 20 }] : [{ sides: 20, value: 16 }, { sides: 20, value: 8 }]}
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

            {!currentResult && !isRolling && (
              <div className="space-y-4">
                <div className="flex gap-2">
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
                </div>
                <div className="text-[10px] text-muted-foreground font-mono text-center">
                  {mode === "HARMONY" && "2d20 keep highest — conditions favor you"}
                  {mode === "DISCORD" && "2d20 keep lowest — conditions are against you"}
                  {mode === "NORMAL" && "1d20 — standard Thread Check"}
                </div>
                <Button className="w-full h-14 text-sm sm:text-base tracking-[.16em]" onClick={executeRoll} disabled={diceLoading} data-testid="button-roll-thread-check">
                  <Dices className="mr-2 h-5 w-5" /> {diceLoading ? "LOADING YOUR DICE" : "CAST THE DICE"}
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
                      {currentResult.mode === "NORMAL" ? "d20" : currentResult.mode === "HARMONY" ? `[${currentResult.d1}, ${currentResult.d2}] ▲ keep highest` : `[${currentResult.d1}, ${currentResult.d2}] ▼ keep lowest`}
                    </div>
                    <div className="text-3xl text-foreground">
                      {currentResult.d2 === undefined ? currentResult.d1 : currentResult.mode === "HARMONY" ? Math.max(currentResult.d1, currentResult.d2) : Math.min(currentResult.d1, currentResult.d2)}
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
