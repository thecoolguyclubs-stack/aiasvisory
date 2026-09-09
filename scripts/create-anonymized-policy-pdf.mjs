import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = join(
  scriptDirectory,
  "fixtures",
  "anonymized-health-policy.pdf",
);

const lines = [
  "ANONYMIZED DEMO HEALTH INSURANCE POLICY",
  "Insurer: DemoCare Insurance",
  "Product: Anonymous Health Plan",
  "Policy type: Individual health insurance",
  "Currency: EUR",
  "Hospitalization: confirmed inpatient coverage.",
  "Annual hospitalization limit: EUR 50000 per insured person.",
  "Coverage percentage: 80 percent after the applicable deductible.",
  "Deductible: EUR 1500 per hospitalization incident.",
  "Emergency care: confirmed, subject to the policy terms.",
  "Waiting period: 3 months for hospitalization due to illness.",
  "Exclusion: elective cosmetic treatment is not covered.",
  "Network: use of contracted hospitals is subject to prior notification.",
  "No policyholder name, address, tax number, payment or health data included.",
];

const escapePdfText = (value) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const stream = [
  "BT",
  "/F1 11 Tf",
  "50 790 Td",
  ...lines.flatMap((line, index) => [
    index === 0 ? "" : "0 -22 Td",
    `(${escapePdfText(line)}) Tj`,
  ]).filter(Boolean),
  "ET",
  "",
].join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
  `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];

let pdf = "%PDF-1.4\n";
const offsets = [0];

for (const [index, object] of objects.entries()) {
  offsets.push(Buffer.byteLength(pdf, "utf8"));
  pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (const offset of offsets.slice(1)) {
  pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, pdf, "utf8");

console.log(
  JSON.stringify({
    created: outputPath,
    bytes: Buffer.byteLength(pdf, "utf8"),
    anonymized: true,
  }),
);
