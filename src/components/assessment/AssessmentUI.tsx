import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import type {
  AssessmentOption,
  OptionIcon,
} from "@/lib/assessment/config";
import type { LocalPolicyFile } from "@/lib/assessment/state";

import {
  BalanceIcon,
  CheckIcon,
  DocumentIcon,
  ShieldIcon,
  UploadIcon,
  WalletIcon,
} from "./AssessmentIcons";
import styles from "@/app/assessment/assessment.module.css";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const normalizeBadgeClass = (badge?: string) => {
  switch (badge) {
    case "Premium Choice":
      return styles.approachBadgePremium;
    case "Best Match":
      return styles.approachBadgeBestMatch;
    case "Smart Budget Choice":
      return styles.approachBadgeSmartBudget;
    default:
      return null;
  }
};

const normalizeDeductibleBadgeClass = (description?: string) => {
  switch (description) {
    case "0€ - 500€":
      return styles.choiceDescriptionBadgeTeal;
    case "500€ - 1.500€":
      return styles.choiceDescriptionBadgeYellow;
    case "1.500€ και άνω":
      return styles.choiceDescriptionBadgeWarm;
    default:
      return null;
  }
};

type SingleChoiceIconSet =
  | "currentInsurance"
  | "deductible"
  | "evaluationGoal"
  | "insuredPeople";
type MultiChoiceIconSet = "additionalNeeds" | "priorities";
type InsuredOptionTone = "teal" | "pink";
type InsuranceOptionTone = "teal" | "pink" | "warm";
type AdditionalNeedOptionTone = "teal" | "pink";
type PriorityOptionTone = "teal" | "pink";
type DeductibleAmountTone = "low" | "medium" | "high";

const evaluationGoalIconSrcByOptionId: Record<string, string> = {
  first_time: "/icons/assessment-goal-first-time.png",
  independent_from_employer: "/icons/assessment-goal-independent.png",
  evaluate_existing: "/icons/assessment-goal-evaluate-existing.png",
  improve_value: "/icons/assessment-goal-improve-value.png",
};

const singleChoiceIconSrc = (
  optionId: string,
  iconSet?: SingleChoiceIconSet,
) => {
  if (iconSet !== "evaluationGoal") return null;
  return evaluationGoalIconSrcByOptionId[optionId] ?? null;
};

const insuredOptionMetaById: Record<
  string,
  { description: string; src: string; tone: InsuredOptionTone }
> = {
  self: {
    description: "Ατομική κάλυψη",
    src: "/icons/assessment-insured-self.png",
    tone: "teal",
  },
  "self-partner": {
    description: "Κάλυψη ζευγαριού",
    src: "/icons/assessment-insured-couple.png",
    tone: "pink",
  },
  family: {
    description: "Οικογενειακή κάλυψη",
    src: "/icons/assessment-insured-family.png",
    tone: "teal",
  },
  children: {
    description: "Κάλυψη παιδιών",
    src: "/icons/assessment-insured-children.png",
    tone: "pink",
  },
};

const insuredOptionMeta = (
  optionId: string,
  iconSet?: SingleChoiceIconSet,
) => {
  if (iconSet !== "insuredPeople") return null;
  return insuredOptionMetaById[optionId] ?? null;
};

const insuranceOptionMetaById: Record<
  string,
  {
    description: string;
    imageClassName: string;
    src: string;
    tone: InsuranceOptionTone;
  }
> = {
  none: {
    description: "Χωρίς ενεργό ιδιωτικό πρόγραμμα",
    imageClassName: styles.insuranceChoiceIconImageNone,
    src: "/icons/assessment-insurance-none.svg",
    tone: "teal",
  },
  individual: {
    description: "Υπάρχει προσωπικό συμβόλαιο",
    imageClassName: styles.insuranceChoiceIconImageIndividual,
    src: "/icons/assessment-insurance-individual.svg",
    tone: "teal",
  },
  group: {
    description: "Κάλυψη από εργοδότη",
    imageClassName: styles.insuranceChoiceIconImageGroup,
    src: "/icons/assessment-insurance-group.svg",
    tone: "pink",
  },
  "individual-group": {
    description: "Συνδυασμός δύο καλύψεων",
    imageClassName: styles.insuranceChoiceIconImageIndividualGroup,
    src: "/icons/assessment-insurance-individual-group.svg",
    tone: "warm",
  },
};

