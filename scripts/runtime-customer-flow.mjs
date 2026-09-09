import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BROWSER_PATH = process.env.BROWSER_PATH?.trim() || EDGE_PATH;
const DEBUG_PORT = 9367;
const APP_ORIGIN =
  process.env.APP_ORIGIN?.trim().replace(/\/$/u, "") ||
  "http://localhost:3000";
const ASSESSMENT_KEY = "insurancemarket.health-assessment.session.v4";
const RECOMMENDATION_KEY =
  "insurancemarket.health-recommendations.session.v1";
const POLICY_KEY = "insurance-market-policy-analysis-v1";
const LEAD_KEY =
  "insurancemarket.health-lead-submission.session.v2";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const policyFixturePath = join(
  scriptDirectory,
  "fixtures",
  "anonymized-health-policy.pdf",
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function parseServerTiming(value) {
  return Object.fromEntries(
    String(value ?? "")
      .split(",")
      .map((entry) => entry.trim().match(/^([^;]+);dur=([0-9.]+)$/u))
      .filter(Boolean)
      .map((match) => [match[1], Number(match[2])]),
  );
}

async function retry(operation, timeout = 25_000, description = "condition") {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeout) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }

    await delay(100);
  }

  const suffix =
    lastError instanceof Error && lastError.message
      ? " Last error: " + lastError.message
      : "";
  throw new Error("Timed out waiting for " + description + "." + suffix);
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 0;

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) {
      for (const listener of listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
      return;
    }
    if (!pending.has(message.id)) return;

    const request = pending.get(message.id);
    pending.delete(message.id);

    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  return {
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) ?? []), listener]);
    },
    async send(method, params = {}) {
      await ready;
      const id = ++nextId;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

function collectObjectKeys(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjectKeys(item, output));
    return output;
  }

  if (!value || typeof value !== "object") return output;

  for (const [key, nestedValue] of Object.entries(value)) {
    output.push(key);
    collectObjectKeys(nestedValue, output);
  }

  return output;
}

function assertLeadStorage(raw, expected) {
  ensure(typeof raw === "string" && raw.length > 0, "Lead storage is empty.");

  const unsafeValuePattern =
    /data:application\/pdf;base64|%PDF-|base64|OPENAI_API_KEY|SUPABASE_SECRET_KEY|sb_secret_|sk-[A-Za-z0-9_-]{8,}/iu;
  ensure(
    !unsafeValuePattern.test(raw),
    "Lead storage contains PDF/base64 or secret-like material.",
  );

  const submission = JSON.parse(raw);
  ensure(submission.version === 2, "Lead version is invalid.");
  ensure(submission.status === "submitted", "Lead status is invalid.");
  ensure(
    typeof submission.submissionId === "string" &&
      submission.submissionId.startsWith("lead_"),
    "Lead reference is invalid.",
  );
  ensure(
      submission.contact?.fullName === expected.fullName &&
      submission.contact?.email === expected.email &&
      submission.contact?.phone === expected.phone &&
      submission.contact?.preferredContactTime ===
        expected.preferredContactTime,
    "Lead contact data is incomplete or was not normalized.",
  );
  ensure(
    submission.consents?.advisorContact === true &&
      submission.consents?.privacyTerms === true,
    "The required lead consents were not stored safely.",
  );
  ensure(
    submission.assessmentSubmission?.submittedAt &&
      submission.assessmentSubmittedAt ===
        submission.assessmentSubmission.submittedAt,
    "Assessment submission is missing or unbound.",
  );
  ensure(
    submission.insuranceProfile &&
      submission.insuranceProfile.generatedAt ===
        submission.assessmentSubmittedAt,
    "Insurance profile is missing or unbound.",
  );
  ensure(
    submission.recommendationSnapshot?.programId === submission.programId &&
      submission.recommendationSnapshot?.insurer === submission.insurer &&
      submission.recommendationSnapshot?.programName ===
        submission.productName,
    "Recommendation snapshot is missing or unbound.",
  );
  ensure(
    submission.advisorHandoffSummary?.selectedProgram?.programId ===
      submission.programId,
    "Advisor handoff summary is missing or unbound.",
  );

  if (expected.policyAware) {
    ensure(
      submission.assessmentSubmission.policyFile?.type === "application/pdf" &&
        submission.assessmentSubmission.policyFile.name ===
          "uploaded-policy.pdf",
      "Policy-aware lead is missing safe assessment file metadata.",
    );
    ensure(
      submission.policyFileMetadata?.mimeType === "application/pdf" &&
        submission.policyFileMetadata.fileSize > 0 &&
        submission.policyFileMetadata.fileName === "uploaded-policy.pdf",
      "Policy-aware lead is missing safe PDF metadata.",
    );
    ensure(
      !raw.includes("anonymized-health-policy.pdf"),
      "Policy-aware lead contains the local PDF filename.",
    );
    ensure(
      submission.policySnapshot && typeof submission.policySnapshot === "object",
      "Policy-aware lead is missing the structured policy snapshot.",
    );
    ensure(
      submission.comparisonSnapshot?.programId === submission.programId,
      "Policy-aware lead is missing the comparison snapshot.",
    );
    ensure(
      submission.advisorHandoffSummary.existingPolicyAnalyzed === true &&
        submission.advisorHandoffSummary.existingPolicy,
      "Policy-aware handoff does not include the existing-policy summary.",
    );
  } else {
    ensure(
      submission.assessmentSubmission.policyFile === null &&
        submission.policyFileMetadata === null &&
        submission.policySnapshot === null &&
        submission.comparisonSnapshot === null &&
        submission.advisorHandoffSummary.existingPolicyAnalyzed === false &&
        submission.advisorHandoffSummary.existingPolicy === null,
      "No-PDF lead unexpectedly contains policy data.",
    );
  }

  const forbiddenKeyPattern =
    /^(?:api[_-]?key|secret(?:[_-]?key)?|openai[_-]?prompt|prompt|raw[_-]?database[_-]?error|database[_-]?error|error|errors|errorDetails|stack|stackTrace)$/iu;
  const forbiddenKeys = collectObjectKeys(submission).filter((key) =>
    forbiddenKeyPattern.test(key),
  );
  ensure(
    forbiddenKeys.length === 0,
    "Lead storage contains forbidden fields: " + forbiddenKeys.join(", "),
  );

  return submission;
}

