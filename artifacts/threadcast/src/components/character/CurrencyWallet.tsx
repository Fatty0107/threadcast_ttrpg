import { useEffect, useState, type FormEvent } from "react";
import { Compass, Crown, Flame, ScrollText, Shield } from "lucide-react";
import {
  CROWN_STANDARD_DENOMINATIONS,
  adjustCurrencyCinders,
  formatCompactCr,
  parseCr,
  type CoinDenominationKey,
} from "@workspace/currency";

type WalletUnit = CoinDenominationKey | "royalNote";
type WalletOperation = "add" | "remove";

const denominations = CROWN_STANDARD_DENOMINATIONS;
const coinRows = [
  { key: "sovereign", Icon: Shield, color: "text-amber-400 border-amber-400/30 bg-amber-400/5" },
  { key: "crown", Icon: Crown, color: "text-primary border-primary/30 bg-primary/5" },
  { key: "mark", Icon: Compass, color: "text-slate-300 border-slate-300/30 bg-slate-300/5" },
  { key: "cinder", Icon: Flame, color: "text-orange-400 border-orange-400/30 bg-orange-400/5" },
] as const;

interface Props {
  balance: number | undefined;
  onChange: (next: number) => void;
}

export function CurrencyWallet({ balance, onChange }: Props) {
  const [operation, setOperation] = useState<WalletOperation>("add");
  const [unit, setUnit] = useState<WalletUnit>("mark");
  const [quantity, setQuantity] = useState("1");
  const [noteFaceValue, setNoteFaceValue] = useState("1000");
  const [error, setError] = useState("");
  const validBalance = balance === undefined || (Number.isSafeInteger(balance) && balance >= 0);

  useEffect(() => { setError(""); }, [balance]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validBalance) return;
    try {
      if (!/^[1-9]\d*$/.test(quantity)) throw new TypeError("Enter a whole quantity greater than zero.");
      const count = Number(quantity);
      if (!Number.isSafeInteger(count)) throw new RangeError("Quantity is too large.");
      let valueCinders: number;
      if (unit === "royalNote") {
        valueCinders = parseCr(noteFaceValue);
        if (valueCinders < denominations.royalNote.minimumFaceValueCinders) {
          throw new RangeError(`Royal Notes must have a face value of at least ${formatCompactCr(denominations.royalNote.minimumFaceValueCinders)}.`);
        }
      } else {
        valueCinders = denominations[unit].valueCinders;
      }
      const next = adjustCurrencyCinders(balance, valueCinders, count, operation);
      onChange(next);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to change this balance.");
    }
  }

  let remainder = balance ?? 0;

  return (
    <section className="mb-5 border border-primary/30 bg-primary/5" aria-label="Crown Standard wallet">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/20 p-4">
        <div>
          <h3 className="font-[family-name:'Cinzel',serif] text-base text-foreground">Currency</h3>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Crown Standard · carried funds</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-xl text-primary tabular-nums" data-testid="text-currency-balance">
            {!validBalance ? "Invalid balance" : balance === undefined ? "Unrecorded" : formatCompactCr(balance)}
          </p>
          {balance !== undefined && validBalance && <span className="text-[10px] font-mono text-muted-foreground">Total in CR</span>}
        </div>
      </div>

      {balance === undefined && <p className="px-4 pt-3 text-xs font-mono text-muted-foreground">No opening balance was assigned to this existing character. Add funds below to record one.</p>}
      {!validBalance && <p role="alert" className="px-4 pt-3 text-xs font-mono text-destructive">This recorded balance is invalid. It cannot be changed here.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 sm:p-4" aria-label="Equivalent denominations">
        {coinRows.map(({ key, Icon, color }) => {
          const denomination = denominations[key];
          const count = Math.floor(remainder / denomination.valueCinders);
          remainder %= denomination.valueCinders;
          return (
            <div key={key} className={`flex items-center gap-3 border p-2.5 min-w-0 ${color}`}>
              <Icon aria-hidden="true" className="w-5 h-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-[family-name:'Cinzel',serif] text-foreground">{denomination.plural}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{formatCompactCr(denomination.valueCinders)} each</p>
              </div>
              <span className="font-mono text-lg tabular-nums text-foreground" data-testid={`text-wallet-${key}`}>{balance === undefined || !validBalance ? "—" : count}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 border border-primary/25 bg-primary/5 p-2.5 sm:col-span-2">
          <ScrollText aria-hidden="true" className="w-5 h-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-[family-name:'Cinzel',serif] text-foreground">Royal Notes</p>
            <p className="text-[10px] font-mono text-muted-foreground">Variable face value from {formatCompactCr(denominations.royalNote.minimumFaceValueCinders)}. Record their value below; a total balance does not track the number of notes held.</p>
          </div>
        </div>
      </div>
      <p className="px-4 pb-3 text-[10px] font-mono text-muted-foreground">Coin counts are an equivalent breakdown of the total, not a record of physical coins held.</p>

      <form onSubmit={handleSubmit} className="border-t border-primary/20 p-4">
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Change type">
          {(["add", "remove"] as const).map(choice => (
            <button key={choice} type="button" aria-pressed={operation === choice}
              onClick={() => { setOperation(choice); setError(""); }}
              className={`px-3 py-1.5 text-xs font-mono border transition-colors ${operation === choice ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {choice === "add" ? "+ ADD FUNDS" : "− SPEND FUNDS"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Denomination
            <select aria-label="Denomination" value={unit} onChange={event => { setUnit(event.target.value as WalletUnit); setError(""); }}
              className="block mt-1 min-w-36 bg-background border border-border px-2 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary">
              {(["cinder", "mark", "crown", "sovereign"] as const).map(key =>
                <option key={key} value={key}>{denominations[key].name}</option>)}
              <option value="royalNote">Royal Note</option>
            </select>
          </label>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Quantity
            <input aria-label="Quantity" inputMode="numeric" value={quantity} onChange={event => { setQuantity(event.target.value); setError(""); }}
              className="block mt-1 w-24 bg-background border border-border px-2 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary" />
          </label>
          {unit === "royalNote" && (
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Face value per note (CR)
              <input aria-label="Face value per Royal Note in CR" inputMode="decimal" value={noteFaceValue}
                onChange={event => { setNoteFaceValue(event.target.value); setError(""); }}
                className="block mt-1 w-40 bg-background border border-border px-2 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary" />
            </label>
          )}
          <button type="submit" disabled={!validBalance || (balance === undefined && operation === "remove")}
            className="border border-primary/50 px-4 py-2 text-xs font-mono text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed">
            {balance === undefined ? "RECORD OPENING FUNDS" : operation === "add" ? "ADD TO WALLET" : "DEDUCT FROM WALLET"}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 text-xs font-mono text-destructive">{error}</p>}
        <p className="mt-3 text-[10px] font-mono text-muted-foreground">Changes save with your character sheet. Inventory items do not automatically charge your wallet or guarantee availability.</p>
      </form>
    </section>
  );
}