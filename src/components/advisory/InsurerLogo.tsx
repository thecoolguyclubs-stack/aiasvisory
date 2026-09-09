import Image from "next/image";

import {
  insurerMonogram,
  resolveInsurerBrand,
} from "@/lib/insurers/brands";

import styles from "./advisory.module.css";

export function InsurerLogo({
  insurer,
  programId,
  compact = false,
}: {
  insurer: string;
  programId?: string;
  compact?: boolean;
}) {
  const brand = resolveInsurerBrand(insurer, programId);
  const className = `${styles.insurerLogo} ${
    compact ? styles.insurerLogoCompact : ""
  }`;

  if (!brand) {
    return (
      <span
        aria-label={`Λογότυπο ${insurer}`}
        className={`${className} ${styles.insurerLogoFallback}`}
        role="img"
      >
        {insurerMonogram(insurer)}
      </span>
    );
  }

  return (
    <span className={className} data-brand={brand.id}>
      <Image
        alt={`Λογότυπο ${brand.displayName}`}
        className={styles.insurerLogoImage}
        data-brand={brand.id}
        height={brand.logo.height}
        preload={compact}
        sizes="(max-width: 540px) 92px, 112px"
        src={brand.logo.src}
        unoptimized
        width={brand.logo.width}
      />
    </span>
  );
}
