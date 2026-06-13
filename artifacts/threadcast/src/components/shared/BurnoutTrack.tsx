import { cn } from "@/lib/utils";

interface BurnoutTrackProps {
  level: number;
  className?: string;
}

const BURNOUT_PENALTIES = [
  "No penalty",
  "Disadvantage on all mental checks",
  "Cannot recover Tension safely",
  "Take 1d6 damage per Tension spent",
  "Cannot cast Strings above PL 2",
  "Cannot cast Strings. Threads snap.",
  "Thread Death."
];

export function BurnoutTrack({ level, className }: BurnoutTrackProps) {
  // Cap between 0 and 6
  const currentLevel = Math.min(Math.max(level, 0), 6);
  
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-[family-name:'Cinzel',serif] text-sm text-destructive font-bold tracking-wide">
          BURNOUT
        </h3>
        <span className="font-mono text-xs text-destructive">{currentLevel}/6</span>
      </div>
      
      <div className="flex gap-2 justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-full h-3 rounded-full border transition-all duration-600",
              i < currentLevel 
                ? "bg-destructive border-destructive shadow-[0_0_8px_hsl(var(--destructive))]" 
                : "bg-background border-destructive/30"
            )}
          />
        ))}
      </div>
      
      <div className="mt-2 h-10 flex items-center justify-center bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2">
        <p className="text-xs text-destructive/90 text-center font-mono animate-in fade-in zoom-in duration-300" key={currentLevel}>
          {BURNOUT_PENALTIES[currentLevel]}
        </p>
      </div>
    </div>
  );
}
