import { useAuth } from "@/components/auth/AuthContext";
import { CharacterSheetContent } from "@/components/character/CharacterSheetContent";
import { Character } from "@workspace/api-client-react";

const DEMO_CHARACTER: Character = {
  id: 999,
  userId: 999,
  name: "Meren Vail",
  level: 7,
  affinity: "Water",
  mode: "Anchor",
  isDraft: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  data: {
    attributes: { pot: 14, ctr: 16, res: 13, acu: 12, pre: 11, ths: 15 },
    vitalityPoints: { current: 30, max: 30 },
    tension: { current: 4, pool: 18, safeLimit: 9 },
    burnout: 0,
    guardRating: 12,
    wardRating: 16,
    background: "Guild-Raised — Scaled Guard",
    guild: "Scaled Guard",
    primaryMode: "Anchor",
    refinementBonus: 4,
    strings: ["The Flow String", "The Pressure String", "The Still String", "The Vital String", "The Tide String"],
    techniques: [{name: "Fortify"}, {name: "Surge Absorb"}, {name: "Shared Ground"}, {name: "Tidal Lock"}],
    skills: [
      { name: "Combat Forms", attribute: "RES", attuned: true },
      { name: "Ward Craft", attribute: "CTR", attuned: true },
      { name: "Weave Reading", attribute: "THS", attuned: true }
    ],
    notes: "Signature: Pale blue-green luminescence at hands; resonant tone like water through stone channels.",
    signature: { visual: "", auditory: "", tactile: "" },
  }
};

export default function Weavekeeper() {
  const { user } = useAuth();

  if (user?.role !== "weavekeeper") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center font-mono space-y-4">
          <h1 className="text-4xl text-destructive font-bold">403</h1>
          <p className="text-muted-foreground">Access denied. Weavekeeper clearance required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Sidebar Tools */}
      <div className="lg:col-span-3 space-y-6">
        <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-primary">Weavekeeper</h1>
        
        <div className="border border-border bg-card p-4">
          <h3 className="font-mono text-sm text-muted-foreground mb-4 uppercase tracking-widest">Environment Tension</h3>
          <div className="h-4 w-full bg-background border border-border">
            <div className="h-full bg-destructive w-1/3"></div>
          </div>
          <p className="text-xs font-mono mt-2 text-right">High (3/10)</p>
        </div>

        <div className="border border-border bg-card p-4">
          <h3 className="font-mono text-sm text-muted-foreground mb-4 uppercase tracking-widest">Campaign Notes</h3>
          <textarea 
            className="w-full h-32 bg-background border border-border p-2 font-mono text-xs focus:outline-none focus:border-primary text-foreground resize-none"
            placeholder="Log events here..."
          />
        </div>
      </div>

      {/* Right Content - Demo Sheet */}
      <div className="lg:col-span-9">
        <div className="mb-4 flex items-center gap-4 border-b border-border pb-4">
          <h2 className="text-xl font-mono text-foreground">DEMO TARGET:</h2>
          <span className="bg-primary/20 text-primary px-2 py-1 text-sm font-mono border border-primary/50">Meren Vail</span>
        </div>
        <CharacterSheetContent 
          character={DEMO_CHARACTER} 
          onUpdate={(update) => console.log("Demo update:", update)} 
        />
      </div>
    </div>
  );
}