const insuranceOptionMeta = (
  optionId: string,
  iconSet?: SingleChoiceIconSet,
) => {
  if (iconSet !== "currentInsurance") return null;
  return insuranceOptionMetaById[optionId] ?? null;
};

const deductibleOptionMetaById: Record<
  string,
  { amountTone: DeductibleAmountTone; description: string; src: string }
> = {
  minimum: {
    amountTone: "low",
    description: "Μικρό ποσό πληρωμής όταν χρειαστεί κάλυψη.",
    src: "/icons/assessment-deductible-low.png",
  },
  small: {
    amountTone: "medium",
    description: "Μοιράζεις μέρος του κόστους για καλύτερη τιμή.",
    src: "/icons/assessment-deductible-medium.png",
  },
  large: {
    amountTone: "high",
    description: "Μεγαλύτερη απαλλαγή με χαμηλότερο ασφάλιστρο.",
    src: "/icons/assessment-deductible-high.png",
  },
};

const deductibleOptionMeta = (
  optionId: string,
  iconSet?: SingleChoiceIconSet,
) => {
  if (iconSet !== "deductible") return null;
  return deductibleOptionMetaById[optionId] ?? null;
};

const priorityOptionMetaById: Record<
  string,
  { description: string; src: string; tone: PriorityOptionTone }
> = {
  "hospital-network": {
    description:
      "Άμεση πρόσβαση σε ιδιωτικές δομές υγείας όταν χρειαστεί.",
    src: "/icons/assessment-priority-private-hospital.png",
    tone: "teal",
  },
  surgery: {
    description:
      "Κάλυψη εξόδων για προγραμματισμένες ή έκτακτες επεμβάσεις.",
    src: "/icons/assessment-priority-surgery.png",
    tone: "pink",
  },
  emergency: {
    description:
      "Προστασία για ξαφνικά περιστατικά που απαιτούν άμεση φροντίδα.",
    src: "/icons/assessment-priority-emergency.png",
    tone: "teal",
  },
  "serious-illness": {
    description:
      "Οικονομική ενίσχυση σε απαιτητικές ιατρικές περιπτώσεις.",
    src: "/icons/assessment-priority-serious-illness.png",
    tone: "pink",
  },
  "high-limit": {
    description:
      "Μεγαλύτερη ασφάλεια για παρατεταμένη ή σύνθετη νοσηλεία.",
    src: "/icons/assessment-priority-high-limit.png",
    tone: "teal",
  },
  "low-deductible": {
    description:
      "Περιορισμένη επιβάρυνση στο ποσό που πληρώνεις εσύ.",
    src: "/icons/assessment-priority-low-deductible.png",
    tone: "pink",
  },
};

const priorityOptionMeta = (
  optionId: string,
  iconSet?: MultiChoiceIconSet,
) => {
  if (iconSet !== "priorities") return null;
  return priorityOptionMetaById[optionId] ?? null;
};

const additionalNeedMetaById: Record<
  string,
  { imageClassName: string; src: string; tone: AdditionalNeedOptionTone }
> = {
  outpatient_visits: {
    imageClassName: styles.additionalNeedIconImageOutpatient,
    src: "/icons/assessment-additional-outpatient-visits.svg",
    tone: "teal",
  },
  frequent_travel: {
    imageClassName: styles.additionalNeedIconImageTravel,
    src: "/icons/assessment-additional-frequent-travel.svg",
    tone: "pink",
  },
  maternity: {
    imageClassName: styles.additionalNeedIconImageMaternity,
    src: "/icons/assessment-additional-maternity.svg",
    tone: "pink",
  },
  physiotherapy: {
    imageClassName: styles.additionalNeedIconImagePhysiotherapy,
    src: "/icons/assessment-additional-physiotherapy.svg",
    tone: "teal",
  },
  young_children: {
    imageClassName: styles.additionalNeedIconImageYoungChildren,
    src: "/icons/assessment-additional-young-children.svg",
    tone: "teal",
  },
  immediate_use: {
    imageClassName: styles.additionalNeedIconImageImmediateUse,
    src: "/icons/assessment-additional-immediate-use.svg",
    tone: "pink",
  },
  provider_freedom: {
    imageClassName: styles.additionalNeedIconImageProviderFreedom,
    src: "/icons/assessment-additional-provider-freedom.svg",
    tone: "teal",
  },
  prevention_checkup: {
    imageClassName: styles.additionalNeedIconImagePreventionCheckup,
    src: "/icons/assessment-additional-prevention-checkup.svg",
    tone: "pink",
  },
};

