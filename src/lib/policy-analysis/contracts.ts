export type PolicyAnalysisErrorCode =
  | "invalid_request"
  | "invalid_file"
  | "invalid_filename"
  | "invalid_mime_type"
  | "empty_file"
  | "file_too_large"
  | "invalid_pdf_signature"
  | "analysis_aborted"
  | "analysis_timeout"
  | "provider_unavailable"
  | "invalid_provider_output";

export interface PolicyAnalysisApiError {
  ok: false;
  code: PolicyAnalysisErrorCode;
  message: string;
}

export type PolicyExtractionFailureCode =
  | "provider_unavailable"
  | "provider_timeout"
  | "request_aborted"
  | "provider_refusal"
  | "incomplete_response"
  | "invalid_output";

export function policyAnalysisFailureFromExtraction(
  failure: PolicyExtractionFailureCode,
): { code: PolicyAnalysisErrorCode; status: 408 | 502 | 504 } {
  if (failure === "request_aborted") {
    return { code: "analysis_aborted", status: 408 };
  }
  if (failure === "provider_timeout") {
    return { code: "analysis_timeout", status: 504 };
  }
  if (failure === "provider_unavailable") {
    return { code: "provider_unavailable", status: 502 };
  }
  return { code: "invalid_provider_output", status: 502 };
}

export const POLICY_ANALYSIS_ERROR_MESSAGES: Readonly<
  Record<PolicyAnalysisErrorCode, string>
> = {
  invalid_request: "Επίλεξε ένα μόνο αρχείο PDF.",
  invalid_file: "Το αρχείο δεν μπόρεσε να διαβαστεί.",
  invalid_filename: "Επίλεξε αρχείο με κατάληξη .pdf.",
  invalid_mime_type: "Επιτρέπονται μόνο αρχεία PDF.",
  empty_file: "Το PDF είναι κενό ή δεν μπορεί να αναγνωστεί.",
  file_too_large: "Το αρχείο πρέπει να είναι έως 15 MB.",
  invalid_pdf_signature: "Το αρχείο δεν έχει έγκυρη υπογραφή PDF.",
  analysis_aborted: "Η ανάλυση του PDF ακυρώθηκε.",
  analysis_timeout:
    "Η ανάλυση του PDF άργησε περισσότερο από το αναμενόμενο. Δοκίμασε ξανά ή συνέχισε χωρίς αρχείο.",
  provider_unavailable:
    "Η ανάλυση του PDF δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκίμασε ξανά ή συνέχισε χωρίς αρχείο.",
  invalid_provider_output:
    "Δεν μπορέσαμε να εξαγάγουμε με ασφάλεια τους όρους του PDF.",
};

const errorCodes = new Set<PolicyAnalysisErrorCode>(
  Object.keys(POLICY_ANALYSIS_ERROR_MESSAGES) as PolicyAnalysisErrorCode[],
);

export function isPolicyAnalysisApiError(
  value: unknown,
): value is PolicyAnalysisApiError {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return Boolean(
    candidate.ok === false &&
      typeof candidate.code === "string" &&
      errorCodes.has(candidate.code as PolicyAnalysisErrorCode) &&
      candidate.message ===
        POLICY_ANALYSIS_ERROR_MESSAGES[
          candidate.code as PolicyAnalysisErrorCode
        ],
  );
}
