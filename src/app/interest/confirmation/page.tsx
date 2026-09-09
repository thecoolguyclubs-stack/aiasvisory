import type { Metadata } from "next";

import { LeadConfirmationView } from "@/components/advisory/LeadConfirmationView";

export const metadata: Metadata = {
  title: "Επιβεβαίωση αιτήματος | InsuranceMarket Health Advisor",
  description: "Επιβεβαίωση της εκδήλωσης ενδιαφέροντος.",
};

export default function InterestConfirmationPage() {
  return <LeadConfirmationView />;
}
