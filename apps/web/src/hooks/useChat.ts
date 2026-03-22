import { useState } from "react";
import type { AppModule, ChatMessage } from "@lubna/shared/types";
import { sendChatMessage } from "@/lib/gemini";

function uid() {
  return crypto.randomUUID();
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [module, setModule] = useState<AppModule>("general");

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await sendChatMessage({ message: content, conversationId, module });
      setConversationId(response.conversationId);
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: response.reply,
        language: response.language,
        createdAt: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    module,
    setModule,
    sendMessage
  };
}
