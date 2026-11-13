const BASE_URL = "/api";

export interface ChatResult {
  text: string;
  error?: string;
}

export async function sendChatMessage(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<ChatResult> {
  const res = await fetch(`${BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { text: "", error: body || res.statusText };
  }

  const reader = res.body?.getReader();
  if (!reader) return { text: "", error: "No response from the server" };

  const decoder = new TextDecoder();
  let fullText = "";
  let error: string | undefined;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6);

      try {
        const data = JSON.parse(jsonStr);
        if (data.text) {
          fullText += data.text;
          onChunk(fullText);
        }
        if (data.error) {
          error = data.error;
        }
      } catch {
        // skip parse errors
      }
    }
  }

  return { text: fullText, error };
}
