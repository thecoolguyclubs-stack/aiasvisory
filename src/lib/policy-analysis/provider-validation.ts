export type PolicyProviderFailureCode =
  | "provider_refusal"
  | "incomplete_response"
  | "invalid_output";

export function policyProviderFailure({
  responseStatus,
  incompleteReason,
  refusalDetected,
  hasOutputParsed,
}: {
  responseStatus: string | null;
  incompleteReason: string | null;
  refusalDetected: boolean;
  hasOutputParsed: boolean;
}): PolicyProviderFailureCode | null {
  if (refusalDetected) return "provider_refusal";
  if (responseStatus !== "completed" || incompleteReason) {
    return "incomplete_response";
  }
  if (!hasOutputParsed) return "invalid_output";
  return null;
}
