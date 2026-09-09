import { POLICY_ANALYSIS_ERROR_MESSAGES } from "./contracts.ts";
import {
  POLICY_PDF_CANONICAL_FILENAME,
  type PolicyFileValidationResult,
} from "./file-validation.ts";
import {
  PolicyAnalysisRequestManager,
  type PolicyAnalysisRequestToken,
} from "./request-manager.ts";

export type PolicyAnalysisStatus =
  | "idle"
  | "selecting"
  | "validating"
  | "retry"
  | "uploading"
  | "analyzing"
  | "success"
  | "error";

export type PolicyAnalysisUploadResult =
  | "duplicate"
  | "success"
  | "invalid"
  | "timeout"
  | "stale"
  | "error";

export class PolicyAnalysisUploadError extends Error {
  readonly customerMessage: string;

  constructor(customerMessage: string) {
    super("Policy analysis upload failed");
    this.name = "PolicyAnalysisUploadError";
    this.customerMessage = customerMessage;
  }
}

interface PolicyAnalysisUploadOptions<T> {
  manager: PolicyAnalysisRequestManager;
  fingerprint: string;
  retrying: boolean;
  timeoutMs?: number;
  analysisDelayMs?: number;
  validateMetadata: () => PolicyFileValidationResult;
  readSignature: () => Promise<boolean>;
  beforeAnalyze: () => void;
  analyze: (signal: AbortSignal) => Promise<T>;
  commit: (value: T) => boolean;
  onStatus: (status: PolicyAnalysisStatus) => void;
  onError: (message: string | null) => void;
}

class RequestInterruptedError extends Error {}

function awaitRequestStep<T>(
  promise: Promise<T>,
  request: PolicyAnalysisRequestToken,
) {
  if (request.controller.signal.aborted) {
    return Promise.reject(new RequestInterruptedError());
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () =>
      request.controller.signal.removeEventListener("abort", interrupted);
    const interrupted = () => {
      cleanup();
      reject(new RequestInterruptedError());
    };
    request.controller.signal.addEventListener("abort", interrupted, {
      once: true,
    });

    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function requestDisposition(
  manager: PolicyAnalysisRequestManager,
  request: PolicyAnalysisRequestToken,
) {
  if (!manager.isLatest(request)) return "stale" as const;
  if (request.abortReason === "timeout") return "timeout" as const;
  if (!manager.isCurrent(request)) return "stale" as const;
  return "current" as const;
}

function ensureCurrentRequest(
  manager: PolicyAnalysisRequestManager,
  request: PolicyAnalysisRequestToken,
) {
  if (requestDisposition(manager, request) !== "current") {
    throw new RequestInterruptedError();
  }
}

export function createPolicyAnalysisFormData(file: File) {
  const formData = new FormData();
  formData.append("policyFile", file, POLICY_PDF_CANONICAL_FILENAME);
  return formData;
}

export async function runPolicyAnalysisUpload<T>({
  manager,
  fingerprint,
  retrying,
  timeoutMs,
  analysisDelayMs = 200,
  validateMetadata,
  readSignature,
  beforeAnalyze,
  analyze,
  commit,
  onStatus,
  onError,
}: PolicyAnalysisUploadOptions<T>): Promise<PolicyAnalysisUploadResult> {
  const started = manager.start(fingerprint, timeoutMs);
  if (started.kind === "duplicate") return "duplicate";

  const request = started.request;
  let analysisTimer: ReturnType<typeof setTimeout> | null = null;
  const clearAnalysisTimer = () => {
    if (analysisTimer === null) return;
    clearTimeout(analysisTimer);
    analysisTimer = null;
  };

  try {
    onStatus(retrying ? "retry" : "selecting");
    onError(null);

    const metadataValidation = validateMetadata();
    if (!metadataValidation.ok) {
      onStatus("error");
      onError(metadataValidation.message);
      return "invalid";
    }

    onStatus("validating");
    let validSignature: boolean;
    try {
      validSignature = await awaitRequestStep(readSignature(), request);
    } catch (error) {
      if (error instanceof RequestInterruptedError) throw error;
      throw new PolicyAnalysisUploadError(
        POLICY_ANALYSIS_ERROR_MESSAGES.invalid_file,
      );
    }
    ensureCurrentRequest(manager, request);

    if (!validSignature) {
      onStatus("error");
      onError(POLICY_ANALYSIS_ERROR_MESSAGES.invalid_pdf_signature);
      return "invalid";
    }

    beforeAnalyze();
    onStatus("uploading");
    analysisTimer = setTimeout(() => {
      if (manager.isCurrent(request)) onStatus("analyzing");
    }, analysisDelayMs);
    request.controller.signal.addEventListener("abort", clearAnalysisTimer, {
      once: true,
    });

    const analysis = await awaitRequestStep(
      analyze(request.controller.signal),
      request,
    );
    ensureCurrentRequest(manager, request);

    if (!commit(analysis)) {
      throw new PolicyAnalysisUploadError(
        "Η ανάλυση ολοκληρώθηκε, αλλά δεν μπόρεσε να αποθηκευτεί για αυτή τη συνεδρία.",
      );
    }

    onError(null);
    onStatus("success");
    return "success";
  } catch (error) {
    const disposition = requestDisposition(manager, request);
    if (disposition === "stale") return "stale";

    onStatus("error");
    if (disposition === "timeout") {
      onError(POLICY_ANALYSIS_ERROR_MESSAGES.analysis_timeout);
      return "timeout";
    }

    onError(
      error instanceof PolicyAnalysisUploadError
        ? error.customerMessage
        : POLICY_ANALYSIS_ERROR_MESSAGES.provider_unavailable,
    );
    return "error";
  } finally {
    clearAnalysisTimer();
    request.controller.signal.removeEventListener("abort", clearAnalysisTimer);
    manager.finish(request);
  }
}
