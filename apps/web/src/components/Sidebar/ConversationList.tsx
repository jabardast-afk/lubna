import { useEffect, useState } from "react";
import type { ConversationSummary } from "@/lib/gemini";

interface ConversationListProps {
  conversations?: ConversationSummary[];
  activeConversationId?: string;
  onSelectConversation: (conversationId?: string) => void | Promise<void>;
  onNewChat: () => void | Promise<void>;
  onSelectPrompt: (prompt: string) => void | Promise<void>;
  showQuickPrompts: boolean;
}

const QUICK_PROMPTS = ["Fashion", "Relationships", "Health", "Career"];

export default function ConversationList({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onSelectPrompt,
  showQuickPrompts
}: ConversationListProps) {
  const [promptsOpen, setPromptsOpen] = useState(showQuickPrompts && !activeConversationId);

  useEffect(() => {
    setPromptsOpen(showQuickPrompts && !activeConversationId);
  }, [activeConversationId, showQuickPrompts]);

  return (
    <div className="glass-card flex h-full min-h-0 flex-col rounded-[28px] p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-text-primary">Conversations</h3>
          <button
            type="button"
            onClick={onNewChat}
            className="rounded-full border border-accent-rose/20 bg-bg-elevated px-3 py-1 text-xs uppercase tracking-[0.18em] text-text-secondary transition hover:border-accent-rose/40 hover:text-text-primary"
          >
            New
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {conversations.length ? (
              conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    activeConversationId === conversation.id
                      ? "border-accent-rose/45 bg-accent-soft/20 text-text-primary"
                      : "border-accent-rose/12 bg-bg-elevated/70 text-text-secondary hover:border-accent-rose/35 hover:text-text-primary"
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
              <p className="rounded-2xl border border-dashed border-accent-rose/18 bg-bg-elevated/55 px-3 py-4 text-sm text-text-muted">
                Your conversations will show up here as you chat.
              </p>
            )}
          </div>
        </div>
      </div>

      {showQuickPrompts && (
        <div className="mt-4 shrink-0 border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={() => setPromptsOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-2xl border border-accent-rose/15 bg-bg-elevated/65 px-3 py-3 text-left transition hover:border-accent-rose/30"
          >
            <span className="text-sm font-medium text-text-primary">Quick Prompts</span>
            <span className="text-xs uppercase tracking-[0.18em] text-text-muted">{promptsOpen ? "Hide" : "Show"}</span>
          </button>
          {promptsOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => onSelectPrompt(title)}
                  className="rounded-full border border-accent-rose/18 bg-bg-primary/55 px-3 py-2 text-sm text-text-secondary transition hover:border-accent-rose/38 hover:bg-accent-soft/18 hover:text-text-primary"
                >
                  {title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
