import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import type {
  Response as OpenAIResponse,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";

import {
  getOpenAIClient,
  OpenAIOperationAbortedError,
  OpenAIOperationTimeoutError,
  withOpenAITimeout,
} from "@/lib/openai/server";

import {
  ExistingPolicySnapshotSchema,
  validateExistingPolicySnapshot,
  type ExistingPolicySnapshot,
} from "./schema";
import type { PolicyExtractionFailureCode } from "./contracts";
import { policyProviderFailure } from "./provider-validation";

const POLICY_EXTRACTION_TIMEOUT_MS = 90_000;

export interface PolicyExtractionPhaseTimings {
  requestPreparationMs: number;
  providerLatencyMs: number;
  responseParsingAndValidationMs: number;
}

const systemInstruction =
  "Εξάγεις αντικειμενικά στοιχεία από ασφαλιστήριο υγείας. Χρησιμοποίησε αποκλειστικά το περιεχόμενο του PDF. Μην συμπληρώνεις κενά από γενικές γνώσεις. Μην εξάγεις ή επιστρέφεις προσωπικά στοιχεία ασφαλισμένου. Για κάθε ασφαλιστικό στοιχείο δώσε αριθμό σελίδας και σύντομο τεκμήριο. Όταν κάτι δεν προκύπτει με σαφήνεια, χαρακτήρισέ το unknown ή needs_confirmation. Μην χαρακτηρίζεις μία κάλυψη ως πλήρη, καλύτερη ή χειρότερη.";
const extractionRequest = "Εξήγαγε το PDF στο ζητούμενο schema.";
const existingPolicyTextFormat = zodTextFormat(
  ExistingPolicySnapshotSchema,
  "existing_policy_snapshot",
);

export const OPENAI_POLICY_MODEL =
  process.env.OPENAI_POLICY_MODEL?.trim() ||
  process.env.OPENAI_EXPLANATION_MODEL?.trim() ||
  "gpt-5.6";

export class PolicyExtractionError extends Error {
  readonly code: PolicyExtractionFailureCode;

  constructor(code: PolicyExtractionFailureCode) {
    super("Policy extraction failed");
    this.name = "PolicyExtractionError";
    this.code = code;
  }
}

function refusalDetected(response: {
  output: Array<{
    type: string;
    content?: Array<{ type: string }>;
  }>;
}) {
  return response.output.some(
    (item) =>
      item.type === "message" &&
      item.content?.some((content) => content.type === "refusal"),
  );
}

export async function extractExistingPolicySnapshot({
  pdfBytes,
  filename,
  signal,
  onPhaseTimings,
}: {
  pdfBytes: Uint8Array;
  filename: string;
  signal?: AbortSignal;
  onPhaseTimings?: (timings: PolicyExtractionPhaseTimings) => void;
}): Promise<ExistingPolicySnapshot> {
  const openai = getOpenAIClient();
  if (!openai) throw new PolicyExtractionError("provider_unavailable");

  let fileData = "";
  let requestBody: ResponseCreateParamsNonStreaming | null = null;
  let requestPreparationMs = 0;
  let providerLatencyMs = 0;
  let responseParsingAndValidationMs = 0;
  const emitTimings = () =>
    onPhaseTimings?.({
      requestPreparationMs,
      providerLatencyMs,
      responseParsingAndValidationMs,
    });

  const requestPreparationStartedAt = performance.now();
  try {
    const pdfBufferView = Buffer.from(
      pdfBytes.buffer,
      pdfBytes.byteOffset,
      pdfBytes.byteLength,
    );
    fileData = `data:application/pdf;base64,${pdfBufferView.toString("base64")}`;
    requestBody = {
      model: OPENAI_POLICY_MODEL,
      instructions: systemInstruction,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: extractionRequest,
            },
            {
              type: "input_file",
              filename,
              file_data: fileData,
              detail: "high",
            },
          ],
        },
      ],
      reasoning: { effort: "low" },
      max_output_tokens: 10_000,
      store: false,
      text: { format: existingPolicyTextFormat },
    };
  } catch {
    throw new PolicyExtractionError("provider_unavailable");
  } finally {
    requestPreparationMs = performance.now() - requestPreparationStartedAt;
    emitTimings();
  }

  let response: OpenAIResponse;
  const providerStartedAt = performance.now();

  try {
    const preparedRequest = requestBody;
    if (!preparedRequest) {
      throw new PolicyExtractionError("provider_unavailable");
    }
    response = await withOpenAITimeout(
      (signal) =>
        openai.responses.create(
          preparedRequest,
          { signal, timeout: POLICY_EXTRACTION_TIMEOUT_MS + 5_000 },
        ),
      POLICY_EXTRACTION_TIMEOUT_MS,
      signal,
    );
  } catch (error) {
    if (error instanceof OpenAIOperationTimeoutError) {
      throw new PolicyExtractionError("provider_timeout");
    }
    if (error instanceof OpenAIOperationAbortedError) {
      throw new PolicyExtractionError("request_aborted");
    }
    throw new PolicyExtractionError("provider_unavailable");
  } finally {
    providerLatencyMs = performance.now() - providerStartedAt;
    requestBody = null;
    fileData = "";
    emitTimings();
  }

  const responseValidationStartedAt = performance.now();
  try {
    const outputText = response.output_text?.trim() ?? "";
    const providerFailure = policyProviderFailure({
      responseStatus: response.status ?? null,
      incompleteReason: response.incomplete_details?.reason ?? null,
      refusalDetected: refusalDetected(response),
      hasOutputParsed: outputText.length > 0,
    });
    if (providerFailure) throw new PolicyExtractionError(providerFailure);

    let structuredOutput: unknown;
    try {
      structuredOutput = JSON.parse(outputText);
    } catch {
      throw new PolicyExtractionError("invalid_output");
    }
    const validated = validateExistingPolicySnapshot(structuredOutput);
    if (!validated.ok) throw new PolicyExtractionError("invalid_output");

    return validated.snapshot;
  } finally {
    responseParsingAndValidationMs =
      performance.now() - responseValidationStartedAt;
    emitTimings();
  }
}
