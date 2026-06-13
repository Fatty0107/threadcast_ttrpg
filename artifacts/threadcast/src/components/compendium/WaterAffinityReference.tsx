import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const WATER_STRINGS = [
  {
    id: "flow",
    name: "THE FLOW STRING",
    quote: '"Water does not fight the stone; it finds the path around it, and in time, wears it to dust."',
    flavor: "Movement, redirection, and adaptation. The Flow String allows a weaver to manipulate momentum, slip through defenses, and turn an attacker's force against them.",
    mishap: "Water pools at the weaver's feet, making the ground slick and treacherous for them.",
    snapback: "A sudden, violent geyser erupts beneath the weaver, throwing them into the air.",
    levels: [
      { pl: 1, cost: "1", dc: "11", effect: "Shift position up to 10ft without triggering reactions." },
      { pl: 2, cost: "2", dc: "13", effect: "Redirect an incoming melee attack to a new target within 5ft." },
      { pl: 3, cost: "3", dc: "15", effect: "Move up to 30ft through a liquid medium instantly." },
      { pl: 4, cost: "5", dc: "17", effect: "Create a surging current that pushes all enemies within 15ft away by 20ft." },
      { pl: 5, cost: "8", dc: "19", effect: "Become liquid form for 1 round. Immune to physical damage, can flow through any crack." }
    ]
  },
  {
    id: "pressure",
    name: "THE PRESSURE STRING",
    quote: '"The deep ocean crushes steel like parchment. Why do you think flesh will fare better?"',
    flavor: "Force, weight, and crushing depth. The Pressure String is used for blunt, overwhelming attacks and restricting movement.",
    mishap: "The weaver's ears pop painfully, imposing Disadvantage on hearing-based checks.",
    snapback: "The pressure rebounds, crushing the weaver for 2d6 bludgeoning damage and reducing their speed to 0 for a round.",
    levels: [
      { pl: 1, cost: "1", dc: "12", effect: "Target feels heavy. -10ft movement speed until your next turn." },
      { pl: 2, cost: "3", dc: "14", effect: "Crushing force deals 2d6 bludgeoning damage to one target." },
      { pl: 3, cost: "4", dc: "16", effect: "Target is pinned to the ground (Restrained) if they fail a POT save." },
      { pl: 4, cost: "6", dc: "18", effect: "Create a 15ft radius zone of extreme pressure. 4d6 damage and difficult terrain." },
      { pl: 5, cost: "9", dc: "20", effect: "Implode target. 8d6 damage and armor rating reduced by 4 permanently." }
    ]
  },
  {
    id: "still",
    name: "THE STILL STRING",
    quote: '"A placid lake reflects perfectly, because it holds no violence."',
    flavor: "Calm, clarity, and freezing. The Still String removes energy, slowing targets down or creating literal ice.",
    mishap: "Frost forms on the weaver's hands, making precise actions difficult.",
    snapback: "Flash freeze. The weaver takes 2d8 cold damage and drops whatever they are holding.",
    levels: [
      { pl: 1, cost: "1", dc: "10", effect: "Freeze a small volume of water or extinguish a small mundane fire." },
      { pl: 2, cost: "2", dc: "13", effect: "Target must save or lose their reaction this turn." },
      { pl: 3, cost: "4", dc: "15", effect: "Create a 10ft wall of ice. Provides full cover, 20 HP." },
      { pl: 4, cost: "5", dc: "17", effect: "Deep freeze. Target takes 3d8 cold damage and is Stunned for 1 round on failed save." },
      { pl: 5, cost: "7", dc: "19", effect: "Absolute zero aura. 20ft radius. All enemies are Slowed and take 2d8 cold damage per turn." }
    ]
  },
  {
    id: "vital",
    name: "THE VITAL STRING",
    quote: '"Blood is just water that remembers."',
    flavor: "Healing, blood manipulation, and bodily humors. Highly restricted in polite society.",
    mishap: "A minor cut reopens, bleeding lazily.",
    snapback: "Violent hemorrhage. Take 3d6 damage and suffer bleeding (1d4 damage start of turn).",
    levels: [
      { pl: 1, cost: "2", dc: "12", effect: "Mend minor wounds, restoring 1d8 VP to a touched ally." },
      { pl: 2, cost: "3", dc: "14", effect: "Purge poison or disease from a target." },
      { pl: 3, cost: "5", dc: "16", effect: "Control blood flow to stabilize a dying target instantly, restoring them to 1 VP." },
      { pl: 4, cost: "7", dc: "18", effect: "Boil blood. Target takes 5d6 necrotic damage (save halves). If they die, they explode." },
      { pl: 5, cost: "10", dc: "21", effect: "Puppet. Control a creature with blood as if dominating them for 1 minute." }
    ]
  },
  {
    id: "tide",
    name: "THE TIDE STRING",
    quote: '"The moon pulls. The water answers. You are in the way."',
    flavor: "Rhythm, pulling, and sweeping change. Controls large bodies of water or wide areas.",
    mishap: "A sudden wave knocks the weaver prone.",
    snapback: "A localized undertow pulls the weaver 30ft in a random direction.",
    levels: [
      { pl: 1, cost: "2", dc: "11", effect: "Pull a target 10ft toward you." },
      { pl: 2, cost: "4", dc: "14", effect: "Create a sweeping wave 15ft wide. Pushes targets 15ft and knocks prone." },
      { pl: 3, cost: "5", dc: "16", effect: "High Tide: For 3 rounds, all water strings cost 1 less TP (min 1)." },
      { pl: 4, cost: "7", dc: "18", effect: "Whirlpool. 20ft radius. Traps enemies inside, dealing 3d6 damage per turn." },
      { pl: 5, cost: "10", dc: "20", effect: "Tsunami. A massive wave deals 8d6 damage in a 60ft cone, destroying structures." }
    ]
  }
];

