export type CastRequestComponent = { string: string; powerLevel: number; mode: string };
export type CastRequestInput = {
  characterId: number;
  kind: string;
  intent: string;
  components: CastRequestComponent[];
};
export type StrainRequestInput = { characterId: number };
export type RequestKind = "cast" | "strain";
export type ReplayDecision = { kind: "replay"; result: any } | { kind: "conflict" };

export function stringKey(name: string): string {
  return name.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+string$/, "").trim();
}

export function castRequestKey(input: CastRequestInput): string {
  return JSON.stringify([
    input.characterId, input.kind, input.intent.trim(),
    input.components.map(component => [stringKey(component.string), component.powerLevel, component.mode]),
  ]);
}

export function strainRequestKey(input: StrainRequestInput): string {
  return `strain:${input.characterId}`;
}

export function decideReplay(
  storedRequestId: string,
  storedResponse: unknown,
  requestId: string,
  requestType: RequestKind,
  input: CastRequestInput | StrainRequestInput,
): ReplayDecision {
  if (storedRequestId !== requestId) return { kind: "conflict" };
  const saved = storedResponse && typeof storedResponse === "object" ? storedResponse as any : {};
  if (requestType === "cast") {
    if ((saved.requestType && saved.requestType !== "cast") ||
        (saved.request && castRequestKey(saved.request) !== castRequestKey(input as CastRequestInput))) {
      return { kind: "conflict" };
    }
    return { kind: "replay", result: saved.result ?? saved };
  }
  if (saved.requestType !== "strain" || !saved.request ||
      strainRequestKey(saved.request) !== strainRequestKey(input as StrainRequestInput)) {
    return { kind: "conflict" };
  }
  return { kind: "replay", result: saved.result };
}

export type InjuryChoiceType = "string" | "sense";
export type PermanentInjuryRoll = {
  name: string;
  description: string;
  choiceType?: InjuryChoiceType;
};
export type PermanentInjuryResult = PermanentInjuryRoll & { noEligibleString: boolean };
export type PermanentInjuryOptions = {
  attunedStrings?: unknown;
  existingInjuries?: Array<{ name?: string; string?: string }>;
  pendingLostThreadChoices?: number;
};

export const PERMANENT_INJURIES: Record<number, PermanentInjuryRoll> = {
  1: { name: "Lichtenberg Scars", description: "No mechanical effect; significant cosmetic marking." },
  2: { name: "Nerve Damage (Hands)", description: "Permanent −1 to CTR modifier; partially mitigable with specialized gloves." },
  3: { name: "Leyline Misread", description: "Permanent Discord on Thread Sense checks of a specific type.", choiceType: "sense" },
  4: { name: "Lost Thread", description: "One specific String is permanently inaccessible.", choiceType: "string" },
  5: { name: "Reduced Ceiling", description: "Thread Pool maximum reduced by 4 permanently." },
  6: { name: "The Shakes", description: "Discord on all Thread Checks; can be stabilized (not cured) with long-term care." },
};

export function resolvePermanentInjury(die: number, options: PermanentInjuryOptions = {}): PermanentInjuryResult {
  const injury = PERMANENT_INJURIES[die];
  if (!injury) throw new RangeError("Permanent Injury die must be between 1 and 6");
  if (injury.name !== "Lost Thread") return { ...injury, noEligibleString: false };

  const existing = options.existingInjuries ?? [];
  const lostStrings = new Set(existing
    .filter(previous => previous.name === "Lost Thread" && typeof previous.string === "string")
    .map(previous => stringKey(previous.string!)));
  const attunedStrings = Array.isArray(options.attunedStrings) ? options.attunedStrings : [];
  const eligibleStrings = new Set(attunedStrings
    .filter((name): name is string => typeof name === "string" && !!name.trim())
    .map(stringKey)
    .filter(name => !lostStrings.has(name)));
  const eligibleCount = eligibleStrings.size;
  const pending = options.pendingLostThreadChoices ?? 0;
  const pendingChoices = Number.isFinite(pending) ? Math.max(0, Math.trunc(pending)) : 0;
  const noEligibleString = eligibleCount <= pendingChoices;
  return {
    ...injury,
    description: noEligibleString
      ? `${injury.description} No eligible attuned String remained, so no String choice is pending.`
      : injury.description,
    noEligibleString,
  };
}