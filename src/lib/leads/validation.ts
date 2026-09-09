import type {
  LeadFormData,
  LeadFormErrors,
  LeadFormValidationResult,
  LeadPreferredContactTime,
  NormalizedLeadFormData,
} from "./types";
import { LEAD_CONTACT_TIME_OPTIONS } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeWhitespace = (value: string) =>
  value.trim().replace(/\s+/gu, " ");

const isPreferredContactTime = (
  value: unknown,
): value is LeadPreferredContactTime =>
  LEAD_CONTACT_TIME_OPTIONS.some((option) => option.value === value);

export function normalizeLeadPhone(value: string) {
  const compact = value.trim().replace(/[\s().-]+/gu, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export function normalizeLeadFormData(
  value: LeadFormData,
): NormalizedLeadFormData {
  return {
    fullName: normalizeWhitespace(value.fullName),
    email: value.email.trim().toLocaleLowerCase("el-GR"),
    phone: normalizeLeadPhone(value.phone),
    preferredContactTime: value.preferredContactTime,
    consents: {
      advisorContact: value.consents.advisorContact,
      privacyTerms: value.consents.privacyTerms,
      ...(typeof value.consents.marketing === "boolean"
        ? { marketing: value.consents.marketing }
        : {}),
    },
  };
}

export function validateLeadFormData(
  value: unknown,
): LeadFormValidationResult {
  const input = isRecord(value) ? value : {};
  const consentInput = isRecord(input.consents) ? input.consents : {};
  const fullName =
    typeof input.fullName === "string" ? normalizeWhitespace(input.fullName) : "";
  const email =
    typeof input.email === "string"
      ? input.email.trim().toLocaleLowerCase("el-GR")
      : "";
  const phone =
    typeof input.phone === "string" ? normalizeLeadPhone(input.phone) : "";
  const preferredContactTime = isPreferredContactTime(
    input.preferredContactTime,
  )
    ? input.preferredContactTime
    : null;
  const errors: LeadFormErrors = {};

  if (!fullName) {
    errors.fullName = "Συμπλήρωσε το ονοματεπώνυμό σου.";
  } else if (fullName.length > 100) {
    errors.fullName = "Το ονοματεπώνυμο πρέπει να είναι έως 100 χαρακτήρες.";
  } else if (!/^[\p{L}\p{M}.'’ -]+$/u.test(fullName)) {
    errors.fullName = "Χρησιμοποίησε μόνο γράμματα στο ονοματεπώνυμο.";
  } else if (fullName.split(" ").filter(Boolean).length < 2) {
    errors.fullName = "Συμπλήρωσε όνομα και επώνυμο.";
  }

  if (!email) {
    errors.email = "Συμπλήρωσε το email σου.";
  } else if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)
  ) {
    errors.email = "Συμπλήρωσε ένα έγκυρο email.";
  }

  if (!phone) {
    errors.phone = "Συμπλήρωσε το τηλέφωνό σου.";
  } else if (!/^\+?\d{7,15}$/u.test(phone)) {
    errors.phone = "Συμπλήρωσε ένα έγκυρο τηλέφωνο.";
  }

  if (!preferredContactTime) {
    errors.preferredContactTime =
      "Επίλεξε την προτιμώμενη ώρα επικοινωνίας.";
  }

  if (consentInput.advisorContact !== true) {
    errors.advisorContact =
      "Αποδέξου την επικοινωνία από ασφαλιστικό σύμβουλο.";
  }

  if (consentInput.privacyTerms !== true) {
    errors.privacyTerms =
      "Αποδέξου την ενημέρωση απορρήτου για την υποβολή του αιτήματος.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      fullName,
      email,
      phone,
      preferredContactTime: preferredContactTime!,
      consents: {
        advisorContact: true,
        privacyTerms: true,
        ...(typeof consentInput.marketing === "boolean"
          ? { marketing: consentInput.marketing }
          : {}),
      },
    },
  };
}
