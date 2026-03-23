import { useEffect, useMemo, useRef, useState } from "react";
import type { UserSession } from "@lubna/shared/types";

interface ProfilePanelProps {
  session: UserSession | null | undefined;
  onLogout: () => Promise<void>;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePanel({ session, onLogout }: ProfilePanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const displayName = useMemo(() => session?.name ?? "Signed out", [session?.name]);

  return (
    <div ref={rootRef} className="sticky bottom-0 shrink-0">
      <div className="relative">
        {open && session && (
          <div className="absolute bottom-full left-0 right-0 mb-3 rounded-3xl border border-accent-rose/18 bg-bg-surface/95 p-4 shadow-[0_22px_50px_rgba(0,0,0,0.35)] backdrop-blur">
            <p className="text-sm font-semibold text-text-primary">{session.name}</p>
            <p className="mt-1 text-xs text-text-secondary">{session.email}</p>
            <button
              className="mt-4 w-full rounded-full border border-accent-rose/30 px-4 py-2 text-sm text-text-primary transition hover:bg-accent-rose/14"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 rounded-full border border-accent-rose/15 bg-bg-elevated/88 px-3 py-2 text-left transition hover:border-accent-rose/35"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/28 text-xs font-semibold text-text-primary">
            {initials(displayName)}
          </span>
          <span className="truncate text-sm text-text-primary">{displayName}</span>
        </button>
      </div>
    </div>
  );
}
