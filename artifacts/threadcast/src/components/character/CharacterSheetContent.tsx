import { useState, useEffect, useCallback, useRef } from "react";
import {
  Character, getCharacter, useCreateCast, useCreateCastStrainCheck, useResolveCastConsequence,
  getListRollsQueryKey, type GameplayRoll, type CastInput, type CastStrainInput, type CastResult as ApiCastResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ATTRIBUTE_DEFS, ALL_SKILLS, ALL_MODES, FEATS, CATALOG_ITEMS, BURNOUT_LEVELS,
  RARITY_COLORS, RARITY_LABELS, ITEM_BONUS, KIT_CONTENTS,
  type ItemRarity,
  calcMod, fmtMod, getRefinementBonus,
  calcVPMax, calcThreadPool, calcSafeLimit, calcGuardRating, calcWardRating,
  calcRecoveryDice, getGuildRankData, GUILDS,
} from "@/lib/ttrpg-data";
import { findString } from "@/lib/affinity-data";
import { CORE_POWER_LEVELS, maximumSafePowerLevel, weaveMultiplier, strainDC, type CastAftermath } from "@/lib/casting-rules";
import { CastAftermath as CastAftermathView } from "./CastAftermath";
import { TensionGauge } from "@/components/shared/TensionGauge";
import { BurnoutTrack } from "@/components/shared/BurnoutTrack";
import { DiceStage, ROLL_DURATION_MS } from "@/components/shared/DiceStage";
import { useDiceRoller } from "@/components/shared/dice-roller-context";
import { useGameplayRoll, rollErrorMessage } from "@/lib/gameplay-roll";
import { GameTerm } from "@/components/shared/GameTerm";
import { DEFAULT_DICE_STYLE, useActiveDiceStyle } from "@/lib/dice-style";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-context";
import { escapePrintHtml } from "@/lib/print-escape";
import "./character-sheet.css";

// ---- Types ----
import { useResolveCollaborativeSupport } from "@workspace/api-client-react";
interface SubItem {
  name: string;
  charges: number;
  maxCharges: number;
  desc?: string;
  canEquip?: boolean;
  equipped?: boolean;
}

interface InventoryEntry {
  id: string;
  name: string;
  quantity: number;
  rarity: ItemRarity;
  notes?: string;
  desc?: string;
  mechanical?: string;
  category?: string;
  subCategory?: string;
  equipped?: boolean;
  subItems?: SubItem[];
}

interface WeavingEntry {
  id: string;
  numStrings: number;
  strings: string[];
  powerLevels: number[];
  modes: string[];
  intent?: string;
}

interface SheetData {
  avatarDataUrl?: string;
  attributes?: Record<string, number>;
  vitalityPoints?: { current: number; max: number };
  tension?: { current: number; pool: number; safeLimit: number };
  burnout?: number;
  fatigue?: number;
  corruption?: number;
  guardRating?: number;
  wardRating?: number;
  background?: string;
  guild?: string;
  guildRank?: string;
  primaryMode?: string;
  secondaryMode?: string;
  secondaryMode2?: string;
  tertiaryMode?: string;
  tertiaryMode2?: string;
  refinementBonus?: number;
  attunedSkills?: string[];
  skills?: { name: string; attribute: string; attuned: boolean }[];
  strings?: string[];
  techniques?: { name: string; mode?: string; description?: string }[];
  feats?: string[];
  inventory?: InventoryEntry[];
  signature?: string;
  woundsNotes?: string;
  notes?: string;
  notesBackstory?: string;
  notesAppearance?: string;
  notesPersonality?: string;
  notesBonds?: string;
  notesFlaws?: string;
  notesGoals?: string;
  notesAllies?: string;
  notesSession?: string;
  recoveryDiceCurrent?: number;
  castingConditions?: string[];
  castConsequences?: CastConsequence[];
  permanentInjuries?: PermanentInjury[];
  featCharges?: Record<string, number>;
  featChoices?: Record<string, any>;
  guildFeatChoice?: string;
  weavings?: WeavingEntry[];
}

type CastConsequence = {
  id: string;
  name: string;
  prompt: string;
  choiceType: "target" | "string" | "sense";
  status: "pending" | "resolved";
  choice?: string;
};
type PermanentInjury = {
  id: string;
  die: number;
  name: string;
  description: string;
  string?: string;
  senseType?: string;
};
type PendingCastRequest = {
  requestId: string;
  body: string;
  operation: "cast" | "strain";
  createdAt: number;
  key: string;
};

type CastUIAftermath = CastAftermath & { saveConfirmed: boolean; damageSaved?: boolean };

function CastAftermathDisplay({ result }: { result: CastUIAftermath }) {
  if (result.saveConfirmed) return <CastAftermathView result={result} />;
  return (
    <div className="mt-3 border border-amber-500/40 bg-amber-500/5 p-3 space-y-1 font-mono text-[11px]" role="alert">
      <p className="text-amber-500 font-bold">Sheet save not confirmed. Resource changes shown here are not confirmed persisted.</p>
      {result.table && <p>{result.table.kind} d{result.table.kind === "Mishap" ? 6 : 12} {result.table.die} — {result.table.effect.name}: {result.table.effect.description}</p>}
      {result.table?.direction && <p>Discharge direction · d8 {result.table.direction.die}: {result.table.direction.name}.</p>}
      {result.table?.permanentInjury && <p>Permanent Injury · d6 {result.table.permanentInjury.die}: {result.table.permanentInjury.name} — {result.table.permanentInjury.description}</p>}
      {result.additionalTable && <p>Snapback d12 {result.additionalTable.die} — {result.additionalTable.effect.name}: {result.additionalTable.effect.description}</p>}
      {result.additionalTable?.direction && <p>Discharge direction · d8 {result.additionalTable.direction.die}: {result.additionalTable.direction.name}.</p>}
      {result.additionalTable?.permanentInjury && <p>Permanent Injury · d6 {result.additionalTable.permanentInjury.die}: {result.additionalTable.permanentInjury.name} — {result.additionalTable.permanentInjury.description}</p>}
      {result.damage !== undefined && <p>{result.damageSaved ? "Damage saved" : "Damage rolled but not saved"}: {result.damage} VP.</p>}
      {result.additionalTable?.damage !== undefined && <p>Secondary damage: {result.additionalTable.damage} VP; check the warning below for save status.</p>}
      {result.warning && <p>{result.warning}</p>}
    </div>
  );
}

interface Props {
  character: Character;
  onUpdate: (data: Partial<Character>) => void | Promise<void>;
  onCastState?: (character: Character) => void;
  beforeCast?: () => Promise<unknown>;
  onLocalEdit?: () => void;
  onLocalSave?: () => void;
}

