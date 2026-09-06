import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { STUDIO_SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How it works",
};

const PIPELINE = [
  {
    who: "You",
    title: "Set the brief",
    copy: "Paste the public page. Agree that this is the job: rebuild that URL as a Next.js app, matching what is already live.",
  },
  {
    who: "Clone desk",
    title: "Read the live page",
    copy: "The desk fetches HTML and same-origin CSS, then extracts headings, links, images, colors, fonts and stack signals.",
  },
  {
    who: "Build PM",
    title: "Turn it into a small job",
    copy: "The markdown brief is the handoff. It names topology, tokens and constraints so the factory does not invent claims.",
  },
  {
    who: "Cloud Developer",
    title: "Prepare the draft",
    copy: "A scoped clone is built from the brief in this Next.js codebase. Existing routes stay unless the brief says otherwise.",
  },
  {
    who: "You",
    title: "Review and decide",
    copy: "Nothing is published from the desk. Jason reviews merges and production releases.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Factory</p>
      <h1 className="mt-4 font-heading text-4xl font-light tracking-tight text-balance sm:text-5xl">
        One page in. A brief out. A person still decides.
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        JS Labs Clone is a desk and an HTTP service. It does not crawl private networks, store jobs on a server, or ship a finished site on its own.
      </p>
      <ol className="mt-12 space-y-8">
        {PIPELINE.map((step, index) => (
          <li key={step.title} className="grid gap-2 border-t border-border pt-6 sm:grid-cols-[7rem_1fr]">
            <p className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{step.who}</p>
              <h2 className="mt-1 font-heading text-2xl font-light tracking-tight">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</p>
            </div>
          </li>
        ))}
      </ol>
      <section id="inspect-service" className="mt-16 scroll-mt-28 border-t border-border pt-10">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Service</p>
        <h2 className="mt-3 font-heading text-3xl font-light tracking-tight">Call inspect from another tool</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The desk is a UI over one route. Agents, scripts, and other JS Labs tools can inspect a public page without opening a browser. Jobs are still only saved if the client stores them.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-border bg-secondary p-5 font-mono text-xs leading-6">
          {`curl -sS -X POST "$ORIGIN/api/inspect" \\
  -H "content-type: application/json" \\
  -d '{"url":"https://jslabs.xyz"}'

curl -sS "$ORIGIN/api/inspect?url=https://jslabs.xyz"`}
        </pre>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          JSON body or query: a public <code className="font-mono text-foreground">url</code>. Response:{" "}
          <code className="font-mono text-foreground">inspection</code> plus{" "}
          <code className="font-mono text-foreground">briefMarkdown</code>. Private hosts, credentials, and non-HTML responses are rejected.
        </p>
      </section>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants({ className: "h-10 rounded-full px-4" })}>
          Open the desk
        </Link>
        <a href={STUDIO_SITE} className={buttonVariants({ variant: "outline", className: "h-10 rounded-full px-4" })}>
          JS Labs studio
        </a>
      </div>
    </div>
  );
}
