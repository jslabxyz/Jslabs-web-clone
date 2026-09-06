"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-background/80 px-1.5 text-muted-foreground"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        document.documentElement.classList.toggle("dark", next === "dark");
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      }}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full",
          theme === "light" && "bg-foreground text-background",
        )}
      >
        <Sun className="size-3.5" />
      </span>
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full",
          theme === "dark" && "bg-foreground text-background",
        )}
      >
        <Moon className="size-3.5" />
      </span>
    </button>
  );
}
