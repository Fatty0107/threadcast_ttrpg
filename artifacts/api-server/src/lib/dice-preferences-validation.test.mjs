import assert from "node:assert/strict";
import test from "node:test";
import {
  hasStrictPreferencesShape,
  satisfiesPreferencesInvariants,
} from "./dice-preferences-validation.ts";
import { GetDicePreferencesResponse } from "../../../../lib/api-zod/src/generated/api.ts";

const legacyStyle = {
  id: "7b9c7eb0-c287-4f1d-927c-0a94059b2db8",
  name: "Classic",
  bodyColor: "#112233",
  inkColor: "#445566",
  edgeColor: "#778899",
  finish: "polished",
  motif: "plain",
};

test("legacy and partial atelier styles retain the exact required shape", () => {
  assert.equal(
    hasStrictPreferencesShape({ sets: [legacyStyle], selectedId: legacyStyle.id }),
    true,
  );
  assert.equal(
    hasStrictPreferencesShape({
      sets: [{ ...legacyStyle, finish: "iridescent", font: "arcane", inscription: "" }],
      selectedId: legacyStyle.id,
    }),
    true,
  );
});

test("generated Dice Atelier contract validates every optional field and inscription limits", () => {
  const style = {
    ...legacyStyle,
    finish: "liquid-core",
    motif: "eye",
    font: "mono",
    pattern: "constellation",
    inclusion: "gold-flake",
    animation: "ritual",
    inscription: "",
  };
  const validPreferences = { sets: [style], selectedId: style.id };
  assert.equal(GetDicePreferencesResponse.safeParse(validPreferences).success, true);
  assert.equal(
    GetDicePreferencesResponse.safeParse({
      sets: [{ ...style, inscription: "1234567890123" }],
      selectedId: style.id,
    }).success,
    false,
  );
  assert.equal(
    GetDicePreferencesResponse.safeParse({
      sets: [{ ...style, inscription: "line\nbreak" }],
      selectedId: style.id,
    }).success,
    false,
  );
  assert.equal(
    GetDicePreferencesResponse.safeParse({
      sets: [{ ...style, inscription: "control\u0085char" }],
      selectedId: style.id,
    }).success,
    false,
  );
  assert.equal(
    GetDicePreferencesResponse.safeParse({
      sets: [{ ...style, font: "serif" }],
      selectedId: style.id,
    }).success,
    false,
  );
});

test("style shape rejects missing required and unknown fields", () => {
  const { motif: _motif, ...missingRequired } = legacyStyle;
  assert.equal(
    hasStrictPreferencesShape({ sets: [missingRequired], selectedId: legacyStyle.id }),
    false,
  );
  assert.equal(
    hasStrictPreferencesShape({
      sets: [{ ...legacyStyle, unknown: true }],
      selectedId: legacyStyle.id,
    }),
    false,
  );
  assert.equal(
    hasStrictPreferencesShape({
      sets: [legacyStyle],
      selectedId: legacyStyle.id,
      unknown: true,
    }),
    false,
  );
});

test("saved sets preserve unique IDs and selected ID membership invariants", () => {
  assert.equal(
    satisfiesPreferencesInvariants({
      sets: [{ id: "first" }, { id: "second" }],
      selectedId: "second",
    }),
    true,
  );
  assert.equal(
    satisfiesPreferencesInvariants({
      sets: [{ id: "same" }, { id: "same" }],
      selectedId: "same",
    }),
    false,
  );
  assert.equal(
    satisfiesPreferencesInvariants({ sets: [{ id: "first" }], selectedId: "missing" }),
    false,
  );
});