"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  hasMeaningfulAssessmentProgress,
  isCompleteAssessmentSubmission,
  readAssessmentSession,
} from "@/lib/assessment/storage";

export function ResumeAssessmentLink({ className }: { className: string }) {
  const [resumeHref, setResumeHref] = useState<string>();

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const storedAssessment = readAssessmentSession();
      if (
        !storedAssessment ||
        !hasMeaningfulAssessmentProgress(storedAssessment)
      ) {
        setResumeHref(undefined);
        return;
      }

      setResumeHref(
        isCompleteAssessmentSubmission(storedAssessment.submission)
          ? "/results"
          : "/assessment",
      );
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  if (!resumeHref) return null;

  return (
    <Link className={className} href={resumeHref}>
      Συνέχισε την αξιολόγησή σου
    </Link>
  );
}
