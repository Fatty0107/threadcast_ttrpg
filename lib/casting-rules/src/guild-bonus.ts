// Builder sheets keep baseAttributes separately and persist attributes with
// background and guild bonuses already applied. Older sheets may not.
export function guildBonusAlreadyInAttributes(data: { baseAttributes?: unknown } | null | undefined): boolean {
  return !!data?.baseAttributes && typeof data.baseAttributes === "object" && !Array.isArray(data.baseAttributes);
}