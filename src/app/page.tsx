import { CloneForm } from "@/components/clone-form";

const STEPS = [
  {
    n: "01",
    title: "Name the page.",
    copy: "Paste a public URL. The desk reads the live HTML, not a screenshot.",
  },
  {
    n: "02",
    title: "Inspect what is already there.",
    copy: "Tokens, headings, links, images and stack signals are extracted into a job.",
  },
  {
    n: "03",
    title: "Leave with a brief.",
    copy: "Review it here, download the markdown, or hand it to Jason before any build starts.",
  },
] as const;

export default function Home() {
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">JS Labs · Clone desk</p>
      <h1 className="mt-5 max-w-4xl font-heading text-4xl font-light tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
        Inspect a live page. Leave with a factory brief.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        A service for one named job: reverse-engineer a public website into structure, tokens and copy the JS Labs factory can build from. You keep the review.
      </p>
      <div className="mt-10 max-w-3xl">
        <CloneForm />
      </div>
      <ol className="mt-20 grid gap-8 border-t border-border pt-12 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n}>
            <p className="font-mono text-sm text-muted-foreground">{step.n}</p>
            <h2 className="mt-3 font-heading text-2xl font-light tracking-tight">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
