import { useEffect, useRef } from "react";
import type { ChatMessage } from "@lubna/shared/types";
import LubnaAvatar from "@/components/LubnaAvatar";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  onSpeakMessage?: (message: ChatMessage) => void;
  onStopSpeaking?: () => void;
  speakingMessageId?: string;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  onQuickPrompt?: (prompt: string) => void | Promise<void>;
}

const QUICK_PROMPTS = ["Fashion", "Relationships", "Health", "Career"];

export default function ChatWindow({
  messages,
  loading,
  onSpeakMessage,
  onStopSpeaking,
  speakingMessageId,
  autoSpeak,
  onToggleAutoSpeak,
  onQuickPrompt
}: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const previousLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > previousLengthRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    previousLengthRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="message-list scrollbar-thin">
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-accent-rose/15 bg-bg-elevated/55 px-4 py-3 text-xs uppercase tracking-[0.18em] text-text-muted">
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

      {!messages.length && !loading ? (
        <div className="flex min-h-full items-center justify-center">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <LubnaAvatar size={80} />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-text-primary">Lubna</h2>
            <p className="mt-2 text-base text-text-secondary">Your AI bestie who always has your back</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {QUICK_PROMPTS.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => onQuickPrompt?.(title)}
                  className="rounded-full border border-accent-rose/16 bg-bg-elevated px-4 py-2 text-sm text-text-primary transition hover:border-accent-rose/35 hover:bg-accent-soft/18"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
