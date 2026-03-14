"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Scale,
  ShieldAlert,
  Workflow,
  XCircle,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: "application" | "fraud" | "compliance" | "workflow" | "model" | "system";
  title: string;
  description: string;
  timestamp: string;
  severity: "info" | "success" | "warning" | "danger";
  href?: string;
};

const typeIcons = {
  application: BriefcaseBusiness,
  fraud: ShieldAlert,
  compliance: Scale,
  workflow: Workflow,
  model: Cpu,
  system: Info,
};

const severityStyles = {
  info: { dot: "bg-accent", icon: "text-accent", bg: "bg-accent-light" },
  success: { dot: "bg-success", icon: "text-success", bg: "bg-success-light" },
  warning: { dot: "bg-warning", icon: "text-warning", bg: "bg-warning-light" },
  danger: { dot: "bg-danger", icon: "text-danger", bg: "bg-danger-light" },
};

function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (isNaN(then)) return "";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [lastViewedAt, setLastViewedAt] = useState<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("aegis-notif-read");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setReadIds(new Set(parsed.ids ?? []));
        setLastViewedAt(parsed.viewedAt ?? 0);
      } catch { /* ignore */ }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (json.data) setNotifications(json.data);
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  function markAllRead() {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    const now = Date.now();
    setLastViewedAt(now);
    localStorage.setItem("aegis-notif-read", JSON.stringify({ ids: Array.from(allIds), viewedAt: now }));
  }

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("aegis-notif-read", JSON.stringify({ ids: Array.from(next), viewedAt: lastViewedAt }));
      return next;
    });
  }

  function handleNotificationClick(n: Notification) {
    markRead(n.id);
    if (n.href) {
      router.push(n.href);
      setOpen(false);
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-dim hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {unreadCount === 0 && loaded && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-success" />
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[var(--navbar-height)] z-50 mt-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-w-[calc(100vw-2rem)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="custom-scroll max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted/30" />
                <p className="mt-2 text-sm text-muted">No notifications</p>
              </div>
            )}

            {!loading && notifications.map((n) => {
              const Icon = typeIcons[n.type] ?? Info;
              const styles = severityStyles[n.severity];
              const isRead = readIds.has(n.id);

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-dim",
                    !isRead && "bg-accent-light/30",
                  )}
                >
                  <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", styles.bg)}>
                    <Icon className={cn("h-4 w-4", styles.icon)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-xs font-medium", isRead ? "text-muted" : "text-foreground")}>
                        {n.title}
                      </p>
                      {!isRead && <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", styles.dot)} />}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted line-clamp-2">{n.description}</p>
                    <p className="mt-1 text-[10px] text-muted/70">{timeAgo(n.timestamp)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-line px-4 py-2.5 text-center">
              <button
                type="button"
                onClick={() => { setOpen(false); router.push("/monitoring"); }}
                className="text-xs font-medium text-accent hover:underline"
              >
                View all activity
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
