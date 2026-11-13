import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendChatMessage } from "../api/chat";

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messages,
      onChunk,
    }: {
      messages: { role: string; content: string }[];
      onChunk: (text: string) => void;
    }) => {
      return sendChatMessage(messages, onChunk);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "energy-curve"] });
    },
  });
}
