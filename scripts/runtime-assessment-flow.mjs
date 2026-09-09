import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BROWSER_PATH = process.env.BROWSER_PATH?.trim() || EDGE_PATH;
const DEBUG_PORT = 9339;
const APP_ORIGIN =
  process.env.APP_ORIGIN?.trim().replace(/\/$/u, "") ||
  "http://localhost:3000";

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retry(operation, timeout = 20_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    try {
      const result = await operation();
      if (result) return result;
    } catch {
      // The browser or page may still be starting.
    }

    await delay(100);
  }

  throw new Error("Runtime browser check timed out.");
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

    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);

    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
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

async function run() {
  const profileDirectory = await mkdtemp(
    join(tmpdir(), "insurancemarket-assessment-runtime-"),
  );
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
      const response = await fetch(
        `http://127.0.0.1:${DEBUG_PORT}/json/version`,
      );
      return response.ok;
    });

    const targetResponse = await fetch(
      `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(`${APP_ORIGIN}/assessment`)}`,
      { method: "PUT" },
    );
    const target = await targetResponse.json();
    cdp = createCdpClient(target.webSocketDebuggerUrl);
    const browserMessages = [];
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

    const evaluate = async (expression) => {
      const result = await cdp.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error("Browser expression failed.");
      }
      return result.result.value;
    };

    const waitFor = (expression, timeout) =>
      retry(() => evaluate(expression), timeout);

    const navigate = async (pathname) => {
      await cdp.send("Page.navigate", { url: `${APP_ORIGIN}${pathname}` });
      await waitFor(
        `location.pathname === ${JSON.stringify(pathname)} && document.readyState === "complete"`,
        30_000,
      );
    };

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
        `Boolean([...document.querySelectorAll('button')].find((button) => button.textContent.includes(${literal}) && !button.disabled))`,
      );
      await evaluate(
        `[...document.querySelectorAll('button')].find((button) => button.textContent.includes(${literal}) && !button.disabled).click(); true`,
      );
    };

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
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

    await choose("current-insurance", "none");
    await clickButton("Συνέχεια");

    await choose("evaluation-goal", "first_time");
    await clickButton("Συνέχεια");

    await choose("priorities", "emergency");
    await clickButton("Συνέχεια");

    await choose("deductible", "small");
    await clickButton("Συνέχεια");

    await choose("cost-approach", "balanced");
    await clickButton("Συνέχεια");

    for (const value of [
      "frequent_travel",
      "young_children",
      "provider_freedom",
    ]) {
      await choose("additional-needs", value);
    }
    await clickButton("Ολοκλήρωση");

    await waitFor(`location.pathname === "/assessment/profile"`);
    const profileUrl = await evaluate("location.href");
    const sessionKeys = await evaluate("Object.keys(sessionStorage)");

    await waitFor(
      `Boolean([...document.querySelectorAll('a')].find((link) => link.getAttribute('href') === '/results'))`,
    );
    await evaluate(
      `[...document.querySelectorAll('a')].find((link) => link.getAttribute('href') === '/results').click(); true`,
    );

    await waitFor(`location.pathname === "/results"`);
    const programIds = await waitFor(`(() => {
      const ids = [...new Set(
        [...document.querySelectorAll('a[href^="/results/"]')]
          .map((link) => link.getAttribute("href").split("/").at(-1))
          .filter(Boolean),
      )];
      return ids.length === 3 ? ids : null;
    })()`, 45_000);

    const resultsUrl = await evaluate("location.href");
    const hasMappingError = await evaluate(
      `document.body.textContent.includes("assessment_mapping_error") || document.body.textContent.includes("δεν έχει ακριβές ισοδύναμο")`,
    );

    await waitFor(`(() => {
      const cards = [...document.querySelectorAll("article")].filter((card) =>
        card.querySelector('a[href^="/results/"]'),
      );
      const images = cards
        .map((card) => card.querySelector('img[alt^="Λογότυπο"]'))
        .filter(Boolean);
      return images.length === 3 && images.every(
        (image) => image.complete && image.naturalWidth > 0,
      );
    })()`, 20_000);

    const resultsPresentation = await evaluate(`(() => {
      const cards = [...document.querySelectorAll("article")].filter((card) =>
        card.querySelector('a[href^="/results/"]'),
      );
      const snapshots = Object.keys(sessionStorage)
        .map((key) => {
          try { return JSON.parse(sessionStorage.getItem(key)); }
          catch { return null; }
        })
        .filter(Boolean);
      const recommendations = snapshots.flatMap(
        (snapshot) => snapshot.response?.recommendations || [],
      );
      const reasons = cards.map((card) =>
        card.querySelector('[class*="reasonBox"] p')?.textContent.trim(),
      );
      const customerTitle = (value) => value
        .replace(/One Day Surgery/giu, "Χειρουργείο μίας ημέρας")
        .replace(/One Day Clinic/giu, "Κλινική ημερήσιας νοσηλείας")
        .replace(/check[ -]?up/giu, "προληπτικό έλεγχο")
        .replace(/\\s*&\\s*/gu, " και ")
        .trim();
      const logos = cards.map((card) => {
        const image = card.querySelector('img[alt^="Λογότυπο"]');
        return Boolean(image && image.complete && image.naturalWidth > 0);
      });
      const logoSizes = cards.map((card) => {
        const image = card.querySelector('img[alt^="Λογότυπο"]');
        const rect = image?.parentElement?.getBoundingClientRect();
        return rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null;
      });
      const cardHeights = cards.map((card) =>
        Math.round(card.getBoundingClientRect().height),
      );
      const actionBottoms = cards.map((card) =>
        Math.round(
          card.querySelector('[class*="cardActions"]')?.getBoundingClientRect().bottom || 0,
        ),
      );
      const text = document.body.textContent;
      const forbidden = [
        "Database program ID",
        "evidence refs",
        "DATABASE SIGNALS",
        "DATABASE WARNINGS",
        "MISSING EVIDENCE",
        "demo_only",
        "human_review_required",
        "draft_signals",
        "missing_evidence",
        "waiting periods",
      ].filter((value) => text.includes(value));
      const evidenceGrounded = cards.map((card) => {
        const programId = card
          .querySelector('a[href^="/results/"]')
          ?.getAttribute("href")
          ?.split("/")
          .at(-1);
        const recommendation = recommendations.find(
          (item) => item.programId === programId,
        );
        const evidenceTitles = (recommendation?.evidenceReferences || [])
          .map((item) => item.title ? customerTitle(item.title) : null)
          .filter(Boolean);
        const reason = card.querySelector('[class*="reasonBox"] p')
          ?.textContent.trim() || "";
        const strengthTitles = [...card.querySelectorAll('[class*="miniFeatureList"] li')]
          .map((item) => item.textContent.replace("✓", "").trim());
        return {
          strengthCount: strengthTitles.length,
          reasonMatches: evidenceTitles.filter((title) => reason.includes(title)).length,
          strengthsMatch: strengthTitles.every((title) => evidenceTitles.includes(title)),
        };
      });
      return {
        cardCount: cards.length,
        reasons,
        reasonWordCounts: reasons.map((reason) =>
          reason?.split(/\\s+/).filter(Boolean).length || 0,
        ),
        logos,
        logoSizes,
        cardHeights,
        actionBottoms,
        forbidden,
        evidenceGrounded,
        demoRangeCount:
          (text.match(/Ενδεικτικό demo εύρος κόστους/g) || []).length,
        pricingDisclaimerCount:
          (text.match(/Το ποσό δημιουργείται αποκλειστικά για σκοπούς επίδειξης/g) || []).length,
      };
    })()`);

    if (
      hasMappingError ||
      new Set(programIds).size !== 3 ||
      resultsPresentation.cardCount !== 3 ||
      new Set(resultsPresentation.reasons).size !== 3 ||
      resultsPresentation.reasons.some(
        (reason) =>
          !reason ||
          reason.includes("Προτιμάται η πληρέστερη διαθέσιμη προστασία"),
      ) ||
      resultsPresentation.logos.some((loaded) => !loaded) ||
      resultsPresentation.logoSizes.some(
        (size) => !size || Math.abs(size.width - 118) > 2 || Math.abs(size.height - 58) > 2,
      ) ||
      Math.max(...resultsPresentation.cardHeights) -
          Math.min(...resultsPresentation.cardHeights) >
        2 ||
      Math.max(...resultsPresentation.actionBottoms) -
          Math.min(...resultsPresentation.actionBottoms) >
        2 ||
      resultsPresentation.reasonWordCounts.some(
        (count) => count < 45 || count > 65,
      ) ||
      resultsPresentation.forbidden.length > 0 ||
      resultsPresentation.evidenceGrounded.some(
        (check) =>
          check.strengthCount !== 3 ||
          check.reasonMatches < 2 ||
          !check.strengthsMatch,
      ) ||
      resultsPresentation.demoRangeCount !== 3 ||
      resultsPresentation.pricingDisclaimerCount !== 1
    ) {
      throw new Error(
        `Results presentation check failed: ${JSON.stringify({
          hasMappingError,
          programIds,
          resultsPresentation,
        })}`,
      );
    }
    const desktopResultsFits = await evaluate(
      `document.documentElement.scrollWidth <= window.innerWidth`,
    );
    if (!desktopResultsFits) {
      throw new Error("Horizontal overflow detected in desktop results.");
    }

    await cdp.send("Page.reload", { ignoreCache: true });
    const refreshedResultsProgramIds = await waitFor(`(() => {
      if (location.pathname !== "/results") return null;
      const ids = [...new Set(
        [...document.querySelectorAll('a[href^="/results/"]')]
          .map((link) => link.getAttribute("href").split("/").at(-1))
          .filter(Boolean),
      )];
      return ids.length === 3 ? ids : null;
    })()`, 45_000);
    if (
      JSON.stringify([...refreshedResultsProgramIds].sort()) !==
      JSON.stringify([...programIds].sort())
    ) {
      throw new Error("Results refresh did not preserve the three database products.");
    }

    const detailChecks = [];
    for (const programId of programIds) {
      await navigate(`/results/${programId}`);
      const detailCheck = await waitFor(`(() => {
        const heading = [...document.querySelectorAll("h2")].find((element) =>
          element.textContent.includes("Γιατί ταιριάζει στο προφίλ σου"),
        );
        const paragraph = heading?.parentElement?.querySelector(
          '[class*="explanationCopy"]',
        )?.textContent.trim();
        if (!paragraph) return null;

        const customerMain = document.querySelector("main").cloneNode(true);
        customerMain
          .querySelectorAll('[class*="technicalDetails"]')
          .forEach((node) => node.remove());
        const customerText = customerMain.textContent;
        const forbidden = [
          "DATABASE PROGRAM DETAIL",
          "DATABASE SIGNALS",
          "DATABASE WARNINGS",
          "EVIDENCE REFERENCES",
          "MISSING EVIDENCE",
          "demo_only",
          "human_review_required",
          "draft_signals",
          "missing_evidence",
          "waiting periods",
          "deductible",
          "coverage",
          "database signal",
        ].filter((value) => customerText.includes(value));
        const image = document.querySelector('img[alt^="Λογότυπο"]');
        const logoRect = image?.parentElement?.getBoundingClientRect();
        const evidenceCards = [...document.querySelectorAll('[data-evidence-topic]')];
        const evidenceKeys = evidenceCards.map((card) => {
          const title = card.querySelector("h3")?.textContent.trim() || "";
          const summary = card.querySelector("p")?.textContent.trim() || "";
          return (title + "::" + summary)
            .normalize("NFD")
            .replace(/[\\u0300-\\u036f]/g, "")
            .toLocaleLowerCase("el-GR")
            .replace(/\\s+/g, " ")
            .trim();
        });
        const renderedEvidenceKeys = evidenceCards.map(
          (card) =>
            card.dataset.evidenceKind + ":" + card.dataset.evidenceTopic,
        );
        const kindTitleRules = evidenceCards.every((card) => {
          const kind = card.dataset.evidenceKind;
          const title = card.querySelector("h3")?.textContent || "";
          if (kind === "deductible") return /απαλλαγ|συμμετοχ/iu.test(title);
          if (kind === "waiting_period") return /περίοδος αναμονής/iu.test(title);
          return true;
        });
        const initiallyVisibleEvidenceCount = evidenceCards.filter(
          (card) => !card.closest("details"),
        ).length;
        const moreEvidenceControl = [...document.querySelectorAll("summary")].find(
          (summary) => summary.textContent.includes("Δες περισσότερα στοιχεία τεκμηρίωσης"),
        );
        const pricingDisclaimerCount = (
          customerText.match(/Το ποσό δημιουργείται αποκλειστικά για σκοπούς επίδειξης/g) || []
        ).length;

        return {
          programId: ${JSON.stringify(programId)},
          wordCount: paragraph.split(/\\s+/).filter(Boolean).length,
          paragraph,
          logoLoaded: Boolean(image && image.complete && image.naturalWidth > 0),
          logoSize: logoRect
            ? { width: Math.round(logoRect.width), height: Math.round(logoRect.height) }
            : null,
          forbidden,
          hasEllipsis: /…|\\.\\.\\./u.test(paragraph),
          hasUngroundedNetworkClaim: /μεγάλο δίκτυο νοσοκομείων/iu.test(paragraph),
          hasUngroundedZeroDeductibleClaim: /μηδενική απαλλαγή/iu.test(paragraph),
          evidenceCount: evidenceCards.length,
          exactEvidenceDuplicates: evidenceKeys.length - new Set(evidenceKeys).size,
          renderedEvidenceKeyDuplicates:
            renderedEvidenceKeys.length - new Set(renderedEvidenceKeys).size,
          kindTitleRules,
          initiallyVisibleEvidenceCount,
          moreEvidenceControlCorrect:
            evidenceCards.length <= 6 ? !moreEvidenceControl : Boolean(moreEvidenceControl),
          hasConfirmationSection: customerText.includes(
            "Σημεία που θα επιβεβαιώσει ο σύμβουλος",
          ),
          pricingDisclaimerCount,
        };
      })()`, 45_000);

      if (
        detailCheck.wordCount < 80 ||
        detailCheck.wordCount > 120 ||
        !detailCheck.logoLoaded ||
        !detailCheck.logoSize ||
        Math.abs(detailCheck.logoSize.width - 150) > 2 ||
        Math.abs(detailCheck.logoSize.height - 68) > 2 ||
        detailCheck.forbidden.length > 0 ||
        detailCheck.hasEllipsis ||
        detailCheck.hasUngroundedNetworkClaim ||
        detailCheck.hasUngroundedZeroDeductibleClaim ||
        detailCheck.evidenceCount === 0 ||
        detailCheck.exactEvidenceDuplicates !== 0 ||
        detailCheck.renderedEvidenceKeyDuplicates !== 0 ||
        !detailCheck.kindTitleRules ||
        detailCheck.initiallyVisibleEvidenceCount > 6 ||
        !detailCheck.moreEvidenceControlCorrect ||
        !detailCheck.hasConfirmationSection ||
        detailCheck.pricingDisclaimerCount !== 1
      ) {
        throw new Error(
          `Detail presentation check failed for ${programId}: ${JSON.stringify(detailCheck)}`,
        );
      }
      detailChecks.push(detailCheck);
    }

    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(`Boolean(document.querySelector('[class*="explanationCopy"]'))`, 45_000);
    const refreshPreservedDetail = await evaluate(
      `location.pathname === ${JSON.stringify(`/results/${programIds.at(-1)}`)} && Boolean(document.querySelector('img[alt^="Λογότυπο"]'))`,
    );
    if (!refreshPreservedDetail) {
      throw new Error("Detail refresh did not preserve the database result.");
    }

    const malformedExplanationStatus = await evaluate(`fetch(
      "/api/recommendation-explanation",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate: "1990-01-01" }),
      },
    ).then((response) => response.status)`);
    if (malformedExplanationStatus !== 400) {
      throw new Error("The explanation API accepted a malformed/PII request.");
    }

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await navigate("/results");
    await waitFor(`document.querySelectorAll('a[href^="/results/"]').length >= 3`, 45_000);
    const mobileResultsFits = await evaluate(
      `document.documentElement.scrollWidth <= window.innerWidth`,
    );
    const mobileCardLogoSizes = await evaluate(`(() =>
      [...document.querySelectorAll("article")]
        .filter((card) => card.querySelector('a[href^="/results/"]'))
        .map((card) => {
          const image = card.querySelector('img[alt^="Λογότυπο"]');
          const rect = image?.parentElement?.getBoundingClientRect();
          return rect
            ? { width: Math.round(rect.width), height: Math.round(rect.height) }
            : null;
        })
    )()`);
    await navigate(`/results/${programIds[0]}`);
    await waitFor(`Boolean(document.querySelector('[class*="explanationCopy"]'))`, 45_000);
    const mobileDetailFits = await evaluate(
      `document.documentElement.scrollWidth <= window.innerWidth`,
    );
    const mobileDetailLogoSize = await evaluate(`(() => {
      const image = document.querySelector('img[alt^="Λογότυπο"]');
      const rect = image?.parentElement?.getBoundingClientRect();
      return rect
        ? { width: Math.round(rect.width), height: Math.round(rect.height) }
        : null;
    })()`);
    if (
      !mobileResultsFits ||
      !mobileDetailFits ||
      mobileCardLogoSizes.some(
        (size) =>
          !size ||
          Math.abs(size.width - 96) > 2 ||
          Math.abs(size.height - 46) > 2,
      ) ||
      !mobileDetailLogoSize ||
      Math.abs(mobileDetailLogoSize.width - 150) > 2 ||
      Math.abs(mobileDetailLogoSize.height - 68) > 2
    ) {
      throw new Error("Horizontal overflow detected in mobile presentation.");
    }

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate("sessionStorage.clear(); true");
    await navigate("/assessment");

    await choose("insured-people", "self");
    await clickButton("Συνέχεια");
    await waitFor(`Boolean(document.querySelector('input[type="date"]'))`);
    await evaluate(`(() => {
      const input = document.querySelector('input[type="date"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, "1980-01-01");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    await clickButton("Συνέχεια");
    await choose("current-insurance", "none");
    await clickButton("Συνέχεια");
    await choose("evaluation-goal", "first_time");
    await clickButton("Συνέχεια");
    for (const value of ["hospital-network", "emergency", "high-limit"]) {
      await choose("priorities", value);
    }
    await clickButton("Συνέχεια");
    await choose("deductible", "minimum");
    await clickButton("Συνέχεια");
    await choose("cost-approach", "complete");
    await clickButton("Συνέχεια");
    for (const value of ["provider_freedom", "low_bureaucracy"]) {
      await choose("additional-needs", value);
    }
    await clickButton("Ολοκλήρωση");
    await waitFor(`location.pathname === "/assessment/profile"`);
    await waitFor(
      `Boolean(document.querySelector('a[href="/results"]'))`,
    );
    await evaluate(`document.querySelector('a[href="/results"]').click(); true`);
    await waitFor(`location.pathname === "/results"`);
    await waitFor(
      `Boolean(document.querySelector('a[href="/results/INT-MS"]'))`,
      45_000,
    );

    const interamericanCardCheck = await evaluate(`(() => {
      const link = document.querySelector('a[href="/results/INT-MS"]');
      const card = link?.closest("article");
      const image = card?.querySelector('img[alt^="Λογότυπο"]');
      const rect = image?.parentElement?.getBoundingClientRect();
      return {
        insurerVisible: Boolean(card?.textContent.includes("INTERAMERICAN")),
        logoLoaded: Boolean(image && image.complete && image.naturalWidth > 0),
        logoSize: rect
          ? { width: Math.round(rect.width), height: Math.round(rect.height) }
          : null,
      };
    })()`);
    if (
      !interamericanCardCheck.insurerVisible ||
      !interamericanCardCheck.logoLoaded ||
      !interamericanCardCheck.logoSize ||
      Math.abs(interamericanCardCheck.logoSize.width - 118) > 2 ||
      Math.abs(interamericanCardCheck.logoSize.height - 58) > 2
    ) {
      throw new Error(
        `Interamerican card logo check failed: ${JSON.stringify(interamericanCardCheck)}`,
      );
    }

    await navigate("/results/INT-MS");
    const interamericanDetailCheck = await waitFor(`(() => {
      const paragraph = document.querySelector('[class*="explanationCopy"]')?.textContent.trim();
      if (!paragraph) return null;
      const image = document.querySelector('img[alt^="Λογότυπο"]');
      const rect = image?.parentElement?.getBoundingClientRect();
      const evidenceCards = [...document.querySelectorAll('[data-evidence-topic]')];
      const evidenceKeys = evidenceCards.map((card) =>
        ((card.querySelector("h3")?.textContent || "") + "::" +
          (card.querySelector("p")?.textContent || ""))
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLocaleLowerCase("el-GR")
          .replace(/\\s+/g, " ")
          .trim(),
      );
      const renderedEvidenceKeys = evidenceCards.map(
        (card) =>
          card.dataset.evidenceKind + ":" + card.dataset.evidenceTopic,
      );
      const text = document.querySelector("main").textContent;
      return {
        wordCount: paragraph.split(/\\s+/).filter(Boolean).length,
        hasEllipsis: /…|\\.\\.\\./u.test(paragraph),
        hasEnglishWaitingPeriod: /waiting periods?/iu.test(text),
        logoLoaded: Boolean(image && image.complete && image.naturalWidth > 0),
        logoSize: rect
          ? { width: Math.round(rect.width), height: Math.round(rect.height) }
          : null,
        evidenceCount: evidenceCards.length,
        exactEvidenceDuplicates: evidenceKeys.length - new Set(evidenceKeys).size,
        renderedEvidenceKeyDuplicates:
          renderedEvidenceKeys.length - new Set(renderedEvidenceKeys).size,
        pricingDisclaimerCount: (
          text.match(/Το ποσό δημιουργείται αποκλειστικά για σκοπούς επίδειξης/g) || []
        ).length,
      };
    })()`, 45_000);
    if (
      interamericanDetailCheck.wordCount < 80 ||
      interamericanDetailCheck.wordCount > 120 ||
      interamericanDetailCheck.hasEllipsis ||
      interamericanDetailCheck.hasEnglishWaitingPeriod ||
      !interamericanDetailCheck.logoLoaded ||
      !interamericanDetailCheck.logoSize ||
      Math.abs(interamericanDetailCheck.logoSize.width - 150) > 2 ||
      Math.abs(interamericanDetailCheck.logoSize.height - 68) > 2 ||
      interamericanDetailCheck.evidenceCount === 0 ||
      interamericanDetailCheck.exactEvidenceDuplicates !== 0 ||
      interamericanDetailCheck.renderedEvidenceKeyDuplicates !== 0 ||
      interamericanDetailCheck.pricingDisclaimerCount !== 1
    ) {
      throw new Error(
        `Interamerican detail check failed: ${JSON.stringify(interamericanDetailCheck)}`,
      );
    }

    const duplicateReactKeyWarnings = browserMessages.filter((message) =>
      message.includes("Encountered two children with the same key"),
    );
    if (duplicateReactKeyWarnings.length > 0) {
      throw new Error("Duplicate React key warning detected in the browser console.");
    }

    console.log(
      JSON.stringify({
        assessmentUrl: `${APP_ORIGIN}/assessment`,
        profileUrl,
        resultsUrl,
        sessionKeys,
        programIds,
        resultsPresentation,
        detailChecks,
        desktopResultsFits,
        refreshedResultsProgramIds,
        refreshPreservedDetail,
        malformedExplanationStatus,
        mobileResultsFits,
        mobileDetailFits,
        mobileCardLogoSizes,
        mobileDetailLogoSize,
        interamericanProductId: "INT-MS",
        interamericanCardCheck,
        interamericanDetailCheck,
        duplicateReactKeyWarnings: 0,
      }),
    );

    await cdp.send("Browser.close");
  } finally {
    cdp?.close();
    browser.kill();
    await delay(300);
    await rm(profileDirectory, { recursive: true, force: true }).catch(
      () => undefined,
    );
  }
}

await run();
