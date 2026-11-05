import { Link, useRoute } from "wouter";
import { ArrowLeft, ChevronRight, BookOpen } from "lucide-react";
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
    return <div className="tc-sheet-page"><div className="tc-sheet-placeholder" role="status" aria-label="Loading character sheet"><div className="flex items-center gap-3 text-primary mb-8"><BookOpen size={20} /><span>Opening your character journal…</span></div><Skeleton className="h-24 w-2/3 mb-8" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div><Skeleton className="h-72 mt-8" /></div></div>;
  }

  if (!character) {
    return <div className="tc-sheet-page"><div className="tc-sheet-placeholder text-center"><BookOpen className="mx-auto text-primary mb-5" size={32} /><h1 className="font-serif text-3xl mb-3">This journal could not be opened</h1><p className="text-muted-foreground mb-6">The character may be unavailable, or the connection may have been interrupted.</p><Link href="/characters" className="inline-flex items-center gap-2 text-primary"><ArrowLeft size={16} />Back to characters</Link></div></div>;
  }

  return <div className="tc-sheet-page"><nav className="tc-sheet-breadcrumb" aria-label="Breadcrumb"><Link href="/characters"><ArrowLeft size={14} />Characters</Link><ChevronRight size={12} aria-hidden="true" /><span aria-current="page">{character.name}</span></nav><CharacterSheetContent character={character} onUpdate={handleUpdate} onCastState={onCastState} beforeCast={beforeCast} onLocalEdit={onLocalEdit} onLocalSave={onLocalSave} /></div>;
}
