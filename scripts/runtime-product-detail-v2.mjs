import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";
import { normalizeDatabaseProgramDetail } from "../src/lib/recommendations/database-normalization.ts";
import { normalizeProductFacts } from "../src/lib/recommendations/product-facts.ts";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/u)
    .filter((line) => line && !line.trimStart().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return separator < 0
        ? [line.trim(), ""]
        : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

assert.ok(env.NEXT_PUBLIC_SUPABASE_URL, "Missing Supabase URL.");
assert.ok(env.SUPABASE_SECRET_KEY, "Missing server-side Supabase key.");

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "app_api" },
  },
);

const productIds = ["GEN-MP", "GEN-MF", "GRO-SPR", "INT-MS"];
const arrayFields = [
  "coverage_facts",
  "deductible_rules",
  "monetary_facts",
  "waiting_periods",
  "exclusions",
  "provider_networks",
  "procedure_fees",
  "supplementary_benefits",
  "claim_rules",
];
const counts = {};
const safeFieldNames = {};
const safeExamples = {};

for (const productId of productIds) {
  const { data, error } = await supabase.rpc("product_detail", {
    p_product_id: productId,
    p_allow_draft: true,
  });

  assert.equal(error, null, `product_detail failed for ${productId}.`);
  assert.equal(data?.contract_version, "product-detail-2026-07-v2");
  assert.equal(data?.product_id, productId);
  const detail = normalizeDatabaseProgramDetail(data);
  assert.ok(detail, `Strict v2 normalization failed for ${productId}.`);
  const comparableFacts = normalizeProductFacts(detail);
  const comparableKeys = comparableFacts.map((fact) =>
    [
      fact.sourceRecordType,
      fact.factId,
      fact.topicKey,
      fact.scope,
      fact.measureType,
      fact.valueNumber ?? "",
      fact.currency ?? "",
      fact.exactText,
      fact.conditions.join("|"),
    ].join("::"),
  );
  assert.equal(new Set(comparableKeys).size, comparableKeys.length);

  counts[productId] = Object.fromEntries(
    arrayFields.map((field) => {
      assert.ok(Array.isArray(data?.[field]), `${field} must be an array.`);
      return [field, data[field].length];
    }),
  );
  safeFieldNames[productId] = Object.fromEntries(
    arrayFields.map((field) => [field, Object.keys(data[field][0] ?? {}).sort()]),
  );
  const highestProcedureFee = [...data.procedure_fees]
    .filter((fee) => typeof fee.amount === "number")
    .sort((left, right) => right.amount - left.amount)[0];
  safeExamples[productId] = {
    highestProcedureFee: highestProcedureFee
      ? {
          amount: highestProcedureFee.amount,
          currency: highestProcedureFee.currency ?? null,
          feeType: highestProcedureFee.fee_type ?? null,
        }
      : null,
    highestComparableProcedureFee: comparableFacts
      .filter(
        (fact) =>
          fact.measureType === "procedure_fee" && fact.valueNumber !== null,
      )
      .sort((left, right) => right.valueNumber - left.valueNumber)
      .slice(0, 1)
      .map((fact) => ({
        amount: fact.valueNumber,
        currency: fact.currency,
        exactText: fact.exactText,
      }))[0] ?? null,
    comparableFactCount: comparableFacts.length,
    monetaryExcerpt: data.monetary_facts[0]?.exact_excerpt?.slice(0, 180) ?? null,
  };
}

console.log(
  JSON.stringify({
    ok: true,
    source: "supabase",
    contractVersion: "product-detail-2026-07-v2",
    counts,
    safeFieldNames,
    safeExamples,
  }),
);
