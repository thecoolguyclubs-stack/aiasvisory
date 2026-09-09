import type { RecommendationApiError } from "@/lib/recommendations/contracts";
import { normalizeDatabaseProgramDetail } from "@/lib/recommendations/database-normalization";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const noStoreHeaders = { "Cache-Control": "no-store" };
const programIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function errorResponse(
  body: RecommendationApiError,
  status: 400 | 404 | 502 | 503,
) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;

  if (!programIdPattern.test(programId)) {
    return errorResponse(
      {
        ok: false,
        code: "invalid_request",
        message: "Το αναγνωριστικό προγράμματος δεν είναι έγκυρο.",
      },
      400,
    );
  }

  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.rpc("product_detail", {
      p_product_id: programId,
      p_allow_draft: true,
    });

    if (error) {
      return errorResponse(
        {
          ok: false,
          code: "database_unavailable",
          message: "Οι λεπτομέρειες δεν είναι διαθέσιμες αυτή τη στιγμή.",
        },
        503,
      );
    }

    if (data === null) {
      return errorResponse(
        {
          ok: false,
          code: "program_not_found",
          message: "Το πρόγραμμα δεν βρέθηκε.",
        },
        404,
      );
    }

    const program = normalizeDatabaseProgramDetail(data as unknown);

    if (!program || program.programId !== programId) {
      return errorResponse(
        {
          ok: false,
          code: "invalid_database_response",
          message: "Η βάση δεν επέστρεψε έγκυρες λεπτομέρειες προγράμματος.",
        },
        502,
      );
    }

    return Response.json(
      { ok: true, source: "supabase", program },
      { headers: noStoreHeaders },
    );
  } catch {
    return errorResponse(
      {
        ok: false,
        code: "database_unavailable",
        message: "Οι λεπτομέρειες δεν είναι διαθέσιμες αυτή τη στιγμή.",
      },
      503,
    );
  }
}
