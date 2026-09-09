import { generateInsuranceProfile } from "@/lib/assessment/profile";
import { buildProgramPolicyComparison } from "@/lib/policy-analysis/comparison";
import { validateExistingPolicySnapshot } from "@/lib/policy-analysis/schema";
import { mapAssessmentSubmissionToDatabase } from "@/lib/recommendations/assessment-mapping";
import type {
  LiveRecommendation,
  LiveRecommendationsResponse,
  RecommendationApiError,
} from "@/lib/recommendations/contracts";
import { normalizeDatabaseRecommendations } from "@/lib/recommendations/database-normalization";
import { normalizeDatabaseProgramDetail } from "@/lib/recommendations/database-normalization";
import { normalizeProductFacts } from "@/lib/recommendations/product-facts";
import { validateAssessmentSubmission } from "@/lib/recommendations/request-validation";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const noStoreHeaders = { "Cache-Control": "no-store" };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function errorResponse(
  body: RecommendationApiError,
  status: 400 | 422 | 502 | 503,
) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return errorResponse(
      {
        ok: false,
        code: "invalid_request",
        message: "Το αίτημα προτάσεων δεν είναι έγκυρο.",
      },
      400,
    );
  }

  const validation = validateAssessmentSubmission(requestBody);

  if (!validation.ok) {
    return errorResponse(
      {
        ok: false,
        code: "invalid_request",
        message: "Το αίτημα προτάσεων δεν είναι έγκυρο.",
      },
      400,
    );
  }

  const policySnapshotValue =
    isRecord(requestBody) && "policySnapshot" in requestBody
      ? requestBody.policySnapshot
      : null;
  const policySnapshotValidation =
    policySnapshotValue === null
      ? null
      : validateExistingPolicySnapshot(policySnapshotValue);

  if (policySnapshotValidation && !policySnapshotValidation.ok) {
    return errorResponse(
      {
        ok: false,
        code: "invalid_policy_snapshot",
        message: "Η αποθηκευμένη ανάλυση συμβολαίου δεν είναι έγκυρη.",
      },
      422,
    );
  }

  const mapping = mapAssessmentSubmissionToDatabase(validation.submission);

  if (!mapping.ok) {
    return errorResponse(
      {
        ok: false,
        code: "assessment_mapping_error",
        message:
          "Κάποιες απαντήσεις δεν αντιστοιχούν ακόμη με ακρίβεια στο database assessment contract.",
        mappingErrors: mapping.errors.map((error) => ({
          field: error.field,
          code: error.code,
          message: error.message,
        })),
      },
      422,
    );
  }

  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.rpc(
      "preview_demo_recommendations",
      { p_answers: mapping.data },
    );

    if (error) {
      return errorResponse(
        {
          ok: false,
          code: "database_unavailable",
          message: "Οι προτάσεις δεν είναι διαθέσιμες αυτή τη στιγμή.",
        },
        503,
      );
    }

    const normalizedRecommendations = normalizeDatabaseRecommendations(
      data as unknown,
    );

    if (!normalizedRecommendations) {
      return errorResponse(
        {
          ok: false,
          code: "invalid_database_response",
          message: "Η βάση δεν επέστρεψε έγκυρο σύνολο προτάσεων.",
        },
        502,
      );
    }
    let recommendations: LiveRecommendation[] = normalizedRecommendations;

    if (policySnapshotValidation?.ok) {
      const detailResults = await Promise.all(
        recommendations.map((recommendation) =>
          supabase.rpc("product_detail", {
            p_product_id: recommendation.programId,
            p_allow_draft: true,
          }),
        ),
      );

      if (detailResults.some((result) => result.error || result.data === null)) {
        return errorResponse(
          {
            ok: false,
            code: "database_unavailable",
            message: "Η σύγκριση συμβολαίου δεν είναι διαθέσιμη αυτή τη στιγμή.",
          },
          503,
        );
      }

      const programDetails = detailResults.map((result) =>
        normalizeDatabaseProgramDetail(result.data as unknown),
      );
      if (
        programDetails.some(
          (detail, index) =>
            !detail || detail.programId !== recommendations[index].programId,
        )
      ) {
        return errorResponse(
          {
            ok: false,
            code: "invalid_database_response",
            message: "Δεν επιστράφηκαν έγκυρα στοιχεία για τη σύγκριση.",
          },
          502,
        );
      }

      const profile = generateInsuranceProfile(validation.submission);
      recommendations = recommendations.map((recommendation, index) => {
        const detail = programDetails[index];
        if (!detail) return recommendation;
        const proposedFacts = normalizeProductFacts(detail);

        return {
          ...recommendation,
          policyComparison: buildProgramPolicyComparison({
            snapshot: policySnapshotValidation.snapshot,
            submission: validation.submission,
            profile,
            recommendation,
            programDetail: detail,
            proposedFacts,
          }),
        };
      });
    }

    const response: LiveRecommendationsResponse = {
      ok: true,
      source: "supabase",
      generatedAt: new Date().toISOString(),
      recommendations,
    };

    return Response.json(response, { headers: noStoreHeaders });
  } catch {
    return errorResponse(
      {
        ok: false,
        code: "database_unavailable",
        message: "Οι προτάσεις δεν είναι διαθέσιμες αυτή τη στιγμή.",
      },
      503,
    );
  }
}
