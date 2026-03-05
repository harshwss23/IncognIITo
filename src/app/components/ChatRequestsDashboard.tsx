import React, { useEffect, useState } from 'react';
import { MessageCircle, MessageSquare, User, Check, Shield } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';

export function ChatRequestsDashboard() {
  const colors = useThemeColors();

  const [connectionRequests, setConnectionRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // ✅ FETCH REQUESTS FROM API
  const fetchRequests = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/requests/incoming", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setConnectionRequests(json.data.requests || []);
      } else {
        setConnectionRequests([]);
      }

    } catch (err) {
      console.error("Fetch requests error:", err);
      setConnectionRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

// ✅ ACCEPT REQUEST
  const handleAccept = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/requests/${id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Good practice to include
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({})); // Safely parse JSON

      if (!res.ok || !json.success) {
        console.error("Backend refused accept:", json);
        alert(`Failed to connect: ${json.message || "Server error"}`);
        return; // 🛑 Stop here! Don't remove the card from the UI
      }

      // ✅ Only remove from UI if the backend actually confirmed success
      setConnectionRequests(prev => prev.filter(r => r.id !== id));

    } catch (err) {
      console.error("Accept network error:", err);
      alert("A network error occurred while trying to connect.");
    }
  };

  // ✅ REJECT REQUEST
  const handleReject = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/requests/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        console.error("Backend refused reject:", json);
        alert(`Failed to decline: ${json.message || "Server error"}`);
        return; 
      }

      setConnectionRequests(prev => prev.filter(r => r.id !== id));

    } catch (err) {
      console.error("Reject network error:", err);
    }
  };

  return (
    <div className={`w-full h-full flex ${colors.bgSecondary} transition-colors duration-300`}>

      {/* --- LEFT SIDEBAR (UNCHANGED UI) --- */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-blue-500/20 p-6 flex flex-col transition-colors z-20">

        <div className="mb-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">I</div>
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-slate-900 dark:text-white">Incogn</span>
            <span className="text-blue-600 dark:text-blue-400">IIT</span>
            <span className="text-slate-900 dark:text-white">o</span>
          </h2>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 shadow-sm">
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-md">
                {connectionRequests.length}
              </span>
            </div>
            <span className="font-semibold text-sm">Chat Requests</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all group">
            <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Current Chats</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all group">
            <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Profile</span>
          </button>
        </nav>
      </div>

      {/* --- MAIN CONTENT (UI EXACT SAME) --- */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden">

        <div className="h-20 border-b border-slate-200 dark:border-white/10 px-8 flex items-center bg-white/80 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Connection Requests
            </h3>
            <p className="text-slate-500 dark:text-blue-200/60 text-sm">
              Find your perfect study partner or project collaborator.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {connectionRequests.map((request) => (
                <div
                  key={request.id}
                  className="group relative bg-white dark:bg-[#0F172A] rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                >

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10">
                        <Shield className="w-6 h-6 text-slate-400 dark:text-white/30" />
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm">
                          {request.sender_email || "Anonymous"}
                        </h4>
                        <p className="text-slate-400 dark:text-blue-300/50 text-xs font-mono">
                          Anonymous
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-green-600 dark:text-green-400">
                        {request.sender?.matchScore || 0}%
                      </span>
                      <span className="text-[10px] text-green-600/70 uppercase font-bold tracking-wider">
                        Match
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 flex-1">
                    <p className="text-slate-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Common Interests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(request.sharedTags || []).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-blue-900/20 border border-slate-200 dark:border-blue-500/20 text-slate-600 dark:text-blue-300 text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-red-300 border border-slate-200 dark:border-red-500/20 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      Decline
                    </button>

                    <button
                      onClick={() => handleAccept(request.id)}
                      className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Connect
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}