import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const APP_ORIGIN = "http://localhost:3197";
const OPENAI_PORT = 8893;
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function retry(operation, timeout = 25_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const result = await operation();
      if (result) return result;
    } catch {
      // The isolated production server may still be starting.
    }
    await delay(200);
  }
  throw new Error("OpenAI failure fallback runtime check timed out.");
}

const fixture = {
  category: "best-match",
  relatedNeeds: [
    "αντιμετώπιση επειγόντων περιστατικών",
    "στάθμιση προστασίας και οικονομικών όρων",
  ],
  allowedClaims: [
    {
      id: "claim-01",
      topic: "emergency",
      statement:
        "Έκτακτα και επείγοντα: Οι διαθέσιμοι όροι περιγράφουν παροχές για έκτακτα και επείγοντα περιστατικά.",
      evidenceIds: ["FACT-1"],
      sourceType: "coverage",
    },
    {
      id: "claim-02",
      topic: "hospital-care",
      statement:
        "Νοσοκομειακή περίθαλψη: Οι διαθέσιμοι όροι περιγράφουν νοσοκομειακή περίθαλψη και τις προϋποθέσεις χρήσης της.",
      evidenceIds: ["FACT-2"],
      sourceType: "coverage",
    },
    {
      id: "claim-03",
      topic: "waiting-period",
      statement:
        "Περίοδος αναμονής για γενική έναρξη ασθένειας: Οι διαθέσιμοι όροι αναφέρουν περίοδο αναμονής 1 μήνα.",
      evidenceIds: ["FACT-3"],
      sourceType: "waiting_period",
    },
  ],
  restrictions: [
    "Περίοδος αναμονής για γενική έναρξη ασθένειας: Οι διαθέσιμοι όροι αναφέρουν περίοδο αναμονής 1 μήνα.",
  ],
  productName: "Medical Prime",
  insurer: "Generali Hellas",
  strengthTitles: [
    "Έκτακτα και επείγοντα",
    "Νοσοκομειακή περίθαλψη",
  ],
  tradeOffs: [
    "Περίοδος αναμονής για γενική έναρξη ασθένειας: Οι διαθέσιμοι όροι αναφέρουν περίοδο αναμονής 1 μήνα.",
  ],
  missingEvidenceTitles: ["Επιβεβαίωση ειδικών προϋποθέσεων έναρξης"],
};

let fakeProviderRequestCount = 0;
const fakeProvider = createServer((request, response) => {
  fakeProviderRequestCount += 1;
  response.writeHead(503, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      error: { message: "Simulated local provider failure for fallback test." },
    }),
  );
});

await new Promise((resolve, reject) => {
  fakeProvider.once("error", reject);
  fakeProvider.listen(OPENAI_PORT, "127.0.0.1", resolve);
});

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3197"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      OPENAI_API_KEY: "sk-local-fallback-test",
      OPENAI_BASE_URL: `http://127.0.0.1:${OPENAI_PORT}/v1`,
      OPENAI_EXPLANATION_MODEL: "presentation-fallback-test-model",
      NODE_ENV: "production",
    },
    stdio: "ignore",
    windowsHide: true,
  },
);

try {
  await retry(async () => {
    const response = await fetch(APP_ORIGIN);
    return response.ok;
  });

  const response = await fetch(`${APP_ORIGIN}/api/recommendation-explanation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fixture),
  });
  const payload = await response.json();
  const paragraph = payload?.paragraph;
  const safeResponseFields = Object.keys(payload).sort();
  const wordCount =
    typeof paragraph === "string"
      ? paragraph.trim().split(/\s+/).filter(Boolean).length
      : 0;
  const allowedClaimIds = new Set(fixture.allowedClaims.map((claim) => claim.id));

  if (
    !response.ok ||
    typeof paragraph !== "string" ||
    wordCount < 80 ||
    wordCount > 120 ||
    /…|\.\.\./u.test(paragraph) ||
    /waiting periods?|deductible|coverage/iu.test(
      `${paragraph} ${payload?.confirmationNote ?? ""}`,
    ) ||
    JSON.stringify(safeResponseFields) !==
      JSON.stringify(["confirmationNote", "paragraph", "usedClaimIds"]) ||
    !Array.isArray(payload.usedClaimIds) ||
    payload.usedClaimIds.length < 2 ||
    payload.usedClaimIds.some((id) => !allowedClaimIds.has(id)) ||
    typeof payload.confirmationNote !== "string" ||
    payload.confirmationNote.length === 0
  ) {
    throw new Error("The OpenAI API failure did not return the safe fallback.");
  }

  assert.equal(
    fakeProviderRequestCount > 0,
    true,
    "The fallback test must exercise the local fake provider path.",
  );

  console.log(
    JSON.stringify({
      ok: true,
      simulatedFailure: true,
      localFakeProviderOnly: true,
      fakeProviderRequestCount,
      safeResponseFields,
      fallbackWordCount: wordCount,
      usedClaimIds: payload.usedClaimIds,
    }),
  );
} finally {
  server.kill();
  await new Promise((resolve) => fakeProvider.close(resolve));
  await delay(500);
}
