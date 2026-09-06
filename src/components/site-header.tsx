import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { STUDIO_SITE } from "@/lib/constants";

const NAV = [
  { href: "/", label: "Desk" },
  { href: "/jobs", label: "Jobs" },
  { href: "/how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-4 z-40 mx-auto w-[min(1120px,calc(100%-1.5rem))]">
      <nav
        aria-label="Main"
        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-[0_8px_30px_rgba(17,17,17,0.04)] backdrop-blur md:px-6"
      >
        <Link href="/" className="shrink-0 text-sm font-medium tracking-tight text-foreground">
          JS Labs
        </Link>
        <div className="hidden items-center gap-5 text-sm text-foreground/80 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <a href={STUDIO_SITE} className="transition-colors hover:text-foreground">
            Studio
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/jobs"
            className="hidden rounded-full border border-foreground/20 px-3 py-1.5 text-[13px] tracking-[0.08em] text-foreground/80 md:inline-flex"
          >
            Open jobs
          </Link>
          <ThemeToggle />
        </div>
      </nav>
      <div className="mt-2 flex items-center justify-center gap-4 text-sm text-foreground/80 md:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
