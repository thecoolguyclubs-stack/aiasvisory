"use client";

import { useState } from "react";
import styles from "@/app/assessment/assessment.module.css";

const months = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];

export function BirthdayInput({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [parts, setParts] = useState(() => {
    const [year = "", month = "", day = ""] = value.split("-");
    return { year, month, day };
  });
  const [error, setError] = useState("");
  const currentYear = new Date().getFullYear();

  function update(key: keyof typeof parts, value: string) {
    const next = { ...parts, [key]: value };
    setParts(next);
    if (!next.year || !next.month || !next.day) {
      setError("");
      onChange("");
      return;
    }
    const date = `${next.year}-${next.month}-${next.day}`;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    const valid = Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && parsed.getTime() <= Date.now();
    setError(valid ? "" : "Έλεγξε την ημερομηνία γέννησης.");
    onChange(valid ? date : "");
  }

  return (
    <div>
      <div className={styles.birthdayInputs} role="group" aria-label={`Ημερομηνία γέννησης για ${label}`} aria-describedby={error ? `${id}-error` : undefined}>
        <label>
          <span>Ημέρα</span>
          <select id={id} aria-invalid={Boolean(error)} value={parts.day} onChange={(event) => update("day", event.target.value)}>
            <option value="">ΗΗ</option>
            {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <label>
          <span>Μήνας</span>
          <select aria-invalid={Boolean(error)} value={parts.month} onChange={(event) => update("month", event.target.value)}>
            <option value="">Μήνας</option>
            {months.map((month, index) => <option key={month} value={String(index + 1).padStart(2, "0")}>{month}</option>)}
          </select>
        </label>
        <label>
          <span>Έτος</span>
          <select aria-invalid={Boolean(error)} value={parts.year} onChange={(event) => update("year", event.target.value)}>
            <option value="">ΕΕΕΕ</option>
            {Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      {error && <p id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
