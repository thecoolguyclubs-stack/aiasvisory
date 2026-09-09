import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  buildDeterministicExplanation,
  createRecommendationExplanationInput,
  validateRecommendationExplanationInput,
  validateRecommendationExplanationOutput,
} from "@/lib/recommendations/explanation";
import { validateAssessmentSubmission } from "@/lib/recommendations/request-validation";
import { loadAdvisoryContext } from "@/lib/recommendations/server-context";
import {
  getOpenAIClient,
  OPENAI_EXPLANATION_MODEL,
  withOpenAITimeout,
} from "@/lib/openai/server";

const noStoreHeaders = { "Cache-Control": "no-store" };
const systemInstruction =
  "Συνέθεσε μία σύντομη ασφαλιστική επεξήγηση αποκλειστικά από τα allowedClaims και τα παρεχόμενα program-specific στοιχεία. Μην προσθέτεις κάλυψη, ποσό, ποσοστό, δίκτυο, απαλλαγή ή προϋπόθεση που δεν παρέχεται. Σύνδεσε μόνο τις δηλωμένες ανάγκες με τεκμηριωμένα χαρακτηριστικά του συγκεκριμένου προϊόντος. Χρησιμοποίησε τα strengthTitles για διαφοροποίηση ανά πρόγραμμα, ανέφερε trade-off ή missing evidence όταν παρέχονται και απόφυγε γενικόλογη επανάληψη ανάμεσα σε προγράμματα. Αν υπάρχει ουσιώδης περιορισμός ή περίοδος αναμονής, ανέφερέ τον καθαρά. Μην χρησιμοποιείς αποσιωπητικά ή αγγλικούς τεχνικούς όρους.";

const RecommendationExplanationSchema = z.object({
  paragraph: z.string(),
  usedClaimIds: z.array(z.string()),
  confirmationNote: z.string(),
});

type ExplanationSource = "openai" | "deterministic-fallback";

interface ProviderDiagnostic {
  providerStatus: number | null;
  responseStatus: string | null;
  hasOutputParsed: boolean;
  incompleteReason: string | null;
  refusalDetected: boolean;
  model: string;
  source: ExplanationSource;
}

function developmentProviderLog(diagnostic: ProviderDiagnostic) {
  if (process.env.NODE_ENV === "development") {
    console.info("[recommendation-explanation]", diagnostic);
  }
}

function providerStatusFromError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return null;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Το αίτημα επεξήγησης δεν είναι έγκυρο." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  if (typeof body !== "object" || body === null || !("submission" in body) ||
    !("programId" in body) || typeof body.programId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(body.programId)) {
    return Response.json({ message: "Το αίτημα επεξήγησης δεν είναι έγκυρο." }, { status: 400, headers: noStoreHeaders });
  }
  const submission = validateAssessmentSubmission(body.submission);
  if (!submission.ok) {
    return Response.json({ message: "Η αξιολόγηση δεν είναι έγκυρη." }, { status: 400, headers: noStoreHeaders });
  }
  let input;
  try {
    const context = await loadAdvisoryContext(submission.submission, body.programId);
    input = validateRecommendationExplanationInput(createRecommendationExplanationInput(context.recommendation, context.presentation));
  } catch {
    return Response.json({ message: "Δεν είναι διαθέσιμα τα στοιχεία τεκμηρίωσης." }, { status: 503, headers: noStoreHeaders });
  }

  if (!input) {
    return Response.json(
      { message: "Το αίτημα επεξήγησης δεν είναι έγκυρο." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const fallback = buildDeterministicExplanation(input);
  const openai = getOpenAIClient();

  if (!openai) {
    developmentProviderLog({
      providerStatus: null,
      responseStatus: null,
      hasOutputParsed: false,
      incompleteReason: null,
      refusalDetected: false,
      model: OPENAI_EXPLANATION_MODEL,
      source: "deterministic-fallback",
    });
    return Response.json(fallback, { headers: noStoreHeaders });
  }

  try {
    const response = await withOpenAITimeout((signal) =>
      openai.responses.parse(
        {
          model: OPENAI_EXPLANATION_MODEL,
          instructions: `${systemInstruction}\n\nΓράψε μία παράγραφο 80 έως 120 ελληνικών λέξεων. Χρησιμοποίησε 2 ή 3 allowedClaims, τουλάχιστον ένα από τα strengthTitles όταν υπάρχει, επέστρεψε τα ακριβή IDs τους στο usedClaimIds και έναν πραγματικό περιορισμό στο confirmationNote. Το product name και ο insurer μπορούν να παραμείνουν όπως παρέχονται.`,
          input: [
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
          reasoning: { effort: "low" },
          max_output_tokens: 1_200,
          store: false,
          text: {
            format: zodTextFormat(
              RecommendationExplanationSchema,
              "recommendation_explanation",
            ),
          },
        },
        { signal },
      ),
    );
    const refusalDetected = response.output.some(
      (item) =>
        item.type === "message" &&
        item.content.some((content) => content.type === "refusal"),
    );
    const incompleteReason = response.incomplete_details?.reason ?? null;
    const hasOutputParsed = response.output_parsed !== null;
    const parsed = response.output_parsed;
    const validatedOutput = validateRecommendationExplanationOutput(
      parsed,
      input,
    );
    const source: ExplanationSource =
      response.status === "completed" &&
      !incompleteReason &&
      !refusalDetected &&
      hasOutputParsed &&
      validatedOutput
        ? "openai"
        : "deterministic-fallback";

    developmentProviderLog({
      providerStatus: 200,
      responseStatus: response.status ?? null,
      hasOutputParsed,
      incompleteReason,
      refusalDetected,
      model: response.model,
      source,
    });

    if (source !== "openai" || !validatedOutput) {
      return Response.json(fallback, { headers: noStoreHeaders });
    }

    return Response.json(validatedOutput, { headers: noStoreHeaders });
  } catch (error) {
    developmentProviderLog({
      providerStatus: providerStatusFromError(error),
      responseStatus: null,
      hasOutputParsed: false,
      incompleteReason: null,
      refusalDetected: false,
      model: OPENAI_EXPLANATION_MODEL,
      source: "deterministic-fallback",
    });
    return Response.json(fallback, { headers: noStoreHeaders });
  }
}
