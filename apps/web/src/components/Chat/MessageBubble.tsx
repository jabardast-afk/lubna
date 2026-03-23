import type { ChatMessage } from "@lubna/shared/types";
import type { ReactNode } from "react";

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: (message: ChatMessage) => void;
  onStopSpeaking?: () => void;
  isSpeaking?: boolean;
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderContent(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let listItems: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!listItems) return;
    const ListTag = listItems.ordered ? "ol" : "ul";
    nodes.push(
      <ListTag key={`list-${nodes.length}`} className={`my-3 space-y-2 pl-5 ${listItems.ordered ? "list-decimal" : "list-disc"}`}>
        {listItems.items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`}>{renderInlineFormatting(item)}</li>
        ))}
      </ListTag>
    );
    listItems = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    const bulletMatch = trimmed.match(/^[*-]\s+(.*)$/);
    if (orderedMatch) {
      const text = orderedMatch[1];
      if (!listItems || !listItems.ordered) {
        flushList();
        listItems = { ordered: true, items: [] };
      }
      listItems.items.push(text);
      return;
    }
    if (bulletMatch) {
      const text = bulletMatch[1];
      if (!listItems || listItems.ordered) {
        flushList();
        listItems = { ordered: false, items: [] };
      }
      listItems.items.push(text);
      return;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3 key={`h3-${index}`} className="mb-2 mt-3 text-lg font-semibold text-text-primary">
          {renderInlineFormatting(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2 key={`h2-${index}`} className="mb-2 mt-3 text-xl font-semibold text-text-primary">
          {renderInlineFormatting(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h1 key={`h1-${index}`} className="mb-2 mt-3 text-2xl font-semibold text-text-primary">
          {renderInlineFormatting(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
      return;
    }

    nodes.push(
      <p key={`p-${index}`} className="mb-2 last:mb-0">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();
  return nodes;
}

export default function MessageBubble({ message, onSpeak, onStopSpeaking, isSpeaking }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = !isUser;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fadeRise`}>
      <div
        className={`max-w-[90%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed md:max-w-[72%] ${
          isUser ? "bg-bubble-user text-text-primary" : "bg-bubble-lubna text-text-primary shadow-[inset_0_0_16px_rgba(201,116,138,0.14)]"
        }`}
      >
        <div className="whitespace-pre-wrap">
          {renderContent(message.content)}
        </div>
        {isAssistant && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-accent-rose/10 pt-2 text-xs uppercase tracking-[0.18em] text-text-muted">
            <span>Lubna reply</span>
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  onStopSpeaking?.();
                  return;
                }
                onSpeak?.(message);
              }}
              className="rounded-full border border-accent-rose/20 bg-bg-primary/50 px-3 py-1 text-text-secondary transition hover:border-accent-rose/40 hover:text-text-primary"
            >
              {isSpeaking ? "Stop" : "Speak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
