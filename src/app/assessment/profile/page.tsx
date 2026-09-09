import type { Metadata } from "next";

import { AssessmentProfileView } from "@/components/advisory/AssessmentProfileView";

export const metadata: Metadata = {
  title: "Ασφαλιστικό προφίλ | InsuranceMarket Health Advisor",
  description: "Σύνοψη του προσωρινού ασφαλιστικού προφίλ.",
};

export default function AssessmentProfilePage() {
  return <AssessmentProfileView />;
}
