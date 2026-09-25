import { useGetDicePreferences, getGetDicePreferencesQueryKey, type DiceStyle } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth/auth-context";

/** The house die is available to everyone; only explicitly saved sets belong to an account. */
export const DEFAULT_DICE_STYLE: DiceStyle = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Standard Issue",
  bodyColor: "#342A30",
  inkColor: "#F3DDB5",
  edgeColor: "#C48650",
  finish: "polished",
  motif: "weave",
};

/** Include the user ID in the query key: cached dice must never bleed into another login. */
export function useActiveDiceStyle() {
  const { user } = useAuth();
  const query = useGetDicePreferences({
    query: {
      enabled: !!user,
      queryKey: [...getGetDicePreferencesQueryKey(), user?.id],
    },
  });
  const selected = query.data?.sets.find(set => set.id === query.data?.selectedId);

  return {
    ...query,
    style: selected ?? DEFAULT_DICE_STYLE,
    isDefault: !selected,
  };
}

/** Cryptographically uniform, independent of visual animation and its frame rate. */
export function rollDie(sides: number): number {
  if (!Number.isSafeInteger(sides) || sides < 2 || sides > 1000) {
    throw new Error("Invalid number of die faces");
  }
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    return Math.floor(Math.random() * sides) + 1;
  }
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / sides) * sides;
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return (buffer[0] % sides) + 1;
}