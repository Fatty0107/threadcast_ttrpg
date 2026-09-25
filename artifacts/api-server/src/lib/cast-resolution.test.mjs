import assert from "node:assert/strict";
import test from "node:test";
import {
  decideReplay,
  resolvePermanentInjury,
} from "./cast-resolution.ts";
import { guildBonusAlreadyInAttributes } from "../../../../lib/casting-rules/src/guild-bonus.ts";

test("builder attributes do not receive guild bonuses a second time during casting", () => {
  const built = { baseAttributes: { pot: 14, ctr: 14 }, attributes: { pot: 15, ctr: 15 } };
  const legacy = { attributes: { pot: 14, ctr: 14 } };
  assert.equal(guildBonusAlreadyInAttributes(built), true);
  assert.equal(guildBonusAlreadyInAttributes(legacy), false);
  assert.equal(built.attributes.pot + (guildBonusAlreadyInAttributes(built) ? 0 : 1), 15);
  assert.equal(legacy.attributes.pot + (guildBonusAlreadyInAttributes(legacy) ? 0 : 1), 15);
});

const castRequest = {
  characterId: 7,
  kind: "cast",
  intent: "light the beacon",
  components: [{ string: "The Flow String", powerLevel: 2, mode: "Slider" }],
};

test("cast request ID replay returns the stored snapshot without resolving again", () => {
  const snapshot = { roll: { id: 42 }, aftermath: { table: { die: 12 } } };
  const decision = decideReplay(
    "request-a",
    { requestType: "cast", request: castRequest, result: snapshot },
    "request-a",
    "cast",
    { ...castRequest, intent: " light the beacon " },
  );

  assert.equal(decision.kind, "replay");
  assert.equal(decision.result, snapshot);
});

test("same cast request ID conflicts when cast input differs", () => {
  const decision = decideReplay(
    "request-a",
    { requestType: "cast", request: castRequest, result: { roll: { id: 42 } } },
    "request-a",
    "cast",
    { ...castRequest, intent: "raise the ward" },
  );

  assert.deepEqual(decision, { kind: "conflict" });
});

test("strain request ID replays only its matching request and rejects mismatches", () => {
  const request = { characterId: 9 };
  const snapshot = { roll: { id: 53 }, aftermath: { strain: { failed: false } } };
  const saved = { requestType: "strain", request, result: snapshot };

  const replay = decideReplay("request-b", saved, "request-b", "strain", request);
  const mismatch = decideReplay("request-b", saved, "request-b", "strain", { characterId: 10 });
  const wrongId = decideReplay("request-b", saved, "request-c", "strain", request);

  assert.equal(replay.kind, "replay");
  assert.equal(replay.result, snapshot);
  assert.deepEqual(mismatch, { kind: "conflict" });
  assert.deepEqual(wrongId, { kind: "conflict" });
});

test("permanent injury d6 maps every die to its name and choice type", () => {
  const expected = [
    ["Lichtenberg Scars", undefined],
    ["Nerve Damage (Hands)", undefined],
    ["Leyline Misread", "sense"],
    ["Lost Thread", "string"],
    ["Reduced Ceiling", undefined],
    ["The Shakes", undefined],
  ];

  expected.forEach(([name, choiceType], index) => {
    const result = resolvePermanentInjury(index + 1, { attunedStrings: ["Flow"] });
    assert.equal(result.name, name);
    assert.equal(result.choiceType, choiceType);
    assert.equal(result.noEligibleString, false);
  });
  assert.throws(() => resolvePermanentInjury(0), RangeError);
  assert.throws(() => resolvePermanentInjury(7), RangeError);
});

test("Lost Thread records a no-eligible outcome without creating a choice", () => {
  const previousInjury = { name: "Lost Thread", string: "The Flow String" };
  const result = resolvePermanentInjury(4, {
    attunedStrings: ["Flow String"],
    existingInjuries: [previousInjury],
  });

  assert.equal(result.name, "Lost Thread");
  assert.equal(result.choiceType, "string");
  assert.equal(result.noEligibleString, true);
  assert.match(result.description, /No eligible attuned String remained/);
  assert.deepEqual(previousInjury, { name: "Lost Thread", string: "The Flow String" });
});

test("Lost Thread accounts for strings reserved by pending choices", () => {
  const result = resolvePermanentInjury(4, {
    attunedStrings: ["Flow", "The Flow String"],
    pendingLostThreadChoices: 1,
  });
  assert.equal(result.noEligibleString, true);
  assert.match(result.description, /no String choice is pending/);
});