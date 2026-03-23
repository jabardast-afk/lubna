import type { UserSession } from "@lubna/shared/types";

interface ProfilePanelProps {
  session: UserSession | null | undefined;
  onLogout: () => Promise<void>;
}

export default function ProfilePanel({ session, onLogout }: ProfilePanelProps) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-display text-2xl">You + Lubna</h3>
      {session ? (
        <div className="mt-3 space-y-3 text-sm text-text-secondary">
          <div className="rounded-2xl border border-accent-rose/15 bg-bg-elevated/70 px-3 py-3">
            <p className="font-medium text-text-primary">{session.name}</p>
            <p className="mt-1 text-xs text-text-muted">{session.email}</p>
          </div>
          <button
            className="w-full rounded-full border border-accent-rose/35 px-4 py-2 text-text-primary transition hover:bg-accent-rose/15"
            onClick={onLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">Signed out</p>
      )}
    </div>
  );
}
