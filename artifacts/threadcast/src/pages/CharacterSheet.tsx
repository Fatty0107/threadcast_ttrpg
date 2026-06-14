import { useRoute } from "wouter";
import { useGetCharacter, useUpdateCharacter } from "@workspace/api-client-react";
import { CharacterSheetContent } from "@/components/character/CharacterSheetContent";
import { useRef, useCallback, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CharacterSheet() {
  const [, params] = useRoute("/characters/:id");
  const characterId = params?.id ? parseInt(params.id) : 0;
  
  const { data: character, isLoading } = useGetCharacter(characterId, {
    query: { enabled: !!characterId } as any
  });
  const updateMutation = useUpdateCharacter();
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleUpdate = useCallback((updateData: any) => {
    // Optimistic cache update would be ideal here, but for simplicity we'll just debounce the API call
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      updateMutation.mutate({ id: characterId, data: updateData });
    }, 1000);
  }, [characterId, updateMutation]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-[800px] w-full" /></div>;
  }

  if (!character) {
    return <div className="p-8 text-center font-mono">Character not found.</div>;
  }

  return <CharacterSheetContent character={character} onUpdate={handleUpdate} />;
}
