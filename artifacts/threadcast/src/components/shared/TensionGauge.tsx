import { cn } from "@/lib/utils";
import { GameTerm } from "@/components/shared/GameTerm";

interface TensionGaugeProps {
  current: number;
  max: number;
  safeLimit: number;
  className?: string;
  onSpend?: () => void;
  onRelease?: () => void;
}

export function TensionGauge({
  current,
  max,
  safeLimit,
  className,
  onSpend,
  onRelease,
}: TensionGaugeProps) {
  const radius = 60;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const arcLength = (270 / 360) * circumference;
  const strokeDashoffset = circumference - arcLength;

  const fillPercentage = Math.min(Math.max(current / (max || 1), 0), 1);
  const fillArcLength = fillPercentage * arcLength;
  const fillDasharray = `${fillArcLength} ${circumference}`;

  const safePercentage = Math.min(Math.max(safeLimit / (max || 1), 0), 1);
  const isOverSafe = current > safeLimit;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform rotate-135">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <circle
            stroke="hsl(var(--border))"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />

          <circle
            stroke={isOverSafe ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={fillDasharray}
            style={{
              strokeDashoffset,
              transition: "stroke-dasharray 0.3s ease-out, stroke 0.3s ease-out",
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            filter="url(#glow)"
          />

          <circle
            stroke="hsl(var(--muted-foreground))"
            fill="transparent"
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`2 ${circumference}`}
            style={{ strokeDashoffset: strokeDashoffset - safePercentage * arcLength }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-3xl font-bold tracking-tighter"
            style={{ color: isOverSafe ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
          >
            {current}
          </span>
        </div>
      </div>

      <div className="text-center mt-[-10px] z-10 bg-background px-2">
        <GameTerm
          term="tension"
          className="text-xs font-bold tracking-widest text-muted-foreground uppercase font-[family-name:'Cinzel',serif]"
        >
          Tension
        </GameTerm>
        <div className="text-[10px] font-mono text-muted-foreground">
          / <GameTerm term="thread pool">{max}</GameTerm>{" "}
          <GameTerm term="tp">TP</GameTerm> ·{" "}
          <GameTerm term="sl">SL</GameTerm>:{safeLimit}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onSpend}
          className="px-3 py-1 text-xs border border-primary/50 text-primary hover:bg-primary/10 font-mono transition-colors"
        >
          + SPEND
        </button>
        <button
          onClick={onRelease}
          className="px-3 py-1 text-xs border border-border text-muted-foreground hover:bg-muted font-mono transition-colors"
        >
          − RELEASE
        </button>
      </div>
    </div>
  );
}
