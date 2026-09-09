import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { policySnapshotFixture } from "../src/lib/policy-analysis/fixtures.ts";

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BROWSER_PATH = process.env.BROWSER_PATH?.trim() || EDGE_PATH;
const DEBUG_PORT = 9347;
const APP_ORIGIN =
  process.env.APP_ORIGIN?.trim().replace(/\/$/u, "") ||
  "http://localhost:3000";
const POLICY_KEY = "insurance-market-policy-analysis-v1";
const ASSESSMENT_KEY = "insurancemarket.health-assessment.session.v4";
const fixturePath = join(
  process.cwd(),
  "scripts",
  "fixtures",
  "anonymized-health-policy.pdf",
);
const fixtureBytes = await readFile(fixturePath);
const successPayload = {
  ok: true,
  source: "openai",
  outputParsed: true,
  analysis: {
    snapshot: policySnapshotFixture,
    filename: "uploaded-policy.pdf",
    fileSize: fixtureBytes.byteLength,
    analyzedAt: "2026-07-15T00:00:00.000Z",
    extractionConfidence: policySnapshotFixture.extractionConfidence,
  },
};

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retry(operation, timeout = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const result = await operation();
      if (result) return result;
    } catch {
      // Browser target may still be updating.
    }
    await delay(100);
  }
  throw new Error("Policy UI runtime check timed out.");
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 0;
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callbacks.reject(new Error(message.error.message));
    else callbacks.resolve(message.result);
  });
  return {
    async send(method, params = {}) {
      await ready;
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close(),
  };
}

