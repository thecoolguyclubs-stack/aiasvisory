import type { ProgramPolicyComparison } from "./comparison";

/** A partial comparison never proves that either complete policy is superior. */
export function currentPolicyGuidance(comparison: ProgramPolicyComparison): string | null {
  if (comparison.currentPolicyAdvantages.length === 0) return null;
  if (comparison.improvements.length === 0) {
    return "Το υπάρχον συμβόλαιό σου υπερέχει σε τεκμηριωμένα σημεία της σύγκρισης. Δεν προκύπτει λόγος αντικατάστασης από τα διαθέσιμα στοιχεία. Διατήρησέ το μέχρι να ολοκληρωθεί ο έλεγχος όλων των όρων.";
  }
  return "Το υπάρχον συμβόλαιό σου διατηρεί σημαντικά πλεονεκτήματα. Οι πιθανές βελτιώσεις πρέπει να αξιολογηθούν μαζί με όσα μπορεί να χάσεις πριν εξετάσεις αλλαγή.";
}
