import { useState, useRef, useEffect, type ReactNode } from "react";
import { lookupTerm, type GlossaryEntry } from "@/lib/game-glossary";
import { cn } from "@/lib/utils";

interface GameTermProps {
  term: string;
  children?: ReactNode;
  className?: string;
  entry?: GlossaryEntry;
}

export function GameTerm({ term, children, className, entry: overrideEntry }: GameTermProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const ref = useRef<HTMLSpanElement>(null);

  const entry = overrideEntry ?? lookupTerm(term);
  if (!entry) return <span className={className}>{children ?? term}</span>;

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition(rect.top < 160 ? "bottom" : "top");
  }, [open]);

  return (
    <span className="relative inline-block" ref={ref}>
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

      {open && (
        <span
          className={cn(
            "absolute z-50 left-0 w-64 bg-card border border-border p-3 shadow-xl pointer-events-none",
            "text-left font-mono text-xs normal-case font-normal tracking-normal",
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          )}
          style={{ minWidth: "16rem" }}
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
        </span>
      )}
    </span>
  );
}

export function TermLabel({ termKey, children, className }: { termKey: string; children?: ReactNode; className?: string }) {
  return (
    <GameTerm term={termKey} className={className}>
      {children}
    </GameTerm>
  );
}
