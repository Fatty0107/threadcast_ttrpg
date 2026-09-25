import { useRoute } from "wouter";
import { useGetCharacter, useUpdateCharacter } from "@workspace/api-client-react";
import { CharacterSheetContent } from "@/components/character/CharacterSheetContent";
import { useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function CharacterSheet() {
  const [, params] = useRoute("/characters/:id");
  const characterId = params?.id ? parseInt(params.id) : 0;
  
  const { data: character, isLoading } = useGetCharacter(characterId, {
    query: { enabled: !!characterId } as any
  });
  const updateMutation = useUpdateCharacter();
  const { toast } = useToast();
  const updateQueue = useRef<Promise<unknown>>(Promise.resolve());
  
  const handleUpdate = useCallback((updateData: any) => {
    const save = updateQueue.current.catch(() => undefined).then(() =>
      updateMutation.mutateAsync({ id: characterId, data: updateData })
    );
    updateQueue.current = save;
    return save.then(() => undefined).catch(error => {
      toast({ variant: "destructive", title: "Sheet changes not saved",
        description: "Your roll is still in the shared log. Character resources were not confirmed saved; check them and try again." });
      throw error;
    });
  }, [characterId, updateMutation.mutateAsync, toast]);

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[800px] w-full" /></div>;
  }

  if (!character) {
    return <div className="p-8 text-center font-mono">Character not found.</div>;
  }

  return <CharacterSheetContent character={character} onUpdate={handleUpdate} />;
}
