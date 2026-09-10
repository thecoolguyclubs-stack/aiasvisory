import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AssessmentHeader } from "@/components/assessment/AssessmentUI";
import { ResumeAssessmentLink } from "@/components/landing/ResumeAssessmentLink";

import styles from "./page.module.css";

const heroCards = [
  {
    title: "Καθαρή καθοδήγηση",
    description: "Προσωπική οργάνωση αναγκών πριν επιλέξεις πρόγραμμα.",
    icon: "+",
  },
  {
    title: "Συντηρητική αξιολόγηση",
    description: "Όταν λείπουν δεδομένα, κρατάμε ασφαλιστικά προσεκτική στάση.",
    icon: "✓",
  },
  {
    title: "Συνέχεια με σύμβουλο",
    description: "Η τελική πρόταση και οι όροι επιβεβαιώνονται από ειδικό.",
    icon: "☎",
  },
] as const;

export const metadata: Metadata = {
  title: "Ψηφιακός Σύμβουλος Υγείας | InsuranceMarket",
  description:
    "Αξιολόγησε τις ανάγκες σου και δες προσωποποιημένες κατευθύνσεις για ασφάλιση υγείας.",
};

export default function Home() {
  return (
    <main className={styles.page}>
      <AssessmentHeader statusText="Ψηφιακός Σύμβουλος Υγείας" />

      <div className={styles.content}>
        <section aria-labelledby="health-advisor-title" className={styles.heroBanner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>ΑΣΦΑΛΕΙΑ ΥΓΕΙΑΣ</p>
            <h1 id="health-advisor-title">
              Ασφάλεια υγείας που σου ταιριάζει.
            </h1>
            <p className={styles.heroDescription}>
              Με λίγα βήματα οργανώνουμε τις ανάγκες σου, ξεχωρίζουμε τι έχει
              μεγαλύτερη σημασία για την κάλυψή σου και σε οδηγούμε σε πιο
              καθαρές ασφαλιστικές κατευθύνσεις.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/assessment?start=new">
                Ξεκίνα την αξιολόγηση
                <span aria-hidden="true">→</span>
              </Link>
              <div className={styles.ratingCapsule}>
                <span aria-hidden="true">✓</span>
                <strong>7 βήματα · Οι δικές σου ανάγκες</strong>
              </div>
            </div>
            <ResumeAssessmentLink className={styles.secondaryCta} />
          </div>

          <div className={styles.heroIllustration}>
            <div className={styles.heroIllustrationViewport}>
              <Image
                alt="Γραφιστικό ασφάλειας υγείας"
                className={styles.heroIllustrationImage}
                fill
                priority
                sizes="(max-width: 900px) 320px, (max-width: 1180px) 330px, 390px"
                src="/graphics/homepage-health-hero-illustration.svg"
              />
            </div>
          </div>

          <div className={styles.heroCards} aria-label="Τι οργανώνει η αξιολόγηση">
            {heroCards.map((card) => (
              <article className={styles.heroCard} key={card.title}>
                <span className={styles.heroCardIcon} aria-hidden="true">
                  {card.icon}
                </span>
                <div>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.supportingInfo}>
          <article className={styles.uploadCard}>
            <span className={styles.documentIcon} aria-hidden="true">
              <span />
            </span>
            <div className={styles.uploadCopy}>
              <div className={styles.uploadTitleRow}>
                <h2>Έχεις ήδη ασφαλιστήριο;</h2>
                <span>Προαιρετικό</span>
              </div>
              <p>
                Μπορείς, αν θέλεις, να ανεβάσεις το υπάρχον ασφαλιστήριό σου
                σε PDF. Θα το αναλύσουμε ώστε η ενημέρωση και η σύγκριση να
                βασίζονται και στη σημερινή σου κάλυψη.
              </p>
            </div>
          </article>

          <aside className={styles.disclaimerCard}>
            <span className={styles.infoIcon} aria-hidden="true">
              i
            </span>
            <div>
              <h2>Ενημερωτική αξιολόγηση</h2>
              <p>
                Η αξιολόγηση δεν αποτελεί δεσμευτική ασφαλιστική προσφορά. Οι
                καλύψεις, οι όροι και η τελική πρόταση επιβεβαιώνονται από
                εξειδικευμένο σύμβουλο.
              </p>
            </div>
          </aside>
        </section>

        <section aria-labelledby="landing-cta-title" className={styles.finalCta}>
          <div>
            <p>ΕΤΟΙΜΟΣ ΝΑ ΞΕΚΙΝΗΣΕΙΣ;</p>
            <h2 id="landing-cta-title">
              Οργάνωσε σήμερα τις ανάγκες ασφάλισης υγείας σου
            </h2>
            <span>
              Η διαδικασία είναι σύντομη και μπορείς να επιστρέψεις σε αυτή
              μέσα στην ίδια συνεδρία.
            </span>
          </div>
          <Link className={styles.lightCta} href="/assessment?start=new">
            Ξεκίνα την αξιολόγηση
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
