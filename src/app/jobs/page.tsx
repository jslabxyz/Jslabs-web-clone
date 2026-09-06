import type { Metadata } from "next";

import { JobList } from "@/components/job-list";

export const metadata: Metadata = {
  title: "Jobs",
};

export default function JobsPage() {
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Saved on this browser</p>
      <h1 className="mt-4 font-heading text-4xl font-light tracking-tight">Jobs</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Each inspect becomes a job you can reopen, export, or hand to Jason. Jobs are stored locally, not in a shared database.
      </p>
      <div className="mt-10">
        <JobList />
      </div>
    </div>
  );
}
