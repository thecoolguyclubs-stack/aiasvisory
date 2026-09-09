import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

import {
  buildDeterministicExplanation,
  validateRecommendationExplanationOutput,
} from "../src/lib/recommendations/explanation.ts";

const APP_PORT = 3198;
const OPENAI_PORT = 8892;
const APP_ORIGIN = `http://localhost:${APP_PORT}`;
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
  throw new Error("OpenAI success-path runtime check timed out.");
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

const fallback = buildDeterministicExplanation(fixture);
const simulatedModelOutput = {
  ...fallback,
  paragraph: fallback.paragraph.replace(
    "Η επεξήγηση συνδέει μόνο",
    "Η ανάλυση συνδέει αποκλειστικά",
  ),
};
assert.ok(
  validateRecommendationExplanationOutput(simulatedModelOutput, fixture),
);

let requestContractValidated = false;
let openAIRequestCount = 0;
const openaiServer = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    try {
      assert.equal(request.method, "POST");
      assert.equal(request.url, "/v1/responses");
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.equal(Array.isArray(body.input), true);
      assert.equal(body.input.length, 1);
      assert.equal(body.input[0]?.role, "user");
      const input = JSON.parse(body.input[0]?.content);
      assert.deepEqual(input, fixture);
      assert.equal(body.store, false);
      assert.equal(body.text?.format?.type, "json_schema");
      assert.equal(body.text?.format?.strict, true);
      assert.deepEqual(body.text?.format?.schema?.required, [
        "paragraph",
        "usedClaimIds",
        "confirmationNote",
      ]);
      assert.match(
        body.instructions,
        /αποκλειστικά από τα allowedClaims/u,
      );
      requestContractValidated = true;
      openAIRequestCount += 1;
      const output =
        openAIRequestCount === 1
          ? simulatedModelOutput
          : {
              ...simulatedModelOutput,
              usedClaimIds: ["claim-01", "invented-claim"],
            };

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          id: "resp_presentation_success_test",
          object: "response",
          created_at: Math.floor(Date.now() / 1000),
          status: "completed",
          model: body.model,
          output: [
            {
              id: "msg_presentation_success_test",
              type: "message",
              status: "completed",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(output),
                  annotations: [],
                },
              ],
            },
          ],
        }),
      );
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: String(error) } }));
    }
  });
});

await new Promise((resolve, reject) => {
  openaiServer.once("error", reject);
  openaiServer.listen(OPENAI_PORT, "127.0.0.1", resolve);
});

const appServer = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(APP_PORT)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      OPENAI_API_KEY: "sk-local-structured-output-success-test",
      OPENAI_BASE_URL: `http://127.0.0.1:${OPENAI_PORT}/v1`,
      OPENAI_EXPLANATION_MODEL: "presentation-success-test-model",
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

  assert.equal(response.ok, true);
  assert.equal(requestContractValidated, true);
  assert.deepEqual(payload, simulatedModelOutput);
  assert.ok(validateRecommendationExplanationOutput(payload, fixture));
  assert.notDeepEqual(payload, fallback);

  const rejectedResponse = await fetch(
    `${APP_ORIGIN}/api/recommendation-explanation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fixture),
    },
  );
  const rejectedPayload = await rejectedResponse.json();
  assert.equal(rejectedResponse.ok, true);
  assert.equal(openAIRequestCount, 2);
  assert.deepEqual(
    rejectedPayload,
    fallback,
    "An OpenAI output with an unknown claim ID must be rejected in full.",
  );

  console.log(
    JSON.stringify({
      ok: true,
      structuredOpenAIRequestValidated: true,
      acceptedValidatedModelOutput: true,
      rejectedUnknownClaimIdToFallback: true,
      safeResponseFields: Object.keys(payload).sort(),
      wordCount: payload.paragraph.split(/\s+/).filter(Boolean).length,
      usedClaimIds: payload.usedClaimIds,
    }),
  );
} finally {
  appServer.kill();
  await new Promise((resolve) => openaiServer.close(resolve));
  await delay(500);
}
