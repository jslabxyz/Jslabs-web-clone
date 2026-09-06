import Link from "next/link";

import { CONTACT_EMAIL, CONTACT_HREF, STUDIO_SITE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-[min(1120px,calc(100%-1.5rem))] flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium">JS Labs Clone</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A public-page inspection desk. You keep the review. Jason stays responsible for what gets built.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Desk
          </Link>
          <Link href="/jobs" className="hover:text-foreground">
            Jobs
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <a href={STUDIO_SITE} className="hover:text-foreground">
            jslabs.xyz
          </a>
          <a href={CONTACT_HREF} className="hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
      <div className="mx-auto w-[min(1120px,calc(100%-1.5rem))] pb-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} JS Labs. All rights reserved.
      </div>
    </footer>
  );
}