const additionalNeedMeta = (
  optionId: string,
  iconSet?: MultiChoiceIconSet,
) => {
  if (iconSet !== "additionalNeeds") return null;
  return additionalNeedMetaById[optionId] ?? null;
};

export function AssessmentHeader({
  displayStep,
  statusText,
}: {
  displayStep?: number;
  statusText?: string;
}) {
  const progress = displayStep ? `${(displayStep / 8) * 100}%` : "100%";

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brand} aria-label="insurancemarket">
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandName}>insurancemarket</span>
        </div>

        {displayStep ? (
          <div className={styles.progressBlock}>
            <span>Βήμα {displayStep} από 8</span>
            <div
              aria-label={`Πρόοδος: βήμα ${displayStep} από 8`}
              aria-valuemax={8}
              aria-valuemin={1}
              aria-valuenow={displayStep}
              className={styles.progressTrack}
              role="progressbar"
            >
              <span
                className={styles.progressValue}
                style={{ "--progress": progress } as CSSProperties}
              />
            </div>
          </div>
        ) : (
          <p className={styles.headerStatus}>{statusText}</p>
        )}
      </div>
    </header>
  );
}

export function StepCard({
  eyebrow,
  title,
  helper,
  children,
  size = "standard",
  layout = "default",
}: {
  eyebrow: string;
  title: string;
  helper?: string;
  children: ReactNode;
  size?: "standard" | "medium" | "wide" | "upload";
  layout?:
    | "additionalNeeds"
    | "birthDates"
    | "deductible"
    | "default"
    | "insurance"
    | "insured"
    | "priority";
}) {
  return (
    <section
      className={cx(
        styles.stepCard,
        styles[size],
        layout === "additionalNeeds" && styles.additionalNeedsStepCard,
        layout === "birthDates" && styles.birthDateStepCard,
        layout === "insurance" && styles.insuranceStepCard,
        layout === "insured" && styles.insuredStepCard,
        layout === "priority" && styles.priorityStepCard,
        layout === "deductible" && styles.deductibleStepCard,
      )}
    >
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.stepTitle}>{title}</h1>
      {helper && <p className={styles.helper}>{helper}</p>}
      {children}
    </section>
  );
}

