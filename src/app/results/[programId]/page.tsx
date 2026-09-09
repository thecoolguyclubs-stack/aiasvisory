import type { Metadata } from "next";

import { ProgramDetailView } from "@/components/advisory/ProgramDetailView";

interface ProgramPageProps {
  params: Promise<{ programId: string }>;
}

export const metadata: Metadata = {
  title: "Λεπτομέρειες προγράμματος | InsuranceMarket Health Advisor",
  description: "Database-backed demo ανάλυση ασφαλιστικού προγράμματος.",
};

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { programId } = await params;

  return <ProgramDetailView programId={programId} />;
}
