"use client";

import { useState } from "react";
import styles from "./export-pdf.module.css";

/** Captures the current view locally; no assessment data is sent to a PDF service. */
export function ExportPdfButton() {
  const [status, setStatus] = useState<"idle" | "busy" | "error" | "done">("idle");

  async function download() {
    if (status === "busy") return;
    setStatus("busy");
    try {
      const { exportViewPdf } = await import("@/lib/export/view-pdf");
      await exportViewPdf();
      setStatus("done");
    } catch (error) {
      console.error("PDF export failed", error instanceof Error ? error.message : "Unknown rendering error");
      setStatus("error");
    }
  }

  return (
    <div className={styles.exportControl} data-export-ignore>
      <button className={styles.button} type="button" disabled={status === "busy"} aria-busy={status === "busy"} onClick={download}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" /></svg>
        {status === "busy" ? "Δημιουργία…" : "Εξαγωγή PDF"}
      </button>
      <span className={status === "error" ? styles.error : styles.status} role="status">
        {status === "error" ? "Η εξαγωγή απέτυχε. Δοκίμασε ξανά." : status === "done" ? "Το PDF δημιουργήθηκε." : status === "busy" ? "Ετοιμάζουμε όλες τις ενότητες της σελίδας." : ""}
      </span>
    </div>
  );
}
