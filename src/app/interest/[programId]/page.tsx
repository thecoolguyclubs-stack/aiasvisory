import type { Metadata } from "next";

import { InterestView } from "@/components/advisory/InterestView";

interface InterestPageProps {
  params: Promise<{ programId: string }>;
}

export const metadata: Metadata = {
  title: "Εκδήλωση ενδιαφέροντος | InsuranceMarket Health Advisor",
  description: "Ασφαλής υποβολή στοιχείων για επικοινωνία με σύμβουλο.",
};

export default async function InterestPage({ params }: InterestPageProps) {
  const { programId } = await params;

  return <InterestView programId={programId} />;
}
