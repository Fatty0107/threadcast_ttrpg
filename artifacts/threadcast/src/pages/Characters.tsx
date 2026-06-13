import { useListCharacters, useCreateCharacter } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Characters() {
  const { data: characters, isLoading } = useListCharacters();
  const createMutation = useCreateCharacter();
  const [, setLocation] = useLocation();

  const handleCreate = () => {
    createMutation.mutate({
      data: {
        name: "New Scribe",
        level: 1,
        isDraft: true,
        data: {
          attributes: { pot: 10, ctr: 10, res: 10, acu: 10, pre: 10, ths: 10 },
          vitalityPoints: { current: 16, max: 16 },
          tension: { current: 0, pool: 10, safeLimit: 10 },
          burnout: 0,
          guardRating: 8,
          wardRating: 8,
          background: "",
          guild: "",
          primaryMode: "",
          strings: [],
          techniques: [],
          skills: [],
          notes: ""
        }
      }
    }, {
      onSuccess: (char) => {
        setLocation(`/characters/${char.id}`);
      }
    });
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-foreground">Characters</h1>
        <Button 
          onClick={handleCreate} 
          disabled={createMutation.isPending}
          className="font-mono bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {createMutation.isPending ? "SCRIBING..." : "+ NEW CHARACTER"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-card border-border rounded-none" />
          ))
        ) : characters?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground font-mono">
            No active threads found. Scribe a new character to begin.
          </div>
        ) : (
          characters?.map(char => (
            <Link key={char.id} href={`/characters/${char.id}`}>
              <div className="block h-full p-5 bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-[family-name:'Cinzel',serif] text-foreground group-hover:text-primary transition-colors">
                    {char.name}
                  </h2>
                  <div className="flex gap-2">
                    {char.isDraft && <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-1 font-mono uppercase">Draft</span>}
                    <span className="text-[10px] bg-border text-foreground px-2 py-1 font-mono uppercase">Lvl {char.level}</span>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground font-mono mb-4">
                  {char.affinity || "Unknown Affinity"} • {char.mode || "No Mode"}
                </div>
                
                <div className="w-full bg-background h-2 border border-border">
                  <div 
                    className="bg-accent h-full" 
                    style={{ width: `${Math.min(((char.data?.vitalityPoints as any)?.current || 0) / ((char.data?.vitalityPoints as any)?.max || 1) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
