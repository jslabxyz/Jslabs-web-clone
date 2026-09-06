import { NextResponse } from "next/server";

import { buildCloneBrief } from "@/lib/brief";
import { inspectPublicPage, PublicUrlError } from "@/lib/inspect";
import type { InspectResponse } from "@/lib/types";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request): Promise<NextResponse<InspectResponse>> {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!url.trim()) {
    return NextResponse.json(
      { ok: false, error: "Pass a url query parameter, or POST JSON { \"url\": \"https://...\" }." },
      { status: 400, headers: NO_STORE },
    );
  }
  return inspectFromUrl(url);
}

export async function POST(request: Request): Promise<NextResponse<InspectResponse>> {
  let url = "";

  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "url" in body && typeof body.url === "string") {
      url = body.url;
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Send a JSON body with a url field." },
      { status: 400, headers: NO_STORE },
    );
  }

  return inspectFromUrl(url);
}

async function inspectFromUrl(url: string): Promise<NextResponse<InspectResponse>> {
  try {
    const inspection = await inspectPublicPage(url);
    return NextResponse.json(
      {
        ok: true,
        inspection,
        briefMarkdown: buildCloneBrief(inspection),
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    const message =
      error instanceof PublicUrlError
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "The page took too long to respond."
          : "The page could not be read. Try a public URL, or send it to Jason.";

    return NextResponse.json({ ok: false, error: message }, { status: 400, headers: NO_STORE });
  }
}
