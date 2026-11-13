import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCharacterQueryKey, getListRollsQueryKey, useCreateRoll, type GameplayRollInput,
} from "@workspace/api-client-react";
import { useAuth } from "@/components/auth/auth-context";

export function useGameplayRoll() {
  const client = useQueryClient();
  const { user } = useAuth();
  const create = useCreateRoll();
  const retry = useRef<{ body: string; requestId: string; userId?: number } | null>(null);
  return async (data: Omit<GameplayRollInput, "requestId">) => {
    const body = JSON.stringify(data);
    if (!retry.current || retry.current.body !== body || retry.current.userId !== user?.id) {
      retry.current = { body, requestId: crypto.randomUUID(), userId: user?.id };
    }
    const requestId = retry.current.requestId;
    const roll = await create.mutateAsync({ data: { ...data, requestId } });
    if (retry.current?.requestId === requestId) retry.current = null;
    void client.invalidateQueries({ queryKey: [...getListRollsQueryKey(), user?.id] });
    if (data.characterId !== undefined && data.tensionContribution !== undefined) {
      void client.invalidateQueries({ queryKey: getGetCharacterQueryKey(data.characterId) });
    }
    if (data.weavekeeperCreatureId !== undefined) window.dispatchEvent(new Event("weavekeeper-bestiary-updated"));
    return roll;
  };
}

export function rollErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Roll could not be saved. Please try again.";
}
