import { useState, useEffect, useRef, useCallback } from "react";
import { Character, CharacterData } from "@workspace/api-client-react";
import { ATTRIBUTES, calculateModifier, formatModifier } from "@/lib/game-rules";
import { TensionGauge } from "@/components/shared/TensionGauge";
import { BurnoutTrack } from "@/components/shared/BurnoutTrack";
import { useDiceRoller } from "@/components/shared/DiceRoller";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface CharacterSheetContentProps {
  character: Character;
  onUpdate: (data: Partial<Character>) => void;
}

export function CharacterSheetContent({ character, onUpdate }: CharacterSheetContentProps) {
  const { openRoll } = useDiceRoller();
  const [localData, setLocalData] = useState<CharacterData>(character.data as CharacterData);
  
  // Update local data when character changes from props (e.g. initial load)
  useEffect(() => {
    setLocalData(character.data as CharacterData);
  }, [character.data]);

  const updateField = useCallback((field: string, value: any) => {
    setLocalData(prev => {
      const next = { ...prev, [field]: value };
      onUpdate({ data: next });
      return next;
    });
  }, [onUpdate]);

  const updateNested = useCallback((parent: string, field: string, value: any) => {
    setLocalData(prev => {
      const parentObj = (prev[parent] as Record<string, any>) || {};
      const next = { ...prev, [parent]: { ...parentObj, [field]: value } };
      onUpdate({ data: next });
      return next;
    });
  }, [onUpdate]);

  const attrs = (localData.attributes as any) || {};
  const vp = (localData.vitalityPoints as any) || { current: 0, max: 0 };
  const tension = (localData.tension as any) || { current: 0, pool: 0, safeLimit: 0 };
  const burnout = (localData.burnout as number) || 0;
  const skills = (localData.skills as any[]) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-4 md:p-6 bg-background">
      {/* LEFT COLUMN: Core Stats & Gauges */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Header */}
        <div className="border border-border p-4 bg-card">
          <input 
            className="w-full bg-transparent text-3xl font-[family-name:'Cinzel',serif] text-primary focus:outline-none mb-2"
            value={character.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Character Name"
          />
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground uppercase">
            <div>
              <span className="opacity-50">Lvl</span>
              <input 
                type="number" 
                className="w-full bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-border"
                value={character.level}
                onChange={(e) => onUpdate({ level: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <span className="opacity-50">Affinity</span>
              <input 
                className="w-full bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-border"
                value={character.affinity || ""}
                onChange={(e) => onUpdate({ affinity: e.target.value })}
                placeholder="None"
              />
            </div>
            <div className="col-span-2">
              <span className="opacity-50">Mode</span>
              <input 
                className="w-full bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-border"
                value={character.mode || ""}
                onChange={(e) => onUpdate({ mode: e.target.value })}
                placeholder="None"
              />
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="border border-border p-4 bg-card">
          <h3 className="text-sm font-[family-name:'Cinzel',serif] text-muted-foreground mb-4">Attributes</h3>
          <div className="space-y-1">
            {ATTRIBUTES.map(attr => {
              const score = attrs[attr.key] || 10;
              const mod = calculateModifier(score);
              return (
                <div key={attr.key} className="flex items-center justify-between font-mono text-sm py-1 border-b border-border/50 last:border-0 hover:bg-muted/50">
                  <span className="w-16">{attr.abbr}</span>
                  <input 
                    type="number" 
                    className="w-12 bg-transparent text-center focus:outline-none"
                    value={score}
                    onChange={(e) => updateNested('attributes', attr.key, parseInt(e.target.value) || 10)}
                  />
                  <button 
                    className="w-12 text-center text-primary hover:bg-primary/20 cursor-pointer rounded"
                    onClick={() => openRoll(`${attr.name} Check`, mod)}
                  >
                    {formatModifier(mod)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vitality & Defenses */}
        <div className="border border-border p-4 bg-card space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 font-mono text-xs">
              <span className="text-muted-foreground">VITALITY POINTS</span>
              <span className={vp.current <= vp.max * 0.25 ? "text-destructive" : "text-accent"}>
                {vp.current} / {vp.max}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <button 
                className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted font-mono"
                onClick={() => updateNested('vitalityPoints', 'current', Math.max(0, vp.current - 1))}
              >-</button>
              <div className="flex-1 h-3 bg-background border border-border relative">
                <div 
                  className={`absolute left-0 top-0 bottom-0 transition-all ${vp.current <= vp.max * 0.25 ? "bg-destructive" : vp.current <= vp.max * 0.5 ? "bg-primary" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, Math.max(0, (vp.current / vp.max) * 100))}%` }}
                />
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted font-mono"
                onClick={() => updateNested('vitalityPoints', 'current', Math.min(vp.max, vp.current + 1))}
              >+</button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="text-center p-2 border border-border/50 bg-background">
                <div className="text-[10px] text-muted-foreground font-mono mb-1">GUARD RATING</div>
                <div className="text-xl font-mono">{localData.guardRating as number || 10}</div>
             </div>
             <div className="text-center p-2 border border-border/50 bg-background">
                <div className="text-[10px] text-muted-foreground font-mono mb-1">WARD RATING</div>
                <div className="text-xl font-mono">{localData.wardRating as number || 10}</div>
             </div>
          </div>
        </div>

        {/* Tension & Burnout */}
        <div className="border border-border p-6 bg-card flex flex-col items-center">
           <TensionGauge 
             current={tension.current} 
             max={tension.pool} 
             safeLimit={tension.safeLimit}
             onSpend={() => updateNested('tension', 'current', tension.current + 1)}
             onRelease={() => updateNested('tension', 'current', Math.max(0, tension.current - 1))}
             className="mb-8"
           />
           <BurnoutTrack 
             level={burnout} 
             className="w-full" 
           />
           <div className="flex gap-2 w-full mt-4 justify-center">
             <button 
               className="px-2 py-1 text-xs border border-border hover:bg-muted font-mono"
               onClick={() => updateField('burnout', Math.max(0, burnout - 1))}
             >- BURN</button>
             <button 
               className="px-2 py-1 text-xs border border-border hover:bg-muted font-mono"
               onClick={() => updateField('burnout', Math.min(6, burnout + 1))}
             >+ BURN</button>
           </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Tabs */}
      <div className="lg:col-span-8 bg-card border border-border flex flex-col">
        <Tabs defaultValue="skills" className="w-full flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-12 justify-start overflow-x-auto">
            <TabsTrigger value="skills" className="font-[family-name:'Cinzel',serif] rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-6">Skills</TabsTrigger>
            <TabsTrigger value="strings" className="font-[family-name:'Cinzel',serif] rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-6">Strings</TabsTrigger>
            <TabsTrigger value="techniques" className="font-[family-name:'Cinzel',serif] rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-6">Techniques</TabsTrigger>
            <TabsTrigger value="notes" className="font-[family-name:'Cinzel',serif] rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-6">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="p-6 flex-1 outline-none m-0">
            <table className="w-full text-left font-mono text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="pb-2 font-normal">Skill</th>
                  <th className="pb-2 font-normal text-center">Attr</th>
                  <th className="pb-2 font-normal text-center">Attuned</th>
                  <th className="pb-2 font-normal text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill, idx) => {
                  const attrScore = attrs[skill.attribute.toLowerCase()] || 10;
                  const mod = calculateModifier(attrScore);
                  const rb = (localData.refinementBonus as number) || 2;
                  const total = mod + (skill.attuned ? rb : 0);
                  
                  return (
                    <tr key={idx} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-3">{skill.name}</td>
                      <td className="py-3 text-center text-muted-foreground">{skill.attribute}</td>
                      <td className="py-3 text-center">
                        <button 
                          className="w-5 h-5 inline-flex items-center justify-center border border-border"
                          onClick={() => {
                            const nextSkills = [...skills];
                            nextSkills[idx].attuned = !skill.attuned;
                            updateField('skills', nextSkills);
                          }}
                        >
                          {skill.attuned ? "●" : ""}
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        <button 
                          className="text-primary hover:bg-primary/20 px-2 py-1 rounded"
                          onClick={() => openRoll(`${skill.name} Check`, total)}
                        >
                          {formatModifier(total)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="strings" className="p-6 flex-1 outline-none m-0 text-muted-foreground font-mono">
            {/* Minimal strings placeholder for character sheet. True reference is in compendium. */}
            <p className="mb-4">Strings currently active for this character. Refer to Compendium for full details.</p>
            <div className="space-y-4">
              {(localData.strings as string[] || []).map((s, i) => (
                <div key={i} className="border border-border p-4">
                  <h4 className="font-[family-name:'Cinzel',serif] text-primary text-lg">{s}</h4>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="techniques" className="p-6 flex-1 outline-none m-0 text-muted-foreground font-mono">
            <p className="mb-4">Unlocked Techniques</p>
            <div className="space-y-4">
              {(localData.techniques as any[] || []).map((t, i) => (
                <div key={i} className="border border-border p-4">
                  <h4 className="font-[family-name:'Cinzel',serif] text-foreground">{t.name || t}</h4>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="p-0 flex-1 outline-none m-0 flex flex-col">
            <textarea 
              className="flex-1 w-full h-full min-h-[400px] bg-transparent border-0 p-6 font-mono text-sm text-foreground focus:outline-none resize-none"
              placeholder="Character notes, inventory, campaign log..."
              value={localData.notes as string || ""}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
