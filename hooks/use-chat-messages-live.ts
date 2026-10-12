"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatMessages, type ChatMessageDTO } from "@/actions/chat/messages";

export function chatMessagesKey(roomKey: string) {
  return ["chat-messages", roomKey] as const;
}

export function useChatMessagesLive(roomKey: string, enabled = true) {
  return useQuery({
    queryKey: chatMessagesKey(roomKey),
    queryFn: () => getChatMessages(roomKey),
    enabled: Boolean(roomKey) && enabled,
    refetchInterval: 2_500,
    refetchIntervalInBackground: false,
  });
}

export function useAppendChatMessage(roomKey: string) {
  const qc = useQueryClient();
  return (msg: ChatMessageDTO) => {
    qc.setQueryData<ChatMessageDTO[]>(chatMessagesKey(roomKey), (prev) => {
      const list = prev ?? [];
      if (list.some((m) => m.id === msg.id)) return list;
      return [...list, msg];
    });
  };
}
