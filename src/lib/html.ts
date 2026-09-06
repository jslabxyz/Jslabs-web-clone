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
  const images: Array<{ src: string; alt: string }> = [];
  const seen = new Set<string>();

  const add = (raw: string | null, alt: string, requireImagePath = false) => {
    if (images.length >= MAX_ITEMS.images) return;
    const candidate = firstSrcsetUrl(raw);
    if (!candidate || candidate.startsWith("data:")) return;
    const src = resolveAssetUrl(candidate, pageUrl);
    if (!src || seen.has(src)) return;
    if (requireImagePath && !isRasterOrVectorImage(src)) return;
    seen.add(src);
    images.push({ src, alt });
  };

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    add(
      matchAttr(tag, "src") ?? matchAttr(tag, "data-src") ?? firstSrcsetUrl(matchAttr(tag, "srcset")),
      matchAttr(tag, "alt") ?? "",
    );
  }

  for (const tag of html.match(/<source\b[^>]*>/gi) ?? []) {
    add(firstSrcsetUrl(matchAttr(tag, "srcset")) ?? matchAttr(tag, "src"), "");
  }

  add(extractMeta(html, "og:image", "property"), extractMeta(html, "og:image:alt", "property") ?? "Open Graph image");
  add(
    extractMeta(html, "twitter:image") ?? extractMeta(html, "twitter:image", "property"),
    extractMeta(html, "twitter:image:alt") ?? "Twitter image",
  );

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = matchAttr(tag, "rel")?.toLowerCase() ?? "";
    const as = matchAttr(tag, "as")?.toLowerCase() ?? "";
    if (as === "image" || rel.includes("image_src") || rel === "image_src") {
      add(matchAttr(tag, "href") ?? firstSrcsetUrl(matchAttr(tag, "imagesrcset")), "");
    }
  }

  for (const match of html.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
    add(match[2] ?? null, "", true);
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
  const counts = new Map<string, number>();
  const hex = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
  const rgb = /rgba?\(\s*\d{1,3}\s*[,\s]\s*\d{1,3}\s*[,\s]\s*\d{1,3}(?:\s*[,/]\s*[\d.]+\s*)?\)/gi;

  const remember = (hexValue: string) => {
    counts.set(hexValue, (counts.get(hexValue) ?? 0) + 1);
  };

  for (const chunk of chunks) {
    for (const match of chunk.match(hex) ?? []) {
      const parsed = parseHexColor(match);
      if (!parsed || parsed.alpha < 0.85 || isNearWhiteOrBlack(parsed.hex)) continue;
      remember(parsed.hex);
    }
    for (const match of chunk.match(rgb) ?? []) {
      const parsed = parseRgbColor(match);
      if (!parsed || parsed.alpha < 0.85 || isNearWhiteOrBlack(parsed.hex)) continue;
      remember(parsed.hex);
    }
  }

  const ranked = [...counts.keys()].sort((a, b) => {
    const chromaDiff = chroma(b) - chroma(a);
    if (chromaDiff !== 0) return chromaDiff;
    const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  const unique: string[] = [];
  for (const color of ranked) {
    const nearIndex = unique.findIndex((kept) => !farEnoughFromKept(color, [kept]));
    if (nearIndex === -1) {
      if (unique.length >= MAX_ITEMS.colors) continue;
      unique.push(color);
      continue;
    }
    const existing = unique[nearIndex];
    if (existing && (counts.get(color) ?? 0) > (counts.get(existing) ?? 0)) {
      unique[nearIndex] = color;
    }
  }
  return unique;
}

export function extractFonts(...chunks: string[]): string[] {
  const found = new Set<string>();

  const remember = (name: string | undefined) => {
    const usable = usableFontName(name);
    if (usable) found.add(usable);
  };

  for (const chunk of chunks) {
    for (const match of chunk.match(/font-family\s*:\s*([^;}{]+)/gi) ?? []) {
      const value = match.replace(/font-family\s*:\s*/i, "");
      remember(value.split(",")[0]);
    }

    const google = chunk.match(/family=([^&"' ]+)/i)?.[1];
    if (google) {
      try {
        for (const family of decodeURIComponent(google).split("|")) {
          remember(family.split(":")[0]?.replace(/\+/g, " "));
        }
      } catch {
        remember(google.replace(/\+/g, " ").split(":")[0]);
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

function firstSrcsetUrl(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim().split(/\s+/)[0];
  return first || null;
}

function isRasterOrVectorImage(src: string): boolean {
  try {
    const url = new URL(src);
    const path = url.pathname.toLowerCase();
    if (/\.(woff2?|ttf|otf|eot)$/i.test(path)) return false;
    if (/\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i.test(path)) return true;
    if (path.includes("/_next/image") || path.includes("opengraph-image") || path.includes("twitter-image")) {
      return true;
    }
    return Boolean(url.searchParams.get("url"));
  } catch {
    return false;
  }
}

function usableFontName(value: string | undefined): string | null {
  if (!value) return null;
  const name = collapseWhitespace(value.replace(/['"]/g, "").replace(/var\([^)]+\)/g, "")).trim();
  if (!name || name.length > 48) return null;
  if (
    /fallback|var\(|inherit|initial|unset|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-|apple-system|blinkmacsystemfont|emoji|math|fangsong/i.test(
      name,
    )
  ) {
    return null;
  }
  if (!/^[a-z][a-z0-9 \-]*$/i.test(name)) return null;
  return name;
}

function parseHexColor(value: string): { hex: string; alpha: number } | null {
  const raw = value.toLowerCase().replace("#", "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/.test(raw)) return null;

  if (raw.length === 3 || raw.length === 4) {
    const hex = `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
    const alpha = raw.length === 4 ? Number.parseInt(`${raw[3]}${raw[3]}`, 16) / 255 : 1;
    return { hex, alpha };
  }

  return {
    hex: `#${raw.slice(0, 6)}`,
    alpha: raw.length === 8 ? Number.parseInt(raw.slice(6), 16) / 255 : 1,
  };
}

function parseRgbColor(value: string): { hex: string; alpha: number } | null {
  const match = value.match(
    /rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})(?:\s*[,/]\s*([\d.]+)\s*)?\)/i,
  );
  if (!match) return null;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  if ([r, g, b].some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    return null;
  }
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (!Number.isFinite(alpha)) return null;
  return {
    hex: `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
    alpha,
  };
}

function hexChannels(color: string): [number, number, number] | null {
  const hex = color.startsWith("#") ? color.slice(1) : color;
  if (hex.length !== 6) return null;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if (![r, g, b].every((channel) => Number.isFinite(channel))) return null;
  return [r, g, b];
}

function chroma(color: string): number {
  const channels = hexChannels(color);
  if (!channels) return 0;
  return Math.max(...channels) - Math.min(...channels);
}

function farEnoughFromKept(color: string, kept: string[]): boolean {
  const candidate = hexChannels(color);
  if (!candidate) return false;
  return kept.every((other) => {
    const existing = hexChannels(other);
    if (!existing) return true;
    const distance =
      Math.abs(candidate[0] - existing[0]) +
      Math.abs(candidate[1] - existing[1]) +
      Math.abs(candidate[2] - existing[2]);
    return distance > 28;
  });
}

function isNearWhiteOrBlack(color: string): boolean {
  const channels = hexChannels(color);
  if (!channels) return false;
  const avg = (channels[0] + channels[1] + channels[2]) / 3;
  return avg > 248 || avg < 10;
}

export { MAX_ITEMS };
