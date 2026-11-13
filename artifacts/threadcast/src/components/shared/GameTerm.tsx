import { useState, type ReactNode } from "react";
import { lookupTerm, type GlossaryEntry } from "@/lib/game-glossary";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface GameTermProps {
  term: string;
  children?: ReactNode;
  className?: string;
  entry?: GlossaryEntry;
}

export function GameTerm({ term, children, className, entry: overrideEntry }: GameTermProps) {
  const [open, setOpen] = useState(false);

  const entry = overrideEntry ?? lookupTerm(term);
  if (!entry) return <span className={className}>{children ?? term}</span>;

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
      <span
        className={cn(
          "cursor-help border-b border-dotted border-current/50 hover:border-current transition-colors",
          className
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
      >
        {children ?? term}
      </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        collisionPadding={12}
        className={cn(
          "w-64 border border-border bg-card p-3 shadow-xl pointer-events-none",
          "text-left font-mono text-xs text-foreground normal-case font-normal tracking-normal"
        )}
        style={{ width: "min(16rem, calc(100vw - 1.5rem))", minWidth: "min(16rem, calc(100vw - 1.5rem))" }}
      >
          <span className="block text-primary font-bold mb-1 font-[family-name:'Cinzel',serif] text-xs uppercase tracking-wide">
            {entry.term}
          </span>
          <span className="block text-foreground leading-relaxed mb-1">{entry.short}</span>
          {entry.detail && (
            <span className="block text-muted-foreground leading-relaxed border-t border-border/50 pt-1 mt-1">
              {entry.detail}
            </span>
          )}
      </TooltipContent>
    </Tooltip>
  );
}

export function TermLabel({ termKey, children, className }: { termKey: string; children?: ReactNode; className?: string }) {
  return (
    <GameTerm term={termKey} className={className}>
      {children}
    </GameTerm>
  );
}
