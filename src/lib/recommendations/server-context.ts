import "server-only";

import type { AssessmentSubmission } from "@/lib/assessment/types";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { mapAssessmentSubmissionToDatabase } from "./assessment-mapping";
import { normalizeDatabaseProgramDetail, normalizeDatabaseRecommendations } from "./database-normalization";
import { buildRecommendationPresentation } from "./presentation";

/** Reconstruct claims from the database; browser text is never insurance evidence. */
export async function loadAdvisoryContext(submission: AssessmentSubmission, programId: string) {
  const mapping = mapAssessmentSubmissionToDatabase(submission);
  if (!mapping.ok) throw new Error("Invalid assessment mapping");
  const supabase = getServerSupabaseClient();
  const ranked = await supabase.rpc("preview_demo_recommendations", { p_answers: mapping.data });
  if (ranked.error) throw new Error("Recommendation source unavailable");
  const recommendation = normalizeDatabaseRecommendations(ranked.data)?.find((item) => item.programId === programId);
  if (!recommendation) throw new Error("Product is not a current recommendation");
  const detailResult = await supabase.rpc("product_detail", { p_product_id: programId, p_allow_draft: true });
  if (detailResult.error) throw new Error("Product source unavailable");
  const detail = normalizeDatabaseProgramDetail(detailResult.data);
  if (!detail || detail.programId !== programId) throw new Error("Invalid product evidence");
  return { recommendation, detail, presentation: buildRecommendationPresentation(submission, recommendation, detail) };
}
