import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectHosting, detectTech, extractColors, extractFonts, extractImages } from "./html.ts";
import { inspectPageKey, normalizeInspectInput } from "./urls.ts";

const page = new URL("https://jslabs.xyz/");

describe("extractColors", () => {
  it("keeps opaque brand colors and drops transparent Tailwind leftovers", () => {
    const colors = extractColors(
      "color:#151614;background:#F5F4F0;--tw-gradient-from:#0000;box-shadow:0 0 #0000001a;outline:#000c;accent:#4eb9ad;overlay:#0009",
    );
    assert.deepEqual(colors, ["#4eb9ad", "#f5f4f0", "#151614"]);
  });

  it("normalizes rgb values to hex and skips low-alpha rgba", () => {
    const colors = extractColors("color:rgb(17, 17, 17);background:rgba(245, 244, 240, 0.1);");
    assert.deepEqual(colors, ["#111111"]);
  });
});

describe("extractFonts", () => {
  it("keeps named faces and drops Fallback and var() stacks", () => {
    const fonts = extractFonts(
      'font-family:Geist;font-family:Geist Fallback;font-family:IBM Plex Sans,sans-serif;font-family:var(--default-font-family, system-ui);font-family:"Courier Prime"',
    );
    assert.deepEqual(fonts, ["Geist", "IBM Plex Sans", "Courier Prime"]);
  });
});

describe("extractImages", () => {
  it("reads img, og:image, and skips font files in CSS url()", () => {
    const html = `
      <meta property="og:image" content="/opengraph-image?x">
      <meta property="og:image:alt" content="Cover">
      <img src="/photos/studio.jpg" alt="Studio">
      <style>@font-face{src:url(/fonts/geist.woff2)} .hero{background:url("/photos/hero.webp")}</style>
    `;
    const images = extractImages(html, page);
    assert.deepEqual(
      images.map((image) => image.src),
      [
        "https://jslabs.xyz/photos/studio.jpg",
        "https://jslabs.xyz/opengraph-image?x",
        "https://jslabs.xyz/photos/hero.webp",
      ],
    );
    assert.equal(images[0]?.alt, "Studio");
    assert.equal(images[1]?.alt, "Cover");
  });
});

describe("extractFonts from font files", () => {
  it("reads named faces from woff2 preloads and skips hashed filenames", () => {
    const fonts = extractFonts(`
      <link rel="preload" href="https://cdn.example.com/media/Sohne.cb178166.woff2" as="font">
      <link rel="preload" href="/media/SourceCodePro-Medium.f5ba3e6a.woff2" as="font">
      <link rel="preload" href="/media/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2" as="font">
    `);
    assert.deepEqual(fonts, ["Sohne", "Source Code Pro"]);
  });
});

describe("detectTech", () => {
  const page = new URL("https://news.ycombinator.com/");

  it("does not treat a wordpress.com link as WordPress", () => {
    const tech = detectTech(
      '<a href="https://vermaden.wordpress.com/2026/09/06/post">story</a>',
      page,
      null,
    );
    assert.equal(tech.includes("WordPress"), false);
  });

  it("does not treat a /customers/shopify link as Shopify", () => {
    const tech = detectTech(
      '<a href="/customers/shopify">Shopify</a>',
      new URL("https://stripe.com/"),
      null,
    );
    assert.equal(tech.includes("Shopify"), false);
  });

  it("detects WordPress from wp-content assets", () => {
    const tech = detectTech(
      '<link rel="stylesheet" href="/wp-content/themes/theme/style.css">',
      new URL("https://example.com/"),
      null,
    );
    assert.equal(tech.includes("WordPress"), true);
  });
});

describe("detectHosting", () => {
  it("reads Vercel from response header names", () => {
    assert.deepEqual(detectHosting([["x-vercel-id", "sfo1::abc"], ["content-type", "text/html"]]), ["Vercel"]);
  });
});

describe("normalizeInspectInput", () => {
  it("adds https to bare hosts", () => {
    assert.equal(normalizeInspectInput("jslabs.xyz"), "https://jslabs.xyz");
    assert.equal(normalizeInspectInput("example.com/path"), "https://example.com/path");
    assert.equal(normalizeInspectInput("https://jslabs.xyz"), "https://jslabs.xyz");
    assert.equal(normalizeInspectInput("//cdn.example.com/x"), "https://cdn.example.com/x");
  });
});

describe("inspectPageKey", () => {
  it("collapses trailing slashes so re-inspects reuse a job", () => {
    assert.equal(inspectPageKey("https://jslabs.xyz/"), inspectPageKey("https://jslabs.xyz"));
    assert.equal(inspectPageKey("https://JSLABS.XYZ/app/"), "jslabs.xyz/app");
  });
});
