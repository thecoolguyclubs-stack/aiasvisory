/** Customer preference bands, never replacements for contractual policy amounts. */
export const deductibleBands = {
  "up-to-1500": { label: "€0 – €1.500", maximum: 1500, approach: "complete", databaseValue: "minimum" },
  "1500-to-5000": { label: "€1.500 – €5.000", maximum: 5000, approach: "balanced", databaseValue: "balanced" },
  "over-5000": { label: "€5.000+", maximum: null, approach: "basic", databaseValue: "higher_for_lower_premium" },
} as const;

export type DeductibleBand = keyof typeof deductibleBands;
export const isDeductibleBand = (value: unknown): value is DeductibleBand =>
  typeof value === "string" && Object.hasOwn(deductibleBands, value);

export function deductibleBandForAmount(amount: number): DeductibleBand | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (amount <= 1500) return "up-to-1500";
  if (amount <= 5000) return "1500-to-5000";
  return "over-5000";
}

export const careAccessOptions = [
  { id: "network", label: "Με καλύπτει το συνεργαζόμενο δίκτυο", description: "Αρκεί να υπάρχουν κατάλληλοι γιατροί και νοσοκομεία κοντά μου." },
  { id: "freedom", label: "Θέλω ελευθερία επιλογής", description: "Θέλω να εξεταστεί και η δυνατότητα χρήσης γιατρού ή νοσοκομείου εκτός δικτύου." },
  { id: "unsure", label: "Δεν έχω αποφασίσει ακόμη", description: "Θέλω να δω πρώτα τις διαθέσιμες επιλογές." },
] as const;

export type CareAccess = typeof careAccessOptions[number]["id"];
