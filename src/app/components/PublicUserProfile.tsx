// Added page to view other person's profile.
// This will be read-only
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, ShieldCheck, MessageCircle, Award, Flag, User } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch } from "@/services/auth";

type PublicUser = {
  id: number;
  display_name: string;
  verified: boolean;
  avatar_url: string | null;
  interests: string[] | null;
  total_chats: number | string | null;
  total_reports: number | string | null;
  rating: number | string | null;
};

export function PublicUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) {
        setError("Missing user id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await authFetch(`/api/users/profile/${id}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.success) {
          setError(json.message || "Failed to load profile");
          setProfile(null);
          return;
        }

        setProfile(json.data.user as PublicUser);
      } catch {
        setError("Failed to load profile");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [id]);

  const name = useMemo(() => {
    const n = (profile?.display_name || "").trim();
    return n || "User";
  }, [profile]);

  const totalChats = useMemo(() => {
    const value = Number(profile?.total_chats ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [profile]);

  const ratingValue = useMemo(() => {
    const value = Number(profile?.rating ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [profile]);

  const totalReports = useMemo(() => {
    const value = Number(profile?.total_reports ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [profile]);

  const interestList = profile?.interests || [];

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-[#020617]" : "bg-slate-50"}`}>
        <div className="flex items-center gap-3 text-blue-500 font-semibold">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex overflow-hidden transition-colors duration-500 ${isDark ? "bg-[#020617]" : "bg-slate-50"}`}>
      <div className={`w-[380px] flex flex-col border-r shadow-sm z-10 ${isDark ? "bg-[#0F172A] border-white/5" : "bg-white border-slate-200"}`}>
        <div className="relative">
          <div className="h-40 bg-gradient-to-br from-blue-600 to-indigo-700" />
          <div className="absolute -bottom-16 w-full flex justify-center">
            <div className={`w-32 h-32 rounded-full p-1.5 shadow-xl ${isDark ? "bg-[#0F172A]" : "bg-white"}`}>
              <div className={`w-full h-full rounded-full relative flex items-center justify-center overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-8 pt-20 space-y-8 overflow-y-auto">
          <div className="space-y-2 text-center pb-6 border-b border-dashed border-slate-300 dark:border-slate-700">
            <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {name}
            </h2>
            <div className="flex items-center justify-center gap-2">
              {profile?.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
              <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Community member
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-8 pb-6 border-b border-dashed border-slate-300 dark:border-slate-700">
            <div className="flex flex-col items-center">
              <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Chats</span>
              <div className="flex items-center gap-1.5 mt-1">
                <MessageCircle className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{totalChats}</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Reports</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Flag className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                <span className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>{totalReports}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-inherit">
          <button
            onClick={() => navigate("/chat")}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors ${
              isDark
                ? "border-blue-500/20 text-blue-300 hover:bg-blue-500/10"
                : "border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200"
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Chat
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-10 overflow-y-auto relative">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
            Profile Overview
          </h1>
        </div>

        {error ? (
          <div
            className={`mb-6 rounded-xl p-4 text-sm font-medium border shadow-sm ${
              isDark ? "bg-red-900/20 text-red-300 border-red-500/30" : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {error}
          </div>
        ) : (
          <>
            <div className={`p-8 rounded-3xl border mb-10 flex items-center justify-between relative overflow-hidden ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="space-y-2 z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isDark ? "bg-yellow-500/10 text-yellow-500" : "bg-yellow-100 text-yellow-600"}`}>
                    <Award className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Community Reputation</h3>
                </div>
                <p className={`text-base ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Calculated from community feedback and sessions.
                </p>
              </div>

              <div className="text-right z-10">
                <div className={`text-6xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  {ratingValue.toFixed(1)}<span className="text-4xl text-yellow-500 ml-2">★</span>
                </div>
                <div className="text-emerald-500 font-bold mt-2 text-sm uppercase tracking-wider">
                  Public Standing
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 flex-1">
              <div className={`rounded-3xl border p-8 flex flex-col ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Interests</h3>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {interestList.length} Selected
                  </span>
                </div>

                {interestList.length === 0 ? (
                  <div className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-2xl ${isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    <p>No interests added yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {interestList.map((interest) => (
                      <span
                        key={interest}
                        className={`flex items-center gap-2 pl-4 pr-4 py-2.5 rounded-full border-2 ${
                          isDark ? "bg-blue-600/10 border-blue-500/50 text-blue-100" : "bg-blue-50 border-blue-200 text-blue-800"
                        }`}
                      >
                        <span className="font-medium">{interest}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
