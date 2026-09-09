import styles from "./advisory.module.css";

/** No quote has been supplied by an insurer pricing source. */
export function PriceAvailability({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.demoPriceSummary : styles.demoPriceDetail}>
      <span>Ασφάλιστρο</span>
      <strong>Απαιτείται εξατομικευμένη προσφορά</strong>
      <small>Δεν υπάρχει επιβεβαιωμένη τρέχουσα τιμή για το προφίλ σου.</small>
    </div>
  );
}
