import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <strong>© InsuranceMarket</strong>
          <span aria-hidden="true" className={styles.divider} />
          <span>Ενημερωτική demo αξιολόγηση</span>
        </div>

        <nav aria-label="Νομικές πληροφορίες" className={styles.legal}>
          <span aria-disabled="true" title="Θα προστεθεί σύντομα">
            Πολιτική Απορρήτου
          </span>
          <span aria-disabled="true" title="Θα προστεθεί σύντομα">
            Όροι Χρήσης
          </span>
        </nav>
      </div>
    </footer>
  );
}
