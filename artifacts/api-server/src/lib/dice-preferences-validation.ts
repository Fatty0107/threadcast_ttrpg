function hasExactKeys(value: unknown, expected: string[]): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function hasRequiredKeysAndOnlyAllowedKeys(
  value: unknown,
  required: string[],
  allowed: string[],
): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key)) &&
    keys.every((key) => allowed.includes(key));
}

export function hasStrictPreferencesShape(value: unknown): boolean {
  if (!hasExactKeys(value, ["sets", "selectedId"])) {
    return false;
  }
  const preferences = value as { sets: unknown };
  if (!Array.isArray(preferences.sets)) {
    return false;
  }
  const requiredStyleKeys = [
    "id",
    "name",
    "bodyColor",
    "inkColor",
    "edgeColor",
    "finish",
    "motif",
  ];
  const optionalStyleKeys = [
    "font",
    "pattern",
    "inclusion",
    "animation",
    "inscription",
  ];
  return preferences.sets.every((style) =>
    hasRequiredKeysAndOnlyAllowedKeys(
      style,
      requiredStyleKeys,
      [...requiredStyleKeys, ...optionalStyleKeys],
    ),
  );
}

export function satisfiesPreferencesInvariants(
  preferences: { sets: { id: string }[]; selectedId: string | null },
): boolean {
  const ids = preferences.sets.map((style) => style.id);
  return new Set(ids).size === ids.length &&
    (preferences.selectedId === null || ids.includes(preferences.selectedId));
}