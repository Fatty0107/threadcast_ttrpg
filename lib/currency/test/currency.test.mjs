import assert from "node:assert/strict";
import test from "node:test";
import {
  CROWN_STANDARD_DENOMINATIONS,
  formatCompactCr,
  formatDenominationBreakdown,
  parseCr,
  startingBackgroundCinders,
} from "../src/index.ts";

test("Crown Standard coin denominations and variable Royal Note are canonical", () => {
  assert.deepEqual(
    [
      CROWN_STANDARD_DENOMINATIONS.cinder.valueCinders,
      CROWN_STANDARD_DENOMINATIONS.mark.valueCinders,
      CROWN_STANDARD_DENOMINATIONS.crown.valueCinders,
      CROWN_STANDARD_DENOMINATIONS.sovereign.valueCinders,
    ],
    [1, 10, 100, 1_000],
  );
  assert.equal(CROWN_STANDARD_DENOMINATIONS.royalNote.minimumFaceValueCinders, 10_000);
  assert.match(CROWN_STANDARD_DENOMINATIONS.royalNote.form, /Variable face value/);
});

test("compact CR formatting is exact to a tenth", () => {
  assert.equal(formatCompactCr(0), "0 CR");
  assert.equal(formatCompactCr(1), "0.1 CR");
  assert.equal(formatCompactCr(10), "1 CR");
  assert.equal(formatCompactCr(12_340), "1234 CR");
});

test("denomination breakdown uses largest coins and handles zero", () => {
  assert.equal(formatDenominationBreakdown(0), "0 Cinders");
  assert.equal(formatDenominationBreakdown(370), "3 Crowns, 7 Marks");
  assert.equal(formatDenominationBreakdown(4_500), "4 Sovereigns, 5 Crowns");
  assert.equal(
    formatDenominationBreakdown(12_340),
    "12 Sovereigns, 3 Crowns, 4 Marks",
  );
});

test("CR parsing uses integer cinders without floating point", () => {
  assert.equal(parseCr("0.1 CR"), 1);
  assert.equal(parseCr("37 CR"), 370);
  assert.equal(parseCr("1234.5"), 12_345);
  assert.equal(parseCr("900719925474099.1 CR"), Number.MAX_SAFE_INTEGER);
  assert.throws(() => parseCr("1.01 CR"), TypeError);
  assert.throws(() => parseCr("not money"), TypeError);
  assert.throws(() => parseCr("900719925474099.2 CR"), RangeError);
});

test("starting backgrounds map to the requested CR balances", () => {
  assert.deepEqual(
    [
      startingBackgroundCinders("Guild-Raised"),
      startingBackgroundCinders("Civilian Mage"),
      startingBackgroundCinders("Self-Taught"),
      startingBackgroundCinders("Noble-Born"),
      startingBackgroundCinders("Military Family"),
      startingBackgroundCinders("Scholar's Lineage"),
      startingBackgroundCinders("Temple-Raised"),
    ],
    [400, 600, 250, 2_500, 500, 450, 350],
  );
});

test("formatters reject unsafe and negative cinder amounts", () => {
  assert.throws(() => formatCompactCr(Number.MAX_SAFE_INTEGER + 1), TypeError);
  assert.throws(() => formatDenominationBreakdown(-1), RangeError);
});