export function WaterAffinityReference() {
  return (
    <div className="space-y-6">
      <div className="border border-chart-2/50 bg-[#0A1A1E] p-6 text-chart-2">
        <h2 className="text-2xl font-[family-name:'Cinzel',serif] font-bold mb-2">WATER AFFINITY</h2>
        <p className="font-mono text-sm opacity-80">The threads of change, flow, pressure, and the deep. Teal and cyan leylines denote the presence of Water magic.</p>
      </div>

      <Accordion type="multiple" className="w-full">
        {WATER_STRINGS.map((string) => (
          <AccordionItem key={string.id} value={string.id} className="border border-border bg-card mb-4">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 data-[state=open]:border-b border-border">
              <div className="font-[family-name:'Cinzel',serif] text-lg text-chart-2 tracking-wide text-left">
                {string.name}
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="p-4 space-y-4">
                <blockquote className="border-l-2 border-chart-2 pl-4 italic text-muted-foreground font-serif">
                  {string.quote}
                </blockquote>
                <p className="font-mono text-sm leading-relaxed">{string.flavor}</p>
                
                <table className="w-full text-left font-mono text-sm border border-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 border-b border-r border-border w-12 text-center">PL</th>
                      <th className="p-2 border-b border-r border-border w-16 text-center">TP</th>
                      <th className="p-2 border-b border-r border-border w-16 text-center">DC</th>
                      <th className="p-2 border-b border-border">Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {string.levels.map((lvl) => (
                      <tr key={lvl.pl} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-2 border-r border-border text-center">{lvl.pl}</td>
                        <td className="p-2 border-r border-border text-center text-primary">{lvl.cost}</td>
                        <td className="p-2 border-r border-border text-center">{lvl.dc}</td>
                        <td className="p-2">{lvl.effect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
                  <div className="p-3 border border-border bg-muted/20">
                    <span className="text-primary font-bold block mb-1">MISHAP FLAVORING</span>
                    <span className="text-muted-foreground">{string.mishap}</span>
                  </div>
                  <div className="p-3 border border-destructive/30 bg-destructive/5">
                    <span className="text-destructive font-bold block mb-1">SNAPBACK FLAVORING</span>
                    <span className="text-muted-foreground">{string.snapback}</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
