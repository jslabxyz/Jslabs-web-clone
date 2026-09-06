"use client";

import { ArrowUpRight, Copy, Download, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { CloneForm } from "@/components/clone-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/constants";
import { downloadText, inspectCurl } from "@/lib/export";
import { InspectClientError, inspectAndStore } from "@/lib/inspect-client";
import { deleteJob, getJobsServerSnapshot, getJobsSnapshot, JOBS_SSR_SNAPSHOT, parseJobs, subscribeJobs } from "@/lib/jobs-store";
import type { CloneJob } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "overview" | "tokens" | "structure" | "brief";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "tokens", label: "Tokens" },
  { id: "structure", label: "Structure" },
  { id: "brief", label: "Brief" },
];

export function JobWorkspace({ jobId }: { jobId: string }) {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribeJobs, getJobsSnapshot, getJobsServerSnapshot);
  const job = useMemo(
    () => parseJobs(raw).find((item) => item.id === jobId) ?? null,
    [jobId, raw],
  );
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState<"brief" | "curl" | "json" | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const mailto = useMemo(() => {
    if (!job) return CONTACT_EMAIL;
    const subject = encodeURIComponent(`Clone job: ${job.host}`);
    const body = encodeURIComponent(
      `Please review this clone brief for ${job.inspection.finalUrl}\n\n${job.inspection.title}\n${job.inspection.description}\n\nThe full brief is attached from the JS Labs Clone desk.`,
    );
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, [job]);

  if (raw === JOBS_SSR_SNAPSHOT) {
    return <p className="text-muted-foreground">Opening this job…</p>;
  }

  if (job === null) {
    return (
      <div className="max-w-xl">
        <p className="font-heading text-3xl font-light tracking-tight">This job is not on this browser.</p>
        <p className="mt-3 text-muted-foreground">
          Jobs stay in local storage on the machine that ran the inspect. Start a new one from the desk.
        </p>
        <div className="mt-8">
          <CloneForm compact />
        </div>
      </div>
    );
  }

  const { inspection } = job;

  return (
    <div>
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Job · {job.host}</p>
          <h1 className="mt-3 font-heading text-4xl font-light tracking-tight text-balance md:text-5xl">
            {inspection.title}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{inspection.description || "No meta description."}</p>
          <a
            href={inspection.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground"
          >
            {inspection.finalUrl}
            <ArrowUpRight className="size-4" />
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setPending(true);
              setRefreshError(null);
              void inspectAndStore(job.inspection.finalUrl, job.id)
                .catch((caught: unknown) => {
                  setRefreshError(
                    caught instanceof InspectClientError
                      ? caught.message
                      : "Could not re-inspect that page.",
                  );
                })
                .finally(() => setPending(false));
            }}
          >
            <RefreshCw className={pending ? "animate-spin" : undefined} />
            {pending ? "Reading…" : "Re-inspect"}
          </Button>
          <a href={mailto} className={buttonVariants({ className: "h-8 rounded-full px-3" })}>
            Hand off to Jason
          </a>
          <Button
            variant="outline"
            onClick={() => {
              deleteJob(job.id);
              router.push("/jobs");
            }}
          >
            <Trash2 />
            Remove
          </Button>
        </div>
      </div>
      {refreshError ? <p className="mt-3 text-sm text-destructive">{refreshError}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              tab === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "overview" ? (
          <Overview
            job={job}
            copiedCurl={copied === "curl"}
            onCopyCurl={async () => {
              const origin = window.location.origin;
              await navigator.clipboard.writeText(inspectCurl(origin, job.inspection.finalUrl));
              setCopied("curl");
              window.setTimeout(() => setCopied(null), 2000);
            }}
          />
        ) : null}
        {tab === "tokens" ? <Tokens job={job} /> : null}
        {tab === "structure" ? <Structure job={job} /> : null}
        {tab === "brief" ? (
          <Brief
            job={job}
            copied={copied}
            onCopyBrief={async () => {
              await navigator.clipboard.writeText(job.briefMarkdown);
              setCopied("brief");
              window.setTimeout(() => setCopied(null), 2000);
            }}
            onCopyJson={async () => {
              await navigator.clipboard.writeText(
                JSON.stringify({ inspection: job.inspection, briefMarkdown: job.briefMarkdown }, null, 2),
              );
              setCopied("json");
              window.setTimeout(() => setCopied(null), 2000);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function Overview({
  job,
  copiedCurl,
  onCopyCurl,
}: {
  job: CloneJob;
  copiedCurl: boolean;
  onCopyCurl: () => Promise<void>;
}) {
  const { inspection } = job;
  const stats = [
    ["Status", String(inspection.response.status)],
    ["Words", String(inspection.wordCount)],
    ["Headings", String(inspection.headings.length)],
    ["Links", String(inspection.links.length)],
    ["Images", String(inspection.images.length)],
    ["Redirect", inspection.response.redirected ? "Yes" : "No"],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border p-5">
          <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Detected stack</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {inspection.tech.length > 0 ? (
              inspection.tech.map((item) => (
                <span key={item} className="rounded-full border border-border px-3 py-1 text-sm">
                  {item}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Not enough public signals to name a stack.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-border p-5">
          <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Topology</h2>
          <ol className="mt-4 space-y-2">
            {inspection.sections.length > 0 ? (
              inspection.sections.map((section, index) => (
                <li key={section} className="flex gap-3 text-sm">
                  <span className="w-8 font-mono text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span>{section}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No clear section headings.</li>
            )}
          </ol>
        </section>
      </div>
      <aside className="space-y-6">
        {inspection.ogImage ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={inspection.ogImage} alt="" className="aspect-[1.9] w-full object-cover" />
          </div>
        ) : null}
        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-5">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-1 text-lg">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Inspected {new Date(inspection.fetchedAt).toLocaleString()} from this desk. Review before any build starts.
        </p>
        <Button variant="outline" size="sm" onClick={() => void onCopyCurl()}>
          <Copy />
          {copiedCurl ? "Copied curl" : "Copy inspect curl"}
        </Button>
        <Link href="/how-it-works#inspect-service" className="block text-sm underline-offset-4 hover:underline">
          See how the factory uses this brief
        </Link>
      </aside>
    </div>
  );
}

function Tokens({ job }: { job: CloneJob }) {
  const { colors, fonts, themeColor } = job.inspection;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Colors</h2>
        {themeColor ? <p className="mt-2 text-sm text-muted-foreground">Theme color {themeColor}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {colors.length > 0 ? (
            colors.map((color) => (
              <div key={color} className="overflow-hidden rounded-xl border border-border">
                <div className="h-16" style={{ backgroundColor: color }} />
                <p className="px-3 py-2 font-mono text-xs">{color}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No distinctive colors extracted.</p>
          )}
        </div>
      </section>
      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Fonts</h2>
        <ul className="mt-4 space-y-3">
          {fonts.length > 0 ? (
            fonts.map((font) => (
              <li key={font} className="rounded-xl border border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">{font}</p>
                <p className="mt-1 text-2xl font-light tracking-tight" style={{ fontFamily: `${font}, sans-serif` }}>
                  Digital operations
                </p>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No custom fonts extracted.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Structure({ job }: { job: CloneJob }) {
  const { headings, links, images } = job.inspection;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Headings</h2>
        <ul className="mt-4 space-y-2">
          {headings.length > 0 ? (
            headings.map((heading) => (
              <li key={`${heading.level}-${heading.text}`} className="text-sm" style={{ paddingLeft: (heading.level - 1) * 12 }}>
                <span className="mr-2 font-mono text-xs text-muted-foreground">H{heading.level}</span>
                {heading.text}
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No headings in the public HTML.</li>
          )}
        </ul>
      </section>
      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Links</h2>
        <ul className="mt-4 space-y-2">
          {links.slice(0, 18).map((link) => (
            <li key={`${link.href}-${link.text}`} className="truncate text-sm">
              <span className="mr-2 font-mono text-xs text-muted-foreground">{link.internal ? "IN" : "EX"}</span>
              <a href={link.href} target="_blank" rel="noreferrer" className="hover:underline">
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Images</h2>
        <ul className="mt-4 space-y-3">
          {images.length > 0 ? (
            images.slice(0, 8).map((image) => (
              <li key={image.src} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" className="size-12 rounded-lg border border-border object-cover" />
                <p className="min-w-0 truncate text-sm text-muted-foreground">{image.alt || image.src}</p>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No images extracted from the public HTML.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Brief({
  job,
  copied,
  onCopyBrief,
  onCopyJson,
}: {
  job: CloneJob;
  copied: "brief" | "curl" | "json" | null;
  onCopyBrief: () => Promise<void>;
  onCopyJson: () => Promise<void>;
}) {
  const slug = job.host.replaceAll(".", "-");
  const json = JSON.stringify({ inspection: job.inspection, briefMarkdown: job.briefMarkdown }, null, 2);

  return (
    <section className="rounded-2xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="text-sm tracking-[0.14em] text-muted-foreground uppercase">Factory brief</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void onCopyBrief()}>
            <Copy />
            {copied === "brief" ? "Copied" : "Copy markdown"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(`${slug}-clone-brief.md`, job.briefMarkdown, "text/markdown;charset=utf-8")}
          >
            <Download />
            Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={() => void onCopyJson()}>
            <Copy />
            {copied === "json" ? "Copied JSON" : "Copy JSON"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(`${slug}-inspection.json`, json, "application/json;charset=utf-8")}
          >
            <Download />
            JSON
          </Button>
        </div>
      </div>
      <pre className="max-h-[640px] overflow-auto p-5 font-mono text-xs leading-6 whitespace-pre-wrap">{job.briefMarkdown}</pre>
    </section>
  );
}
