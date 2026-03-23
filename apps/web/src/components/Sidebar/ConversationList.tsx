import type { ConversationSummary } from "@/lib/gemini";

interface ConversationListProps {
  conversations?: ConversationSummary[];
  activeConversationId?: string;
  onSelectConversation: (conversationId?: string) => void;
  onNewChat: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export default function ConversationList({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onSelectPrompt
}: ConversationListProps) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl">Conversations</h3>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-full border border-accent-rose/20 bg-bg-elevated px-3 py-1 text-xs uppercase tracking-[0.18em] text-text-secondary transition hover:border-accent-rose/40 hover:text-text-primary"
        >
          New
        </button>
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-muted">Recent chats and quick prompts</p>
      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          {conversations.length ? (
            conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  activeConversationId === conversation.id
                    ? "border-accent-rose/50 bg-accent-soft/20 text-text-primary"
                    : "border-accent-rose/15 bg-bg-elevated/80 text-text-secondary hover:-translate-y-0.5 hover:border-accent-rose/40 hover:text-text-primary"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="line-clamp-1 text-sm font-medium">{conversation.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">{conversation.message_count} msgs</span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-text-muted">{conversation.last_message ?? "No preview yet"}</p>
              </button>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-accent-rose/20 bg-bg-elevated/50 px-3 py-4 text-sm text-text-muted">
              Your history will show up here after a few chats.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-accent-rose/15 bg-bg-elevated/70 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Quick prompts</p>
          <ul className="mt-2 space-y-2">
            {["Office rant + confidence plan", "Outfit ideas for cousin's wedding", "Should I send this message?"].map((title) => (
              <li key={title}>
                <button
                  type="button"
                  onClick={() => onSelectPrompt(title)}
                  className="w-full rounded-xl border border-accent-rose/15 bg-bg-primary/45 px-3 py-2 text-left text-sm text-text-secondary transition hover:border-accent-rose/40 hover:bg-accent-soft/20 hover:text-text-primary"
                >
                  {title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
