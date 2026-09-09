import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { policySnapshotFixture } from "../src/lib/policy-analysis/fixtures.ts";

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BROWSER_PATH = process.env.BROWSER_PATH?.trim() || EDGE_PATH;
const APP_ORIGIN =
  process.env.APP_ORIGIN?.trim().replace(/\/$/u, "") ||
  "http://localhost:3000";
const DEBUG_PORT = 9387;
const POLICY_KEY = "insurance-market-policy-analysis-v1";
const fixturePath = join(
  process.cwd(),
  "scripts",
  "fixtures",
  "anonymized-health-policy.pdf",
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retry(operation, timeout = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const result = await operation();
      if (result) return result;
    } catch {
      // The browser target may still be loading.
    }
    await delay(50);
  }
  throw new Error("Policy timeout runtime check timed out.");
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
const profileDirectory = await mkdtemp(join(tmpdir(), "policy-timeout-ui-"));
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
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = (callback, milliseconds, ...args) =>
        nativeSetTimeout(callback, milliseconds === 100000 ? 80 : milliseconds, ...args);
      const nativeFetch = window.fetch.bind(window);
      const successPayload = ${JSON.stringify(successPayload)};
      window.__policyTimeoutTest = { requestCount: 0, transportFilenames: [] };
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (url.endsWith("/api/policy-analysis")) {
          window.__policyTimeoutTest.requestCount += 1;
          const transported = init?.body instanceof FormData
            ? init.body.get("policyFile")
            : null;
          window.__policyTimeoutTest.transportFilenames.push(
            transported instanceof File ? transported.name : null,
          );
          if (window.__policyTimeoutTest.requestCount === 1) {
            return {
              ok: true,
              status: 200,
              headers: new Headers({ "Cache-Control": "no-store" }),
              json: () => new Promise(() => {}),
            };
          }
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
  const setFixture = async () => {
    const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
    const inputNode = await cdp.send("DOM.querySelector", {
      nodeId: documentNode.root.nodeId,
      selector: "#policy-upload-step",
    });
    await cdp.send("DOM.setFileInputFiles", {
      nodeId: inputNode.nodeId,
      files: [fixturePath],
    });
    await evaluate(
      `document.querySelector('#policy-upload-step').dispatchEvent(new Event("change", { bubbles: true })); true`,
    );
  };

  await waitFor(
    `location.pathname === "/assessment" && document.readyState === "complete"`,
  );
  await evaluate(`sessionStorage.clear(); location.reload(); true`);
  await waitFor(
    `location.pathname === "/assessment" && document.readyState === "complete"`,
  );
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

  await setFixture();
  await waitFor(
    `document.body.textContent.includes("Η ανάλυση του PDF άργησε περισσότερο από το αναμενόμενο") && !Boolean(document.querySelector('[aria-busy="true"]'))`,
  );
  const timeoutState = await evaluate(`({
    requestCount: window.__policyTimeoutTest.requestCount,
    transportFilenames: window.__policyTimeoutTest.transportFilenames,
    policyStored: sessionStorage.getItem(${JSON.stringify(POLICY_KEY)}) !== null,
  })`);
  if (
    timeoutState.requestCount !== 1 ||
    timeoutState.policyStored ||
    timeoutState.transportFilenames[0] !== "uploaded-policy.pdf"
  ) {
    throw new Error("Timeout state or generic transport filename is invalid.");
  }

  await setFixture();
  await waitFor(
    `document.body.textContent.includes("Η ανάλυση ολοκληρώθηκε") && Boolean(sessionStorage.getItem(${JSON.stringify(POLICY_KEY)}))`,
  );
  const retryState = await evaluate(`(() => {
    const raw = sessionStorage.getItem(${JSON.stringify(POLICY_KEY)});
    const stored = JSON.parse(raw);
    return {
      requestCount: window.__policyTimeoutTest.requestCount,
      transportFilenames: window.__policyTimeoutTest.transportFilenames,
      storedFilename: stored.filename,
      busy: Boolean(document.querySelector('[aria-busy="true"]')),
      containsLocalFilename: raw.includes("anonymized-health-policy.pdf"),
    };
  })()`);
  if (
    retryState.requestCount !== 2 ||
    retryState.transportFilenames.some(
      (filename) => filename !== "uploaded-policy.pdf",
    ) ||
    retryState.storedFilename !== "uploaded-policy.pdf" ||
    retryState.busy ||
    retryState.containsLocalFilename
  ) {
    throw new Error("Retry did not finish with safe canonical state.");
  }

  console.log(
    JSON.stringify({
      ok: true,
      timeoutExitedBusyState: true,
      retrySucceeded: true,
      requestCount: retryState.requestCount,
      transportFilename: retryState.storedFilename,
    }),
  );
} finally {
  cdp?.close();
  const browserExit = new Promise((resolve) => {
    browser.once("exit", resolve);
  });
  browser.kill();
  await Promise.race([browserExit, delay(2_000)]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(profileDirectory, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await delay(200);
    }
  }
}
