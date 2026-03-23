import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppModule, ChatMessage } from "@lubna/shared/types";
import { finalizeConversation, finalizeConversationKeepalive, getConversationHistory, sendChatMessage } from "@/lib/gemini";

function uid() {
  return crypto.randomUUID();
}

function mapHistoryMessage(message: {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string;
  created_at?: number;
  createdAt?: number;
}): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    language: message.language,
    createdAt: message.created_at ?? message.createdAt ?? Date.now()
  };
}

export function useChat() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [module, setModule] = useState<AppModule>("general");
  const conversationIdRef = useRef<string>();
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const history = await getConversationHistory();
        if (!active) return;
        setConversationId(history.conversation?.id);
        setMessages(history.messages.map(mapHistoryMessage));
      } catch {
        // Ignore history load failures and let the user start fresh.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const finalizeCurrentConversation = () => {
      const activeConversationId = conversationIdRef.current;
      if (!activeConversationId || !messagesRef.current.length) return;
      void finalizeConversationKeepalive(activeConversationId).catch(() => undefined);
    };

    const handlePageHide = () => finalizeCurrentConversation();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        finalizeCurrentConversation();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      finalizeCurrentConversation();
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const finalizeActiveConversation = async () => {
    const activeConversationId = conversationIdRef.current;
    if (!activeConversationId || !messagesRef.current.length) return;
    try {
      await finalizeConversation(activeConversationId);
      await queryClient.invalidateQueries({ queryKey: ["memory"] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      // Finalization is best-effort and should never block the user from navigating chats.
    }
  };

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
      const response = await sendChatMessage({ message: content, conversationId: conversationIdRef.current, module });
      setConversationId(response.conversationId);
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: response.reply,
        language: response.language,
        createdAt: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
    if (conversationIdRef.current && conversationIdRef.current !== nextConversationId) {
      await finalizeActiveConversation();
    }

    setLoading(true);
    try {
      const history = await getConversationHistory(nextConversationId);
      setConversationId(history.conversation?.id);
      setMessages(history.messages.map(mapHistoryMessage));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    await finalizeActiveConversation();
    setMessages([]);
    setConversationId(undefined);
    setModule("general");
  };

  return {
    messages,
    loading,
    module,
    setModule,
    sendMessage,
    conversationId,
    loadConversation,
    startNewChat,
    finalizeConversation: finalizeActiveConversation
  };
}
