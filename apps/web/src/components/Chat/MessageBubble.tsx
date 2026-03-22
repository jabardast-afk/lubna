import type { ChatMessage } from "@lubna/shared/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fadeRise`}>
      <div
        className={`max-w-[90%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed md:max-w-[72%] ${
          isUser ? "bg-bubble-user text-text-primary" : "bg-bubble-lubna text-text-primary shadow-[inset_0_0_16px_rgba(201,116,138,0.14)]"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
