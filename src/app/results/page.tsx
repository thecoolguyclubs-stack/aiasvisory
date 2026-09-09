import type { Metadata } from "next";

import { ResultsView } from "@/components/advisory/ResultsView";

export const metadata: Metadata = {
  title: "Demo προτάσεις | InsuranceMarket Health Advisor",
  description: "Τρεις προσωρινές demo κατευθύνσεις ασφάλισης υγείας.",
};

export default function ResultsPage() {
  return <ResultsView />;
}
