const placeholderConversations = [
  "Office rant + confidence plan",
  "Outfit ideas for cousin's wedding",
  "Should I send this message?"
];

interface ConversationListProps {
  onSelectPrompt: (prompt: string) => void;
}

export default function ConversationList({ onSelectPrompt }: ConversationListProps) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-display text-2xl">Conversations</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-muted">Tap one to start chatting</p>
      <ul className="mt-3 space-y-2">
        {placeholderConversations.map((title) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => onSelectPrompt(title)}
              className="w-full rounded-xl border border-accent-rose/15 bg-bg-elevated/80 px-3 py-3 text-left text-sm text-text-secondary transition hover:-translate-y-0.5 hover:border-accent-rose/40 hover:bg-accent-soft/20 hover:text-text-primary"
            >
              {title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
