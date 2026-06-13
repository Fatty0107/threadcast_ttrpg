import { cn } from "@/lib/utils";

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
  // SVG properties
  const radius = 60;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // We want a 270 degree arc
  const arcLength = (270 / 360) * circumference;
  // Offset to start at bottom left
  const strokeDashoffset = circumference - arcLength;
  
  // Calculate fill percentage based on max
  const fillPercentage = Math.min(Math.max(current / max, 0), 1);
  const fillArcLength = fillPercentage * arcLength;
  const fillDasharray = `${fillArcLength} ${circumference}`;

  // Safe limit marker position
  const safePercentage = Math.min(Math.max(safeLimit / max, 0), 1);
  
  const isOverSafe = current > safeLimit;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform rotate-135" // Start arc at bottom left
        >
          {/* Defs for glow */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc */}
          <circle
            stroke="hsl(var(--card-border))"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          
          {/* Fill Arc */}
          <circle
            stroke={isOverSafe ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={fillDasharray}
            style={{ 
              strokeDashoffset,
              transition: "stroke-dasharray 0.3s ease-out, stroke 0.3s ease-out" 
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            filter="url(#glow)"
          />

          {/* Safe Limit Marker (approximate position math needed for perfect alignment, using dasharray trick) */}
           <circle
            stroke="hsl(var(--muted-foreground))"
            fill="transparent"
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`2 ${circumference}`}
            style={{ strokeDashoffset: strokeDashoffset - (safePercentage * arcLength) }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'rotate(-0deg)' }}>
          <span className="font-mono text-3xl font-bold tracking-tighter" style={{ color: isOverSafe ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}>
            {current}
          </span>
        </div>
      </div>
      
      <div className="text-center mt-[-10px] z-10 bg-background px-2">
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase font-[family-name:'Cinzel',serif]">Tension</div>
        <div className="text-[10px] font-mono text-muted-foreground">/ {max} TP · SL:{safeLimit}</div>
      </div>

      <div className="flex gap-2 mt-4">
         <button 
           onClick={onSpend}
           className="px-3 py-1 text-xs border border-primary/50 text-primary hover:bg-primary/10 rounded-sm font-mono transition-colors"
           data-testid="button-tension-spend"
         >
           + SPEND
         </button>
         <button 
           onClick={onRelease}
           className="px-3 py-1 text-xs border border-border text-muted-foreground hover:bg-muted rounded-sm font-mono transition-colors"
           data-testid="button-tension-release"
         >
           - RELEASE
         </button>
      </div>
    </div>
  );
}