const summary = {
  landing: {},
  guards: {},
  resume: false,
  noPdf: {},
  newStart: {},
  policyAware: {},
};

let stage = "server.availability";
let browser;
let cdp;
let profileDirectory;

const captureRuntimeScreenshot = async (fileName) => {
  const screenshotDirectory = process.env.RUNTIME_SCREENSHOT_DIR?.trim();
  if (!screenshotDirectory || !cdp) return;

  await mkdir(screenshotDirectory, { recursive: true });
  const { data } = await cdp.send("Page.captureScreenshot", {
    captureBeyondViewport: true,
    format: "png",
  });
  await writeFile(join(screenshotDirectory, fileName), data, "base64");
};

try {
  const serverResponse = await fetch(APP_ORIGIN, { redirect: "manual" });
  ensure(serverResponse.ok, "The app server did not return HTTP 200.");

  stage = "browser.start";
  profileDirectory = await mkdtemp(
    join(tmpdir(), "insurancemarket-customer-flow-"),
  );
  browser = spawn(
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
      "--remote-debugging-port=" + DEBUG_PORT,
      "--user-data-dir=" + profileDirectory,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  await retry(
    async () => {
      const response = await fetch(
        "http://127.0.0.1:" + DEBUG_PORT + "/json/version",
      );
      return response.ok;
    },
    20_000,
    "the Edge debugging endpoint",
  );

  const targetResponse = await fetch(
    "http://127.0.0.1:" +
      DEBUG_PORT +
      "/json/new?" +
      encodeURIComponent(APP_ORIGIN + "/"),
    { method: "PUT" },
  );
  ensure(targetResponse.ok, "Could not create an Edge debugging target.");
  const target = await targetResponse.json();
  cdp = createCdpClient(target.webSocketDebuggerUrl);
  const browserMessages = [];
  let policyServerTimingHeader = null;
  cdp.on("Runtime.consoleAPICalled", (event) => {
    browserMessages.push(
      (event.args ?? [])
        .map((argument) => argument.value ?? argument.description ?? "")
        .join(" "),
    );
  });
  cdp.on("Log.entryAdded", (event) => {
    browserMessages.push(event.entry?.text ?? "");
  });
  cdp.on("Network.responseReceived", (event) => {
    if (!event.response?.url?.includes("/api/policy-analysis")) return;
    const timingHeader = Object.entries(event.response.headers ?? {}).find(
      ([name]) => name.toLocaleLowerCase("en-US") === "server-timing",
    )?.[1];
    if (typeof timingHeader === "string") {
      policyServerTimingHeader = timingHeader;
    }
  });

  const evaluate = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text ||
          "Browser expression failed.",
      );
    }
    return result.result.value;
  };

  const evaluateFunction = (fn, ...args) =>
    evaluate(
      "(" +
        fn.toString() +
        ")(" +
        args.map((argument) => JSON.stringify(argument)).join(",") +
        ")",
    );

  const waitFor = (
    predicate,
    args = [],
    timeout = 25_000,
    description = "a browser condition",
  ) =>
    retry(
      () => evaluateFunction(predicate, ...args),
      timeout,
      description,
    );

  const waitForPath = (pathname, timeout = 30_000) =>
    waitFor(
      (expectedPath) =>
        location.pathname === expectedPath && document.readyState === "complete",
      [pathname],
      timeout,
      "route " + pathname,
    );

  const navigate = async (
    requestedPath,
    expectedPath = requestedPath,
    timeout = 30_000,
  ) => {
    await cdp.send("Page.navigate", { url: APP_ORIGIN + requestedPath });
    await waitForPath(expectedPath, timeout);
  };

  const setViewport = (width, height, mobile) =>
    cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });

  const pageFit = async (label) => {
    await delay(100);
    const dimensions = await evaluateFunction(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    ensure(
      dimensions.content <= dimensions.viewport,
      label +
        " has horizontal overflow (" +
        dimensions.content +
        " > " +
        dimensions.viewport +
        ").",
    );
    return true;
  };

  const assertNoSystemError = async (label) => {
    const state = await evaluateFunction(() => {
      const text = document.body?.textContent || "";
      return {
        ready: document.readyState === "complete",
        systemError:
          /Application error|Internal Server Error|Unhandled Runtime Error/iu.test(
            text,
          ),
      };
    });
    ensure(state.ready && !state.systemError, label + " exposed a system error.");
  };

  const clickButton = async (text) => {
    await waitFor(
      (label) =>
        Boolean(
          [...document.querySelectorAll("button")].find(
            (button) =>
              button.textContent?.includes(label) && !button.disabled,
          ),
        ),
      [text],
      25_000,
      "enabled button " + text,
    );
    await evaluateFunction((label) => {
      const button = [...document.querySelectorAll("button")].find(
        (candidate) =>
          candidate.textContent?.includes(label) && !candidate.disabled,
      );
      button.click();
      return true;
    }, text);
  };

  const clickLink = async (href) => {
    await waitFor(
      (expectedHref) =>
        Boolean(document.querySelector('a[href="' + expectedHref + '"]')),
      [href],
      30_000,
      "link " + href,
    );
    await evaluateFunction((expectedHref) => {
      document.querySelector('a[href="' + expectedHref + '"]').click();
      return true;
    }, href);
  };

  const choose = async (name, value) => {
    await waitFor(
      (inputName, inputValue) =>
        Boolean(
          document.querySelector(
            'input[name="' + inputName + '"][value="' + inputValue + '"]',
          ),
        ),
      [name, value],
      25_000,
      "assessment option " + name + "=" + value,
    );
    await evaluateFunction((inputName, inputValue) => {
      document
        .querySelector(
          'input[name="' + inputName + '"][value="' + inputValue + '"]',
        )
        .click();
      return true;
    }, name, value);
  };

  const setInputValue = async (selector, value) => {
    await waitFor(
      (inputSelector) => Boolean(document.querySelector(inputSelector)),
      [selector],
      25_000,
      "input " + selector,
    );
    await evaluateFunction((inputSelector, nextValue) => {
      const input = document.querySelector(inputSelector);
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(input, nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return input.value === nextValue;
    }, selector, value);
  };

  const setSelectValue = async (selector, value) => {
    await waitFor(
      (selectSelector) => Boolean(document.querySelector(selectSelector)),
      [selector],
      25_000,
      "select " + selector,
    );
    await evaluateFunction((selectSelector, nextValue) => {
      const select = document.querySelector(selectSelector);
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      ).set;
      setter.call(select, nextValue);
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return select.value === nextValue;
    }, selector, value);
  };

  const waitForProgramIds = (requirePolicyComparison = false) =>
    waitFor(
      (policyRequired) => {
        const ids = [
          ...new Set(
            [...document.querySelectorAll('a[href^="/results/"]')]
              .map((link) => link.getAttribute("href"))
              .filter((href) => /^\/results\/[^/]+$/u.test(href || ""))
              .map((href) => href.split("/").at(-1)),
          ),
        ];
        const policyReady =
          !policyRequired ||
          document.body.textContent?.includes(
            "Οι προτάσεις λαμβάνουν υπόψη",
          );
        return ids.length === 3 && policyReady ? ids : null;
      },
      [requirePolicyComparison],
      75_000,
      requirePolicyComparison
        ? "three policy-aware recommendations"
        : "three recommendations",
    );

  const openInterestForProgram = async (programId) => {
    await clickLink("/results/" + programId);
    await waitForPath("/results/" + programId, 45_000);
    await waitFor(
      (id) =>
        Boolean(document.querySelector('a[href="/interest/' + id + '"]')) &&
        document.body.textContent?.includes("ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΡΟΓΡΑΜΜΑΤΟΣ"),
      [programId],
      45_000,
      "program detail " + programId,
    );
    await clickLink("/interest/" + programId);
    await waitForPath("/interest/" + programId, 30_000);
    await waitFor(
      () => Boolean(document.querySelector("#lead-full-name")),
      [],
      30_000,
      "the lead form",
    );
  };

  const submitValidLead = async (contact) => {
    await setInputValue("#lead-full-name", contact.fullName);
    await setInputValue("#lead-email", contact.email);
    await setInputValue("#lead-phone", contact.phoneInput);
    await setSelectValue(
      "#lead-contact-time",
      contact.preferredContactTime,
    );
    await evaluateFunction(() => {
      document.querySelector('input[name="advisorContact"]').click();
      document.querySelector('input[name="privacyTerms"]').click();
      return true;
    });
    await waitFor(
      () =>
        document.querySelector('input[name="advisorContact"]')?.checked &&
        document.querySelector('input[name="privacyTerms"]')?.checked &&
        document.querySelector("#lead-contact-time")?.value,
      [],
      5_000,
      "the preferred contact time and required consent",
    );

    await evaluateFunction(() => {
      document.querySelector('form button[type="submit"]').click();
      return true;
    });
    await waitFor(
      () => {
        const button = document.querySelector('form button[type="submit"]');
        return Boolean(
          button?.disabled && button.textContent?.includes("Υποβολή αιτήματος"),
        );
      },
      [],
      1_500,
      "the disabled lead submitting state",
    );
    await waitForPath("/interest/confirmation", 30_000);
    return true;
  };

  const assertConfirmation = async (submission) => {
    const state = await waitFor(
      (reference, productName, insurer) => {
        const text = document.body.textContent || "";
        const accessibleText =
          text +
          " " +
          [...document.querySelectorAll("img[alt]")]
            .map((image) => image.getAttribute("alt"))
            .join(" ");
        return accessibleText.includes(reference) &&
          accessibleText.includes(productName) &&
          accessibleText.includes(insurer) &&
          text.includes("Το ενδιαφέρον σου καταχωρίστηκε") &&
          text.includes("Προετοιμασία εξατομικευμένης ενημέρωσης") &&
          text.includes("Επιστροφή στην αρχή")
          ? true
          : false;
      },
      [submission.submissionId, submission.productName, submission.insurer],
      30_000,
      "confirmation reference, program, insurer and next steps",
    );
    ensure(state, "Confirmation content is incomplete.");
  };

  const readStoredLead = () =>
    evaluateFunction((storageKey) => sessionStorage.getItem(storageKey), LEAD_KEY);

  const completeCommonAssessmentSteps = async (options) => {
    await choose("evaluation-goal", options.goal);
    await clickButton("Συνέχεια");
    for (const priority of options.priorities) {
      await choose("priorities", priority);
    }
    await clickButton("Συνέχεια");
    await choose("deductible", options.deductible);
    await clickButton("Συνέχεια");
    await choose("cost-approach", options.costApproach);
    await clickButton("Συνέχεια");
    for (const need of options.additionalNeeds) {
      await choose("additional-needs", need);
    }
    await clickButton("Ολοκλήρωση");
    await waitForPath("/assessment/profile", 30_000);
  };

  const waitForPolicyAnalysis = async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 150_000) {
      const state = await evaluateFunction((storageKey) => ({
        success:
          document.body.textContent?.includes("Η ανάλυση ολοκληρώθηκε") &&
          Boolean(sessionStorage.getItem(storageKey)),
        error: [...document.querySelectorAll('[role="alert"]')]
          .map((element) => element.textContent?.trim())
          .filter(Boolean)
          .join(" "),
      }), POLICY_KEY);

      if (state.success) return true;
      if (state.error?.includes("Αποτυχία ανάλυσης")) {
        throw new Error("Policy analysis reported: " + state.error.slice(0, 240));
      }
      await delay(200);
    }

    throw new Error("Policy analysis did not complete within 150 seconds.");
  };

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("DOM.enable");
  await setViewport(1440, 1000, false);
  await waitForPath("/");

  stage = "landing.initial";
  await evaluateFunction(() => {
    sessionStorage.clear();
    location.reload();
    return true;
  });
  await waitForPath("/");
  await delay(400);
  summary.landing.desktopFits = await pageFit("Landing desktop");
  summary.landing.noInitialResume = await evaluateFunction(
    () =>
      ![...document.querySelectorAll("a")].some((link) =>
        link.textContent?.includes("Συνέχισε την αξιολόγησή σου"),
      ),
  );
  ensure(
    summary.landing.noInitialResume,
    "Landing exposed a resume CTA without assessment progress.",
  );
  await setViewport(390, 844, true);
  summary.landing.mobileFits = await pageFit("Landing mobile");
  await setViewport(1440, 1000, false);

  const guardCases = [
    { path: "/results", corrupt: false },
    { path: "/results/not-a-program", corrupt: true },
    { path: "/interest/not-a-program", corrupt: false },
    { path: "/interest/confirmation", corrupt: true },
  ];

  for (const guardCase of guardCases) {
    stage = "guards." + guardCase.path;
    await evaluateFunction(
      (keys, corrupt) => {
        sessionStorage.clear();
        if (corrupt) {
          keys.forEach((key) => sessionStorage.setItem(key, "{corrupt-json"));
        }
        return true;
      },
      [ASSESSMENT_KEY, RECOMMENDATION_KEY, POLICY_KEY, LEAD_KEY],
      guardCase.corrupt,
    );
    await navigate(guardCase.path, "/assessment", 30_000);
    await assertNoSystemError(guardCase.path);
    summary.guards[guardCase.path] = guardCase.corrupt
      ? "corrupt-storage-safe"
      : "empty-storage-safe";
  }

  stage = "landing.new_start";
  await navigate("/");
  await evaluateFunction(() => {
    sessionStorage.clear();
    location.reload();
    return true;
  });
  await waitForPath("/");
  await clickLink("/assessment?start=new");
  await waitForPath("/assessment");
  await waitFor(
    () =>
      location.search === "" &&
      Boolean(document.querySelector('input[name="insured-people"]')),
    [],
    15_000,
    "a fresh assessment",
  );

  stage = "assessment.resume";
  await choose("insured-people", "self");
  await clickButton("Συνέχεια");
  await waitFor(
    (storageKey) => {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw || !document.querySelector('input[type="date"]')) return false;
      try {
        return JSON.parse(raw).navigation.view === "birthDates";
      } catch {
        return false;
      }
    },
    [ASSESSMENT_KEY],
    15_000,
    "stored assessment progress",
  );
  await navigate("/");
  const resumeHref = await waitFor(
    () => {
      const link = [...document.querySelectorAll("a")].find((candidate) =>
        candidate.textContent?.includes("Συνέχισε την αξιολόγησή σου"),
      );
      return link?.getAttribute("href") || null;
    },
    [],
    15_000,
    "the resume CTA",
  );
  ensure(resumeHref === "/assessment", "Resume CTA points to the wrong route.");
  await clickLink("/assessment");
  await waitForPath("/assessment");
  await waitFor(
    () => Boolean(document.querySelector('input[type="date"]')),
    [],
    15_000,
    "the resumed birth-date step",
  );
  summary.resume = true;

  stage = "assessment.no_pdf";
  await setInputValue('input[type="date"]', "1990-01-01");
  await clickButton("Συνέχεια");
  await choose("current-insurance", "none");
  await clickButton("Συνέχεια");
  await completeCommonAssessmentSteps({
    goal: "first_time",
    priorities: ["emergency", "hospital-network"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: ["provider_freedom"],
  });
  ensure(await pageFit("Profile desktop"), "Profile did not fit desktop.");

  stage = "no_pdf.results";
  await clickLink("/results");
  await waitForPath("/results");
  const initialProgramIds = await waitForProgramIds(false);
  const expectedRanking = [...initialProgramIds];

  stage = "no_pdf.invalid_program_guards";
  await navigate("/results/not-a-program", "/results", 45_000);
  const afterInvalidDetail = await waitForProgramIds(false);
  ensure(
    JSON.stringify(afterInvalidDetail) === JSON.stringify(expectedRanking),
    "Recommendation ranking changed after invalid detail navigation.",
  );
  await navigate("/interest/not-a-program", "/results", 45_000);
  const afterInvalidInterest = await waitForProgramIds(false);
  ensure(
    JSON.stringify(afterInvalidInterest) === JSON.stringify(expectedRanking),
    "Recommendation ranking changed after invalid interest navigation.",
  );

  const noPdfProgramId = expectedRanking[0];
  stage = "no_pdf.interest";
  await openInterestForProgram(noPdfProgramId);
  summary.noPdf.interestDesktopFits = await pageFit("Lead form desktop");
  await captureRuntimeScreenshot("lead-form-desktop.png");

  stage = "no_pdf.validation";
  await clickButton("Ζήτησε επικοινωνία");
  const expectedErrors = [
    "Συμπλήρωσε το ονοματεπώνυμό σου.",
    "Συμπλήρωσε το email σου.",
    "Συμπλήρωσε το τηλέφωνό σου.",
    "Επίλεξε την προτιμώμενη ώρα επικοινωνίας.",
    "Αποδέξου την επικοινωνία από ασφαλιστικό σύμβουλο.",
    "Αποδέξου την ενημέρωση απορρήτου για την υποβολή του αιτήματος.",
  ];
  await waitFor(
    (messages) => {
      const text = document.body.textContent || "";
      return messages.every((message) => text.includes(message));
    },
    [expectedErrors],
    10_000,
    "all Greek inline validation errors",
  );
  ensure(
    await evaluateFunction(
      () => document.querySelectorAll('[aria-invalid="true"]').length === 6,
    ),
    "The contact and consent controls were not marked invalid.",
  );
  summary.noPdf.validationErrors = true;
  await setViewport(390, 844, true);
  summary.noPdf.interestMobileFits = await pageFit(
    "Lead form with errors on mobile",
  );
  await setViewport(1440, 1000, false);

  const noPdfContact = {
    fullName: "Μαρία Παπαδοπούλου",
    email: "runtime.customer@example.com",
    phoneInput: "+30 690 000 0002",
    phone: "+306900000002",
    preferredContactTime: "afternoon",
  };
  stage = "no_pdf.submit";
  summary.noPdf.submittingState = await submitValidLead(noPdfContact);
  const noPdfRawLead = await readStoredLead();
  const noPdfLead = assertLeadStorage(noPdfRawLead, {
    ...noPdfContact,
    policyAware: false,
  });
  await assertConfirmation(noPdfLead);
  summary.noPdf.programId = noPdfProgramId;
  summary.noPdf.storageSafe = true;
  summary.noPdf.confirmationDesktopFits = await pageFit(
    "Confirmation desktop",
  );
  await captureRuntimeScreenshot("lead-confirmation-desktop.png");

  stage = "no_pdf.confirmation_refresh";
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitForPath("/interest/confirmation");
  await assertConfirmation(noPdfLead);
  const refreshedReference = await evaluateFunction(
    (storageKey) => JSON.parse(sessionStorage.getItem(storageKey)).submissionId,
    LEAD_KEY,
  );
  ensure(
    refreshedReference === noPdfLead.submissionId,
    "Confirmation reference changed after refresh.",
  );
  summary.noPdf.confirmationRefresh = true;
  await setViewport(390, 844, true);
  summary.noPdf.confirmationMobileFits = await pageFit(
    "Confirmation mobile",
  );
  await setViewport(1440, 1000, false);

  stage = "no_pdf.confirmation_navigation";
  await clickLink("/");
  await waitForPath("/", 45_000);
  summary.noPdf.homeCta = true;
  await evaluateFunction(() => {
    history.back();
    return true;
  });
  await waitForPath("/interest/confirmation", 45_000);
  await assertConfirmation(noPdfLead);
  summary.noPdf.browserBack = true;

  stage = "new_start.clearing";
  await clickLink("/");
  await waitForPath("/");
  await evaluateFunction((storageKey) => {
    sessionStorage.setItem(storageKey, JSON.stringify({ sentinel: "old-policy" }));
    return true;
  }, POLICY_KEY);
  await clickLink("/assessment?start=new");
  await waitForPath("/assessment");
  const clearedState = await waitFor(
    (keys) => {
      const assessmentRaw = sessionStorage.getItem(keys.assessment);
      let assessmentFresh = assessmentRaw === null;
      if (assessmentRaw) {
        try {
          const snapshot = JSON.parse(assessmentRaw);
          const answers = snapshot.submission?.answers;
          assessmentFresh = Boolean(
            snapshot.submission?.submittedAt === null &&
              snapshot.navigation?.view === "insuredPeople" &&
              answers?.insuredPeople === null &&
              answers?.currentInsurance === null &&
              answers?.evaluationGoal === null &&
              Array.isArray(answers?.priorities) &&
              answers.priorities.length === 0 &&
              answers?.deductible === null &&
              answers?.costApproach === null,
          );
        } catch {
          assessmentFresh = false;
        }
      }
      return location.search === "" &&
        sessionStorage.getItem(keys.lead) === null &&
        sessionStorage.getItem(keys.recommendations) === null &&
        sessionStorage.getItem(keys.policy) === null &&
        assessmentFresh
        ? {
            lead: true,
            recommendations: true,
            policy: true,
            assessment: true,
          }
        : null;
    },
    [
      {
        assessment: ASSESSMENT_KEY,
        recommendations: RECOMMENDATION_KEY,
        policy: POLICY_KEY,
        lead: LEAD_KEY,
      },
    ],
    15_000,
    "old flow storage to be cleared by explicit new start",
  );
  summary.newStart = clearedState;

  if (process.env.SKIP_POLICY_RUNTIME === "1") {
    summary.policyAware = {
      skipped: "Set SKIP_POLICY_RUNTIME=0 with policy-analysis credentials to run.",
    };
  } else {
  stage = "policy.assessment";
  await choose("insured-people", "self");
  await clickButton("Συνέχεια");
  await setInputValue('input[type="date"]', "1985-02-14");
  await clickButton("Συνέχεια");
  await choose("current-insurance", "individual");
  await clickButton("Συνέχεια");
  await waitFor(
    () => Boolean(document.querySelector("#policy-upload-step")),
    [],
    15_000,
    "the policy upload step",
  );

  stage = "policy.upload_analysis";
  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const inputNode = await cdp.send("DOM.querySelector", {
    nodeId: documentNode.root.nodeId,
    selector: "#policy-upload-step",
  });
  ensure(inputNode.nodeId, "Could not resolve the policy file input.");
  await cdp.send("DOM.setFileInputFiles", {
    nodeId: inputNode.nodeId,
    files: [policyFixturePath],
  });
  await evaluateFunction(() => {
    document
      .querySelector("#policy-upload-step")
      .dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  });
  await waitForPolicyAnalysis();
  const policyAnalysisRequestCount = await evaluateFunction(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) =>
        entry.name.includes("/api/policy-analysis"),
      ).length,
  );
  ensure(
    policyAnalysisRequestCount === 1,
    "The policy upload issued duplicate analysis requests.",
  );
  const policyPhaseTimings = parseServerTiming(policyServerTimingHeader);
  const requiredPolicyTimingStages = [
    "multipart",
    "file-read",
    "local-validation",
    "request-preparation",
    "provider",
    "response-validation",
    "total",
  ];
  ensure(
    requiredPolicyTimingStages.every((name) =>
      Number.isFinite(policyPhaseTimings[name]),
    ),
    "The policy response did not expose all anonymized stage timings.",
  );
  ensure(
    policyPhaseTimings.provider > 0 &&
      policyPhaseTimings.total >= policyPhaseTimings.provider,
    "The policy provider/total stage timings are invalid.",
  );
  const rawPolicyRecord = await evaluateFunction(
    (storageKey) => sessionStorage.getItem(storageKey),
    POLICY_KEY,
  );
  ensure(
    rawPolicyRecord &&
      !/data:application\/pdf;base64|%PDF-|base64/iu.test(rawPolicyRecord),
    "Policy session storage contains PDF bytes/base64.",
  );

  await clickButton("Συνέχεια με ασφαλιστήριο");
  await completeCommonAssessmentSteps({
    goal: "evaluate_existing",
    priorities: ["low-deductible", "high-limit", "hospital-network"],
    deductible: "small",
    costApproach: "balanced",
    additionalNeeds: ["immediate_use", "provider_freedom"],
  });

  stage = "policy.results";
  await clickLink("/results");
  await waitForPath("/results");
  const policyProgramIds = await waitForProgramIds(true);
  const policyProgramId = "GEN-MP";
  ensure(
    policyProgramIds.includes(policyProgramId),
    "The policy-aware regression program GEN-MP is not available.",
  );

  stage = "policy.interest";
  await openInterestForProgram(policyProgramId);
  summary.policyAware.interestDesktopFits = await pageFit(
    "Policy-aware lead form desktop",
  );
  await setViewport(390, 844, true);
  summary.policyAware.interestMobileFits = await pageFit(
    "Policy-aware lead form mobile",
  );
  await setViewport(1440, 1000, false);

  const policyContact = {
    fullName: "Νίκος Δοκιμής",
    email: "policy.runtime@example.com",
    phoneInput: "+30 690 000 0001",
    phone: "+306900000001",
    preferredContactTime: "morning",
  };
  stage = "policy.submit";
  summary.policyAware.submittingState = await submitValidLead(policyContact);
  const policyRawLead = await readStoredLead();
  const policyLead = assertLeadStorage(policyRawLead, {
    ...policyContact,
    policyAware: true,
  });
  await assertConfirmation(policyLead);
  summary.policyAware.programId = policyProgramId;
  summary.policyAware.policyFileMetadata = true;
  summary.policyAware.policySnapshot = true;
  summary.policyAware.comparisonSnapshot = true;
  summary.policyAware.existingPolicyAnalyzed = true;
  summary.policyAware.storageSafe = true;
  summary.policyAware.analysisRequestCount = policyAnalysisRequestCount;
  summary.policyAware.phaseTimingsMs = policyPhaseTimings;
  }

  const duplicateReactKeyWarnings = browserMessages.filter((message) =>
    message.includes("Encountered two children with the same key"),
  );
  ensure(
    duplicateReactKeyWarnings.length === 0,
    "Duplicate React key warning detected in the valid customer flow: " +
      duplicateReactKeyWarnings[0],
  );
  summary.duplicateReactKeyWarnings = 0;

  console.log(JSON.stringify({ ok: true, ...summary }));
} catch (error) {
  let browserDiagnostic;
  if (cdp) {
    try {
      const result = await cdp.send("Runtime.evaluate", {
        expression:
          "({path: location.pathname, search: location.search, storageKeys: Object.keys(sessionStorage).sort(), alert: ([...document.querySelectorAll('[role=alert]')].map((item) => item.textContent.trim()).filter(Boolean).join(' ') || null)})",
        returnByValue: true,
      });
      browserDiagnostic = result.result?.value;
      if (browserDiagnostic?.alert) {
        browserDiagnostic.alert = browserDiagnostic.alert.slice(0, 240);
      }
    } catch {
      browserDiagnostic = undefined;
    }
  }

  console.error(
    JSON.stringify({
      ok: false,
      blockedStage: stage,
      error: error instanceof Error ? error.message : String(error),
      ...(browserDiagnostic ? { browser: browserDiagnostic } : {}),
    }),
  );
  process.exitCode = 1;
} finally {
  if (cdp) {
    await Promise.race([
      cdp.send("Browser.close").catch(() => undefined),
      delay(1_000),
    ]);
    cdp.close();
  }
  browser?.kill();
  await delay(250);
  if (profileDirectory) {
    await rm(profileDirectory, { recursive: true, force: true }).catch(
      () => undefined,
    );
  }
}
