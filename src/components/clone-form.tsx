"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EXAMPLE_URL } from "@/lib/constants";
import { createJobId, upsertJob } from "@/lib/jobs-store";
import type { InspectResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type CloneFormProps = {
  compact?: boolean;
  initialUrl?: string;
};

export function CloneForm({ compact = false, initialUrl = "" }: CloneFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function inspect(target: string) {
    setPending(true);
    setError(null);
    setUrl(target);

    try {
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const payload = (await response.json()) as InspectResponse;
      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      const host = new URL(payload.inspection.finalUrl).host;
      const job = {
        id: createJobId(),
        createdAt: new Date().toISOString(),
        sourceUrl: payload.inspection.sourceUrl,
        host,
        inspection: payload.inspection,
        briefMarkdown: payload.briefMarkdown,
      };
      upsertJob(job);
      router.push(`/jobs/${job.id}`);
    } catch {
      setError("The desk could not reach that page. Check the URL and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        void inspect(url);
      }}
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-border bg-background p-2 shadow-[0_10px_40px_rgba(17,17,17,0.04)] sm:flex-row sm:items-center",
          compact && "shadow-none",
        )}
      >
        <label className="sr-only" htmlFor="clone-url">
          Website URL
        </label>
        <input
          id="clone-url"
          name="url"
          type="url"
          required
          inputMode="url"
          placeholder="https://example.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="h-12 flex-1 rounded-xl bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-12 rounded-full px-5 text-sm tracking-[0.04em]"
        >
          {pending ? "Reading the live page…" : "Inspect page"}
          {!pending ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <button
          type="button"
          className="underline-offset-4 hover:text-foreground hover:underline"
          disabled={pending}
          onClick={() => void inspect(EXAMPLE_URL)}
        >
          Try with jslabs.xyz
        </button>
        <span>Public pages only. Nothing is published from this desk.</span>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
