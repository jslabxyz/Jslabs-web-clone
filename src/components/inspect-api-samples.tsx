"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { EXAMPLE_URL } from "@/lib/constants";
import { inspectCurl } from "@/lib/export";

function subscribe(): () => void {
  return () => undefined;
}

function getOrigin(): string {
  return window.location.origin;
}

function getServerOrigin(): string {
  return "http://localhost:3000";
}

export function InspectApiSamples() {
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const [copied, setCopied] = useState(false);
  const sample = inspectCurl(origin, EXAMPLE_URL);

  return (
    <div>
      <pre className="mt-6 overflow-x-auto rounded-2xl border border-border bg-secondary p-5 font-mono text-xs leading-6">
        {`${sample}

curl -sS "${origin}/api/inspect?url=${EXAMPLE_URL}"`}
      </pre>
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(sample);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied curl" : "Copy POST curl"}
        </Button>
      </div>
    </div>
  );
}
