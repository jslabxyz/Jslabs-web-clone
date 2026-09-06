const MAX_ITEMS = {
  headings: 40,
  links: 40,
  images: 24,
  colors: 16,
  fonts: 10,
  sections: 16,
} as const;

export function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return Number.isFinite(point) ? String.fromCodePoint(point) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const point = Number.parseInt(code, 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : "";
    });
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
}

export function stripTags(html: string): string {
  return collapseWhitespace(stripScriptsAndStyles(html).replace(/<[^>]+>/g, " "));
}

function matchAttr(tag: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  if (!match) return null;
  return decodeHtml(match[2] ?? match[3] ?? match[4] ?? "").trim() || null;
}

export function extractAttribute(html: string, tagName: string, attr: string): string | null {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, "i");
  const tag = html.match(pattern)?.[0];
  if (!tag) return null;
  return matchAttr(tag, attr);
}

export function extractMeta(
  html: string,
  key: string,
  attr: "name" | "property" = "name",
): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = matchAttr(tag, attr)?.toLowerCase();
    if (name === key.toLowerCase()) {
      return matchAttr(tag, "content");
    }
  }
  return null;
}

export function extractTitle(html: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return "";
  return collapseWhitespace(decodeHtml(match[1]));
}

export function extractHeadings(html: string): Array<{ level: 1 | 2 | 3; text: string }> {
  const body = stripScriptsAndStyles(html);
  const matches = [...body.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const headings: Array<{ level: 1 | 2 | 3; text: string }> = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const level = Number(match[1]) as 1 | 2 | 3;
    const text = collapseWhitespace(decodeHtml(match[2]?.replace(/<[^>]+>/g, " ") ?? ""));
    if (!text || seen.has(text)) continue;
    seen.add(text);
    headings.push({ level, text });
    if (headings.length >= MAX_ITEMS.headings) break;
  }

  return headings;
}

