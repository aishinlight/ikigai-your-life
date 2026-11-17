// End-to-end UI test (Playwright) against the dev server + local Supabase.
// Usage: BASE=http://localhost:8080 SHOTS=/tmp/shots node tests/e2e.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// Uses the project dependency if installed, else a globally installed Playwright.
const { chromium } = require("playwright");
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:8080";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let passed = 0;
const step = async (name, fn) => {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message.split("\n").slice(0, 6).join("\n    ")}`); process.exitCode = 1; }
};
const shot = (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(e.message));
page.on("response", (r) => r.status() >= 400 && consoleErrors.push(`HTTP ${r.status()} ${r.url()}`));

console.log("E2E UI tests");

await step("landing shows spec copy in order", async () => {
  await page.goto(BASE + "/");
  await page.getByText("IKIGAI · SELF-DISCOVERY · PERSONAL COACHING").waitFor();
  const text = await page.locator("main").innerText();
  const order = [
    "IKIGAI YOUR LIFE.",
    "For those who want to reconnect with themselves",
    "You seem to do everything right, yet something feels missing.",
    "At a Crossroads", "Burned Out", "Searching for Meaning", "Living for Others", "Held Back by Fear", "Want to Know Yourself",
    "Human Design", "Ikigai Coaching",
    "Mieko Kamiya", "is not an authentic Japanese concept",
    "AI-Guided Discovery", "Personal Coaching",
    "How It Works".toUpperCase() === "HOW IT WORKS" ? "Create your account" : "",
    "Time to rediscover yourself and experience life the Ikigai way.",
  ];
  let idx = -1;
  for (const s of order) {
    const i = text.indexOf(s, idx + 1);
    assert.ok(i > idx, `"${s}" missing or out of order`);
    idx = i;
  }
  for (const b of ["Begin Your Journey", "Explore Human Coaching", "Start AI Coaching", "Contact Your Coach"]) {
    assert.ok(await page.getByText(b, { exact: true }).first().isVisible(), b);
  }
  await shot(page, "01-landing");
});

await step("all header/footer/CTA links point to valid routes", async () => {
  const hrefs = await page.$$eval("a[href^='/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  for (const h of hrefs) {
    const res = await page.request.get(BASE + h);
    assert.equal(res.status(), 200, h);
  }
  const valid = ["/", "/human-coaching", "/login", "/signup", "/privacy", "/terms", "/onboarding", "/coaching", "/signup?next=%2Fcoaching"];
  for (const h of hrefs) assert.ok(valid.includes(h), `unexpected link ${h}`);
});

await step("language switch to Ukrainian and back", async () => {
  await page.getByRole("button", { name: "UA" }).first().click();
  await page.getByText("ІКІГАЙ · САМОПІЗНАННЯ · ОСОБИСТИЙ КОУЧИНГ").waitFor();
  assert.equal(await page.getAttribute("html", "lang"), "uk");
  await page.reload();
  await page.getByText("Почати подорож").first().waitFor(); // persisted
  await shot(page, "02-landing-uk");
  await page.getByRole("button", { name: "EN" }).first().click();
  await page.getByText("Begin Your Journey").first().waitFor();
});

await step("final CTA 'Contact Your Coach' opens dialog with generic inquiry", async () => {
  await page.getByRole("button", { name: "Contact Your Coach" }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByText("Choose how you would like to get in touch to arrange your coaching session.").waitFor();
  const href = await dlg.getByTestId("contact-email").getAttribute("href");
  assert.ok(href.startsWith("mailto:aishin.light@gmail.com?subject=Ikigai%20Coaching%20Inquiry"), href);
  await page.keyboard.press("Escape");
  await dlg.waitFor({ state: "detached" });
});

await step("/book-session redirects to /human-coaching", async () => {
  await page.goto(BASE + "/book-session");
  await page.waitForURL("**/human-coaching");
});

await step("human coaching page: copy, Two Systems, 4 services in order, prefilled email, no login", async () => {
  await page.getByText("Time to ikigai your life and rediscover yourself.").waitFor();
  await page.getByText("Sometimes, meaningful discoveries begin with a conversation.", { exact: false }).waitFor();
  await page.getByText("Where your energy truly comes from", { exact: false }).waitFor();
  const names = await page.$$eval("[data-testid^='service-'] h3", (h) => h.map((x) => x.textContent));
  assert.deepEqual(names, ["Personal Ikigai Session", "Ikigai Journey Review", "Human Design Session", "All-in-One Coaching"]);
  for (const name of names) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByText(name, { exact: true }).waitFor();
    const href = await dlg.getByTestId("contact-email").getAttribute("href");
    const q = new URLSearchParams(href.split("?")[1]);
    assert.equal(q.get("subject"), `Coaching Session Request – ${name}`);
    assert.ok(q.get("body").includes(`I would like to request a coaching session: ${name}.`));
    // WhatsApp number not configured → button disabled with explanation (never a broken link)
    assert.equal(await dlg.getByTestId("contact-whatsapp").count(), 0);
    assert.ok(await dlg.getByRole("button", { name: "Chat on WhatsApp" }).isDisabled());
    await dlg.getByRole("button", { name: "Close" }).click();
  }
  assert.ok(!page.url().includes("/login"));
  await shot(page, "03-human-coaching");
});

await step("contact dialog is keyboard accessible (focus trapped, Esc closes)", async () => {
  await page.getByTestId("service-human-design").focus();
  await page.keyboard.press("Enter");
  const dlg = page.getByRole("dialog");
  await dlg.waitFor();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")), "focus stays in dialog");
  await page.keyboard.press("Escape");
  await dlg.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-testid")), "service-human-design", "focus restored");
});

await step("private routes redirect to login and preserve safe next", async () => {
  await page.goto(BASE + "/journal");
  await page.waitForURL("**/login?next=%2Fjournal");
  await page.goto(BASE + "/login?next=https://evil.example");
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
});

const email = `e2e${Date.now()}@example.test`;
const password = "e2e-password-123";

await step("signup → confirmation email → lands on onboarding", async () => {
  await page.goto(BASE + "/signup");
  await page.getByLabel("Your name").fill("Mira");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText("Check your inbox").waitFor();
  let link;
  for (let i = 0; i < 30 && !link; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}`)).json();
    if (list.messages?.[0]) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      link = full.Text.match(/https?:\/\/\S+verify\S+/)?.[0];
    }
    if (!link) await new Promise((r) => setTimeout(r, 300));
  }
  assert.ok(link, "confirmation email");
  await page.goto(link.replace(/&amp;/g, "&"));
  await page.waitForURL("**/onboarding**");
  await page.getByText("What brings you here today?").waitFor();
});

