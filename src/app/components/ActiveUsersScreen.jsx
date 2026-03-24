import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch } from "@/services/auth";

export function ActiveUsersScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [me, setMe] = useState(null);

  // ✅ Fetch Profile (to exclude self)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch("/api/users/profile");

        const json = await res.json();
        if (json.success) setMe(json.data.user);
      } catch {}
    };

    fetchProfile();
  }, []);

  // ✅ Fetch Active Users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await authFetch("/api/users");

        const json = await res.json();

        if (json.success) {
          setUsers(json.data.users);
        }
      } catch (err) {
        console.error("Fetch users error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!me) return [];

    const list = users.filter((u) => u.id !== me.id && u.verified === true);

    if (!search.trim()) return list;

    return list.filter((u) =>
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, me, search]);

  const sendRequest = async (receiverId) => {
    try {
      const res = await authFetch("/api/requests/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId }),
      });

      const json = await res.json();

      if (json.success) {
        alert("Request sent successfully ✅");
      } else {
        alert(json.message);
      }
    } catch {
      alert("Network error");
    }
  };

  return (
    <div className={`min-h-screen p-10 ${isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Active Users</h1>
        <button
          onClick={() => navigate('/homepage')}
          className={`py-3 px-6 rounded-xl font-bold flex items-center gap-2 border-2 transition-colors
          ${isDark
            ? 'border-blue-500/20 text-blue-300 hover:bg-blue-500/10'
            : 'border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200'
          }`}
        >
          Back to Home
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-medium animate-pulse">Finding active users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl border-slate-200 dark:border-slate-800">
           <p className="text-slate-500">No other users found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => {
             const displayName = u.display_name || u.email.split('@')[0];
             const initials = (displayName.charAt(0) || 'U').toUpperCase();

             return (
              <div
                key={u.id}
                className="group relative flex flex-col p-6 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
              >
                <div 
                  className="flex items-center gap-4 mb-6 cursor-pointer"
                  onClick={() => navigate(`/profile/${u.id}`)}
                >
                  <div className="relative shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={displayName} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                        {initials}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-lg truncate group-hover:text-blue-500 transition-colors">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {u.email}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex gap-3">
                  <button
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="flex-1 py-2.5 rounded-xl border border-blue-500/30 text-blue-500 font-bold text-sm hover:bg-blue-500/10 transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => sendRequest(u.id)}
                    className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} />
                    Connect
                  </button>
                </div>
              </div>
             );
          })}
        </div>
      )}
    </div>
  );
}