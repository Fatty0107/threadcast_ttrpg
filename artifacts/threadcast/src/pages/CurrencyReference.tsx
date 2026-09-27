import { Compass, Crown, Flame, ScrollText, Shield } from "lucide-react";
import {
  CROWN_STANDARD_DENOMINATIONS,
  STARTING_BACKGROUND_CINDERS,
  formatCompactCr,
  formatDenominationBreakdown,
  type StartingBackground,
} from "@workspace/currency";

type Entry = { name: string; value: string; detail?: string };
const denominations = CROWN_STANDARD_DENOMINATIONS;
const quickConversions = [
  { smaller: denominations.cinder, larger: denominations.mark },
  { smaller: denominations.mark, larger: denominations.crown },
  { smaller: denominations.crown, larger: denominations.sovereign },
];
const exampleAmounts = [
  3 * denominations.crown.valueCinders + 7 * denominations.mark.valueCinders,
  4 * denominations.sovereign.valueCinders + 5 * denominations.crown.valueCinders,
];

const everyday: Entry[] = [
  { name: "Fruit", value: "1–2 Cinders" },
  { name: "Pastry", value: "2–4 Cinders" },
  { name: "Tea", value: "3 Cinders" },
  { name: "Cheap drink", value: "2–4 Cinders" },
  { name: "Cheap stew", value: "5 Cinders" },
  { name: "Bread", value: "6 Cinders" },
  { name: "Simple meal", value: "1 Mark" },
  { name: "Decent meal", value: "2–3 Marks" },
  { name: "Good drink", value: "1 Mark" },
  { name: "Cheap room", value: "3–5 Marks / night" },
  { name: "Comfortable inn", value: "8–12 Marks / night" },
  { name: "Luxury inn", value: "2–5 Crowns / night" },
];

const housing: Entry[] = [
  { name: "Shared / basic poor housing", value: "10–15 CR / month" },
  { name: "Tiny private room", value: "20–30 CR / month" },
  { name: "Small apartment", value: "35–50 CR / month" },
  { name: "Decent middle-class room", value: "50–80 CR / month" },
  { name: "Small middle-class apartment", value: "80–150 CR / month" },
  { name: "Comfortable apartment", value: "150–250 CR / month" },
  { name: "Large wealthy apartment", value: "300–500 CR / month" },
  { name: "Luxury residence", value: "600–1,500 CR / month" },
  { name: "Noble townhouse", value: "2,000+ CR / month" },
];

const travel: Entry[] = [
  { name: "Local public transportation", value: "2–5 Cinders" },
  { name: "Enchanted local transportation", value: "5–10 Cinders" },
  { name: "Private carriage", value: "1–3 Marks" },
  { name: "Luxury local transportation", value: "1+ Crown" },
  { name: "Intercity basic coach", value: "5–10 CR" },
  { name: "Standard intercity travel", value: "15–25 CR" },
  { name: "Fast magical carriage", value: "30–60 CR" },
  { name: "Private intercity travel", value: "1–3 Sovereigns" },
  { name: "Luxury intercity travel", value: "5+ Sovereigns" },
];

const wages: Entry[] = [
  { name: "Unskilled worker", value: "8–12 Marks / day" },
  { name: "Skilled trade", value: "15–25 Marks / day" },
  { name: "Skilled mage", value: "25–50 Marks / day" },
  { name: "Specialist mage", value: "5–10 Crowns / day" },
  { name: "Senior professional", value: "10–25 Crowns / day" },
  { name: "Elite specialist", value: "25–100+ Crowns / day" },
];

const wealth: Entry[] = [
  { name: "Struggling", value: "Below 30 CR / month" },
  { name: "Modest", value: "30–75 CR / month" },
  { name: "Comfortable", value: "75–200 CR / month" },
  { name: "Affluent", value: "200–500 CR / month" },
  { name: "Wealthy", value: "500–2,000 CR / month" },
  { name: "Elite", value: "2,000+ CR / month" },
];

const rarity: Entry[] = [
  { name: "Common", value: "1–50 CR" },
  { name: "Uncommon", value: "50–250 CR" },
  { name: "Rare", value: "250–1,500 CR" },
  { name: "Very Rare", value: "1,500–10,000 CR" },
  { name: "Legendary", value: "10,000+ CR or favour-priced" },
  { name: "Mythical", value: "Not normally purchasable" },
];

