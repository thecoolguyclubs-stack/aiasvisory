import "server-only";

import OpenAI from "openai";

const OPENAI_TIMEOUT_MS = 15_000;
let client: OpenAI | null | undefined;

export const OPENAI_EXPLANATION_MODEL =
  process.env.OPENAI_EXPLANATION_MODEL?.trim() || "gpt-5.6-luna";

export function getOpenAIClient() {
  if (client !== undefined) return client;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  client = apiKey
    ? new OpenAI({
        apiKey,
        maxRetries: 0,
        timeout: OPENAI_TIMEOUT_MS,
      })
    : null;

  return client;
}

export class OpenAIOperationTimeoutError extends Error {
  constructor() {
    super("OpenAI operation timed out");
    this.name = "OpenAIOperationTimeoutError";
  }
}

export class OpenAIOperationAbortedError extends Error {
  constructor() {
    super("OpenAI operation aborted");
    this.name = "OpenAIOperationAbortedError";
  }
}

export async function withOpenAITimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = OPENAI_TIMEOUT_MS,
  parentSignal?: AbortSignal,
) {
  if (parentSignal?.aborted) throw new OpenAIOperationAbortedError();

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const result = await operation(controller.signal);
    if (timedOut) throw new OpenAIOperationTimeoutError();
    if (parentSignal?.aborted) throw new OpenAIOperationAbortedError();
    return result;
  } catch (error) {
    if (timedOut) throw new OpenAIOperationTimeoutError();
    if (parentSignal?.aborted) throw new OpenAIOperationAbortedError();
    throw error;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}
