import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { LuArrowRight, LuSend, LuSparkles, LuTrash2 } from "react-icons/lu";
import GlassCard from "./ui/GlassCard";
import MarkdownContent from "./ui/MarkdownContent";
import { useSendChatMessage } from "../hooks/useChat";
import { AI_DISABLED_HINT, useAiEnabled } from "../hooks/useAi";
import type { ChatMessage } from "../types";

const SUGGESTED_PROMPTS = [
  "How was my last week across all areas?",
  "What should I focus on today?",
  "How is my sleep developing?",
  "How is my nutrition going?",
];

const MENTOR_CAPABILITIES = ["Nutrition", "Sleep", "Sport", "Supplements", "Body", "Energy curve"];

function TypingDots({ dotClassName = "h-1.5 w-1.5" }: { dotClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-1" role="status" aria-label="AI is answering">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`${dotClassName} rounded-full bg-current animate-[ai-dot_1.2s_ease-in-out_infinite]`}
          style={{ animationDelay: `${index * 0.2}s` }}
        />
      ))}
    </span>
  );
}

function MentorIntro() {
  return (
    <div className="rounded-2xl border border-dash-success/20 bg-dash-success/[0.04] px-4 py-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-dash-success">
        <LuSparkles className="h-3.5 w-3.5" />
        <span>Your AI mentor</span>
      </div>
      <p className="text-[15px] font-medium leading-relaxed text-white/95">
        I help you turn your tracking data into clear next steps.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-dash-secondary">
        I can analyze your nutrition, sleep, sport, supplements, body measurements and energy curve.
        When you are sick or stressed, I can also adjust your energy curve.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MENTOR_CAPABILITIES.map((capability) => (
          <span
            key={capability}
            className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] text-dash-secondary"
          >
            {capability}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Shown instead of the suggestions while GEMINI_API_KEY is not set. */
function SetupPanel() {
  return (
    <div className="flex min-h-full flex-col gap-5 px-1 py-3">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4">
        <p className="text-sm font-semibold text-white/90">Set up the AI features</p>
        <p className="mt-1 text-sm leading-relaxed text-dash-secondary">
          The mentor, photo analysis, nutrition suggestions and goal polishing use Google Gemini. A
          free API key is enough:
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-dash-secondary">
          <li>
            Create a key in{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-dash-success underline underline-offset-2"
            >
              Google AI Studio
            </a>
            .
          </li>
          <li>
            Add <code className="font-mono text-white/80">GEMINI_API_KEY=your-key</code> to your{" "}
            <code className="font-mono text-white/80">.env</code>.
          </li>
          <li>
            Apply it with <code className="font-mono text-white/80">docker compose up -d</code> (in
            development: restart the backend).
          </li>
        </ol>
        <p className="mt-3 text-xs text-dash-tertiary">
          Details and privacy notes: <code className="font-mono">docs/gemini.md</code>
        </p>
      </div>

      <MentorIntro />
    </div>
  );
}

function WelcomePanel({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-5 px-1 py-3">
      <MentorIntro />

      <div>
        <p className="mb-2.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-dash-tertiary">
          Or start with a suggestion
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrompt(prompt)}
              className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-left text-sm text-white/80 transition-colors hover:border-dash-success/40 hover:bg-dash-success/[0.08] hover:text-white"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dash-success/15 text-dash-success transition-colors group-hover:bg-dash-success group-hover:text-dash-bg">
                <LuArrowRight className="h-3.5 w-3.5" />
              </span>
              <span className="leading-snug">{prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMutation = useSendChatMessage();
  const aiEnabled = useAiEnabled();

  const isStreaming = sendMutation.isPending;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Without chat content, keep the welcome/setup panel at the top.
    if (messages.length > 0 || streamingText || error) scrollToBottom();
  }, [messages, streamingText, error, scrollToBottom]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setStreamingText("");
    setError(null);

    try {
      const result = await sendMutation.mutateAsync({
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        onChunk: (fullText: string) => {
          setStreamingText(fullText);
        },
      });

      if (result.error) {
        setError(result.error);
        setStreamingText("");
        return;
      }

      const finalText = result.text?.trim();
      if (finalText) {
        const aiMsg: ChatMessage = { role: "model", content: finalText };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setError("No answer received. Please try again.");
      }
      setStreamingText("");
    } catch {
      setStreamingText("");
      setError("Connection error. Please try again.");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const hasChatContent = messages.length > 0 || streamingText.length > 0 || error !== null;

  const handleNewChat = () => {
    if (isStreaming || !hasChatContent) return;
    if (!window.confirm("Clear the chat history and start with a fresh context?")) return;
    setMessages([]);
    setStreamingText("");
    setError(null);
    setInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1
          className="text-[22px] font-bold leading-tight tracking-tight max-[480px]:text-[22px] sm:text-[28px]"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AI mentor
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleNewChat}
            disabled={isStreaming || !hasChatContent}
            title="Clear chat"
            className="rounded-full p-2 text-dash-tertiary transition-colors hover:text-dash-secondary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <LuTrash2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
        </div>
      </div>

      <GlassCard className="flex h-[500px] flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-3 space-y-3">
          {!hasChatContent &&
            !isStreaming &&
            (aiEnabled ? (
              <WelcomePanel onPrompt={(prompt) => void sendMessage(prompt)} />
            ) : (
              <SetupPanel />
            ))}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "ki-user-bubble bg-dash-success/15 text-dash-success border border-dash-success/20"
                    : "bg-white/[0.06] text-white/90 border border-white/[0.06]"
                }`}
              >
                <MarkdownContent content={msg.content} />
              </div>
            </div>
          ))}

          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-white/[0.06] text-white/90 border border-white/[0.06]">
                <MarkdownContent content={streamingText} />
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-dash-success align-middle" />
              </div>
            </div>
          )}

          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.06] px-4 py-3 text-dash-success">
                <TypingDots />
              </div>
            </div>
          )}

          {error && !isStreaming && (
            <div className="flex justify-center">
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 max-w-[85%]">
                {error}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-2 flex items-center gap-2 border-t border-white/[0.06] px-1 pt-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiEnabled ? "Ask about your data…" : AI_DISABLED_HINT}
            title={aiEnabled ? undefined : AI_DISABLED_HINT}
            disabled={isStreaming || !aiEnabled}
            className="flex-1 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white/90 placeholder:text-dash-tertiary focus:outline-none focus:ring-1 focus:ring-dash-success/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim() || !aiEnabled}
            className="shrink-0 rounded-xl bg-dash-success/15 p-2.5 text-dash-success transition-colors hover:bg-dash-success/25 disabled:opacity-30"
          >
            {isStreaming ? <TypingDots dotClassName="h-1 w-1" /> : <LuSend className="h-4 w-4" />}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
