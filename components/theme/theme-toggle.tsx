"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const options = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const CurrentIcon = options.find((o) => o.value === theme)!.icon;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground"
        title={`Theme: ${theme}`}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-dim p-0.5">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
            title={option.label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
