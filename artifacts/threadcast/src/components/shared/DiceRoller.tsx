import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatModifier } from "@/lib/game-rules";

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
  timestamp: number;
}

interface DiceRollerContextType {
  openRoll: (title: string, modifier: number, characterName?: string) => void;
  rolls: RollResult[];
}

const DiceRollerContext = createContext<DiceRollerContextType | undefined>(undefined);

export function DiceRollerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [modifier, setModifier] = useState(0);
  const [characterName, setCharacterName] = useState("Unknown");
  const [mode, setMode] = useState<RollMode>("NORMAL");
  const [isRolling, setIsRolling] = useState(false);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);
  const [rolls, setRolls] = useState<RollResult[]>([]);

  const openRoll = useCallback((newTitle: string, newModifier: number, newCharacterName = "Unknown") => {
    setTitle(newTitle);
    setModifier(newModifier);
    setCharacterName(newCharacterName);
    setMode("NORMAL");
    setCurrentResult(null);
    setIsOpen(true);
  }, []);

  const executeRoll = () => {
    setIsRolling(true);
    setCurrentResult(null);

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 20) + 1;
      let d2: number | undefined;
      let finalDie = d1;

      if (mode === "HARMONY") {
        d2 = Math.floor(Math.random() * 20) + 1;
        finalDie = Math.max(d1, d2);
      } else if (mode === "DISCORD") {
        d2 = Math.floor(Math.random() * 20) + 1;
        finalDie = Math.min(d1, d2);
      }

      const total = finalDie + modifier;
      const isBreak = finalDie === 20;
      const isMisfire = finalDie === 1;

      const result: RollResult = {
        id: Math.random().toString(36).substring(7),
        characterName,
        title,
        mode,
        d1,
        d2,
        modifier,
        total,
        isBreak,
        isMisfire,
        timestamp: Date.now(),
      };

      setCurrentResult(result);
      setRolls(prev => [result, ...prev].slice(0, 100));
      setIsRolling(false);
    }, 600);
  };

  return (
    <DiceRollerContext.Provider value={{ openRoll, rolls }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
          <div className="w-full max-w-md bg-card border border-border p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ✕
            </button>

            <div className="mb-1 text-xs text-muted-foreground uppercase tracking-widest">{characterName}</div>
            <h2 className="text-xl text-primary font-bold mb-1">{title}</h2>
            <div className="text-sm text-muted-foreground mb-6">Modifier: {formatModifier(modifier)}</div>

            {!currentResult && !isRolling && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["NORMAL", "HARMONY", "DISCORD"] as RollMode[]).map(m => (
                    <button
                      key={m}
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
                <Button className="w-full h-14 text-lg tracking-widest" onClick={executeRoll}>
                  ROLL THREAD CHECK
                </Button>
              </div>
            )}

            {isRolling && (
              <div className="h-32 flex items-center justify-center">
                <div className="text-4xl text-primary animate-spin">⬡</div>
              </div>
            )}

            {currentResult && !isRolling && (
              <div className="text-center py-4 animate-in zoom-in duration-200">
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
                      {mode === "NORMAL" ? "d20" : mode === "HARMONY" ? `[${currentResult.d1}, ${currentResult.d2}] ▲` : `[${currentResult.d1}, ${currentResult.d2}] ▼`}
                    </div>
                    <div className="text-3xl text-muted-foreground">
                      {mode === "NORMAL" ? currentResult.d1 : Math.max(currentResult.d1, currentResult.d2 ?? 0) === (mode === "HARMONY" ? Math.max(currentResult.d1, currentResult.d2 ?? 0) : Math.min(currentResult.d1, currentResult.d2 ?? 0)) ? (mode === "HARMONY" ? Math.max(currentResult.d1, currentResult.d2 ?? 0) : Math.min(currentResult.d1, currentResult.d2 ?? 0)) : currentResult.d1}
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
                  <Button variant="outline" size="sm" onClick={() => setCurrentResult(null)}>
                    ROLL AGAIN
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    CLOSE
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DiceRollerContext.Provider>
  );
}

export function useDiceRoller() {
  const context = useContext(DiceRollerContext);
  if (!context) throw new Error("useDiceRoller must be used within DiceRollerProvider");
  return context;
}
