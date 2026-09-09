"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { readLeadSubmission, type LeadSubmission } from "@/lib/leads";

import {
  AdvisoryLoading,
  AdvisoryShell,
} from "./AdvisoryUI";
import styles from "./advisory.module.css";

export function LeadConfirmationView() {
  const router = useRouter();
  const [submission, setSubmission] = useState<LeadSubmission>();

  useEffect(() => {
    const storedSubmission = readLeadSubmission();

    if (!storedSubmission) {
      router.replace("/assessment");
      return;
    }

    const hydrationTimer = window.setTimeout(
      () => setSubmission(storedSubmission),
      0,
    );

    return () => window.clearTimeout(hydrationTimer);
  }, [router]);

  if (!submission) {
    return (
      <AdvisoryLoading
        className={styles.confirmationScreen}
        statusText="Το αίτημα υποβλήθηκε"
      />
    );
  }

  return (
    <AdvisoryShell
      className={styles.confirmationScreen}
      contentClassName={styles.confirmationPageContent}
      statusText="Το αίτημα υποβλήθηκε"
    >
      <section className={styles.figmaConfirmationCard}>
        <span className={styles.successMark} aria-hidden="true">
          ✓
        </span>
        <h1>Το ενδιαφέρον σου καταχωρίστηκε</h1>
        <p>
          Ένας συνεργάτης θα εξετάσει το προφίλ και την επιλογή {" "}
          <strong>{submission.productName}</strong> της {" "}
          <strong>{submission.insurer}</strong> πριν επικοινωνήσει μαζί σου.
        </p>

        <ol className={styles.confirmationSteps}>
          <li>
            <span>1</span>
            Έλεγχος στοιχείων και επιλεγμένου προγράμματος
          </li>
          <li>
            <span>2</span>
            Προετοιμασία εξατομικευμένης ενημέρωσης
          </li>
          <li>
            <span>3</span>
            Επικοινωνία για συμβουλή και επόμενα βήματα
          </li>
        </ol>

        <Link className={styles.confirmationHomeLink} href="/">
          Επιστροφή στην αρχή
        </Link>

        <p className={styles.confirmationCode}>
          Κωδικός υποβολής: {submission.submissionId}
        </p>
      </section>
    </AdvisoryShell>
  );
}
