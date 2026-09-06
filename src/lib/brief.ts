import { CONTACT_EMAIL, PRODUCT_NAME } from "@/lib/constants";
import type { SiteInspection } from "@/lib/types";

export function buildCloneBrief(inspection: SiteInspection): string {
  const host = safeHost(inspection.finalUrl);
  const internalLinks = inspection.links.filter((link) => link.internal);
  const externalLinks = inspection.links.filter((link) => !link.internal);

  return [
    `# ${PRODUCT_NAME} brief`,
    "",
    `Source: ${inspection.finalUrl}`,
    `Fetched: ${inspection.fetchedAt}`,
    `Title: ${inspection.title}`,
    "",
    "## Job",
    `Rebuild ${host} as a clean Next.js app for JS Labs. Match the live page's copy, structure, and visual system. A person reviews before anything is published.`,
    "",
    "## Page identity",
    `- Language: ${inspection.language ?? "not declared"}`,
    `- Description: ${inspection.description || "none"}`,
    `- Canonical: ${inspection.canonical ?? "not declared"}`,
    `- Open Graph image: ${inspection.ogImage ?? "none"}`,
    `- Generator: ${inspection.generator ?? "not declared"}`,
    `- Theme color: ${inspection.themeColor ?? "not declared"}`,
    `- Word count (approx): ${inspection.wordCount}`,
    `- Response: ${inspection.response.status} · ${inspection.response.bytes} bytes${inspection.response.redirected ? " · redirected" : ""}`,
    "",
    "## Detected stack",
    inspection.tech.length > 0 ? inspection.tech.map((item) => `- ${item}`).join("\n") : "- Not enough public signals",
    "",
    "## Design tokens",
    "### Colors",
    inspection.colors.length > 0 ? inspection.colors.map((color) => `- ${color}`).join("\n") : "- No distinctive colors extracted",
    "",
    "### Fonts",
    inspection.fonts.length > 0 ? inspection.fonts.map((font) => `- ${font}`).join("\n") : "- No custom fonts extracted",
    "",
    "## Topology",
    inspection.sections.length > 0
      ? inspection.sections.map((section, index) => `${String(index + 1).padStart(2, "0")}. ${section}`).join("\n")
      : "- No clear section headings",
    "",
    "## Headings",
    inspection.headings.length > 0
      ? inspection.headings.map((heading) => `${"#".repeat(heading.level)} ${heading.text}`).join("\n")
      : "- No headings found",
    "",
    "## Internal links",
    internalLinks.length > 0
      ? internalLinks.slice(0, 20).map((link) => `- [${link.text}](${link.href})`).join("\n")
      : "- None extracted",
    "",
    "## External links",
    externalLinks.length > 0
      ? externalLinks.slice(0, 12).map((link) => `- [${link.text}](${link.href})`).join("\n")
      : "- None extracted",
    "",
    "## Images",
    inspection.images.length > 0
      ? inspection.images.slice(0, 16).map((image) => `- ${image.alt || "untitled"} — ${image.src}`).join("\n")
      : "- No images extracted",
    "",
    "## Factory notes",
    "- Keep the current contact routes unless the brief says otherwise.",
    "- Do not invent client-facing claims.",
    "- Match spacing, type, and color before adding new aesthetic.",
    `- Hand off questions to ${CONTACT_EMAIL}.`,
    "",
  ].join("\n");
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
