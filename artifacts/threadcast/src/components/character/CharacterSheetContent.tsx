import { useState, useEffect, useCallback } from "react";
import { Character, CharacterData } from "@workspace/api-client-react";
import { ATTRIBUTES, calculateModifier, formatModifier } from "@/lib/game-rules";
import { findString, ATTR_LABELS, type AffinityString } from "@/lib/affinity-data";
import { TensionGauge } from "@/components/shared/TensionGauge";
import { BurnoutTrack } from "@/components/shared/BurnoutTrack";
import { useDiceRoller } from "@/components/shared/DiceRoller";
import { GameTerm } from "@/components/shared/GameTerm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CharacterSheetContentProps {
  character: Character;
  onUpdate: (data: Partial<Character>) => void;
}

function CastStringPanel({
  str,
  attrScore,
  characterName,
  onCast,
}: {
  str: AffinityString;
  attrScore: number;
  characterName: string;
  onCast: (cost: number) => void;
}) {
  const { openRoll } = useDiceRoller();
  const mod = calculateModifier(attrScore);

  return (
    <div className="border border-border bg-background">
      <div className="px-4 py-3 border-b border-border/50 flex items-baseline justify-between gap-3">
        <span className="font-[family-name:'Cinzel',serif] text-base text-chart-2">{str.name}</span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          <GameTerm term="thread check">Thread Check</GameTerm>: {ATTR_LABELS[str.checkAttr]} {formatModifier(mod)}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs font-mono text-muted-foreground mb-3 leading-relaxed">{str.flavor}</p>
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="text-muted-foreground/60 border-b border-border/30">
              <th className="pb-1 font-normal w-8 text-center"><GameTerm term="pl">PL</GameTerm></th>
              <th className="pb-1 font-normal w-10 text-center"><GameTerm term="tp">TP</GameTerm></th>
              <th className="pb-1 font-normal w-10 text-center"><GameTerm term="dc">DC</GameTerm></th>
              <th className="pb-1 font-normal">Effect</th>
              <th className="pb-1 font-normal w-16 text-right">Cast</th>
            </tr>
          </thead>
          <tbody>
            {str.levels.map(lvl => (
              <tr key={lvl.pl} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                <td className="py-2 text-center text-muted-foreground">{lvl.pl}</td>
                <td className="py-2 text-center text-primary">{lvl.cost}</td>
                <td className="py-2 text-center">{lvl.dc}</td>
                <td className="py-2 pr-2 leading-relaxed">{lvl.effect}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => {
                      onCast(lvl.cost);
                      openRoll(`${str.name} PL${lvl.pl} (DC ${lvl.dc})`, mod, characterName);
                    }}
                    className="px-2 py-1 text-[10px] border border-chart-2/50 text-chart-2 hover:bg-chart-2/10 transition-colors font-mono"
                  >
                    CAST
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
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
    </div>
  );
}

export function CharacterSheetContent({ character, onUpdate }: CharacterSheetContentProps) {
  const { openRoll } = useDiceRoller();
  const [localData, setLocalData] = useState<CharacterData>(character.data as CharacterData);

  useEffect(() => {
    setLocalData(character.data as CharacterData);
  }, [character.data]);

  const updateField = useCallback(
    (field: string, value: unknown) => {
      setLocalData(prev => {
        const next = { ...prev, [field]: value };
        onUpdate({ data: next });
        return next;
      });
    },
    [onUpdate]
  );

  const updateNested = useCallback(
    (parent: string, field: string, value: unknown) => {
      setLocalData(prev => {
        const parentObj = (prev[parent] as Record<string, unknown>) || {};
        const next = { ...prev, [parent]: { ...parentObj, [field]: value } };
        onUpdate({ data: next });
        return next;
      });
    },
    [onUpdate]
  );

  const attrs = (localData.attributes as Record<string, number>) || {};
  const vp = (localData.vitalityPoints as { current: number; max: number }) || { current: 0, max: 0 };
  const tension = (localData.tension as { current: number; pool: number; safeLimit: number }) || {
    current: 0,
    pool: 0,
    safeLimit: 0,
  };
  const burnout = (localData.burnout as number) || 0;
  const skills = (localData.skills as { name: string; attribute: string; attuned: boolean }[]) || [];
  const strings = (localData.strings as string[]) || [];
  const techniques = (localData.techniques as { name: string; mode?: string; description?: string }[]) || [];
  const rb = (localData.refinementBonus as number) || 2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-4 md:p-6 bg-background">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-4 space-y-4">

        {/* Header */}
        <div className="border border-border p-4 bg-card">
          <input
            className="w-full bg-transparent text-3xl font-[family-name:'Cinzel',serif] text-primary focus:outline-none mb-2"
            value={character.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Character Name"
          />
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground uppercase">
            <div>
              <span className="opacity-50">Lvl</span>
              <input
                type="number"
                className="w-full bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-border"
                value={character.level}
                onChange={e => onUpdate({ level: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <span className="opacity-50"><GameTerm term="affinity">Affinity</GameTerm></span>
              <input
                className="w-full bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-border"
                value={character.affinity || ""}
                onChange={e => onUpdate({ affinity: e.target.value })}
                placeholder="None"
              />
            </div>
            <div className="col-span-2">
              <span className="opacity-50"><GameTerm term="mode">Mode</GameTerm></span>
              <input
                className="w-full bg-transparent text-foreground focus:outline-none border-b border-transparent focus:border-border"
                value={character.mode || ""}
                onChange={e => onUpdate({ mode: e.target.value })}
                placeholder="None"
              />
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="border border-border p-4 bg-card">
          <h3 className="text-xs font-[family-name:'Cinzel',serif] text-muted-foreground mb-3 uppercase tracking-widest">
            Attributes
          </h3>
          <div className="space-y-0.5">
            {ATTRIBUTES.map(attr => {
              const score = attrs[attr.key] || 10;
              const mod = calculateModifier(score);
              return (
                <div
                  key={attr.key}
                  className="flex items-center justify-between font-mono text-sm py-1.5 border-b border-border/30 last:border-0 hover:bg-muted/30 px-1"
                >
                  <GameTerm term={attr.key} className="w-16 text-muted-foreground text-xs">
                    {attr.abbr}
                  </GameTerm>
                  <input
                    type="number"
                    className="w-12 bg-transparent text-center focus:outline-none"
                    value={score}
                    onChange={e => updateNested("attributes", attr.key, parseInt(e.target.value) || 10)}
                  />
                  <button
                    className="w-14 text-center text-primary hover:bg-primary/15 cursor-pointer rounded transition-colors py-0.5"
                    onClick={() => openRoll(`${attr.name} Check`, mod, character.name)}
                    title={`Roll ${attr.name} Check`}
                  >
                    {formatModifier(mod)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vitality & Defenses */}
        <div className="border border-border p-4 bg-card space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1 font-mono text-xs">
              <GameTerm term="vitality points" className="text-muted-foreground uppercase tracking-wide">
                Vitality Points
              </GameTerm>
              <span className={vp.current <= vp.max * 0.25 ? "text-destructive" : "text-accent"}>
                {vp.current} / {vp.max}
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <button
                className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted font-mono text-lg"
                onClick={() => updateNested("vitalityPoints", "current", Math.max(0, vp.current - 1))}
              >
                −
              </button>
              <div className="flex-1 h-2.5 bg-background border border-border relative overflow-hidden">
                <div
                  className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
                    vp.current <= vp.max * 0.25
                      ? "bg-destructive"
                      : vp.current <= vp.max * 0.5
                      ? "bg-primary"
                      : "bg-accent"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (vp.current / vp.max) * 100))}%` }}
                />
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted font-mono text-lg"
                onClick={() => updateNested("vitalityPoints", "current", Math.min(vp.max, vp.current + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 border border-border/50 bg-background">
              <GameTerm term="guard rating" className="text-[10px] text-muted-foreground font-mono mb-1 block">
                GUARD RATING
              </GameTerm>
              <div className="text-2xl font-mono">{(localData.guardRating as number) || 10}</div>
            </div>
            <div className="text-center p-2 border border-border/50 bg-background">
              <GameTerm term="ward rating" className="text-[10px] text-muted-foreground font-mono mb-1 block">
                WARD RATING
              </GameTerm>
              <div className="text-2xl font-mono">{(localData.wardRating as number) || 10}</div>
            </div>
          </div>
        </div>

        {/* Tension & Burnout */}
        <div className="border border-border p-5 bg-card flex flex-col items-center">
          <TensionGauge
            current={tension.current}
            max={tension.pool}
            safeLimit={tension.safeLimit}
            onSpend={() => updateNested("tension", "current", Math.min(tension.pool, tension.current + 1))}
            onRelease={() => updateNested("tension", "current", Math.max(0, tension.current - 1))}
            className="mb-6"
          />
          <BurnoutTrack level={burnout} className="w-full" />
          <div className="flex gap-2 w-full mt-3 justify-center">
            <button
              className="px-3 py-1 text-xs border border-border hover:bg-muted font-mono transition-colors"
              onClick={() => updateField("burnout", Math.max(0, burnout - 1))}
            >
              − BURN
            </button>
            <button
              className="px-3 py-1 text-xs border border-destructive/40 text-destructive/80 hover:bg-destructive/10 font-mono transition-colors"
              onClick={() => updateField("burnout", Math.min(6, burnout + 1))}
            >
              + BURN
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-8 bg-card border border-border flex flex-col min-h-0">
        <Tabs defaultValue="skills" className="w-full flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-11 justify-start">
            {["skills", "strings", "techniques", "notes"].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="font-[family-name:'Cinzel',serif] text-xs rounded-none data-[state=active]:bg-muted data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary h-full px-5 capitalize tracking-wide"
              >
                <GameTerm term={tab}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</GameTerm>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* SKILLS */}
          <TabsContent value="skills" className="p-5 flex-1 outline-none m-0 overflow-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead>
                <tr className="text-muted-foreground/60 border-b border-border text-xs">
                  <th className="pb-2 font-normal">Skill</th>
                  <th className="pb-2 font-normal text-center w-14">
                    <GameTerm term="attuned">Attuned</GameTerm>
                  </th>
                  <th className="pb-2 font-normal text-center w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill, idx) => {
                  const attrKey = skill.attribute.toLowerCase().slice(0, 3);
                  const attrScore = attrs[attrKey] || 10;
                  const mod = calculateModifier(attrScore);
                  const total = mod + (skill.attuned ? rb : 0);

                  return (
                    <tr key={idx} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="py-2.5">
                        <GameTerm term={skill.name.toLowerCase()} className="text-foreground">
                          {skill.name}
                        </GameTerm>
                        <span className="ml-2 text-[10px] text-muted-foreground/50">
                          <GameTerm term={attrKey}>{skill.attribute}</GameTerm>
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          className="w-5 h-5 inline-flex items-center justify-center border border-border/60 hover:border-primary/50 transition-colors text-xs"
                          onClick={() => {
                            const next = [...skills];
                            next[idx] = { ...next[idx], attuned: !skill.attuned };
                            updateField("skills", next);
                          }}
                        >
                          {skill.attuned ? <span className="text-primary">●</span> : ""}
                        </button>
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          className="text-primary hover:bg-primary/15 px-2 py-0.5 rounded transition-colors font-bold"
                          onClick={() => openRoll(`${skill.name} Check`, total, character.name)}
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

          {/* STRINGS */}
          <TabsContent value="strings" className="flex-1 outline-none m-0 overflow-auto p-4 space-y-4">
            {strings.length === 0 && (
              <p className="text-muted-foreground font-mono text-sm p-2">No Strings attuned.</p>
            )}
            {strings.map((sName, i) => {
              const strData = findString(sName);
              const checkAttrKey = strData?.checkAttr ?? "ths";
              const attrScore = attrs[checkAttrKey] || 10;

              if (!strData) {
                return (
                  <div key={i} className="border border-border p-4 font-mono text-sm">
                    <span className="text-primary">{sName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">(no data — see Compendium)</span>
                  </div>
                );
              }

              return (
                <CastStringPanel
                  key={i}
                  str={strData}
                  attrScore={attrScore}
                  characterName={character.name}
                  onCast={cost => {
                    updateNested("tension", "current", Math.min(tension.pool, tension.current + cost));
                  }}
                />
              );
            })}
          </TabsContent>

          {/* TECHNIQUES */}
          <TabsContent value="techniques" className="flex-1 outline-none m-0 overflow-auto p-4 space-y-3">
            {techniques.length === 0 && (
              <p className="text-muted-foreground font-mono text-sm p-2">No Techniques learned.</p>
            )}
            {techniques.map((tech, i) => {
              const ctrScore = attrs["ctr"] || 10;
              const ctrMod = calculateModifier(ctrScore);

              return (
                <TechniqueCard
                  key={i}
                  name={tech.name}
                  mode={tech.mode}
                  description={tech.description}
                  ctrMod={ctrMod}
                  characterName={character.name}
                />
              );
            })}
          </TabsContent>

          {/* NOTES */}
          <TabsContent value="notes" className="p-0 flex-1 outline-none m-0 flex flex-col">
            <textarea
              className="flex-1 w-full min-h-[400px] bg-transparent border-0 p-5 font-mono text-sm text-foreground focus:outline-none resize-none placeholder:text-muted-foreground/30"
              placeholder="Character notes, inventory, campaign log..."
              value={(localData.notes as string) || ""}
              onChange={e => updateField("notes", e.target.value)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TechniqueCard({
  name,
  mode,
  description,
  ctrMod,
  characterName,
}: {
  name: string;
  mode?: string;
  description?: string;
  ctrMod: number;
  characterName: string;
}) {
  const { openRoll } = useDiceRoller();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border bg-background hover:border-primary/30 transition-colors">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:'Cinzel',serif] text-foreground">{name}</span>
          {mode && (
            <GameTerm term={mode.toLowerCase()} className="text-[10px] font-mono text-muted-foreground uppercase">
              {mode}
            </GameTerm>
          )}
        </div>
        <span className="text-muted-foreground text-xs ml-2">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/40">
          {description ? (
            <p className="font-mono text-xs text-muted-foreground leading-relaxed mt-3">{description}</p>
          ) : (
            <p className="font-mono text-xs text-muted-foreground/50 mt-3 italic">No description recorded.</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => openRoll(`${name} — Thread Check`, ctrMod, characterName)}
              className="px-3 py-1.5 text-xs border border-primary/50 text-primary hover:bg-primary/10 font-mono transition-colors"
            >
              <GameTerm term="thread check" className="text-primary">THREAD CHECK</GameTerm>
              <span className="ml-2 opacity-70">CTR {formatModifier(ctrMod)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
