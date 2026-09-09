export const LEAD_SUBMISSION_SESSION_KEY =
  "insurancemarket.health-lead-submission.session.v2";

export const LEGACY_LEAD_SUBMISSION_SESSION_KEYS = [
  "insurancemarket.health-lead-submission.session.v1",
] as const;

export function removeStoredLeadSubmission() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(LEAD_SUBMISSION_SESSION_KEY);
    for (const key of LEGACY_LEAD_SUBMISSION_SESSION_KEYS) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Starting a new flow still works when browser storage is blocked.
  }
}

export function clearLeadSubmission() {
  removeStoredLeadSubmission();
}
