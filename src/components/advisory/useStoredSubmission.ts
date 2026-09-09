"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  isCompleteAssessmentSubmission,
  readAssessmentSession,
} from "@/lib/assessment/storage";
import type { AssessmentSubmission } from "@/lib/assessment/types";

export function useStoredSubmission() {
  const router = useRouter();
  const [submission, setSubmission] = useState<AssessmentSubmission>();

  useEffect(() => {
    const session = readAssessmentSession();

    if (!session || !isCompleteAssessmentSubmission(session.submission)) {
      router.replace("/assessment");
      return;
    }

    const hydrationTimer = window.setTimeout(() => {
      setSubmission(session.submission);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [router]);

  return submission;
}
