import type { Metadata } from "next";

import { AssessmentFlow } from "@/components/assessment/AssessmentFlow";

export const metadata: Metadata = {
  title: "Αξιολόγηση ασφάλισης υγείας | insurancemarket",
  description: "Διαδραστική αξιολόγηση αναγκών ασφάλισης υγείας.",
};

export default function AssessmentPage() {
  return <AssessmentFlow />;
}

