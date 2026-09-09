import {
  hasPdfMagicBytes,
  MAX_POLICY_PDF_SIZE,
  POLICY_PDF_CANONICAL_FILENAME,
  validatePolicyFileMetadata,
} from "@/lib/policy-analysis/file-validation";
import {
  POLICY_ANALYSIS_ERROR_MESSAGES,
  policyAnalysisFailureFromExtraction,
  type PolicyAnalysisErrorCode,
} from "@/lib/policy-analysis/contracts";
import {
  extractExistingPolicySnapshot,
  PolicyExtractionError,
} from "@/lib/policy-analysis/openai-extraction";

const noStoreHeaders = { "Cache-Control": "no-store" };

function safeError(
  code: PolicyAnalysisErrorCode,
  status: 400 | 408 | 413 | 415 | 502 | 504,
  headers: HeadersInit = noStoreHeaders,
) {
  return Response.json(
    { ok: false, code, message: POLICY_ANALYSIS_ERROR_MESSAGES[code] },
    { status, headers },
  );
}

function developmentFailureLog(code: PolicyAnalysisErrorCode) {
  if (process.env.NODE_ENV === "development") {
    console.info("[policy-analysis]", { ok: false, code });
  }
}

interface PolicyAnalysisPhaseTimings {
  multipartParsingMs: number;
  fileReadMs: number;
  localValidationMs: number;
  requestPreparationMs: number;
  providerLatencyMs: number;
  responseParsingAndValidationMs: number;
  totalMs: number;
}

const roundedMilliseconds = (value: number) =>
  Math.round(Math.max(0, value) * 10) / 10;

function developmentTimingLog(timings: PolicyAnalysisPhaseTimings) {
  if (process.env.NODE_ENV !== "development") return;
  console.info(
    "[policy-analysis-timing]",
    JSON.stringify({
      multipartParsingMs: roundedMilliseconds(timings.multipartParsingMs),
      fileReadMs: roundedMilliseconds(timings.fileReadMs),
      localValidationMs: roundedMilliseconds(timings.localValidationMs),
      requestPreparationMs: roundedMilliseconds(timings.requestPreparationMs),
      providerLatencyMs: roundedMilliseconds(timings.providerLatencyMs),
      responseParsingAndValidationMs: roundedMilliseconds(
        timings.responseParsingAndValidationMs,
      ),
      totalMs: roundedMilliseconds(timings.totalMs),
    }),
  );
}

