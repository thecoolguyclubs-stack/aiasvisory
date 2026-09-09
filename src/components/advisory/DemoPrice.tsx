import type { DemoPriceEstimate } from "@/lib/pricing/demo-pricing";

import styles from "./advisory.module.css";

const euro = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function DemoPrice({
  estimate,
  compact = false,
}: {
  estimate: DemoPriceEstimate;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={styles.demoPriceSummary}>
        <span>Ενδεικτικό demo εύρος κόστους</span>
        <strong>
          {euro.format(estimate.monthlyFrom)}–{euro.format(estimate.monthlyTo)}
          /μήνα
        </strong>
        <small>Υπολογισμός αποκλειστικά για σκοπούς επίδειξης</small>
      </div>
    );
  }

  return (
    <section className={styles.demoPriceDetail}>
      <div className={styles.demoPriceDetailMain}>
        <span>Ενδεικτικό demo εύρος κόστους</span>
        <strong>
          {euro.format(estimate.monthlyFrom)}–{euro.format(estimate.monthlyTo)}
          /μήνα
        </strong>
        <p>
          Ετήσιο demo εύρος: {euro.format(estimate.yearlyFrom)}–
          {euro.format(estimate.yearlyTo)}
        </p>
      </div>
      <div className={styles.demoPriceBasis}>
        <h3>Βάση demo υπολογισμού</h3>
        <ul>
          {estimate.basis.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <p className={styles.demoPriceDisclaimer}>
        Το ποσό δημιουργείται αποκλειστικά για σκοπούς επίδειξης και δεν
        αποτελεί τιμή, προσφορά ή προεκτίμηση ασφαλιστικής εταιρείας.
      </p>
    </section>
  );
}
