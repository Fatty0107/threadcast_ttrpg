import type { CastAftermath as Aftermath } from "@/lib/casting-rules";

export function CastAftermath({ result }: { result: Aftermath }) {
  return (
    <div className="mt-3 border border-border bg-background p-3 space-y-1 font-mono text-[11px]" aria-live="polite">
      <p>Tension +{result.cost} → {result.tension}/{result.pool} · Safe Limit {result.safeLimit}</p>
      {result.overflow && <p className="text-destructive font-bold">THREAD POOL EXCEEDED — automatic Snapback; Tension released.</p>}
      {result.table && (
        <div className="border-t border-border pt-2">
          <p className="text-destructive font-bold">{result.table.kind.toUpperCase()} · d{result.table.kind === "Mishap" ? 6 : 12} {result.table.die} — {result.table.effect.name}</p>
          <p className="text-muted-foreground">{result.table.effect.description}</p>
          {result.damage !== undefined && <p className="text-destructive">Damage: {result.damage} VP applied to the sheet.</p>}
          {result.table.direction && <p>Discharge direction · d8 {result.table.direction.die}: <strong>{result.table.direction.name}</strong>.</p>}
          {result.table.permanentInjury && <p className="text-amber-500">Permanent Injury · d6 {result.table.permanentInjury.die}: <strong>{result.table.permanentInjury.name}</strong> — {result.table.permanentInjury.description}</p>}
        </div>
      )}
      {result.additionalTable && (
        <div className="border-t border-border pt-2 text-destructive">
          <p className="font-bold">SNAPBACK · d12 {result.additionalTable.die} — {result.additionalTable.effect.name}</p>
          <p>{result.additionalTable.effect.description}</p>
          {result.additionalTable.damage !== undefined && <p>Damage: {result.additionalTable.damage} VP applied to the sheet.</p>}
          {result.additionalTable.direction && <p>Discharge direction · d8 {result.additionalTable.direction.die}: <strong>{result.additionalTable.direction.name}</strong>.</p>}
          {result.additionalTable.permanentInjury && <p>Permanent Injury · d6 {result.additionalTable.permanentInjury.die}: <strong>{result.additionalTable.permanentInjury.name}</strong> — {result.additionalTable.permanentInjury.description}</p>}
        </div>
      )}
      {result.strain && <p className={result.strain.failed ? "text-destructive" : "text-chart-2"}>
        Immediate Strain: d20 {result.strain.die}, total {result.strain.total} vs DC {result.strain.dc} — {result.strain.failed ? "failed; Snapback triggered" : "passed"}.
      </p>}
      {result.tension > result.safeLimit && <p className="text-amber-500">Above Safe Limit: Strain Check at the start of your next turn.</p>}
      {result.warning && <p role="alert" className="text-amber-500">{result.warning}</p>}
    </div>
  );
}