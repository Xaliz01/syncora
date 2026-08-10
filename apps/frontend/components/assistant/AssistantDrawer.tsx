"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AssistantSuggestion } from "@planwise/shared";
import {
  hideCrispChatLauncher,
  isCrispEnabled,
  openCrispChat,
  showCrispChatLauncher,
} from "@/lib/crisp-client";
import { isAssistantUiEnabled, postAssistantChat } from "@/lib/assistant.api";

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      suggestions: AssistantSuggestion[];
      escalateToSupport?: boolean;
    };

/** Affiche le texte assistant avec listes numérotées lisibles. */
function AssistantReplyBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const stepLines = lines.filter((l) => /^\s*\d+\.\s+\S/.test(l));
        if (stepLines.length >= 2 || (stepLines.length === 1 && lines.length === 1)) {
          const introLines = lines.filter((l) => l.trim() && !/^\s*\d+\.\s+\S/.test(l));
          return (
            <div key={`b-${i}`} className="space-y-1.5">
              {introLines.map((line, j) => (
                <p key={`i-${j}`}>{line}</p>
              ))}
              <ol className="list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-slate-500 dark:marker:text-slate-400">
                {stepLines.map((line, j) => (
                  <li key={`s-${j}`} className="pl-1">
                    {line.replace(/^\s*\d+\.\s+/, "")}
                  </li>
                ))}
              </ol>
            </div>
          );
        }
        return (
          <p key={`b-${i}`} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function AssistantIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

export { AssistantIcon };

export function AssistantButton() {
  const [open, setOpen] = useState(false);

  if (!isAssistantUiEnabled()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-600 dark:hover:text-brand-400"
        aria-label="Assistant Planwise"
        title="Assistant Planwise"
        aria-expanded={open}
      >
        <AssistantIcon className="h-4 w-4" />
      </button>
      {open ? <AssistantDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AssistantDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Posez une question sur Planwise (ex. « comment créer un devis ? », « où est le planning ? »). Je propose des liens vers les bons écrans.",
      suggestions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Le bubble Crisp (z-index très élevé) recouvre sinon le bouton Envoyer.
    hideCrispChatLauncher();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      showCrispChatLauncher();
    };
  }, [onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await postAssistantChat({
        message: text,
        pathname: pathname || "/",
        conversationId,
      });
      setConversationId(res.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: res.reply,
          suggestions: res.suggestions ?? [],
          escalateToSupport: res.escalateToSupport,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Assistant indisponible. Utilisez le chat support si besoin.",
          suggestions: [],
          escalateToSupport: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[11000]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Fermer l’assistant"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Assistant Planwise"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assistant</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Guide produit Planwise</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user"
                  ? "ml-8 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"
                  : "mr-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              }
            >
              {msg.role === "assistant" ? (
                <AssistantReplyBody text={msg.text} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
              {msg.role === "assistant" && msg.suggestions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.suggestions.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      onClick={onClose}
                      className="inline-flex rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-brand-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-700"
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              {msg.role === "assistant" && msg.escalateToSupport && isCrispEnabled() ? (
                <button
                  type="button"
                  onClick={() => openCrispChat()}
                  className="mt-2 text-xs font-medium text-brand-700 underline dark:text-brand-300"
                >
                  Parler à un humain
                </button>
              ) : null}
            </div>
          ))}
          {sending ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Réflexion…</p>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">
          {isCrispEnabled() ? (
            <button
              type="button"
              onClick={() => openCrispChat()}
              className="mb-2 text-xs font-medium text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Parler à un humain (support)
            </button>
          ) : null}
          <form onSubmit={sendMessage} className="flex gap-2">
            <label className="sr-only" htmlFor="assistant-input">
              Votre question
            </label>
            <input
              id="assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Votre question…"
              disabled={sending}
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Envoyer
            </button>
          </form>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
