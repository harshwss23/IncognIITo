import React, { useEffect, useState } from 'react';
import { User, Award, X, LogOut, Camera, Plus, Loader2, AlertCircle, Check } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ApiError, clearAuthTokens } from '@/services/auth';
import { getUserProfile, updateUserProfile, UserProfile as UserProfileModel } from '@/services/user';
import { INTERESTS } from '@/app/constants/interests';

export function UserProfile() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const MAX_INTERESTS = 10;

  const [profile, setProfile] = useState<UserProfileModel | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuthFailure = (status: number) => {
    if (status === 401) {
      clearAuthTokens();
      window.location.assign('/login');
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = await getUserProfile();
      setProfile(user);
      setDisplayName(user.displayName ?? '');
      setInterests(user.interests ?? []);
      setTotalReports(user.totalReports ?? 0);
      setRating(user.rating ?? 0);
    } catch (err: unknown) {
      console.error('Failed to load profile:', err);

      if (err instanceof ApiError) {
        handleAuthFailure(err.status);
        setError(err.message || 'Failed to load profile');
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateUserProfile({ displayName, interests });
      setProfile((prev) => (prev ? { ...prev, displayName, interests } : prev));
      setSuccess('Profile updated');
    } catch (err: unknown) {
      console.error('Update profile error:', err);

      if (err instanceof ApiError) {
        handleAuthFailure(err.status);
        setError(err.message || 'Failed to update profile');
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuthTokens();
    window.location.assign('/login');
  };

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#020617]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 text-lg font-semibold">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className={isDark ? 'text-white' : 'text-slate-800'}>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full flex overflow-hidden transition-colors duration-500
      ${isDark ? 'bg-[#020617]' : 'bg-white'}`}
    >

      {/* LEFT PANEL */}
      <div
        className={`w-[400px] flex flex-col border-r
        ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-slate-50 border-slate-200'}`}
      >

        {/* Cover */}
        <div className="h-48 bg-gradient-to-br from-blue-600 to-purple-600" />

        {/* Avatar */}
        <div className="px-8 -mt-20 mb-8 flex flex-col items-center">
          <div
            className={`w-40 h-40 rounded-full p-1.5 shadow-2xl
            ${isDark ? 'bg-[#0F172A]' : 'bg-slate-50'}`}
          >
            <div
              className={`w-full h-full rounded-full relative flex items-center justify-center group cursor-pointer overflow-hidden
              ${isDark ? 'bg-slate-800' : 'bg-white shadow-inner'}`}
            >
              <User className={`w-16 h-16 ${isDark ? 'text-slate-400' : 'text-slate-300'}`} />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 mb-1" />
                <span className="text-xs font-bold">Change</span>
              </div>

              {/* Plus button */}
              <button
                className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500
                flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110"
                title="Edit Profile Picture"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Edit name */}
        <div className="flex-1 px-8 space-y-6">
          {(error || success) && (
            <div
              className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 border ${
                error
                  ? isDark
                    ? 'bg-red-900/40 text-red-200 border-red-500/40'
                    : 'bg-red-50 text-red-700 border-red-200'
                  : isDark
                    ? 'bg-emerald-900/40 text-emerald-200 border-emerald-500/40'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{error || success}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              className={`text-sm font-bold uppercase tracking-wider
              ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              Display Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-4 py-4 rounded-xl text-lg font-bold outline-none border-2 transition-all
              ${isDark
                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
              }`}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform
            hover:scale-[1.02] active:scale-[0.98]
            ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-900 hover:bg-slate-800'}
            ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Logout */}
        <div className="p-8 border-t border-inherit">
          <button
            onClick={handleLogout}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors
            ${isDark
              ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
              : 'border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200'
            }`}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col p-12 overflow-y-auto">

        <h1 className={`text-3xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Profile Overview
        </h1>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <StatCard title="Total Reports" value={totalReports} isDark={isDark} />
          <StatCard title="Reputation" value={`${rating.toFixed(1)}★`} highlight isDark={isDark} />
          <StatCard title="Interests" value={interests.length} isDark={isDark} />
        </div>

        {/* Reputation */}
        <div
          className={`p-8 rounded-3xl border mb-8 flex items-center justify-between relative overflow-hidden
          ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                <Award className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Community Reputation
              </h3>
            </div>
            <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Calculated from community feedback and sessions.
            </p>
          </div>

          <div className="text-right">
            <div className={`text-7xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {rating.toFixed(1)}
              <span className="text-4xl text-yellow-500 ml-2">★</span>
            </div>
            <div className="text-green-500 font-medium mt-1">
              Excellent Standing
            </div>
          </div>
        </div>

        {/* Interests */}
        <div
          className={`rounded-3xl border p-8
          ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}
        >
          <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Interest Tags
          </h3>
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Select up to {MAX_INTERESTS} interests.
          </p>
          <div className="flex flex-wrap gap-3">
            {INTERESTS.map((interest) => {
              const selected = interests.includes(interest);
              const limitReached = !selected && interests.length >= MAX_INTERESTS;
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => {
                    setInterests((prev) => {
                      if (prev.includes(interest)) return prev.filter((item) => item !== interest);
                      if (prev.length >= MAX_INTERESTS) return prev;
                      return [...prev, interest];
                    });
                  }}
                  disabled={limitReached}
                  className={`group flex items-center gap-3 pl-5 pr-3 py-3 rounded-full border transition
                  ${selected
                    ? isDark
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-blue-50 border-blue-400 text-blue-700'
                    : limitReached
                      ? isDark
                        ? 'bg-[#0B1224] border-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : isDark
                        ? 'bg-[#020617] border-white/10 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span>{interest}</span>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs
                    ${selected
                      ? isDark
                        ? 'border-blue-300 text-blue-100'
                        : 'border-blue-500 text-blue-600'
                      : isDark
                        ? 'border-white/20 text-white/60'
                        : 'border-slate-300 text-slate-400'
                    }`}>
                    {selected ? '✓' : '+'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable Stat Card */
function StatCard({ title, value, highlight, isDark }) {
  return (
    <div
      className={`p-6 rounded-2xl border
      ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}
    >
      <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm font-semibold`}>
        {title}
      </p>
      <p
        className={`mt-2 text-4xl font-black
        ${highlight ? 'text-yellow-500' : isDark ? 'text-white' : 'text-slate-900'}`}
      >
        {value}
      </p>
    </div>
  );
}
