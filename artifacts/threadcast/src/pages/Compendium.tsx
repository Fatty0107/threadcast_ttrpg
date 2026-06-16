import { useState } from "react";
import { WATER_STRINGS } from "@/lib/affinity-data";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, BookOpen, Zap, Shield, Star, Eye, Waves } from "lucide-react";

function Section({ id, title, icon, children }: { id: string; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-primary/70">{icon}</span>}
          <h2 className="text-lg font-[family-name:'Cinzel',serif] text-foreground tracking-wide">{title}</h2>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border/30 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Rule({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-border/20 last:border-0">
      <span className="text-primary font-mono text-xs pt-0.5 flex-shrink-0 min-w-[120px]">{label}</span>
      <span className="text-sm font-mono text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
}

function Attr({ abbr, name, desc, analogy, example }: { abbr: string; name: string; desc: string; analogy: string; example: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("border border-border/60 p-3 transition-all cursor-pointer", open && "border-primary/30 bg-primary/3")}>
      <button className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-primary border border-primary/30 px-2 py-0.5 min-w-[40px] text-center">{abbr}</span>
            <span className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{name}</span>
          </div>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-1.5 ml-11 leading-relaxed">{desc}</p>
      </button>
      {open && (
        <div className="mt-3 ml-11 space-y-2">
          <div className="p-2 bg-background border border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">Real-Life Analogy</p>
            <p className="text-xs font-mono text-muted-foreground">{analogy}</p>
          </div>
          <div className="p-2 bg-background border border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">In-Game Example</p>
            <p className="text-xs font-mono text-foreground/80">{example}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Skill({ name, attr, analogy, example }: { name: string; attr: string; analogy: string; example: string }) {
  const [open, setOpen] = useState(false);
  const attrColors: Record<string, string> = {
    THS: "text-chart-4 border-chart-4/30",
    CTR: "text-chart-2 border-chart-2/30",
    POT: "text-destructive/80 border-destructive/30",
    RES: "text-chart-5 border-chart-5/30",
    ACU: "text-primary border-primary/30",
    PRE: "text-chart-3 border-chart-3/30",
  };
  return (
    <div className="border border-border/50 hover:border-border transition-colors">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-3 flex items-center gap-3">
        <span className={cn("font-mono text-[10px] border px-1.5 py-0.5 flex-shrink-0 min-w-[36px] text-center", attrColors[attr] || "text-muted-foreground border-border")}>{attr}</span>
        <span className="font-mono text-sm text-foreground flex-1">{name}</span>
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground/40" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
      </button>
      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-border/20 pt-2">
          <div>
            <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">Analogy</p>
            <p className="text-xs font-mono text-muted-foreground">{analogy}</p>
          </div>
          <div>
            <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-0.5">In-Game Use</p>
            <p className="text-xs font-mono text-foreground/80">{example}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const ATTRIBUTES = [
  { abbr: "POT", name: "Potency", desc: "Raw, brute magical strength. Your ability to muscle a leyline into doing what you want.", analogy: "The draw weight of a massive warbow. Two archers can have the same bow, but the stronger one pulls it back further for a devastating shot.", example: "Roll Potency to unleash a towering column of fire (Power Level 3+ Surge) or blast a heavy iron vault door off its hinges using kinetic force." },
  { abbr: "CTR", name: "Control", desc: "Magical precision, safety, and technique. Your Ward Rating and casting accuracy.", analogy: "Your archery form. A toddler with a bazooka (High POT, Low CTR) versus John Wick with a pencil (Low POT, High CTR).", example: "Roll Control to hit an enemy's Ward Rating, or to suppress your magical fingerprint so local inquisitors don't know you cast a spell." },
  { abbr: "RES", name: "Resilience", desc: "Physical toughness, stamina, and your body's ability to act as a lightning rod for magical feedback.", analogy: "Surviving a falling refrigerator landing on you, or being the designated driver for raw electrical voltage.", example: "Roll Resilience for Strain Checks when Tension exceeds your Safe Limit. It also determines your maximum Vitality Points (VP)." },
  { abbr: "ACU", name: "Acuity", desc: "Mental sharpness, perception, and tactical processing speed. Replaces Dexterity for Initiative.", analogy: "Solving a Rubik's Cube while riding a roller coaster.", example: "Roll Acuity at the start of combat for Initiative. Also roll to diagnose a magical disease or calculate structural weak points." },
  { abbr: "PRE", name: "Presence", desc: "Force of will, leadership, and emotional armor.", analogy: "Gaslighting the universe into thinking you are exactly where you are supposed to be.", example: "Roll Presence to command a retreating squad to turn back, or to keep your cool when a horror from the Hollowing tries to shatter your mind." },
  { abbr: "THS", name: "Thread Sense", desc: "Your sixth sense for the invisible, vibrating strings of the universe.", analogy: "A musician tuning a guitar purely by ear, or 'feeling' when your mom is about to walk into your messy bedroom.", example: "Roll Thread Sense to sniff out a magical assassin's signature, or to 'hear' the hum of a corrupted leyline before stepping on it." },
];

const SKILLS = [
  { name: "Thread Reach", attr: "THS", analogy: "Casting a fishing line across a massive lake to hit a tiny, specific ripple.", example: "Tap into a deeply buried leyline or grab a thread 100 feet away." },
  { name: "Surge", attr: "POT", analogy: "Slamming the NOS button to push a street racer's engine past its redline.", example: "Using Striker mode to push a magical blast to its absolute maximum destructive potential." },
  { name: "Weave Reading", attr: "THS", analogy: "Walking into a kitchen and smelling exactly what spices were used in yesterday's soup.", example: "Analyze a magical crime scene — identify what elements were cast and how long ago." },
  { name: "Signature Suppression", attr: "CTR", analogy: "Sneaking a silent fart in a crowded elevator and keeping a perfect straight face.", example: "Cast a spell in a crowded noble ballroom without your unique magical flare giving you away." },
  { name: "Strand Awareness", attr: "THS", analogy: "Recognizing your best friend's handwriting on a random scrap of paper.", example: "Actively scan a room and instantly identify who cast a spell based on their magical fingerprint." },
  { name: "Ward Craft", attr: "CTR", analogy: "Deploying a high-tech energy shield right before a missile hits.", example: "Construct a physical barrier out of raw light or stone to intercept incoming attacks." },
  { name: "Inscription", attr: "ACU", analogy: "Writing a flawless line of software code that won't crash when you run it.", example: "Write permanent runes onto a sword or craft a complex, delayed-trigger magical trap." },
  { name: "Anatomy of Magic", attr: "ACU", analogy: "Playing Operation, but the patient is made of highly volatile live wires.", example: "Medically heal an ally's broken bones without accidentally warping their DNA." },
  { name: "Combat Forms", attr: "ACU", analogy: "Executing a flawlessly rehearsed martial arts kata under pressure.", example: "Swing a sword, fire a physical bow, or parry a melee attack." },
  { name: "Swift Hands", attr: "CTR", analogy: "A magician stealing your watch off your wrist while shaking your hand.", example: "Pick a lock, pickpocket an inquisitor's key, or draw your weapon in the blink of an eye." },
  { name: "Grit", attr: "RES", analogy: "Eating a raw ghost pepper without shedding a single tear or making a face.", example: "Endure a grueling march, or shrug off the agonizing strain of conducting raw magic through your flesh." },
  { name: "Discernment", attr: "ACU", analogy: "Instantly knowing your dog is lying about whether they've been fed yet.", example: "Read a suspect's micro-expressions, detect if a noble is lying, or assess someone's true intentions." },
  { name: "Lore", attr: "ACU", analogy: "Having a Wikipedia tab open in your brain at all times.", example: "Recall ancient history, identify a rare magical beast, or remember the laws of a foreign kingdom." },
  { name: "Guild Protocol", attr: "PRE", analogy: "Knowing exactly how to talk to HR so you can get what you want without getting fired.", example: "Navigate the stiff bureaucracy of the Thaumatarch or demand an audience with a high-ranking commander." },
  { name: "Street Sense", attr: "ACU", analogy: "Knowing exactly which alleyways have the black markets and which ones have the muggers.", example: "Find a reliable information broker or navigate a chaotic, unfamiliar slum." },
  { name: "Survival", attr: "RES", analogy: "Camping in the wilderness, except the trees are actively plotting your demise.", example: "Find clean water, build a shelter in a freezing mountain pass, or track a target through a swamp." },
  { name: "Presence", attr: "PRE", analogy: "Walking into a room and having the entire crowd naturally go quiet.", example: "Terrify a captured spy into giving up a password, or inspire a crowd to start a riot." },
  { name: "Trade Craft", attr: "ACU", analogy: "A master blacksmith forging a legendary blade that perfectly balances beauty and function.", example: "Craft non-magical items, repair damaged gear, or apply magic to everyday commercial trades." },
];

const MODES = [
  { name: "Striker", tag: "Offense", desc: "Hook a leyline, yank it back like a heavy rubber band, and release it instantly. The reality string snaps back with violent, explosive force.", math: "POT + RB (Surge). Deals 2d12 damage scaling by Power Level, range 30–60ft.", fail: "Pure kinetic and elemental backlash. Broken bones, ruptured muscles, or third-degree burns." },
  { name: "Anchor", tag: "Defender", desc: "Grab a leyline and hold it absolutely, perfectly still. Lock reality in place, acting as a human titanium pin.", math: "RES + RB (Ward Craft). Creates a barrier with VP equal to 8 + (POT mod × 2) + Level. Lasts while concentrating.", fail: "All held-back tension releases instantly. Like a heavy spring-loaded door snapping back." },
  { name: "Slider", tag: "Mobility", desc: "Grab a leyline and slide yourself smoothly along its length, shifting where the physical force lands.", math: "CTR + RB (Swift Hands). Move POT mod × 5ft per Tension spent. Can redirect attacks to someone within 15ft.", fail: "Spatial lag. Your mind is at the destination, your leg is still fifty feet back. Dislocated joints." },
  { name: "Binder", tag: "Crafting", desc: "Grab multiple leylines simultaneously, braid them together, and program them to stay that way long after you walk away.", math: "ACU + RB (Inscription). Effect is permanent until broken. Complex conditions add +2 DC.", fail: "The braid unravels. Chaotic magic whips in random directions. High-pitched skull humming for a week." },
  { name: "Shearer", tag: "Decay", desc: "Introduce deliberate friction, working against the natural grain of leylines. Erode magic or physical structures.", math: "POT + RB (reverse Ward Craft). Counter spells vs. enemy roll. Erode objects: 2d10 damage per round to non-living targets.", fail: "The friction works backward into your own cells. Magic-induced rapid aging. Horrifying to witness." },
  { name: "Tensioner", tag: "Siege", desc: "Pull a leyline back... and keep pulling over multiple rounds, letting tension build to devastating levels before release.", math: "1 round = PL3. 2 rounds = PL4. 3+ rounds = PL5. Each round held, must make a Snapback Check.", fail: "Accumulated pressure detonates inside you. Your nervous system takes a lightning strike from your own spell." },
  { name: "Imprinter", tag: "Alteration", desc: "Press a pattern onto leylines, temporarily forcing a patch of the world to follow entirely new laws of physics.", math: "ACU + RB (Inscription). Zone lasts Level + CTR mod minutes. Covers 20ft radius per 3 Tension spent.", fail: "The rules apply to you instead of the room. Try to soften the ground, your bones turn to jelly." },
  { name: "Conductor", tag: "Enhancement", desc: "Hook the leyline directly into your own central nervous system and run voltage through your flesh.", math: "RES + RB (Grit). Spend 2 TP → +2 to any physical attribute for 1 round. Spend 3 TP → heal 1d8 + POT mod VP.", fail: "Internal elemental frying — organs turning to stone, spontaneous combustion, permanent sensory burnout." },
];

export default function Compendium() {
  const [activeWaterString, setActiveWaterString] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl py-8 px-4 space-y-4">
        <div className="mb-8">
          <h1 className="text-3xl font-[family-name:'Cinzel',serif] text-foreground tracking-wider mb-2">Compendium</h1>
          <p className="text-xs font-mono text-muted-foreground">The complete reference for World of Aethros mechanics. Click any section header to collapse.</p>
        </div>

        {/* Core Mechanics */}
        <Section id="core" title="Core Mechanics" icon={<BookOpen className="w-4 h-4" />}>
          <div className="space-y-1">
            <Rule label="Basic Roll">Roll a d20 + relevant modifier. Compare to the DC. Success = effect happens.</Rule>
            <Rule label="Harmony">Roll 2d20, take the higher result. Granted on all Thread Checks using your Primary Mode.</Rule>
            <Rule label="Normal">Roll 1d20. Used for Secondary Mode Thread Checks.</Rule>
            <Rule label="Discord">Roll 2d20, take the lower result. Used for Tertiary Mode casts and dangerous Power Levels.</Rule>
            <Rule label="Thread Break (Nat 20)">Critical success. The weave responds violently in your favor. Bonus effects apply.</Rule>
            <Rule label="Misfire (Nat 1)">Critical failure. A Snapback occurs automatically. No saves.</Rule>
            <Rule label="Guard Rating (GR)">Physical defense = 10 + RES modifier. Used against physical attacks.</Rule>
            <Rule label="Ward Rating (WR)">Magical defense = 10 + CTR modifier. Used against Thread attacks.</Rule>
            <Rule label="Refinement Bonus (RB)">Like Proficiency Bonus. Scales +2 → +6 as you level. Added to all Attuned skill rolls.</Rule>
            <Rule label="Initiative">Determined by Acuity (ACU), not Dexterity. Acting first is about tactical processing speed.</Rule>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 border border-primary/20 bg-primary/5">
              <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2">Mode Unlock by Level</p>
              <div className="space-y-1 text-xs font-mono text-muted-foreground">
                <div>Level 1: <span className="text-foreground">Primary Mode</span> (Harmony on all Thread Checks)</div>
                <div>Level 4: <span className="text-foreground">2 Secondary Modes</span> (Normal roll)</div>
                <div>Level 7: <span className="text-foreground">2 Tertiary Modes</span> (Discord roll)</div>
              </div>
            </div>
            <div className="p-3 border border-chart-2/20 bg-chart-2/5">
              <p className="text-[10px] font-mono text-chart-2 uppercase tracking-widest mb-2">Refinement Bonus by Level</p>
              <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                {[[1,2],[2,2],[3,2],[4,2],[5,3],[6,3],[7,4],[8,4],[9,5],[10,6]].map(([lv, rb]) => (
                  <div key={lv} className="border border-border/30 py-1">
                    <div className="text-muted-foreground/50">Lv{lv}</div>
                    <div className="text-chart-2">+{rb}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Six Core Attributes */}
        <Section id="attributes" title="The Six Core Attributes" icon={<Zap className="w-4 h-4" />}>
          <p className="text-xs font-mono text-muted-foreground mb-4">Modifier = (Score − 10) ÷ 2, rounded down. Identical math to 5e — but the stats are completely different.</p>
          <div className="space-y-2">
            {ATTRIBUTES.map(a => <Attr key={a.abbr} {...a} />)}
          </div>
          <div className="mt-4 p-3 border border-destructive/20 bg-destructive/5 text-xs font-mono text-muted-foreground space-y-1">
            <p className="text-destructive/80 font-bold mb-1">Key Differences from D&D 5e</p>
            <p>• <strong>Acuity</strong> determines Initiative — not Dexterity.</p>
            <p>• <strong>Potency</strong> (magic strength) and <strong>Control</strong> (magic accuracy) are split. High POT + Low CTR = rocket on a tricycle.</p>
            <p>• <strong>Two defenses</strong>: Guard Rating (physical, based on RES) and Ward Rating (magical, based on CTR).</p>
          </div>
        </Section>

        {/* Skills */}
        <Section id="skills" title="Skills & Refinement Bonus" icon={<Star className="w-4 h-4" />}>
          <div className="mb-4 text-xs font-mono text-muted-foreground space-y-1">
            <p>When Attuned to a skill, add your <strong className="text-foreground">Attribute modifier + Refinement Bonus (RB)</strong> to rolls.</p>
            <p>You start Attuned to skills from your Background. Additional Attunements are gained from Guild rank and level-up choices.</p>
          </div>
          <div className="space-y-1">
            {SKILLS.map(s => <Skill key={s.name} {...s} />)}
          </div>
        </Section>

        {/* Tension System */}
        <Section id="tension" title="The Tension System" icon={<Shield className="w-4 h-4" />}>
          <p className="text-xs font-mono text-muted-foreground mb-4">Every spell you cast grabs a high-tension steel cable and anchors it to your own ribs. Tension is the strain of holding reality bent to your will.</p>
          <div className="space-y-3">
            {[
              { label: "Thread Pool", color: "primary", title: "Your Absolute Hard Cap", desc: "Maximum Tension your body can physically hold. If your current Tension ever exceeds your Thread Pool, you suffer an automatic, instantaneous Snapback. No roll. No warnings. Just consequences.", formula: "Formula: 5 + (Level × 2) + THS modifier" },
              { label: "Safe Limit", color: "chart-2", title: "Your Sweat-Free Zone", desc: "The amount of Tension you can hold comfortably. As long as Tension is at or below this number, you are perfectly fine. Even 1 point above triggers danger.", formula: "Formula: 3 + (Level) + CTR modifier" },
              { label: "Strain Check", color: "chart-4", title: "The 'Can I Keep Holding This?' Roll", desc: "Made at the start of your turn if holding more Tension than your Safe Limit. Roll d20 + RES modifier. DC gets harder for every single point of Tension over the Safe Limit. Fail = Snapback.", formula: "DC = 10 + (Current Tension − Safe Limit)" },
              { label: "Power Level", color: "destructive", title: "How Hard You Pull (PL 1–5)", desc: "The scale and power of the effect. PL1 = gentle cantrip. PL5 = catastrophic reality-breach. Higher PLs add way more Tension and require higher DCs. Casting at a PL higher than your safe rating forces Discord.", formula: "PL1: Low cost/DC — PL5: High cost (8–10+ TP) / DC 19–21+" },
              { label: "Mishap", color: "chart-5", title: "The Minor Screw-Up", desc: "What happens when you fail a magic roll but didn't roll a natural 1. Roll d6 on a Mishap table: spell fails, minor feedback damage, or wild targeting. You survive.", formula: "Trigger: Failed Thread Check (non-nat 1)" },
              { label: "Snapback", color: "destructive", title: "The Disaster", desc: "The absolute worst case. Occurs on a natural 1, failed Strain Check, or exceeding Thread Pool. Roll d12 on a devastating table: massive elemental damage, unconsciousness, or permanent injuries.", formula: "Trigger: Nat 1 | Failed Strain Check | Thread Pool exceeded" },
            ].map(item => (
              <div key={item.label} className="border border-border/60 p-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className={cn("font-mono text-[10px] border px-2 py-0.5 flex-shrink-0 mt-0.5",
                    item.color === "primary" ? "border-primary/40 text-primary" :
                    item.color === "chart-2" ? "border-chart-2/40 text-chart-2" :
                    item.color === "chart-4" ? "border-chart-4/40 text-chart-4" :
                    item.color === "chart-5" ? "border-chart-5/40 text-chart-5" :
                    "border-destructive/40 text-destructive"
                  )}>{item.label}</span>
                  <div>
                    <p className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{item.title}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                    <p className="text-[10px] font-mono text-primary/60 mt-2">{item.formula}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 border border-primary/20 bg-primary/5">
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2">Innate Magic (Zero-Risk Cantrips)</p>
            <p className="text-xs font-mono text-muted-foreground mb-2">Small personal-scale magical effects drawn from your biological reserves — not the leylines. No rolls. No Tension. Completely safe.</p>
            <div className="text-xs font-mono text-muted-foreground space-y-1">
              <p>• <strong className="text-foreground">No Rolls Required</strong> — it just happens.</p>
              <p>• <strong className="text-foreground">No Strings Needed</strong> — bypasses the full magic system.</p>
              <p>• <strong className="text-foreground">Completely Safe</strong> — zero Tension buildup, zero Snapback risk.</p>
              <p>• <strong className="text-foreground">Fatigue Limit</strong> — safe up to 3 uses per hour. 4th+ use = 1 level of Fatigue.</p>
              <p className="mt-1 italic">Water examples: Condense drinking water from air, dry your shirt, feel local water currents.</p>
            </div>
          </div>
        </Section>

        {/* Modes */}
        <Section id="modes" title="Modes of Resonance" icon={<Eye className="w-4 h-4" />}>
          <p className="text-xs font-mono text-muted-foreground mb-4">Your Mode is your instinctive casting style — how you physically interact with the Weave. Primary Mode always uses Harmony. Choose it at character creation.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODES.map(m => (
              <div key={m.name} className="border border-border/50 p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{m.name}</div>
                  <span className="text-[9px] font-mono text-muted-foreground/50 border border-border/30 px-1.5 py-0.5">{m.tag}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-2 leading-relaxed">{m.desc}</p>
                <div className="text-[10px] font-mono space-y-1 border-t border-border/20 pt-2 mt-2">
                  <p><span className="text-primary/60">MATH: </span><span className="text-muted-foreground">{m.math}</span></p>
                  <p><span className="text-destructive/60">FAIL: </span><span className="text-muted-foreground/70">{m.fail}</span></p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Strings & Power Levels */}
        <Section id="strings" title="Strings & Power Levels" icon={<Star className="w-4 h-4" />}>
          <p className="text-xs font-mono text-muted-foreground mb-4">Strings are specific channels within your Affinity — your custom spells built from your character's backstory. Each has 5 Power Levels with escalating cost and DC.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">String Budget by Level</p>
              {[[1,2],[2,3],[3,4],[4,5],[5,7],[6,8],[7,9],[8,10],[9,11],[10,13]].map(([lv, count]) => (
                <div key={lv} className="flex justify-between border-b border-border/20 py-0.5 text-xs font-mono">
                  <span className="text-muted-foreground">Level {lv}</span>
                  <span className="text-primary">{count} strings{lv === 5 || lv === 10 ? " (+2)" : ""}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Feat Slots by Level</p>
              {[2,4,6,8,10].map(lv => (
                <div key={lv} className="flex justify-between border-b border-border/20 py-0.5 text-xs font-mono">
                  <span className="text-muted-foreground">Level {lv}</span>
                  <span className="text-chart-2">{Math.floor(lv/2)} feat{Math.floor(lv/2) !== 1 ? "s" : ""}</span>
                </div>
              ))}
              <div className="mt-3 p-2 border border-border/30 text-[10px] font-mono text-muted-foreground">
                <p className="text-foreground mb-1">Magic System Overview</p>
                <p>• Affinity = your instrument (Fire, Water, etc.)</p>
                <p>• Strings = the notes you know how to play</p>
                <p>• Mode = how you physically play those notes</p>
              </div>
            </div>
          </div>
          <div className="p-3 border border-border/40">
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2">Affinities</p>
            <p className="text-xs font-mono text-muted-foreground mb-2">You don't pick strings from a pre-made list — you build them with the Weavekeeper based on your backstory.</p>
            <div className="grid grid-cols-2 gap-x-4 text-[10px] font-mono">
              <div>
                <p className="text-muted-foreground/50 uppercase mb-1">Common</p>
                <p className="text-muted-foreground">Fire, Water, Earth, Air, Metal, Wood, Plant</p>
              </div>
              <div>
                <p className="text-muted-foreground/50 uppercase mb-1">Uncommon / Rare (DM approval)</p>
                <p className="text-muted-foreground">Ice, Lightning, Glass, Stone, Sound, Light, Heat, Pressure, Gravity, Dreams, Memory, Emotion, Silence, Time</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Water Affinity */}
        <Section id="water" title="Water Affinity — All 13 Strings" icon={<Waves className="w-4 h-4" />}>
          <p className="text-xs font-mono text-muted-foreground mb-4">The full Water Affinity string catalog. Water weavers start with 2 strings and unlock more as they level. All 13 strings are available for selection.</p>
          <div className="space-y-2">
            {WATER_STRINGS.map(s => {
              const isActive = activeWaterString === s.id;
              const attrColor = s.checkAttr === "pot" ? "text-destructive/80 border-destructive/30" : s.checkAttr === "ctr" ? "text-chart-2 border-chart-2/30" : "text-chart-4 border-chart-4/30";
              return (
                <div key={s.id} className={cn("border transition-all", isActive ? "border-primary/40 bg-primary/3" : "border-border/50 hover:border-border")}>
                  <button
                    onClick={() => setActiveWaterString(isActive ? null : s.id)}
                    className="w-full text-left p-3 flex items-center gap-3"
                  >
                    <span className={cn("font-mono text-[10px] border px-1.5 py-0.5 flex-shrink-0 uppercase", attrColor)}>{s.checkAttr}</span>
                    <div className="flex-1">
                      <span className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{s.shortName}</span>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{s.flavor}</p>
                    </div>
                    {isActive ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />}
                  </button>
                  {isActive && (
                    <div className="px-3 pb-3 border-t border-border/20 pt-3 space-y-3">
                      <p className="text-xs font-[family-name:'IM_Fell_English',serif] italic text-primary/70">{s.quote}</p>
                      <p className="text-xs font-mono text-muted-foreground">{s.flavor}</p>
                      <div className="space-y-1">
                        {s.levels.map(l => (
                          <div key={l.pl} className="flex gap-2 text-xs font-mono text-muted-foreground/80">
                            <span className="text-primary/60 flex-shrink-0">PL{l.pl}</span>
                            <span className="text-muted-foreground/40 flex-shrink-0">{l.cost}tp | DC {l.dc}</span>
                            <span>{l.effect}</span>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-border/20 pt-2">
                        <div>
                          <span className="text-yellow-600/60">MISHAP: </span>
                          <span className="text-muted-foreground/70">{s.mishap}</span>
                        </div>
                        <div>
                          <span className="text-destructive/60">SNAPBACK: </span>
                          <span className="text-muted-foreground/70">{s.snapback}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}