const profileDirectory = await mkdtemp(join(tmpdir(), "policy-analysis-ui-"));
const browser = spawn(
    BROWSER_PATH,
    [
      ...(process.env.BROWSER_PATH
        ? ["--no-sandbox", "--disable-setuid-sandbox"]
        : []),
      "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

let cdp;

try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    return response.ok;
  });
  const targetResponse = await fetch(
    `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  const target = await targetResponse.json();
  cdp = createCdpClient(target.webSocketDebuggerUrl);

  const evaluate = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error("Browser expression failed.");
    return result.result.value;
  };
  const waitFor = (expression, timeout) =>
    retry(() => evaluate(expression), timeout);
  const choose = async (name, value) => {
    await waitFor(
      `Boolean(document.querySelector('input[name="${name}"][value="${value}"]'))`,
    );
    await evaluate(
      `document.querySelector('input[name="${name}"][value="${value}"]').click(); true`,
    );
  };
  const clickButton = async (text) => {
    const literal = JSON.stringify(text);
    await waitFor(
      `Boolean([...document.querySelectorAll("button")].find((button) => button.textContent.includes(${literal}) && !button.disabled))`,
    );
    await evaluate(
      `[...document.querySelectorAll("button")].find((button) => button.textContent.includes(${literal}) && !button.disabled).click(); true`,
    );
  };

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const nativeFetch = window.fetch.bind(window);
      const successPayload = ${JSON.stringify(successPayload)};
      window.__policyUiTest = { requestCount: 0, transportFilenames: [] };
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.endsWith("/api/policy-analysis")) {
          window.__policyUiTest.requestCount += 1;
          const transported = init?.body instanceof FormData
            ? init.body.get("policyFile")
            : null;
          window.__policyUiTest.transportFilenames.push(
            transported instanceof File ? transported.name : null,
          );
          return new Response(JSON.stringify(successPayload), {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
          });
        }
        return nativeFetch(input, init);
      };
    })();`,
  });
  await cdp.send("Page.navigate", { url: `${APP_ORIGIN}/assessment` });
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(`location.pathname === "/assessment" && document.readyState === "complete"`);
  await evaluate(`sessionStorage.clear(); location.reload(); true`);
  await waitFor(`location.pathname === "/assessment" && document.readyState === "complete"`);

  await choose("insured-people", "self");
  await clickButton("Συνέχεια");
  await waitFor(`Boolean(document.querySelector('input[type="date"]'))`);
  await evaluate(`(() => {
    const input = document.querySelector('input[type="date"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "1990-01-01");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await clickButton("Συνέχεια");
  await choose("current-insurance", "individual");
  await clickButton("Συνέχεια");
  await waitFor(`Boolean(document.querySelector('#policy-upload-step'))`);

  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const inputNode = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: "#policy-upload-step",
  });
  await cdp.send("DOM.setFileInputFiles", {
    nodeId: inputNode.nodeId,
    files: [fixturePath],
  });
  await evaluate(`document.querySelector('#policy-upload-step').dispatchEvent(new Event("change", { bubbles: true })); true`);
  await waitFor(
    `document.body.textContent.includes("Η ανάλυση ολοκληρώθηκε") && Boolean(sessionStorage.getItem(${JSON.stringify(POLICY_KEY)}))`,
    120_000,
  );

  const storedPolicy = await evaluate(
    `sessionStorage.getItem(${JSON.stringify(POLICY_KEY)})`,
  );
  const storedAssessment = await evaluate(
    `sessionStorage.getItem(${JSON.stringify(ASSESSMENT_KEY)})`,
  );
  const storageIsSafe = await evaluate(`(() => {
    const raw = sessionStorage.getItem(${JSON.stringify(POLICY_KEY)});
    const value = JSON.parse(raw);
    return value.version === 1 &&
      value.snapshot.schemaVersion === "existing-policy-v1" &&
      value.filename === "uploaded-policy.pdf" &&
      !raw.includes("anonymized-health-policy.pdf") &&
      !raw.includes("data:application/pdf;base64") &&
      !raw.includes("%PDF-");
  })()`);
  if (!storageIsSafe) throw new Error("Policy session storage contains unsafe data.");
  const requestState = await evaluate(`window.__policyUiTest`);
  if (
    requestState.requestCount !== 1 ||
    requestState.transportFilenames[0] !== "uploaded-policy.pdf"
  ) {
    throw new Error("Policy UI issued an unsafe or duplicate analysis request.");
  }

  const assessmentStorageIsSafe = await evaluate(`(() => {
    const raw = sessionStorage.getItem(${JSON.stringify(ASSESSMENT_KEY)});
    const value = JSON.parse(raw);
    return value.submission.policyFile.name === "uploaded-policy.pdf" &&
      !raw.includes("anonymized-health-policy.pdf");
  })()`);
  if (!assessmentStorageIsSafe) {
    throw new Error("Assessment session contains the local PDF filename.");
  }

  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(
    `location.pathname === "/assessment" && document.body.textContent.includes("Η ανάλυση ολοκληρώθηκε")`,
    30_000,
  );
  await clickButton("Αφαίρεση ανάλυσης");
  await waitFor(
    `sessionStorage.getItem(${JSON.stringify(POLICY_KEY)}) === null && !document.body.textContent.includes("Η ανάλυση ολοκληρώθηκε")`,
  );

  await evaluate(
    `sessionStorage.setItem(${JSON.stringify(ASSESSMENT_KEY)}, ${JSON.stringify(storedAssessment)}); sessionStorage.setItem(${JSON.stringify(POLICY_KEY)}, ${JSON.stringify(storedPolicy)}); location.reload(); true`,
  );
  await waitFor(
    `document.body.textContent.includes("Η ανάλυση ολοκληρώθηκε") && Boolean([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Συνέχεια με ασφαλιστήριο")))`,
  );

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const mobileUploadFits = await evaluate(
    `document.documentElement.scrollWidth <= window.innerWidth`,
  );
  if (!mobileUploadFits) throw new Error("Mobile upload view has horizontal overflow.");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await clickButton("Συνέχεια με ασφαλιστήριο");
  await choose("evaluation-goal", "evaluate_existing");
  await clickButton("Συνέχεια");
  for (const value of ["low-deductible", "high-limit", "hospital-network"]) {
    await choose("priorities", value);
  }
  await clickButton("Συνέχεια");
  await choose("deductible", "small");
  await clickButton("Συνέχεια");
  await choose("cost-approach", "balanced");
  await clickButton("Συνέχεια");
  await choose("additional-needs", "immediate_use");
  await choose("additional-needs", "provider_freedom");
  await clickButton("Ολοκλήρωση");
  await waitFor(`location.pathname === "/assessment/profile"`);
  await waitFor(`Boolean(document.querySelector('a[href="/results"]'))`);
  await evaluate(`document.querySelector('a[href="/results"]').click(); true`);
  await waitFor(
    `location.pathname === "/results" && document.body.textContent.includes("Οι προτάσεις λαμβάνουν υπόψη")`,
    60_000,
  );
  const resultCheck = await evaluate(`(() => {
    const details = [...document.querySelectorAll('a[href^="/results/"]')];
    const raw = Object.keys(sessionStorage)
      .map((key) => sessionStorage.getItem(key))
      .find((value) => value?.includes('"policyComparison"'));
    const parsed = JSON.parse(raw);
    return {
      count: new Set(details.map((link) => link.getAttribute("href"))).size,
      comparisons: parsed.response.recommendations.filter((item) => item.policyComparison).length,
      v2Comparisons: parsed.response.recommendations.filter(
        (item) => item.policyComparison?.displayGroups,
      ).length,
      databaseFactCount: parsed.response.recommendations.flatMap((item) =>
        Object.values(item.policyComparison?.displayGroups ?? {}).flatMap((rows) =>
          rows.flatMap((row) => row.proposedFacts ?? []),
        ),
      ).length,
      fits: document.documentElement.scrollWidth <= window.innerWidth,
      firstHref: details[0]?.getAttribute("href"),
    };
  })()`);
  if (
    resultCheck.count !== 3 ||
    resultCheck.comparisons !== 3 ||
    resultCheck.v2Comparisons !== 3 ||
    resultCheck.databaseFactCount === 0 ||
    !resultCheck.fits
  ) {
    throw new Error("Policy comparison results UI check failed.");
  }

  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(
    `location.pathname === "/results" && document.body.textContent.includes("Οι προτάσεις λαμβάνουν υπόψη")`,
    60_000,
  );
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const mobileResultsFits = await evaluate(
    `document.documentElement.scrollWidth <= window.innerWidth`,
  );
  if (!mobileResultsFits) throw new Error("Mobile results have horizontal overflow.");

  await cdp.send("Page.navigate", {
    url: `${APP_ORIGIN}${resultCheck.firstHref}`,
  });
  await waitFor(
    `location.pathname.startsWith("/results/") && document.body.textContent.includes("Σύγκριση με το υπάρχον συμβόλαιό σου")`,
    45_000,
  );
  const detailFits = await evaluate(
    `document.documentElement.scrollWidth <= window.innerWidth && document.body.textContent.includes("Δεν αντικαθιστά τον έλεγχο του πλήρους συμβολαίου") && document.body.textContent.includes("Οικονομικοί όροι και απαλλαγές") && document.body.textContent.includes("Πηγή:")`,
  );
  if (!detailFits) throw new Error("Mobile policy detail comparison check failed.");
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(
    `location.pathname.startsWith("/results/") && document.body.textContent.includes("Σύγκριση με το υπάρχον συμβόλαιό σου")`,
    45_000,
  );

  console.log(
    JSON.stringify({
      upload: "success",
      transport: "mocked",
      analysisRequestCount: requestState.requestCount,
      refresh: "success",
      removal: "success",
      resultsComparisons: resultCheck.comparisons,
      databaseFactsShown: resultCheck.databaseFactCount,
      desktop: "fits",
      mobile: "fits",
    }),
  );
} finally {
  cdp?.close();
  const browserExited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill();
  await Promise.race([browserExited, delay(2_000)]);
  try {
    await rm(profileDirectory, { recursive: true, force: true });
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "EBUSY")) {
      throw error;
    }
  }
}
