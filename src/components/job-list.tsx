"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { CloneForm } from "@/components/clone-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  deleteJob,
  getJobsServerSnapshot,
  getJobsSnapshot,
  JOBS_SSR_SNAPSHOT,
  parseJobs,
  subscribeJobs,
} from "@/lib/jobs-store";

export function JobList() {
  const raw = useSyncExternalStore(subscribeJobs, getJobsSnapshot, getJobsServerSnapshot);
  const jobs = useMemo(() => parseJobs(raw), [raw]);

  if (raw === JOBS_SSR_SNAPSHOT) {
    return <p className="text-muted-foreground">Reading jobs on this browser…</p>;
  }

  if (jobs.length === 0) {
    return (
      <div className="max-w-2xl">
        <p className="text-muted-foreground">No jobs on this browser yet. Inspect a public page to create one.</p>
        <div className="mt-8">
          <CloneForm compact />
        </div>
      </div>
    );
  }

  return (
    <ul className="grid gap-4">
      {jobs.map((job) => (
        <li key={job.id} className="flex flex-col gap-4 rounded-2xl border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{job.host}</p>
            <p className="mt-1 truncate text-lg">{job.inspection.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(job.createdAt).toLocaleString()} · {job.inspection.tech[0] ?? "stack unknown"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/jobs/${job.id}`} className={buttonVariants({ className: "h-8 rounded-full px-3" })}>
              Open
              <ArrowRight data-icon="inline-end" />
            </Link>
            <Button variant="outline" onClick={() => deleteJob(job.id)}>
              <Trash2 />
              Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
