import { useEffect, useState } from "react";
import type { AppModule, ChatMessage } from "@lubna/shared/types";
import { getConversationHistory, sendChatMessage } from "@/lib/gemini";

function uid() {
  return crypto.randomUUID();
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [module, setModule] = useState<AppModule>("general");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const history = await getConversationHistory();
        if (!active) return;
        setConversationId(history.conversation?.id);
        setMessages(history.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          language: message.language,
          createdAt: message.created_at
        })));
      } catch {
        // Ignore history load failures and let the user start fresh.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to get AI response right now.";
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: message,
        createdAt: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (nextConversationId?: string) => {
    setLoading(true);
    try {
      const history = await getConversationHistory(nextConversationId);
      setConversationId(history.conversation?.id);
      setMessages(history.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        language: message.language,
        createdAt: message.created_at
      })));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  return {
    messages,
    loading,
    module,
    setModule,
    sendMessage,
    conversationId,
    loadConversation,
    startNewChat
  };
}
