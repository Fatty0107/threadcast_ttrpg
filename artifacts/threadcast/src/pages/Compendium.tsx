export default function Compendium() {
  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-foreground mb-8">Compendium</h1>

      <div className="border border-border p-6 bg-card font-mono text-muted-foreground space-y-4">
        <h2 className="text-xl font-[family-name:'Cinzel',serif] text-primary mb-4">Core Mechanics</h2>
        <p className="mb-4">Roll a d20 and add the relevant modifier. Compare to the DC.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Harmony:</strong> Roll 2d20, take the higher result. Granted by your Primary Mode.</li>
          <li><strong>Discord:</strong> Roll 2d20, take the lower result. Used by Tertiary Mode casts.</li>
          <li><strong>Normal:</strong> Roll 1d20. Used by Secondary Mode casts.</li>
          <li><strong>Thread Break (Nat 20):</strong> Critical success. The weave responds violently in your favor.</li>
          <li><strong>Misfire (Nat 1):</strong> Critical failure. A snapback occurs.</li>
        </ul>
      </div>

      <div className="border border-border p-6 bg-card font-mono text-muted-foreground space-y-4 mt-6">
        <h2 className="text-xl font-[family-name:'Cinzel',serif] text-primary mb-4">Modes of Resonance</h2>
        <p className="mb-3 text-sm">Your Mode determines how you interact with the Weave. Each character has one Primary Mode (chosen at creation) that always rolls at Harmony.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "Striker", desc: "Aggressive damage dealer. Specializes in direct offensive Thread attacks and bypassing defenses." },
            { name: "Anchor", desc: "Defensive fortress. Specializes in barriers, ward projection, and absorbing magical force." },
            { name: "Slider", desc: "Mobile trickster. Specializes in repositioning, misdirection, and hit-and-run Thread manipulation." },
            { name: "Binder", desc: "Utility and trap-setter. Specializes in persistent effects, magical bindings, and area denial." },
            { name: "Shearer", desc: "Counter-mage. Specializes in disrupting, nullifying, and redirecting other weavers' magic." },
            { name: "Tensioner", desc: "Charged attacker. Builds tension over multiple rounds for devastating delayed releases." },
            { name: "Imprinter", desc: "Inscription specialist. Creates runes, glyphs, and persistent magical constructs on surfaces." },
            { name: "Conductor", desc: "Support and battlefield controller. Specializes in wide-area effects and buffing allies." },
          ].map(m => (
            <div key={m.name} className="border border-border/50 p-3">
              <div className="text-foreground font-bold text-sm mb-1">{m.name}</div>
              <div className="text-xs leading-relaxed">{m.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 border border-primary/20 bg-primary/5 text-xs space-y-1">
          <div className="text-primary font-bold mb-1">Level Unlock</div>
          <div>Level 1: Primary Mode (Harmony on all Thread Checks)</div>
          <div>Level 4: 2 Secondary Modes (Normal roll)</div>
          <div>Level 7: 2 Tertiary Modes (Discord roll)</div>
        </div>
      </div>

      <div className="border border-border p-6 bg-card font-mono text-muted-foreground space-y-4 mt-6">
        <h2 className="text-xl font-[family-name:'Cinzel',serif] text-primary mb-4">Strings &amp; Power Levels</h2>
        <p className="text-sm mb-3">Strings are magical abilities tied to your Affinity. Each String has 5 Power Levels (PL), with increasing Tension cost and DC.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-foreground font-bold mb-1">String Budget by Level</div>
            {[
              [1, 2], [2, 3], [3, 4], [4, 5], [5, 7],
              [6, 8], [7, 9], [8, 10], [9, 11], [10, 13],
            ].map(([lv, count]) => (
              <div key={lv} className="flex justify-between border-b border-border/20 py-0.5">
                <span>Level {lv}</span>
                <span className="text-primary font-bold">{count} strings{(lv === 5 || lv === 10) ? " (+2)" : ""}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-foreground font-bold mb-1">Feat Slots by Level</div>
            {[2, 4, 6, 8, 10].map(lv => (
              <div key={lv} className="flex justify-between border-b border-border/20 py-0.5">
                <span>Level {lv}</span>
                <span className="text-primary font-bold">{Math.floor(lv / 2)} feat{Math.floor(lv / 2) !== 1 ? "s" : ""} total</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
