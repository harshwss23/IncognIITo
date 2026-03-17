import React, { useEffect, useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch } from "@/services/auth";

export function ActiveUsersScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

    const list = users.filter((u) => u.id !== me.id);

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
      <h1 className="text-3xl font-bold mb-6">Active Users</h1>

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
        <p>Loading users...</p>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="flex justify-between items-center p-4 rounded-xl border bg-white dark:bg-slate-900"
            >
              <div>
                <p className="font-bold">{u.email}</p>
              </div>

              <button
                onClick={() => sendRequest(u.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                <UserPlus size={16} />
                Send Request
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}