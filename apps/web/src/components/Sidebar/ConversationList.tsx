const placeholderConversations = [
  "Office rant + confidence plan",
  "Outfit ideas for cousin's wedding",
  "Should I send this message?"
];

export default function ConversationList() {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-display text-2xl">Conversations</h3>
      <ul className="mt-3 space-y-2">
        {placeholderConversations.map((title) => (
          <li key={title} className="rounded-xl border border-accent-rose/15 bg-bg-elevated/80 px-3 py-2 text-sm text-text-secondary">
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
}
