export type InsurerBrandId = "generali" | "groupama" | "interamerican";

export interface InsurerBrand {
  id: InsurerBrandId;
  displayName: string;
  programPrefixes: readonly string[];
  insurerNames: readonly string[];
  logo: {
    src: string;
    width: number;
    height: number;
  };
}

export const insurerBrandRegistry = {
  generali: {
    id: "generali",
    displayName: "Generali Hellas",
    programPrefixes: ["GEN"],
    insurerNames: ["generali", "generali hellas"],
    logo: {
      src: "/insurers/generali.png",
      width: 500,
      height: 500,
    },
  },
  groupama: {
    id: "groupama",
    displayName: "Groupama Ασφαλιστική",
    programPrefixes: ["GRO"],
    insurerNames: ["groupama", "groupama ασφαλιστική"],
    logo: {
      src: "/insurers/groupama.png",
      width: 337,
      height: 156,
    },
  },
  interamerican: {
    id: "interamerican",
    displayName: "Interamerican",
    programPrefixes: ["INT"],
    insurerNames: [
      "interamerican",
      "interamerican ελληνικη ασφαλιστικη",
      "interamerican ελληνική ασφαλιστική",
    ],
    logo: {
      src: "/insurers/interamerican.png",
      width: 602,
      height: 142,
    },
  },
} as const satisfies Record<InsurerBrandId, InsurerBrand>;

const brands = Object.values(insurerBrandRegistry);
const normalizeInsurerName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._'’-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("el-GR");

const brandSearchIndex = brands.map((brand) => ({
  brand,
  insurerNames: brand.insurerNames.map(normalizeInsurerName),
}));

export function resolveInsurerBrand(
  insurer: string,
  programId?: string,
): InsurerBrand | null {
  const normalizedInsurer = normalizeInsurerName(insurer);
  const programPrefix = programId?.split("-")[0]?.toUpperCase();

  return (
    brands.find(
      (brand) =>
        Boolean(programPrefix) &&
        brand.programPrefixes.some((prefix) => prefix === programPrefix),
    ) ??
    brandSearchIndex.find(({ insurerNames }) =>
      insurerNames.some(
        (name) =>
          normalizedInsurer === name || normalizedInsurer.includes(name),
      ),
    )?.brand ??
    null
  );
}

export function insurerMonogram(insurer: string) {
  return (
    insurer
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("el-GR") || "ΑΣ"
  );
}