function serverTimingHeader(timings: PolicyAnalysisPhaseTimings) {
  return [
    ["multipart", timings.multipartParsingMs],
    ["file-read", timings.fileReadMs],
    ["local-validation", timings.localValidationMs],
    ["request-preparation", timings.requestPreparationMs],
    ["provider", timings.providerLatencyMs],
    ["response-validation", timings.responseParsingAndValidationMs],
    ["total", timings.totalMs],
  ]
    .map(([name, duration]) => `${name};dur=${roundedMilliseconds(Number(duration))}`)
    .join(", ");
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = performance.now();
  const timings: PolicyAnalysisPhaseTimings = {
    multipartParsingMs: 0,
    fileReadMs: 0,
    localValidationMs: 0,
    requestPreparationMs: 0,
    providerLatencyMs: 0,
    responseParsingAndValidationMs: 0,
    totalMs: 0,
  };
  const timedHeaders = () => {
    timings.totalMs = performance.now() - startedAt;
    return {
      ...noStoreHeaders,
      "Server-Timing": serverTimingHeader(timings),
    };
  };

  try {
    const contentLengthValidationStartedAt = performance.now();
    const contentLength = Number(request.headers.get("content-length"));
    const contentLengthTooLarge =
      Number.isFinite(contentLength) &&
      contentLength > MAX_POLICY_PDF_SIZE + 1024 * 1024;
    timings.localValidationMs +=
      performance.now() - contentLengthValidationStartedAt;
    if (contentLengthTooLarge) {
      return safeError("file_too_large", 413, timedHeaders());
    }

    let formData: FormData;
    const multipartParsingStartedAt = performance.now();
    try {
      formData = await request.formData();
    } catch {
      return request.signal.aborted
        ? safeError("analysis_aborted", 408, timedHeaders())
        : safeError("invalid_file", 400, timedHeaders());
    } finally {
      timings.multipartParsingMs =
        performance.now() - multipartParsingStartedAt;
    }

    if (request.signal.aborted) {
      return safeError("analysis_aborted", 408, timedHeaders());
    }

    const requestShapeValidationStartedAt = performance.now();
    const policyFiles = formData.getAll("policyFile");
    const file = policyFiles[0];
    const allFiles = [...formData.values()].filter(
      (value): value is File => value instanceof File,
    );
    const invalidRequestShape =
      policyFiles.length !== 1 ||
      allFiles.length !== 1 ||
      !(file instanceof File);
    timings.localValidationMs +=
      performance.now() - requestShapeValidationStartedAt;
    if (invalidRequestShape) {
      return safeError("invalid_request", 400, timedHeaders());
    }

    const metadataValidationStartedAt = performance.now();
    const metadataValidation = validatePolicyFileMetadata(file);
    timings.localValidationMs +=
      performance.now() - metadataValidationStartedAt;

    if (!metadataValidation.ok) {
      const status =
        metadataValidation.code === "file_too_large"
          ? 413
          : metadataValidation.code === "invalid_mime_type"
            ? 415
            : 400;
      const code =
        metadataValidation.code === "file_too_large" ||
        metadataValidation.code === "invalid_mime_type" ||
        metadataValidation.code === "invalid_filename" ||
        metadataValidation.code === "empty_file"
          ? metadataValidation.code
          : "invalid_file";
      return safeError(code, status, timedHeaders());
    }

    let pdfBytes: Uint8Array;
    const fileReadStartedAt = performance.now();

    try {
      pdfBytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      return request.signal.aborted
        ? safeError("analysis_aborted", 408, timedHeaders())
        : safeError("invalid_file", 400, timedHeaders());
    } finally {
      timings.fileReadMs = performance.now() - fileReadStartedAt;
    }

    try {
      const signatureValidationStartedAt = performance.now();
      const validPdfSignature = hasPdfMagicBytes(pdfBytes);
      timings.localValidationMs +=
        performance.now() - signatureValidationStartedAt;
      if (!validPdfSignature) {
        return safeError("invalid_pdf_signature", 415, timedHeaders());
      }

      if (request.signal.aborted) {
        return safeError("analysis_aborted", 408, timedHeaders());
      }

      const snapshot = await extractExistingPolicySnapshot({
        pdfBytes,
        filename: "anonymized-policy.pdf",
        signal: request.signal,
        onPhaseTimings: (extractionTimings) => {
          timings.requestPreparationMs =
            extractionTimings.requestPreparationMs;
          timings.providerLatencyMs = extractionTimings.providerLatencyMs;
          timings.responseParsingAndValidationMs =
            extractionTimings.responseParsingAndValidationMs;
        },
      });

      const headers = timedHeaders();
      return Response.json(
        {
          ok: true,
          source: "openai",
          outputParsed: true,
          analysis: {
            snapshot,
            filename: POLICY_PDF_CANONICAL_FILENAME,
            fileSize: file.size,
            analyzedAt: new Date().toISOString(),
            extractionConfidence: snapshot.extractionConfidence,
          },
        },
        { headers },
      );
    } catch (error) {
      const extractionCode =
        error instanceof PolicyExtractionError
          ? error.code
          : "provider_unavailable";
      const { code, status } = policyAnalysisFailureFromExtraction(extractionCode);
      developmentFailureLog(code);

      return safeError(code, status, timedHeaders());
    } finally {
      pdfBytes.fill(0);
    }
  } finally {
    timings.totalMs = performance.now() - startedAt;
    developmentTimingLog(timings);
  }
}
