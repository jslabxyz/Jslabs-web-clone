import { JOBS_STORAGE_KEY } from "@/lib/constants";
import type { CloneJob } from "@/lib/types";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readJobs(): CloneJob[] {
  if (!canUseStorage()) return [];
  return parseJobs(getJobsSnapshot());
}

export function writeJobs(jobs: CloneJob[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event("jslabs-clone-jobs"));
}

export function upsertJob(job: CloneJob): CloneJob[] {
  const next = [job, ...readJobs().filter((item) => item.id !== job.id)];
  writeJobs(next);
  return next;
}

export function getJob(id: string): CloneJob | null {
  return readJobs().find((job) => job.id === id) ?? null;
}

export function deleteJob(id: string): CloneJob[] {
  const next = readJobs().filter((job) => job.id !== id);
  writeJobs(next);
  return next;
}

export function createJobId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `clone_${stamp}_${rand}`;
}

export function subscribeJobs(onStoreChange: () => void): () => void {
  window.addEventListener("jslabs-clone-jobs", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("jslabs-clone-jobs", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getJobsSnapshot(): string {
  return window.localStorage.getItem(JOBS_STORAGE_KEY) ?? "[]";
}

export function getJobsServerSnapshot(): string {
  return "[]";
}

export function parseJobs(raw: string): CloneJob[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCloneJob);
  } catch {
    return [];
  }
}

function isCloneJob(value: unknown): value is CloneJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<CloneJob>;
  return (
    typeof job.id === "string" &&
    typeof job.createdAt === "string" &&
    typeof job.sourceUrl === "string" &&
    typeof job.host === "string" &&
    typeof job.briefMarkdown === "string" &&
    typeof job.inspection === "object" &&
    job.inspection !== null
  );
}
