import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, RotateCcw } from "lucide-react";
import { supabase, must } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n";
import { useLoad } from "@/lib/useLoad";
import { ApiError, streamChat } from "@/lib/api";
import { MIN_USER_MESSAGES_FOR_SUMMARY, getModule, isModuleKey, type ModuleKey } from "@/lib/kamiya";
import type { Conversation, Message, Reflection } from "@/lib/types";
import { Button, ErrorNote, Notice, PageSkeleton } from "@/components/ui";
import { ReflectionPanel } from "./ReflectionPanel";

export default function ExploreRoute() {
  const { area } = useParams();
  if (!isModuleKey(area)) return <Navigate to="/coaching" replace />;
  return <Explore key={area} moduleKey={area} />;
}

function Explore({ moduleKey }: { moduleKey: ModuleKey }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const mod = getModule(moduleKey);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [chatErr, setChatErr] = useState<{ msg: string; code?: string } | null>(null);
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { loading, error, reload } = useLoad(async () => {
    const c = must(await supabase.from("coaching_conversations").select("*").eq("module_key", moduleKey)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle()) as Conversation | null;
    const msgs = c ? (must(await supabase.from("coaching_messages").select("*").eq("conversation_id", c.id).order("created_at")) as Message[]) : [];
    const r = must(await supabase.from("ikigai_reflections").select("*").eq("module_key", moduleKey).maybeSingle()) as Reflection | null;
    setConv(c);
    setMessages(msgs);
    setReflection(r);
    return true;
  }, [moduleKey]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, streaming]);

  const run = async (opts: { message?: string; newConversation?: boolean }) => {
    setChatErr(null);
    setStreaming("");
    const tempId = `tmp-${Date.now()}`;
    if (opts.message) {
      setMessages((m) => [...m, { id: tempId, conversation_id: conv?.id ?? "", role: "user", content: opts.message!, created_at: new Date().toISOString() }]);
    }
    let text = "";
    let convId = opts.newConversation ? undefined : conv?.id;
    try {
      await streamChat(
        { module_key: moduleKey, conversation_id: convId, message: opts.message, locale, new_conversation: opts.newConversation },
        (ev) => {
          if (ev.t === "meta") {
            convId = ev.conversation_id;
            setConv((c) => (c?.id === ev.conversation_id ? c : { id: ev.conversation_id, user_id: user!.id, module_key: moduleKey, created_at: "", updated_at: "" }));
          } else if (ev.t === "delta") {
            text += ev.text;
            setStreaming(text);
          } else if (ev.t === "done") {
            setMessages((m) => [...m, { id: ev.message_id, conversation_id: convId!, role: "assistant", content: text.trim(), created_at: new Date().toISOString() }]);
          } else if (ev.t === "error") {
            setChatErr({ msg: ev.message });
          }
        },
      );
    } catch (e) {
      const err = e as ApiError;
      setChatErr({ msg: err.message, code: err.code });
      // If the server rejected before saving, drop the optimistic message and restore the input.
      if (opts.message && err.status && err.status >= 400) {
        setMessages((m) => m.filter((x) => x.id !== tempId));
        setInput(opts.message);
      }
    } finally {
      setStreaming(null);
    }
  };

  // Open with the guide's first question when a module has no messages yet.
  useEffect(() => {
    if (loading || error || started.current) return;
    if (messages.length === 0) { started.current = true; void run({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || streaming !== null) return;
    setInput("");
    void run({ message: msg });
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };
  const newConversation = () => {
    if (!window.confirm(t.explore.confirmNew)) return;
    setMessages([]);
    void run({ newConversation: true });
  };

  if (loading) return <PageSkeleton />;
  if (error) return <div className="container py-16"><ErrorNote onRetry={reload} retryLabel={t.common.retry}>{error}</ErrorNote></div>;

  const userCount = messages.filter((m) => m.role === "user" && !m.id.startsWith("tmp-")).length;
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <div className="container py-10 md:py-14">
      <Link to="/coaching" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t.explore.back}
      </Link>
      <div className={`mb-8 rounded-card ${mod.tone} p-7 md:p-9`}>
        <h1 className="text-3xl md:text-4xl">{mod.title[locale]}</h1>
        <p className="mt-3 max-w-2xl text-foreground/80">{mod.intro[locale]}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <section aria-label="Conversation" className="card flex min-h-[520px] flex-col p-4 md:p-6">
          <ol className="flex-1 space-y-5 overflow-y-auto pb-4" aria-live="polite" aria-busy={streaming !== null}>
            {messages.map((m) => <Bubble key={m.id} role={m.role} text={m.content} you={t.explore.you} guide={t.explore.guide} />)}
            {streaming !== null && (
              streaming ? <Bubble role="assistant" text={streaming} you={t.explore.you} guide={t.explore.guide} />
              : <li className="text-sm italic text-muted">{messages.length ? t.explore.thinking : t.explore.starting}</li>
            )}
            <div ref={endRef} />
          </ol>
          {chatErr && (
            <div className="mb-3">
              <ErrorNote
                onRetry={chatErr.code === "ai_not_configured" ? undefined : () => void run({})}
                retryLabel={t.common.retry}
              >
                {chatErr.code === "ai_not_configured" ? t.explore.aiNotConfigured : `${t.explore.errorReply} ${chatErr.msg}`}
              </ErrorNote>
            </div>
          )}
          {!chatErr && lastIsUser && streaming === null && (
            <div className="mb-3">
              <Button variant="ghost" onClick={() => void run({})}><RotateCcw className="h-4 w-4" aria-hidden />{t.common.retry}</Button>
            </div>
          )}
          <form onSubmit={send} className="flex items-end gap-2 border-t border-line pt-4">
            <label htmlFor="msg" className="sr-only">{t.explore.placeholder}</label>
            <textarea
              id="msg"
              rows={2}
              className="input min-h-[52px] resize-none"
              placeholder={t.explore.placeholder}
              value={input}
              maxLength={4000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={streaming !== null}
            />
            <Button type="submit" aria-label={t.explore.send} disabled={!input.trim() || streaming !== null} className="px-4">
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </form>
          <div className="mt-3 flex justify-end">
            <button onClick={newConversation} disabled={streaming !== null} className="text-xs text-muted underline underline-offset-4 hover:text-foreground disabled:opacity-50">
              {t.explore.newConversation}
            </button>
          </div>
        </section>

        <aside aria-label={t.explore.summaryTitle}>
          <ReflectionPanel
            moduleKey={moduleKey}
            conversationId={conv?.id ?? null}
            userCount={userCount}
            min={MIN_USER_MESSAGES_FOR_SUMMARY}
            reflection={reflection}
            onChange={setReflection}
          />
          <div className="mt-6"><Notice tone="lavender">{t.coaching.disclaimer}</Notice></div>
        </aside>
      </div>
    </div>
  );
}

function Bubble({ role, text, you, guide }: { role: "user" | "assistant"; text: string; you: string; guide: string }) {
  const mine = role === "user";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-3xl px-5 py-3.5 leading-relaxed ${mine ? "bg-foreground text-background" : "bg-blush/70"}`}>
        <span className="sr-only">{mine ? you : guide}: </span>
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </li>
  );
}
