const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const unsafeStorageKeyPattern =
  /^(?:base64|bytes|file[_-]?data|pdf[_-]?bytes|raw[_-]?pdf)$/iu;
const unsafeStorageValuePattern =
  /data:application\/pdf;base64|%PDF-|OPENAI_API_KEY|SUPABASE_SECRET_KEY|sb_secret_|sk-[A-Za-z0-9_-]{8,}/iu;
const longBase64Pattern = /(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{1024,}={0,2}(?:$|[^A-Za-z0-9+/])/u;

export function containsUnsafePolicyStorageMaterial(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      unsafeStorageValuePattern.test(value) || longBase64Pattern.test(value)
    );
  }

  if (Array.isArray(value)) {
    return value.some(containsUnsafePolicyStorageMaterial);
  }

  if (!isRecord(value)) return false;

  return Object.entries(value).some(
    ([key, nestedValue]) =>
      unsafeStorageKeyPattern.test(key) ||
      containsUnsafePolicyStorageMaterial(nestedValue),
  );
}
