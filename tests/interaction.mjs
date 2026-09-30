import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const resolve = (name) =>
  require.resolve(
    name,
    process.env.BLOCK_RHYTHM_DEPS
      ? { paths: [process.env.BLOCK_RHYTHM_DEPS] }
      : undefined,
  );
const { chromium } = require(resolve("playwright"));
const root = fileURLToPath(new URL("../", import.meta.url));
const results = [];
const check = (name, details = "") => {
  results.push({ name, result: "PASS", details });
  console.log(`PASS ${name}${details ? `: ${details}` : ""}`);
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/preview/")) {
      res.writeHead(404).end();
      return;
    }
    const relative = decodeURIComponent(url.pathname.slice(9)) || "index.html";
    const file = path.resolve(root, "dist", relative);
    if (!file.startsWith(path.join(root, "dist") + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const mime =
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
      }[path.extname(file)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
const hex = (n) => `0x${n.toString(16)}`;
let head = 26_000_049;
let mode = "normal";
const timestamps = Math.floor(Date.now() / 1000);
function block(number) {
  const group = mode === "all-high" ? 2 : number % 3;
  return {
    number: hex(number),
    timestamp: hex(timestamps + (number - 26_000_049) * 12),
    transactions: Array.from(
      { length: [60, 180, 440][group] },
      () => `0x${"1".repeat(64)}`,
    ),
    gasUsed: hex([5_000_000, 15_000_000, 40_000_000][group]),
    gasLimit: hex(60_000_000),
    hash: `0x${number.toString(16).padStart(64, "0")}`,
  };
}
const routeRPC = async (route) => {
  if (mode === "offline") {
    await route.fulfill({ status: 503, body: "Unavailable" });
    return;
  }
  if (mode === "malformed") {
    await route.fulfill({ json: { jsonrpc: "2.0", id: 1, result: null } });
    return;
  }
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 250));
  const payload = route.request().postDataJSON();
  const reply = (call) => ({
    jsonrpc: "2.0",
    id: call.id,
    result: block(call.params[0] === "latest" ? head : Number(call.params[0])),
  });
  await route.fulfill({
    json: Array.isArray(payload)
      ? payload.map(reply).reverse()
      : reply(payload),
  });
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
await context.route(/ethereum-rpc\.publicnode\.com|eth\.drpc\.org/, routeRPC);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const failures = [];
page.on("requestfailed", (request) => {
  if (request.url().startsWith(url) && !request.url().endsWith("/sample-blocks.json")) failures.push(request.url());
});
async function ready(p = page) {
  await p.locator(".beat").nth(49).waitFor();
}
async function value() {
  return Number(await page.locator("#block-position").inputValue());
}
try {
  mode = "slow";
  await page.goto(url);
  assert.match(
    await page.locator(".chart-loading").innerText(),
    /Tuning into Ethereum/,
  );
  assert.equal(await page.locator(".primary-button").isDisabled(), true);
  check("Initial loading state and disabled playback");
  await ready();
  mode = "normal";
  assert.match(await page.locator(".status-pill").innerText(), /^Live$/);
  const metrics = await page.locator(".metric-value").allTextContents();
  const fixture = Array.from({ length: 50 }, (_, i) => block(head - 49 + i));
  assert.equal(metrics[0], "26,000,049");
  assert.equal(metrics[1], "12.0s");
  assert.equal(
    metrics[2],
    `${Math.round(fixture.reduce((s, b) => s + b.transactions.length, 0) / 50)}txns`,
  );
  assert.equal(
    metrics[3],
    `${(fixture.reduce((s, b) => s + Number(b.gasUsed), 0) / 50 / 1e6).toFixed(2)}Mgas`,
  );
  assert.equal(await page.locator(".beat").count(), 50);
  check(
    "50 out-of-order RPC responses sorted; metrics match independent totals",
  );

  for (const level of ["Low", "Medium", "High"]) {
    await page.getByRole("button", { name: level, exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: level, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    const badges = await page
      .locator("tbody .activity-badge")
      .allTextContents();
    assert(
      badges.length > 0 &&
        badges.every((b) => b.toLowerCase() === level.toLowerCase()),
    );
    assert.equal(
      await page.locator(".beat:not(.beat-filtered)").count(),
      fixture.filter((b) => {
        const score =
          Math.min(b.transactions.length / 400, 1) / 2 +
          Math.min(Number(b.gasUsed) / 30e6, 1) / 2;
        return (
          (score < 0.35 ? "Low" : score < 0.65 ? "Medium" : "High") === level
        );
      }).length,
    );
  }
  check(
    "All three activity filters update list, pulse emphasis and pressed state",
  );
  await page.getByRole("button", { name: "All blocks", exact: true }).click();
  await page
    .getByRole("button", { name: "View all 50 blocks", exact: true })
    .click();
  assert.equal(await page.locator("tbody tr").count(), 50);
  await page
    .getByRole("button", { name: "Show fewer blocks", exact: true })
    .click();
  assert.equal(await page.locator("tbody tr").count(), 5);
  await page.locator(".block-number").nth(2).click();
  assert.match(
    await page.locator(".inspector-block").innerText(),
    /26,000,047/,
  );
  assert.equal(
    await page.locator(".explorer-link").getAttribute("href"),
    "https://etherscan.io/block/26000047",
  );
  check(
    "Expand/collapse history; inspect block and matching Etherscan destination",
  );

  await page.getByRole("button", { name: "Play last 50", exact: true }).click();
  await page.waitForTimeout(800);
  assert((await value()) >= 1);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  const paused = await value();
  await page.waitForTimeout(800);
  assert.equal(await value(), paused);
  await page.locator("#block-position").focus();
  await page.keyboard.press("End");
  assert.equal(await value(), 49);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await value(), 48);
  assert.match(
    await page.locator(".inspector-block").innerText(),
    /26,000,048/,
  );
  await page.locator("#playback-speed").selectOption("4");
  await page
    .getByRole("button", { name: "Resume playback", exact: true })
    .click();
  await page.getByText("Replay complete", { exact: true }).waitFor();
  assert.equal(await value(), 49);
  await page
    .getByRole("button", { name: "Restart playback", exact: true })
    .click();
  assert.equal(await value(), 0);
  await page
    .getByRole("button", { name: "Resume playback", exact: true })
    .click();
  // Observe DOM changes directly; polling can miss short steps under CPU load.
  await page.getByRole("button", { name: "Pause playback", exact: true }).click();
  await page.getByRole("button", { name: "Restart playback", exact: true }).click();
  await page.evaluate(() => {
    window.__playbackObserved = [0];
    window.__playbackObserver = new MutationObserver(() => {
      const index = [...document.querySelectorAll(".beat")].findIndex(e => e.classList.contains("beat-active"));
      window.__playbackObserved.push(index);
    });
    window.__playbackObserver.observe(document.querySelector(".rhythm-chart"), { attributes: true, subtree: true, attributeFilter: ["class"] });
  });
  await page.getByRole("button", { name: "Resume playback", exact: true }).click();
  await page.getByText("Replay complete", { exact: true }).waitFor();
  const observed = await page.evaluate(() => {
    window.__playbackObserver.disconnect();
    return [...new Set(window.__playbackObserved)];
  });
  assert.equal(observed.length, 50, `Expected all 50 playback steps, saw ${observed.length}`);
  assert.equal(
    await page.locator(".primary-button").innerText(),
    "Replay again",
  );
  await page.getByRole("button", { name: "Back to live", exact: true }).click();
  assert.equal(await page.locator(".status-pill").innerText(), "Live");
  check(
    "Playback: all 50 steps, pause stability, keyboard scrub, speed, restart, completion, return",
  );

  for (const width of [1440, 1024, 820, 740, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Horizontal overflow at ${width}`,
    );
    assert(await page.locator(".primary-button").isVisible());
  }
  check(
    "Responsive reflow and reachable primary action",
    "1440, 1024, 820, 740, 600, 390, 320 CSS px",
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  check(
    "200% root text enlargement without page overflow",
    "Not browser-native zoom",
  );

  await page.goto(url);
  await ready();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip-link",
  );
  await page.keyboard.press("Enter");
  assert.equal(new URL(page.url()).hash, "#main");
  await page.getByRole("button", { name: "Low", exact: true }).focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page
      .getByRole("button", { name: "Low", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  const focus = await page
    .getByRole("button", { name: "Low", exact: true })
    .evaluate((e) => ({
      outline: getComputedStyle(e).outlineStyle,
      width: getComputedStyle(e).outlineWidth,
    }));
  assert.equal(focus.outline, "solid");
  assert.equal(focus.width, "2px");
  check("Keyboard skip link, filter activation and computed focus treatment");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "All blocks", exact: true }).click();
  await page.locator(".primary-button").click();
  assert.match(
    await page.locator(".motion-note").innerText(),
    /Reduced motion/,
  );
  assert.equal(
    await page
      .locator(".beat-active")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  assert.equal(
    await page
      .locator(".primary-button")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  await page.locator(".primary-button").click();
  check(
    "Reduced motion disables transitions and pulse animation; manual playback remains usable",
  );
  await page.getByRole("button", { name: "Back to live", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.addScriptTag({ path: resolve("axe-core/axe.min.js") });
  const audit = await page.evaluate(
    async () =>
      await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      }),
  );
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await writeFile(
    path.join(root, "artifacts/accessibility.json"),
    JSON.stringify(
      {
        violations: audit.violations,
        incomplete: audit.incomplete.map((x) => ({
          id: x.id,
          impact: x.impact,
          description: x.description,
          nodes: x.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        passes: audit.passes.map((x) => x.id),
      },
      null,
      2,
    ) + "\n",
  );
  assert.equal(
    audit.violations.length,
    0,
    JSON.stringify(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  );
  check(
    "Automated axe WCAG A/AA scan",
    `0 violations; ${audit.incomplete.length} checks require manual review`,
  );

  // Updating head exercises the real polling path without changing the component.
  head += 1;
  await page.waitForFunction(
    () => document.querySelector(".metric-value").textContent === "26,000,050",
    null,
    { timeout: 16000 },
  );
  assert.equal(await page.locator(".beat").count(), 50);
  check("Live polling advances latest block and retains exactly 50 blocks");

  mode = "offline";
  await page
    .locator(".connection-notice").filter({ hasText: "Live updates interrupted." })
    .waitFor({ timeout: 16000 });
  assert.equal(await page.locator(".beat").count(), 50);
  assert.equal(
    await page.locator(".status-pill").innerText(),
    "Connection lost",
  );
  mode = "normal";
  await page.getByRole("button", { name: "Retry live", exact: true }).click();
  await page.getByText("Live", { exact: true }).waitFor();
  assert.equal(await page.locator(".connection-notice").count(), 0);
  check(
    "Midstream failure retains blocks; explicit retry restores live connection",
  );

  mode = "all-high";
  await page.reload();
  await ready();
  await page.getByRole("button", { name: "Low", exact: true }).click();
  assert.match(
    await page.locator(".empty-state").innerText(),
    /No low activity blocks/,
  );
  await page
    .getByRole("button", { name: "Show all activity", exact: true })
    .click();
  assert.equal(await page.locator("tbody tr").count(), 5);
  check(
    "Empty filter state explains result and recovers with Show all activity",
  );

  mode = "malformed";
  await page.reload();
  await ready();
  assert.equal(await page.locator(".status-pill").innerText(), "Sample data");
  await page.screenshot({ path: path.join(root, "artifacts/sample-mode.png"), fullPage: true });
  assert.match(
    await page.locator(".connection-notice").innerText(),
    /saved sample/,
  );
  await page.locator(".primary-button").click();
  await page.waitForTimeout(800);
  assert((await value()) > 0);
  await page.locator(".primary-button").click();
  await page
    .getByRole("button", { name: "Back to sample", exact: true })
    .click();
  mode = "normal";
  await page.getByRole("button", { name: "Retry live", exact: true }).click();
  await page.getByText("Live", { exact: true }).waitFor();
  check(
    "Malformed RPC response falls back to clearly labeled playable sample; retry restores live",
  );

  mode = "offline";
  await context.route("**/sample-blocks.json", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.reload();
  await page
    .locator(".connection-notice").filter({ hasText: "Blocks could not be loaded." })
    .waitFor();
  assert.equal(await page.locator(".primary-button").isDisabled(), true);
  await page.screenshot({ path: path.join(root, "artifacts/error-state.png"), fullPage: true });
  mode = "normal";
  await page.getByRole("button", { name: "Retry live", exact: true }).click();
  await ready();
  check(
    "RPC and sample failure gives recoverable error and disables unusable controls",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  check(
    "No JavaScript exceptions or failed required static resource requests",
    "Script, style and font requests; intentional sample-source failure excluded",
  );
  await writeFile(
    path.join(root, "artifacts/interaction-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: await browser.version(),
        fixture:
          "Deterministic 50-block JSON-RPC fixture. Public live feed inspected separately.",
        results,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
