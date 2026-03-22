// Added page to view other person's profile.
// This will be read-only
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, ShieldCheck, MessageCircle, Award, Flag, User } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { authFetch } from "@/services/auth";
import { useGlobalCleanup } from "../hooks/useGlobalCleanup";
import { ThemeToggle } from "./ThemeToggle"; // Import ko baaki components ke paas laga dena
type PublicUser = {
  id: number;
  email: string;
  display_name: string | null;
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
    if (profile?.display_name) return profile.display_name.trim();
    if (profile?.email) return profile.email.split("@")[0];
    return "User";
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
    // FIX 1: Changed h-full to h-[100dvh] for strict viewport locking
    <div className={`w-full h-[100dvh] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden transition-colors duration-500 ${isDark ? "bg-[#020617]" : "bg-slate-50"}`}>
      
      {/* Sidebar / Top Profile Summary */}
      <div className={`w-full lg:w-[380px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r shadow-sm z-10 ${isDark ? "bg-[#0F172A] border-white/5" : "bg-white border-slate-200"}`}>
        <div className="relative shrink-0">
          <div className="h-32 lg:h-40 bg-gradient-to-br from-blue-600 to-indigo-700" />
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

        {/* FIX 2: Added min-h-0 here to ensure the inner sidebar scrolls safely on desktop */}
        <div className="flex-1 min-h-0 px-4 sm:px-8 pt-20 pb-6 lg:pb-0 space-y-6 lg:space-y-8 lg:overflow-y-auto no-scrollbar">
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

          <div className="flex justify-center gap-4 sm:gap-8 pb-6 border-b border-dashed border-slate-300 dark:border-slate-700">
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

        <div className="p-4 sm:p-6 border-t border-inherit mt-auto shrink-0">
          <button
            onClick={() => navigate("/chat")}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors ${isDark
                ? "border-blue-500/20 text-blue-300 hover:bg-blue-500/10"
                : "border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200"
              }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Chat
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {/* FIX 3: Added min-h-0 here to protect flex-1 stretching limits */}
      {/* Main Content Area */}
      {/* FIX 3: Added min-h-0 here to protect flex-1 stretching limits */}
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-10 overflow-visible lg:overflow-y-auto relative no-scrollbar">
        
        {/* ✅ YAHAN THEME TOGGLE ADD KIYA HAI */}
        <div className="flex items-center justify-between mb-6 lg:mb-8 shrink-0">
          <h1 className={`text-2xl sm:text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
            Profile Overview
          </h1>
          <ThemeToggle />
        </div>

        {error ? (
          <div
            className={`mb-6 rounded-xl p-4 text-sm font-medium border shadow-sm shrink-0 ${isDark ? "bg-red-900/20 text-red-300 border-red-500/30" : "bg-red-50 text-red-700 border-red-200"
              }`}
          >
            {error}
          </div>
        ) : (
          <>
            <div className={`p-6 sm:p-8 rounded-3xl border mb-6 lg:mb-10 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="space-y-2 z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isDark ? "bg-yellow-500/10 text-yellow-500" : "bg-yellow-100 text-yellow-600"}`}>
                    <Award className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h3 className={`text-lg sm:text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Community Reputation</h3>
                </div>
                <p className={`text-sm sm:text-base ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Calculated from community feedback and sessions.
                </p>
              </div>

              <div className="text-left sm:text-right z-10">
                <div className={`text-5xl sm:text-6xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  {ratingValue.toFixed(1)}<span className="text-3xl sm:text-4xl text-yellow-500 ml-2">★</span>
                </div>
                <div className="text-emerald-500 font-bold mt-2 text-xs sm:text-sm uppercase tracking-wider">
                  Public Standing
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 shrink-0 mb-8">
              <div className={`rounded-3xl border p-6 sm:p-8 flex flex-col ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Interests</h3>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full w-fit ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    {interestList.length} Selected
                  </span>
                </div>

                {interestList.length === 0 ? (
                  <div className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center ${isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    <p>No interests added yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {interestList.map((interest) => (
                      <span
                        key={interest}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 text-sm sm:text-base ${isDark ? "bg-blue-600/10 border-blue-500/50 text-blue-100" : "bg-blue-50 border-blue-200 text-blue-800"
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