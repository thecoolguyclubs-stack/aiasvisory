import { getPublicSupabaseClient } from "@/lib/supabase/client";

interface AssessmentContract {
  questions: unknown[];
  schema_version: string;
}

const SAFE_ERROR_MESSAGE = "Database connection check is unavailable.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function parseAssessmentContract(value: unknown): AssessmentContract | null {
  if (!isRecord(value)) return null;

  const schemaVersion = value.schema_version;
  const questions = value.questions;

  if (typeof schemaVersion !== "string" || !Array.isArray(questions)) {
    return null;
  }

  return { questions, schema_version: schemaVersion };
}

const unavailableResponse = () =>
  Response.json(
    { ok: false, error: SAFE_ERROR_MESSAGE },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.rpc("assessment_contract");

    if (error) return unavailableResponse();

    const contract = parseAssessmentContract(data as unknown);

    if (!contract) return unavailableResponse();

    return Response.json(
      {
        ok: true,
        contractVersion: contract.schema_version,
        questionCount: contract.questions.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return unavailableResponse();
  }
}
