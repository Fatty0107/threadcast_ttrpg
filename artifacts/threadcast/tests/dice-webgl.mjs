import assert from "node:assert/strict";
import { chromium } from "playwright-core";

// Run against the managed dev workflows:
// TEST_USERNAME=... TEST_PASSWORD=... pnpm --filter @workspace/threadcast test:webgl
const { TEST_USERNAME, TEST_PASSWORD } = process.env;
if (!TEST_USERNAME || !TEST_PASSWORD) throw new Error("Set TEST_USERNAME and TEST_PASSWORD for a demo player account");
const base = process.env.TEST_BASE_URL ?? "http://localhost:80";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => {
  if (message.type() === "error" && /webgl|three|shader/i.test(message.text())) errors.push(message.text());
});
const stage = page.getByTestId("preview-dice-stage").getByTestId("view-dice-stage");
let originalSelectedId;
let savedId;
let characterId;

function assertWebgl(locator) {
  return locator.locator('canvas[data-dice-renderer="webgl"]');
}

async function pose(canvas) {
  return JSON.parse(await canvas.getAttribute("data-dice-pose"));
}

async function assertSettled(canvas, locator, result) {
  await locator.locator('xpath=self::*[starts-with(@aria-label, "Dice showing")]').waitFor();
  assert.match(await locator.getAttribute("aria-label"), new RegExp(`d\\d+: ${result}(?:\\D|$)`));
  const [finalPose] = await pose(canvas);
  assert.ok(finalPose.facing > .995, `Result face points away from camera: ${finalPose.facing}`);
}

try {
  await page.goto(`${base}/login`);
  await page.getByTestId("input-username").fill(TEST_USERNAME);
  await page.getByTestId("input-password").fill(TEST_PASSWORD);
  await page.getByTestId("button-submit-login").click();
  await page.waitForURL("**/characters");

  const preferencesResponse = await context.request.get(`${base}/api/dice/preferences`);
  assert.ok(preferencesResponse.ok(), `Preferences GET: ${preferencesResponse.status()}`);
  originalSelectedId = (await preferencesResponse.json()).selectedId;
  await page.goto(`${base}/dice`);
  const canvas = assertWebgl(stage);
  await canvas.waitFor();
  assert.equal(await stage.locator("canvas").count(), 1, "Fallback canvas must not replace Three.js");
  const renderer = await canvas.evaluate(element => {
    const gl = element.getContext("webgl2");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return debug && gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);
  });
  assert.match(renderer ?? "", /swiftshader/i, `Expected SwiftShader WebGL, got ${renderer}`);
  await page.getByTestId("button-practice-d6").click();

  const motions = ["classic", "tumble", "comet", "ritual"];
  const samples = [];
  for (const motion of motions) {
    await page.getByTestId(`button-animation-${motion}`).click();
    await stage.locator('xpath=self::*[starts-with(@aria-label, "Rolling d6")]').waitFor();
    await page.waitForTimeout(550); // before LANDING_START (79% of 1800ms)
    const [sample] = await pose(canvas);
    const image = await canvas.screenshot();
    samples.push({ motion, sample, image });
    const resultText = page.getByTestId("status-practice-roll");
    await resultText.getByText(/d6 result/).waitFor();
    const result = Number(await resultText.locator("strong").textContent());
    await assertSettled(canvas, stage, result);
  }
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const a = samples[i], b = samples[j];
      const distance = Math.hypot(...a.sample.position.map((n, k) => n - b.sample.position[k]));
      const quaternionDistance = Math.min(
        Math.hypot(...a.sample.quaternion.map((n, k) => n - b.sample.quaternion[k])),
        Math.hypot(...a.sample.quaternion.map((n, k) => n + b.sample.quaternion[k])),
      );
      assert.ok(distance > .08 || quaternionDistance > .15, `${a.motion} and ${b.motion} have the same moving pose`);
      assert.notDeepEqual(a.image, b.image, `${a.motion} and ${b.motion} render the same frame`);
    }
  }

  // Save the last-selected Ritual design, equip it, then make an actual server roll.
  const name = `WebGL check ${Date.now()}`;
  await page.getByTestId("input-dice-name").fill(name);
  await page.getByTestId("button-save-equip-dice").click();
  await page.getByTestId("status-dice-action").getByText(/saved and equipped/).waitFor();
  const equipped = await (await context.request.get(`${base}/api/dice/preferences`)).json();
  savedId = equipped.selectedId;
  assert.equal(equipped.sets.find(set => set.id === savedId)?.animation, "ritual");

  const created = await context.request.post(`${base}/api/characters`, {
    data: { name: `WebGL test ${Date.now()}`, level: 1, data: { attributes: { res: 10 } } },
  });
  assert.equal(created.status(), 201, `Temporary character: ${await created.text()}`);
  characterId = (await created.json()).id;
  await page.goto(`${base}/characters/${characterId}`);
  await page.getByTestId("button-roll-attribute-res").click();
  const modal = page.getByRole("dialog");
  await modal.getByText(name).waitFor();
  const gameplayCanvas = assertWebgl(modal.getByTestId("view-dice-stage"));
  await gameplayCanvas.waitFor();
  const responsePromise = page.waitForResponse(response => response.url().includes("/api/rolls") && response.request().method() === "POST");
  await page.getByTestId("button-roll-thread-check").click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const authoritative = await response.json();
  await modal.getByTestId("view-dice-stage").locator('xpath=self::*[starts-with(@aria-label, "Rolling d20")]').waitFor();
  await page.waitForTimeout(550);
  const moving = (await pose(gameplayCanvas))[0];
  assert.ok(Math.abs(moving.position[0]) > .05 || moving.position[1] > .2, "Equipped Ritual must move in gameplay");
  await page.getByTestId("result-dice-roll").waitFor();
  await assertSettled(gameplayCanvas, modal.getByTestId("view-dice-stage"), authoritative.d1);
  assert.equal(
    Number(await page.getByTestId("result-dice-roll").locator(".text-6xl").textContent()),
    authoritative.total,
    "Displayed total must equal the server's authoritative result",
  );
  assert.deepEqual(errors, [], "No Three.js/WebGL errors");
  console.log("SwiftShader WebGL dice: four distinct motions, result-facing landings, saved gameplay roll and server result passed");
} finally {
  if (characterId) {
    const deleted = await context.request.delete(`${base}/api/characters/${characterId}`);
    if (!deleted.ok()) console.error(`Could not remove test character: ${deleted.status()}`);
  }
  if (savedId) {
    const response = await context.request.get(`${base}/api/dice/preferences`);
    if (response.ok()) {
      const current = await response.json();
      const cleanup = await context.request.put(`${base}/api/dice/preferences`, {
        data: {
          sets: current.sets.filter(set => set.id !== savedId),
          selectedId: current.selectedId === savedId ? originalSelectedId : current.selectedId,
        },
      });
      if (!cleanup.ok()) console.error(`Could not remove test dice set: ${cleanup.status()}`);
    }
  }
  await browser.close();
}