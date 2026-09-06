import { NextResponse } from "next/server";

import { buildCloneBrief } from "@/lib/brief";
import { inspectPublicPage, PublicUrlError } from "@/lib/inspect";
import type { InspectResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse<InspectResponse>> {
  let url = "";

  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "url" in body && typeof body.url === "string") {
      url = body.url;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Send a JSON body with a url field." }, { status: 400 });
  }

  try {
    const inspection = await inspectPublicPage(url);
    return NextResponse.json({
      ok: true,
      inspection,
      briefMarkdown: buildCloneBrief(inspection),
    });
  } catch (error) {
    const message =
      error instanceof PublicUrlError
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "The page took too long to respond."
          : "The page could not be read. Try a public URL, or send it to Jason.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
