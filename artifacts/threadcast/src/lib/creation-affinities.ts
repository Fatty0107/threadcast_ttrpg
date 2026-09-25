import type { AffinityString } from "./affinity-data";
import { canonicalAffinity, getHandoutStringLevel } from "@workspace/casting-rules";

export type CreationString = Pick<AffinityString, "id" | "shortName" | "flavor" | "checkAttr">;

type StringEntry = [name: string, checkAttr: CreationString["checkAttr"], purpose: string];

function stringsFor(affinity: string, entries: StringEntry[]): CreationString[] {
  return entries.map(([name, checkAttr, flavor], index) => ({
    id: `${affinity}-${index + 1}`,
    shortName: `${name} String`,
    checkAttr,
    flavor,
  }));
}

export const CREATION_AFFINITIES = [
  {
    name: "Luck",
    description: "Influence genuine chances and plausible openings. Luck cannot guarantee outcomes, create impossible opportunities, or change a roll already decided.",
    strings: stringsFor("luck", [
      ["First Hand", "ctr", "Favor an uncertain game-of-chance draw or unsettle an opponent's read of it; it does not guarantee a winning hand."],
      ["Tell", "ctr", "Notice and exploit observable tells in another person's behavior, or help someone conceal their own."],
      ["Nudge", "ctr", "Tip the odds of a genuinely uncertain attack or ordinary check in someone's favor or against them."],
      ["Slip", "ctr", "Turn an incoming hit into a glancing blow or make an attacker less likely to land it."],
      ["Opening", "ctr", "Make an existing successful weapon hit count more, or exploit a foe's lapse in footing or position."],
      ["Misstep", "ctr", "Help someone navigate a plausible hazard or cause a believable stumble and loss of momentum."],
      ["Loose Change", "ctr", "Find a mundane object or clue that is really there, or make a loosely held object slip free."],
      ["Fork", "ctr", "Sense which of two real, passable routes has better odds, or hinder pursuit along one of them."],
      ["Wager", "ctr", "Stake your own vitality to make a genuine chance more favorable to an ally or less favorable to a foe."],
      ["Second Chance", "ctr", "Improve a permitted new attempt after a failure, or hinder a new attempt after an opponent succeeds; the past roll stays unchanged."],
      ["Narrow Escape", "ctr", "Lessen harm from a real, survivable hazard, or make avoiding that hazard more difficult."],
      ["House Edge", "ctr", "Spread small shifts in fortune across several people and separate uncertain checks without guaranteeing any result."],
    ]),
  },
  {
    name: "Leyline Energy Conversion",
    description: "Draw and convert leyline energy into motion, force, and protection; oppose an active cast or support a willing caster's output without copying their Affinity.",
    strings: stringsFor("leyline-energy", [
      ["Counterpull", "ctr", "Oppose a cast as it happens to weaken or interrupt its effect on threatened people; finished magic cannot be undone this way."],
      ["Impulse", "pot", "Turn a leyline draw into a directed kinetic strike and, with greater control, a forceful push."],
      ["Spring", "pot", "Convert energy into a burst of movement along a real route, sometimes carrying momentum into a close strike."],
      ["Pressure", "pot", "Spread force through open space to move objects or drive creatures back with a wave of impact."],
      ["Vector", "ctr", "Apply sideways force to a moving object or projectile to deflect its path."],
      ["Overtone", "ctr", "Feed calibrated force into a willing caster's active String to strengthen its existing check or output, not change its purpose."],
      ["Calibration", "ths", "Read an active thread's direction, strain, and point of release without learning the caster's thoughts."],
      ["Ground", "ctr", "Divert some incoming magical force into a connected surface to soften an impact, not erase the spell."],
      ["Reserve", "ctr", "Capture part of an incoming magical impact briefly and spend that stored force on movement, protection, or a later release."],
      ["Shelter", "ths", "Cushion chosen allies against physical blows or traveling magical impacts."],
      ["Interpose", "ths", "Take part of an active magical attack onto yourself to reduce the harm to an ally."],
      ["Circuit", "ctr", "Divide one controlled flow of energy among movement, impact, and protection without casting other Strings for free."],
    ]),
  },
  {
    name: "Emotion",
    description: "Sense and shape emotions that already exist. Emotion cannot create genuine love or loyalty, rewrite memories, or force a person's choices.",
    strings: stringsFor("emotion", [
      ["Echo", "ths", "Perceive and amplify a feeling already present in someone."],
      ["Hush", "ctr", "Quiet an existing emotion so it is less overwhelming without resolving its cause."],
      ["Dread", "pot", "Heighten an existing fear and a person's awareness of what threatens them."],
      ["Valor", "ths", "Strengthen someone's existing desire to keep going despite fear."],
      ["Fury", "pot", "Intensify anger, indignation, or aggression that is already there."],
      ["Sorrow", "ths", "Bring existing grief, longing, or a sense of loss to the surface."],
      ["Rapture", "pot", "Amplify real joy, anticipation, pleasure, or exhilaration."],
      ["Shame", "ths", "Heighten guilt, embarrassment, or self-consciousness already felt."],
      ["Veil", "ctr", "Conceal the outward signal of an emotion without changing how the person feels."],
      ["Concord", "ctr", "Connect emotional states already present in several people."],
      ["Devotion", "ths", "Strengthen a genuine bond that already exists without creating one."],
      ["Catharsis", "ctr", "Help an overwhelming feeling be fully experienced and released rather than buried or intensified."],
    ]),
  },
  {
    name: "Illusions",
    description: "Change what people perceive through convincing sensory images, sounds, and sensations. Illusions do not change physical reality or compel obedience.",
    strings: stringsFor("illusions", [
      ["Companion", "ctr", "Present an apparently present person who can seem to speak and interact, but cannot exert physical force or know new facts."],
      ["Chime", "ths", "Place convincing voices, footsteps, knocks, or music at an apparent location."],
      ["Card", "ctr", "Create precise visual illusions of small objects, especially cards, with carefully timed details."],
      ["Glamour", "ctr", "Change the apparent clothing, features, or persona of a person."],
      ["Sensation", "ths", "Make touch, temperature, and texture seem real without physically producing them."],
      ["Reflection", "ctr", "Show an apparent double or afterimage of a real person's look and movement."],
      ["Curtain", "ctr", "Hide a real thing by making its surroundings appear different."],
      ["Stage", "ths", "Make a room, passage, wall, or wider setting seem like another scene."],
      ["Misdirection", "pot", "Draw attention elsewhere with a believable sight or sound placed in the wrong spot."],
      ["Labyrinth", "ctr", "Distort apparent routes and distances to confuse navigation through a real space."],
      ["Seam", "ths", "Spot where an illusion fails to match reality and help reveal or dismantle the deception."],
      ["Horizon", "ths", "Share a complete possible scene with others as an understood image, not a physical place."],
    ]),
  },
  {
    name: "Fire",
    description: "Begin with heat and fire-like light, then shape radiance, orbits, weight, and luminous matter. It does not create actual stars or black holes.",
    strings: stringsFor("fire", [
      ["Corona", "pot", "Draw a ring of heat and light whose boundary can burn while its center shelters."],
      ["Starheart", "ctr", "Hold a stable point of energy and meter out its heat and light for constructive use."],
      ["Spectrum", "ctr", "Separate radiance into controlled colors and intensities for light and visual perception."],
      ["Orbit", "ctr", "Guide motes or small objects around a center on controlled paths and intercept trajectories."],
      ["Constellation", "ths", "Link distant points with luminous lines to organize positions and aid navigation."],
      ["Vacuum", "ctr", "Separate a pocket from surrounding air or water briefly, influencing combustion and shelter."],
      ["Meteor", "pot", "Send a falling point of heat and light along a chosen path to strike with force."],
      ["Stellar Wind", "pot", "Project luminous force to push, carry, or deflect rather than command lightning."],
      ["Gravity", "pot", "Temporarily alter local weight and attraction."],
      ["Eclipse", "ths", "Lay a dark boundary over radiance to block light without invoking shadow magic."],
      ["Nebula", "ctr", "Shape luminous dust and heated gas into clouds for cover, misdirection, or visibility control."],
      ["Nova", "pot", "Release a compressed center of energy in a dangerous, controlled burst."],
    ]),
  },
  {
    name: "Mirror",
    description: "Reflect light, sound, movement, and presentation. Mirroring does not grant another person's memories, powers, or learned expertise.",
    strings: stringsFor("mirror", [
      ["Facet", "ths", "Sense the role someone expects of you and mirror the manner, not the beliefs or memories, that fit it."],
      ["Glimmer", "ctr", "Shape a visible but intangible reflective image from available light."],
      ["Echo", "ctr", "Repeat sounds or voices you actually heard without gaining their speaker's knowledge."],
      ["Counterstep", "ctr", "Observe and mirror a movement quickly enough to respond to it in close combat."],
      ["Mask", "ctr", "Alter your appearance to resemble another person without gaining their experiences or abilities."],
      ["Afterimage", "ctr", "Leave a convincing visual trace of where you were or might be, not an independent double."],
      ["Looking Glass", "ths", "Use a reflection as a limited viewpoint to observe what it can show."],
      ["Symmetry", "ctr", "Compare damage with intact parts or counterparts to guide repair and reconstruction."],
      ["Borrowed Hand", "ctr", "Temporarily mirror an observed physical technique without inheriting expertise or magic."],
      ["Angle", "ctr", "Redirect an incoming effect you can intercept rather than copy or ignore it."],
      ["Mirrorwalk", "ctr", "Reposition between two reflections you can actually see."],
      ["Trueglass", "ths", "Recognize altered and reflected appearances without dictating someone's true personality."],
    ]),
  },
  {
    name: "Healing",
    description: "Preserve and repair living bodies, with a second expression that shapes available blood for protection or control. Blood is not created from nothing.",
    strings: stringsFor("healing", [
      ["Holdfast", "ths", "Hold bleeding or failing life steady; the blood expression raises a protective shield."],
      ["Trace", "ths", "Locate bodily injury or openings; the blood expression traces or marks a visible target."],
      ["Seam", "ctr", "Join damaged soft tissue; the blood expression forms binding or cutting filaments."],
      ["Set", "ctr", "Align and support bones or joints; the blood expression makes firm braces, guards, or striking shapes."],
      ["Ease", "ctr", "Soothe pain, spasms, and shock without curing the cause; the blood expression absorbs impact or hinders movement."],
      ["Pulse", "pot", "Steady breathing and circulation; the blood expression drives shaped bursts of force."],
      ["Cleanse", "ths", "Remove a real harmful substance from a patient; the blood expression contains or redirects it."],
      ["Renewal", "pot", "Support recovery over time; the blood expression lends a brief burst of speed or strength at a cost."],
      ["Cradle", "ctr", "Support a fragile patient during treatment or movement; the blood expression forms a controlled barrier."],
      ["Burden", "ths", "Take part of another's suffering onto yourself; shed blood can then be shaped defensively or offensively."],
      ["Reweave", "ctr", "Carefully reconstruct damaged living tissue; the blood expression creates intricate temporary forms."],
      ["Loom", "ctr", "Coordinate care for several lives at once; the blood expression divides into controlled strands."],
    ]),
  },
] as const;

export function getCreationAffinity(name: string) {
  return CREATION_AFFINITIES.find(affinity => affinity.name === canonicalAffinity(name));
}

// The handouts supply both a distinct scope for each String and a PL table.
// Build the casting view from the same numerical catalog used by the API.
export function getHandoutString(affinity: string, name: string): AffinityString | undefined {
  const entry = getCreationAffinity(affinity)?.strings.find(string =>
    string.shortName.toLowerCase() === name.trim().toLowerCase().replace(/^the\s+/, ""));
  if (!entry) return undefined;
  const levels = Array.from({ length: 5 }, (_, index) => {
    const pl = index + 1;
    const level = getHandoutStringLevel(affinity, entry.shortName, pl);
    if (!level) throw new Error(`Missing handout table for ${affinity} / ${entry.shortName} / PL ${pl}`);
    return { pl, cost: level.cost, dc: level.dc, effect: `See the ${canonicalAffinity(affinity)} handout for this String's PL ${pl} effect.` };
  });
  return {
    ...entry,
    name: `The ${entry.shortName}`,
    quote: "",
    mishap: "Roll on the core Mishap Table.",
    snapback: "Roll on the core Snapback Table.",
    levels,
  };
}