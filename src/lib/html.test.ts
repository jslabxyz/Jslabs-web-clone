import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractColors, extractFonts, extractImages } from "./html.ts";

const page = new URL("https://jslabs.xyz/");

describe("extractColors", () => {
  it("keeps opaque brand colors and drops transparent Tailwind leftovers", () => {
    const colors = extractColors(
      "color:#151614;background:#F5F4F0;--tw-gradient-from:#0000;box-shadow:0 0 #0000001a;outline:#000c;accent:#4eb9ad;overlay:#0009",
    );
    assert.deepEqual(colors, ["#151614", "#f5f4f0", "#4eb9ad"]);
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
