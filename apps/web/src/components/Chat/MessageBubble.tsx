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
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"} animate-fadeRise`}>
      <div
        className={`max-w-[72%] px-4 py-3 text-[15px] leading-[1.7] shadow-[0_8px_30px_rgba(0,0,0,0.16)] ${
          isUser
            ? "rounded-[18px_18px_4px_18px] bg-accent-rose text-bg-primary"
            : "rounded-[18px_18px_18px_4px] bg-bubble-lubna text-text-primary shadow-[inset_0_0_16px_rgba(201,116,138,0.14)]"
        }`}
      >
        <div className="whitespace-pre-wrap">
          {renderContent(message.content)}
        </div>
        <div className={`mt-3 flex items-center justify-between gap-3 pt-2 text-[11px] text-text-muted ${isAssistant ? "border-t border-accent-rose/10" : ""}`}>
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
          {isAssistant && (
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
          )}
        </div>
      </div>
    </div>
  );
}
