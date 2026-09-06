import { assertPublicHttpUrl, PublicUrlError } from "@/lib/url-guard";
import {
  detectHosting,
  detectTech,
  extractAttribute,
  extractCanonical,
  extractColors,
  extractFavicon,
  extractFonts,
  extractHeadings,
  extractImages,
  extractInlineCss,
  extractLinks,
  extractMeta,
  extractStyleHrefs,
  extractTitle,
  MAX_ITEMS,
  resolveAssetUrl,
  stripTags,
} from "@/lib/html";
import type { SiteInspection } from "@/lib/types";

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; JSLabsClone/1.0; +https://jslabs.xyz) AppleWebKit/537.36 Chrome/126.0.0.0";

export async function inspectPublicPage(rawUrl: string): Promise<SiteInspection> {
  const startUrl = await assertPublicHttpUrl(rawUrl);
  const fetched = await fetchPublicHtml(startUrl);

  const html = fetched.body;
  const pageUrl = fetched.finalUrl;
  const title =
    extractTitle(html) ||
    extractMeta(html, "og:title", "property") ||
    pageUrl.hostname;
  const description =
    extractMeta(html, "description") ||
    extractMeta(html, "og:description", "property") ||
    "";
  const generator = extractMeta(html, "generator");
  const headings = extractHeadings(html);
  const cssHrefs = extractStyleHrefs(html, pageUrl);
  const extraCss = await fetchSameOriginCss(cssHrefs, pageUrl);
  const cssBlob = `${extractInlineCss(html)}\n${extraCss}`;

  const sections = headings
    .filter((heading) => heading.level === 2)
    .map((heading) => heading.text)
    .slice(0, MAX_ITEMS.sections);

  return {
    sourceUrl: startUrl.toString(),
    finalUrl: pageUrl.toString(),
    fetchedAt: new Date().toISOString(),
    title,
    description,
    canonical: extractCanonical(html, pageUrl),
    language: extractAttribute(html, "html", "lang"),
    favicon: extractFavicon(html, pageUrl),
    ogImage: resolveAssetUrl(extractMeta(html, "og:image", "property"), pageUrl),
    themeColor: extractMeta(html, "theme-color"),
    generator,
    headings,
    links: extractLinks(html, pageUrl),
    images: extractImages(html, pageUrl),
    colors: extractColors(cssBlob, html, extractMeta(html, "theme-color") ?? ""),
    fonts: extractFonts(cssBlob, html),
    tech: uniqueTech([
      ...detectTech(html, pageUrl, generator),
      ...detectHosting(fetched.headers),
    ]),
    sections: sections.length > 0 ? sections : headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
    wordCount: countWords(stripTags(html)),
    response: {
      status: fetched.status,
      contentType: fetched.contentType,
      bytes: fetched.bytes,
      redirected: fetched.finalUrl.toString() !== startUrl.toString(),
    },
  };
}

async function fetchPublicHtml(startUrl: URL): Promise<{
  body: string;
  finalUrl: URL;
  status: number;
  contentType: string;
  bytes: number;
  headers: Array<[string, string]>;
}> {
  let current = startUrl;

  for (let hop = 0; hop < 5; hop += 1) {
    await assertPublicHttpUrl(current.toString());
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8",
        "User-Agent": USER_AGENT,
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new PublicUrlError("The page redirected without a destination.");
      }
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      throw new PublicUrlError(`The page responded with ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
      throw new PublicUrlError("That URL did not return an HTML page.");
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_BYTES) {
      throw new PublicUrlError("That page is too large to inspect in this desk.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      throw new PublicUrlError("That page is too large to inspect in this desk.");
    }

    return {
      body: buffer.toString("utf8"),
      finalUrl: new URL(response.url || current.toString()),
      status: response.status,
      contentType,
      bytes: buffer.byteLength,
      headers: [...response.headers.entries()],
    };
  }

  throw new PublicUrlError("Too many redirects.");
}

async function fetchSameOriginCss(hrefs: string[], pageUrl: URL): Promise<string> {
  const sameOrigin = hrefs.filter((href) => {
    try {
      return new URL(href).origin === pageUrl.origin;
    } catch {
      return false;
    }
  });

  const chunks = await Promise.all(
    sameOrigin.slice(0, 2).map(async (href) => {
      try {
        await assertPublicHttpUrl(href);
        const response = await fetch(href, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": USER_AGENT, Accept: "text/css,*/*;q=0.1" },
        });
        if (!response.ok) return "";
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength > 400_000) return buffer.subarray(0, 400_000).toString("utf8");
        return buffer.toString("utf8");
      } catch {
        return "";
      }
    }),
  );

  return chunks.join("\n");
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}

function uniqueTech(items: string[]): string[] {
  const seen = new Set<string>();
  const tech: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    tech.push(item);
  }
  return tech;
}

export { PublicUrlError };
