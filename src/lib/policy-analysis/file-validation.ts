export const POLICY_PDF_MIME_TYPE = "application/pdf";
export const MAX_POLICY_PDF_SIZE = 15 * 1024 * 1024;
export const POLICY_PDF_CANONICAL_FILENAME = "uploaded-policy.pdf";

export type PolicyFileValidationCode =
  | "missing_file"
  | "multiple_files"
  | "invalid_filename"
  | "invalid_mime_type"
  | "empty_file"
  | "file_too_large"
  | "invalid_pdf_signature";

export type PolicyFileValidationResult =
  | { ok: true }
  | { ok: false; code: PolicyFileValidationCode; message: string };

export function validatePolicyFileMetadata(file: {
  name: string;
  type: string;
  size: number;
}): PolicyFileValidationResult {
  if (
    !file.name ||
    file.name !== file.name.trim() ||
    file.name.length > 255 ||
    !/\.pdf$/iu.test(file.name)
  ) {
    return {
      ok: false,
      code: "invalid_filename",
      message: "Επίλεξε αρχείο με κατάληξη .pdf.",
    };
  }

  if (file.type !== POLICY_PDF_MIME_TYPE) {
    return {
      ok: false,
      code: "invalid_mime_type",
      message: "Επιτρέπονται μόνο αρχεία PDF.",
    };
  }

  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return {
      ok: false,
      code: "empty_file",
      message: "Το PDF είναι κενό ή δεν μπορεί να αναγνωστεί.",
    };
  }

  if (file.size > MAX_POLICY_PDF_SIZE) {
    return {
      ok: false,
      code: "file_too_large",
      message: "Το αρχείο πρέπει να είναι έως 15 MB.",
    };
  }

  return { ok: true };
}

export function hasPdfMagicBytes(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export async function hasPdfMagicBytesInFile(file: Blob) {
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());

  try {
    return hasPdfMagicBytes(signature);
  } finally {
    signature.fill(0);
  }
}
