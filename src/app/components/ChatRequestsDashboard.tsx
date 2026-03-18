import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, MessageSquare, User, Check, Shield } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { authFetch } from '@/services/auth';

export function ChatRequestsDashboard() {
  const colors = useThemeColors();
  const navigate = useNavigate();

  const [connectionRequests, setConnectionRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ FETCH REQUESTS FROM API
  const fetchRequests = async () => {
    try {
      setLoading(true);

      const res = await authFetch('/api/requests/incoming');

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
      const res = await authFetch(`/api/requests/${id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Good practice to include
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
      const res = await authFetch(`/api/requests/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

      {/* --- LEFT SIDEBAR --- */}
      <div className="w-80 flex flex-col border-r z-20 transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">

        <div className="h-24 flex items-center px-8">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-slate-900 dark:text-white">Incogn</span>
            <span className="text-blue-500">IIT</span>
            <span className="text-slate-900 dark:text-white">o</span>
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all duration-300 group bg-blue-50 dark:bg-gradient-to-r dark:from-blue-600/20 dark:to-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-white">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Chat Requests</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/30">
              {connectionRequests.length}
            </span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all group"
          >
            <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Profile</span>
          </button>
        </nav>
      </div>

      {/* --- MAIN CONTENT (UI EXACT SAME) --- */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden">

        <div className="h-24 px-10 flex items-center justify-between z-10 border-b backdrop-blur-sm bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Connection Requests
            </h3>
            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
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
                      <div className="relative w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 overflow-hidden">
                        {request.sender_avatar_url ? (
                          <img
                            src={request.sender_avatar_url}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-400 dark:text-white/30" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm">
                          {request.sender_display_name || request.sender_email?.split('@')[0] || "Anonymous"}
                        </h4>
                        <p className="text-slate-400 dark:text-blue-300/50 text-xs font-mono">
                          {/* Anonymous */}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-green-600 dark:text-green-400">
                        {request.matchScore || 0}%
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