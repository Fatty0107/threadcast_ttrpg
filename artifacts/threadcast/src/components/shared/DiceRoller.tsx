import { createContext, useContext, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatModifier } from "@/lib/game-rules";

type RollMode = "NORMAL" | "HARMONY" | "DISCORD";

interface RollResult {
  id: string;
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
  openRoll: (title: string, modifier: number) => void;
}

const DiceRollerContext = createContext<DiceRollerContextType | undefined>(undefined);

export function DiceRollerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<RollMode>("NORMAL");
  const [isRolling, setIsRolling] = useState(false);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);

  const openRoll = (newTitle: string, newModifier: number) => {
    setTitle(newTitle);
    setModifier(newModifier);
    setMode("NORMAL");
    setCurrentResult(null);
    setIsOpen(true);
  };

  const executeRoll = () => {
    setIsRolling(true);
    setCurrentResult(null);
    
    // Simulate roll duration
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 20) + 1;
      let d2 = undefined;
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
        title,
        mode,
        d1,
        d2,
        modifier,
        total,
        isBreak,
        isMisfire,
        timestamp: Date.now()
      };
      
      setCurrentResult(result);
      setHistory(prev => [result, ...prev].slice(0, 5));
      setIsRolling(false);
    }, 1000);
  };

  return (
    <DiceRollerContext.Provider value={{ openRoll }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
          <div className="w-full max-w-md bg-card border border-border p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
            
            <h2 className="text-xl text-primary font-bold mb-4">{title}</h2>
            <div className="text-sm text-muted-foreground mb-6">Modifier: {formatModifier(modifier)}</div>
            
            {!currentResult && !isRolling && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["NORMAL", "HARMONY", "DISCORD"] as RollMode[]).map(m => (
                    <Button 
                      key={m}
                      variant={mode === m ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setMode(m)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
                <Button className="w-full h-16 text-lg" onClick={executeRoll}>
                  ROLL DICE
                </Button>
              </div>
            )}
            
            {isRolling && (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin text-4xl text-primary">⬡</div>
              </div>
            )}
            
            {currentResult && !isRolling && (
              <div className="text-center py-6 animate-in zoom-in duration-300">
                {currentResult.isBreak && <div className="text-primary font-bold text-xl mb-2">THREAD BREAK!</div>}
                {currentResult.isMisfire && <div className="text-destructive font-bold text-xl mb-2">MISFIRE!</div>}
                
                <div className="flex justify-center items-end gap-4 mb-4">
                  <div className="text-4xl text-muted-foreground">
                    {mode === "NORMAL" ? currentResult.d1 : `[${currentResult.d1}, ${currentResult.d2}]`}
                  </div>
                  <div className="text-2xl text-muted-foreground mb-1">{formatModifier(modifier)}</div>
                  <div className="text-xl text-muted-foreground mb-1">=</div>
                  <div className="text-6xl text-primary font-bold">{currentResult.total}</div>
                </div>
                
                <Button variant="outline" className="mt-6" onClick={() => setCurrentResult(null)}>
                  ROLL AGAIN
                </Button>
              </div>
            )}
            
            {history.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">LAST 5 ROLLS</div>
                <div className="space-y-1">
                  {history.map(h => (
                    <div key={h.id} className="text-xs flex justify-between">
                      <span>{h.title} ({h.mode})</span>
                      <span className={h.isBreak ? "text-primary" : h.isMisfire ? "text-destructive" : ""}>
                        {h.total}
                      </span>
                    </div>
                  ))}
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
