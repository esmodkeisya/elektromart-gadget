"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  FileText,
  Loader2,
  MessageCircleMore,
  Paperclip,
  Send,
  Smile,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

type Attachment = {
  type: "image" | "video";
  url: string;
  name?: string;
  size?: number;
};

type Conversation = {
  id: string;
  other: {
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
  };
  last_message: string;
  from_me: boolean;
  unread: number;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  attachment?: Attachment | null;
  created_at: string;
};

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤔", "😎",
  "😢", "😭", "😡", "😱", "🥳", "🙏", "👍", "👎", "👏", "🙌",
  "❤️", "🔥", "🎉", "✨", "💯", "😴", "🤝", "👋", "😅", "🥰",
  "📦", "🛒", "💰", "✅", "❌", "⏰", "📌", "😇", "🤩", "😬",
];

const GRADIENTS = [
  "from-orange-400 to-pink-500",
  "from-blue-400 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-purple-400 to-fuchsia-600",
  "from-amber-400 to-orange-600",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatClient() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myId, setMyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionData.session?.user) {
        setError(t("profile.sessionNotFoundLogin"));
        setLoading(false);
        return;
      }
      setMyId(sessionData.session.user.id);
      const list = await refreshConversations();
      if (mounted) {
        const param = new URLSearchParams(window.location.search).get("conversation");
        if (param && list.some((conversation) => conversation.id === param)) {
          setSelectedId(param);
          void refreshMessages(param);
        }
      }
      if (mounted) setLoading(false);
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  async function refreshConversations() {
    try {
      const data = await api<{ conversations: Conversation[] }>("/api/conversations");
      setConversations(data.conversations || []);
      return data.conversations || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
      return [];
    }
  }

  async function refreshMessages(conversationId: string) {
    try {
      const data = await api<{ messages: ChatMessage[] }>(`/api/conversations/${conversationId}/messages`);
      setMessages(data.messages || []);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshConversations().then((list) => {
        const current = selectedIdRef.current;
        const stillThere = list.some((conversation) => conversation.id === current);
        if (current && stillThere) void refreshMessages(current);
      });
    }, 4000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, selectedId]);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    setMessages([]);
    setShowEmojiPicker(false);
    void refreshMessages(conversationId);
  }

  async function handleSendMessage() {
    if (!draft.trim() || !selectedId) return;
    const text = draft.trim();
    setDraft("");
    setShowEmojiPicker(false);
    try {
      await api(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const list = await refreshConversations();
      const stillThere = list.some((conversation) => conversation.id === selectedIdRef.current);
      if (stillThere) await refreshMessages(selectedIdRef.current as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    }
  }

  function handleEmojiClick(emoji: string) {
    setDraft((current) => current + emoji);
  }

  async function handleSendAttachment(file: File) {
    if (!selectedId || !file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError(t("chat.fileTooLarge"));
      return;
    }
    const type = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
        ? "image"
        : null;
    if (!type) {
      setError(t("chat.fileType"));
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError(t("profile.sessionNotFoundLogin"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${userId}/chat-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(`${t("chat.attachError")} (${uploadError.message})`);
      const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
      await api(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          attachment: { type, url: data.publicUrl, name: file.name, size: file.size },
        }),
      });
      const list = await refreshConversations();
      const stillThere = list.some((conversation) => conversation.id === selectedIdRef.current);
      if (stillThere) await refreshMessages(selectedIdRef.current as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("api.unavailable"));
    } finally {
      setUploading(false);
    }
  }

  function handleAttachChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleSendAttachment(file);
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">{t("chat.inbox")}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{t("chat.messages")}</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
            <MessageCircleMore className="h-5 w-5" />
          </div>
        </div>

        {error ? (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
        ) : null}

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
          {conversations.map((conversation) => {
            const gradient = GRADIENTS[conversation.other.id.length % GRADIENTS.length];
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  selected?.id === conversation.id ? "bg-brand-orange/10 ring-1 ring-brand-orange/30" : "hover:bg-slate-50"
                }`}
              >
                <div className="relative shrink-0">
                  {conversation.other.avatar_url ? (
                    <img src={conversation.other.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}>
                      {initials(conversation.other.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{conversation.other.name}</p>
                    {conversation.unread > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium text-brand-orange/80">
                    {conversation.other.role === "seller" ? t("chat.seller") : t("chat.buyer")}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {conversation.from_me ? `${t("chat.you")}: ` : ""}{conversation.last_message || "—"}
                  </p>
                </div>
              </button>
            );
          })}

          {!loading && conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageCircleMore className="h-8 w-8 text-slate-200" />
              <p className="text-xs font-medium text-slate-400">{t("chat.noConversations")}</p>
            </div>
          ) : null}
        </div>
      </aside>

      {selected ? (
        <section className="flex min-h-0 flex-col bg-white">
          <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              {selected.other.avatar_url ? (
                <img src={selected.other.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${GRADIENTS[selected.other.id.length % GRADIENTS.length]} text-sm font-bold text-white shadow-sm`}>
                  {initials(selected.other.name)}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900">{selected.other.name}</h2>
                <p className="text-xs text-emerald-600">
                  {selected.other.role === "seller" ? t("chat.seller") : t("chat.buyer")}
                </p>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-50 to-white">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <MessageCircleMore className="h-8 w-8 text-slate-200" />
                  <p className="text-xs text-slate-400">{t("chat.empty")}</p>
                </div>
              ) : null}
              {messages.map((message) => {
                const mine = message.sender_id === myId;
                return (
                  <div key={message.id} className={`flex animate-[fadeIn_0.2s_ease-out] ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                        mine
                          ? "rounded-br-sm bg-gradient-to-br from-brand-orange to-orange-500 text-white"
                          : "rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200"
                      }`}
                    >
                      {message.attachment ? (
                        <a
                          href={message.attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          title={t("chat.openAttachment")}
                          className="block overflow-hidden rounded-xl"
                        >
                          {message.attachment.type === "video" ? (
                            <video
                              src={message.attachment.url}
                              controls
                              playsInline
                              className="max-h-64 w-full object-contain"
                            />
                          ) : (
                            <img
                              src={message.attachment.url}
                              alt={message.attachment.name || t("chat.photo")}
                              className="max-h-64 w-full object-cover"
                            />
                          )}
                        </a>
                      ) : null}
                      {message.attachment && !message.text ? (
                        <p className={`mt-2 flex items-center gap-1 text-xs ${mine ? "text-orange-100" : "text-slate-400"}`}>
                          <FileText className="h-3 w-3" />
                          {message.attachment.type === "video" ? t("chat.video") : t("chat.photo")}
                        </p>
                      ) : null}
                      {message.text ? <p className="mt-2 text-sm leading-6">{message.text}</p> : null}
                      <p className={`mt-2 text-[10px] ${mine ? "text-orange-100" : "text-slate-400"}`}>
                        {timeLabel(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
              {showEmojiPicker && (
                <div className="absolute bottom-full left-4 z-10 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:left-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Emoji</p>
                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-600" aria-label={t("chat.closeEmoji")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-slate-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-brand-orange/40 focus-within:ring-2 focus-within:ring-brand-orange/10">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((current) => !current)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-700 ${showEmojiPicker ? "bg-white text-brand-orange" : ""}`}
                  aria-label="Emoji"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title={t("chat.attachFile")}
                  aria-label={t("chat.attachFile")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleAttachChange}
                />
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  onFocus={() => setShowEmojiPicker(false)}
                  placeholder={uploading ? t("chat.uploading") : t("chat.placeholder")}
                  disabled={uploading}
                  className="flex-1 border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white shadow-sm transition hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:bg-brand-orange/40"
                  disabled={!draft.trim() || uploading}
                  aria-label={t("chat.send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex min-h-0 flex-col items-center justify-center gap-3 bg-white text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
            <MessageCircleMore className="h-8 w-8" />
          </div>
          <p className="text-sm font-medium text-slate-500">{t("chat.selectConversation")}</p>
        </section>
      )}
    </div>
  );
}