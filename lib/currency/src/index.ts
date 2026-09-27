export type CoinDenominationKey = "cinder" | "mark" | "crown" | "sovereign";

export interface CoinDenomination {
  readonly name: string;
  readonly plural: string;
  readonly valueCinders: number;
  readonly material: string;
}

export interface RoyalNoteDenomination {
  readonly name: "Royal Note";
  readonly plural: "Royal Notes";
  readonly minimumFaceValueCinders: number;
  readonly material: string;
  readonly form: string;
}

export const CROWN_STANDARD_DENOMINATIONS = {
  cinder: {
    name: "Cinder",
    plural: "Cinders",
    valueCinders: 1,
    material: "Copper",
  },
  mark: {
    name: "Mark",
    plural: "Marks",
    valueCinders: 10,
    material: "Silver",
  },
  crown: {
    name: "Crown",
    plural: "Crowns",
    valueCinders: 100,
    material: "Silver-gold alloy",
  },
  sovereign: {
    name: "Sovereign",
    plural: "Sovereigns",
    valueCinders: 1_000,
    material: "Gold",
  },
  royalNote: {
    name: "Royal Note",
    plural: "Royal Notes",
    minimumFaceValueCinders: 10_000,
    material: "Enchanted treasury document",
    form: "Variable face value; not a fixed-value coin",
  },
} as const satisfies Record<CoinDenominationKey, CoinDenomination> & {
  readonly royalNote: RoyalNoteDenomination;
};

export type StartingBackground =
  | "Guild-Raised"
  | "Civilian Mage"
  | "Self-Taught"
  | "Noble-Born"
  | "Military Family"
  | "Scholar's Lineage"
  | "Temple-Raised";

export const STARTING_BACKGROUND_CINDERS: Readonly<Record<StartingBackground, number>> = {
  "Guild-Raised": 400,
  "Civilian Mage": 600,
  "Self-Taught": 250,
  "Noble-Born": 2_500,
  "Military Family": 500,
  "Scholar's Lineage": 450,
  "Temple-Raised": 350,
};

function validateCinders(cinders: number): void {
  if (!Number.isSafeInteger(cinders)) {
    throw new TypeError("Cinder amount must be a safe integer.");
  }
  if (cinders < 0) {
    throw new RangeError("Cinder amount cannot be negative.");
  }
}

/** Formats integer cinders as an exact Crown Standard amount in CR. */
export function formatCompactCr(cinders: number): string {
  validateCinders(cinders);
  const wholeCr = Math.floor(cinders / 10);
  const fractionalCinder = cinders % 10;
  return `${wholeCr}${fractionalCinder === 0 ? "" : `.${fractionalCinder}`} CR`;
}

/** Formats cinders as a largest-first coin breakdown; zero is shown as 0 Cinders. */
export function formatDenominationBreakdown(cinders: number): string {
  validateCinders(cinders);
  if (cinders === 0) return "0 Cinders";

  const denominations: readonly CoinDenomination[] = [
    CROWN_STANDARD_DENOMINATIONS.sovereign,
    CROWN_STANDARD_DENOMINATIONS.crown,
    CROWN_STANDARD_DENOMINATIONS.mark,
    CROWN_STANDARD_DENOMINATIONS.cinder,
  ];
  let remainder = cinders;
  const parts: string[] = [];

  for (const denomination of denominations) {
    const count = Math.floor(remainder / denomination.valueCinders);
    if (count > 0) {
      parts.push(`${count} ${count === 1 ? denomination.name : denomination.plural}`);
      remainder %= denomination.valueCinders;
    }
  }

  return parts.join(", ");
}

/**
 * Parses a non-negative CR amount into integer cinders.
 * Accepts an optional CR suffix and at most one fractional decimal place.
 */
export function parseCr(text: string): number {
  const match = /^\s*(\d+)(?:\.(\d+))?\s*(?:CR)?\s*$/i.exec(text);
  if (!match || (match[2] !== undefined && match[2].length !== 1)) {
    throw new TypeError("CR amount must be a non-negative decimal with at most one fractional digit.");
  }

  const cinders = BigInt(match[1]) * 10n + BigInt(match[2] ?? "0");
  if (cinders > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("CR amount exceeds the safe integer cinder range.");
  }
  return Number(cinders);
}

/** Applies a denomination-based wallet change to the single integer balance. */
export function adjustCurrencyCinders(
  current: number | undefined,
  valueCinders: number,
  quantity: number,
  operation: "add" | "remove",
): number {
  if (current === undefined && operation === "remove") {
    throw new RangeError("Record an opening balance before spending funds.");
  }
  validateCinders(current ?? 0);
  if (!Number.isSafeInteger(valueCinders) || valueCinders <= 0 ||
      !Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError("Denomination value and quantity must be positive safe integers.");
  }
  const change = BigInt(valueCinders) * BigInt(quantity);
  const next = BigInt(current ?? 0) + (operation === "add" ? change : -change);
  if (next < 0n) throw new RangeError("Not enough funds for this change.");
  if (next > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Balance exceeds the safe integer range.");
  return Number(next);
}

/** Returns the starting balance for one of the seven supported backgrounds. */
export function startingBackgroundCinders(background: StartingBackground): number {
  return STARTING_BACKGROUND_CINDERS[background];
}