export function CharacterSheetContent({ character, onUpdate, onCastState, beforeCast, onLocalEdit, onLocalSave }: Props) {
  const { openRoll } = useDiceRoller();
  const recordRoll = useGameplayRoll();
  const queryClient = useQueryClient();
  const createCast = useCreateCast();
  const createStrainCheck = useCreateCastStrainCheck();
  const resolveConsequence = useResolveCastConsequence();
  const { user } = useAuth();
  const { style: activeDiceStyle, isLoading: dicePreferencesLoading, isError: dicePreferenceError } = useActiveDiceStyle();
  const diceStyle = dicePreferenceError ? DEFAULT_DICE_STYLE : activeDiceStyle;
  const [localData, setLocalData] = useState<SheetData>((character.data as SheetData) || {});
  const localDataRef = useRef<SheetData>((character.data as SheetData) || {});
  const [showFeatPicker, setShowFeatPicker] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [expandedCatalogItem, setExpandedCatalogItem] = useState<string | null>(null);
  const [showMendPanel, setShowMendPanel] = useState(false);
  const [recoveryDiceUsed, setRecoveryDiceUsed] = useState(0);
  const [supportTension, setSupportTension] = useState(1);
  const [supporting, setSupporting] = useState(false);
  const [supportCheck, setSupportCheck] = useState<{ d1: number; d2?: number; finalDie: number; total: number; mode: string } | null>(null);
  const [supportError, setSupportError] = useState("");
  const supportLock = useRef(false);
  const [mendRoll, setMendRoll] = useState<{ d1: number; d2: number; diceUsed: number; diceRoll: number; healed: number; rolling: boolean; rollKey: number } | null>(null);
  const [mendError, setMendError] = useState("");
  const [strainPending, setStrainPending] = useState(false);
  const [strainMessage, setStrainMessage] = useState("");
  const strainLock = useRef(false);
  const [pendingCastRequests, setPendingCastRequests] = useState<PendingCastRequest[]>([]);
  const [resumedCastResult, setResumedCastResult] = useState<ApiCastResult | null>(null);
  const [strainResult, setStrainResult] = useState<ApiCastResult | null>(null);
  const [consequenceChoices, setConsequenceChoices] = useState<Record<string, string>>({});
  const [savedConsequenceChoices, setSavedConsequenceChoices] = useState<Record<string, string>>({});
  const [consequenceBusy, setConsequenceBusy] = useState<string | null>(null);
  const [consequenceError, setConsequenceError] = useState<Record<string, string>>({});
  const [threadSenseRolls, setThreadSenseRolls] = useState<Record<string, { busy?: boolean; roll?: GameplayRoll; error?: string }>>({});
  const [resumeError, setResumeError] = useState("");
  const [sheetSaveError, setSheetSaveError] = useState("");
  const isMendRolling = !!mendRoll?.rolling;
  const [expandedKitItem, setExpandedKitItem] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingSave = useRef<SheetData | null>(null);
  const sheetUpdateQueue = useRef<Promise<void>>(Promise.resolve());
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const castRequestLock = useRef(false);
  const [castInProgress, setCastInProgress] = useState(false);
  const dirtyRef = useRef(false);
  const editSerial = useRef(0);
  const pendingCastPrefix = user?.id == null ? null : `threadcast:pending-cast:v1:${user.id}:${character.id}:`;
  const consequenceChoicePrefix = user?.id == null ? null : `threadcast:consequence-choice:v1:${user.id}:${character.id}:`;
  const [storageError, setStorageError] = useState("");
  const mendRollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mendRollLock = useRef(false);

  function enqueueSheetUpdate(data: SheetData): Promise<unknown> {
    const update = sheetUpdateQueue.current
      .catch(() => undefined)
      .then(() => Promise.resolve(onUpdateRef.current({ data: data as any })));
    sheetUpdateQueue.current = update.then(() => undefined, () => undefined);
    return update;
  }

  const refreshPendingCastRequests = useCallback(() => {
    if (!pendingCastPrefix || typeof window === "undefined") {
      setPendingCastRequests([]);
      return;
    }
    try {
      const pending: PendingCastRequest[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith(pendingCastPrefix)) continue;
        const saved = JSON.parse(window.localStorage.getItem(key) || "null");
        if (!saved || typeof saved.requestId !== "string" || typeof saved.body !== "string" ||
            !["cast", "strain"].includes(saved.operation) || !Number.isFinite(saved.createdAt)) {
          throw new Error("A saved cast retry record is invalid. Do not start another cast until it is recovered.");
        }
        pending.push({ ...saved, key } as PendingCastRequest);
      }
      pending.sort((a, b) => a.createdAt - b.createdAt);
      setPendingCastRequests(pending);
      setStorageError("");
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Saved cast retries could not be loaded.");
    }
  }, [pendingCastPrefix]);

  function consequenceChoiceKey(id: string) {
    return consequenceChoicePrefix ? `${consequenceChoicePrefix}${id}` : null;
  }

  useEffect(() => () => {
    if (mendRollTimer.current) clearTimeout(mendRollTimer.current);
    clearTimeout(saveTimer.current);
    if (pendingSave.current) void enqueueSheetUpdate(pendingSave.current).catch(() => undefined);
  }, []);

  useEffect(() => {
    const next = (character.data as SheetData) || {};
    localDataRef.current = next;
    setLocalData(next);
    dirtyRef.current = false;
    onLocalSave?.();
    setResumedCastResult(null);
    setSupporting(false);
    setSupportCheck(null);
    setSupportError("");
    setThreadSenseRolls({});
  }, [character.id]);

  useEffect(() => {
    refreshPendingCastRequests();
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(pendingCastPrefix || "")) refreshPendingCastRequests();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pendingCastPrefix, refreshPendingCastRequests]);

  useEffect(() => {
    if (!consequenceChoicePrefix || typeof window === "undefined") {
      setConsequenceChoices({});
      setSavedConsequenceChoices({});
      return;
    }
    const next: Record<string, string> = {};
    try {
      const consequences = Array.isArray(localData.castConsequences) ? localData.castConsequences : [];
      consequences.forEach(consequence => {
        const key = consequenceChoiceKey(consequence.id);
        if (!key) return;
        if (consequence.status !== "pending") {
          window.localStorage.removeItem(key);
          return;
        }
        const saved = window.localStorage.getItem(key);
        if (saved !== null) next[consequence.id] = saved;
      });
      setConsequenceChoices(next);
      setSavedConsequenceChoices(next);
    } catch {
      setConsequenceError(previous => ({ ...previous, storage: "Saved consequence choices could not be loaded." }));
    }
  }, [character.id, character.version, consequenceChoicePrefix, localData.castConsequences]);

  useEffect(() => {
    if (!consequenceChoicePrefix || typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith(consequenceChoicePrefix)) return;
      const id = event.key.slice(consequenceChoicePrefix.length);
      if (event.newValue !== null) {
        setConsequenceChoices(previous => ({ ...previous, [id]: event.newValue || "" }));
        setSavedConsequenceChoices(previous => ({ ...previous, [id]: event.newValue || "" }));
        return;
      }
      setConsequenceChoices(previous => {
        const { [id]: _removed, ...remaining } = previous;
        return remaining;
      });
      setSavedConsequenceChoices(previous => {
        const { [id]: _removed, ...remaining } = previous;
        return remaining;
      });
      if (castRequestLock.current || pendingSave.current || dirtyRef.current) {
        setSheetSaveError("A consequence changed in another session. Your unsaved sheet draft was retained; save or reconcile it before refreshing.");
        return;
      }
      void (async () => {
        await sheetUpdateQueue.current;
        if (beforeCast) await beforeCast();
        if (castRequestLock.current || pendingSave.current || dirtyRef.current) return;
        const fresh = await getCharacter(character.id);
        if (castRequestLock.current || pendingSave.current || dirtyRef.current) return;
        const next = fresh.data as SheetData;
        localDataRef.current = next;
        setLocalData(next);
        onCastState?.(fresh);
      })().catch(() => undefined);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [beforeCast, character.id, consequenceChoicePrefix, onCastState]);

  useEffect(() => {
    // A different tab may have cast while this sheet was open. Query refetches
    // must refresh the displayed resources, but not overwrite unsaved typing.
    if (castRequestLock.current || pendingSave.current || dirtyRef.current) return;
    const next = (character.data as SheetData) || {};
    localDataRef.current = next;
    setLocalData(next);
  }, [character.version]);

  const save = useCallback((next: SheetData) => {
    clearTimeout(saveTimer.current);
    pendingSave.current = next;
    setSheetSaveError("");
    const serial = editSerial.current;
    saveTimer.current = setTimeout(() => {
      void enqueueSheetUpdate(next).then(() => {
        if (pendingSave.current === next) pendingSave.current = null;
        if (editSerial.current === serial) {
          dirtyRef.current = false;
          setSheetSaveError("");
          onLocalSave?.();
        }
      }).catch(error => {
        if (!pendingSave.current) pendingSave.current = next;
        setSheetSaveError(`Sheet edits are still unsaved and have been retained. Save them before resolving cast outcomes: ${rollErrorMessage(error)}`);
      });
    }, 800);
  }, [onLocalSave]);

  function patch(partial: Partial<SheetData>) {
    dirtyRef.current = true;
    editSerial.current += 1;
    onLocalEdit?.();
    const n = { ...localDataRef.current, ...partial };
    localDataRef.current = n;
    setLocalData(n);
    save(n);
  }
  function patchNested<K extends keyof SheetData>(key: K, field: string, value: unknown) {
    dirtyRef.current = true;
    editSerial.current += 1;
    onLocalEdit?.();
    const prior = localDataRef.current;
    const n = { ...prior, [key]: { ...(prior[key] as object || {}), [field]: value } } as SheetData;
    localDataRef.current = n;
    setLocalData(n);
    save(n);
  }

  // ---- Derived ----
  const feats = localData.feats || [];
  const baseAttrs: Record<string, number> = localData.attributes || {};
  const permanentInjuries = Array.isArray(localData.permanentInjuries) ? localData.permanentInjuries : [];
  const castConsequences = Array.isArray(localData.castConsequences) ? localData.castConsequences : [];
  const pendingConsequences = castConsequences.filter(consequence => consequence.status === "pending");
  const resolvedConsequences = castConsequences.filter(consequence => consequence.status === "resolved");
  const nerveDamageCount = permanentInjuries.filter(injury => injury.name === "Nerve Damage (Hands)").length;
  const reducedCeilingCount = permanentInjuries.filter(injury => injury.name === "Reduced Ceiling").length;
  const hasPendingLostThread = pendingConsequences.some(consequence => consequence.name === "Lost Thread");
  const castingConditionsWithInjuries = [
    ...(localData.castingConditions || []),
    ...(permanentInjuries.some(injury => injury.name === "The Shakes") ? ["Shaking Hands"] : []),
  ];
  const lostStringNames = new Set(permanentInjuries
    .filter(injury => injury.name === "Lost Thread" && injury.string)
    .map(injury => injury.string!.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+string$/, "")));
  // ASI feat bonuses applied on top of base attributes
  const asiAttrBonuses: Record<string, number> = {};
  feats.forEach((name, idx) => {
    if (name === "Attribute Score Improvement") {
      const choice = (localData.featChoices || {} as any)[String(idx)];
      if (choice?.mode === "one" && choice.attrs?.[0]) {
        asiAttrBonuses[choice.attrs[0]] = (asiAttrBonuses[choice.attrs[0]] || 0) + 2;
      } else if (choice?.mode === "two") {
        (choice.attrs || []).forEach((a: string) => {
          if (a) asiAttrBonuses[a] = (asiAttrBonuses[a] || 0) + 1;
        });
      }
    }
  });
  const guildRankData = localData.guild && localData.guildRank
    ? getGuildRankData(localData.guild, localData.guildRank)
    : undefined;
  const guildStatBonuses = guildRankData?.statBonuses ?? {};

  const attrs: Record<string, number> = {
    pot: (baseAttrs.pot || 10) + (asiAttrBonuses.pot || 0) + (guildStatBonuses.pot || 0),
    ctr: (baseAttrs.ctr || 10) + (asiAttrBonuses.ctr || 0) + (guildStatBonuses.ctr || 0),
    res: (baseAttrs.res || 10) + (asiAttrBonuses.res || 0) + (guildStatBonuses.res || 0),
    acu: (baseAttrs.acu || 10) + (asiAttrBonuses.acu || 0) + (guildStatBonuses.acu || 0),
    pre: (baseAttrs.pre || 10) + (asiAttrBonuses.pre || 0) + (guildStatBonuses.pre || 0),
    ths: (baseAttrs.ths || 10) + (asiAttrBonuses.ths || 0) + (guildStatBonuses.ths || 0),
  };
  const vp = localData.vitalityPoints || { current: 0, max: 0 };
  const tension = localData.tension || { current: 0, pool: 0, safeLimit: 0 };
  const burnout = localData.burnout || 0;
  const fatigue = localData.fatigue || 0;
  const corruption = localData.corruption || 0;
  const level = character.level || 1;
  const safePowerLevel = maximumSafePowerLevel(level, attrs.pot || 10);
  const rb = getRefinementBonus(level);
  const inventory = localData.inventory || [];

  // Feat passive bonuses
  const featVpBonus    = feats.includes("Iron Constitution")    ? 4 : 0;
  const featWardBonus  = feats.includes("Ward Specialist")      ? 2 : 0;
  const featPoolBonus  = feats.includes("Extended Thread Pool") ? 4 : 0;
  const featSLBonus    = feats.includes("Extended Thread Pool") ? 2 : 0;

  // Guild feat choice passive bonuses
  const guildFeatName = localData.guildFeatChoice;
  const guildFeatDef = guildFeatName ? FEATS.find(f => f.name === guildFeatName) : undefined;
  const guildFeatVpBonus   = guildFeatDef?.passiveBonus?.vpMax      ?? 0;
  const guildFeatWardBonus = guildFeatDef?.passiveBonus?.wardRating  ?? 0;
  const guildFeatPoolBonus = guildFeatDef?.passiveBonus?.threadPool  ?? 0;
  const guildFeatSLBonus   = guildFeatDef?.passiveBonus?.safeLimit   ?? 0;

  // Equipped item bonuses
  const equippedItems = inventory.filter(i => i.equipped);
  const equippedGR = equippedItems.reduce((s, i) => s + (ITEM_BONUS[i.id]?.guardRating  || 0), 0);
  const equippedWR = equippedItems.reduce((s, i) => s + (ITEM_BONUS[i.id]?.wardRating   || 0), 0);

  const maxVP          = calcVPMax(attrs.res || 10, level) + featVpBonus + guildFeatVpBonus;
  const maxPool        = Math.max(0, calcThreadPool(level, attrs.pot || 10, attrs.ctr || 10) + featPoolBonus + guildFeatPoolBonus - (nerveDamageCount * 2) - (reducedCeilingCount * 4));
  const threadPool     = maxPool;
  const availableTension = threadPool - tension.current;
  const safeLimit      = Math.max(0, calcSafeLimit(level, attrs.pot || 10, attrs.ctr || 10) + featSLBonus + guildFeatSLBonus - nerveDamageCount);
  const guardRating    = calcGuardRating(attrs.res || 10) + equippedGR;
  const wardRating     = calcWardRating(attrs.ctr || 10) - nerveDamageCount + featWardBonus + guildFeatWardBonus + equippedWR;
  const maxRecoveryDice = calcRecoveryDice(attrs.res || 10);
  const recoveryDiceCurrent = localData.recoveryDiceCurrent ?? maxRecoveryDice;
  const castingMetricsRef = useRef({ threadPool, safeLimit, res: attrs.res || 10 });
  castingMetricsRef.current = { threadPool, safeLimit, res: attrs.res || 10 };

  // Equipped weapons for Actions tab
  const equippedWeapons = equippedItems.filter(i => ITEM_BONUS[i.id]?.attackAttr);
  // Per-rest feats that are active on this character
  const activeCombatFeats = FEATS.filter(f => f.usesPerRest && feats.includes(f.name));

  const attunedSkillsBase: string[] = localData.attunedSkills
    || (localData.skills || []).filter(s => s.attuned).map(s => s.name)
    || [];
  const attunementFeatSkills: string[] = [];
  feats.forEach((name, idx) => {
    if (name === "Attunement (Skilled)") {
      const choice = (localData.featChoices as any || {})[String(idx)];
      if (choice?.skill && !attunedSkillsBase.includes(choice.skill)) {
        attunementFeatSkills.push(choice.skill);
      }
    }
  });
  const guildAttunements = (guildRankData?.attunements ?? []).filter(
    s => !attunedSkillsBase.includes(s) && !attunementFeatSkills.includes(s)
  );
  const attunedSkills = [...attunedSkillsBase, ...attunementFeatSkills, ...guildAttunements];
  const expertiseSkills: string[] = [];
  feats.forEach((name, idx) => {
    if (name === "Expertise") {
      const choice = (localData.featChoices as any || {})[String(idx)];
      if (choice?.skill) expertiseSkills.push(choice.skill);
    }
  });

  const featSlots = Math.floor(level / 2);
  const featSlotsRemaining = featSlots - feats.length;

  // ---- Feat charge helpers ----
  function isFeatAvailable(name: string): boolean {
    return (localData.featCharges || {})[name] !== 0;
  }
  function attemptCast(cost: number, consumePrecisionWeave = false, allowOverflow = false): boolean {
    const latest = localDataRef.current;
    const metrics = castingMetricsRef.current;
    const current = latest.tension?.current ?? 0;
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(current) ||
        (!allowOverflow && current + cost > metrics.threadPool)) return false;
    const chargeAvailable = (latest.feats || []).includes("Precision Weave") &&
      (latest.featCharges || {})["Precision Weave"] !== 0;
    if (consumePrecisionWeave && !chargeAvailable) return false;
    patch({
      tension: { ...(latest.tension || { current, pool: metrics.threadPool, safeLimit: metrics.safeLimit }),
        current: current + cost > metrics.threadPool ? 0 : current + cost,
        pool: metrics.threadPool, safeLimit: metrics.safeLimit },
      ...(consumePrecisionWeave
        ? { featCharges: { ...(latest.featCharges || {}), "Precision Weave": 0 } }
        : {}),
    });
    return true;
  }
  function useFeat(name: string) {
    patch({ featCharges: { ...(localData.featCharges || {}), [name]: 0 } });
  }
  function beginCastRequest(): (() => void) | null {
    if (castRequestLock.current) return null;
    castRequestLock.current = true;
    setCastInProgress(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      castRequestLock.current = false;
      setCastInProgress(false);
    };
  }

  function readStoredCastRequests(): PendingCastRequest[] {
    if (!pendingCastPrefix || typeof window === "undefined") return [];
    const pending: PendingCastRequest[] = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith(pendingCastPrefix)) continue;
        const saved = JSON.parse(window.localStorage.getItem(key) || "null");
        if (!saved || typeof saved.requestId !== "string" || typeof saved.body !== "string" ||
            !["cast", "strain"].includes(saved.operation) || !Number.isFinite(saved.createdAt)) {
          throw new Error("A saved cast retry record is invalid. Do not start another cast until it is recovered.");
        }
        pending.push({ ...saved, key } as PendingCastRequest);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Saved cast retries could not be read.");
    }
    return pending.sort((a, b) => a.createdAt - b.createdAt);
  }

  function saveCastRequest(operation: "cast" | "strain", payload: Omit<CastInput, "requestId"> | Omit<CastStrainInput, "requestId">): PendingCastRequest {
    if (!pendingCastPrefix) throw new Error("Your signed-in identity is not available to save a durable cast retry.");
    const requestId = crypto.randomUUID();
    const body = JSON.stringify({ ...payload, requestId });
    const key = `${pendingCastPrefix}${requestId}`;
    const createdAt = Date.now();
    try {
      window.localStorage.setItem(key, JSON.stringify({ requestId, body, operation, createdAt }));
    } catch (error) {
      throw new Error(`The request was not sent because its durable retry could not be saved: ${rollErrorMessage(error)}`);
    }
    const entry = { requestId, body, operation, createdAt, key };
    refreshPendingCastRequests();
    return entry;
  }

  function clearSavedCastRequest(entry: PendingCastRequest) {
    try {
      window.localStorage.removeItem(entry.key);
    } catch {
      // Keeping a completed request is safe: retrying its same ID replays the
      // confirmed result instead of applying the cast a second time.
    }
    refreshPendingCastRequests();
  }

  async function refreshCharacterAfterCast() {
    try {
      const fresh = await getCharacter(character.id);
      const next = fresh.data as SheetData;
      localDataRef.current = next;
      setLocalData(next);
      onCastState?.(fresh);
      return fresh;
    } catch {
      throw new Error("The request resolved, but the latest sheet could not be loaded. Retry this exact saved request to recover its result.");
    }
  }

  async function submitCastRequest(entry: PendingCastRequest, recovered = false): Promise<ApiCastResult> {
    const payload = JSON.parse(entry.body) as CastInput;
    const response = await createCast.mutateAsync({ data: payload });
    await refreshCharacterAfterCast();
    clearSavedCastRequest(entry);
    if (recovered) setResumedCastResult(response);
    void queryClient.invalidateQueries({ queryKey: getListRollsQueryKey() });
    return response;
  }

  async function submitStrainRequest(entry: PendingCastRequest): Promise<ApiCastResult> {
    const payload = JSON.parse(entry.body) as CastStrainInput;
    const response = await createStrainCheck.mutateAsync({ data: payload });
    await refreshCharacterAfterCast();
    clearSavedCastRequest(entry);
    setStrainResult(response);
    void queryClient.invalidateQueries({ queryKey: getListRollsQueryKey() });
    return response;
  }

  async function flushSheetBeforeCast() {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    await sheetUpdateQueue.current;
    const pending = pendingSave.current;
    if (pending) {
      const serial = editSerial.current;
      await enqueueSheetUpdate(pending);
      if (pendingSave.current === pending) pendingSave.current = null;
      if (editSerial.current === serial) {
        dirtyRef.current = false;
        setSheetSaveError("");
        onLocalSave?.();
      }
    }
    await sheetUpdateQueue.current;
    if (pendingSave.current || dirtyRef.current) {
      throw new Error("Unsaved sheet edits remain. They were retained; save or resolve the sheet conflict before continuing.");
    }
    if (beforeCast) await beforeCast();
  }

  async function finishCast(input: Omit<CastInput, "requestId" | "characterId">) {
    const intendedPayload = { ...input, characterId: character.id };
    const intentBody = JSON.stringify(intendedPayload);
    const stored = readStoredCastRequests();
    const samePending = stored.find(entry => {
      if (entry.operation !== "cast") return false;
      const saved = JSON.parse(entry.body);
      delete saved.requestId;
      return JSON.stringify(saved) === intentBody;
    });
    if (samePending) {
      await flushSheetBeforeCast();
      const response = await submitCastRequest(samePending);
      return {
        roll: response.roll,
        aftermath: { ...response.aftermath, saveConfirmed: true, damageSaved: true } as CastUIAftermath,
      };
    }
    if (stored.length) throw new Error("A previous cast or Strain Check is still awaiting confirmation. Resume it above before starting another.");
    await flushSheetBeforeCast();
    if (readStoredCastRequests().length) throw new Error("Another tab saved a cast request. Resume that exact request before starting another.");
    setResumedCastResult(null);
    const entry = saveCastRequest("cast", intendedPayload);
    const response = await submitCastRequest(entry);
    return {
      roll: response.roll,
      aftermath: { ...response.aftermath, saveConfirmed: true, damageSaved: true } as CastUIAftermath,
    };
  }

  async function resumeCastRequest(entry: PendingCastRequest) {
    const release = beginCastRequest();
    if (!release) return;
    strainLock.current = true;
    setStrainPending(entry.operation === "strain");
    setStrainMessage("");
    setResumeError("");
    setResumedCastResult(null);
    try {
      await flushSheetBeforeCast();
      if (entry.operation === "strain") {
        await submitStrainRequest(entry);
      } else {
        await submitCastRequest(entry, true);
      }
    } catch (error) {
      const message = rollErrorMessage(error);
      if (entry.operation === "strain") setStrainMessage(`Saved Strain Check still needs confirmation: ${message}`);
      else setResumeError(message);
    } finally {
      strainLock.current = false;
      setStrainPending(false);
      release();
    }
  }

  async function rollStrainCheck() {
    const latest = localDataRef.current;
    const dc = strainDC(latest.tension?.current ?? 0, castingMetricsRef.current.safeLimit);
    if (strainLock.current || dc === null || dicePreferencesLoading) return;
    const release = beginCastRequest();
    if (!release) {
      setStrainMessage("Another cast is resolving. Finish it before the Strain Check.");
      return;
    }
    strainLock.current = true;
    setStrainPending(true);
    setStrainMessage("");
    setStrainResult(null);
    try {
      const stored = readStoredCastRequests();
      if (stored.length) throw new Error("A previous request is awaiting confirmation. Resume it above before rolling Strain.");
      await flushSheetBeforeCast();
      const entry = saveCastRequest("strain", { characterId: character.id });
      const response = await submitStrainRequest(entry);
      const strain = response.aftermath.strain;
      setStrainMessage(strain
        ? `Strain: ${strain.total} vs DC ${strain.dc} — ${strain.failed ? "failed; Snapback resolved atomically." : "passed"}.`
        : "Strain Check resolved atomically.");
    } catch (error) {
      setStrainMessage(`Strain Check needs confirmation: ${rollErrorMessage(error)}`);
    } finally {
      strainLock.current = false;
      setStrainPending(false);
      release();
    }
  }

  async function submitConsequenceChoice(consequence: CastConsequence) {
    const savedChoice = savedConsequenceChoices[consequence.id];
    const choice = (savedChoice ?? consequenceChoices[consequence.id] ?? "").trim();
    if (!choice) {
      setConsequenceError(previous => ({ ...previous, [consequence.id]: "Choose or enter a consequence before resolving it." }));
      return;
    }
    if (consequence.choiceType === "string") {
      const isAttuned = (localDataRef.current.strings || []).some(name => name === choice);
      if (!isAttuned || lostStringNames.has(choice.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+string$/, ""))) {
        setConsequenceError(previous => ({ ...previous, [consequence.id]: "Choose an available attuned String from the current character sheet." }));
        return;
      }
    }
    const storageKey = consequenceChoiceKey(consequence.id);
    if (!storageKey) {
      setConsequenceError(previous => ({ ...previous, [consequence.id]: "Your signed-in identity is not available to save this choice for retry." }));
      return;
    }
    if (!savedChoice) {
      try {
        window.localStorage.setItem(storageKey, choice);
        setSavedConsequenceChoices(previous => ({ ...previous, [consequence.id]: choice }));
      } catch (error) {
        setConsequenceError(previous => ({ ...previous, [consequence.id]: `Choice was not sent because its durable retry could not be saved: ${rollErrorMessage(error)}` }));
        return;
      }
    }
    const release = beginCastRequest();
    if (!release) {
      setConsequenceError(previous => ({ ...previous, [consequence.id]: "Another cast or consequence is resolving. Retry this saved choice when it finishes." }));
      return;
    }
    setConsequenceBusy(consequence.id);
    setConsequenceError(previous => ({ ...previous, [consequence.id]: "" }));
    let requestSent = false;
    try {
      await flushSheetBeforeCast();
      requestSent = true;
      const updated = await resolveConsequence.mutateAsync({ id: consequence.id, data: { choice } });
      const next = updated.data as SheetData;
      localDataRef.current = next;
      setLocalData(next);
      onCastState?.(updated);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // The authoritative sheet is already updated. Any leftover choice is
        // harmless and will be cleared when the resolved consequence reloads.
      }
      setSavedConsequenceChoices(previous => {
        const { [consequence.id]: _resolved, ...remaining } = previous;
        return remaining;
      });
      setConsequenceChoices(previous => {
        const { [consequence.id]: _resolved, ...remaining } = previous;
        return remaining;
      });
      setConsequenceError(previous => ({ ...previous, [consequence.id]: "" }));
      void queryClient.invalidateQueries();
    } catch (error) {
      if (requestSent) {
        try {
          const fresh = await getCharacter(character.id);
          const next = fresh.data as SheetData;
          localDataRef.current = next;
          setLocalData(next);
          onCastState?.(fresh);
        } catch {
          // Keep the durable choice visible and locked when the server cannot
          // yet confirm whether it committed.
        }
      }
      setConsequenceError(previous => ({
        ...previous,
        [consequence.id]: requestSent
          ? `Choice was not confirmed. Retry the saved choice (${choice}) to safely complete it: ${rollErrorMessage(error)}`
          : `The choice is saved for retry, but sheet edits could not be flushed. Your draft was retained and the choice was not sent: ${rollErrorMessage(error)}`,
      }));
    } finally {
      setConsequenceBusy(null);
      release();
    }
  }

  async function rollAffectedThreadSense(senseType: string) {
    const release = beginCastRequest();
    if (!release) {
      setThreadSenseRolls(previous => ({
        ...previous,
        [senseType]: { ...previous[senseType], error: "Another cast or consequence is resolving. Try this check when it finishes." },
      }));
      return;
    }
    setThreadSenseRolls(previous => ({
      ...previous,
      [senseType]: { ...previous[senseType], busy: true, error: "" },
    }));
    try {
      await flushSheetBeforeCast();
      const roll = await recordRoll({
        characterId: character.id,
        title: "Thread Sense",
        category: "check",
        mode: "NORMAL",
        modifier: 0,
        diceSides: 20,
        diceCount: 1,
        multiplier: 1,
        threadSenseType: senseType,
      });
      setThreadSenseRolls(previous => ({
        ...previous,
        [senseType]: { busy: false, roll },
      }));
    } catch (error) {
      setThreadSenseRolls(previous => ({
        ...previous,
        [senseType]: { ...previous[senseType], busy: false, error: rollErrorMessage(error) },
      }));
    } finally {
      release();
    }
  }

  async function rollSupportCheck(): Promise<boolean> {
    if (supportLock.current) return false;
    supportLock.current = true;
    setSupportError("");
    try {
      const threadDiscord = burnout >= 1 || castingConditionsWithInjuries.includes("Discord on Thread Checks until Mend") ||
        castingConditionsWithInjuries.includes("Shaking Hands");
      const result = await recordRoll({ characterId: character.id, title: "Collaborative support · CTR",
        category: "support", mode: threadDiscord ? "DISCORD" : "NORMAL", modifier: calcMod(attrs.ctr || 10) - nerveDamageCount,
        diceSides: 20, diceCount: threadDiscord ? 2 : 1, multiplier: 1, dc: 12 });
      setSupportCheck({ d1: result.d1, d2: result.d2 ?? undefined, finalDie: result.finalDie, total: result.total, mode: result.mode });
      return true;
    } catch (error) {
      setSupportError(rollErrorMessage(error));
      return false;
    } finally {
      supportLock.current = false;
    }
  }

  async function beginSupport() {
    if (!Number.isInteger(supportTension) || supportTension < 1 || supportTension > availableTension ||
        dicePreferencesLoading || supportLock.current) return;
    if (!await rollSupportCheck()) return;
    if (!attemptCast(supportTension)) return;
    setSupporting(true);
  }

  // ---- Mend handler ----
  async function doMend() {
    if (dicePreferencesLoading || mendRollLock.current) return;
    mendRollLock.current = true;
    const diceUsed = recoveryDiceUsed;
    setMendError("");
    let result;
    try {
      result = await recordRoll({ characterId: character.id, title: "Mend", category: "mend",
        mode: "NORMAL", modifier: 0, diceSides: 6, diceCount: 2, multiplier: diceUsed });
    } catch (error) {
      setMendError(rollErrorMessage(error));
      mendRollLock.current = false;
      return;
    }
    const d1 = result.d1;
    const d2 = result.d2!;
    const diceRoll = result.total;
    const healed = Math.min(diceRoll, maxVP - vp.current);
    const resetCharges = { ...(localData.featCharges || {}) };
    FEATS.filter(f => f.usesPerRest && (f.restType === "mend" || f.restType === "combat")).forEach(f => {
      delete resetCharges[f.name];
    });
    patch({
      tension: { ...tension, current: 0 },
      vitalityPoints: { ...vp, current: Math.min(maxVP, vp.current + healed) },
      recoveryDiceCurrent: Math.max(0, recoveryDiceCurrent - recoveryDiceUsed),
      featCharges: resetCharges,
      castingConditions: (localData.castingConditions || []).filter(c => !c.includes("until Mend") && c !== "Shaking Hands"),
    });
    setMendRoll({ d1, d2, diceUsed, diceRoll, healed, rolling: true, rollKey: (mendRoll?.rollKey ?? 0) + 1 });
    setRecoveryDiceUsed(0);
    mendRollTimer.current = setTimeout(() => {
      mendRollTimer.current = null;
      mendRollLock.current = false;
      setMendRoll(current => current ? { ...current, rolling: false } : current);
    }, ROLL_DURATION_MS);
  }

  function doLongRest() {
    if (mendRollLock.current) return;
    patch({
      vitalityPoints: { current: maxVP, max: maxVP },
      tension: { ...tension, current: 0 },
      fatigue: Math.max(0, fatigue - 1),
      burnout: Math.max(0, burnout - 1),
      recoveryDiceCurrent: maxRecoveryDice,
      featCharges: {},
      castingConditions: (localData.castingConditions || []).filter(c => !c.includes("until Mend") && c !== "Shaking Hands"),
    });
  }

  // ---- Feat helpers ----
  const REPEATABLE_FEATS = new Set(["Attribute Score Improvement", "Attunement (Skilled)", "Expertise"]);
  const activeFeatEntries = feats.map((name, idx) => ({
    def: FEATS.find(f => f.name === name),
    name,
    idx,
  }));
  const activeFeatDefs = FEATS.filter(f => feats.includes(f.name));
  const availableFeats = FEATS.filter(f => {
    if (!REPEATABLE_FEATS.has(f.name) && feats.includes(f.name)) return false;
    if (f.minLevel > level) return false;
    return true;
  });

  function addFeat(name: string) {
    patch({ feats: [...feats, name] });
    setShowFeatPicker(false);
  }
  function removeFeatByIdx(idx: number) {
    const nextFeats = feats.filter((_, i) => i !== idx);
    const nextChoices = { ...(localData.featChoices || {}) };
    delete (nextChoices as Record<string, any>)[String(idx)];
    patch({ feats: nextFeats, featChoices: nextChoices });
  }
  function saveFeatChoice(idx: number, choice: any) {
    patch({ featChoices: { ...(localData.featChoices || {}), [String(idx)]: choice } });
  }

  // ---- Inventory helpers ----
  const filteredCatalog = CATALOG_ITEMS.filter(item =>
    (catalogCategory === "all" || item.category === catalogCategory) &&
    (inventorySearch === "" || item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || (item.subCategory || "").toLowerCase().includes(inventorySearch.toLowerCase()))
  );

  function addFromCatalog(item: typeof CATALOG_ITEMS[0]) {
    const kc = KIT_CONTENTS[item.id];
    const newEntry: InventoryEntry = {
      id: item.id,
      name: item.name,
      quantity: 1,
      rarity: item.rarity,
      desc: item.desc,
      mechanical: item.mechanical,
      category: item.category,
      subCategory: item.subCategory,
      equipped: false,
      ...(kc ? { subItems: kc.map(si => ({ ...si })) } : {}),
    };
    patch({ inventory: [...inventory, newEntry] });
  }
  function addCustomItem() {
    const newItem: InventoryEntry = {
      id: `custom-${Date.now()}`,
      name: "New Item",
      quantity: 1,
      rarity: "common",
      notes: "",
    };
    patch({ inventory: [...inventory, newItem] });
  }
  function updateItem(id: string, changes: Partial<InventoryEntry>) {
    patch({ inventory: inventory.map(i => i.id === id ? { ...i, ...changes } : i) });
  }
  function removeItem(id: string) {
    patch({ inventory: inventory.filter(i => i.id !== id) });
  }
  function toggleEquip(id: string) {
    patch({ inventory: inventory.map(i => i.id === id ? { ...i, equipped: !i.equipped } : i) });
  }
  function useConsumable(id: string) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    if (item.quantity > 1) updateItem(id, { quantity: item.quantity - 1 });
    else removeItem(id);
  }
  function useSubItem(itemId: string, subIdx: number) {
    const item = inventory.find(i => i.id === itemId);
    if (!item?.subItems?.[subIdx] || item.subItems[subIdx].charges <= 0) return;
    patch({
      inventory: inventory.map(i => i.id === itemId ? {
        ...i,
        subItems: i.subItems!.map((s, idx) => idx === subIdx ? { ...s, charges: s.charges - 1 } : s),
      } : i),
    });
  }
  function toggleSubItemEquip(itemId: string, subIdx: number) {
    const item = inventory.find(i => i.id === itemId);
    if (!item?.subItems?.[subIdx]) return;
    patch({
      inventory: inventory.map(i => i.id === itemId ? {
        ...i,
        subItems: i.subItems!.map((s, idx) => idx === subIdx ? { ...s, equipped: !s.equipped } : s),
      } : i),
    });
  }

  // ---- PDF Export ----
  function handleExportPDF() {
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) { alert("Allow pop-ups to export PDF."); return; }

    const totalStr = (localData.strings || []).length;
    const printEscape = escapePrintHtml;
    const weaveRows = (localData.weavings || []).map((w, wi) => {
      const count = Math.max(2, Math.min(4, w.numStrings || 2));
      const cost = (w.strings || []).slice(0, count).reduce((sum, name, index) => {
        const pl = w.powerLevels?.[index] || 1;
        return sum + (findString(name)?.levels?.[pl - 1]?.cost ?? CORE_POWER_LEVELS[pl - 1]?.cost ?? 0);
      }, 0) * weaveMultiplier(count);
      return `<tr><td>${wi + 1}</td><td>${(w.strings || []).slice(0, count).map(printEscape).join(", ")}</td><td>${(w.powerLevels || []).slice(0, count).map(pl => `PL${pl}`).join(", ")}</td><td>${(w.modes || []).slice(0, count).map(printEscape).join(", ")}</td><td>${count === 2 ? feats.includes("Precision Weave") ? "Harmony" : "Normal" : "Discord"}</td><td>${cost}T</td></tr>${w.intent?.trim() ? `<tr><td colspan="6" style="font-size:7.5pt;color:#555">Shared effect: ${printEscape(w.intent.trim())}</td></tr>` : ""}`;
    }).join("");
    const activeFeatDefsAll = FEATS.filter(f => feats.includes(f.name));

    const burnoutLabel = ["Clear","Frayed","Stretched","Scorched","Cracked","Breaking","Thread Death"][burnout] || "Clear";
    const trackDots = (val: number, max: number, filled: string) =>
      Array.from({ length: max }).map((_, i) => `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #444;background:${i < val ? filled : "transparent"};margin-right:2px;"></span>`).join("");

    const checkBox = (filled: boolean) =>
      `<span style="display:inline-block;width:11px;height:11px;border:1px solid #555;background:${filled?"#333":"transparent"};margin-right:2px;vertical-align:middle;"></span>`;
    const checkBoxes = (filled: number, total: number) =>
      Array.from({length:total}).map((_,i) => checkBox(i < filled)).join("");
    const restBadge = (feat: typeof activeFeatDefsAll[0]) =>
      feat.usesPerRest ? `<span style="font-family:monospace;font-size:7pt;border:1px solid #777;padding:1px 4px;margin-left:6px;color:#555;">${feat.restType==="mend"?"1/MEND":feat.restType==="long"?"1/LONG REST":"1/COMBAT"} ${checkBox(!isFeatAvailable(feat.name))}</span>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${character.name} — THREADCAST Sheet</title>
<style>
@page{size:A4;margin:14mm 16mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;font-size:9.5pt;color:#111;line-height:1.45}
h1{font-size:18pt;letter-spacing:.05em;margin-bottom:2px;font-family:Georgia,serif}
h2{font-size:10pt;border-bottom:1.5px solid #222;padding-bottom:2px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.08em;font-family:monospace}
h3{font-size:8pt;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:3px;font-family:monospace}
.page{page-break-before:always;padding-top:2px}
.page:first-child{page-break-before:auto}
.header{display:flex;align-items:flex-start;gap:12px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px}
.portrait{width:56px;height:56px;object-fit:cover;border:1px solid #333;flex-shrink:0}
.pills{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.pill{font-family:monospace;font-size:7pt;border:1px solid #555;padding:1px 5px;color:#333}
.g6{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.stat-box{border:1px solid #bbb;padding:4px;text-align:center}
.stat-lbl{font-family:monospace;font-size:6.5pt;color:#666;text-transform:uppercase;letter-spacing:.06em}
.stat-val{font-family:monospace;font-size:12pt;font-weight:bold}
.stat-mod{font-family:monospace;font-size:8pt;color:#444}
.track-box{display:inline-block;width:14px;height:14px;border:1px solid #555;margin-right:2px;vertical-align:middle;text-align:center;line-height:14px;font-size:9pt}
table{width:100%;border-collapse:collapse;font-size:8.5pt}
th{font-family:monospace;font-size:6.5pt;text-align:left;padding:2px 4px;border-bottom:1px solid #333;color:#555;text-transform:uppercase}
td{padding:2px 4px;border-bottom:1px solid #ddd;vertical-align:middle}
.at{color:#7a4e00;font-weight:bold}
.feat-block{border:1px solid #bbb;padding:5px 7px;margin-bottom:4px;break-inside:avoid}
.feat-nm{font-family:monospace;font-size:8.5pt;font-weight:bold}
.feat-cat{font-family:monospace;font-size:6.5pt;color:#777}
.feat-desc{font-size:8pt;color:#333;margin-top:2px;line-height:1.45}
.feat-mech{font-family:monospace;font-size:7.5pt;color:#555;border-left:2px solid #9a6020;padding-left:4px;margin-top:2px}
.passive-badge{font-family:monospace;font-size:6.5pt;color:#2a6030;border:1px solid #2a6030;padding:1px 4px;margin-left:6px}
.notes-section{border:1px solid #ccc;padding:6px;min-height:60px;font-size:8.5pt;white-space:pre-wrap;word-break:break-word}
.lined-box{border:1px solid #ccc;padding:6px 7px;min-height:65px;background-image:repeating-linear-gradient(to bottom,transparent,transparent 19px,#e8e8e8 20px);font-size:8.5pt;white-space:pre-wrap}
.action-row{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #ccc;padding:4px 7px;margin-bottom:3px;gap:8px}
.item-row{display:flex;align-items:baseline;gap:6px;border-bottom:1px solid #eee;padding:2px 0}
.equip-badge{font-family:monospace;font-size:6.5pt;border:1px solid #2a6030;color:#2a6030;padding:0 3px}
</style></head><body>

<!-- PAGE 1: IDENTITY + ATTRIBUTES + VITALS -->
<div class="header">
  ${localData.avatarDataUrl ? `<img src="${localData.avatarDataUrl}" class="portrait" alt="Portrait">` : ""}
  <div style="flex:1">
    <h1>${character.name}</h1>
    <div class="pills">
      <span class="pill">Level ${level}</span>
      ${character.affinity ? `<span class="pill">${character.affinity} Affinity</span>` : ""}
      ${localData.primaryMode ? `<span class="pill">${localData.primaryMode} Primary</span>` : ""}
      ${localData.secondaryMode ? `<span class="pill">${localData.secondaryMode}${localData.secondaryMode2 ? " / "+localData.secondaryMode2:""} Secondary</span>` : ""}
      ${localData.tertiaryMode ? `<span class="pill">${localData.tertiaryMode}${localData.tertiaryMode2 ? " / "+localData.tertiaryMode2:""} Tertiary</span>` : ""}
      ${localData.background ? `<span class="pill">${localData.background}</span>` : ""}
      ${localData.guild ? `<span class="pill">${localData.guild}${localData.guildRank ? " · "+localData.guildRank:""}</span>` : ""}
    </div>
    ${localData.signature ? `<div style="margin-top:4px;font-family:monospace;font-size:7.5pt;color:#555">Sig: ${localData.signature}</div>` : ""}
  </div>
</div>

<h2>Attributes</h2>
<div class="g6">
${ATTRIBUTE_DEFS.map(a => {
  const score = attrs[a.key] || 10;
  const mod = calcMod(score) - (a.key === "ctr" ? nerveDamageCount : 0);
  return `<div class="stat-box"><div class="stat-lbl">${a.abbr}</div><div class="stat-val">${score}</div><div class="stat-mod">${mod>=0?"+":""}${mod}</div></div>`;
}).join("")}
</div>

<div class="g2" style="margin-bottom:10px">
<div>
<h3>Vital Points &amp; Tension</h3>
<div class="g4" style="margin-top:4px">
  <div class="stat-box"><div class="stat-lbl">VP Current</div><div class="stat-val" style="font-size:11pt">${vp.current}</div></div>
  <div class="stat-box"><div class="stat-lbl">VP Max</div><div class="stat-val" style="font-size:11pt">${vp.max||maxVP}${featVpBonus?` <span style="color:#2a6030;font-size:7pt">+${featVpBonus}</span>`:"" }</div></div>
  <div class="stat-box"><div class="stat-lbl">Tension</div><div class="stat-val" style="font-size:11pt">${tension.current}</div></div>
  <div class="stat-box"><div class="stat-lbl">Thread Pool</div><div class="stat-val" style="font-size:11pt">${threadPool}${featPoolBonus?` <span style="color:#2a6030;font-size:7pt">+${featPoolBonus}</span>`:""}</div></div>
  <div class="stat-box"><div class="stat-lbl">Safe Limit</div><div class="stat-val" style="font-size:11pt">${safeLimit}${featSLBonus?` <span style="color:#2a6030;font-size:7pt">+${featSLBonus}</span>`:""}</div></div>
  <div class="stat-box"><div class="stat-lbl">Guard</div><div class="stat-val" style="font-size:11pt">${guardRating}${equippedGR?` <span style="color:#2a6030;font-size:7pt">+${equippedGR}</span>`:""}</div></div>
  <div class="stat-box"><div class="stat-lbl">Ward</div><div class="stat-val" style="font-size:11pt">${wardRating}${(featWardBonus+equippedWR)?` <span style="color:#2a6030;font-size:7pt">+${featWardBonus+equippedWR}</span>`:""}</div></div>
  <div class="stat-box"><div class="stat-lbl">Ref. Bonus</div><div class="stat-val" style="font-size:11pt">+${rb}</div></div>
</div>
</div>
<div>
<h3>Condition Tracks</h3>
<div style="margin-top:5px;font-family:monospace;font-size:8pt">
  <div style="margin-bottom:5px"><strong>Burnout</strong> (${burnout}/6 — ${burnoutLabel})<br>${checkBoxes(burnout,6)} <span style="color:#8b0000">${burnoutLabel}</span></div>
  <div style="margin-bottom:5px"><strong>Recovery Dice</strong> ${recoveryDiceCurrent}/${maxRecoveryDice}<br>${checkBoxes(recoveryDiceCurrent,maxRecoveryDice)}</div>
  <div style="margin-bottom:5px"><strong>Fatigue</strong> ${fatigue}/5<br>${checkBoxes(fatigue,5)}</div>
  <div><strong>Corruption</strong> ${corruption}/10<br>${checkBoxes(corruption,10)}</div>
</div>
${localData.woundsNotes ? `<div style="margin-top:6px"><h3>Wounds &amp; Conditions</h3><div style="border:1px solid #ccc;padding:4px;font-size:8pt;white-space:pre-wrap;margin-top:2px">${localData.woundsNotes}</div></div>` : ""}
${permanentInjuries.length ? `<div style="margin-top:6px"><h3>Permanent Injuries</h3>${permanentInjuries.map(injury => `<div style="border:1px solid #aaa;padding:3px 5px;margin:2px 0;font-size:7.5pt"><strong>${printEscape(injury.name)} · d6 ${printEscape(String(injury.die))}</strong><br>${printEscape(injury.description)}${injury.string ? `<br>Lost String: ${printEscape(injury.string)}` : ""}${injury.senseType ? `<br>Thread Sense type: ${printEscape(injury.senseType)}` : ""}</div>`).join("")}<div style="font-size:7pt;color:#555">Total Break applies 48 VP maximum damage. CTR injury modifiers and reduced Thread Pool / Safe Limit are applied on the sheet.</div></div>` : ""}
${resolvedConsequences.length ? `<div style="margin-top:6px"><h3>Resolved Cast Outcomes</h3>${resolvedConsequences.map(outcome => `<div style="font-size:7.5pt;margin:2px 0"><strong>${outcome.name}</strong>: ${outcome.prompt}${outcome.choice ? ` Choice: ${outcome.choice}` : ""}</div>`).join("")}</div>` : ""}
</div>
</div>

<!-- PAGE 2: ACTIONS + SKILLS + STRINGS -->
<div class="page">
<h2>Actions</h2>
<div class="action-row">
  <div style="flex:1"><strong style="font-family:monospace">Unarmed Strike</strong> <span style="font-family:monospace;font-size:7.5pt;color:#555">Melee · RES</span><br><span style="font-size:7.5pt;color:#555">1 + RES mod (min 1) bludgeoning</span></div>
  <div style="font-family:monospace;font-size:8pt;flex-shrink:0">ATK ${fmtMod(calcMod(attrs.res||10))} &nbsp; DMG 1${fmtMod(Math.max(1,calcMod(attrs.res||10)))} blunt</div>
</div>
${equippedWeapons.map(item => {
  const bonus = ITEM_BONUS[item.id];
  const atkKey = bonus?.attackAttr || "res";
  const atkMod = calcMod((attrs as Record<string,number>)[atkKey] || 10);
  const dmgStr = `${bonus?.damageDice||"1d6"}${fmtMod(atkMod)}${bonus?.damageBonusDice?" "+bonus.damageBonusDice:""}`;
  return `<div class="action-row"><div style="flex:1"><strong style="font-family:monospace">${item.name}</strong> <span style="font-family:monospace;font-size:7.5pt;color:#555">${bonus?.range||"Melee"} · ${atkKey.toUpperCase()}${bonus?.twoHanded?" · 2H":""}</span>${item.mechanical?`<br><span style="font-size:7.5pt;color:#777">${item.mechanical}</span>`:""}</div><div style="font-family:monospace;font-size:8pt;flex-shrink:0">ATK ${fmtMod(atkMod)} &nbsp; DMG ${dmgStr}</div></div>`;
}).join("")}

<h2>Skills</h2>
<table><thead><tr><th>Skill</th><th>Attr</th><th>Attuned</th><th>Modifier</th><th>Total</th></tr></thead><tbody>
${ALL_SKILLS.map(skill => {
  const attrScore = attrs[skill.attr] || 10;
  const mod = calcMod(attrScore) - (skill.attr === "ctr" ? nerveDamageCount : 0);
  const isAt = attunedSkills.includes(skill.name);
  const total = mod + (isAt ? rb : 0);
  return `<tr><td class="${isAt?"at":""}">${skill.name}</td><td style="font-family:monospace;font-size:7.5pt">${skill.attr.toUpperCase()}</td><td style="text-align:center">${isAt?"●":"○"}</td><td style="font-family:monospace">${mod>=0?"+":""}${mod}${isAt?" +"+rb:""}</td><td style="font-family:monospace;font-weight:bold">${total>=0?"+":""}${total}</td></tr>`;
}).join("")}
</tbody></table>

${totalStr > 0 ? `<h2>Strings (${totalStr})</h2><div>${(localData.strings||[]).map((s:string)=>`<div style="border:1px solid #bbb;padding:3px 7px;margin-bottom:3px;font-size:9pt">${s}</div>`).join("")}</div>` : ""}
${(localData.weavings||[]).length > 0 ? `<h2>Weaving Combinations</h2><div style="font-size:7.5pt;color:#555;font-family:monospace;margin-bottom:4px">2 Strings = Normal (Precision Weave: Harmony); 3 = Discord ×2 cost; 4 = Discord ×3 cost (Lv7+). Strings are domains, not spells.</div><table><thead><tr><th>#</th><th>Strings</th><th>Power Levels</th><th>Modes</th><th>Check</th><th>Tension</th></tr></thead><tbody>${weaveRows}</tbody></table>` : ""}
</div>