export function extractLinks(
  html: string,
  pageUrl: URL,
): Array<{ href: string; text: string; internal: boolean }> {
  const body = stripScriptsAndStyles(html);
  const matches = [...body.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
  const links: Array<{ href: string; text: string; internal: boolean }> = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const tag = match[0].slice(0, match[0].indexOf(">") + 1);
    const rawHref = matchAttr(tag, "href");
    if (!rawHref || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(rawHref, pageUrl);
    } catch {
      continue;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;

    const text = collapseWhitespace(decodeHtml(match[1]?.replace(/<[^>]+>/g, " ") ?? "")) || resolved.pathname;
    const key = `${resolved.origin}${resolved.pathname}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);

    links.push({
      href: resolved.toString(),
      text,
      internal: resolved.host === pageUrl.host,
    });
    if (links.length >= MAX_ITEMS.links) break;
  }

  return links;
}

export function extractImages(
  html: string,
  pageUrl: URL,
): Array<{ src: string; alt: string }> {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  const images: Array<{ src: string; alt: string }> = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const rawSrc = matchAttr(tag, "src") ?? matchAttr(tag, "data-src");
    if (!rawSrc || rawSrc.startsWith("data:")) continue;
    let resolved: URL;
    try {
      resolved = new URL(rawSrc, pageUrl);
    } catch {
      continue;
    }
    const src = resolved.toString();
    if (seen.has(src)) continue;
    seen.add(src);
    images.push({
      src,
      alt: matchAttr(tag, "alt") ?? "",
    });
    if (images.length >= MAX_ITEMS.images) break;
  }

  return images;
}

export function extractStyleHrefs(html: string, pageUrl: URL): string[] {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const hrefs: string[] = [];

  for (const tag of tags) {
    const rel = matchAttr(tag, "rel")?.toLowerCase() ?? "";
    if (!rel.split(/\s+/).includes("stylesheet")) continue;
    const href = matchAttr(tag, "href");
    if (!href) continue;
    try {
      const resolved = new URL(href, pageUrl);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") {
        hrefs.push(resolved.toString());
      }
    } catch {
      continue;
    }
    if (hrefs.length >= 3) break;
  }

  return hrefs;
}

export function extractInlineCss(html: string): string {
  const blocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  return blocks.map((block) => block[1] ?? "").join("\n");
}

export function extractColors(...chunks: string[]): string[] {
  const found = new Set<string>();
  const hex = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
  const rgb = /rgba?\(\s*\d{1,3}\s*[,\s]\s*\d{1,3}\s*[,\s]\s*\d{1,3}(?:\s*[,/]\s*[\d.]+\s*)?\)/gi;

  for (const chunk of chunks) {
    for (const match of chunk.match(hex) ?? []) {
      found.add(normalizeHex(match));
    }
    for (const match of chunk.match(rgb) ?? []) {
      found.add(collapseWhitespace(match.toLowerCase()));
    }
  }

  return [...found]
    .filter((color) => !isNearWhiteOrBlack(color))
    .slice(0, MAX_ITEMS.colors);
}

export function extractFonts(...chunks: string[]): string[] {
  const found = new Set<string>();

  for (const chunk of chunks) {
    for (const match of chunk.match(/font-family\s*:\s*([^;}{]+)/gi) ?? []) {
      const value = match.replace(/font-family\s*:\s*/i, "");
      const first = value
        .split(",")[0]
        ?.replace(/['"]/g, "")
        .replace(/var\([^)]+\)/g, "")
        .trim();
      if (!first || /inherit|initial|serif|sans-serif|monospace|system-ui|ui-/i.test(first)) {
        continue;
      }
      found.add(first);
    }

    const google = chunk.match(/family=([^&"' ]+)/i)?.[1];
    if (google) {
      for (const family of decodeURIComponent(google).split("|")) {
        const name = family.split(":")[0]?.replace(/\+/g, " ").trim();
        if (name) found.add(name);
      }
    }
  }

  return [...found].slice(0, MAX_ITEMS.fonts);
}

export function detectTech(html: string, finalUrl: URL, generator: string | null): string[] {
  const haystack = `${html}\n${finalUrl.toString()}\n${generator ?? ""}`;
  const signals: Array<[string, RegExp]> = [
    ["Next.js", /__NEXT_DATA__|\/_next\//i],
    ["Nuxt", /__NUXT__|\/_nuxt\//i],
    ["SvelteKit", /sveltekit|__sveltekit/i],
    ["Remix", /remix-run|__remixContext/i],
    ["Gatsby", /gatsby/i],
    ["WordPress", /wp-content|wordpress/i],
    ["Shopify", /cdn\.shopify|shopify/i],
    ["Webflow", /webflow|data-wf-page/i],
    ["React", /data-reactroot|react-root/i],
    ["Tailwind CSS", /class="[^"]*(?:flex|grid|text-|bg-|px-|py-)[^"]*"/i],
    ["Vercel", /vercel/i],
  ];

  const tech: string[] = [];
  for (const [label, pattern] of signals) {
    if (pattern.test(haystack) && !tech.includes(label)) {
      tech.push(label);
    }
  }
  return tech;
}

export function resolveAssetUrl(raw: string | null, pageUrl: URL): string | null {
  if (!raw) return null;
  try {
    const resolved = new URL(raw, pageUrl);
    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      return resolved.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function extractCanonical(html: string, pageUrl: URL): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = matchAttr(tag, "rel")?.toLowerCase() ?? "";
    if (rel !== "canonical") continue;
    const resolved = resolveAssetUrl(matchAttr(tag, "href"), pageUrl);
    if (resolved) return resolved;
  }
  return resolveAssetUrl(extractMeta(html, "og:url", "property"), pageUrl);
}

export function extractFavicon(html: string, pageUrl: URL): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = matchAttr(tag, "rel")?.toLowerCase() ?? "";
    if (!rel.includes("icon")) continue;
    const href = matchAttr(tag, "href");
    const resolved = resolveAssetUrl(href, pageUrl);
    if (resolved) return resolved;
  }
  return new URL("/favicon.ico", pageUrl).toString();
}

function normalizeHex(value: string): string {
  const hex = value.toLowerCase();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.slice(0, 7);
}

function isNearWhiteOrBlack(color: string): boolean {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length !== 6) return false;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const avg = (r + g + b) / 3;
    return avg > 245 || avg < 12;
  }
  return false;
}

export { MAX_ITEMS };
