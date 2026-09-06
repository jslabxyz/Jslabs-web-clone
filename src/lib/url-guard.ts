import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
]);

export class PublicUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicUrlError";
  }
}

export function isPrivateIp(ip: string): boolean {
  const value = ip.trim().toLowerCase();
  if (!value) return true;

  if (value.startsWith("::ffff:")) {
    return isPrivateIp(value.slice(7));
  }

  if (value.includes(":")) {
    if (value === "::1" || value === "::") return true;
    return (
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe8") ||
      value.startsWith("fe9") ||
      value.startsWith("fea") ||
      value.startsWith("feb")
    );
  }

  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === undefined || b === undefined) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PublicUrlError("Paste a public page URL to inspect.");
  }
  if (trimmed.length > 2048) {
    throw new PublicUrlError("That URL is too long to inspect.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new PublicUrlError("Enter a full URL, including https://");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PublicUrlError("Only http and https pages can be inspected.");
  }
  if (url.username || url.password) {
    throw new PublicUrlError("URLs with credentials are not accepted.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname) {
    throw new PublicUrlError("That URL is missing a host.");
  }
  if (
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new PublicUrlError("Local and internal hosts are blocked.");
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new PublicUrlError("Private network addresses are blocked.");
    }
    return url;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new PublicUrlError("That host could not be resolved.");
  }

  if (records.length === 0) {
    throw new PublicUrlError("That host could not be resolved.");
  }
  if (records.some((record) => isPrivateIp(record.address))) {
    throw new PublicUrlError("That host resolves to a private address.");
  }

  return url;
}
