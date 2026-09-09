import { getServerSupabaseClient } from "@/lib/supabase/server";

interface RecommendationContractRow {
  category_code: string;
  category_label: string;
  company_name: string;
  evidence: unknown[];
  matched_signals: unknown[];
  missing_signals: unknown[];
  product_id: string;
  product_name: string;
  score: number;
  warnings: unknown[];
}

const EXPECTED_CATEGORIES = [
  "best_match",
  "premium_choice",
  "smart_budget_choice",
] as const;

const RECOMMENDATION_SMOKE_FIXTURE = {
  insured_people: "self",
  birth_dates: [{ birth_date: "1985-06-15" }],
  existing_insurance: "none",
  evaluation_goal: "first_time",
  priorities: [
    "private_hospitals",
    "major_hospitalization",
    "emergency",
  ],
  deductible_preference: "balanced",
  protection_cost: "balanced",
  additional_needs: ["physiotherapy", "prevention_checkup"],
  existing_policy_upload: {},
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function parseRecommendationRows(
  value: unknown,
): RecommendationContractRow[] | null {
  if (!Array.isArray(value)) return null;

  const rows: RecommendationContractRow[] = [];

  for (const item of value) {
    if (!isRecord(item)) return null;

    const row = item;

    if (
      typeof row.category_code !== "string" ||
      typeof row.category_label !== "string" ||
      typeof row.product_id !== "string" ||
      typeof row.product_name !== "string" ||
      typeof row.company_name !== "string" ||
      typeof row.score !== "number" ||
      !Array.isArray(row.matched_signals) ||
      !Array.isArray(row.missing_signals) ||
      !Array.isArray(row.evidence) ||
      !Array.isArray(row.warnings)
    ) {
      return null;
    }

    rows.push({
      category_code: row.category_code,
      category_label: row.category_label,
      company_name: row.company_name,
      evidence: row.evidence,
      matched_signals: row.matched_signals,
      missing_signals: row.missing_signals,
      product_id: row.product_id,
      product_name: row.product_name,
      score: row.score,
      warnings: row.warnings,
    });
  }

  return rows;
}

function hasExpectedRecommendations(rows: RecommendationContractRow[]) {
  if (rows.length !== EXPECTED_CATEGORIES.length) return false;

  const categories = rows.map((row) => row.category_code);
  const productIds = rows.map((row) => row.product_id);

  return (
    EXPECTED_CATEGORIES.every((category) => categories.includes(category)) &&
    new Set(categories).size === EXPECTED_CATEGORIES.length &&
    new Set(productIds).size === EXPECTED_CATEGORIES.length
  );
}

const failureResponse = () =>
  Response.json(
    { ok: false, message: "Database recommendation check failed" },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getServerSupabaseClient();
    const recommendationResult = await supabase.rpc(
      "preview_demo_recommendations",
      { p_answers: RECOMMENDATION_SMOKE_FIXTURE },
    );

    if (recommendationResult.error) return failureResponse();

    const recommendations = parseRecommendationRows(
      recommendationResult.data as unknown,
    );

    if (!recommendations || !hasExpectedRecommendations(recommendations)) {
      return failureResponse();
    }

    const firstProductId = recommendations[0].product_id;
    const productDetailResult = await supabase.rpc("product_detail", {
      p_product_id: firstProductId,
      p_allow_draft: false,
    });

    if (productDetailResult.error) return failureResponse();

    const productDetail = productDetailResult.data as unknown;
    const productDetailFound =
      isRecord(productDetail) && productDetail.product_id === firstProductId;

    if (!productDetailFound) return failureResponse();

    return Response.json(
      {
        ok: true,
        source: "supabase",
        recommendationCount: recommendations.length,
        categories: recommendations.map((row) => row.category_label),
        productIds: recommendations.map((row) => row.product_id),
        productDetailFound,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failureResponse();
  }
}
