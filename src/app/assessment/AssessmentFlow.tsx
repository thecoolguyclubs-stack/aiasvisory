"use client";

import { useState, useCallback } from "react";
import s from "./assessment.module.css";

/* ═══════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════ */

const CheckSvg = () => (
  <svg viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2.5 7.5 6 11 12.5 4" />
  </svg>
);

const BackArrow = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 14 6 9 11 4" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="6" width="22" height="20" rx="3" />
    <line x1="4" y1="12" x2="26" y2="12" />
    <line x1="10" y1="3" x2="10" y2="6" />
    <line x1="20" y1="3" x2="20" y2="6" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="9" y1="4" x2="9" y2="14" /><line x1="4" y1="9" x2="14" y2="9" />
  </svg>
);

const SmallCheck = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="2 7 5.5 10.5 12 3.5" />
  </svg>
);

const BigCheck = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 16 13 23 26 9" />
  </svg>
);

/* ─── Person icons for Step 0 ─── */
function InsuredIcon({ type }: { type: string }) {
  const teal = "#0f9f96";
  const pink = "#cb4587";
  switch (type) {
    case "me":
      return (
        <svg className={s.insuredChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="52" cy="30" r="15" fill={teal} />
          <ellipse cx="52" cy="78" rx="24" ry="18" fill={teal} opacity="0.3" />
          <path d="M28 78c0-13.3 10.7-24 24-24s24 10.7 24 24" fill={teal} opacity="0.5" />
        </svg>
      );
    case "couple":
      return (
        <svg className={s.insuredChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="36" cy="30" r="13" fill={teal} />
          <path d="M16 76c0-11 9-20 20-20s20 9 20 20" fill={teal} opacity="0.4" />
          <circle cx="68" cy="30" r="13" fill={teal} opacity="0.65" />
          <path d="M48 76c0-11 9-20 20-20s20 9 20 20" fill={teal} opacity="0.25" />
        </svg>
      );
    case "family":
      return (
        <svg className={s.insuredChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="30" cy="28" r="12" fill={teal} />
          <path d="M12 70c0-10 8-18 18-18s18 8 18 18" fill={teal} opacity="0.4" />
          <circle cx="74" cy="28" r="12" fill={teal} opacity="0.65" />
          <path d="M56 70c0-10 8-18 18-18s18 8 18 18" fill={teal} opacity="0.25" />
          <circle cx="52" cy="48" r="9" fill={teal} opacity="0.5" />
          <path d="M38 82c0-8 6-14 14-14s14 6 14 14" fill={teal} opacity="0.2" />
        </svg>
      );
    case "children":
      return (
        <svg className={s.insuredChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="36" cy="36" r="12" fill={pink} opacity="0.7" />
          <path d="M18 76c0-10 8-18 18-18s18 8 18 18" fill={pink} opacity="0.25" />
          <circle cx="68" cy="36" r="12" fill={pink} opacity="0.5" />
          <path d="M50 76c0-10 8-18 18-18s18 8 18 18" fill={pink} opacity="0.18" />
          <circle cx="52" cy="20" r="3" fill={pink} opacity="0.3" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Insurance icons for Step 2 ─── */
function InsuranceIcon({ type, className }: { type: string; className?: string }) {
  const teal = "#0f9f96";
  const pink = "#cb4587";
  const warm = "#c49530";
  const sizeMap: Record<string, { w: number; h: number }> = {
    none: { w: 75, h: 85 },
    individual: { w: 61, h: 73 },
    group: { w: 65, h: 71 },
    both: { w: 71, h: 65 },
  };
  const sz = sizeMap[type] || { w: 70, h: 70 };
  switch (type) {
    case "none":
      return (
        <svg className={className} width={sz.w} height={sz.h} viewBox="0 0 75 85" fill="none">
          <path d="M37.5 5L65 20v30c0 16-12 26-27.5 30C22 76 10 66 10 50V20L37.5 5z" fill={teal} opacity="0.15" stroke={teal} strokeWidth="2" />
          <line x1="25" y1="30" x2="50" y2="55" stroke={teal} strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="30" x2="25" y2="55" stroke={teal} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "individual":
      return (
        <svg className={className} width={sz.w} height={sz.h} viewBox="0 0 61 73" fill="none">
          <rect x="5" y="1" width="51" height="71" rx="6" fill={teal} opacity="0.1" stroke={teal} strokeWidth="2" />
          <circle cx="30.5" cy="26" r="10" fill={teal} opacity="0.35" />
          <path d="M16 52c0-8 6.5-14.5 14.5-14.5S45 44 45 52" fill={teal} opacity="0.2" />
          <polyline points="20 62 27 68 42 54" fill="none" stroke={teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "group":
      return (
        <svg className={className} width={sz.w} height={sz.h} viewBox="0 0 65 71" fill="none">
          <rect x="10" y="20" width="45" height="48" rx="5" fill={pink} opacity="0.1" stroke={pink} strokeWidth="1.5" />
          <circle cx="22" cy="12" r="8" fill={pink} opacity="0.35" />
          <circle cx="43" cy="12" r="8" fill={pink} opacity="0.25" />
          <path d="M12 48c0-6 4-11 10-11s10 5 10 11" fill={pink} opacity="0.2" />
          <path d="M33 48c0-6 4-11 10-11s10 5 10 11" fill={pink} opacity="0.15" />
        </svg>
      );
    case "both":
      return (
        <svg className={className} width={sz.w} height={sz.h} viewBox="0 0 71 65" fill="none">
          <path d="M35.5 5L58 16v20c0 12-9 20-22.5 24C22 56 13 48 13 36V16L35.5 5z" fill={warm} opacity="0.15" stroke={warm} strokeWidth="1.5" />
          <circle cx="28" cy="30" r="7" fill={warm} opacity="0.3" />
          <circle cx="43" cy="30" r="7" fill={warm} opacity="0.2" />
          <polyline points="25 48 31 54 46 40" fill="none" stroke={warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Goal icons for Step 3 (24×24 approach icons) ─── */
function GoalIcon({ type }: { type: string }) {
  switch (type) {
    case "best_match":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "premium":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
        </svg>
      );
    case "smart_budget":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Priority icons for Step 4 ─── */
function PriorityIcon({ type }: { type: string }) {
  switch (type) {
    case "hospital":
      return (
        <svg className={s.priorityChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <rect x="22" y="18" width="60" height="68" rx="8" fill="#0f9f96" opacity="0.15" stroke="#0f9f96" strokeWidth="2" />
          <rect x="44" y="34" width="16" height="36" rx="2" fill="#0f9f96" opacity="0.45" />
          <rect x="34" y="44" width="36" height="16" rx="2" fill="#0f9f96" opacity="0.45" />
        </svg>
      );
    case "surgery":
      return (
        <svg className={s.priorityChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <path d="M30 74L62 22" stroke="#0f9f96" strokeWidth="4" strokeLinecap="round" />
          <circle cx="62" cy="22" r="8" fill="#0f9f96" opacity="0.3" />
          <path d="M26 78c-2 2-2 6 0 8s6 2 8 0l4-4-8-8-4 4z" fill="#0f9f96" opacity="0.5" />
          <path d="M50 50l20-8" stroke="#0f9f96" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    case "diagnostics":
      return (
        <svg className={s.priorityChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="44" cy="44" r="22" fill="#0f9f96" opacity="0.12" stroke="#0f9f96" strokeWidth="2.5" />
          <line x1="60" y1="60" x2="82" y2="82" stroke="#0f9f96" strokeWidth="4" strokeLinecap="round" />
          <circle cx="44" cy="44" r="10" fill="#0f9f96" opacity="0.2" />
        </svg>
      );
    case "pharmacy":
      return (
        <svg className={s.priorityChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <rect x="24" y="30" width="56" height="50" rx="10" fill="#cb4587" opacity="0.12" stroke="#cb4587" strokeWidth="2" />
          <rect x="36" y="18" width="32" height="20" rx="5" fill="#cb4587" opacity="0.15" stroke="#cb4587" strokeWidth="1.5" />
          <rect x="42" y="48" width="20" height="8" rx="2" fill="#cb4587" opacity="0.5" />
          <rect x="48" y="42" width="8" height="20" rx="2" fill="#cb4587" opacity="0.5" />
        </svg>
      );
    case "rehabilitation":
      return (
        <svg className={s.priorityChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="52" cy="22" r="10" fill="#0f9f96" opacity="0.4" />
          <line x1="52" y1="32" x2="52" y2="60" stroke="#0f9f96" strokeWidth="3" strokeLinecap="round" />
          <line x1="52" y1="46" x2="36" y2="54" stroke="#0f9f96" strokeWidth="3" strokeLinecap="round" />
          <line x1="52" y1="46" x2="68" y2="54" stroke="#0f9f96" strokeWidth="3" strokeLinecap="round" />
          <line x1="52" y1="60" x2="38" y2="82" stroke="#0f9f96" strokeWidth="3" strokeLinecap="round" />
          <line x1="52" y1="60" x2="66" y2="82" stroke="#0f9f96" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 76a8 8 0 0116 0" stroke="#0f9f96" strokeWidth="2" opacity="0.3" fill="none" />
        </svg>
      );
    case "mental_health":
      return (
        <svg className={s.priorityChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <path d="M52 22c-16 0-28 11-28 26 0 18 28 36 28 36s28-18 28-36c0-15-12-26-28-26z" fill="#cb4587" opacity="0.15" stroke="#cb4587" strokeWidth="2" />
          <path d="M38 44c0-8 6-14 14-14s14 6 14 14" fill="none" stroke="#cb4587" strokeWidth="2" strokeLinecap="round" />
          <circle cx="44" cy="46" r="3" fill="#cb4587" opacity="0.5" />
          <circle cx="60" cy="46" r="3" fill="#cb4587" opacity="0.5" />
          <path d="M44 56c0 4 3.5 7 8 7s8-3 8-7" fill="none" stroke="#cb4587" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Deductible icons for Step 5 ─── */
function DeductibleIcon({ type }: { type: string }) {
  switch (type) {
    case "low":
      return (
        <svg className={s.deductibleChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <path d="M52 18c-18 0-32 14-32 32s14 32 32 32 32-14 32-32-14-32-32-32z" fill="#0f9f96" opacity="0.1" stroke="#0f9f96" strokeWidth="2" />
          <text x="52" y="58" textAnchor="middle" fill="#0f9f96" fontSize="32" fontWeight="800">€</text>
          <path d="M36 72l4-6h24l4 6" stroke="#0f9f96" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    case "medium":
      return (
        <svg className={s.deductibleChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <rect x="22" y="40" width="60" height="44" rx="8" fill="#c49530" opacity="0.1" stroke="#c49530" strokeWidth="2" />
          <ellipse cx="52" cy="40" rx="30" ry="10" fill="#c49530" opacity="0.15" stroke="#c49530" strokeWidth="1.5" />
          <text x="52" y="72" textAnchor="middle" fill="#c49530" fontSize="28" fontWeight="800">€€</text>
        </svg>
      );
    case "high":
      return (
        <svg className={s.deductibleChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <rect x="18" y="28" width="68" height="52" rx="10" fill="#b7604c" opacity="0.1" stroke="#b7604c" strokeWidth="2" />
          <ellipse cx="52" cy="28" rx="34" ry="10" fill="#b7604c" opacity="0.12" stroke="#b7604c" strokeWidth="1.5" />
          <text x="52" y="64" textAnchor="middle" fill="#b7604c" fontSize="24" fontWeight="800">€€€</text>
          <path d="M32 78l6-4h28l6 4" stroke="#b7604c" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Additional needs icons for Step 6 ─── */
function AdditionalNeedIcon({ type, className }: { type: string; className?: string }) {
  const teal = "#0f9f96";
  const pink = "#cb4587";
  switch (type) {
    case "outpatient":
      return (
        <svg className={className} viewBox="0 0 72 60" fill="none">
          <rect x="4" y="4" width="64" height="52" rx="8" fill={teal} opacity="0.12" stroke={teal} strokeWidth="1.5" />
          <rect x="26" y="16" width="20" height="8" rx="2" fill={teal} opacity="0.45" />
          <rect x="32" y="10" width="8" height="20" rx="2" fill={teal} opacity="0.45" />
          <path d="M18 42h36" stroke={teal} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      );
    case "travel":
      return (
        <svg className={className} viewBox="0 0 78 63" fill="none">
          <circle cx="39" cy="31" r="28" fill={teal} opacity="0.1" stroke={teal} strokeWidth="1.5" />
          <ellipse cx="39" cy="31" rx="14" ry="28" fill="none" stroke={teal} strokeWidth="1.5" opacity="0.4" />
          <line x1="11" y1="31" x2="67" y2="31" stroke={teal} strokeWidth="1.5" opacity="0.35" />
          <line x1="15" y1="19" x2="63" y2="19" stroke={teal} strokeWidth="1" opacity="0.25" />
          <line x1="15" y1="43" x2="63" y2="43" stroke={teal} strokeWidth="1" opacity="0.25" />
        </svg>
      );
    case "maternity":
      return (
        <svg className={className} viewBox="0 0 56 75" fill="none">
          <circle cx="28" cy="14" r="10" fill={pink} opacity="0.35" />
          <ellipse cx="28" cy="48" rx="18" ry="22" fill={pink} opacity="0.12" stroke={pink} strokeWidth="1.5" />
          <path d="M22 38c0 0 2 16 6 16s6-16 6-16" stroke={pink} strokeWidth="1.5" opacity="0.3" />
          <circle cx="34" cy="50" r="5" fill={pink} opacity="0.2" />
        </svg>
      );
    case "physiotherapy":
      return (
        <svg className={className} viewBox="0 0 80 85" fill="none">
          <circle cx="40" cy="14" r="10" fill={teal} opacity="0.35" />
          <line x1="40" y1="24" x2="40" y2="52" stroke={teal} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="38" x2="24" y2="48" stroke={teal} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="38" x2="56" y2="48" stroke={teal} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="52" x2="28" y2="74" stroke={teal} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="52" x2="52" y2="74" stroke={teal} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M58 36a16 16 0 01 0 24" stroke={teal} strokeWidth="2" opacity="0.3" strokeLinecap="round" fill="none" />
          <path d="M64 32a22 22 0 01 0 32" stroke={teal} strokeWidth="1.5" opacity="0.2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "young_children":
      return (
        <svg className={className} viewBox="0 0 75 79" fill="none">
          <circle cx="37" cy="20" r="14" fill={teal} opacity="0.15" stroke={teal} strokeWidth="1.5" />
          <circle cx="31" cy="18" r="2.5" fill={teal} opacity="0.5" />
          <circle cx="43" cy="18" r="2.5" fill={teal} opacity="0.5" />
          <path d="M33 24c0 2 2 4 4 4s4-2 4-4" fill="none" stroke={teal} strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="37" cy="54" rx="20" ry="18" fill={teal} opacity="0.08" stroke={teal} strokeWidth="1.5" />
          <circle cx="37" cy="52" r="6" fill={teal} opacity="0.2" />
        </svg>
      );
    case "immediate_use":
      return (
        <svg className={className} viewBox="0 0 88 69" fill="none">
          <circle cx="44" cy="34" r="28" fill={teal} opacity="0.08" stroke={teal} strokeWidth="1.5" />
          <line x1="44" y1="14" x2="44" y2="36" stroke={teal} strokeWidth="3" strokeLinecap="round" />
          <line x1="44" y1="36" x2="60" y2="44" stroke={teal} strokeWidth="3" strokeLinecap="round" />
          <path d="M70 14l6-6v14h-14" stroke={teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
        </svg>
      );
    case "provider_freedom":
      return (
        <svg className={className} viewBox="0 0 70 61" fill="none">
          <circle cx="20" cy="20" r="14" fill={teal} opacity="0.12" stroke={teal} strokeWidth="1.5" />
          <circle cx="50" cy="20" r="14" fill={teal} opacity="0.12" stroke={teal} strokeWidth="1.5" />
          <circle cx="35" cy="44" r="14" fill={teal} opacity="0.12" stroke={teal} strokeWidth="1.5" />
          <polyline points="20 20 50 20 35 44 20 20" fill="none" stroke={teal} strokeWidth="1.5" opacity="0.3" />
          <circle cx="35" cy="28" r="4" fill={teal} opacity="0.35" />
        </svg>
      );
    case "prevention":
      return (
        <svg className={className} viewBox="0 0 63 76" fill="none">
          <rect x="8" y="8" width="47" height="60" rx="6" fill={pink} opacity="0.08" stroke={pink} strokeWidth="1.5" />
          <line x1="18" y1="24" x2="45" y2="24" stroke={pink} strokeWidth="1.5" opacity="0.35" />
          <line x1="18" y1="34" x2="45" y2="34" stroke={pink} strokeWidth="1.5" opacity="0.35" />
          <line x1="18" y1="44" x2="38" y2="44" stroke={pink} strokeWidth="1.5" opacity="0.35" />
          <polyline points="18 54 24 60 38 48" fill="none" stroke={pink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Network icons for Step 4 sub-question ─── */
function NetworkIcon({ type }: { type: string }) {
  const teal = "#0f9f96";
  switch (type) {
    case "network":
      return (
        <svg className={s.choiceIconImage} viewBox="0 0 34 34" fill="none">
          <rect x="3" y="3" width="28" height="28" rx="6" fill={teal} opacity="0.12" stroke={teal} strokeWidth="1.5" />
          <circle cx="17" cy="13" r="5" fill={teal} opacity="0.35" />
          <path d="M9 27c0-4.4 3.6-8 8-8s8 3.6 8 8" fill={teal} opacity="0.2" />
        </svg>
      );
    case "mixed":
      return (
        <svg className={s.choiceIconImage} viewBox="0 0 34 34" fill="none">
          <circle cx="12" cy="12" r="5" fill={teal} opacity="0.3" />
          <circle cx="22" cy="12" r="5" fill={teal} opacity="0.2" />
          <path d="M4 28c0-4.4 3.6-8 8-8s8 3.6 8 8" fill={teal} opacity="0.15" />
          <path d="M14 28c0-4.4 3.6-8 8-8s8 3.6 8 8" fill={teal} opacity="0.1" />
          <line x1="2" y1="22" x2="32" y2="22" stroke={teal} strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
        </svg>
      );
    case "free":
      return (
        <svg className={s.choiceIconImage} viewBox="0 0 34 34" fill="none">
          <circle cx="17" cy="17" r="13" fill={teal} opacity="0.08" stroke={teal} strokeWidth="1.5" />
          <circle cx="10" cy="14" r="3.5" fill={teal} opacity="0.3" />
          <circle cx="24" cy="14" r="3.5" fill={teal} opacity="0.3" />
          <circle cx="17" cy="24" r="3.5" fill={teal} opacity="0.3" />
          <line x1="10" y1="14" x2="24" y2="14" stroke={teal} strokeWidth="1" opacity="0.2" />
          <line x1="10" y1="14" x2="17" y2="24" stroke={teal} strokeWidth="1" opacity="0.2" />
          <line x1="24" y1="14" x2="17" y2="24" stroke={teal} strokeWidth="1" opacity="0.2" />
        </svg>
      );
    default: return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const MONTHS = [
  "Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος",
  "Μάιος","Ιούνιος","Ιούλιος","Αύγουστος",
  "Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος",
];

const STEP_EYEBROWS = [
  "ΒΗΜΑ 1 · ΝΟΣΟΚΟΜΕΙΑΚΗ ΑΣΦΑΛΙΣΗ",
  "ΒΗΜΑ 2 · ΗΛΙΚΙΑ ΑΣΦΑΛΙΣΜΕΝΩΝ",
  "ΒΗΜΑ 3 · ΥΠΑΡΧΟΥΣΑ ΑΣΦΑΛΙΣΗ",
  "ΒΗΜΑ 4 · ΣΤΟΧΟΣ ΑΞΙΟΛΟΓΗΣΗΣ",
  "ΒΗΜΑ 5 · ΚΥΡΙΕΣ ΠΡΟΤΕΡΑΙΟΤΗΤΕΣ",
  "ΒΗΜΑ 6 · ΠΡΟΣΩΠΙΚΗ ΣΥΜΜΕΤΟΧΗ",
  "ΒΗΜΑ 7 · ΠΡΟΣΘΕΤΕΣ ΑΝΑΓΚΕΣ",
];

const TOTAL_STEPS = 7;

const WHO_OPTIONS = [
  { id: "me", title: "Εγώ", desc: "Ατομικό πρόγραμμα νοσοκομειακής ασφάλισης", pink: false },
  { id: "couple", title: "Ζευγάρι", desc: "Κάλυψη για εμένα & τον/την σύντροφό μου", pink: false },
  { id: "family", title: "Οικογένεια", desc: "Πλήρης κάλυψη για όλη την οικογένεια", pink: false },
  { id: "children", title: "Παιδιά", desc: "Αποκλειστικά για τα παιδιά μου", pink: true },
];

const INSURANCE_OPTIONS = [
  { id: "none", title: "Δεν έχω ασφάλιση", desc: "Αυτή θα είναι η πρώτη μου ασφάλιση υγείας", warm: false, pink: false, imgClass: "insuranceChoiceIconImageNone" as const },
  { id: "individual", title: "Ατομική ασφάλιση", desc: "Έχω ήδη ατομικό πρόγραμμα υγείας", warm: false, pink: false, imgClass: "insuranceChoiceIconImageIndividual" as const },
  { id: "group", title: "Ομαδική ασφάλιση", desc: "Καλύπτομαι μέσω του εργοδότη μου", warm: false, pink: true, imgClass: "insuranceChoiceIconImageGroup" as const },
  { id: "both", title: "Ατομική & Ομαδική", desc: "Διαθέτω και τα δύο είδη ασφάλισης", warm: true, pink: false, imgClass: "insuranceChoiceIconImageIndividualGroup" as const },
];

const GOAL_OPTIONS = [
  {
    id: "best_match", title: "Βέλτιστη Κάλυψη",
    desc: "Σας προτείνουμε τα προγράμματα που ταιριάζουν καλύτερα στις ανάγκες σας, βάσει της αξιολόγησής σας.",
    badgeText: "ΔΗΜΟΦΙΛΕΣ", badgeClass: "approachBadgeBestMatch" as const,
    benefits: ["Εξατομικευμένες προτάσεις", "Ανάλυση αναγκών", "Σύγκριση προγραμμάτων"],
  },
  {
    id: "premium", title: "Premium Προστασία",
    desc: "Τα πληρέστερα προγράμματα υγείας χωρίς συμβιβασμούς στην κάλυψη ή τις παροχές.",
    badgeText: "ΠΛΗΡΗΣ ΚΑΛΥΨΗ", badgeClass: "approachBadgePremium" as const,
    benefits: ["Μέγιστες καλύψεις", "Μηδενική συμμετοχή", "VIP εξυπηρέτηση"],
  },
  {
    id: "smart_budget", title: "Έξυπνη Οικονομία",
    desc: "Η καλύτερη σχέση αξίας-τιμής για ουσιαστική κάλυψη υγείας με λογικό κόστος.",
    badgeText: "ΣΧΕΣΗ ΑΞΙΑΣ / ΤΙΜΗΣ", badgeClass: "approachBadgeSmartBudget" as const,
    benefits: ["Χαμηλό κόστος", "Βασικές καλύψεις", "Ευέλικτο πρόγραμμα"],
  },
];

const PRIORITY_OPTIONS = [
  { id: "hospital", title: "Νοσοκομειακή κάλυψη", desc: "Πλήρης κάλυψη νοσηλείας σε ιδιωτικά νοσοκομεία", pink: false },
  { id: "surgery", title: "Χειρουργικές επεμβάσεις", desc: "Κάλυψη χειρουργείων χωρίς αναμονή", pink: false },
  { id: "diagnostics", title: "Διαγνωστικές εξετάσεις", desc: "Προηγμένος διαγνωστικός έλεγχος", pink: false },
  { id: "pharmacy", title: "Φαρμακευτική κάλυψη", desc: "Κάλυψη φαρμάκων εντός & εκτός νοσοκομείου", pink: true },
  { id: "rehabilitation", title: "Αποκατάσταση", desc: "Μετεγχειρητική αποκατάσταση & φυσικοθεραπεία", pink: false },
  { id: "mental_health", title: "Ψυχική υγεία", desc: "Ψυχολογική υποστήριξη & θεραπεία", pink: true },
];

const NETWORK_OPTIONS = [
  { id: "network", title: "Συμβεβλημένοι πάροχοι", desc: "Προτιμώ τη χρήση συμβεβλημένου δικτύου" },
  { id: "mixed", title: "Μικτή πρόσβαση", desc: "Θέλω ευελιξία μεταξύ δικτύου και εκτός" },
  { id: "free", title: "Ελεύθερη επιλογή", desc: "Θέλω να επιλέγω ελεύθερα γιατρό & νοσοκομείο" },
];

const DEDUCTIBLE_OPTIONS = [
  { id: "low", title: "Χωρίς / Χαμηλή Συμμετοχή", amount: "€0 — €1.500", desc: "Ελάχιστη ή μηδενική προσωπική συμμετοχή στο κόστος", amountClass: "deductibleAmountLow" as const, iconClass: "" },
  { id: "medium", title: "Μεσαία Συμμετοχή", amount: "€1.500 — €5.000", desc: "Ισορροπία μεταξύ ασφαλίστρου και κάλυψης", amountClass: "deductibleAmountMedium" as const, iconClass: "deductibleChoiceIconMedium" },
  { id: "high", title: "Υψηλή Συμμετοχή", amount: "€5.000+", desc: "Χαμηλότερα ασφάλιστρα, υψηλότερη συμμετοχή", amountClass: "deductibleAmountHigh" as const, iconClass: "deductibleChoiceIconHigh" },
];

const ADDITIONAL_OPTIONS = [
  { id: "outpatient", title: "Εξωνοσοκομειακή περίθαλψη", desc: "Κάλυψη επισκέψεων, εξετάσεων & θεραπειών εκτός νοσοκομείου", pink: false, imgClass: "additionalNeedIconImageOutpatient" as const },
  { id: "travel", title: "Ταξιδιωτική ασφάλιση", desc: "Ιατρική κάλυψη κατά τη διάρκεια ταξιδιών στο εξωτερικό", pink: false, imgClass: "additionalNeedIconImageTravel" as const },
  { id: "maternity", title: "Κάλυψη μητρότητας", desc: "Κάλυψη εγκυμοσύνης, τοκετού & λοχείας", pink: true, imgClass: "additionalNeedIconImageMaternity" as const },
  { id: "physiotherapy", title: "Φυσικοθεραπεία", desc: "Φυσικοθεραπεία, αποκατάσταση & θεραπευτικές συνεδρίες", pink: false, imgClass: "additionalNeedIconImagePhysiotherapy" as const },
  { id: "young_children", title: "Μικρά παιδιά (0–5)", desc: "Ειδική κάλυψη παιδιατρικής φροντίδας για βρέφη & νήπια", pink: false, imgClass: "additionalNeedIconImageYoungChildren" as const },
  { id: "immediate_use", title: "Άμεση χρήση χωρίς αναμονή", desc: "Ενεργοποίηση καλύψεων χωρίς περίοδο αναμονής", pink: false, imgClass: "additionalNeedIconImageImmediateUse" as const },
  { id: "provider_freedom", title: "Ελεύθερη επιλογή παρόχου", desc: "Δυνατότητα επιλογής οποιουδήποτε γιατρού ή νοσοκομείου", pink: false, imgClass: "additionalNeedIconImageProviderFreedom" as const },
  { id: "prevention", title: "Πρόληψη & Check-up", desc: "Ετήσιος προληπτικός έλεγχος & εξετάσεις πρόληψης", pink: true, imgClass: "additionalNeedIconImagePreventionCheckup" as const },
];

const PERSON_COUNTS: Record<string, number> = { me: 1, couple: 2, family: 3, children: 2 };

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function AssessmentFlow() {
  /* ─── State ─── */
  const [step, setStep] = useState(0);
  const [whoToInsure, setWhoToInsure] = useState("");
  const [persons, setPersons] = useState([{ day: "", month: "", year: "" }]);
  const [currentInsurance, setCurrentInsurance] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [assessmentGoal, setAssessmentGoal] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [networkPreference, setNetworkPreference] = useState("");
  const [deductible, setDeductible] = useState("");
  const [additionalCoverages, setAdditionalCoverages] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  /* ─── Derived ─── */
  const progress = Math.round(((step + (completed ? 1 : 0)) / TOTAL_STEPS) * 100);
  const currentYear = new Date().getFullYear();

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return whoToInsure !== "";
      case 1: return persons.every(p => p.day && p.month && p.year);
      case 2: return currentInsurance !== "";
      case 3: return assessmentGoal !== "";
      case 4: return priorities.length > 0 && networkPreference !== "";
      case 5: return deductible !== "";
      case 6: return true;
      default: return false;
    }
  }, [step, whoToInsure, persons, currentInsurance, assessmentGoal, priorities, networkPreference, deductible]);

  /* ─── Handlers ─── */
  const goNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else setCompleted(true);
  };
  const goBack = () => { if (step > 0) setStep(s => s - 1); };

  const handleWhoSelect = (id: string) => {
    setWhoToInsure(id);
    const count = PERSON_COUNTS[id] || 1;
    setPersons(prev => Array.from({ length: count }, (_, i) => prev[i] || { day: "", month: "", year: "" }));
    setTimeout(() => setStep(1), 380);
  };

  const handleInsuranceSelect = (id: string) => {
    setCurrentInsurance(id);
    if (id !== "none") {
      setShowUploadModal(true);
    } else {
      setUploadedFile(null);
      setTimeout(() => setStep(3), 380);
    }
  };

  const handleGoalSelect = (id: string) => {
    setAssessmentGoal(id);
    setTimeout(() => setStep(4), 380);
  };

  const handleDeductibleSelect = (id: string) => {
    setDeductible(id);
    setTimeout(() => setStep(6), 380);
  };

  const togglePriority = (id: string) => {
    setPriorities(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const toggleAdditional = (id: string) => {
    setAdditionalCoverages(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const updatePerson = (index: number, field: string, value: string) => {
    setPersons(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addPerson = () => {
    if (persons.length < 6) setPersons(prev => [...prev, { day: "", month: "", year: "" }]);
  };

  const removePerson = (index: number) => {
    if (persons.length > 1) setPersons(prev => prev.filter((_, i) => i !== index));
  };

  const getPersonLabel = (index: number) => {
    if (whoToInsure === "me") return "Εσείς";
    if (whoToInsure === "couple") return index === 0 ? "Εσείς" : "Σύντροφος";
    if (whoToInsure === "family") {
      if (index === 0) return "Εσείς";
      if (index === 1) return "Σύντροφος";
      return `Παιδί ${index - 1}`;
    }
    if (whoToInsure === "children") return `Παιδί ${index + 1}`;
    return `Άτομο ${index + 1}`;
  };

  /* ─── Header ─── */
  const header = (
    <header className={s.header}>
      <div className={s.headerInner}>
        <div className={s.brand}>
          <span className={s.brandMark} />
          <span className={s.brandName}>insurancemarket</span>
        </div>
        <div className={s.progressBlock}>
          <span className={s.headerStatus}>
            {completed ? "Ολοκληρώθηκε" : `Βήμα ${step + 1} από ${TOTAL_STEPS}`}
          </span>
          <div className={s.progressTrack}>
            <span
              className={s.progressValue}
              style={{ "--progress": `${progress}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>
    </header>
  );

  /* ─── Navigation helper ─── */
  const nav = (nextLabel = "Επόμενο", onNext?: () => void, showBack = true) => (
    <div className={s.navigation}>
      {showBack && step > 0 ? (
        <button type="button" className={s.backButton} onClick={goBack}>
          <BackArrow /> Πίσω
        </button>
      ) : <span />}
      <button
        type="button"
        className={s.primaryButton}
        disabled={!canProceed()}
        onClick={onNext || goNext}
      >
        {nextLabel}
      </button>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     COMPLETION SCREEN
     ═══════════════════════════════════════════════════════════ */
  if (completed) {
    return (
      <div className={s.assessment}>
        {header}
        <main className={s.stage}>
          <div className={s.completionCard}>
            <div className={s.completionIcon}><BigCheck /></div>
            <h1>Η αξιολόγησή σας ολοκληρώθηκε!</h1>
            <p>Σας ευχαριστούμε. Θα επικοινωνήσουμε σύντομα μαζί σας με εξατομικευμένες προτάσεις ασφάλισης υγείας.</p>
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP VIEWS
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className={s.assessment}>
      {header}
      <main className={s.stage}>

        {/* ─────────── STEP 0: Who to insure ─────────── */}
        {step === 0 && (
          <div className={`${s.stepCard} ${s.insuredStepCard}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[0]}</span>
            <h1 className={s.stepTitle}>Ποιους θέλετε να ασφαλίσετε;</h1>
            <p className={s.helper}>Επιλέξτε ποιους αφορά η νοσοκομειακή ασφάλιση.</p>

            <fieldset className={`${s.choiceGrid} ${s.insuredGrid}`}>
              {WHO_OPTIONS.map(opt => {
                const sel = whoToInsure === opt.id;
                return (
                  <label key={opt.id} className={`${s.choiceCard} ${s.singleChoiceCard} ${s.insuredChoiceCard} ${sel ? s.selected : ""}`}>
                    <input type="radio" name="who" value={opt.id} className={s.visuallyHidden} checked={sel} onChange={() => handleWhoSelect(opt.id)} />
                    <span className={s.insuredChoiceCheck}><CheckSvg /></span>
                    <span className={`${s.insuredChoiceIcon} ${opt.pink ? s.insuredChoiceIconPink : ""}`}>
                      <InsuredIcon type={opt.id} />
                    </span>
                    <span className={s.insuredChoiceText}>
                      <span className={s.insuredChoiceTitle}>{opt.title}</span>
                      <span className={s.insuredChoiceDescription}>{opt.desc}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {nav("Επόμενο", undefined, false)}
          </div>
        )}

        {/* ─────────── STEP 1: Birth dates ─────────── */}
        {step === 1 && (
          <div className={`${s.stepCard} ${s.birthDateStepCard}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[1]}</span>
            <h1 className={s.stepTitle}>Ημερομηνία γέννησης</h1>
            <p className={s.helper}>Συμπληρώστε την ημερομηνία γέννησης κάθε ασφαλισμένου.</p>

            <div className={s.birthDateList}>
              {persons.map((person, i) => (
                <div key={i} className={s.dateField}>
                  <div className={s.dateFieldIcon}><CalendarIcon /></div>
                  <div className={s.dateFieldBody}>
                    <div className={s.dateLabelRow}>
                      <div className={s.dateLabelText}>
                        <label>{getPersonLabel(i)}</label>
                        <span className={s.personCount}>Άτομο {i + 1}</span>
                      </div>
                      {persons.length > 1 && (
                        <button type="button" onClick={() => removePerson(i)}>Αφαίρεση</button>
                      )}
                    </div>
                    <div className={s.birthdayInputs}>
                      <label>
                        Ημέρα
                        <select value={person.day} onChange={e => updatePerson(i, "day", e.target.value)}>
                          <option value="">—</option>
                          {Array.from({ length: 31 }, (_, d) => (
                            <option key={d + 1} value={String(d + 1)}>{d + 1}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Μήνας
                        <select value={person.month} onChange={e => updatePerson(i, "month", e.target.value)}>
                          <option value="">—</option>
                          {MONTHS.map((m, mi) => (
                            <option key={mi} value={String(mi + 1)}>{m}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Έτος
                        <select value={person.year} onChange={e => updatePerson(i, "year", e.target.value)}>
                          <option value="">—</option>
                          {Array.from({ length: 100 }, (_, y) => currentYear - y).map(yr => (
                            <option key={yr} value={String(yr)}>{yr}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(whoToInsure === "family" || whoToInsure === "children") && (
              <button type="button" className={s.addPersonButton} onClick={addPerson} disabled={persons.length >= 6}>
                <PlusIcon /> Προσθήκη ατόμου
              </button>
            )}

            <div className={s.infoCallout}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="9" cy="9" r="8" /><line x1="9" y1="8" x2="9" y2="13" /><circle cx="9" cy="5.5" r="0.5" fill="currentColor" />
              </svg>
              Η ηλικία χρησιμοποιείται αποκλειστικά για την εύρεση κατάλληλων προγραμμάτων.
            </div>

            {nav()}
          </div>
        )}

        {/* ─────────── STEP 2: Current insurance ─────────── */}
        {step === 2 && (
          <div className={`${s.stepCard} ${s.insuranceStepCard}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[2]}</span>
            <h1 className={s.stepTitle}>Έχετε υπάρχουσα ασφάλιση υγείας;</h1>
            <p className={s.helper}>Ενημερώστε μας αν διαθέτετε ήδη κάποιο πρόγραμμα υγείας.</p>

            <fieldset className={`${s.choiceGrid} ${s.insuranceGrid}`}>
              {INSURANCE_OPTIONS.map(opt => {
                const sel = currentInsurance === opt.id;
                return (
                  <label key={opt.id} className={`${s.choiceCard} ${s.singleChoiceCard} ${s.insuranceChoiceCard} ${sel ? s.selected : ""}`}>
                    <input type="radio" name="insurance" value={opt.id} className={s.visuallyHidden} checked={sel} onChange={() => handleInsuranceSelect(opt.id)} />
                    <span className={s.insuranceChoiceCheck}><CheckSvg /></span>
                    <span className={`${s.insuranceChoiceIcon} ${opt.pink ? s.insuranceChoiceIconPink : ""} ${opt.warm ? s.insuranceChoiceIconWarm : ""}`}>
                      <InsuranceIcon type={opt.id} className={(s as any)[opt.imgClass]} />
                    </span>
                    <span className={s.insuranceChoiceText}>
                      <span className={s.insuranceChoiceTitle}>{opt.title}</span>
                      <span className={s.insuranceChoiceDescription}>{opt.desc}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {currentInsurance && currentInsurance !== "none" && uploadedFile && (
              <div className={s.infoCallout}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="4 9 7.5 12.5 14 5.5" />
                </svg>
                Αρχείο: {uploadedFile.name}
                <button type="button" className={s.removeFile} onClick={() => setUploadedFile(null)}>Αφαίρεση</button>
              </div>
            )}

            {nav()}
          </div>
        )}

        {/* ─── Upload Modal (for step 2) ─── */}
        {showUploadModal && (
          <div className={s.modalOverlay} onClick={() => { setShowUploadModal(false); setTimeout(() => setStep(3), 200); }}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>
              <div className={s.modalIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <h2>Ανεβάστε το ασφαλιστήριο σας</h2>
              <p>Αν διαθέτετε το τρέχον ασφαλιστήριο σας σε ψηφιακή μορφή, ανεβάστε το για πιο ακριβή αξιολόγηση.</p>

              <label className={`${s.dropzone} ${s.compactDropzone}`}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className={s.visuallyHidden}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setUploadedFile(file);
                  }}
                />
                {uploadedFile ? (
                  <span className={s.fileSummary}>
                    <svg viewBox="0 0 32 32" fill="currentColor"><path d="M8 2a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10l-8-8H8zm10 2l6 6h-6V4z" /></svg>
                    <span>
                      <strong>{uploadedFile.name}</strong>
                      <small>{(uploadedFile.size / 1024).toFixed(0)} KB</small>
                    </span>
                    <button type="button" className={s.removeFile} onClick={e => { e.preventDefault(); setUploadedFile(null); }}>
                      Αφαίρεση
                    </button>
                  </span>
                ) : (
                  <>
                    <span className={s.compactUploadText}>Σύρετε εδώ ή πατήστε για αναζήτηση αρχείου</span>
                    <span>PDF, JPG, PNG — έως 10 MB</span>
                  </>
                )}
              </label>

              <div className={s.uploadPrivacyNotice}>
                Τα αρχεία σας είναι ασφαλή και χρησιμοποιούνται αποκλειστικά για την αξιολόγηση.
              </div>

              <div className={s.modalActions}>
                <button
                  type="button"
                  className={s.secondaryButton}
                  onClick={() => { setShowUploadModal(false); setTimeout(() => setStep(3), 200); }}
                >
                  Παράλειψη
                </button>
                <button
                  type="button"
                  className={`${s.primaryButton}`}
                  style={{ minWidth: 220 }}
                  disabled={!uploadedFile}
                  onClick={() => { setShowUploadModal(false); setTimeout(() => setStep(3), 200); }}
                >
                  Συνέχεια
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── STEP 3: Assessment goal ─────────── */}
        {step === 3 && (
          <div className={`${s.stepCard} ${s.wide}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[3]}</span>
            <h1 className={s.stepTitle}>Ποιος είναι ο στόχος σας;</h1>
            <p className={s.helper}>Επιλέξτε την προσέγγιση που σας ταιριάζει.</p>

            <fieldset className={s.approachGrid}>
              {GOAL_OPTIONS.map(opt => {
                const sel = assessmentGoal === opt.id;
                return (
                  <label key={opt.id} className={`${s.approachCard} ${sel ? s.selected : ""}`}>
                    <input type="radio" name="goal" value={opt.id} className={s.visuallyHidden} checked={sel} onChange={() => handleGoalSelect(opt.id)} />
                    <div className={s.approachTop}>
                      <span className={s.approachIcon}><GoalIcon type={opt.id} /></span>
                      <span className={s.radio} />
                    </div>
                    <strong>{opt.title}</strong>
                    <span className={s.approachDescription}>{opt.desc}</span>
                    <div className={s.benefitList}>
                      {opt.benefits.map(b => (
                        <span key={b}><SmallCheck />{b}</span>
                      ))}
                    </div>
                    <span className={`${s.approachBadge} ${(s as any)[opt.badgeClass]}`}>{opt.badgeText}</span>
                  </label>
                );
              })}
            </fieldset>

            {nav()}
          </div>
        )}

        {/* ─────────── STEP 4: Priorities + Network ─────────── */}
        {step === 4 && (
          <div className={`${s.stepCard} ${s.priorityStepCard}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[4]}</span>
            <h1 className={s.stepTitle}>Ποιες είναι οι προτεραιότητές σας;</h1>
            <div className={s.helperRow}>
              <p className={s.helper}>Επιλέξτε έως 3 προτεραιότητες που σας ενδιαφέρουν περισσότερο.</p>
              <span className={s.selectionCount}>{priorities.length} / 3</span>
            </div>

            <fieldset className={`${s.choiceGrid} ${s.priorityGrid} ${s.multiGrid}`}>
              {PRIORITY_OPTIONS.map(opt => {
                const sel = priorities.includes(opt.id);
                const dis = !sel && priorities.length >= 3;
                return (
                  <label key={opt.id} className={`${s.choiceCard} ${s.multiChoice} ${s.priorityChoiceCard} ${sel ? s.selected : ""} ${dis ? s.choiceDisabled : ""}`}>
                    <input type="checkbox" className={s.visuallyHidden} checked={sel} disabled={dis} onChange={() => togglePriority(opt.id)} />
                    <span className={s.priorityChoiceCheck}><CheckSvg /></span>
                    <span className={`${s.priorityChoiceIcon} ${opt.pink ? s.priorityChoiceIconPink : s.priorityChoiceIconTeal}`}>
                      <PriorityIcon type={opt.id} />
                    </span>
                    <span className={s.priorityChoiceText}>
                      <span className={s.priorityChoiceTitle}>{opt.title}</span>
                      <span className={s.priorityChoiceDescription}>{opt.desc}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {/* Network preference sub-question */}
            <div className={s.careAccessQuestion}>
              <h2>Πρόσβαση σε πάροχους υγείας</h2>
              <fieldset className={`${s.choiceGrid} ${s.denseChoices}`}>
                {NETWORK_OPTIONS.map(opt => {
                  const sel = networkPreference === opt.id;
                  return (
                    <label key={opt.id} className={`${s.choiceCard} ${s.choiceCardWithIcon} ${sel ? s.selected : ""}`}>
                      <input type="radio" name="network" value={opt.id} className={s.visuallyHidden} checked={sel} onChange={() => setNetworkPreference(opt.id)} />
                      <span className={s.radio} />
                      <span className={s.choiceText}>
                        <span>{opt.title}</span>
                        <span className={s.choiceDescription}>{opt.desc}</span>
                      </span>
                      <span className={s.choiceIcon}>
                        <NetworkIcon type={opt.id} />
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </div>

            {nav()}
          </div>
        )}

        {/* ─────────── STEP 5: Deductible ─────────── */}
        {step === 5 && (
          <div className={`${s.stepCard} ${s.deductibleStepCard}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[5]}</span>
            <h1 className={s.stepTitle}>Ποια προσωπική συμμετοχή προτιμάτε;</h1>
            <p className={s.helper}>Η προσωπική συμμετοχή (απαλλαγή) επηρεάζει το ύψος του ασφαλίστρου σας.</p>

            <fieldset className={`${s.choiceGrid} ${s.deductibleGrid}`}>
              {DEDUCTIBLE_OPTIONS.map(opt => {
                const sel = deductible === opt.id;
                return (
                  <label key={opt.id} className={`${s.choiceCard} ${s.singleChoiceCard} ${s.deductibleChoiceCard} ${sel ? s.selected : ""}`}>
                    <input type="radio" name="deductible" value={opt.id} className={s.visuallyHidden} checked={sel} onChange={() => handleDeductibleSelect(opt.id)} />
                    <span className={s.deductibleChoiceCheck}><CheckSvg /></span>
                    <span className={`${s.deductibleChoiceIcon} ${opt.iconClass ? (s as any)[opt.iconClass] : ""}`}>
                      <DeductibleIcon type={opt.id} />
                    </span>
                    <span className={s.deductibleChoiceText}>
                      <span className={s.deductibleChoiceTitle}>{opt.title}</span>
                      <span className={`${s.deductibleAmountBadge} ${(s as any)[opt.amountClass]}`}>{opt.amount}</span>
                      <span className={s.deductibleChoiceDescription}>{opt.desc}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {nav()}
          </div>
        )}

        {/* ─────────── STEP 6: Additional coverages ─────────── */}
        {step === 6 && (
          <div className={`${s.stepCard} ${s.additionalNeedsStepCard}`}>
            <span className={s.eyebrow}>{STEP_EYEBROWS[6]}</span>
            <h1 className={s.stepTitle}>Πρόσθετες ασφαλιστικές ανάγκες</h1>
            <div className={s.helperRow}>
              <p className={s.helper}>Επιλέξτε τυχόν πρόσθετες καλύψεις που σας ενδιαφέρουν (προαιρετικό).</p>
              {additionalCoverages.length > 0 && (
                <span className={s.selectionCount}>{additionalCoverages.length} επιλεγμένα</span>
              )}
            </div>

            <fieldset className={`${s.choiceGrid} ${s.additionalNeedsGrid} ${s.multiGrid}`}>
              {ADDITIONAL_OPTIONS.map(opt => {
                const sel = additionalCoverages.includes(opt.id);
                return (
                  <label key={opt.id} className={`${s.choiceCard} ${s.multiChoice} ${s.additionalNeedChoiceCard} ${sel ? s.selected : ""}`}>
                    <input type="checkbox" className={s.visuallyHidden} checked={sel} onChange={() => toggleAdditional(opt.id)} />
                    <span className={s.additionalNeedChoiceCheck}><CheckSvg /></span>
                    <span className={`${s.additionalNeedIcon} ${opt.pink ? s.additionalNeedIconPink : ""}`}>
                      <AdditionalNeedIcon type={opt.id} className={(s as any)[opt.imgClass]} />
                    </span>
                    <span className={s.additionalNeedText}>
                      <span className={s.additionalNeedTitle}>{opt.title}</span>
                      <span className={s.additionalNeedDescription}>{opt.desc}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {nav("Ολοκλήρωση", () => setCompleted(true))}
          </div>
        )}

      </main>
    </div>
  );
}