const scaledGuard: Entry[] = [
  { name: "Ashborn", value: "75 CR / month" },
  { name: "Embercloak", value: "100 CR / month" },
  { name: "Ironbrand", value: "150 CR / month" },
  { name: "Steelfang", value: "225 CR / month" },
  { name: "Talonarch", value: "350 CR / month" },
  { name: "Drakeward", value: "600 CR / month" },
  { name: "Wyrmlord", value: "1,000+ CR / month" },
];

const thaumatarch: Entry[] = [
  { name: "Apprentice", value: "80 CR / month" },
  { name: "Junior Specialist", value: "125 CR / month" },
  { name: "Specialist", value: "200 CR / month" },
  { name: "Senior Specialist", value: "350 CR / month" },
  { name: "Master", value: "600 CR / month" },
  { name: "High Thaumatarch", value: "1,000+ CR / month" },
];

const backgrounds: Entry[] = [
  { name: "Guild-Raised", detail: "Uniform, basic equipment and one month of basic living support where applicable." },
  { name: "Civilian Mage" },
  { name: "Self-Taught" },
  { name: "Noble-Born", detail: "Fine clothing, signet, family residence and access where applicable." },
  { name: "Military Family", detail: "Military-grade basic equipment and family connections where applicable." },
  { name: "Scholar's Lineage", detail: "Books, writing materials and academic clothing where applicable." },
  { name: "Temple-Raised", detail: "Basic supplies, temple lodging and healing support where applicable." },
].map(({ name, detail }) => ({
  name,
  value: formatCompactCr(STARTING_BACKGROUND_CINDERS[name as StartingBackground]),
  detail,
}));

