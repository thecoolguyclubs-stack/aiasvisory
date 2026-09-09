export const POLICY_ANALYSIS_CLIENT_TIMEOUT_MS = 100_000;

export type PolicyAnalysisCancelReason =
  | "navigation"
  | "removed"
  | "replaced"
  | "retry"
  | "timeout"
  | "unmount";

export interface PolicyAnalysisRequestToken {
  readonly id: number;
  readonly fingerprint: string;
  readonly controller: AbortController;
  abortReason: PolicyAnalysisCancelReason | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

export type PolicyAnalysisRequestStart =
  | { kind: "started"; request: PolicyAnalysisRequestToken }
  | { kind: "duplicate"; request: PolicyAnalysisRequestToken };

export function policyFileFingerprint(file: {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}) {
  return [file.name, file.size, file.type, file.lastModified ?? 0].join("|");
}

export class PolicyAnalysisRequestManager {
  private active: PolicyAnalysisRequestToken | null = null;
  private nextId = 0;

  start(
    fingerprint: string,
    timeoutMs = POLICY_ANALYSIS_CLIENT_TIMEOUT_MS,
  ): PolicyAnalysisRequestStart {
    if (
      this.active &&
      !this.active.controller.signal.aborted &&
      this.active.fingerprint === fingerprint
    ) {
      return { kind: "duplicate", request: this.active };
    }

    this.cancel(this.active ? "replaced" : "retry");

    const request: PolicyAnalysisRequestToken = {
      id: ++this.nextId,
      fingerprint,
      controller: new AbortController(),
      abortReason: null,
      timeoutId: null,
    };

    request.timeoutId = setTimeout(() => {
      if (this.active !== request || request.controller.signal.aborted) return;
      request.abortReason = "timeout";
      request.timeoutId = null;
      request.controller.abort();
    }, timeoutMs);

    this.active = request;
    return { kind: "started", request };
  }

  isCurrent(request: PolicyAnalysisRequestToken) {
    return this.active === request && !request.controller.signal.aborted;
  }

  isLatest(request: PolicyAnalysisRequestToken) {
    return this.active === request;
  }

  hasActiveRequest() {
    return this.active !== null;
  }

  finish(request: PolicyAnalysisRequestToken) {
    this.clearTimer(request);
    if (this.active === request) this.active = null;
  }

  cancel(reason: Exclude<PolicyAnalysisCancelReason, "timeout">) {
    const request = this.active;
    if (!request) return;

    this.clearTimer(request);
    request.abortReason = reason;
    request.controller.abort();
    this.active = null;
  }

  private clearTimer(request: PolicyAnalysisRequestToken) {
    if (request.timeoutId === null) return;
    clearTimeout(request.timeoutId);
    request.timeoutId = null;
  }
}