await step("onboarding: one at a time, autosave, back/skip/continue, revisitable", async () => {
  await page.getByRole("textbox").fill("I feel stuck at work.");
  await page.getByText("Saved").waitFor();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Which area of your life would you most like to explore?").waitFor();
  await page.getByRole("button", { name: "Creativity" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  assert.equal(await page.getByRole("textbox").inputValue(), "I feel stuck at work.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip" }).click(); // understand_better skipped
  await page.getByText("What would make this journey meaningful to you?").waitFor();
  await page.getByRole("textbox").fill("Clarity.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("How would you prefer to begin?").waitFor();
  for (const c of ["Explore with AI", "Connect with a Human Coach", "Combine Both", "Skip for now"]) await page.getByRole("radio", { name: c }).waitFor();
  await page.getByRole("radio", { name: "Combine Both" }).click();
  await shot(page, "04-onboarding");
  await page.getByRole("button", { name: "Finish" }).click();
  await page.waitForURL("**/coaching");
  await page.goto(BASE + "/onboarding"); // revisit — answers persisted
  await page.getByText("What brings you here today?").waitFor();
  assert.equal(await page.getByRole("textbox").inputValue(), "I feel stuck at work.");
});

await step("dashboard shows welcome copy and real (empty) state", async () => {
  await page.goto(BASE + "/dashboard");
  await page.getByText("Welcome to Your Ikigai Journey").waitFor();
  await page.getByText("Your space to explore, reflect, and discover what matters.").waitFor();
  await page.getByText("No confirmed reflections yet", { exact: false }).waitFor();
  assert.equal(await page.getByText(/booking|session request status/i).count(), 0);
  await shot(page, "05-dashboard-empty");
});

await step("AI module: streams opening question, sends messages, persists after reload", async () => {
  await page.goto(BASE + "/explore/aliveness");
  await page.getByText("When was the last time you felt fully absorbed", { exact: false }).first().waitFor({ timeout: 20000 });
  const gen = page.getByRole("button", { name: "Generate reflection" });
  assert.ok(await gen.isDisabled(), "summary disabled before 2 user messages");
  for (const m of ["I lose track of time in the workshop", "Weekdays feel grey"]) {
    await page.getByLabel("Write your reply…").fill(m);
    await page.keyboard.press("Enter");
    await page.getByText(m).waitFor();
    await page.waitForFunction(() => !document.querySelector("textarea#msg")?.disabled);
  }
  await page.reload();
  await page.getByText("I lose track of time in the workshop").waitFor();
  assert.equal(await page.locator("ol[aria-live] > li").count(), 5);
});

await step("reflection: generate draft, edit, save, confirm", async () => {
  await page.getByRole("button", { name: "Generate reflection" }).click();
  await page.getByText("Draft — not shown in your map until confirmed").waitFor();
  const first = page.getByLabel("Key discoveries 1");
  await first.fill("I feel most alive when I make things.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Confirm reflection" }).click();
  await page.getByText("Confirmed — shown in your map").waitFor();
  await shot(page, "06-explore");
});

await step("map: rate needs (persist), shows only confirmed insights, generates directions", async () => {
  await page.goto(BASE + "/map");
  await page.getByText("I feel most alive when I make things.").waitFor();
  const slider = page.getByRole("slider", { name: "Change and growth" });
  await slider.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(900);
  await page.reload();
  assert.equal(await page.getByRole("slider", { name: "Change and growth" }).inputValue(), "2");
  await page.getByRole("button", { name: "Suggest possible directions" }).click();
  await page.getByText("Based on:").first().waitFor();
  await page.getByRole("button", { name: "Use as plan direction" }).first().click();
  await page.getByText("Set as your plan direction.").waitFor();
  assert.ok(await page.getByRole("button", { name: "Print / Save as PDF" }).isVisible());
  await shot(page, "07-map");
});

await step("action plan: direction carried over; add, start, complete, postpone, edit, delete", async () => {
  await page.goto(BASE + "/action-plan");
  assert.equal(await page.getByLabel("Chosen direction").inputValue(), "Make room for weekly craft");
  await page.getByLabel("Action", { exact: true }).fill("Book two evenings in the workshop");
  await page.getByLabel(/Target date/).fill("2026-12-05");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByText("Book two evenings in the workshop").waitFor();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByText(/^In progress · Target date/).waitFor();
  await page.getByRole("button", { name: "Postpone", exact: true }).click();
  await page.getByText(/^Postponed/).waitFor();
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await page.getByText(/^Completed/).waitFor();
  await page.getByLabel("Action", { exact: true }).fill("Temporary");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Edit: Temporary" }).click();
  await page.getByLabel("Action", { exact: true }).fill("Temporary edited");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete: Temporary edited" }).click();
  await page.getByText("Temporary edited").waitFor({ state: "detached" });
  await page.reload();
  await page.getByText("Book two evenings in the workshop").waitFor();
  await shot(page, "08-plan");
});

await step("journal: add, edit, search, delete, newest first", async () => {
  await page.goto(BASE + "/journal");
  await page.getByText("Your journal is empty", { exact: false }).waitFor();
  for (const [d, b] of [["2026-11-01", "Older thoughts about rain"], ["2026-11-15", "Newer thoughts about the workshop"]]) {
    await page.getByLabel("Date").fill(d);
    await page.getByLabel("Write freely…").fill(b);
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByText(b).waitFor();
  }
  const bodies = await page.$$eval("ul li p.whitespace-pre-wrap", (p) => p.map((x) => x.textContent));
  assert.deepEqual(bodies, ["Newer thoughts about the workshop", "Older thoughts about rain"]);
  await page.getByLabel("Search").fill("rain");
  assert.equal(await page.locator("ul li p.whitespace-pre-wrap").count(), 1);
  await page.getByLabel("Search").fill("");
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByLabel("Write freely…").fill("Newer thoughts, edited");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Newer thoughts, edited").waitFor();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).last().click();
  await page.getByText("Older thoughts about rain").waitFor({ state: "detached" });
});

await step("dashboard reflects real progress, map, plan and journal", async () => {
  await page.goto(BASE + "/dashboard");
  await page.getByText("Progress: 1/4").waitFor();
  await page.getByText("I feel most alive when I make things.").waitFor();
  await page.getByText("Newer thoughts, edited").waitFor();
  await page.getByText("Completed: 1/1").waitFor();
  await shot(page, "09-dashboard");
});

await step("profile: edit name and preference, email read-only", async () => {
  await page.goto(BASE + "/profile");
  assert.equal(await page.getByLabel("Account email").getAttribute("readonly"), "");
  await page.getByLabel("Name", { exact: true }).fill("Mira K.");
  await page.getByLabel("Coaching preference").selectOption("human");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Saved").waitFor();
  await page.reload();
  assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Mira K.");
  assert.equal(await page.getByLabel("Coaching preference").inputValue(), "human");
});

await step("settings: export downloads complete JSON", async () => {
  await page.goto(BASE + "/settings");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download my data" }).click()]);
  const json = JSON.parse(await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
  for (const t of ["profiles", "onboarding_responses", "coaching_conversations", "coaching_messages", "ikigai_reflections", "needs_ratings", "possible_directions", "action_plans", "action_items", "journal_entries"]) {
    assert.ok(Array.isArray(json[t]) && json[t].length > 0, `export has ${t}`);
  }
  assert.equal(json.account.email, email);
  await page.getByText("Your export has been downloaded.").waitFor();
  await page.getByText("Nothing is shared with the coach", { exact: false }).waitFor();
  assert.equal(await page.getByText(/stop sharing/i).count(), 0);
});

await step("mobile layout: menu works, no horizontal scroll", async () => {
  const m = await browser.newPage({ viewport: { width: 375, height: 800 } });
  for (const p of ["/", "/human-coaching"]) {
    await m.goto(BASE + p);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${p} overflows by ${overflow}px`);
  }
  await m.getByRole("button", { name: "Menu" }).click();
  await m.locator("#mobile-nav").getByText("Log in").waitFor();
  if (SHOTS) await m.screenshot({ path: `${SHOTS}/10-mobile.png`, fullPage: false });
  await m.close();
});

await step("print view hides navigation", async () => {
  await page.goto(BASE + "/map");
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator("header").isVisible(), false);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/11-map-print.png`, fullPage: true });
  await page.emulateMedia({ media: "screen" });
});

await step("account deletion requires typed DELETE and signs out", async () => {
  await page.goto(BASE + "/settings");
  const btn = page.getByRole("button", { name: "Delete my account" });
  await page.getByLabel("Type DELETE to confirm").fill("delete");
  assert.ok(await btn.isDisabled());
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await btn.click();
  await page.waitForURL(BASE + "/?deleted=1");
  await page.goto(BASE + "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("alert").waitFor();
});

await step("no uncaught console errors", async () => {
  const relevant = consoleErrors.filter((e) => !/Failed to load resource.*(400|401|403|404)|AuthApiError|Invalid login credentials|auth\/v1\/logout|auth\/v1\/token/.test(e));
  assert.deepEqual(relevant, []);
});

await browser.close();
console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
