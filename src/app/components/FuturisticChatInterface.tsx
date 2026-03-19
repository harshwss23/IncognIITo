import React, { useEffect, useMemo, useState, useRef } from "react";
import { socket } from "@/services/socket";
import { Send, MessageSquare, ShieldCheck } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch, ensureValidAccessToken } from "@/services/auth";
import { useNavigate } from "react-router-dom";

type ChatMsg = {
  id: string | number;
  tempId?: string;
  text: string;
  senderId: string;
  time: string;
};

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
  const [profileCardOpen, setProfileCardOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);

  const safeStr = (v: any) => (v === null || v === undefined ? "" : String(v));
  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Initialize Profile & Friends
  useEffect(() => {
    const init = async () => {
      const token = await ensureValidAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch Me
        const meRes = await authFetch("/api/users/profile");
        const meJson = await meRes.json();
        const currentId = safeStr(meJson?.data?.user?.id);
        setMyId(currentId);

        // Fetch Friends
        const fRes = await authFetch("/api/requests/mutual");
        const fJson = await fRes.json();
        if (fRes.ok && fJson.success) {
          const list = fJson.data.requests || [];
          setMutualFriends(list);
          if (list.length > 0) setActiveFriend(list[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Identity Helper
  const getFriendDetails = (f: any) => {
    if (!f) return { name: "User", email: "", avatarUrl: "" };
    const amISender = safeStr(f.sender_id) === myId;
    const rawName = amISender ? f.receiver_display_name : f.sender_display_name;
    const email = amISender ? f.receiver_email : f.sender_email;
    const avatarUrl = amISender ? f.receiver_avatar_url : f.sender_avatar_url;

    return {
      name: safeStr(rawName).trim() || safeStr(email).split("@")[0] || "User",
      email: safeStr(email),
      avatarUrl: safeStr(avatarUrl),
    };
  };

  const activeInfo = useMemo(() => getFriendDetails(activeFriend), [activeFriend, myId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileCardRef.current) return;
      if (!profileCardRef.current.contains(event.target as Node)) {
        setProfileCardOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setProfileCardOpen(false);
  }, [activeFriend?.chat_id]);

  // 3. Socket & History
  useEffect(() => {
    if (!activeFriend?.chat_id) return;

    // Fetch History
    const fetchHistory = async () => {
      const res = await authFetch(`/api/chats/${activeFriend.chat_id}/messages`);
      const json = await res.json();
      if (res.ok && json.success) {
        setMessages(json.data.messages.map((m: any) => ({
          id: m.id,
          text: safeStr(m.text || m.body),
          senderId: safeStr(m.sender_id),
          time: formatTime(new Date(m.created_at)),
        })));
      }
    };

    fetchHistory();
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join_chat", { chatId: activeFriend.chat_id });

    // Handle incoming messages
    const handleNewMsg = (msg: any) => {
      if (safeStr(msg.chatId) !== safeStr(activeFriend.chat_id)) return;

      setMessages((prev) => {
        // Double message prevention logic:
        // 1. Check if ID exists (database ID)
        // 2. Check if tempId matches (my optimistic message)
        const isDuplicate = prev.some(m => 
          String(m.id) === String(msg.id) || 
          (msg.tempId && m.tempId === msg.tempId)
        );

        if (isDuplicate) {
          // Update the optimistic message with the real DB ID
          return prev.map(m => (m.tempId === msg.tempId) ? { ...m, id: msg.id, tempId: undefined } : m);
        }

        return [...prev, {
          id: msg.id,
          text: msg.text,
          senderId: safeStr(msg.senderId),
          time: msg.time
        }];
      });
    };

    socket.on("new_message", handleNewMsg);
    return () => {
      socket.off("new_message");
      socket.emit("leave_chat", { chatId: activeFriend.chat_id });
    };
  }, [activeFriend?.chat_id, myId]);

  // 4. Send Logic
  const handleSendMessage = () => {
    if (!message.trim() || !activeFriend?.chat_id) return;
    const tId = `temp-${Date.now()}`;
    
    // Optimistic Update
    const optimisticMsg: ChatMsg = {
      id: tId,
      tempId: tId,
      text: message,
      senderId: myId,
      time: formatTime(new Date()),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    socket.emit("send_message", { 
      chatId: activeFriend.chat_id, 
      text: message, 
      tempId: tId 
    });
    setMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#020617] text-blue-500">Initializing Neural Link...</div>;

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDark ? "bg-[#020617] text-slate-200" : "bg-white text-slate-900"}`}>
      {/* Sidebar */}
      <div className={`w-80 flex flex-col border-r ${isDark ? "border-white/5 bg-slate-900/40" : "border-slate-200 bg-slate-50"}`}>
        <div className="p-6 border-b border-inherit font-bold text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" /> Channels
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {mutualFriends.map((f) => {
            const info = getFriendDetails(f);
            const active = activeFriend?.chat_id === f.chat_id;
            return (
              <button key={f.id} onClick={() => setActiveFriend(f)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? "bg-blue-600 text-white shadow-lg" : "hover:bg-blue-500/10"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${active ? "bg-white/20" : "bg-blue-500/10 text-blue-500"}`}>{info.name[0]}</div>
                <div className="text-left truncate">
                  <p className="font-bold text-sm truncate">{info.name}</p>
                  <p className="text-[10px] opacity-60 truncate">{info.email}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className={`h-20 px-8 flex items-center justify-between border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
          <div className="flex items-center gap-4">
            <div className="relative" ref={profileCardRef}>
              <button
                type="button"
                onClick={() => setProfileCardOpen((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold overflow-hidden ring-2 ring-blue-500/20"
              >
                {activeInfo.avatarUrl ? (
                  <img src={activeInfo.avatarUrl} alt={activeInfo.name} className="w-full h-full object-cover" />
                ) : (
                  activeInfo.name[0]
                )}
              </button>

              {profileCardOpen && (
                <div
                  className={`absolute top-12 left-0 w-52 p-4 rounded-2xl border shadow-xl z-30 ${
                    isDark
                      ? "bg-slate-900 border-white/10"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                      {activeInfo.avatarUrl ? (
                        <img src={activeInfo.avatarUrl} alt={activeInfo.name} className="w-full h-full object-cover" />
                      ) : (
                        activeInfo.name[0]
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetUserId = activeFriend?.other_user_id ?? activeFriend?.id;
                        if (!targetUserId) return;
                        setProfileCardOpen(false);
                        navigate(`/users/${targetUserId}`);
                      }}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold">{activeInfo.name}</h3>
              <span className="text-[10px] text-emerald-500 font-bold tracking-widest animate-pulse">SECURE_LINK_ACTIVE</span>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-slate-500" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((msg, i) => {
            const isMe = msg.senderId === myId;
            return (
              <div key={msg.id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className={`px-5 py-3 rounded-2xl text-sm shadow-sm ${isMe ? "bg-blue-600 text-white rounded-tr-none" : isDark ? "bg-slate-800" : "bg-slate-100 text-slate-800"}`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">{msg.time}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6">
          <div className={`flex items-center gap-2 p-2 rounded-2xl border ${isDark ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-200"}`}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder="Type message..." className="flex-1 bg-transparent px-4 py-2 outline-none" />
            <button onClick={handleSendMessage} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}