<!-- PAGE 3: FEATS + INVENTORY -->
<div class="page">
${feats.length > 0 ? `<h2>Feats (${feats.length}/${Math.floor(level/2)} slots)</h2>
<div class="g2">${feats.map((featName,fi) => {const feat=FEATS.find(f=>f.name===featName);if(!feat)return`<div class="feat-block"><span class="feat-nm">${featName}</span></div>`;const fc=(localData.featChoices as Record<string,any>||{})[String(fi)];let choiceHtml="";if(featName==="Attribute Score Improvement"&&fc){if(fc.mode==="one"&&fc.attrs?.[0]){const a=ATTRIBUTE_DEFS.find(a=>a.key===fc.attrs[0]);choiceHtml=`<div style="font-family:monospace;font-size:7pt;color:#2a6030;border:1px solid #2a6030;padding:1px 5px;margin-top:3px;display:inline-block">+2 ${a?.abbr||fc.attrs[0]} (${(baseAttrs[fc.attrs[0]]||10)} → ${(baseAttrs[fc.attrs[0]]||10)+2})</div>`;}else if(fc.mode==="two"&&fc.attrs?.length>=2){choiceHtml=`<div style="font-family:monospace;font-size:7pt;color:#2a6030;border:1px solid #2a6030;padding:1px 5px;margin-top:3px;display:inline-block">+1 ${ATTRIBUTE_DEFS.find(a=>a.key===fc.attrs[0])?.abbr||fc.attrs[0]} · +1 ${ATTRIBUTE_DEFS.find(a=>a.key===fc.attrs[1])?.abbr||fc.attrs[1]}</div>`;}}else if(featName==="Attunement (Skilled)"&&fc?.skill){choiceHtml=`<div style="font-family:monospace;font-size:7pt;color:#2a6030;border:1px solid #2a6030;padding:1px 5px;margin-top:3px;display:inline-block">Attuned: ${fc.skill} (+${rb})</div>`;}else if(featName==="Expertise"&&fc?.skill){choiceHtml=`<div style="font-family:monospace;font-size:7pt;color:#2a6030;border:1px solid #2a6030;padding:1px 5px;margin-top:3px;display:inline-block">Expertise: ${fc.skill} (RB = +${rb*2})</div>`;}return`<div class="feat-block"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;flex-wrap:wrap;gap:3px"><span class="feat-nm">${feat.name}</span><div style="display:flex;align-items:center;gap:4px"><span class="feat-cat">${feat.category.toUpperCase()} · LV${feat.minLevel}</span>${restBadge(feat)}${feat.passiveBonus?`<span class="passive-badge">PASSIVE</span>`:""}</div></div><div class="feat-desc">${feat.desc}</div><div class="feat-mech">${feat.mechanical}</div>${choiceHtml}</div>`;}).join("")}</div>` : ""}

<h2>Inventory (${inventory.length} items)</h2>
${inventory.length > 0 ? `<table><thead><tr><th>Item</th><th>Rarity</th><th>Qty</th><th>Status</th><th>Notes</th></tr></thead><tbody>
${inventory.map(item => {
  const equipBonus = ITEM_BONUS[item.id];
  const bonusStr = item.equipped && equipBonus ? [
    equipBonus.guardRating ? `+${equipBonus.guardRating}GR` : "",
    equipBonus.wardRating  ? `+${equipBonus.wardRating}WR`  : "",
    equipBonus.attackAttr  ? `${equipBonus.damageDice}` : "",
  ].filter(Boolean).join(" ") : "";
  return `<tr><td><strong>${item.name}</strong>${item.category?`<span style="font-family:monospace;font-size:6.5pt;color:#888;margin-left:4px">${item.subCategory||item.category}</span>`:""}</td><td style="font-family:monospace;font-size:7.5pt">${RARITY_LABELS[item.rarity]||item.rarity}</td><td style="text-align:center;font-family:monospace">${item.quantity}</td><td style="font-family:monospace;font-size:7.5pt">${item.equipped?`<span style="color:#2a6030">EQUIP${bonusStr?" ("+bonusStr+")":""}</span>`:"—"}</td><td style="font-size:7.5pt;color:#555">${item.notes||""}</td></tr>`;
}).join("")}
</tbody></table>` : "<p style='font-size:8.5pt;color:#888;margin-top:4px'>No items.</p>"}
</div>

<!-- PAGE 4: NOTES & CHARACTER DEPTH -->
<div class="page">
<h2>Character Notes</h2>
<div class="g2" style="gap:10px">
${([
  {key:"notesBackstory",label:"Backstory"},
  {key:"notesAppearance",label:"Appearance"},
  {key:"notesPersonality",label:"Personality & Quirks"},
  {key:"notesBonds",label:"Bonds & Loyalties"},
  {key:"notesFlaws",label:"Flaws & Fears"},
  {key:"notesGoals",label:"Goals & Ambitions"},
  {key:"notesAllies",label:"Allies & Rivals"},
  {key:"notesSession",label:"Session Log"},
] as const).map(({key,label}) => {
  const val = (localData as Record<string,string>)[key] || "";
  return `<div><h3 style="margin-bottom:3px">${label}</h3><div class="lined-box">${val}</div></div>`;
}).join("")}
</div>
</div>

<script>window.onload=()=>{window.print()}</script>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  const vpPercent = Math.min(100, Math.max(0, (vp.current / (vp.max || maxVP)) * 100));

  // Mode arrays for casting
  const primaryMode = localData.primaryMode || character.mode || "";
  const secondaryModes = [localData.secondaryMode || "", localData.secondaryMode2 || ""].filter(m => m);
  const tertiaryModes = [localData.tertiaryMode || "", localData.tertiaryMode2 || ""].filter(m => m);

  return (
    <div className="tc-sheet max-w-7xl mx-auto">
      {storageError && <p role="alert" className="mb-3 border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive">{storageError}</p>}
      {sheetSaveError && <p role="alert" className="mb-3 border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs text-destructive">{sheetSaveError}</p>}
      {pendingCastRequests.length > 0 && (
        <section className="mb-4 border border-amber-500/50 bg-amber-500/5 p-4 space-y-2 font-mono text-xs" aria-label="Saved requests awaiting confirmation">
          <h2 className="font-bold text-amber-500">A saved request needs confirmation</h2>
          <p className="text-muted-foreground">Resume submits the exact stored request ID and body. Do not start a new cast until the saved result is recovered.</p>
          {pendingCastRequests.map(entry => (
            <div key={entry.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20 pt-2">
              <span>{entry.operation === "strain" ? "Start-of-turn Strain Check" : "Cast"} · request {entry.requestId.slice(0, 8)}…</span>
              <button type="button" className="tc-command border-amber-500/50 text-amber-500 disabled:opacity-50"
                onClick={() => void resumeCastRequest(entry)} disabled={castInProgress}>
                {castInProgress ? "RESOLVING…" : "RESUME SAVED REQUEST"}
              </button>
            </div>
          ))}
          {resumeError && <p role="alert" className="text-destructive">{resumeError}</p>}
        </section>
      )}
      {resumedCastResult && (
        <section className="mb-4 border border-primary/30 bg-primary/5 p-4 font-mono text-xs" aria-live="polite">
          <p className="font-bold text-primary">Saved cast request confirmed · {resumedCastResult.roll.title}: {resumedCastResult.roll.total}</p>
          <CastAftermathDisplay result={{ ...resumedCastResult.aftermath, saveConfirmed: true, damageSaved: true }} />
        </section>
      )}
      {pendingConsequences.length > 0 && (
        <section className="mb-4 border border-amber-500/50 bg-amber-500/5 p-4 space-y-4 font-mono text-xs" aria-label="Pending cast consequence choices">
          <div>
            <h2 className="font-bold text-amber-500">Resolve the cast consequence</h2>
            <p className="text-muted-foreground">Choices are saved with the character. A retry repeats the same choice safely.</p>
          </div>
          {pendingConsequences.map(consequence => {
            const savedChoice = savedConsequenceChoices[consequence.id];
            const strings = (localData.strings || []).filter(name =>
              !lostStringNames.has(name.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+string$/, "")));
            const choice = savedChoice ?? consequenceChoices[consequence.id] ?? "";
            return (
              <div key={consequence.id} className="border-t border-amber-500/20 pt-3 space-y-2">
                <p className="font-bold">{consequence.name}</p>
                <p className="text-muted-foreground">{consequence.prompt}</p>
                {consequence.choiceType === "string" ? (
                  <select aria-label={`Choose String for ${consequence.name}`} className="w-full bg-background border border-border p-2"
                    value={choice} disabled={!!savedChoice || consequenceBusy === consequence.id}
                    onChange={event => setConsequenceChoices(previous => ({ ...previous, [consequence.id]: event.target.value }))}>
                    <option value="">Choose an attuned String…</option>
                    {strings.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : (
                  <input aria-label={`Enter choice for ${consequence.name}`} className="w-full bg-background border border-border p-2"
                    maxLength={120} value={choice} disabled={!!savedChoice || consequenceBusy === consequence.id}
                    placeholder={consequence.choiceType === "sense" ? "Thread Sense type" : "Target"}
                    onChange={event => setConsequenceChoices(previous => ({ ...previous, [consequence.id]: event.target.value }))} />
                )}
                <button type="button" className="tc-command border-amber-500/50 text-amber-500 disabled:opacity-50"
                  disabled={castInProgress || consequenceBusy === consequence.id || !choice.trim()}
                  onClick={() => void submitConsequenceChoice(consequence)}>
                  {consequenceBusy === consequence.id ? "SAVING CHOICE…" : savedChoice ? "RETRY SAVED CHOICE" : "CONFIRM CHOICE"}
                </button>
                {consequenceError[consequence.id] && <p role="alert" className="text-destructive">{consequenceError[consequence.id]}</p>}
              </div>
            );
          })}
          {consequenceError.storage && <p role="alert" className="text-destructive">{consequenceError.storage}</p>}
        </section>
      )}
      {resolvedConsequences.length > 0 && (
        <section className="mb-4 border border-chart-2/30 bg-chart-2/5 p-4 space-y-2 font-mono text-xs" aria-label="Resolved cast consequences">
          <h2 className="font-bold text-chart-2">Resolved cast outcomes</h2>
          {resolvedConsequences.map(consequence => (
            <div key={consequence.id} className="border-t border-border/40 pt-2">
              <p className="font-bold">{consequence.name}</p>
              <p className="text-muted-foreground">{consequence.prompt}</p>
              {consequence.choice && <p>Confirmed choice: <strong>{consequence.choice}</strong></p>}
            </div>
          ))}
        </section>
      )}
      {permanentInjuries.length > 0 && (
        <section className="mb-4 border border-destructive/30 bg-destructive/5 p-4 space-y-2 font-mono text-xs" aria-label="Permanent injuries">
          <h2 className="font-bold text-destructive">Permanent injuries</h2>
          {permanentInjuries.map(injury => (
            <div key={injury.id} className="border-t border-border/40 pt-2">
              <p className="font-bold">{injury.name} · d6 {injury.die}</p>
              <p className="text-muted-foreground">{injury.description}</p>
              <p>Total Break: maximum damage of 48 VP was applied; the character’s current Vitality reflects the damage.</p>
              {injury.name === "Nerve Damage (Hands)" && <p>Applied: CTR modifier −{nerveDamageCount}; Thread Pool −{nerveDamageCount * 2}; Safe Limit −{nerveDamageCount}.</p>}
              {injury.name === "Reduced Ceiling" && <p>Applied: Thread Pool −{reducedCeilingCount * 4} total.</p>}
              {injury.name === "Lost Thread" && injury.string && <p>Unavailable String: {injury.string}</p>}
              {injury.name === "Leyline Misread" && injury.senseType && (
                <div className="mt-2 space-y-2">
                  <p>Thread Sense checks of type <strong>{injury.senseType}</strong> are affected by Discord.</p>
                  <button type="button" className="tc-command border-destructive/40 text-destructive disabled:opacity-50"
                    disabled={castInProgress || !!threadSenseRolls[injury.senseType]?.busy}
                    onClick={() => void rollAffectedThreadSense(injury.senseType!)}>
                    {threadSenseRolls[injury.senseType]?.busy ? "ROLLING THREAD SENSE…" : `ROLL ${injury.senseType.toUpperCase()} THREAD SENSE`}
                  </button>
                  {threadSenseRolls[injury.senseType]?.error && <p role="alert" className="text-destructive">{threadSenseRolls[injury.senseType]?.error}</p>}
                  {threadSenseRolls[injury.senseType]?.roll && (() => {
                    const roll = threadSenseRolls[injury.senseType!].roll!;
                    return <p aria-live="polite">Confirmed · {roll.title} · {roll.mode} · d20 {roll.d1}{roll.d2 === undefined ? "" : `, d20 ${roll.d2}`} {roll.modifier >= 0 ? "+" : ""}{roll.modifier} = <strong>{roll.total}</strong> · {roll.outcome}</p>;
                  })()}
                </div>
              )}
              {injury.name === "The Shakes" && <p>Applied: Thread Checks roll with Discord.</p>}
            </div>
          ))}
        </section>
      )}
      <fieldset disabled={castInProgress || pendingCastRequests.length > 0 || hasPendingLostThread} aria-busy={castInProgress} className="border-0 p-0 m-0 min-w-0 w-full">
      {hasPendingLostThread && <p className="mb-3 border border-amber-500/40 bg-amber-500/5 p-3 font-mono text-xs text-amber-500">Resolve the Lost Thread choice above before casting.</p>}
      {/* ===== HEADER ===== */}
      <div className="tc-top">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="tc-identity flex-1">
            {/* Avatar */}
            {localData.avatarDataUrl ? (
              <img
                src={localData.avatarDataUrl}
                alt={`${character.name} portrait`}
                className="tc-portrait"
              />
            ) : (
              <div className="tc-portrait tc-monogram" aria-hidden="true">{character.name?.slice(0, 1) || "T"}</div>
            )}
            {/* Name & Identity */}
            <div className="flex-1 min-w-0">
              <div className="tc-eyebrow mb-1">Aethros / Weaver dossier <span className="text-muted-foreground">· LV {level.toString().padStart(2, "0")}</span></div>
              <input
                className="tc-name"
                aria-label="Character name"
                data-testid="input-character-name"
                value={character.name}
                onChange={e => onUpdate({ name: e.target.value })}
              />
              <div className="tc-identity-meta">
                <Badge>{character.affinity || "No Affinity"}</Badge>
                <Badge variant="mode">{localData.primaryMode || character.mode || "No Mode"}</Badge>
                <Badge variant="level">Level {level}</Badge>
                {localData.background && <Badge variant="dim">{localData.background}</Badge>}
                {localData.guild && <Badge variant="dim">{localData.guild}{localData.guildRank ? ` / ${localData.guildRank}` : ""}</Badge>}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="tc-head-actions">
            <button
              onClick={() => { if (!isMendRolling) setShowMendPanel(v => !v); }}
              disabled={isMendRolling}
              className="tc-command tc-command--primary"
              aria-expanded={showMendPanel}
              aria-controls="tc-mend-panel"
              data-testid="button-mend"
            >
              Mend <span aria-hidden="true">↗</span>
            </button>
            <button
              onClick={doLongRest}
              disabled={isMendRolling}
              className="tc-command"
              aria-label="Take a long rest and restore vitality, tension and recovery dice"
              data-testid="button-long-rest"
            >
              Long rest
            </button>
            <button
              onClick={handleExportPDF}
              className="tc-command tc-command--quiet"
              data-testid="button-export-pdf"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="tc-vitals" aria-label="Vital resources">
          <div className="tc-vital-card">
            <div className="tc-card-head">
              <div>
                <GameTerm term="vitality points" className="tc-card-label">01 / Vitality points</GameTerm>
                <div className={cn("tc-card-number mt-2", vpPercent <= 25 && "text-destructive")} data-testid="text-vitality">
                  {vp.current} <small>/ {vp.max || maxVP} VP</small>
                </div>
              </div>
              <div className="tc-stepper">
                <button aria-label="Decrease vitality by one" data-testid="button-vitality-decrease" onClick={() => patchNested("vitalityPoints", "current", Math.max(0, vp.current - 1))}>−</button>
                <button aria-label="Increase vitality by one" data-testid="button-vitality-increase" onClick={() => patchNested("vitalityPoints", "current", Math.min(vp.max || maxVP, vp.current + 1))}>+</button>
              </div>
            </div>
            <div className="tc-meter" role="progressbar" aria-label="Vitality points" aria-valuenow={vp.current} aria-valuemin={0} aria-valuemax={vp.max || maxVP}>
              <div className={cn("tc-meter-fill", vpPercent <= 25 ? "bg-destructive" : vpPercent <= 50 ? "bg-primary" : "bg-chart-2")} style={{ width: `${vpPercent}%` }} />
            </div>
          </div>
          <div className="tc-tension-card">
            <div className="tc-card-head">
              <div>
                <GameTerm term="tension" className="tc-card-label">02 / Thread tension</GameTerm>
                 <div className="tc-card-number mt-2" data-testid="text-tension">{tension.current} <small>/ {threadPool} T</small></div>
              </div>
              <div className="tc-stepper">
                <button aria-label="Release one tension" data-testid="button-tension-decrease" onClick={() => patchNested("tension", "current", Math.max(0, tension.current - 1))}>−</button>
                 <button aria-label="Gain one tension" data-testid="button-tension-increase" onClick={() => patchNested("tension", "current", Math.min(threadPool, tension.current + 1))}>+</button>
              </div>
            </div>
            <div className="tc-tension-details">
               <span>Safe limit <strong>{safeLimit}</strong></span>
               <span>{tension.current > safeLimit ? "OVER SAFE LIMIT" : "WITHIN SAFE LIMIT"}</span>
            </div>
            <button type="button" className="tc-command mt-3" disabled={tension.current === 0 || safeLimit === 0}
              onClick={() => patchNested("tension", "current", Math.max(0, tension.current - safeLimit))}>
              RELEASE TENSION · MINOR ACTION (UP TO {safeLimit}T)
            </button>
            {tension.current > safeLimit && (
              <div className="mt-3 border-t border-border/50 pt-3 font-mono text-[11px]">
                <p className="text-amber-500 mb-2">At the start of each turn above Safe Limit, make a RES Strain Check (DC {strainDC(tension.current, safeLimit)}). A failure triggers Snapback.</p>
                <button type="button" onClick={rollStrainCheck} disabled={strainPending || dicePreferencesLoading} className="tc-command border-amber-500/50 text-amber-500 disabled:opacity-50">{strainPending ? "ROLLING STRAIN…" : "START TURN · ROLL STRAIN"}</button>
              </div>
            )}
            {strainMessage && <p role="status" className="mt-2 text-[11px] text-amber-500 font-mono">{strainMessage}</p>}
            {strainResult && <CastAftermathDisplay result={{ ...strainResult.aftermath, saveConfirmed: true, damageSaved: true }} />}
          </div>
        </div>

        {/* Mend Panel */}
        {showMendPanel && (
          <div id="tc-mend-panel" className="tc-mend font-mono text-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-chart-2 uppercase text-xs tracking-widest">Mend — Spend Recovery Dice</span>
              <span className="text-muted-foreground text-xs">{recoveryDiceCurrent}/{maxRecoveryDice} dice remaining</span>
            </div>
            {dicePreferencesLoading && <p className="mb-2 text-[10px] text-muted-foreground" role="status">Loading dice preferences… Mend is unavailable until your die selection loads.</p>}
            {mendError && <p role="alert" className="mb-2 text-xs text-destructive">Mend not saved: {mendError}</p>}
            {dicePreferenceError && <p className="mb-2 text-[10px] text-amber-500" role="status">Dice preference unavailable; the house die is being used.</p>}
            {mendRoll && (
              <div className="mb-3" aria-live="polite">
                <DiceStage dice={[{ sides: 6, value: mendRoll.d1 }, { sides: 6, value: mendRoll.d2 }]} style={diceStyle} phase={mendRoll.rolling ? "rolling" : "settled"} rollKey={mendRoll.rollKey} height={150} />
                <p className="mt-2 text-xs text-foreground">
                  Mend roll: d6 {mendRoll.d1} + d6 {mendRoll.d2} = {mendRoll.d1 + mendRoll.d2}; {mendRoll.diceUsed} × {mendRoll.d1 + mendRoll.d2} = {mendRoll.diceRoll}; healed {mendRoll.healed} VP.
                  {mendRoll.rolling ? " Rolling…" : ""}
                </p>
              </div>
            )}
            <div className="tc-mend-dice">
              <span className="text-muted-foreground text-xs">Dice to spend:</span>
              {Array.from({ length: recoveryDiceCurrent }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setRecoveryDiceUsed(i + 1)}
                  disabled={isMendRolling || dicePreferencesLoading}
                  aria-label={`Spend ${i + 1} recovery ${i === 0 ? "die" : "dice"}`}
                  aria-pressed={recoveryDiceUsed === i + 1}
                  className={cn(
                    "text-xs font-bold transition-colors",
                    recoveryDiceUsed > i ? "border-chart-2 bg-chart-2/20 text-chart-2" : "border-border text-muted-foreground"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              {recoveryDiceCurrent === 0 && <span className="text-muted-foreground text-xs">No dice remaining. Long Rest to recover.</span>}
            </div>
            {recoveryDiceUsed > 0 && (
              <button onClick={doMend} disabled={mendRollLock.current || isMendRolling || dicePreferencesLoading} className="tc-command mt-4 border-chart-2/50 text-chart-2 hover:bg-chart-2/20 disabled:cursor-not-allowed disabled:opacity-50">
                SPEND {recoveryDiceUsed} RECOVERY {recoveryDiceUsed === 1 ? "DIE" : "DICE"} → MEND
              </button>
            )}
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="tc-readouts font-mono text-xs">
          <QuickStat label={<GameTerm term="guard rating">GUARD</GameTerm>} value={localData.guardRating ?? guardRating} />
          <QuickStat label={<GameTerm term="ward rating">WARD</GameTerm>} value={wardRating} />
          <QuickStat label={<GameTerm term="refinement bonus">RB</GameTerm>} value={`+${rb}`} highlight />
          <QuickStat label="RECOVERY DICE" value={`${recoveryDiceCurrent}/${maxRecoveryDice}`} />
          <QuickStat label={<GameTerm term="corruption">CORRUPTION</GameTerm>} value={`${corruption}/10`} warning={corruption >= 6} />
          <QuickStat label={<GameTerm term="fatigue">FATIGUE</GameTerm>} value={`${fatigue}/5`} warning={fatigue >= 3} />
        </div>
      </div>

      {/* ===== TABS ===== */}
      <Tabs defaultValue="overview" className="w-full tc-workspace">
        <TabsList className="tc-tabs h-auto">
          {["overview","actions","skills","strings","feats","inventory","background","notes"].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="tc-tab"
            >
              {tab === "feats" && featSlotsRemaining > 0
                ? <span className="flex items-center gap-1">{tab} <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">{featSlotsRemaining}</span></span>
                : tab
              }
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ===== OVERVIEW ===== */}
        <TabsContent value="overview" className="tc-panel m-0">
          <div className="tc-overview-grid">
            {/* Attributes column */}
            <div className="tc-surface">
              <h3 className="tc-section-title">Attributes <small>Tap modifier to roll</small></h3>
              <div className="tc-attribute-grid">
                {ATTRIBUTE_DEFS.map(attr => {
                  const baseScore = baseAttrs[attr.key] || 10;
                  const bonus = asiAttrBonuses[attr.key] || 0;
                  const score = attrs[attr.key] || 10;
                  const mod = calcMod(score) - (attr.key === "ctr" ? nerveDamageCount : 0);
                  return (
                    <div key={attr.key} className="tc-attribute" data-testid={`card-attribute-${attr.key}`}>
                      <GameTerm term={attr.key} className="tc-card-label">{attr.abbr}</GameTerm>
                      <div className="text-[10px] text-muted-foreground truncate">{attr.label}</div>
                      <div className="tc-attribute-top mt-2">
                        <input
                          type="number"
                          aria-label={`${attr.label} base score`}
                          data-testid={`input-attribute-${attr.key}`}
                          value={baseScore}
                          min={1} max={20}
                          onChange={e => {
                            const v = parseInt(e.target.value) || 10;
                            patch({ attributes: { ...baseAttrs, [attr.key]: v } });
                          }}
                        />
                        <button
                          className="tc-roll"
                          aria-label={`Roll ${attr.label} check with ${fmtMod(mod)} modifier`}
                          data-testid={`button-roll-attribute-${attr.key}`}
                          onClick={() => openRoll(`${attr.label} Check`, mod, character.name, character.id)}
                        >{fmtMod(mod)}</button>
                      </div>
                      {(score !== baseScore) && <div className="text-[10px] font-mono text-chart-2 mt-1" title="Total includes feat and guild bonuses">Total {score}{bonus > 0 ? ` · feat +${bonus}` : ""}</div>}
                    </div>
                  );
                })}
              </div>

              <div className="tc-defense-grid">
                {[
                  { key: "guardRating", label: "Guard Rating", computed: guardRating, term: "guard rating" },
                  { key: "wardRating", label: "Ward Rating", computed: wardRating, term: "ward rating" },
                ].map(stat => (
                  <div key={stat.key} className="tc-defense">
                    <GameTerm term={stat.term} className="tc-card-label block mb-1">{stat.label}</GameTerm>
                    <input
                      type="number"
                      aria-label={`${stat.label} override`}
                      className="w-full"
                      value={(localData as any)[stat.key] ?? stat.computed}
                      onChange={e => patch({ [stat.key]: parseInt(e.target.value) || stat.computed } as any)}
                    />
                    <div className="text-[10px] text-muted-foreground font-mono">Calculated {stat.computed}</div>
                  </div>
                ))}
              </div>

              <div className="tc-condition">
                <div className="tc-card-label mb-4">Conditions / long-term strain</div>
                {(localData.castingConditions || []).map(condition => (
                  <div key={condition} className="flex items-center justify-between gap-2 mb-2 text-xs font-mono">
                    <span className="text-amber-500">{condition}</span>
                    <button type="button" className="text-muted-foreground underline hover:text-foreground" aria-label={`Clear ${condition}`} onClick={() => patch({ castingConditions: (localData.castingConditions || []).filter(c => c !== condition) })}>Clear when resolved</button>
                  </div>
                ))}
                <TrackerRow
                  label={<GameTerm term="corruption">Corruption</GameTerm>}
                  value={corruption} max={10}
                  color={corruption >= 6 ? "bg-destructive" : "bg-chart-2"}
                  onDec={() => patch({ corruption: Math.max(0, corruption - 1) })}
                  onInc={() => patch({ corruption: Math.min(10, corruption + 1) })}
                />
                <TrackerRow
                  label={<GameTerm term="fatigue">Fatigue</GameTerm>}
                  value={fatigue} max={5}
                  color={fatigue >= 3 ? "bg-destructive" : "bg-primary"}
                  onDec={() => patch({ fatigue: Math.max(0, fatigue - 1) })}
                  onInc={() => patch({ fatigue: Math.min(5, fatigue + 1) })}
                />
              </div>
            </div>

            {/* Tension + Burnout column */}
            <div className="tc-surface">
              <h3 className="tc-section-title">The thread <small>Tension & burnout</small></h3>
              <div className="tc-gauge-surface">
              <TensionGauge
                current={tension.current}
                max={threadPool}
                safeLimit={safeLimit}
                onSpend={() => patchNested("tension", "current", Math.min(threadPool, tension.current + 1))}
                onRelease={() => patchNested("tension", "current", Math.max(0, tension.current - 1))}
              />
              <div className="w-full">
                <div className="tc-card-label mb-3">Burnout / {burnout} of 6</div>
                <BurnoutTrack level={burnout} />
                <div className="flex gap-2 mt-4">
                  <button className="tc-command flex-1" aria-label="Decrease burnout by one" data-testid="button-burnout-decrease" onClick={() => patch({ burnout: Math.max(0, burnout - 1) })}>− Burnout</button>
                  <button className="tc-command flex-1 border-destructive/40 text-destructive" aria-label="Increase burnout by one" data-testid="button-burnout-increase" onClick={() => patch({ burnout: Math.min(6, burnout + 1) })}>+ Burnout</button>
                </div>
                <div className="tc-burnout-list">
                  {BURNOUT_LEVELS.map(bl => (
                    <div key={bl.level} data-current={bl.level === burnout}>
                      <span className={cn("font-bold", bl.level === burnout ? "text-destructive" : "text-muted-foreground")}>
                        {bl.level}: {bl.label}
                      </span>
                      <span className="text-muted-foreground">{bl.penalty}</span>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== ACTIONS ===== */}
        <TabsContent value="actions" className="tc-panel m-0 space-y-7">
          <div><div className="tc-eyebrow">Combat / quick rolls</div><h2 className="tc-section-title mt-1">Actions <small>Ready at the table</small></h2></div>
          <div>
            <h3 className="tc-card-label mb-3">Start of combat</h3>
            <div className="tc-action">
              <div className="tc-action-main">
                <div className="tc-action-name">Initiative</div>
                <p className="tc-action-sub">Roll Acuity to determine who acts first.</p>
              </div>
              <div className="tc-action-buttons">
                <button
                  className="tc-roll"
                  aria-label="Roll initiative with Acuity"
                  data-testid="button-roll-initiative"
                  onClick={() => openRoll("Initiative (Acuity)", calcMod(attrs.acu || 10), character.name, character.id)}
                >ACU {fmtMod(calcMod(attrs.acu || 10))} · Roll</button>
              </div>
            </div>
          </div>
          {/* Unarmed Strike — always present */}
          <div>
            <h3 className="tc-card-label mb-3">Basic attacks</h3>
            <div className="tc-action">
              <div className="tc-action-main">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="tc-action-name">Unarmed Strike</span>
                  <span className="text-[10px] font-mono text-muted-foreground border border-border/40 px-1.5 py-0.5">Melee</span>
                  <span className="text-[10px] font-mono text-muted-foreground">RES</span>
                </div>
                <p className="tc-action-sub">
                  1 + RES mod (min 1) bludgeoning · May follow up for free after hitting with another attack
                </p>
              </div>
              <div className="tc-action-buttons">
                <button
                  className="tc-roll"
                  aria-label="Roll unarmed strike attack"
                  data-testid="button-roll-unarmed-attack"
                  onClick={() => openRoll("Unarmed Strike — Attack", calcMod(attrs.res || 10), character.name, character.id)}
                >ATK {fmtMod(calcMod(attrs.res || 10))}</button>
                <button
                  className="tc-roll"
                  aria-label="Roll unarmed strike damage"
                  data-testid="button-roll-unarmed-damage"
                  onClick={() => openRoll("Unarmed Strike — Damage", calcMod(attrs.res || 10), character.name, character.id, { diceSides: 0, diceCount: 0 })}
                >1{fmtMod(Math.max(1, calcMod(attrs.res || 10)))} blunt</button>
              </div>
            </div>
          </div>

          {/* Equipped Weapons */}
          {equippedWeapons.length > 0 && (
            <div>
              <h3 className="tc-card-label mb-3">Equipped weapons / {equippedWeapons.length}</h3>
              <div className="tc-action-list">
                {equippedWeapons.map(item => {
                  const bonus = ITEM_BONUS[item.id];
                  const atkKey = bonus?.attackAttr || "res";
                  const atkMod = calcMod((attrs as Record<string, number>)[atkKey] || 10);
                  return (
                    <div key={item.id} className="tc-action">
                      <div className="tc-action-main">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="tc-action-name">{item.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground border border-border/40 px-1.5 py-0.5">{bonus?.range || "Melee"}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{atkKey.toUpperCase()}</span>
                          {bonus?.twoHanded && <span className="text-[10px] font-mono text-primary/50 border border-primary/20 px-1">2H</span>}
                          {bonus?.damageType && <span className="text-[10px] font-mono text-muted-foreground/50">{bonus.damageType}</span>}
                        </div>
                        {item.mechanical && <p className="tc-action-sub">{item.mechanical}</p>}
                      </div>
                      <div className="tc-action-buttons">
                        <button
                          className="tc-roll"
                          aria-label={`Roll ${item.name} attack`}
                          onClick={() => openRoll(`${item.name} — Attack`, atkMod, character.name, character.id)}
                        >ATK {fmtMod(atkMod)}</button>
                        <button
                          className="tc-roll"
                          aria-label={`Roll ${item.name} damage`}
                          onClick={() => {
                            const base = /^([12])d(4|6|8|10|12)$/.exec(bonus?.damageDice ?? "1d6");
                            const extra = /^\+([12])d(4|6|8|10|12)/.exec(bonus?.damageBonusDice ?? "");
                            openRoll(`${item.name} — Damage`, atkMod, character.name, character.id, {
                              diceSides: Number(base?.[2] ?? 6) as 4 | 6 | 8 | 10 | 12,
                              diceCount: Number(base?.[1] ?? 1) as 1 | 2,
                              ...(extra ? { bonusDiceSides: Number(extra[2]) as 4 | 6 | 8 | 10 | 12,
                                bonusDiceCount: Number(extra[1]) as 1 | 2 } : {}),
                            });
                          }}
                        >{bonus?.damageDice || "1d6"}{fmtMod(atkMod)}{bonus?.damageBonusDice ? ` ${bonus.damageBonusDice}` : ""}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-Rest Combat Abilities */}
          {activeCombatFeats.length > 0 && (
            <div>
              <h3 className="tc-card-label mb-3">Combat abilities</h3>
              <div className="tc-action-list">
                {activeCombatFeats.map(feat => {
                  const avail = isFeatAvailable(feat.name);
                  return (
                    <div key={feat.name} className={cn("tc-action transition-opacity", !avail && "opacity-60")}>
                      <div className="tc-action-main">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="tc-action-name">{feat.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground border border-border/40 px-1.5 py-0.5">
                            {feat.restType === "mend" ? "1/MEND" : feat.restType === "long" ? "1/LONG REST" : "1/COMBAT"}
                          </span>
                        </div>
                        <p className="tc-action-sub">{feat.mechanical}</p>
                      </div>
                      <div className="tc-action-buttons">
                        {avail ? (
                          <button
                            className="tc-command"
                            aria-label={`Use ${feat.name}`}
                            onClick={() => useFeat(feat.name)}
                          >USE</button>
                        ) : (
                          <span className="px-2.5 py-1.5 text-xs font-mono text-muted-foreground/40 border border-border/20">USED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {equippedWeapons.length === 0 && activeCombatFeats.length === 0 && (
            <p className="tc-surface text-center font-mono text-sm text-muted-foreground py-8">
              Equip weapons in the Inventory tab · Per-rest feats appear once selected in the Feats tab
            </p>
          )}
        </TabsContent>

        {/* ===== SKILLS ===== */}
        <TabsContent value="skills" className="tc-panel m-0">
          <div className="tc-eyebrow">Aptitudes / checks</div>
          <h2 className="tc-section-title mt-1">Skills <small>Tap result to roll</small></h2>
          <div className="mb-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span><GameTerm term="refinement bonus">Refinement Bonus</GameTerm>: <strong className="text-primary">+{rb}</strong></span>
            <span>Attuned: {attunedSkills.length}/{ALL_SKILLS.length}</span>
          </div>
          <div className="tc-skills-wrap tc-surface !p-0">
          <table className="tc-skills-table">
            <thead>
              <tr className="text-muted-foreground/50 border-b border-border text-xs">
                <th className="pb-2 font-normal">Skill</th>
                <th className="pb-2 font-normal text-center w-12">Attr</th>
                <th className="pb-2 font-normal text-center w-16">Attuned</th>
                <th className="pb-2 font-normal text-center w-20">Modifier</th>
                <th className="pb-2 font-normal text-center w-16">Roll</th>
              </tr>
            </thead>
            <tbody>
              {ALL_SKILLS.map(skill => {
                const attrScore = attrs[skill.attr] || 10;
                const mod = calcMod(attrScore) - (skill.attr === "ctr" ? nerveDamageCount : 0);
                const isAttuned = attunedSkills.includes(skill.name);
                const isFeatAttuned = attunementFeatSkills.includes(skill.name);
                const isExpert = expertiseSkills.includes(skill.name);
                const totalRb = isAttuned ? (isExpert ? rb * 2 : rb) : 0;
                const total = mod + totalRb;
                return (
                  <tr key={skill.name} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-2.5">
                      <GameTerm term={skill.name.toLowerCase()} className="text-foreground">{skill.name}</GameTerm>
                      {isFeatAttuned && <span className="text-[9px] font-mono text-primary/60 ml-1">feat</span>}
                    </td>
                    <td className="py-2.5 text-center">
                      <GameTerm term={skill.attr} className="text-muted-foreground text-xs">{skill.attr.toUpperCase()}</GameTerm>
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        className={cn("tc-attune",
                          isAttuned ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40")}
                        aria-label={`${isAttuned ? "Remove" : "Add"} attunement for ${skill.name}${isFeatAttuned ? " (granted by feat)" : ""}`}
                        aria-pressed={isAttuned}
                        disabled={isFeatAttuned}
                        onClick={() => {
                          if (isFeatAttuned) return;
                          const next = isAttuned ? attunedSkillsBase.filter(s => s !== skill.name) : [...attunedSkillsBase, skill.name];
                          patch({ attunedSkills: next });
                        }}
                        title={isFeatAttuned ? "Attuned via feat" : undefined}
                      >
                        {isAttuned ? (isExpert ? "E" : "A") : "—"}
                      </button>
                    </td>
                    <td className="py-2.5 text-center text-muted-foreground">
                      {fmtMod(mod)}{isAttuned ? <span className="text-primary"> +{totalRb}{isExpert ? <span className="text-chart-2 text-[9px]"> ×2</span> : null}</span> : null}
                      {" "}= <strong className={isAttuned ? "text-primary" : ""}>{fmtMod(total)}</strong>
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        className="tc-roll"
                        aria-label={`Roll ${skill.name} check with ${fmtMod(total)} modifier`}
                        onClick={() => openRoll(`${skill.name} Check`, total, character.name, character.id)}
                      >
                        {fmtMod(total)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </TabsContent>

        {/* ===== STRINGS ===== */}
        {/* Keep pending casts mounted while switching tabs so the spent Tension's result remains visible. */}
        <TabsContent value="strings" forceMount className="tc-panel m-0 space-y-5">
          <div className="tc-eyebrow">Casting / threadwork</div>
          <h2 className="tc-section-title mt-1">Strings <small>{(localData.strings || []).length} attuned</small></h2>
          <p className="text-xs text-muted-foreground leading-relaxed border border-border/30 bg-muted/10 p-3">
            Your String is a part of your Affinity, not a fixed spell. The PL table shows examples of scale.
            Choose a String, Power Level, and Mode, then describe what you want to achieve and roll.
            Safe maximum: PL {safePowerLevel}. Higher PL casts roll at Discord.
          </p>
          {(localData.strings || []).length === 0 && (
            <div className="py-8 text-center font-mono text-muted-foreground text-sm">No Strings attuned. Add them via character editing.</div>
          )}
          {/* Mode legend */}
          {(localData.strings || []).length > 0 && (
            <div className="flex flex-wrap gap-2 font-mono text-[10px] pb-2 border-b border-border/30">
              {primaryMode && <span className="px-2 py-0.5 border border-chart-2/40 text-chart-2"><span className="opacity-60">Primary:</span> {primaryMode} → HARMONY</span>}
              {secondaryModes.map(m => <span key={m} className="px-2 py-0.5 border border-border text-muted-foreground"><span className="opacity-60">Secondary:</span> {m} → NORMAL</span>)}
              {tertiaryModes.map(m => <span key={m} className="px-2 py-0.5 border border-border text-muted-foreground"><span className="opacity-60">Tertiary:</span> {m} → NORMAL</span>)}
            </div>
          )}
          <div className="tc-string-list">{(localData.strings || []).map((sName, i) => {
            const strData = findString(sName);
            const str = strData ?? {
              name: sName,
              flavor: "Custom String — use your Affinity and this String's scope to describe an effect. Core PL values are the starting point.",
              checkAttr: "ctr" as const,
              mishap: "Roll on the core Mishap Table.",
              snapback: "Roll on the core Snapback Table.",
              levels: CORE_POWER_LEVELS,
            };
            const checkAttrKey = str.checkAttr;
            const attrScore = attrs[checkAttrKey] || 10;
            return (
              <CastStringPanel
                key={`${character.id}-${i}`}
                str={str}
                attrScore={attrScore}
                characterName={character.name}
                characterId={character.id}
                availableTension={availableTension}
                castingConditions={castingConditionsWithInjuries}
                ctrModifierPenalty={checkAttrKey === "ctr" ? nerveDamageCount : 0}
                lostThread={lostStringNames.has(sName.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+string$/, ""))}
                burnout={burnout}
                onBeginCast={beginCastRequest}
                onCast={finishCast}
                primaryMode={primaryMode}
                secondaryModes={secondaryModes}
                tertiaryModes={tertiaryModes}
                level={level}
                safePowerLevel={safePowerLevel}
                custom={!strData}
              />
            );
          })}</div>
          {/* Add String */}
          <div className="tc-string-tools">
            <p className="text-xs font-mono text-muted-foreground mb-2">Add a String name:</p>
            <div className="flex gap-2">
              <input
                id="add-string-input"
                aria-label="String name to add"
                className="flex-1 min-w-0 bg-background border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. Flow String"
              />
              <button
                className="tc-command"
                aria-label="Add String"
                onClick={() => {
                  const el = document.getElementById("add-string-input") as HTMLInputElement;
                  if (el.value.trim()) {
                    patch({ strings: [...(localData.strings || []), el.value.trim()] });
                    el.value = "";
                  }
                }}
              >
                + ADD
              </button>
            </div>
          </div>

          {/* ===== WEAVING COMBINATIONS ===== */}
          <div className="border-t border-border/40 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Weaving Combinations</h4>
              <button
                onClick={() => {
                  const newWeave: WeavingEntry = {
                    id: Math.random().toString(36).slice(2),
                    numStrings: 2,
                    strings: [],
                    powerLevels: [1, 1],
                    modes: [],
                  };
                  patch({ weavings: [...(localData.weavings || []), newWeave] });
                }}
                className="tc-command"
                aria-label="Add weaving combination"
              >
                + ADD WEAVE
              </button>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground/60 border border-border/20 p-2 space-y-0.5">
              <div>2 STRINGS — {feats.includes("Precision Weave") ? "Harmony" : "Normal"} Thread Check · Enhanced effect · ×1 Tension cost</div>
              <div>3 STRINGS — Discord Thread Check · Dramatic effect · ×2 Tension cost</div>
              <div>4 STRINGS (Lv7+) — Discord Thread Check · Catastrophic potential · ×3 Tension cost</div>
              <div>Each String has its own PL and Mode. Describe the effect they create together; listed effects are examples, not limits.</div>
            </div>
            {(localData.weavings || []).length === 0 && (
              <p className="text-xs font-mono text-muted-foreground/50 text-center py-2">No weaving combinations saved. Add one above.</p>
            )}
            {(localData.weavings || []).map((weave, wi) => (
              <WeaveCastRow
                key={`${character.id}-${weave.id}`}
                weave={weave}
                characterId={character.id}
                wi={wi}
                maxStrings={level >= 7 ? 4 : 3}
                localData={localData}
                patch={patch}
                safePowerLevel={safePowerLevel}
                ctrScore={attrs.ctr || 10}
                ctrModifierPenalty={nerveDamageCount}
                availableTension={availableTension}
                castingConditions={castingConditionsWithInjuries}
                lostStrings={[...lostStringNames]}
                burnout={burnout}
                hasPrecisionWeave={feats.includes("Precision Weave")}
                precisionWeaveChargeAvailable={isFeatAvailable("Precision Weave")}
                onBeginCast={beginCastRequest}
                onCast={finishCast}
              />
            ))}
          </div>
          <div className="border border-border/40 p-4 space-y-2">
            <h4 className="font-mono text-xs uppercase tracking-widest text-primary">Collaborative casting & weaving</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Lead declares one shared effect and its Power Level, directs the Weave, and makes the Thread Checks.
              A supporter contributes their own String and Mode and spends Tension from
              their own sheet. Supporting mages roll CTR vs DC 12 each round they contribute. On failure,
              the Lead immediately makes a Strain Check vs DC 15. Each participant uses their own sheet;
              contributions and the Lead's Strain Check are recorded separately.
            </p>
            {!supporting ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <label htmlFor="support-tension">Tension to contribute</label>
                <input id="support-tension" type="number" min={1} max={Math.max(1, availableTension)} value={supportTension}
                  onChange={e => setSupportTension(Number(e.target.value))}
                  className="w-16 bg-background border border-border px-2 py-1" />
                <button className="tc-command disabled:opacity-50" onClick={beginSupport}
                  disabled={dicePreferencesLoading || !Number.isInteger(supportTension) || supportTension < 1 || supportTension > availableTension}>CONTRIBUTE & CHECK CTR</button>
                {supportTension > availableTension && <span className="text-amber-500">Contribution exceeds available pool room. Reduce it or cast from your own sheet to resolve automatic Snapback.</span>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-primary">Supporting · Tension spent on your sheet</span>
                <button className="tc-command" onClick={rollSupportCheck} disabled={dicePreferencesLoading}>NEXT ROUND: CTR CHECK</button>
                <button className="px-2 py-1 border border-border" onClick={() => { setSupporting(false); setSupportCheck(null); }}>END SUPPORT</button>
              </div>
            )}
            {supporting && supportCheck && <p className={cn("font-mono text-xs", supportCheck.total < 12 ? "text-destructive" : "text-chart-2")}>
              CTR: {supportCheck.mode === "DISCORD" ? `Discord d20 ${supportCheck.d1}, d20 ${supportCheck.d2}` : `d20 ${supportCheck.d1}`} {fmtMod(calcMod(attrs.ctr || 10) - nerveDamageCount)} = {supportCheck.total} vs DC 12 —
              {supportCheck.total >= 12 ? " connection maintained." : " failed! Tell the Lead to make a Strain Check vs DC 15 immediately."}
            </p>}
            {supportError && <p role="alert" className="text-xs text-destructive">Support check not saved: {supportError}</p>}
          </div>
        </TabsContent>

        {/* ===== FEATS ===== */}
        <TabsContent value="feats" className="tc-panel m-0">
          {/* Guild Rank Benefits */}
          {guildRankData && (
            <div className="mb-5 border border-chart-2/30 bg-chart-2/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-[family-name:'Cinzel',serif] text-sm text-chart-2">{localData.guildRank}</span>
                  <span className="text-muted-foreground/60 font-mono text-[10px] ml-2">— {localData.guild}</span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-chart-2/60 border border-chart-2/30 px-2 py-0.5">GUILD RANK</span>
              </div>
              {/* Stat bonuses */}
              {Object.keys(guildStatBonuses).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground mr-1">Stat bonuses:</span>
                  {(Object.entries(guildStatBonuses) as [string, number][]).map(([k, v]) => (
                    <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 border border-chart-2/40 text-chart-2">+{v} {k.toUpperCase()}</span>
                  ))}
                </div>
              )}
              {/* Attunements */}
              {guildRankData.attunements.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground mr-1">Attunements:</span>
                  {guildRankData.attunements.map(s => (
                    <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 border border-primary/40 text-primary">{s}</span>
                  ))}
                </div>
              )}
              {/* Feat choice */}
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Guild Rank Feat — choose one:</p>
                <div className="grid grid-cols-2 gap-2">
                  {guildRankData.featChoices.map(featName => {
                    const def = FEATS.find(f => f.name === featName);
                    const chosen = localData.guildFeatChoice === featName;
                    return (
                      <button
                        key={featName}
                        onClick={() => patch({ guildFeatChoice: featName })}
                        className={cn("text-left p-3 border transition-colors",
                          chosen ? "border-chart-2 bg-chart-2/10" : "border-border hover:border-chart-2/50 bg-background"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-semibold text-foreground">{featName}</span>
                          {chosen && <span className="text-[9px] font-mono text-chart-2 border border-chart-2/50 px-1.5 py-0.5">CHOSEN</span>}
                        </div>
                        {def && <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{def.mechanical}</p>}
                      </button>
                    );
                  })}
                </div>
                {localData.guildFeatChoice && guildFeatDef && (
                  <div className="mt-2 p-2 border border-chart-2/20 bg-chart-2/5">
                    <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{guildFeatDef.desc}</p>
                    {guildFeatDef.passiveBonus && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {guildFeatDef.passiveBonus.vpMax      && <span className="text-[10px] font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">+{guildFeatDef.passiveBonus.vpMax} VP Max</span>}
                        {guildFeatDef.passiveBonus.threadPool && <span className="text-[10px] font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">+{guildFeatDef.passiveBonus.threadPool} Thread Pool</span>}
                        {guildFeatDef.passiveBonus.safeLimit  && <span className="text-[10px] font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">+{guildFeatDef.passiveBonus.safeLimit} Safe Limit</span>}
                        {guildFeatDef.passiveBonus.wardRating && <span className="text-[10px] font-mono text-chart-2 border border-chart-2/30 px-1.5 py-0.5">+{guildFeatDef.passiveBonus.wardRating} Ward Rating</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-xs text-muted-foreground">
              <GameTerm term="refinement bonus">Refinement Bonus</GameTerm> +{rb} · Level {level} · Feat slots: {featSlots} · Used: {feats.length}
            </div>
            {featSlotsRemaining > 0 && (
              <button
                onClick={() => setShowFeatPicker(v => !v)}
                className="px-3 py-1.5 text-xs font-mono border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
              >
                {showFeatPicker ? "CANCEL" : `+ CHOOSE FEAT (${featSlotsRemaining} remaining)`}
              </button>
            )}
          </div>

          {showFeatPicker && (
            <div className="mb-6 border border-primary/20 bg-primary/5 p-4 space-y-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-mono text-primary mb-3">Select a feat (available at your level with prerequisites met):</p>
              {["utility", "combat", "defense", "magic"].map(cat => {
                const catFeats = availableFeats.filter(f => f.category === cat);
                if (!catFeats.length) return null;
                return (
                  <div key={cat} className="mb-3">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">{cat}</p>
                    <div className="space-y-1">
                      {catFeats.map(feat => (
                        <button
                          key={feat.name}
                          onClick={() => addFeat(feat.name)}
                          className="w-full text-left p-3 border border-border hover:border-primary/50 bg-background transition-colors"
                        >
                          <div className="flex justify-between items-baseline">
                            <span className="font-mono text-sm text-foreground">{feat.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground ml-2">Lv{feat.minLevel}{feat.prerequisites !== "None" && feat.prerequisites !== "Even level" ? ` · ${feat.prerequisites}` : ""}</span>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mt-1 leading-relaxed">{feat.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {activeFeatEntries.length === 0 && !showFeatPicker && (
              <div className="py-8 text-center font-mono text-muted-foreground text-sm">
                {featSlots === 0 ? "Reach Level 2 to choose your first feat." : "No feats selected yet."}
              </div>
            )}
            {activeFeatEntries.map(({ def, name, idx }) => {
              const choice = (localData.featChoices as Record<string, any> || {})[String(idx)];
              return (
                <div key={idx} className="border border-border p-4 bg-card group relative">
                  <button
                    onClick={() => removeFeatByIdx(idx)}
                    className="absolute top-3 right-3 text-muted-foreground/40 hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    × Remove
                  </button>
                  {def ? (
                    <>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-[family-name:'Cinzel',serif] text-foreground">{def.name}</span>
                        <span className={cn("text-[10px] font-mono px-1.5 py-0.5",
                          def.category === "combat" ? "bg-destructive/20 text-destructive" :
                          def.category === "defense" ? "bg-chart-2/20 text-chart-2" :
                          def.category === "magic" ? "bg-primary/20 text-primary" :
                          "bg-muted text-muted-foreground"
                        )}>{def.category}</span>
                        {def.usesPerRest && (
                          <button
                            className={cn("text-[10px] font-mono px-2 py-0.5 border transition-colors",
                              isFeatAvailable(def.name)
                                ? "border-primary/50 text-primary hover:bg-primary/10"
                                : "border-border/30 text-muted-foreground/40 cursor-default"
                            )}
                            onClick={() => isFeatAvailable(def.name) && useFeat(def.name)}
                          >
                            {isFeatAvailable(def.name) ? "✓ " : "× "}
                            {def.restType === "mend" ? "1/MEND" : def.restType === "long" ? "1/LONG REST" : "1/COMBAT"}
                          </button>
                        )}
                        {def.passiveBonus && (
                          <span className="text-[10px] font-mono text-chart-2/80 px-1.5 py-0.5 border border-chart-2/30 bg-chart-2/5">
                            PASSIVE: {[
                              def.passiveBonus.vpMax      ? `+${def.passiveBonus.vpMax} VP Max`       : null,
                              def.passiveBonus.wardRating ? `+${def.passiveBonus.wardRating} Ward`     : null,
                              def.passiveBonus.threadPool ? `+${def.passiveBonus.threadPool} TP Max`   : null,
                              def.passiveBonus.safeLimit  ? `+${def.passiveBonus.safeLimit} Safe Lmt`  : null,
                              def.passiveBonus.guardRating? `+${def.passiveBonus.guardRating} Guard`   : null,
                            ].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-2">{def.desc}</p>
                      <p className="text-xs font-mono text-primary/70 bg-primary/5 border border-primary/10 px-2 py-1">{def.mechanical}</p>

                      {/* ASI inline choice */}
                      {def.name === "Attribute Score Improvement" && (
                        <div className="mt-3 p-3 border border-primary/20 bg-primary/5 space-y-2">
                          <p className="text-[10px] font-mono text-primary uppercase tracking-wider">Assign Improvement</p>
                          <div className="flex gap-2">
                            {(["one","two"] as const).map(m => (
                              <button
                                key={m}
                                className={cn("px-3 py-1 border text-xs font-mono transition-colors",
                                  (choice?.mode || "one") === m
                                    ? "border-primary bg-primary/20 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                )}
                                onClick={() => saveFeatChoice(idx, { mode: m, attrs: [] })}
                              >
                                {m === "one" ? "+2 to ONE attr" : "+1 to TWO attrs"}
                              </button>
                            ))}
                          </div>
                          {(choice?.mode || "one") === "one" ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground">+2 to:</span>
                              <select
                                className="bg-background border border-border text-xs font-mono px-2 py-1 focus:outline-none focus:border-primary"
                                value={choice?.attrs?.[0] || ""}
                                onChange={e => saveFeatChoice(idx, { mode: "one", attrs: [e.target.value] })}
                              >
                                <option value="">— choose —</option>
                                {ATTRIBUTE_DEFS.map(a => <option key={a.key} value={a.key}>{a.abbr} — {a.label}</option>)}
                              </select>
                              {choice?.attrs?.[0] && (
                                <span className="text-xs font-mono text-chart-2">
                                  {ATTRIBUTE_DEFS.find(a => a.key === choice.attrs[0])?.abbr}: {baseAttrs[choice.attrs[0]] || 10} → {(baseAttrs[choice.attrs[0]] || 10) + 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {[0, 1].map(slot => (
                                <div key={slot} className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground w-10">+1 to:</span>
                                  <select
                                    className="bg-background border border-border text-xs font-mono px-2 py-1 focus:outline-none focus:border-primary"
                                    value={choice?.attrs?.[slot] || ""}
                                    onChange={e => {
                                      const newAttrs = [...(choice?.attrs || ["", ""])];
                                      newAttrs[slot] = e.target.value;
                                      saveFeatChoice(idx, { mode: "two", attrs: newAttrs });
                                    }}
                                  >
                                    <option value="">— choose —</option>
                                    {ATTRIBUTE_DEFS
                                      .filter(a => !choice?.attrs?.[(slot === 0 ? 1 : 0)] || a.key !== choice.attrs[slot === 0 ? 1 : 0])
                                      .map(a => <option key={a.key} value={a.key}>{a.abbr} — {a.label}</option>)
                                    }
                                  </select>
                                  {choice?.attrs?.[slot] && (
                                    <span className="text-xs font-mono text-chart-2">
                                      {ATTRIBUTE_DEFS.find(a => a.key === choice.attrs[slot])?.abbr}: {baseAttrs[choice.attrs[slot]] || 10} → {(baseAttrs[choice.attrs[slot]] || 10) + 1}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attunement (Skilled) inline choice */}
                      {def.name === "Attunement (Skilled)" && (
                        <div className="mt-3 p-3 border border-primary/20 bg-primary/5 space-y-2">
                          <p className="text-[10px] font-mono text-primary uppercase tracking-wider">Choose Skill to Attune</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              className="bg-background border border-border text-xs font-mono px-2 py-1 focus:outline-none focus:border-primary"
                              value={choice?.skill || ""}
                              onChange={e => saveFeatChoice(idx, { skill: e.target.value })}
                            >
                              <option value="">— choose a skill —</option>
                              {ALL_SKILLS
                                .filter(s => !attunedSkillsBase.includes(s.name) || s.name === choice?.skill)
                                .map(s => <option key={s.name} value={s.name}>{s.name} ({s.attr.toUpperCase()})</option>)
                              }
                            </select>
                            {choice?.skill && (
                              <span className="text-xs font-mono text-chart-2">Attuned: {choice.skill} (+{rb})</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expertise inline choice */}
                      {def.name === "Expertise" && (
                        <div className="mt-3 p-3 border border-primary/20 bg-primary/5 space-y-2">
                          <p className="text-[10px] font-mono text-primary uppercase tracking-wider">Choose Skill for Expertise (×2 RB)</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              className="bg-background border border-border text-xs font-mono px-2 py-1 focus:outline-none focus:border-primary"
                              value={choice?.skill || ""}
                              onChange={e => saveFeatChoice(idx, { skill: e.target.value })}
                            >
                              <option value="">— choose an attuned skill —</option>
                              {attunedSkills.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {choice?.skill && (
                              <span className="text-xs font-mono text-chart-2">Expertise: {choice.skill} (RB = +{rb * 2})</span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="font-[family-name:'Cinzel',serif] text-foreground">{name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== INVENTORY ===== */}
        <TabsContent value="inventory" className="tc-panel m-0">
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-xs text-muted-foreground">{inventory.length} items carried</span>
            <div className="flex gap-2">
              <button onClick={addCustomItem} className="px-3 py-1.5 text-xs font-mono border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">+ CUSTOM ITEM</button>
              <button onClick={() => setShowInventoryPicker(v => !v)} className="px-3 py-1.5 text-xs font-mono border border-primary/50 text-primary hover:bg-primary/10 transition-colors">
                {showInventoryPicker ? "CLOSE CATALOG" : "+ FROM CATALOG"}
              </button>
            </div>
          </div>

          {showInventoryPicker && (
            <div className="mb-4 border border-border bg-card p-3">
              <input
                className="w-full bg-background border border-border px-3 py-1.5 font-mono text-sm mb-2 focus:outline-none focus:border-primary"
                placeholder="Search items..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
              />
              {/* Category filter */}
              <div className="flex flex-wrap gap-1 mb-3">
                {[
                  { value: "all", label: "All" },
                  { value: "weapon", label: "Weapons" },
                  { value: "armor", label: "Armor" },
                  { value: "casting", label: "Casting" },
                  { value: "potion", label: "Potions" },
                  { value: "consumable", label: "Consumables" },
                  { value: "magical", label: "Magical" },
                  { value: "kit", label: "Kits" },
                  { value: "mount", label: "Mounts" },
                ].map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCatalogCategory(cat.value)}
                    className={cn("px-2 py-0.5 text-[10px] font-mono border transition-colors",
                      catalogCategory === cat.value
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Item list */}
              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredCatalog.length === 0 && (
                  <p className="text-xs font-mono text-muted-foreground text-center py-4">No items found.</p>
                )}
                {filteredCatalog.map(item => {
                  const inPack = !!inventory.find(i => i.id === item.id);
                  const isExpanded = expandedCatalogItem === item.id;
                  return (
                    <div key={item.id} className={cn("border transition-colors", isExpanded ? "border-primary/30 bg-primary/5" : "border-border/50 hover:border-border")}>
                      {/* Row */}
                      <div className="flex items-center gap-2 px-2 py-2">
                        <button
                          onClick={() => setExpandedCatalogItem(isExpanded ? null : item.id)}
                          className="text-muted-foreground hover:text-foreground text-[10px] w-4 flex-shrink-0 transition-colors"
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                        <span className={cn("text-[10px] font-mono w-[68px] flex-shrink-0 truncate", RARITY_COLORS[item.rarity])}>
                          {RARITY_LABELS[item.rarity]}
                        </span>
                        <span className="font-mono text-xs text-foreground flex-1 min-w-0 truncate">{item.name}</span>
                        {item.subCategory && (
                          <span className="text-[9px] font-mono text-muted-foreground/50 hidden sm:block flex-shrink-0">{item.subCategory}</span>
                        )}
                        {inPack ? (
                          <span className="text-[10px] font-mono text-chart-2/80 border border-chart-2/30 px-1.5 py-0.5 flex-shrink-0">✓ PACK</span>
                        ) : (
                          <button
                            onClick={() => addFromCatalog(item)}
                            className="text-[10px] font-mono border border-primary/50 text-primary hover:bg-primary/10 px-1.5 py-0.5 flex-shrink-0 transition-colors"
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                      {/* Expanded description */}
                      {isExpanded && (
                        <div className="px-7 pb-3 border-t border-border/20">
                          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed mt-2">{item.desc}</p>
                          {item.mechanical && (
                            <p className="text-[11px] font-mono text-primary/70 mt-1.5 leading-relaxed">{item.mechanical}</p>
                          )}
                          {!inPack && (
                            <button
                              onClick={() => { addFromCatalog(item); setExpandedCatalogItem(null); }}
                              className="mt-2.5 text-[10px] font-mono border border-primary/50 text-primary hover:bg-primary/10 px-3 py-1 transition-colors"
                            >
                              + ADD TO INVENTORY
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {inventory.length === 0 && !showInventoryPicker && (
            <div className="py-8 text-center font-mono text-muted-foreground text-sm">Inventory empty. Add items from catalog or create custom items.</div>
          )}

          <div className="space-y-2">
            {inventory.map(item => {
              const canEquip = ["weapon", "armor", "casting", "magical"].includes(item.category || "");
              const isConsumable = ["potion", "consumable"].includes(item.category || "");
              const isKit = item.category === "kit";
              const hasSubItems = (item.subItems || []).length > 0;
              const equipBonus = ITEM_BONUS[item.id];
              const isExpanded = expandedKitItem === item.id;
              return (
                <div key={item.id} className={cn("border bg-card group transition-colors", item.equipped ? "border-chart-2/40" : "border-border")}>
                  <div className="p-3 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {item.equipped && <span className="text-[9px] font-mono text-chart-2 border border-chart-2/40 px-1 py-0.5">EQUIPPED</span>}
                        <input
                          className="bg-transparent font-mono text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border"
                          value={item.name}
                          onChange={e => updateItem(item.id, { name: e.target.value })}
                        />
                        <select
                          className="bg-transparent font-mono text-[10px] border-none focus:outline-none cursor-pointer"
                          value={item.rarity}
                          onChange={e => updateItem(item.id, { rarity: e.target.value as ItemRarity })}
                        >
                          {(Object.keys(RARITY_LABELS) as ItemRarity[]).map(r => (
                            <option key={r} value={r}>{RARITY_LABELS[r]}</option>
                          ))}
                        </select>
                      </div>
                      {item.desc && <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{item.desc}</p>}
                      {item.mechanical && <p className="text-[11px] font-mono text-primary/60 mt-0.5">{item.mechanical}</p>}
                      {equipBonus && item.equipped && (
                        <div className="flex gap-3 mt-1 text-[10px] font-mono text-chart-2/80">
                          {equipBonus.guardRating ? <span>+{equipBonus.guardRating} GR</span> : null}
                          {equipBonus.wardRating  ? <span>+{equipBonus.wardRating} WR</span>  : null}
                          {equipBonus.attackAttr  ? (
                            <span>{equipBonus.damageDice}{fmtMod(calcMod((attrs as Record<string,number>)[equipBonus.attackAttr] || 10))} {equipBonus.damageType}</span>
                          ) : null}
                        </div>
                      )}
                      <input
                        className="mt-1 w-full bg-transparent font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none border-b border-transparent focus:border-border/30"
                        placeholder="Notes..."
                        value={item.notes || ""}
                        onChange={e => updateItem(item.id, { notes: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      {canEquip && (
                        <button
                          className={cn("px-2 py-1 text-[10px] font-mono border transition-colors",
                            item.equipped
                              ? "border-chart-2/50 text-chart-2 bg-chart-2/10 hover:bg-chart-2/20"
                              : "border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary"
                          )}
                          onClick={() => toggleEquip(item.id)}
                        >{item.equipped ? "UNEQUIP" : "EQUIP"}</button>
                      )}
                      {isConsumable && (
                        <button
                          className="px-2 py-1 text-[10px] font-mono border border-destructive/40 text-destructive/70 hover:bg-destructive/10 transition-colors"
                          onClick={() => useConsumable(item.id)}
                        >USE ×{item.quantity}</button>
                      )}
                      {isKit && hasSubItems && (
                        <button
                          className="px-2 py-1 text-[10px] font-mono border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                          onClick={() => setExpandedKitItem(isExpanded ? null : item.id)}
                        >{isExpanded ? "CLOSE" : "CONTENTS"}</button>
                      )}
                      {!isConsumable && (
                        <div className="flex items-center gap-1">
                          <button className="w-5 h-5 border border-border hover:bg-muted font-mono text-xs" onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}>−</button>
                          <span className="w-5 text-center font-mono text-xs">{item.quantity}</span>
                          <button className="w-5 h-5 border border-border hover:bg-muted font-mono text-xs" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}>+</button>
                        </div>
                      )}
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground/30 hover:text-destructive text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">× DEL</button>
                    </div>
                  </div>
                  {isExpanded && hasSubItems && (
                    <div className="border-t border-border/30 px-3 pb-3 pt-2 bg-background/50">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Kit Contents</p>
                      <div className="space-y-1">
                        {(item.subItems || []).map((sub, subIdx) => (
                          <div key={subIdx} className={cn("flex items-center gap-2 py-1 px-2 border text-xs font-mono", sub.charges === 0 ? "border-border/20 opacity-40" : "border-border/40")}>
                            <span className="flex-1 text-foreground truncate">{sub.name}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {sub.maxCharges > 1 && (
                                <div className="flex gap-0.5">
                                  {Array.from({ length: sub.maxCharges }).map((_, ci) => (
                                    <span key={ci} className={cn("w-2.5 h-2.5 border text-[7px] flex items-center justify-center",
                                      ci < sub.charges ? "border-primary/50 bg-primary/20" : "border-border/30"
                                    )}>{ci < sub.charges ? "●" : ""}</span>
                                  ))}
                                </div>
                              )}
                              <span className="text-[10px] text-muted-foreground/50">{sub.charges}/{sub.maxCharges}</span>
                              {sub.canEquip && (
                                <button
                                  className={cn("px-1.5 py-0.5 text-[9px] border transition-colors",
                                    sub.equipped ? "border-chart-2/50 text-chart-2" : "border-border/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
                                  )}
                                  onClick={() => toggleSubItemEquip(item.id, subIdx)}
                                >{sub.equipped ? "EQP" : "EQ?"}</button>
                              )}
                              <button
                                className="px-1.5 py-0.5 text-[9px] border border-destructive/30 text-destructive/60 hover:bg-destructive/10 disabled:opacity-30 transition-colors"
                                onClick={() => useSubItem(item.id, subIdx)}
                                disabled={sub.charges === 0}
                              >USE</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== BACKGROUND ===== */}
        <TabsContent value="background" className="tc-panel m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
            <div className="space-y-4">
              <EditableField label="Background" value={localData.background || ""} onChange={v => patch({ background: v })} placeholder="Guild-Raised, Self-Taught..." />
              <EditableField label="Guild" value={localData.guild || ""} onChange={v => patch({ guild: v })} placeholder="The Scaled Guard..." />
              <EditableField label="Guild Rank" value={localData.guildRank || ""} onChange={v => patch({ guildRank: v })} placeholder="Thornguard, Solanarch..." />
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Primary Mode <span className="text-chart-2/60 ml-1">Harmony</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.primaryMode || character.mode || ""} onChange={e => patch({ primaryMode: e.target.value })} placeholder="Anchor, Striker..." />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Secondary Mode 1 <span className="text-muted-foreground/40 ml-1">Normal · Level 4+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.secondaryMode || ""} onChange={e => patch({ secondaryMode: e.target.value })} placeholder="Unlocked at Level 4..." disabled={level < 4} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Secondary Mode 2 <span className="text-muted-foreground/40 ml-1">Normal · Level 4+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.secondaryMode2 || ""} onChange={e => patch({ secondaryMode2: e.target.value })} placeholder="Unlocked at Level 4..." disabled={level < 4} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Tertiary Mode 1 <span className="text-muted-foreground/40 ml-1">Normal · Level 7+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.tertiaryMode || ""} onChange={e => patch({ tertiaryMode: e.target.value })} placeholder="Unlocked at Level 7..." disabled={level < 7} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Tertiary Mode 2 <span className="text-muted-foreground/40 ml-1">Normal · Level 7+</span></label>
                <input className="w-full bg-background border border-border px-2 py-1 focus:outline-none focus:border-primary" value={localData.tertiaryMode2 || ""} onChange={e => patch({ tertiaryMode2: e.target.value })} placeholder="Unlocked at Level 7..." disabled={level < 7} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Weaver Signature</label>
                <textarea
                  className="w-full bg-background border border-border px-2 py-2 focus:outline-none focus:border-primary text-sm min-h-[100px] resize-none"
                  value={localData.signature || ""}
                  onChange={e => patch({ signature: e.target.value })}
                  placeholder="Visual: ..., Auditory: ..., Tactile: ..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Wounds & Conditions</label>
                <textarea
                  className="w-full bg-background border border-border px-2 py-2 focus:outline-none focus:border-primary text-sm min-h-[100px] resize-none"
                  value={localData.woundsNotes || ""}
                  onChange={e => patch({ woundsNotes: e.target.value })}
                  placeholder="Current wounds, active conditions..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">Level</label>
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 border border-border hover:bg-muted font-mono" onClick={() => onUpdate({ level: Math.max(1, level - 1) })}>−</button>
                  <span className="text-2xl font-mono">{level}</span>
                  <button className="w-8 h-8 border border-border hover:bg-muted font-mono" onClick={() => onUpdate({ level: Math.min(10, level + 1) })}>+</button>
                  <span className="text-xs text-muted-foreground">RB: +{rb}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== NOTES ===== */}
        <TabsContent value="notes" className="tc-panel m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { key: "notesBackstory"   as const, label: "Backstory",          placeholder: "Where did you come from? What shaped you?" },
              { key: "notesAppearance"  as const, label: "Appearance",          placeholder: "Height, build, notable features, how others see you..." },
              { key: "notesPersonality" as const, label: "Personality & Quirks", placeholder: "Mannerisms, habits, how you handle pressure..." },
              { key: "notesBonds"       as const, label: "Bonds & Loyalties",   placeholder: "Who or what do you protect? What can't you walk away from?" },
              { key: "notesFlaws"       as const, label: "Flaws & Fears",       placeholder: "What holds you back? What haunts you?" },
              { key: "notesGoals"       as const, label: "Goals & Ambitions",   placeholder: "What are you working toward? What would make this worth it?" },
              { key: "notesAllies"      as const, label: "Allies & Rivals",     placeholder: "Contacts, friends, enemies — important names..." },
              { key: "notesSession"     as const, label: "Session Log",         placeholder: "Quick notes per session — what happened, what changed..." },
            ]).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{label}</label>
                <textarea
                  className="w-full bg-background border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary resize-none min-h-[100px] leading-relaxed"
                  value={localData[key] || ""}
                  onChange={e => patch({ [key]: e.target.value } as Partial<SheetData>)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          {localData.notes && (
            <div className="mt-4 border-t border-border/30 pt-4">
              <label className="block text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Legacy Notes (migrate to sections above)</label>
              <textarea
                className="w-full bg-background border border-border/30 px-3 py-2 font-mono text-xs focus:outline-none resize-none min-h-[80px] text-muted-foreground/60 leading-relaxed"
                value={localData.notes}
                onChange={e => patch({ notes: e.target.value })}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
      </fieldset>
    </div>
  );
}

// ---- Sub-components ----

function Badge({ children, variant = "affinity" }: { children: React.ReactNode; variant?: "affinity" | "mode" | "level" | "dim" }) {
  return (
    <span className={cn("text-[10px] font-mono px-2 py-0.5 border",
      variant === "affinity" && "border-chart-2/50 text-chart-2 bg-chart-2/10",
      variant === "mode" && "border-primary/50 text-primary bg-primary/10",
      variant === "level" && "border-border text-muted-foreground",
      variant === "dim" && "border-border/40 text-muted-foreground/60",
    )}>{children}</span>
  );
}

function QuickStat({ label, value, highlight, warning }: { label: React.ReactNode; value: string | number; highlight?: boolean; warning?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-muted-foreground uppercase mb-1 leading-tight">{label}</div>
      <div className={cn("font-mono text-lg font-bold", highlight && "text-primary", warning && "text-destructive")}>{value}</div>
    </div>
  );
}

function TrackerRow({ label, value, max, color, onDec, onInc }: { label: React.ReactNode; value: number; max: number; color: string; onDec: () => void; onInc: () => void }) {
  return (
    <div className="tc-track">
      <div className="flex justify-between items-center gap-2 text-xs font-mono mb-2">
        <span className="text-foreground">{label}</span>
        <div className="flex gap-1 items-center">
          <button className="tc-track-button" aria-label={`Decrease ${typeof label === "string" ? label : "condition"} by one`} onClick={onDec}>−</button>
          <span className="w-12 text-center tabular-nums">{value}/{max}</span>
          <button className="tc-track-button" aria-label={`Increase ${typeof label === "string" ? label : "condition"} by one`} onClick={onInc}>+</button>
        </div>
      </div>
      <div className="h-1.5 bg-background border border-border">
        <div className={cn("h-full transition-all", color)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</label>
      <input
        className="w-full bg-background border border-border px-2 py-1 font-mono text-sm focus:outline-none focus:border-primary"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ===== WEAVE CAST ROW =====
function WeaveCastRow({
  weave, wi, characterId, maxStrings, localData, patch,
  safePowerLevel, ctrScore, ctrModifierPenalty, availableTension, castingConditions, burnout, lostStrings,
  hasPrecisionWeave, precisionWeaveChargeAvailable, onBeginCast, onCast,
}: {
  weave: WeavingEntry; wi: number; characterId: number; maxStrings: number;
  localData: any; patch: (p: any) => void;
  safePowerLevel: number; ctrScore: number; ctrModifierPenalty: number; availableTension: number; castingConditions: string[]; burnout: number;
  lostStrings: string[];
  hasPrecisionWeave: boolean; precisionWeaveChargeAvailable: boolean;
  onBeginCast: () => (() => void) | null;
  onCast: (input: Omit<CastInput, "requestId" | "characterId">) => Promise<{ roll: GameplayRoll; aftermath: CastUIAftermath }>;
}) {
  const mod = calcMod(ctrScore) - ctrModifierPenalty - (castingConditions.includes("−1 to Thread Checks until Mend") ? 1 : 0);
  const forcedDiscord = burnout >= 1 || castingConditions.includes("Discord on Thread Checks until Mend") || castingConditions.includes("Shaking Hands");
  const recordRoll = useGameplayRoll();
  const requestLock = useRef(false);
  const releaseCastRef = useRef<(() => void) | null>(null);
  const [rollError, setRollError] = useState("");
  const [pending, setPending] = useState(false);
  const { style: activeDiceStyle, isLoading: dicePreferencesLoading, isError: dicePreferenceError } = useActiveDiceStyle();
  const diceStyle = dicePreferenceError ? DEFAULT_DICE_STYLE : activeDiceStyle;
  const [castOpen, setCastOpen] = useState(false);
  const [animDice, setAnimDice] = useState<{ d1: number; d2?: number; rollType: "HARMONY" | "NORMAL" | "DISCORD" } | null>(null);
  const [castResult, setCastResult] = useState<{ d1: number; d2?: number; finalDie: number; total: number; rollType: "HARMONY" | "NORMAL" | "DISCORD"; dc: number; intent: string; modes: string[] } | null>(null);
  const [aftermath, setAftermath] = useState<CastUIAftermath | null>(null);
  const [rolledCost, setRolledCost] = useState<number | null>(null);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rollKey, setRollKey] = useState(0);

  useEffect(() => () => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    releaseCastRef.current?.();
    releaseCastRef.current = null;
  }, []);

  const overSafePL = (weave.powerLevels || []).slice(0, weave.numStrings).some(pl => pl > safePowerLevel);
  const checkType = overSafePL || forcedDiscord ? "Discord" : weave.numStrings === 2 ? (hasPrecisionWeave ? "Harmony" : "Normal") : "Discord";
  const effectType = weave.numStrings === 2 ? "Enhanced" : weave.numStrings === 3 ? "Dramatic" : "Catastrophic";
  const costMultiplier = weaveMultiplier(weave.numStrings);
  const baseCost = (weave.strings || []).slice(0, weave.numStrings).reduce((sum: number, sName: string, si: number) => {
    const sData = findString(sName);
    const pl = (weave.powerLevels || [])[si] || 1;
    return sum + (sData?.levels?.[pl - 1]?.cost ?? CORE_POWER_LEVELS[pl - 1]?.cost ?? 0);
  }, 0);
  const totalCost = baseCost * costMultiplier;
  const precisionDiscount = weave.numStrings === 2 && hasPrecisionWeave && precisionWeaveChargeAvailable && totalCost > 0;
  const castCost = Math.max(0, totalCost - (precisionDiscount ? 1 : 0));
  const weaveDC = (() => {
    const dcs = (weave.strings || []).slice(0, weave.numStrings).map((sName: string, si: number) => {
      const sData = findString(sName);
      const pl = (weave.powerLevels || [])[si] || 1;
      return sData?.levels?.[pl - 1]?.dc ?? CORE_POWER_LEVELS[pl - 1]?.dc ?? 0;
    }).filter(Boolean);
    if (!dcs.length) return CORE_POWER_LEVELS[0].dc;
    return Math.max(...dcs) + (weave.numStrings - 2) * 2;
  })();

  const availableStrings: string[] = (Array.isArray(localData.strings) ? localData.strings : []).filter((name: string) =>
    !lostStrings.includes(name.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+string$/, "")));
  const isConfigured = Number.isInteger(weave.numStrings) && weave.numStrings >= 2 && weave.numStrings <= maxStrings &&
    Array.from({ length: weave.numStrings }).every((_, si) => {
      const selectedString = weave.strings?.[si];
      const powerLevel = weave.powerLevels?.[si];
      return typeof selectedString === "string" &&
        selectedString.trim().length > 0 &&
        availableStrings.includes(selectedString) &&
        Number.isFinite(powerLevel) &&
        Number.isInteger(powerLevel) &&
        powerLevel >= 1 &&
        powerLevel <= 5 &&
        ALL_MODES.some(mode => mode.name === weave.modes?.[si]);
    }) && new Set((weave.strings || []).slice(0, weave.numStrings)).size === weave.numStrings;
  const weaveRollType: "HARMONY" | "NORMAL" | "DISCORD" = overSafePL || forcedDiscord ? "DISCORD" : weave.numStrings === 2
    ? (hasPrecisionWeave ? "HARMONY" : "NORMAL")
    : "DISCORD";
  function openCast() { setCastOpen(true); setCastResult(null); setAftermath(null); setRolledCost(null); if (rollTimerRef.current) { clearTimeout(rollTimerRef.current); rollTimerRef.current = null; } setAnimDice(null); }
  function closeCast() {
    if (animDice || pending) return;
    setCastOpen(false); setCastResult(null); setAftermath(null); setRolledCost(null);
    if (rollTimerRef.current) { clearTimeout(rollTimerRef.current); rollTimerRef.current = null; }
    setAnimDice(null);
  }

  async function doRoll() {
    if (!isConfigured || !weave.intent?.trim() || dicePreferencesLoading || animDice || requestLock.current) return;
    const release = onBeginCast();
    if (!release) {
      setRollError("Another cast for this character is still resolving. Wait for it to finish before rolling.");
      return;
    }
    releaseCastRef.current = release;
    const rollType = weaveRollType;
    const intent = weave.intent.trim();
    const modes = weave.modes.slice(0, weave.numStrings);
    requestLock.current = true;
    setPending(true);
    setRollError("");
    let result: GameplayRoll;
    let outcome: CastUIAftermath;
    try {
      const committed = await onCast({ kind: "weave", intent, components: weave.strings.slice(0, weave.numStrings).map((name, i) => ({
        string: name, powerLevel: weave.powerLevels[i], mode: weave.modes[i],
      })) });
      result = committed.roll;
      outcome = committed.aftermath;
      setAftermath(outcome);
    } catch (error) {
      setRollError(rollErrorMessage(error));
      setPending(false);
      requestLock.current = false;
      releaseCastRef.current?.();
      releaseCastRef.current = null;
      return;
    }
    releaseCastRef.current?.();
    releaseCastRef.current = null;
    setPending(false);
    setRolledCost(outcome.cost);
    const { d1, d2, finalDie, total } = result;
    setRollKey(key => key + 1);
    setAnimDice({ d1, d2, rollType: result.mode as "HARMONY" | "NORMAL" | "DISCORD" });
    rollTimerRef.current = setTimeout(() => {
      rollTimerRef.current = null;
      requestLock.current = false;
      setAnimDice(null);
      setCastResult({ d1, d2, finalDie, total, rollType: result.mode as "HARMONY" | "NORMAL" | "DISCORD", dc: result.dc ?? weaveDC, intent, modes });
    }, ROLL_DURATION_MS);
  }

  const diceCol = (rt: "HARMONY" | "NORMAL" | "DISCORD") => ({ HARMONY: "border-chart-2 text-chart-2", NORMAL: "border-border text-foreground", DISCORD: "border-destructive text-destructive" }[rt]);
  const displayedDice = animDice ?? castResult;
  const displayedCost = animDice || castResult ? (rolledCost ?? castCost) : castCost;

  return (
    <div className="border border-border p-3 bg-card/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-foreground">Weave {wi + 1}</span>
        <button onClick={() => patch({ weavings: (localData.weavings || []).filter((_: any, i: number) => i !== wi) })} disabled={!!animDice} className="text-[10px] font-mono text-muted-foreground/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40">× Remove</button>
      </div>
      {/* String count */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground">Strings:</span>
        {[2, 3, 4].filter(n => n <= maxStrings).map(n => (
          <button key={n} disabled={!!animDice} className={cn("px-2 py-0.5 text-[10px] font-mono border transition-colors disabled:opacity-50", weave.numStrings === n ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}
            onClick={() => {
              const next = [...(localData.weavings || [])];
              next[wi] = { ...weave, numStrings: n, strings: (weave.strings || []).slice(0, n), powerLevels: [...(weave.powerLevels || [1,1,1,1]).slice(0, n), ...(Array(Math.max(0, n - (weave.powerLevels||[]).length)).fill(1))], modes: (weave.modes || []).slice(0, n) };
              patch({ weavings: next });
            }}>{n}</button>
        ))}
        {maxStrings < 4 && <span className="text-[10px] font-mono text-muted-foreground/40">(4 requires Lv7)</span>}
      </div>
      {/* Per-string config */}
      {Array.from({ length: weave.numStrings }).map((_, si) => (
        <div key={si} className="grid grid-cols-3 gap-1.5">
          <select disabled={!!animDice} className="bg-background border border-border text-[10px] font-mono px-1 py-0.5 focus:outline-none focus:border-primary"
            value={(weave.strings || [])[si] || ""}
            onChange={e => { const next = [...(localData.weavings||[])]; const ns = [...(weave.strings||[])]; ns[si] = e.target.value; next[wi] = { ...weave, strings: ns }; patch({ weavings: next }); }}>
            <option value="">String {si + 1}</option>
            {(localData.strings || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select disabled={!!animDice} className="bg-background border border-border text-[10px] font-mono px-1 py-0.5 focus:outline-none focus:border-primary"
            value={(weave.powerLevels || [])[si] || 1}
            onChange={e => { const next = [...(localData.weavings||[])]; const np = [...(weave.powerLevels||[1,1,1,1])]; np[si] = parseInt(e.target.value); next[wi] = { ...weave, powerLevels: np }; patch({ weavings: next }); }}>
            {[1,2,3,4,5].map(pl => <option key={pl} value={pl}>PL {pl}</option>)}
          </select>
          <select disabled={!!animDice} className="bg-background border border-border text-[10px] font-mono px-1 py-0.5 focus:outline-none focus:border-primary"
            value={(weave.modes || [])[si] || ""}
            onChange={e => { const next = [...(localData.weavings||[])]; const nm = [...(weave.modes||[])]; nm[si] = e.target.value; next[wi] = { ...weave, modes: nm }; patch({ weavings: next }); }}>
            <option value="">Mode</option>
            {ALL_MODES.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
        </div>
      ))}
      {!isConfigured && <p className="text-[10px] font-mono text-muted-foreground">Choose different saved Strings, a PL (1–5), and a Mode for each contribution to enable casting.</p>}
      <label className="block text-[10px] font-mono text-muted-foreground" htmlFor={`weave-intent-${weave.id}`}>Shared effect — what do these Strings create together?</label>
      <textarea id={`weave-intent-${weave.id}`} value={weave.intent || ""} maxLength={500} rows={2} disabled={!!animDice || !!castResult}
        onChange={e => { const next = [...(localData.weavings || [])]; next[wi] = { ...weave, intent: e.target.value }; patch({ weavings: next }); }}
        placeholder="Describe how each String and Mode contributes to one effect…"
        className="w-full bg-background border border-border p-2 text-xs focus:outline-none focus:border-primary resize-y" />
      {overSafePL && <p className="text-[10px] text-amber-500">A String exceeds your safe maximum (PL {safePowerLevel}); this Weave rolls at Discord.</p>}
      <p className="text-[10px] text-muted-foreground">Describe the combined effect freely. DC is calculated from the selected Strings and PLs (highest DC +2 per String beyond two); Modes determine the check type. No approval is required to roll.</p>
      {/* Cast area */}
      {castOpen ? (
        <div className="border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
              Weave {wi + 1} · {weave.numStrings} strings · DC {weaveDC} · {displayedCost}T
              <span className="text-muted-foreground/60 ml-1">({checkType} · {effectType})</span>
            </span>
            <button onClick={closeCast} disabled={!!animDice || pending} className="text-muted-foreground hover:text-foreground text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed">CLOSE ✕</button>
          </div>
          {hasPrecisionWeave && weave.numStrings === 2 && (
            <p className="text-[10px] font-mono text-chart-2">
              Precision Weave — {overSafePL ? "Discord applies because a PL exceeds your safe maximum" : "Harmony"}{precisionDiscount ? "; first two-string cast this Mend costs 1 less Tension." : "."}
            </p>
          )}
          {isConfigured && castCost > availableTension && (
            <p className="text-[10px] font-mono text-amber-500">Cost exceeds remaining Thread Pool room ({Math.max(0, availableTension)}T). This cast will trigger automatic Snapback and release Tension.</p>
          )}
          {dicePreferenceError && <p className="text-[10px] font-mono text-amber-500">Dice preference unavailable; using the house die.</p>}
          {dicePreferencesLoading && <p className="text-[10px] font-mono text-muted-foreground">Loading dice preferences… rolling is unavailable until your die selection loads.</p>}
          {displayedDice && <DiceStage dice={[{ sides: 20 as const, value: displayedDice.d1 }, ...(displayedDice.d2 === undefined ? [] : [{ sides: 20 as const, value: displayedDice.d2 }])]} style={diceStyle} phase={animDice ? "rolling" : "settled"} rollKey={rollKey} height={190} className="mb-3" />}
          {animDice ? (
            <div className="py-3 text-center">
              <p className="mt-2 text-[10px] font-mono text-muted-foreground">Rolled d20: {animDice.d1}{animDice.d2 === undefined ? "" : ` · d20: ${animDice.d2}`}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">{animDice.rollType === "HARMONY" ? "weaving harmony…" : animDice.rollType === "DISCORD" ? "embracing discord…" : "threading the weave…"}</p>
            </div>
          ) : castResult ? (
            <div>
              <div className={cn("p-3 border mb-2", castResult.finalDie === 1 ? "border-destructive/50 bg-destructive/5" : castResult.finalDie === 20 ? "border-primary/50 bg-primary/5" : castResult.total >= castResult.dc ? "border-chart-2/40 bg-chart-2/5" : "border-border bg-muted/10")}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("w-12 h-12 border-2 flex items-center justify-center text-2xl font-mono font-bold", castResult.finalDie === castResult.d1 && castResult.d1 !== castResult.d2 ? diceCol(castResult.rollType) : "border-border/40 text-muted-foreground")}>{castResult.d1}</div>
                  {castResult.d2 !== undefined && (<>
                    <span className="text-muted-foreground/50 font-mono text-[10px]">{castResult.rollType === "HARMONY" ? "▲HI" : "▼LO"}</span>
                    <div className={cn("w-12 h-12 border-2 flex items-center justify-center text-2xl font-mono font-bold", castResult.finalDie === castResult.d2 && castResult.d1 !== castResult.d2 ? diceCol(castResult.rollType) : "border-border/40 text-muted-foreground")}>{castResult.d2}</div>
                  </>)}
                  <div className="ml-auto text-right">
                    <div className="text-[10px] font-mono text-muted-foreground">{castResult.modes.join(" + ")} · {castResult.rollType} {fmtMod(mod)}</div>
                    <div className={cn("text-3xl font-bold font-mono", castResult.finalDie === 1 ? "text-destructive" : castResult.finalDie === 20 ? "text-primary" : castResult.total >= castResult.dc ? "text-chart-2" : "text-foreground")}>{castResult.total}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">vs DC {castResult.dc}</div>
                  </div>
                </div>
                {castResult.finalDie === 20 && <div className="font-mono text-[10px] text-primary font-bold mb-1">✦ THREAD BREAK — Exceptional weave!</div>}
                {castResult.finalDie === 1 ? <div className="font-mono text-[10px] text-destructive font-bold">✸ MISFIRE — Weave collapses. Snapback on primary string.</div>
                  : castResult.finalDie === 20 || castResult.total >= castResult.dc ? <div className="font-mono text-[10px] text-chart-2 font-bold">SUCCESS — {effectType} effect: {castResult.intent}.</div>
                  : <div className="font-mono text-[10px] text-muted-foreground font-bold">MISHAP — see the rolled table result below. Tension was spent.</div>}
              </div>
              {aftermath && <CastAftermathDisplay result={aftermath} />}
              <button onClick={() => { setCastResult(null); setAftermath(null); }} className="px-3 py-1 text-[10px] font-mono border border-border/50 text-muted-foreground hover:text-foreground transition-colors mt-2">CAST AGAIN</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-3 p-2 border border-border bg-background">
                <div className="font-mono text-xs text-foreground">{(weave.modes || []).slice(0, weave.numStrings).filter(Boolean).join(" + ") || "Choose Modes for each String"}</div>
                <span className="text-[10px] font-mono ml-auto">{weaveRollType}</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mb-3">{weaveRollType === "HARMONY" ? "Roll 2d20, keep highest." : weaveRollType === "DISCORD" ? "Roll 2d20, keep lowest." : "Roll 1d20."} Thread Check: CTR {fmtMod(mod)}</div>
              <button onClick={doRoll} disabled={pending || !isConfigured || !weave.intent?.trim() || dicePreferencesLoading} className="w-full py-2.5 border-2 border-primary text-primary font-mono disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/10">{pending ? "RESOLVING…" : "⚄ ROLL THE WEAVE"}</button>
              {rollError && <p role="alert" className="text-xs text-destructive">Cast not confirmed: {rollError}. Retry this same cast to recover its original result.</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/10 px-2 py-1.5 font-mono text-[10px]">
          <span className="text-muted-foreground">
            <span className={cn(weave.numStrings === 2 ? "text-chart-2" : "text-destructive/80")}>{checkType}</span> Check · {effectType} · <span className="text-primary font-semibold">{castCost}T</span>
            {costMultiplier > 1 && <span className="text-muted-foreground/60"> ({baseCost}×{costMultiplier})</span>}
            {precisionDiscount && <span className="text-chart-2 ml-1">(Precision Weave −1T)</span>}
            {isConfigured && castCost > availableTension && <span className="text-amber-500 block sm:inline sm:ml-2">Exceeds remaining Thread Pool ({Math.max(0, availableTension)}T); automatic Snapback on cast.</span>}
            {weaveDC > 0 && <span className="text-muted-foreground/50 ml-2">DC {weaveDC}</span>}
          </span>
          <button className="px-2 py-0.5 border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50" onClick={openCast} disabled={!isConfigured || !weave.intent?.trim()}>CAST (+{castCost}T)</button>
        </div>
      )}
    </div>
  );
}

interface CastPL { pl: number; cost: number; dc: number; effect: string }
interface CastResult { d1: number; d2?: number; finalDie: number; total: number; rollType: "HARMONY" | "NORMAL" | "DISCORD"; chosenMode: string; dc: number }

function CastStringPanel({
  str, attrScore, characterName, characterId, availableTension, onCast,
  onBeginCast, castingConditions, burnout, ctrModifierPenalty, lostThread,
  primaryMode, secondaryModes, tertiaryModes, level, safePowerLevel, custom,
}: {
  str: any; attrScore: number; characterName: string; characterId: number; availableTension: number; onCast: (input: Omit<CastInput, "requestId" | "characterId">) => Promise<{ roll: GameplayRoll; aftermath: CastUIAftermath }>;
  onBeginCast: () => (() => void) | null;
  castingConditions: string[]; burnout: number; ctrModifierPenalty: number; lostThread: boolean;
  primaryMode: string; secondaryModes: string[]; tertiaryModes: string[]; level: number;
  safePowerLevel: number; custom: boolean;
}) {
  const mod = calcMod(attrScore) - ctrModifierPenalty - (castingConditions.includes("−1 to Thread Checks until Mend") ? 1 : 0);
  const forcedDiscord = burnout >= 1 || castingConditions.includes("Discord on Thread Checks until Mend") || castingConditions.includes("Shaking Hands");
  const recordRoll = useGameplayRoll();
  const requestLock = useRef(false);
  const releaseCastRef = useRef<(() => void) | null>(null);
  const [pending, setPending] = useState(false);
  const [rollError, setRollError] = useState("");
  const { style: activeDiceStyle, isLoading: dicePreferencesLoading, isError: dicePreferenceError } = useActiveDiceStyle();
  const diceStyle = dicePreferenceError ? DEFAULT_DICE_STYLE : activeDiceStyle;
  const [expanded, setExpanded] = useState(true);
  const [castPL, setCastPL] = useState<CastPL | null>(null);
  const [castIntent, setCastIntent] = useState("");
  const [rolledIntent, setRolledIntent] = useState("");
  const [selectedMode, setSelectedMode] = useState<ModeOption | null>(null);
  const [animDice, setAnimDice] = useState<{ d1: number; d2?: number; rollType: "HARMONY" | "NORMAL" | "DISCORD" } | null>(null);
  const [castResult, setCastResult] = useState<CastResult | null>(null);
  const [aftermath, setAftermath] = useState<CastUIAftermath | null>(null);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rollKey, setRollKey] = useState(0);

  useEffect(() => () => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    releaseCastRef.current?.();
    releaseCastRef.current = null;
  }, []);

  type ModeOption = { name: string; rollType: "HARMONY" | "NORMAL" | "DISCORD"; tier: "Primary" | "Secondary" | "Tertiary" | "Other" };
  const normalModes = new Set([...secondaryModes, ...tertiaryModes]);
  const availableModes: ModeOption[] = ALL_MODES.map(m => {
    if (primaryMode && m.name === primaryMode) return { name: m.name, rollType: forcedDiscord || (castPL && castPL.pl > safePowerLevel) ? "DISCORD" as const : "HARMONY" as const, tier: "Primary" as const };
    if (normalModes.has(m.name)) {
      const tier = secondaryModes.includes(m.name) ? "Secondary" as const : "Tertiary" as const;
      return { name: m.name, rollType: forcedDiscord || (castPL && castPL.pl > safePowerLevel) ? "DISCORD" as const : "NORMAL" as const, tier };
    }
    return { name: m.name, rollType: "DISCORD" as const, tier: "Other" as const };
  });

  function initiateCast(pl: number, cost: number, dc: number, effect: string) {
    if (animDice || lostThread) return;
    setCastPL({ pl, cost, dc, effect });
    setCastIntent("");
    setSelectedMode(null);
    setCastResult(null);
    setAftermath(null);
    if (rollTimerRef.current) { clearTimeout(rollTimerRef.current); rollTimerRef.current = null; }
    setAnimDice(null);
  }

  function closeOverlay() {
    if (animDice || pending) return;
    setCastPL(null);
    setSelectedMode(null);
    setCastResult(null);
    setAftermath(null);
    if (rollTimerRef.current) { clearTimeout(rollTimerRef.current); rollTimerRef.current = null; }
    setAnimDice(null);
  }

  async function doRoll() {
    if (lostThread || !selectedMode || !castPL || !castIntent.trim() || dicePreferencesLoading || requestLock.current) return;
    const release = onBeginCast();
    if (!release) {
      setRollError("Another cast for this character is still resolving. Wait for it to finish before rolling.");
      return;
    }
    releaseCastRef.current = release;
    const mode = selectedMode;
    const pl = castPL;
    requestLock.current = true;
    setPending(true);
    setRollError("");
    let result: GameplayRoll;
    let outcome: CastUIAftermath;
    try {
      const committed = await onCast({ kind: "cast", intent: castIntent.trim(), components: [{
        string: str.name, powerLevel: pl.pl, mode: mode.name,
      }] });
      result = committed.roll;
      outcome = committed.aftermath;
      setAftermath(outcome);
    } catch (error) {
      setRollError(rollErrorMessage(error));
      setPending(false);
      requestLock.current = false;
      releaseCastRef.current?.();
      releaseCastRef.current = null;
      return;
    }
    releaseCastRef.current?.();
    releaseCastRef.current = null;
    setPending(false);
    setRolledIntent(castIntent.trim());
    setSelectedMode(null);

    const { d1, d2, finalDie, total } = result;
    setRollKey(key => key + 1);
    setAnimDice({ d1, d2, rollType: result.mode as "HARMONY" | "NORMAL" | "DISCORD" });
    rollTimerRef.current = setTimeout(() => {
      rollTimerRef.current = null;
      requestLock.current = false;
      setAnimDice(null);
      setCastResult({ d1, d2, finalDie, total, rollType: result.mode as "HARMONY" | "NORMAL" | "DISCORD", chosenMode: mode.name, dc: result.dc ?? pl.dc });
    }, ROLL_DURATION_MS);
  }

  const rollTypeBadge = (rt: string) => ({
    HARMONY: "text-chart-2 bg-chart-2/10 border-chart-2/40",
    NORMAL: "text-muted-foreground bg-muted/30 border-border",
    DISCORD: "text-destructive bg-destructive/10 border-destructive/30",
  }[rt] ?? "");

  const diceColor = (rt: "HARMONY" | "NORMAL" | "DISCORD") => ({
    HARMONY: "border-chart-2 text-chart-2",
    NORMAL: "border-border text-foreground",
    DISCORD: "border-destructive text-destructive",
  }[rt]);
  const displayedDice = animDice ?? castResult;

  return (
    <div className="border border-border bg-background">
      <button className="w-full flex items-center justify-between px-4 py-3 text-left disabled:cursor-not-allowed" onClick={() => setExpanded(v => !v)} disabled={!!animDice}>
        <span className="font-[family-name:'Cinzel',serif] text-base text-chart-2">{str.name}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            <GameTerm term="thread check">Thread Check</GameTerm>: {str.checkAttr?.toUpperCase()} {fmtMod(mod)}
          </span>
          <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30">
          <p className="text-xs font-mono text-muted-foreground my-3 leading-relaxed">{str.flavor}</p>
          {lostThread && <p className="mb-3 border border-destructive/40 bg-destructive/5 p-2 font-mono text-[10px] text-destructive">This String was lost permanently and cannot be used for casting.</p>}
          <p className="text-[10px] font-mono text-muted-foreground mb-3">{custom ? "Core PL cost / DC for this custom String." : "PL effects below are examples, not a spell list. Their listed cost / DC are used as the starting values for a cast."} Describe your own effect when casting.</p>

          {/* Cast Overlay */}
          {castPL && (
            <div className="mb-4 border border-primary/30 bg-primary/5 p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-primary uppercase tracking-widest">
                   {str.name} · PL{castPL.pl} · DC {castPL.dc} · {castPL.cost} Tension
                </span>
                <button onClick={closeOverlay} disabled={!!animDice} className="text-muted-foreground hover:text-foreground text-xs font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  CLOSE ✕
                </button>
              </div>
              <label className="block text-[10px] font-mono text-primary uppercase tracking-widest mb-1" htmlFor={`cast-intent-${characterName}-${str.name}`}>What are you trying to do?</label>
              <textarea id={`cast-intent-${characterName}-${str.name}`} value={castIntent} onChange={e => setCastIntent(e.target.value)}
                disabled={!!animDice || !!castResult} maxLength={500} rows={2}
                placeholder={`I use ${str.name} at PL ${castPL.pl} through my chosen Mode to…`}
                className="w-full bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary mb-2 resize-y" />
              <div className="flex justify-between items-center gap-2 mb-3 text-[10px] text-muted-foreground">
                <span>Example only: {castPL.effect}</span>
                <button type="button" onClick={() => setCastIntent(castPL.effect)} disabled={!!animDice || !!castResult} className="shrink-0 underline hover:text-primary disabled:opacity-50">Use example</button>
              </div>
              {castPL.pl > safePowerLevel && <p className="mb-2 text-[10px] font-mono text-amber-500">PL {castPL.pl} exceeds your safe maximum (PL {safePowerLevel}): Thread Check at Discord.</p>}
               <p className="mb-3 text-[10px] text-muted-foreground">DC is automatic for this String and PL. Mode changes the check type (Harmony, Normal, or Discord), not the DC. Describe your effect and roll without an approval step.</p>
               {castPL.cost > availableTension && <p className="mb-3 text-[10px] font-mono text-amber-500">Cost exceeds remaining Thread Pool room ({Math.max(0, availableTension)}T). This cast triggers automatic Snapback and releases Tension.</p>}
              {dicePreferenceError && <p className="mb-3 text-[10px] font-mono text-amber-500">Dice preference unavailable; using the house die.</p>}
              {dicePreferencesLoading && <p className="mb-3 text-[10px] font-mono text-muted-foreground">Loading dice preferences… rolling is unavailable until your die selection loads.</p>}
              {displayedDice && <DiceStage dice={[{ sides: 20 as const, value: displayedDice.d1 }, ...(displayedDice.d2 === undefined ? [] : [{ sides: 20 as const, value: displayedDice.d2 }])]} style={diceStyle} phase={animDice ? "rolling" : "settled"} rollKey={rollKey} height={220} className="mb-3" />}

              {/* ── ROLLING ANIMATION ── */}
              {animDice ? (
                <div className="py-4 text-center">
                  <p className="mt-2 mb-3 text-[10px] font-mono text-muted-foreground">Rolled d20: {animDice.d1}{animDice.d2 === undefined ? "" : ` · d20: ${animDice.d2}`}</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">
                    {animDice.rollType === "HARMONY" ? "weaving harmony…" : animDice.rollType === "DISCORD" ? "embracing discord…" : "threading the weave…"}
                  </p>
                </div>

              ) : castResult ? (
                /* ── RESULT ── */
                <div>
                  <div className={cn("p-4 border mb-3",
                    castResult.finalDie === 1 ? "border-destructive/50 bg-destructive/5" :
                    castResult.finalDie === 20 ? "border-primary/50 bg-primary/5" :
                    castResult.total >= castResult.dc ? "border-chart-2/40 bg-chart-2/5" :
                    "border-border bg-muted/10"
                  )}>
                    {/* Die faces row */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn("w-14 h-14 border-2 flex items-center justify-center text-3xl font-mono font-bold",
                        castResult.finalDie === castResult.d1 && castResult.d1 !== castResult.d2 ? diceColor(castResult.rollType) : "border-border/40 text-muted-foreground"
                      )}>
                        {castResult.d1}
                      </div>
                      {castResult.d2 !== undefined && (
                        <>
                          <span className="text-muted-foreground/50 font-mono text-xs">{castResult.rollType === "HARMONY" ? "▲HI" : "▼LO"}</span>
                          <div className={cn("w-14 h-14 border-2 flex items-center justify-center text-3xl font-mono font-bold",
                            castResult.finalDie === castResult.d2 && castResult.d1 !== castResult.d2 ? diceColor(castResult.rollType) : "border-border/40 text-muted-foreground"
                          )}>
                            {castResult.d2}
                          </div>
                        </>
                      )}
                      <div className="ml-auto text-right">
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {castResult.chosenMode} · {castResult.rollType}
                          {" + "}{fmtMod(mod)}
                        </div>
                        <div className={cn("text-4xl font-bold font-mono",
                          castResult.finalDie === 1 ? "text-destructive" :
                          castResult.finalDie === 20 ? "text-primary" :
                          castResult.total >= castResult.dc ? "text-chart-2" : "text-foreground"
                        )}>
                          {castResult.total}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">vs DC {castResult.dc}</div>
                      </div>
                    </div>
                    {/* Outcome */}
                    {castResult.finalDie === 20 && (
                      <div className="font-mono text-xs text-primary font-bold mb-2 tracking-wide">✦ THREAD BREAK — Exceptional effect!</div>
                    )}
                    {castResult.finalDie === 1 ? (
                      <div>
                        <div className="font-mono text-xs text-destructive font-bold mb-1">✸ MISFIRE — SNAPBACK</div>
                        <div className="font-mono text-xs text-muted-foreground leading-relaxed">Snapback table outcome and applied damage appear below.</div>
                      </div>
                     ) : castResult.finalDie === 20 || castResult.total >= castResult.dc ? (
                      <div>
                        <div className="font-mono text-xs text-chart-2 font-bold mb-1">SUCCESS</div>
                         <div className="font-mono text-xs text-foreground leading-relaxed">{rolledIntent}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-mono text-xs text-muted-foreground font-bold mb-1">MISHAP — not enough</div>
                        <div className="font-mono text-xs text-muted-foreground leading-relaxed">Mishap table outcome appears below; a Backlash or Wild Release may still have an effect.</div>
                      </div>
                    )}
                  </div>
                   {aftermath && <CastAftermathDisplay result={aftermath} />}
                  <div className="flex gap-2">
                     <button onClick={() => { setCastResult(null); setAftermath(null); }} className="px-3 py-1.5 text-[10px] font-mono border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
                      ← SELECT MODE AGAIN
                    </button>
                    <button onClick={closeOverlay} className="px-3 py-1.5 text-[10px] font-mono border border-border/50 text-muted-foreground hover:text-foreground transition-colors ml-auto">
                      CLOSE ✕
                    </button>
                  </div>
                </div>

              ) : selectedMode ? (
                /* ── CONFIRM & ROLL ── */
                <div>
                  <div className="flex items-center gap-3 mb-4 p-3 border border-border bg-background">
                    <div>
                      <div className="font-mono text-sm text-foreground">{selectedMode.name}</div>
                      {selectedMode.tier !== "Other" && (
                        <div className="text-[10px] font-mono text-muted-foreground">{selectedMode.tier} Mode</div>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-mono px-2 py-0.5 border ml-auto", rollTypeBadge(selectedMode.rollType))}>
                      {selectedMode.rollType}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-5 leading-relaxed">
                    {selectedMode.rollType === "HARMONY" && "Rolling 2d20 — keep highest. "}
                    {selectedMode.rollType === "NORMAL" && "Rolling 1d20. "}
                    {selectedMode.rollType === "DISCORD" && "Rolling 2d20 — keep lowest. "}
                    Thread Check: {str.checkAttr?.toUpperCase()} {fmtMod(mod)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedMode(null)} className="px-4 py-2.5 text-xs font-mono border border-border text-muted-foreground hover:text-foreground transition-colors">
                      ← CHANGE
                    </button>
                    <button
                      onClick={doRoll}
                      disabled={pending || !castIntent.trim() || dicePreferencesLoading}
                      className={cn(
                        "flex-1 py-3 font-[family-name:'Cinzel',serif] font-bold text-sm border-2 tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        selectedMode.rollType === "HARMONY" ? "border-chart-2 text-chart-2 hover:bg-chart-2/10" :
                        selectedMode.rollType === "DISCORD" ? "border-destructive text-destructive hover:bg-destructive/10" :
                        "border-primary text-primary hover:bg-primary/10"
                      )}
                    >
                      {pending ? "RECORDING…" : "⚄ ROLL THE THREAD"}
                    </button>
                    {rollError && <p role="alert" className="text-xs text-destructive">{rollError}</p>}
                  </div>
                </div>

              ) : (
                /* ── MODE SELECTION GRID ── */
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Select casting mode:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableModes.map(m => (
                      <button
                        key={m.name}
                        onClick={() => setSelectedMode(m)}
                        className="text-left p-2.5 border border-border hover:border-primary/50 bg-background transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-mono text-xs text-foreground group-hover:text-primary transition-colors">{m.name}</span>
                          <span className={cn("text-[9px] font-mono px-1.5 py-0.5 border", rollTypeBadge(m.rollType))}>{m.rollType}</span>
                        </div>
                        {m.tier !== "Other" && (
                          <span className="text-[9px] font-mono text-muted-foreground/60">{m.tier}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PL table */}
          <table className="w-full text-left font-mono text-xs mb-3">
            <thead>
              <tr className="text-muted-foreground/50 border-b border-border/30">
                <th className="pb-1 font-normal w-8 text-center"><GameTerm term="pl">PL</GameTerm></th>
                <th className="pb-1 font-normal w-10 text-center"><GameTerm term="tp">TP</GameTerm></th>
                <th className="pb-1 font-normal w-10 text-center"><GameTerm term="dc">DC</GameTerm></th>
                <th className="pb-1 font-normal">Example effect / scale</th>
                <th className="pb-1 font-normal w-16 text-right">Cast</th>
              </tr>
            </thead>
            <tbody>
              {str.levels.map((lvl: any) => (
                <tr key={lvl.pl} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                  <td className="py-1.5 text-center text-muted-foreground">{lvl.pl}</td>
                  <td className="py-1.5 text-center text-primary">{lvl.cost}</td>
                  <td className="py-1.5 text-center">{lvl.dc}</td>
                  <td className="py-1.5 pr-2 leading-relaxed">{lvl.effect}</td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => initiateCast(lvl.pl, lvl.cost, lvl.dc, lvl.effect)}
                      disabled={!!animDice || lostThread}
                      className="px-2 py-0.5 text-[10px] border border-chart-2/50 text-chart-2 hover:bg-chart-2/10 transition-colors font-mono"
                    >
                      CAST
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-2 border border-border/30 bg-muted/10">
              <span className="text-primary font-bold block mb-0.5">MISHAP</span>
              <span className="text-muted-foreground leading-relaxed">{str.mishap}</span>
            </div>
            <div className="p-2 border border-destructive/20 bg-destructive/5">
              <span className="text-destructive font-bold block mb-0.5">SNAPBACK</span>
              <span className="text-muted-foreground leading-relaxed">{str.snapback}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
