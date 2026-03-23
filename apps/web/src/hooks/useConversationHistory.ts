import { useQuery } from "@tanstack/react-query";
import { getConversationHistory, listConversations } from "@/lib/gemini";

export function useConversationHistory(conversationId?: string) {
  return useQuery({
    queryKey: ["conversation-history", conversationId ?? "latest"],
    queryFn: () => getConversationHistory(conversationId),
    staleTime: 15_000
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
    staleTime: 15_000
  });
}
