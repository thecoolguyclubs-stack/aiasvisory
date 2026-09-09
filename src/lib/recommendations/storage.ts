import type { AssessmentSubmission } from "@/lib/assessment/types";

import {
  isLiveRecommendationsResponse,
  type LiveRecommendationsResponse,
} from "./contracts";

const RECOMMENDATION_SESSION_KEY =
  "insurancemarket.health-recommendations.session.v1";

interface RecommendationSessionSnapshot {
  version: 1;
  assessmentSubmittedAt: string;
  response: LiveRecommendationsResponse;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function writeRecommendationSnapshot(
  submission: AssessmentSubmission,
  response: LiveRecommendationsResponse,
) {
  if (typeof window === "undefined" || !submission.submittedAt) return;

  const snapshot: RecommendationSessionSnapshot = {
    version: 1,
    assessmentSubmittedAt: submission.submittedAt,
    response,
  };

  try {
    window.sessionStorage.setItem(
      RECOMMENDATION_SESSION_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // Results stay usable for the current render if session storage is blocked.
  }
}

export function readRecommendationSnapshot(
  submission: AssessmentSubmission,
): LiveRecommendationsResponse | null {
  if (typeof window === "undefined" || !submission.submittedAt) return null;

  try {
    const raw = window.sessionStorage.getItem(RECOMMENDATION_SESSION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      typeof parsed.assessmentSubmittedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.assessmentSubmittedAt)) ||
      parsed.assessmentSubmittedAt !== submission.submittedAt ||
      !isLiveRecommendationsResponse(parsed.response)
    ) {
      window.sessionStorage.removeItem(RECOMMENDATION_SESSION_KEY);
      return null;
    }

    return parsed.response;
  } catch {
    try {
      window.sessionStorage.removeItem(RECOMMENDATION_SESSION_KEY);
    } catch {
      // Ignore storage failures and let the results route rebuild safely.
    }
    return null;
  }
}

export function clearRecommendationSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RECOMMENDATION_SESSION_KEY);
  } catch {
    // Removing a policy analysis still works when storage is blocked.
  }
}
