import Link from "next/link";
import type { ReactNode } from "react";

import { AssessmentHeader } from "@/components/assessment/AssessmentUI";

import { AdvisoryNavigation } from "./AdvisoryNavigation";
import { InsurerLogo } from "./InsurerLogo";
import styles from "./advisory.module.css";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export function AdvisoryShell({
  children,
  backHref,
  backLabel,
  className,
  contentClassName,
  statusText = "Προσωρινή demo αξιολόγηση",
  wide = false,
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  contentClassName?: string;
  statusText?: string;
  wide?: boolean;
}) {
  return (
    <main className={cx(styles.advisoryPage, className)}>
      <AssessmentHeader statusText={statusText} />
      <div
        className={cx(
          styles.pageContent,
          wide && styles.pageContentWide,
          contentClassName,
        )}
      >
        <AdvisoryNavigation />
        {backHref && backLabel && (
          <Link className={styles.backLink} href={backHref}>
            <span aria-hidden="true">←</span>
            {backLabel}
          </Link>
        )}
        {children}
      </div>
    </main>
  );
}

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={cx(styles.demoNotice, compact && styles.demoNoticeCompact)}>
      <span className={styles.noticeIcon} aria-hidden="true">
        i
      </span>
      <p>
        <strong>Προσωρινή demo αξιολόγηση</strong>
        <span>
          Πρόκειται για ενημερωτική demo αξιολόγηση και όχι δεσμευτική
          ασφαλιστική προσφορά. Οι τελικοί όροι επιβεβαιώνονται από σύμβουλο.
        </span>
      </p>
    </aside>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <header className={cx(styles.pageHeading, centered && styles.centeredHeading)}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function ProfileMetricCard({
  number,
  label,
  value,
  detail,
}: {
  number: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricNumber} aria-hidden="true">
        {number}
      </span>
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <span>{detail}</span>
      </div>
    </article>
  );
}

export function ContentSection({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx(styles.contentSection, className)}>
      {eyebrow && <p className={styles.sectionEyebrow}>{eyebrow}</p>}
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ProgramBrand({
  insurer,
  programId,
  compact = false,
}: {
  insurer: string;
  programId?: string;
  compact?: boolean;
}) {
  return (
    <div className={cx(styles.programBrand, compact && styles.programBrandCompact)}>
      <InsurerLogo compact={compact} insurer={insurer} programId={programId} />
      <div>
        <strong>{insurer}</strong>
        <small>Ασφαλιστική εταιρεία</small>
      </div>
    </div>
  );
}

export function AdvisoryLoading({
  className,
  statusText = "Προσωρινή demo αξιολόγηση",
}: {
  className?: string;
  statusText?: string;
} = {}) {
  return (
    <main aria-busy="true" className={cx(styles.advisoryPage, className)}>
      <AssessmentHeader statusText={statusText} />
      <div className={styles.loadingStage}>
        <span className={styles.loadingMark} aria-hidden="true" />
        <p>Φόρτωση αποθηκευμένης αξιολόγησης…</p>
      </div>
    </main>
  );
}
