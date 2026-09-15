// SVG artwork from the supplied AssessmentFlow, shared by the persisted assessment.
import s from "@/app/assessment/assessment.module.css";

export function InsuredIcon({ type }: { type: string }) {
  const teal = "#0f9f96";
  const pink = "#cb4587";
  switch (type) {
    case "self":
      return (
        <svg className={s.insuredChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <circle cx="52" cy="30" r="15" fill={teal} />
          <ellipse cx="52" cy="78" rx="24" ry="18" fill={teal} opacity="0.3" />
          <path d="M28 78c0-13.3 10.7-24 24-24s24 10.7 24 24" fill={teal} opacity="0.5" />
        </svg>
      );
    case "self-partner":
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

export function InsuranceIcon({ type, className }: { type: string; className?: string }) {
  const teal = "#0f9f96";
  const pink = "#cb4587";
  const warm = "#c49530";
  const sizeMap: Record<string, { w: number; h: number }> = {
    none: { w: 75, h: 85 },
    individual: { w: 61, h: 73 },
    group: { w: 65, h: 71 },
    "individual-group": { w: 71, h: 65 },
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
    case "individual-group":
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

export function PriorityIcon({ type }: { type: string }) {
  switch (type) {
    case "hospital-network":
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

export function DeductibleIcon({ type }: { type: string }) {
  switch (type) {
    case "up-to-1500":
      return (
        <svg className={s.deductibleChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <path d="M52 18c-18 0-32 14-32 32s14 32 32 32 32-14 32-32-14-32-32-32z" fill="#0f9f96" opacity="0.1" stroke="#0f9f96" strokeWidth="2" />
          <text x="52" y="58" textAnchor="middle" fill="#0f9f96" fontSize="32" fontWeight="800">€</text>
          <path d="M36 72l4-6h24l4 6" stroke="#0f9f96" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    case "1500-to-5000":
      return (
        <svg className={s.deductibleChoiceIconImage} viewBox="0 0 104 104" fill="none">
          <rect x="22" y="40" width="60" height="44" rx="8" fill="#c49530" opacity="0.1" stroke="#c49530" strokeWidth="2" />
          <ellipse cx="52" cy="40" rx="30" ry="10" fill="#c49530" opacity="0.15" stroke="#c49530" strokeWidth="1.5" />
          <text x="52" y="72" textAnchor="middle" fill="#c49530" fontSize="28" fontWeight="800">€€</text>
        </svg>
      );
    case "over-5000":
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

export function AdditionalNeedIcon({ type, className }: { type: string; className?: string }) {
  const teal = "#0f9f96";
  const pink = "#cb4587";
  switch (type) {
    case "outpatient_visits":
      return (
        <svg className={className} viewBox="0 0 72 60" fill="none">
          <rect x="4" y="4" width="64" height="52" rx="8" fill={teal} opacity="0.12" stroke={teal} strokeWidth="1.5" />
          <rect x="26" y="16" width="20" height="8" rx="2" fill={teal} opacity="0.45" />
          <rect x="32" y="10" width="8" height="20" rx="2" fill={teal} opacity="0.45" />
          <path d="M18 42h36" stroke={teal} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      );
    case "frequent_travel":
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
    case "prevention_checkup":
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
