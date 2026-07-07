"use client";

import { useEffect, useRef, useState } from "react";

import {
  sendChat,
  type ChatApiResponse,
  type ChatMessage,
  type PartyInfo,
} from "@/lib/documents";

interface DocumentChatProps {
  documentType: string | null;
  values: Record<string, string>;
  parties: PartyInfo[];
  complete: boolean;
  onResult: (result: ChatApiResponse) => void;
}

const GREETING =
  "Hi! I'm Prelegal. I can draft any of our supported legal agreements — an " +
  "NDA, cloud service agreement, pilot, DPA, and more. What kind of document " +
  "do you need, and what's it for?";

export default function DocumentChat({
  documentType,
  values,
  parties,
  complete,
  onResult,
}: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await sendChat(history, documentType, values, parties);
      onResult(res);
      setMessages([...history, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-[32rem] flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-navy">Chat with the AI</h3>
        {complete ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Ready to download
          </span>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                "max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm " +
                (message.role === "user"
                  ? "bg-navy text-white"
                  : "bg-white text-slate-800 shadow-sm")
              }
            >
              {message.content}
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">
              Thinking…
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          className="min-h-11 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe the document you need…"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-purple/90 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