export function SingleChoiceOptions({
  name,
  options,
  value,
  onChange,
  columns = 1,
  dense = false,
  descriptionVariant = "text",
  iconSet,
}: {
  name: string;
  options: readonly AssessmentOption[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 1 | 2;
  dense?: boolean;
  descriptionVariant?: "text" | "badge";
  iconSet?: SingleChoiceIconSet;
}) {
  return (
    <fieldset
      aria-label="Επιλογές"
      className={cx(
        styles.choiceGrid,
        columns === 2 && styles.twoColumns,
        dense && styles.denseChoices,
        iconSet === "insuredPeople" && styles.insuredGrid,
        iconSet === "currentInsurance" && styles.insuranceGrid,
        iconSet === "deductible" && styles.deductibleGrid,
      )}
    >
      {options.map((option) => {
        const checked = value === option.id;
        const iconSrc = singleChoiceIconSrc(option.id, iconSet);
        const insuredMeta = insuredOptionMeta(option.id, iconSet);
        const insuranceMeta = insuranceOptionMeta(option.id, iconSet);
        const deductibleMeta = deductibleOptionMeta(option.id, iconSet);

        return (
          <label
            className={cx(
              styles.choiceCard,
              styles.singleChoiceCard,
              insuredMeta && styles.insuredChoiceCard,
              insuranceMeta && styles.insuranceChoiceCard,
              deductibleMeta && styles.deductibleChoiceCard,
              checked && styles.selected,
              descriptionVariant === "badge" &&
                !deductibleMeta &&
                !insuranceMeta &&
                !insuredMeta &&
                styles.choiceCardWithBadge,
              iconSrc && styles.choiceCardWithIcon,
            )}
            key={option.id}
          >
            <input
              checked={checked}
              className={styles.visuallyHidden}
              name={name}
              onChange={() => onChange(option.id)}
              type="radio"
              value={option.id}
            />
            {insuredMeta ? (
              <>
                <span className={styles.insuredChoiceCheck} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span
                  className={cx(
                    styles.insuredChoiceIcon,
                    insuredMeta.tone === "pink" && styles.insuredChoiceIconPink,
                  )}
                  aria-hidden="true"
                >
                  <Image
                    alt=""
                    className={styles.insuredChoiceIconImage}
                    height={104}
                    src={insuredMeta.src}
                    width={104}
                  />
                </span>
                <span className={styles.insuredChoiceText}>
                  <span className={styles.insuredChoiceTitle}>
                    {option.label}
                  </span>
                  <small className={styles.insuredChoiceDescription}>
                    {insuredMeta.description}
                  </small>
                </span>
              </>
            ) : insuranceMeta ? (
              <>
                <span className={styles.insuranceChoiceCheck} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span
                  className={cx(
                    styles.insuranceChoiceIcon,
                    insuranceMeta.tone === "pink" &&
                      styles.insuranceChoiceIconPink,
                    insuranceMeta.tone === "warm" &&
                      styles.insuranceChoiceIconWarm,
                  )}
                  aria-hidden="true"
                >
                  <Image
                    alt=""
                    className={cx(
                      styles.insuranceChoiceIconImage,
                      insuranceMeta.imageClassName,
                    )}
                    height={104}
                    src={insuranceMeta.src}
                    unoptimized
                    width={104}
                  />
                </span>
                <span className={styles.insuranceChoiceText}>
                  <span className={styles.insuranceChoiceTitle}>
                    {option.label}
                  </span>
                  <small className={styles.insuranceChoiceDescription}>
                    {insuranceMeta.description}
                  </small>
                </span>
              </>
            ) : deductibleMeta ? (
              <>
                <span className={styles.deductibleChoiceCheck} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span
                  className={cx(
                    styles.deductibleChoiceIcon,
                    deductibleMeta.amountTone === "medium" &&
                      styles.deductibleChoiceIconMedium,
                    deductibleMeta.amountTone === "high" &&
                      styles.deductibleChoiceIconHigh,
                  )}
                  aria-hidden="true"
                >
                  <Image
                    alt=""
                    className={styles.deductibleChoiceIconImage}
                    height={104}
                    src={deductibleMeta.src}
                    width={104}
                  />
                </span>
                <span className={styles.deductibleChoiceText}>
                  <span className={styles.deductibleChoiceTitle}>
                    {option.label}
                  </span>
                  {option.description && (
                    <small
                      className={cx(
                        styles.deductibleAmountBadge,
                        deductibleMeta.amountTone === "low" &&
                          styles.deductibleAmountLow,
                        deductibleMeta.amountTone === "medium" &&
                          styles.deductibleAmountMedium,
                        deductibleMeta.amountTone === "high" &&
                          styles.deductibleAmountHigh,
                      )}
                    >
                      {option.description}
                    </small>
                  )}
                  <small className={styles.deductibleChoiceDescription}>
                    {deductibleMeta.description}
                  </small>
                </span>
              </>
            ) : (
              <>
                <span className={styles.radio} aria-hidden="true" />
                <span className={styles.choiceText}>
                  <span>{option.label}</span>
                  {option.description && (
                    <small
                      className={cx(
                        descriptionVariant === "badge"
                          ? styles.choiceDescriptionBadge
                          : styles.choiceDescription,
                        descriptionVariant === "badge" &&
                          normalizeDeductibleBadgeClass(option.description),
                      )}
                    >
                      {option.description}
                    </small>
                  )}
                </span>
              </>
            )}
            {iconSrc && (
              <span className={styles.choiceIcon} aria-hidden="true">
                <Image
                  alt=""
                  className={styles.choiceIconImage}
                  height={104}
                  src={iconSrc}
                  width={104}
                />
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

export function MultiChoiceOptions({
  name,
  options,
  values,
  onToggle,
  max,
  descriptionVisibility = "always",
  iconSet,
}: {
  name: string;
  options: readonly AssessmentOption[];
  values: string[];
  onToggle: (value: string) => void;
  max?: number;
  descriptionVisibility?: "always" | "selected";
  iconSet?: MultiChoiceIconSet;
}) {
  const isAtLimit = Boolean(max && values.length >= max);

  return (
    <fieldset
      aria-label="Επιλογές"
      className={cx(
        styles.choiceGrid,
        iconSet !== "additionalNeeds" && styles.twoColumns,
        styles.multiGrid,
        iconSet === "additionalNeeds" && styles.additionalNeedsGrid,
        iconSet === "priorities" && styles.priorityGrid,
      )}
    >
      {options.map((option) => {
        const checked = values.includes(option.id);
        const disabled = isAtLimit && !checked;
        const additionalMeta = additionalNeedMeta(option.id, iconSet);
        const priorityMeta = priorityOptionMeta(option.id, iconSet);
        const priorityDescription = option.description ?? priorityMeta?.description;
        const additionalDescription = option.description;

        return (
          <label
            className={cx(
              styles.choiceCard,
              styles.multiChoice,
              additionalMeta && styles.additionalNeedChoiceCard,
              priorityMeta && styles.priorityChoiceCard,
              checked && styles.selected,
              disabled && styles.choiceDisabled,
              descriptionVisibility === "selected" &&
                styles.multiChoiceRevealOnSelected,
            )}
            key={option.id}
          >
            <input
              checked={checked}
              className={styles.visuallyHidden}
              disabled={disabled}
              name={name}
              onChange={() => onToggle(option.id)}
              type="checkbox"
              value={option.id}
            />
            {additionalMeta ? (
              <>
                <span className={styles.additionalNeedChoiceCheck} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span
                  className={cx(
                    styles.additionalNeedIcon,
                    additionalMeta.tone === "pink" &&
                      styles.additionalNeedIconPink,
                  )}
                  aria-hidden="true"
                >
                  <Image
                    alt=""
                    className={cx(
                      styles.additionalNeedIconImage,
                      additionalMeta.imageClassName,
                    )}
                    height={104}
                    src={additionalMeta.src}
                    unoptimized
                    width={104}
                  />
                </span>
                <span className={styles.additionalNeedText}>
                  <span className={styles.additionalNeedTitle}>
                    {option.label}
                  </span>
                  {additionalDescription && (
                    <small className={styles.additionalNeedDescription}>
                      {additionalDescription}
                    </small>
                  )}
                </span>
              </>
            ) : priorityMeta ? (
              <>
                <span className={styles.priorityChoiceCheck} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span
                  className={cx(
                    styles.priorityChoiceIcon,
                    priorityMeta.tone === "pink"
                      ? styles.priorityChoiceIconPink
                      : styles.priorityChoiceIconTeal,
                  )}
                  aria-hidden="true"
                >
                  <Image
                    alt=""
                    className={styles.priorityChoiceIconImage}
                    height={104}
                    src={priorityMeta.src}
                    width={104}
                  />
                </span>
                <span className={styles.priorityChoiceText}>
                  <span className={styles.priorityChoiceTitle}>
                    {option.label}
                  </span>
                  {priorityDescription && (
                    <small className={styles.priorityChoiceDescription}>
                      {priorityDescription}
                    </small>
                  )}
                </span>
              </>
            ) : (
              <>
                <span className={styles.checkbox} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span className={styles.choiceText}>
                  <span>{option.label}</span>
                  {option.description && (
                    <small
                      className={cx(
                        styles.choiceDescription,
                        descriptionVisibility === "selected" &&
                          styles.choiceDescriptionSelectedOnly,
                      )}
                    >
                      {option.description}
                    </small>
                  )}
                </span>
              </>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

const approachIcon = (icon?: OptionIcon) => {
  switch (icon) {
    case "balance":
      return <BalanceIcon />;
    case "wallet":
      return <WalletIcon />;
    default:
      return <ShieldIcon />;
  }
};

export function ApproachCards({
  options,
  value,
  onChange,
}: {
  options: readonly AssessmentOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset aria-label="Προσέγγιση προστασίας και κόστους" className={styles.approachGrid}>
      {options.map((option) => {
        const checked = option.id === value;

        return (
          <label
            className={cx(styles.approachCard, checked && styles.selected)}
            key={option.id}
          >
            <input
              checked={checked}
              className={styles.visuallyHidden}
              name="cost-approach"
              onChange={() => onChange(option.id)}
              type="radio"
              value={option.id}
            />
            <span className={styles.approachTop}>
              <span className={styles.approachIcon}>{approachIcon(option.icon)}</span>
              <span className={styles.radio} aria-hidden="true" />
            </span>
            <strong>{option.label}</strong>
            <span className={styles.approachDescription}>{option.description}</span>
            {option.categoryBadge && (
              <span
                className={cx(
                  styles.approachBadge,
                  normalizeBadgeClass(option.categoryBadge),
                )}
              >
                {option.categoryBadge}
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

export function StepNavigation({
  onBack,
  onNext,
  nextLabel = "Συνέχεια",
  disabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className={styles.navigation}>
      {onBack ? (
        <button className={styles.backButton} onClick={onBack} type="button">
          <span aria-hidden="true">←</span> Πίσω
        </button>
      ) : (
        <span />
      )}
      <button
        className={styles.primaryButton}
        disabled={disabled}
        onClick={onNext}
        type="button"
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function UploadDropzone({
  inputId,
  file,
  error,
  compact = false,
  analysisStatus = "idle",
  onFile,
  onRemove,
  onSelectionError,
}: {
  inputId: string;
  file: LocalPolicyFile | null;
  error: string | null;
  compact?: boolean;
  analysisStatus?:
    | "idle"
    | "selecting"
    | "validating"
    | "retry"
    | "uploading"
    | "analyzing"
    | "success"
    | "error";
  onFile: (file: File) => void;
  onRemove?: () => void;
  onSelectionError?: (message: string) => void;
}) {
  const busy = [
    "selecting",
    "validating",
    "retry",
    "uploading",
    "analyzing",
  ].includes(analysisStatus);
  const statusMessage =
    analysisStatus === "selecting"
      ? "Προετοιμασία αρχείου"
      : analysisStatus === "validating"
        ? "Έλεγχος τύπου και υπογραφής PDF"
        : analysisStatus === "retry"
          ? "Προετοιμασία νέας προσπάθειας"
          : analysisStatus === "uploading"
            ? "Αποστολή του PDF για ασφαλή ανάλυση"
            : analysisStatus === "analyzing"
              ? "Η ανάλυση συνεχίζεται στον πάροχο: καλύψεις, όρια, απαλλαγές, αναμονές και εξαιρέσεις."
              : analysisStatus === "success"
                ? "Η ανάλυση ολοκληρώθηκε"
                : analysisStatus === "error"
                  ? "Αποτυχία ανάλυσης · Νέα προσπάθεια"
                  : null;

  return (
    <div aria-busy={busy}>
      <p className={styles.uploadPrivacyNotice}>
        Για την επίδειξη χρησιμοποίησε ανωνυμοποιημένο αντίγραφο συμβολαίου
        χωρίς προσωπικά ή ευαίσθητα στοιχεία.
      </p>
      <label
        className={cx(
          styles.dropzone,
          compact && styles.compactDropzone,
          busy && styles.dropzoneBusy,
        )}
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files.length !== 1) {
            onSelectionError?.("Επίλεξε ένα μόνο αρχείο PDF.");
            return;
          }
          const droppedFile = event.dataTransfer.files.item(0);
          if (droppedFile) onFile(droppedFile);
        }}
      >
        <input
          accept=".pdf,application/pdf"
          className={styles.visuallyHidden}
          id={inputId}
          onChange={(event) => {
            const selectedFile = event.target.files?.item(0);
            if (selectedFile) onFile(selectedFile);
            event.currentTarget.value = "";
          }}
          type="file"
        />

        {file ? (
          <span className={styles.fileSummary}>
            <DocumentIcon />
            <span>
              <strong>{file.name}</strong>
              <small>{formatFileSize(file.size)}</small>
            </span>
            {onRemove && (
              <button
                aria-label="Αφαίρεση αρχείου"
                className={styles.removeFile}
                onClick={(event) => {
                  event.preventDefault();
                  onRemove();
                }}
                type="button"
              >
                Αφαίρεση ανάλυσης
              </button>
            )}
          </span>
        ) : compact ? (
          <span className={styles.compactUploadText}>
            {analysisStatus === "error"
              ? "Νέα προσπάθεια · επίλεξε PDF"
              : "Επιλογή αρχείου · μόνο PDF"}
          </span>
        ) : (
          <>
            <UploadIcon className={styles.uploadIcon} />
            <strong>
              {analysisStatus === "error"
                ? "Νέα προσπάθεια"
                : "Σύρε το PDF εδώ ή επίλεξέ το από τη συσκευή σου"}
            </strong>
            <span>Μόνο PDF · έως 15 MB</span>
          </>
        )}
      </label>
      {statusMessage && (
        <p
          aria-live="polite"
          className={cx(
            styles.uploadAnalysisStatus,
            analysisStatus === "success" && styles.uploadAnalysisSuccess,
            analysisStatus === "error" && styles.uploadAnalysisError,
          )}
          role={analysisStatus === "error" ? "alert" : "status"}
        >
          {busy && <span aria-hidden="true" />}
          {statusMessage}
        </p>
      )}
      {error && <p className={styles.uploadError}>{error}</p>}
    </div>
  );
}

export function UploadActionLabel({
  htmlFor,
  children,
  variant = "primary",
}: {
  htmlFor: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <label
      className={variant === "primary" ? styles.uploadPrimaryLabel : styles.uploadSecondaryLabel}
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
