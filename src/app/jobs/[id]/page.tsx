import type { Metadata } from "next";

import { JobWorkspace } from "@/components/job-workspace";

export const metadata: Metadata = {
  title: "Job",
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobWorkspace jobId={id} />;
}
