"use client";

import { useEffect, useMemo, useState } from "react";

import type { LiveRecommendationCategory } from "@/lib/recommendations/contracts";
import type { AssessmentSubmission } from "@/lib/assessment/types";
import {
  buildDeterministicExplanation,
  validateRecommendationExplanationOutput,
  type RecommendationExplanationInput,
} from "@/lib/recommendations/explanation";
import {
  readExplanation,
  writeExplanation,
} from "@/lib/recommendations/explanation-storage";

import styles from "./advisory.module.css";

export function RecommendationExplanation({
  category,
  input,
  programId,
  submission,
}: {
  category: LiveRecommendationCategory;
  input: RecommendationExplanationInput;
  programId: string;
  submission: AssessmentSubmission;
}) {
  const inputSignature = useMemo(() => JSON.stringify(input), [input]);
  const fallbackOutput = useMemo(
    () => buildDeterministicExplanation(input),
    [input],
  );
  const fallback = fallbackOutput.paragraph;
  const [paragraph, setParagraph] = useState<string>();

  useEffect(() => {
    const cached = readExplanation(programId, category, inputSignature);
    if (cached) {
      const timer = window.setTimeout(() => setParagraph(cached), 0);
      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch("/api/recommendation-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, submission }),
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        const validatedOutput = response.ok
          ? validateRecommendationExplanationOutput(payload, input)
          : null;
        const nextParagraph = validatedOutput?.paragraph ?? fallback;

        writeExplanation(programId, category, inputSignature, nextParagraph);
        setParagraph(nextParagraph);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        writeExplanation(programId, category, inputSignature, fallback);
        setParagraph(fallback);
      }
    };

    void load();
    return () => controller.abort();
  }, [category, fallback, input, inputSignature, programId, submission]);

  return (
    <section aria-busy={!paragraph} className={`${styles.contentSection} ${styles.explanationSection}`}>
      <p className={styles.sectionEyebrow}>ΕΠΕΞΗΓΗΣΗ ΤΗΣ ΠΡΟΤΑΣΗΣ</p>
      <h2>Γιατί ταιριάζει στο προφίλ σου</h2>
      {paragraph ? (
        <p className={styles.explanationCopy}>{paragraph}</p>
      ) : (
        <div
          aria-label="Δημιουργία επεξήγησης"
          aria-live="polite"
          className={styles.explanationSkeleton}
          role="status"
        >
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  );
}