function ReferenceList({ title, entries, note }: { title: string; entries: Entry[]; note?: string }) {
  return (
    <div className="border border-border/50 min-w-0">
      <div className="px-3 py-2.5 border-b border-border/50 bg-primary/5">
        <h3 className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{title}</h3>
        {note && <p className="text-[10px] font-mono text-muted-foreground mt-1 leading-relaxed">{note}</p>}
      </div>
      <dl className="px-3">
        {entries.map(({ name, value, detail }) => (
          <div key={name} className="py-2 border-b border-border/30 last:border-0 text-xs font-mono">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="text-primary tabular-nums" data-testid={`text-crown-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{value}</dd>
            </div>
            {detail && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/80">{detail}</p>}
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReferenceHeading({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/50 pb-2 mb-3">
      <span className="text-[10px] font-mono text-primary/70">{index}</span>
      <h3 className="font-[family-name:'Cinzel',serif] text-sm sm:text-base text-foreground">{children}</h3>
    </div>
  );
}

export default function CurrencyReference() {
  return (
    <div className="space-y-7">
      <div className="border-l-2 border-primary/60 pl-3">
        <p className="text-xs font-mono text-foreground leading-relaxed">The Crown Standard is Ovrashira's official currency. The Crown, abbreviated <span className="text-primary">CR</span>, is the base accounting unit.</p>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">All prices and earnings below are reference guidelines, not universal rules or automatic transactions.</p>
      </div>

      <div>
        <ReferenceHeading index="01">Quick conversion</ReferenceHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {quickConversions.map(({ smaller, larger }) => (
            <div key={larger.name} className="border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-mono text-primary text-center">
              {larger.valueCinders / smaller.valueCinders} {smaller.plural} = 1 {larger.name}
            </div>
          ))}
        </div>
        <p className="text-[11px] font-mono text-muted-foreground mt-2 leading-relaxed">
          Examples: {exampleAmounts.map((amount, index) => (
            <span key={amount}>{index > 0 ? "; " : ""}<span className="text-foreground">{formatCompactCr(amount)}</span> = {formatDenominationBreakdown(amount)}</span>
          ))}. Royal Notes carry variable face values from {formatCompactCr(denominations.royalNote.minimumFaceValueCinders)} upward; they are not a fixed conversion step.
        </p>
      </div>

      <div>
        <ReferenceHeading index="02">The five denominations</ReferenceHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { denomination: denominations.cinder, value: formatCompactCr(denominations.cinder.valueCinders), motif: "flame motif", use: "Tips, street food, cheap drinks, minor services", Icon: Flame, color: "text-chart-3 border-chart-3/30" },
            { denomination: denominations.mark, value: formatCompactCr(denominations.mark.valueCinders), motif: "star / compass motif", use: "Meals, drinks, local transport, ordinary purchases", Icon: Compass, color: "text-chart-4 border-chart-4/30" },
            { denomination: denominations.crown, value: formatCompactCr(denominations.crown.valueCinders), motif: "royal crest", use: "Equipment, better lodging, professional services, travel", Icon: Crown, color: "text-primary border-primary/30" },
            { denomination: denominations.sovereign, value: formatCompactCr(denominations.sovereign.valueCinders), motif: "royal portrait / crest", use: "Luxury goods, major contracts, property, significant wealth", Icon: Shield, color: "text-chart-2 border-chart-2/30" },
            { denomination: denominations.royalNote, value: `${formatCompactCr(denominations.royalNote.minimumFaceValueCinders)} and up`, motif: "ornate treasury", use: "Noble finances, guild contracts, property and businesses; face value varies", Icon: ScrollText, color: "text-primary border-primary/30" },
          ].map(({ denomination, value, motif, use, Icon, color }) => (
            <div key={denomination.name} className="border border-border/50 p-3 flex gap-3 min-w-0">
              <span className={`w-9 h-9 shrink-0 border flex items-center justify-center ${color}`}><Icon className="w-4 h-4" aria-hidden="true" /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h4 className="font-[family-name:'Cinzel',serif] text-sm text-foreground">{denomination.name}</h4>
                  <span className="font-mono text-xs text-primary tabular-nums" data-testid={`text-denomination-${denomination.name.toLowerCase().replace(" ", "-")}`}>{value}</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{denomination.material} · {motif}</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-1 leading-relaxed">{use}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <ReferenceHeading index="03">Everyday purchasing power</ReferenceHeading>
        <ReferenceList title="Food, drink & lodging" entries={everyday} note="Prices vary by location, quality, availability, merchant, season and circumstance." />
      </div>

      <div>
        <ReferenceHeading index="04">Housing & travel</ReferenceHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <ReferenceList title="Monthly housing" entries={housing} />
          <ReferenceList title="Travel" entries={travel} />
        </div>
      </div>

      <div>
        <ReferenceHeading index="05">Wages & wealth</ReferenceHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <ReferenceList title="Typical daily wages" entries={wages} />
          <ReferenceList title="Monthly wealth guide" entries={wealth} note="Wealth is not purely liquid CR: property, businesses, guild benefits, equipment, investments, family assets and connections also count." />
        </div>
      </div>

      <div>
        <ReferenceHeading index="06">Item rarity & pricing</ReferenceHeading>
        <ReferenceList title="Indicative price ranges" entries={rarity} note="These ranges describe price, not a guarantee that the item is for sale." />
        <div className="mt-3 border border-primary/30 bg-primary/5 p-3 sm:p-4">
          <p className="text-xs font-mono font-bold tracking-widest text-primary">PRICE ≠ AVAILABILITY</p>
          <p className="text-xs font-mono text-foreground mt-2 leading-relaxed">Having enough CR does not automatically allow a purchase. Access may depend on rarity, legality, location, guild standing, connections, supply, merchant willingness and whether the item is actually for sale.</p>
        </div>
      </div>

      <div>
        <ReferenceHeading index="07">Guild economics</ReferenceHeading>
        <p className="text-[11px] font-mono text-muted-foreground mb-3">Monthly salary guidelines, not automatic payments. Other guilds may have their own benefits and economic structures.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <ReferenceList title="Scaled Guard" entries={scaledGuard} note="Possible benefits: housing, equipment, medical care, food, travel, pension and guild resources." />
          <ReferenceList title="Thaumatarch" entries={thaumatarch} note="Possible benefits: laboratories, research materials, archives and institutional resources." />
        </div>
      </div>

      <div>
        <ReferenceHeading index="08">Starting funds by background</ReferenceHeading>
        <ReferenceList title="Starting CR & associated support" entries={backgrounds} note="Guidelines for backgrounds already supported by the character system; associated support applies where appropriate." />
      </div>
    </div>
  );
}