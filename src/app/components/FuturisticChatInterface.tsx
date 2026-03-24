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
  ArrowLeft,
  ChevronLeft,
  Smile,
  Trash2
} from "lucide-react";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, ensureValidAccessToken } from "@/services/auth";
import { useNavigate } from "react-router-dom";
import { useGlobalCleanUp } from "../hooks/useGlobalCleanup";
import { ThemeToggle } from "./ThemeToggle";
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
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : Info;
        const colorCls =
          t.type === "success"
            ? isDark ? "bg-emerald-900/90 border-emerald-500/30 text-emerald-200 shadow-emerald-900/40" : "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100"
            : t.type === "error"
              ? isDark ? "bg-red-900/90 border-red-500/30 text-red-200 shadow-red-900/40" : "bg-red-50 border-red-200 text-red-800 shadow-red-100"
              : isDark ? "bg-blue-900/90 border-blue-500/30 text-blue-200 shadow-blue-900/40" : "bg-blue-50 border-blue-200 text-blue-800 shadow-blue-100";
        return (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold pointer-events-auto animate-in slide-in-from-top-4 sm:slide-in-from-right-4 fade-in duration-300 ${colorCls}`}>
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-[2rem] border shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-300 ${isDark ? "bg-[#0F172A] border-white/10" : "bg-white border-slate-200"}`}>
        <h3 className={`text-xl sm:text-2xl font-black mb-2 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
        <p className={`text-sm sm:text-base mb-6 leading-relaxed font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>{desc}</p>
        {children}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
          <button onClick={onConfirm} disabled={loading}
            className={`flex-[2] py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl active:scale-[0.98] ${loading ? "opacity-60 cursor-not-allowed" : ""} ${confirmColor || "bg-red-600 hover:bg-red-500 shadow-red-600/20"}`}>
            {loading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={loading}
            className={`flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold border-2 transition-all active:scale-[0.98] ${isDark ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"}`}>
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
    weekday: "short", month: "short", day: "numeric",
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

  // Mobile sidebar state logic
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

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

  // Clear Chat
  const [clearChatModal, setClearChatModal] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (msg: string, type: ToastType = "info") => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // Typing status
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Emoji Picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeFriendRef = useRef<any>(null);
  useEffect(() => { activeFriendRef.current = activeFriend; }, [activeFriend]);

  const safeStr = (v: any) => (v === null || v === undefined ? "" : String(v));
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Click outside 3-dot menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenFor(null);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
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
          if (list.length > 0 && window.innerWidth >= 768) {
            // Only auto-select first chat on desktop to prevent forced view swap on mobile
            setActiveFriend(list[0]);
            setIsMobileSidebarOpen(false);
          }
          if (!socket.connected) socket.connect();
          list.forEach((f: any) => {
            if (f.chat_id) socket.emit("join_chat", { chatId: f.chat_id });
          });
        }
      } finally { setLoading(false); }
    };
    init();

    const handleTypingStatus = ({ chatId, userId, isTyping }: any) => {
      setTypingStatus(prev => ({ ...prev, [safeStr(chatId)]: isTyping }));
    };

    socket.on("typing_status", handleTypingStatus);

    return () => {
      socket.off("new_message");
      socket.off("typing_status", handleTypingStatus);
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
    if (!myId) return;

    const handleNewMsg = (msg: any) => {
      const msgChatId = safeStr(msg.chatId);
      const currentActiveChatId = safeStr(activeFriendRef.current?.chat_id);

      setMutualFriends(prev => {
        const idx = prev.findIndex(f => safeStr(f.chat_id) === msgChatId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const [bumped] = updated.splice(idx, 1);
        bumped.last_message = msg.text;
        bumped.last_message_time = new Date().toISOString();
        return [bumped, ...updated];
      });

      if (msgChatId !== currentActiveChatId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msgChatId]: (prev[msgChatId] || 0) + 1,
        }));
        return;
      }

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
  }, [myId]);

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

    setMutualFriends(prev => {
      const idx = prev.findIndex(f => safeStr(f.chat_id) === safeStr(activeFriend.chat_id));
      if (idx === -1) return prev;
      const updated = [...prev];
      const [bumped] = updated.splice(idx, 1);
      bumped.last_message = message;
      bumped.last_message_time = now.toISOString();
      return [bumped, ...updated];
    });

    // Stop typing immediately when sending
    socket.emit("stop_typing", { chatId: activeFriend.chat_id });
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    // Focus back to input after choosing emoji if you want, but for now just append
  };

  const handleInputChange = (val: string) => {
    setMessage(val);
    if (!activeFriend?.chat_id) return;

    // Send typing event
    socket.emit("typing", { chatId: activeFriend.chat_id });

    // Clear existing timeout
    const cid = safeStr(activeFriend.chat_id);
    if (typingTimeoutRef.current[cid]) {
      clearTimeout(typingTimeoutRef.current[cid]);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current[cid] = setTimeout(() => {
      socket.emit("stop_typing", { chatId: activeFriend.chat_id });
    }, 2000);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Switch active chat & clear unread
  const openChat = (f: any) => {
    setActiveFriend(f);
    setMenuOpenFor(null);
    setIsMobileSidebarOpen(false); // Hide sidebar on mobile when chat opens
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
        if (remaining.length === 0) setIsMobileSidebarOpen(true);
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

  const handleClearChat = async () => {
    if (!activeFriend?.chat_id) return;
    setClearLoading(true);
    try {
      const res = await authFetch(`/api/chats/${activeFriend.chat_id}/messages`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMessages([]);
        setMutualFriends(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(f => safeStr(f.chat_id) === safeStr(activeFriend.chat_id));
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], last_message: null, last_message_time: null };
          }
          return updated;
        });
        showToast("Chat history cleared.", "success");
        setClearChatModal(false);
      } else {
        const json = await res.json().catch(() => ({}));
        showToast(json.message || "Failed to clear chat.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setClearLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className={`h-[100dvh] w-full flex flex-col items-center justify-center transition-colors duration-500 ${isDark ? "bg-[#020617]" : "bg-slate-50"}`}>
        <Loader2 className={`w-10 h-10 animate-spin mb-4 ${isDark ? "text-blue-500" : "text-blue-600"}`} />
        <p className={`font-bold tracking-tight ${isDark ? "text-slate-300" : "text-slate-600"}`}>Establishing Secure Connection...</p>
      </div>
    );
  }

  return (
    // MAIN WRAPPER: Scroll-safe locked height
    <div className={`flex h-[100dvh] w-full overflow-hidden transition-colors duration-500 no-scrollbar ${isDark ? "bg-[#0B1121] text-slate-200" : "bg-slate-50 text-slate-900"}`}>
      <ToastContainer toasts={toasts} isDark={isDark} />

      {/* ── Sidebar (List View) ────────────────────────────────────── */}
      <div className={`flex-col border-r shrink-0 transition-all duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'flex w-full md:w-80 lg:w-[380px]' : 'hidden md:flex md:w-80 lg:w-[380px]'}
        ${isDark ? "border-white/5 bg-[#0F172A]" : "border-slate-200 bg-white"}`}
      >
        <div className={`h-16 md:h-20 flex items-center justify-between px-5 md:px-6 border-b shrink-0 ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className={`text-lg md:text-xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Connections</h2>
          </div>

          {/* ✅ YAHAN THEME TOGGLE ADD KIYA HAI */}
          <ThemeToggle />

        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-1.5 no-scrollbar">
          {mutualFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in zoom-in-95">
              <UserMinus className={`w-12 h-12 mb-4 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
              <p className={`font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>No connections yet.</p>
              <button onClick={() => navigate('/homepage')} className={`mt-4 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                Find Matches
              </button>
            </div>
          ) : (
            mutualFriends.map((f) => {
              const info = getFriendDetails(f);
              const friendKey = safeStr(f.chat_id || f.id);
              const active = activeFriend?.chat_id === f.chat_id;
              const menuOpen = menuOpenFor === friendKey;
              const unread = unreadCounts[friendKey] || 0;

              return (
                <div key={friendKey} className="relative group">
                  <button
                    onClick={() => openChat(f)}
                    className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-2xl transition-all text-left border-2
                      ${active
                        ? (isDark ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border-blue-500/30 text-white shadow-sm" : "bg-blue-50 border-blue-200 text-blue-800 shadow-sm")
                        : (isDark ? "border-transparent hover:bg-white/5" : "border-transparent hover:bg-slate-50")}`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] overflow-hidden flex items-center justify-center font-bold text-lg shadow-sm
                        ${active ? "bg-blue-500 text-white" : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                        {info.avatarUrl
                          ? <img src={info.avatarUrl} alt={info.name} className="w-full h-full object-cover" />
                          : info.name[0]}
                      </div>
                      {unread > 0 && !active && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-md shadow-red-500/40 border-2 border-white dark:border-[#0F172A]">
                          {unread > 99 ? "99+" : unread}
                        </div>
                      )}
                    </div>

                    {/* Name + last message */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`font-bold text-sm sm:text-base truncate mb-0.5 ${unread > 0 && !active ? (isDark ? "text-white" : "text-slate-900") : ""}`}>
                        {info.name}
                      </p>
                      <p className={`text-[10px] sm:text-xs truncate font-medium ${active ? (isDark ? "text-blue-300" : "text-blue-600") : (isDark ? "text-slate-500" : "text-slate-500")}`}>
                        {typingStatus[friendKey] ? (
                          <span className="text-emerald-500 animate-pulse font-bold">typing...</span>
                        ) : (
                          f.last_message || 'No messages yet'
                        )}
                      </p>
                    </div>
                  </button>

                  {/* 3-dot trigger */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpen ? null : friendKey); }}
                    className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all
                      ${menuOpen
                        ? isDark ? "bg-white/10 text-white opacity-100" : "bg-slate-200 text-slate-700 opacity-100"
                        : "opacity-0 group-hover:opacity-100"}
                      ${active
                        ? isDark ? "text-blue-200 hover:bg-blue-500/20" : "text-blue-600 hover:bg-blue-200"
                        : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown */}
                  {menuOpen && (
                    <div
                      ref={menuRef}
                      className={`absolute right-8 top-12 sm:top-14 w-52 sm:w-56 rounded-2xl border shadow-2xl z-[100] overflow-hidden py-1.5 animate-in zoom-in-95 duration-200
                        ${isDark ? "bg-slate-900/95 backdrop-blur-xl border-white/10 shadow-black/50" : "bg-white/95 backdrop-blur-xl border-slate-200 shadow-xl"}`}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); navigate(`/users/${info.userId}`); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors
                          ${isDark ? "text-slate-200 hover:bg-white/10" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <Eye className="w-4 h-4 text-blue-500" /> View Profile
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); setModalTarget(f); setReportModal(true); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors
                          ${isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                      >
                        <AlertTriangle className="w-4 h-4" /> Report & Block
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenFor(null); setModalTarget(f); setRemoveModal(true); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors border-t ${isDark ? "border-white/5" : "border-slate-100"}
                          ${isDark ? "text-amber-400 hover:bg-amber-500/10" : "text-amber-600 hover:bg-amber-50"}`}
                      >
                        <UserMinus className="w-4 h-4" /> Remove Connection
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 md:p-6 border-t shrink-0 ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <button onClick={() => navigate("/homepage")}
            className={`w-full py-3.5 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all active:scale-[0.98] text-sm sm:text-base
              ${isDark ? "border-blue-500/20 text-blue-300 hover:bg-blue-500/10" : "border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200 bg-white"}`}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>

      {/* ── Chat Area (Main View) ─────────────────────────────────── */}
      {/* FIX 1: Added min-h-0 here */}
      <div className={`flex-1 min-h-0 flex-col relative min-w-0 isolate bg-transparent
          ${!isMobileSidebarOpen ? 'flex' : 'hidden md:flex'}`}>

        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 mix-blend-screen transition-colors ${isDark ? 'bg-blue-600' : 'bg-blue-300'}`} />
          <div className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 mix-blend-screen transition-colors ${isDark ? 'bg-purple-600' : 'bg-indigo-300'}`} />
        </div>

        {activeFriend ? (
          <>
            {/* Header */}
            <div className={`h-16 md:h-20 px-4 sm:px-6 md:px-8 flex items-center justify-between border-b shrink-0 z-20 backdrop-blur-md ${isDark ? "bg-slate-900/70 border-white/5" : "bg-white/80 border-slate-200"}`}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className={`md:hidden p-2 -ml-2 rounded-xl transition-colors ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                <div className="relative shrink-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden shadow-sm
                    ${isDark ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-indigo-500'}`}>
                    {activeInfo.avatarUrl
                      ? <img src={activeInfo.avatarUrl} alt={activeInfo.name} className="w-full h-full object-cover" />
                      : activeInfo.name[0]}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0F172A] rounded-full"></div>
                </div>
                <div className="min-w-0 pr-4">
                  <h3 className={`font-black text-base sm:text-lg truncate tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{activeInfo.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                    <span className="text-[10px] sm:text-xs text-emerald-500 font-bold uppercase tracking-widest truncate">Encrypted Link</span>
                  </div>
                </div>
              </div>

              {/* ✅ NEW: Clear Chat Button */}
              <button
                onClick={() => setClearChatModal(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-bold text-xs sm:text-sm border-2
                  ${isDark
                    ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                    : "border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"}`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>

            </div>

            {/* Messages Area */}
            {/* FIX 2: Added min-h-0 here */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 z-10 no-scrollbar">
              {messagesWithDateSeparators.length > 0 ? (
                messagesWithDateSeparators.map((item, i) => {
                  if ("type" in item && item.type === "date") {
                    return (
                      <div key={`date-${i}`} className="flex items-center justify-center my-6 sm:my-8">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border shadow-sm
                            ${isDark ? "bg-slate-800/80 border-white/10 text-slate-400 backdrop-blur-md" : "bg-white/90 border-slate-200 text-slate-500 backdrop-blur-md"}`}>
                          {item.label}
                        </div>
                      </div>
                    );
                  }
                  const msg = item as ChatMsg;
                  const isMe = msg.senderId === myId;
                  return (
                    <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl sm:rounded-[1.25rem] text-sm sm:text-base shadow-sm leading-relaxed
                            ${isMe
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm sm:rounded-tr-md shadow-blue-900/20"
                            : isDark
                              ? "bg-slate-800 text-slate-100 rounded-tl-sm sm:rounded-tl-md border border-white/5"
                              : "bg-white text-slate-800 rounded-tl-sm sm:rounded-tl-md border border-slate-100 shadow-slate-200/50"}`}>
                          {msg.text}
                        </div>
                        <span className={`text-[10px] sm:text-xs font-medium mt-1.5 px-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{msg.time}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className={`flex flex-col items-center gap-4 max-w-sm text-center p-6 sm:p-8 rounded-[2rem] border-2 border-dashed backdrop-blur-sm
                      ${isDark ? "bg-slate-900/40 border-white/10" : "bg-white/60 border-slate-200"}`}
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-inner
                      ${isDark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                      <MessageSquare className={`w-8 h-8 sm:w-10 sm:h-10 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
                    </div>
                    <div>
                      <h3 className={`font-black text-lg sm:text-xl mb-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>Say hello!</h3>
                      <p className={`text-sm sm:text-base leading-relaxed font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        You are now connected with <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{activeInfo.name}</span>. Send a message to securely start the conversation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {typingStatus[safeStr(activeFriend?.chat_id)] && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className={`px-4 py-2 rounded-2xl text-xs font-bold italic shadow-sm flex items-center gap-2
                    ${isDark ? "bg-slate-800 text-emerald-400 border border-white/5" : "bg-white text-emerald-600 border border-slate-100"}`}>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                    </div>
                    <span>{activeInfo.name} is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 sm:p-6 z-20 shrink-0 relative ${isDark ? "bg-gradient-to-t from-[#0B1121] via-[#0B1121] to-transparent" : "bg-gradient-to-t from-slate-50 via-slate-50 to-transparent"}`}>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full mb-4 right-4 sm:right-6 animate-in slide-in-from-bottom-2 fade-in duration-200 z-[100]">
                  <EmojiPicker
                    theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    lazyLoadEmojis={true}
                  />
                </div>
              )}
              <div className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-[2rem] border shadow-lg backdrop-blur-xl transition-all focus-within:ring-4
                ${isDark ? "bg-slate-900/80 border-white/10 focus-within:border-blue-500/50 focus-within:ring-blue-500/20" : "bg-white/90 border-slate-200 focus-within:border-blue-400 focus-within:ring-blue-500/20"}`}>

                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-3 rounded-2xl transition-all shrink-0 hover:bg-white/10 ${showEmojiPicker ? 'text-blue-500' : 'text-slate-400'}`}
                >
                  <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <input
                  value={message}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a secure message..."
                  className={`flex-1 bg-transparent px-2 sm:px-3 py-3 outline-none text-sm sm:text-base font-medium
                    ${isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"}`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className={`p-3 sm:p-4 rounded-2xl text-white transition-all shrink-0 active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md
                    ${isDark ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40" : "bg-blue-600 hover:bg-blue-500 shadow-blue-200"}`}
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State (Desktop Only, since mobile opens sidebar instead) */
          <div className="hidden md:flex flex-col items-center justify-center h-full z-10 animate-in fade-in zoom-in-95 duration-500">
            <div className={`flex flex-col items-center gap-5 max-w-sm text-center p-10 rounded-[2.5rem] shadow-2xl border backdrop-blur-xl
                ${isDark ? "bg-slate-900/40 border-white/5 shadow-black/50" : "bg-white/60 border-white shadow-slate-200/50"}`}
            >
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] flex items-center justify-center shadow-inner
                ${isDark ? "bg-slate-800 border border-white/5" : "bg-slate-50 border border-slate-100"}`}>
                <ShieldCheck className={`w-10 h-10 sm:w-12 sm:h-12 ${isDark ? "text-blue-500" : "text-blue-500"}`} />
              </div>
              <div>
                <h3 className={`font-black text-xl sm:text-2xl mb-2 tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>IncognIITo Secure Chat</h3>
                <p className={`text-sm sm:text-base leading-relaxed font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Select a connection from your channels on the left to view messages or start a new conversation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Report & Block Modal ───────────────────────── */}
      <ConfirmModal
        isDark={isDark} open={reportModal}
        title="Report & Block User"
        desc={`Report ${modalInfo.name} for inappropriate behavior. This will permanently block and remove your connection with them.`}
        confirmLabel="Report & Block" confirmColor="bg-red-600 hover:bg-red-500 shadow-red-600/20 text-white"
        loading={reportLoading} onConfirm={handleReportBlock}
        onCancel={() => { setReportModal(false); setReportReason(""); }}
      >
        <textarea rows={3} placeholder="Describe the issue (optional)..."
          value={reportReason} onChange={(e) => setReportReason(e.target.value)}
          className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base outline-none border-2 focus:ring-4 focus:ring-red-500/20 transition-all resize-none shadow-inner font-medium
            ${isDark ? "bg-[#0B1120] border-white/5 text-white placeholder-red-300/30 focus:border-red-500/50" : "bg-white border-red-200 text-slate-900 placeholder-red-300 focus:border-red-400"}`}
        />
      </ConfirmModal>

      {/* ── Remove Connection Modal ────────────────────── */}
      <ConfirmModal
        isDark={isDark} open={removeModal}
        title="Remove Connection"
        desc={`Are you sure you want to remove your connection with ${modalInfo.name}? This will delete all chat history and cannot be undone.`}
        confirmLabel="Remove" confirmColor="bg-amber-600 hover:bg-amber-500 shadow-amber-600/20 text-white"
        loading={removeLoading} onConfirm={handleRemoveConnection}
        onCancel={() => setRemoveModal(false)}
      />

      {/* ── Clear Chat Modal ───────────────────────── */}
      <ConfirmModal
        isDark={isDark} open={clearChatModal}
        title="Clear Chat History"
        desc={`Are you sure you want to clear the entire chat history with ${activeInfo.name}? This action cannot be undone.`}
        confirmLabel="Clear Now" confirmColor="bg-red-600 hover:bg-red-500 shadow-red-600/20 text-white"
        loading={clearLoading} onConfirm={handleClearChat}
        onCancel={() => setClearChatModal(false)}
      />
    </div>
  );
}