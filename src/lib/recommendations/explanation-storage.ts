import { ASSESSMENT_SESSION_VERSION } from "@/lib/assessment/types";

import type { LiveRecommendationCategory } from "./contracts";
import { isValidExplanationParagraph } from "./explanation";

const EXPLANATION_SESSION_PREFIX =
  "insurancemarket.recommendation-explanation.grounded-v3.";

export function explanationSessionKey(
  programId: string,
  category: LiveRecommendationCategory,
  inputSignature: string,
) {
  let hash = 2_166_136_261;
  for (const character of inputSignature) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return `${EXPLANATION_SESSION_PREFIX}v${ASSESSMENT_SESSION_VERSION}.${encodeURIComponent(programId)}.${category}.${(hash >>> 0).toString(36)}`;
}

export function readExplanation(
  programId: string,
  category: LiveRecommendationCategory,
  inputSignature: string,
) {
  if (typeof window === "undefined") return null;

  try {
    const value = window.sessionStorage.getItem(
      explanationSessionKey(programId, category, inputSignature),
    );
    return isValidExplanationParagraph(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeExplanation(
  programId: string,
  category: LiveRecommendationCategory,
  inputSignature: string,
  paragraph: string,
) {
  if (typeof window === "undefined" || !isValidExplanationParagraph(paragraph)) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      explanationSessionKey(programId, category, inputSignature),
      paragraph,
    );
  } catch {
    // The deterministic paragraph remains available in the current render.
  }
}

export function clearExplanations() {
  if (typeof window === "undefined") return;

  try {
    const keys = Array.from(
      { length: window.sessionStorage.length },
      (_, index) => window.sessionStorage.key(index),
    ).filter(
      (key): key is string =>
        typeof key === "string" && key.startsWith(EXPLANATION_SESSION_PREFIX),
    );

    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // A new assessment can still continue when storage is unavailable.
  }
}
