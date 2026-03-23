import { useEffect, useRef } from "react";
import type { ChatMessage } from "@lubna/shared/types";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  onSpeakMessage?: (message: ChatMessage) => void;
  onStopSpeaking?: () => void;
  speakingMessageId?: string;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
}

export default function ChatWindow({ messages, loading, onSpeakMessage, onStopSpeaking, speakingMessageId, autoSpeak, onToggleAutoSpeak }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto pr-2">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-rose/15 bg-bg-elevated/60 px-4 py-3 text-xs uppercase tracking-[0.18em] text-text-muted">
        <span>Chat history</span>
        {onToggleAutoSpeak && (
          <button
            type="button"
            onClick={onToggleAutoSpeak}
            className={`rounded-full border px-3 py-1 transition ${
              autoSpeak ? "border-accent-rose/40 bg-accent-soft/20 text-text-primary" : "border-accent-rose/20 bg-bg-primary/40 text-text-secondary"
            }`}
          >
            Auto speak: {autoSpeak ? "On" : "Off"}
          </button>
        )}
      </div>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onSpeak={onSpeakMessage}
          onStopSpeaking={onStopSpeaking}
          isSpeaking={speakingMessageId === message.id}
        />
      ))}
      {loading && (
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-rose/20 bg-bubble-lubna px-4 py-2 text-sm text-text-secondary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-rose" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-rose [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent-rose [animation-delay:220ms]" />
          Lubna is thinking...
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
