import React, { useEffect, useMemo, useState, useRef } from "react";
import { socket } from "@/services/socket";
import {
  Send,
  MessageSquare,
  ShieldCheck,
  User,
  Eye,
  AlertTriangle,
  UserMinus,
  MoreVertical,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, ensureValidAccessToken } from "@/services/auth";
import { useNavigate } from "react-router-dom";

type ChatMsg = {
  id: string | number;
  tempId?: string;
  text: string;
  senderId: string;
  time: string;
  createdAt?: string;
};

// ─── Toast ───────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }
let _toastId = 0;

function ToastContainer({ toasts, isDark }: { toasts: ToastItem[]; isDark: boolean }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : Info;
        const colorCls =
          t.type === "success"
            ? isDark ? "bg-emerald-900/80 border-emerald-500/30 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"
            : t.type === "error"
              ? isDark ? "bg-red-900/80 border-red-500/30 text-red-200" : "bg-red-50 border-red-200 text-red-800"
              : isDark ? "bg-blue-900/80 border-blue-500/30 text-blue-200" : "bg-blue-50 border-blue-200 text-blue-800";
        return (
          <div key={t.id} className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold pointer-events-auto ${colorCls}`}>
            <Icon className="w-5 h-5 shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Confirmation Modal ─────────────────────────────────
function ConfirmModal({
  isDark, open, title, desc, confirmLabel, confirmColor, loading, onConfirm, onCancel, children,
}: {
  isDark: boolean; open: boolean; title: string; desc: string;
  confirmLabel: string; confirmColor?: string; loading: boolean;
  onConfirm: () => void; onCancel: () => void; children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`w-[440px] rounded-3xl border shadow-2xl p-8 ${isDark ? "bg-[#0F172A] border-white/10" : "bg-white border-slate-200"}`}>
        <h3 className={`text-xl font-black mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
        <p className={`text-sm mb-5 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</p>
        {children}
        <div className="flex gap-3 mt-6">
          <button onClick={onConfirm} disabled={loading}
            className={`flex-[2] py-3.5 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl ${loading ? "opacity-60 cursor-not-allowed" : ""} ${confirmColor || "bg-red-600 hover:bg-red-500"}`}>
            {loading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={loading}
            className={`flex-1 py-3.5 rounded-2xl font-bold border-2 transition-all ${isDark ? "border-white/10 text-white/60 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Date helper ─────────────────────────────────────────
function getDateLabel(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ─── Main Component ──────────────────────────────────────
export function FuturisticChatInterface() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [message, setMessage] = useState("");
  const [myId, setMyId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [activeFriend, setActiveFriend] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Unread counts per chat_id
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // 3-dot menu
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [removeModal, setRemoveModal] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [modalTarget, setModalTarget] = useState<any>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (msg: string, type: ToastType = "info") => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keep a ref to activeFriend so the global socket handler always has the current value
  const activeFriendRef = useRef<any>(null);
  useEffect(() => { activeFriendRef.current = activeFriend; }, [activeFriend]);

  const safeStr = (v: any) => (v === null || v === undefined ? "" : String(v));
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Click outside 3-dot menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenFor(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── 1. Init: fetch profile + mutual friends, then join ALL chat rooms at once
  useEffect(() => {
    const init = async () => {
      const token = await ensureValidAccessToken();
      if (!token) { setLoading(false); return; }
      try {
        const meRes = await authFetch("/api/users/profile");
        const meJson = await meRes.json();
        const currentId = safeStr(meJson?.data?.user?.id);
        setMyId(currentId);

        const fRes = await authFetch("/api/requests/mutual");
        const fJson = await fRes.json();
        if (fRes.ok && fJson.success) {
          const list = fJson.data.requests || [];
          setMutualFriends(list);
          if (list.length > 0) setActiveFriend(list[0]);

          // Join ALL chat rooms so we receive messages from every connection
          if (!socket.connected) socket.connect();
          list.forEach((f: any) => {
            if (f.chat_id) socket.emit("join_chat", { chatId: f.chat_id });
          });
        }
      } finally { setLoading(false); }
    };
    init();

    return () => {
      // Leave all rooms on unmount
      socket.off("new_message");
    };
  }, []);

  // ── 2. Identity helper
  const getFriendDetails = (f: any) => {
    if (!f) return { name: "User", email: "", avatarUrl: "", userId: 0 };
    const amISender = safeStr(f.sender_id) === myId;
    const rawName = amISender ? f.receiver_display_name : f.sender_display_name;
    const email = amISender ? f.receiver_email : f.sender_email;
    const avatarUrl = amISender ? f.receiver_avatar_url : f.sender_avatar_url;
    return {
      name: safeStr(rawName).trim() || safeStr(email).split("@")[0] || "User",
      email: safeStr(email),
      avatarUrl: safeStr(avatarUrl),
      userId: f.other_user_id ?? f.id,
    };
  };
  const activeInfo = useMemo(() => getFriendDetails(activeFriend), [activeFriend, myId]);

  // ── 3. GLOBAL socket listener — handles ALL chats
  useEffect(() => {
    if (!myId) return; // wait until we know who we are

    const handleNewMsg = (msg: any) => {
      const msgChatId = safeStr(msg.chatId);
      const currentActiveChatId = safeStr(activeFriendRef.current?.chat_id);

      // Bump this chat to the top of the sidebar
      setMutualFriends(prev => {
        const idx = prev.findIndex(f => safeStr(f.chat_id) === msgChatId);
        if (idx <= 0) return prev;
        const updated = [...prev];
        const [bumped] = updated.splice(idx, 1);
        return [bumped, ...updated];
      });

      // If this message is NOT in the currently open chat → increment unread badge
      if (msgChatId !== currentActiveChatId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msgChatId]: (prev[msgChatId] || 0) + 1,
        }));
        return; // Don't add to the visible message list
      }

      // Message IS for the active chat → add to message list
      setMessages(prev => {
        const isDuplicate = prev.some(
          m => String(m.id) === String(msg.id) || (msg.tempId && m.tempId === msg.tempId)
        );
        if (isDuplicate) {
          return prev.map(m =>
            m.tempId === msg.tempId ? { ...m, id: msg.id, tempId: undefined } : m
          );
        }
        return [
          ...prev,
          {
            id: msg.id,
            text: msg.text,
            senderId: safeStr(msg.senderId),
            time: msg.time || formatTime(new Date()),
            createdAt: msg.createdAt || new Date().toISOString(),
          },
        ];
      });
    };

    socket.on("new_message", handleNewMsg);
    return () => { socket.off("new_message", handleNewMsg); };
  }, [myId]); // re-attach only when myId changes

  // ── 4. Load history when switching active chat
  useEffect(() => {
    if (!activeFriend?.chat_id) return;
    const fetchHistory = async () => {
      const res = await authFetch(`/api/chats/${activeFriend.chat_id}/messages`);
      const json = await res.json();
      if (res.ok && json.success) {
        setMessages(
          json.data.messages.map((m: any) => ({
            id: m.id,
            text: safeStr(m.text || m.body),
            senderId: safeStr(m.sender_id),
            time: formatTime(new Date(m.created_at)),
            createdAt: m.created_at,
          }))
        );
      }
    };
    fetchHistory();
  }, [activeFriend?.chat_id]);

  // ── 5. Send message
  const handleSendMessage = () => {
    if (!message.trim() || !activeFriend?.chat_id) return;
    const tId = `temp-${Date.now()}`;
    const now = new Date();
    setMessages(prev => [
      ...prev,
      { id: tId, tempId: tId, text: message, senderId: myId, time: formatTime(now), createdAt: now.toISOString() },
    ]);
    socket.emit("send_message", { chatId: activeFriend.chat_id, text: message, tempId: tId });
    setMessage("");
    // Bump to top immediately on send
    setMutualFriends(prev => {
      const idx = prev.findIndex(f => safeStr(f.chat_id) === safeStr(activeFriend.chat_id));
      if (idx <= 0) return prev;
      const updated = [...prev];
      const [bumped] = updated.splice(idx, 1);
      return [bumped, ...updated];
    });
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Switch active chat & clear unread
  const openChat = (f: any) => {
    setActiveFriend(f);
    setMenuOpenFor(null);
    const cid = safeStr(f.chat_id);
    if (cid) setUnreadCounts(prev => ({ ...prev, [cid]: 0 }));
  };

  // ── Modal helpers
  const modalInfo = useMemo(() => (modalTarget ? getFriendDetails(modalTarget) : { name: "User", userId: 0 }), [modalTarget, myId]);

  const removeFriendFromUI = (userId: number) => {
    setMutualFriends(prev => {
      const remaining = prev.filter(f => (f.other_user_id ?? f.id) !== userId);
      if (activeFriend && (activeFriend.other_user_id ?? activeFriend.id) === userId) {
        setActiveFriend(remaining.length > 0 ? remaining[0] : null);
        setMessages([]);
      }
      return remaining;
    });
  };

  const handleReportBlock = async () => {
    if (!modalInfo.userId) return;
    setReportLoading(true);
    try {
      const reason = reportReason.trim() || "Inappropriate behavior";
      await authFetch("/api/users/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: modalInfo.userId, reason }),
      });
      await authFetch("/api/requests/remove-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: modalInfo.userId }),
      });
      removeFriendFromUI(modalInfo.userId);
      setReportModal(false);
      setReportReason("");
      showToast("User reported & blocked. Connection removed.", "success");
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes("already reported")) {
        showToast("You have already reported this user.", "info");
      } else {
        showToast("Failed to report. Please try again.", "error");
      }
    } finally { setReportLoading(false); }
  };

  const handleRemoveConnection = async () => {
    if (!modalInfo.userId) return;
    setRemoveLoading(true);
    try {
      const res = await authFetch("/api/requests/remove-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: modalInfo.userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(json.message || "Failed to remove connection.", "error"); return; }
      removeFriendFromUI(modalInfo.userId);
      setRemoveModal(false);
      showToast("Connection removed.", "info");
    } catch { showToast("Network error.", "error"); }
    finally { setRemoveLoading(false); }
  };

  // ── Messages with date separators
  const messagesWithDateSeparators = useMemo(() => {
    const result: (ChatMsg | { type: "date"; label: string })[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const label = getDateLabel(msg.createdAt);
      if (label && label !== lastDate) { result.push({ type: "date", label }); lastDate = label; }
      result.push(msg);
    }
    return result;
  }, [messages]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-blue-500">Initializing Neural Link...</div>;

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDark ? "bg-[#020617] text-slate-200" : "bg-white text-slate-900"}`}>
      <ToastContainer toasts={toasts} isDark={isDark} />

      {/* ── Sidebar ────────────────────────────────────── */}
      <div className={`w-80 flex flex-col border-r ${isDark ? "border-white/5 bg-slate-900/40" : "border-slate-200 bg-slate-50"}`}>
        <div className="p-6 border-b border-inherit font-bold text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" /> Your Connections
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1">
          {mutualFriends.map((f) => {
            const info = getFriendDetails(f);
            const friendKey = safeStr(f.chat_id || f.id);
            const active = activeFriend?.chat_id === f.chat_id;
            const menuOpen = menuOpenFor === friendKey;
            const unread = unreadCounts[friendKey] || 0;

            return (
              <div key={friendKey} className="relative group">
                <button
                  onClick={() => openChat(f)}
                  className={`w-full flex items-center gap-3 p-3 pr-10 rounded-xl transition-all text-left
                    ${active ? "bg-blue-600 text-white shadow-lg" : "hover:bg-blue-500/10"}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${active ? "bg-white/20" : "bg-blue-500/10"}`}>
                    {info.avatarUrl
                      ? <img src={info.avatarUrl} alt={info.name} className="w-full h-full object-cover" />
                      : <User className={`w-5 h-5 ${active ? "text-white" : "text-blue-500"}`} />}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${unread > 0 && !active ? (isDark ? "text-white" : "text-slate-900") : ""}`}>
                      {info.name}
                    </p>
                    <p className="text-[10px] opacity-60 truncate">{info.email}</p>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && !active && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-blue-500/40">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>

                {/* 3-dot trigger */}
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpen ? null : friendKey); }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                    ${menuOpen
                      ? isDark ? "bg-white/10 text-white opacity-100" : "bg-slate-200 text-slate-700 opacity-100"
                      : "opacity-0 group-hover:opacity-100"}
                    ${active
                      ? "text-white/70 hover:text-white hover:bg-white/10"
                      : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className={`absolute right-8 top-8 mt-1 w-52 rounded-xl border shadow-2xl z-[100] overflow-hidden py-1
                      ${isDark ? "bg-slate-900 border-white/10 shadow-black/50" : "bg-white border-slate-200 shadow-xl"}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); navigate(`/users/${info.userId}`); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors
                        ${isDark ? "text-white hover:bg-white/5" : "text-slate-800 hover:bg-slate-50"}`}
                    >
                      <Eye className="w-4 h-4 text-blue-500" /> View Profile
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); setModalTarget(f); setReportModal(true); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors
                        ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                    >
                      <AlertTriangle className="w-4 h-4" /> Report & Block
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); setModalTarget(f); setRemoveModal(true); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors
                        ${isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50"}`}
                    >
                      <UserMinus className="w-4 h-4" /> Remove Connection
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`p-6 border-t ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <button onClick={() => navigate("/homepage")}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors
              ${isDark ? "border-blue-500/20 text-blue-300 hover:bg-blue-500/10" : "border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200"}`}>
            Back to Home
          </button>
        </div>
      </div>

      {/* ── Chat Area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`h-20 px-8 flex items-center justify-between border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-blue-500/20">
              {activeInfo.avatarUrl
                ? <img src={activeInfo.avatarUrl} alt={activeInfo.name} className="w-full h-full object-cover" />
                : activeInfo.name[0]}
            </div>
            <div>
              <h3 className="font-bold">{activeInfo.name}</h3>
              <span className="text-[10px] text-emerald-500 font-bold tracking-widest animate-pulse">SECURE_LINK_ACTIVE</span>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-slate-500" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {activeFriend ? (
            messagesWithDateSeparators.length > 0 ? (
              messagesWithDateSeparators.map((item, i) => {
                if ("type" in item && item.type === "date") {
                  return (
                    <div key={`date-${i}`} className="flex items-center justify-center my-4">
                      <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide border shadow-sm
                          ${isDark ? "bg-slate-800/80 border-white/10 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                        {item.label}
                      </div>
                    </div>
                  );
                }
                const msg = item as ChatMsg;
                const isMe = msg.senderId === myId;
                return (
                  <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className={`px-5 py-3 rounded-2xl text-sm shadow-sm
                          ${isMe ? "bg-blue-600 text-white rounded-tr-none" : isDark ? "bg-slate-800" : "bg-slate-100 text-slate-800"}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">{msg.time}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className={`flex flex-col items-center gap-4 max-w-sm text-center p-8 rounded-3xl border border-dashed
                    ${isDark ? "bg-slate-800/20 border-white/10" : "bg-slate-50 border-slate-300"}`}
                >
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>Say hello!</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      You are now connected with {activeInfo.name}. Send a message to start the conversation securely.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className={`flex flex-col items-center gap-4 max-w-sm text-center p-8 rounded-3xl
                  ${isDark ? "bg-slate-800/20" : "bg-slate-50"}`}
              >
                <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center">
                  <ShieldCheck className={`w-8 h-8 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-slate-900"}`}>IncognIITo Secure Chat</h3>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Select a connection from your channels on the left to view messages or start a new conversation.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeFriend && (
          <div className="p-6">
            <div className={`flex items-center gap-2 p-2 rounded-2xl border ${isDark ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-200"}`}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type message..."
                className="flex-1 bg-transparent px-4 py-2 outline-none"
              />
              <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Report & Block Modal ───────────────────────── */}
      <ConfirmModal
        isDark={isDark} open={reportModal}
        title="Report & Block User"
        desc={`Report ${modalInfo.name} for inappropriate behavior. This will block and remove your connection with them.`}
        confirmLabel="Report & Block" confirmColor="bg-red-600 hover:bg-red-500"
        loading={reportLoading} onConfirm={handleReportBlock}
        onCancel={() => { setReportModal(false); setReportReason(""); }}
      >
        <textarea rows={3} placeholder="Describe the issue (optional)..."
          value={reportReason} onChange={(e) => setReportReason(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl text-sm outline-none border-2 focus:ring-4 focus:ring-red-500/20 transition-all resize-none
            ${isDark ? "bg-[#0B1120] border-white/5 text-white placeholder-red-300/30 focus:border-red-500/50" : "bg-white border-red-200 text-slate-900 placeholder-red-300 focus:border-red-400"}`}
        />
      </ConfirmModal>

      {/* ── Remove Connection Modal ────────────────────── */}
      <ConfirmModal
        isDark={isDark} open={removeModal}
        title="Remove Connection"
        desc={`Are you sure you want to remove your connection with ${modalInfo.name}? This will delete all chat history.`}
        confirmLabel="Remove" confirmColor="bg-amber-600 hover:bg-amber-500"
        loading={removeLoading} onConfirm={handleRemoveConnection}
        onCancel={() => setRemoveModal(false)}
      />
    </div>
  );
}