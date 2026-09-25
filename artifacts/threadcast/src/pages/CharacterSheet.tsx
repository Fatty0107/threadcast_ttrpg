import { useRoute } from "wouter";
import { useGetCharacter, useUpdateCharacter, getGetCharacterQueryKey, getListCharactersQueryKey, type Character } from "@workspace/api-client-react";
import { CharacterSheetContent } from "@/components/character/CharacterSheetContent";
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function CharacterSheet() {
  const [, params] = useRoute("/characters/:id");
  const characterId = params?.id ? parseInt(params.id) : 0;
  
  const { data: character, isLoading } = useGetCharacter(characterId, {
    query: { enabled: !!characterId, refetchInterval: 30_000 } as any
  });
  const updateMutation = useUpdateCharacter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateQueue = useRef<Promise<unknown>>(Promise.resolve());
  const revisionRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const currentCharacterRef = useRef<number | null>(null);
  useEffect(() => {
    if (currentCharacterRef.current !== characterId) {
      currentCharacterRef.current = characterId;
      dirtyRef.current = false;
      revisionRef.current = character?.version ?? null;
      return;
    }
    if (character && !dirtyRef.current) revisionRef.current = character.version;
  }, [character?.version, characterId]);
  
  const handleUpdate = useCallback((updateData: any) => {
    const save = updateQueue.current.catch(() => undefined).then(async () => {
      const updated = await updateMutation.mutateAsync({
        id: characterId, data: { ...updateData, expectedVersion: revisionRef.current ?? character?.version },
      });
      revisionRef.current = updated.version;
      queryClient.setQueryData(getGetCharacterQueryKey(characterId), updated);
      return updated;
    });
    updateQueue.current = save;
    return save.then(() => undefined).catch(error => {
      void queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey(characterId) });
      toast({ variant: "destructive", title: "Sheet changes not saved",
        description: "This sheet may be out of date. Reload to see the latest resources before making another change." });
      throw error;
    });
  }, [characterId, character?.version, updateMutation.mutateAsync, toast, queryClient]);
  const onCastState = useCallback((updated: Character) => {
    revisionRef.current = updated.version;
    queryClient.setQueryData(getGetCharacterQueryKey(characterId), updated);
    void queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
  }, [characterId, queryClient]);
  const beforeCast = useCallback(() => updateQueue.current, []);
  const onLocalEdit = useCallback(() => { dirtyRef.current = true; }, []);
  const onLocalSave = useCallback(() => { dirtyRef.current = false; }, []);

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[800px] w-full" /></div>;
  }

  if (!character) {
    return <div className="p-8 text-center font-mono">Character not found.</div>;
  }

  return <CharacterSheetContent character={character} onUpdate={handleUpdate} onCastState={onCastState} beforeCast={beforeCast} onLocalEdit={onLocalEdit} onLocalSave={onLocalSave} />;
}
