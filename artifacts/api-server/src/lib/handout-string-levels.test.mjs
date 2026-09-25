import assert from "node:assert/strict";
import test from "node:test";
import { canonicalAffinity, getHandoutStringLevel, getHandoutStringLevelForCharacter, isHandoutAffinity } from "../../../../lib/casting-rules/src/handout-strings.ts";

const asRows = (affinity, stringName) =>
  [1, 2, 3, 4, 5].map(pl => {
    const row = getHandoutStringLevel(affinity, stringName, pl);
    assert.ok(row, `${affinity} / ${stringName} / PL ${pl}`);
    return [row.cost, row.dc];
  });

test("uploaded handout tables keep their per-affinity PL, TP and DC values", () => {
  const cases = [
    ["Luck", "First Hand String", "ctr", [[1, 8], [3, 11], [6, 14], [10, 17], [15, 20]]],
    ["Leyline Energy Conversion", "Calibration String", "ths", [[1, 10], [2, 12], [3, 14], [5, 16], [8, 18]]],
    ["Leyline Energy Conversion", "Interpose String", "ths", [[2, 12], [4, 15], [6, 17], [8, 19], [11, 21]]],
    ["Emotion", "Concord String", "ctr", [[2, 12], [3, 14], [5, 16], [7, 18], [10, 20]]],
    ["Illusions", "Chime String", "ths", [[1, 10], [2, 12], [4, 14], [6, 17], [8, 19]]],
    ["Illusions", "Misdirection String", "pot", [[1, 12], [2, 14], [4, 16], [6, 18], [9, 20]]],
    ["Fire", "Meteor String", "pot", [[1, 12], [3, 14], [4, 16], [6, 18], [9, 20]]],
    ["Mirror", "Mirrorwalk String", "ctr", [[2, 13], [4, 15], [6, 17], [8, 19], [11, 21]]],
    ["Healing", "Pulse String", "pot", [[1, 11], [2, 13], [4, 15], [6, 17], [9, 20]]],
    ["Healing", "Burden String", "ths", [[2, 12], [4, 15], [6, 17], [8, 19], [11, 21]]],
  ];

  for (const [affinity, name, attribute, expected] of cases) {
    assert.equal(isHandoutAffinity(affinity), true);
    assert.deepEqual(asRows(affinity, name), expected);
    assert.equal(getHandoutStringLevel(affinity, name, 1).checkAttr, attribute);
  }
});

test("legacy Cosmic characters keep Fire handout costs and display the new name", () => {
  assert.equal(canonicalAffinity("Cosmic"), "Fire");
  assert.equal(canonicalAffinity("Fire"), "Fire");
  assert.equal(isHandoutAffinity("Cosmic"), true);
  assert.deepEqual(asRows("Cosmic", "Meteor String"), asRows("Fire", "Meteor String"));
});

test("same-named Strings resolve in their owning handout, not another affinity", () => {
  assert.deepEqual(getHandoutStringLevel("Emotion", "Echo String", 1), {
    cost: 1, dc: 11, checkAttr: "ths",
  });
  assert.deepEqual(getHandoutStringLevel("Mirror", "Echo String", 1), {
    cost: 1, dc: 11, checkAttr: "ctr",
  });
  assert.deepEqual(getHandoutStringLevel("Illusions", "Seam String", 1), {
    cost: 1, dc: 11, checkAttr: "ths",
  });
  assert.deepEqual(getHandoutStringLevel("Healing", "Seam String", 1), {
    cost: 1, dc: 11, checkAttr: "ctr",
  });
  assert.deepEqual(getHandoutStringLevel("Leyline Energy Conversion", "Pressure String", 1), {
    cost: 1, dc: 11, checkAttr: "pot",
  });
});

test("unknown handout Strings do not resolve as Water, and invalid PLs are rejected", () => {
  assert.equal(getHandoutStringLevel("Leyline Energy Conversion", "Water Pressure String", 1), undefined);
  assert.equal(getHandoutStringLevel("Leyline Energy Conversion", "Pressure String", 0), undefined);
  assert.equal(getHandoutStringLevel("Leyline Energy Conversion", "Pressure String", 6), undefined);
  assert.equal(getHandoutStringLevel("Water", "Pressure String", 1), undefined);
});

test("server character resolution reads the character's top-level affinity field", () => {
  const character = { affinity: "Leyline Energy Conversion", data: { affinity: "Water" } };
  assert.deepEqual(getHandoutStringLevelForCharacter(character, "Pressure String", 1), {
    cost: 1, dc: 11, checkAttr: "pot",
  });
  assert.equal(getHandoutStringLevelForCharacter({ data: { affinity: "Emotion" } }, "Echo String", 1), undefined);
});