"use client";

import { createJobId, readJobs, upsertJob } from "@/lib/jobs-store";
import type { CloneJob, InspectResponse } from "@/lib/types";
import { inspectPageKey } from "@/lib/urls";

export class InspectClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectClientError";
  }
}

export async function inspectAndStore(url: string, existingId?: string): Promise<CloneJob> {
  const response = await fetch("/api/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const payload = (await response.json()) as InspectResponse;
  if (!payload.ok) {
    throw new InspectClientError(payload.error);
  }

  const host = new URL(payload.inspection.finalUrl).host;
  const key = inspectPageKey(payload.inspection.finalUrl);
  const existing =
    (existingId ? readJobs().find((job) => job.id === existingId) : undefined) ??
    readJobs().find((job) => inspectPageKey(job.inspection.finalUrl) === key);

  const job: CloneJob = {
    id: existing?.id ?? createJobId(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    sourceUrl: payload.inspection.sourceUrl,
    host,
    inspection: payload.inspection,
    briefMarkdown: payload.briefMarkdown,
  };
  upsertJob(job);
  return job;
}
