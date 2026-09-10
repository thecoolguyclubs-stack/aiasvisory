"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./advisory.module.css";

const destinations = [
  { href: "/assessment", label: "Οι απαντήσεις σου", number: "01" },
  { href: "/assessment/profile", label: "Το προφίλ σου", number: "02" },
  { href: "/results", label: "Η αξιολόγησή σου", number: "03" },
];

export function AdvisoryNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Πλοήγηση αξιολόγησης" className={styles.advisoryNavigation} data-export-ignore>
      {destinations.map(({ href, label, number }) => (
        <Link key={href} href={href} aria-current={pathname === href || (href === "/results" && pathname.startsWith("/results/")) ? "page" : undefined}>
          <span>{number}</span>{label}
        </Link>
      ))}
    </nav>
  );
}
