import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, X, LogOut, Camera, Plus, Loader2, AlertCircle, Check, Search, Flag, MoreVertical, Eye, Trash2, ImagePlus } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ApiError, clearAuthTokens } from '@/services/auth';
import { getUserProfile, updateUserProfile, uploadAvatar, removeAvatar, UserProfile as UserProfileModel } from '@/services/user';
import { INTERESTS } from '@/app/constants/interests';

export function UserProfile() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileModel | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [rating, setRating] = useState(0);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!avatarMenuRef.current) return;
      if (!avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateUserProfile({ displayName, interests });
      setProfile((prev) => (prev ? { ...prev, displayName, interests } : prev));
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000); // Auto-hide success message
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

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      e.target.value = '';
      return;
    }

    try {
      setAvatarUploading(true);
      setError('');
      setSuccess('');

      const avatarUrl = await uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setAvatarMenuOpen(false);
    } catch (err: unknown) {
      console.error('Avatar upload error:', err);
      if (err instanceof ApiError) {
        handleAuthFailure(err.status);
        setError(err.message || 'Failed to upload profile picture');
      } else {
        setError('Failed to upload profile picture');
      }
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    const confirmed = window.confirm('Delete your current profile picture?');
    if (!confirmed) return;

    try {
      setAvatarUploading(true);
      setError('');
      setSuccess('');
      await removeAvatar();
      setProfile((prev) => (prev ? { ...prev, avatarUrl: '' } : prev));
      setSuccess('Profile picture removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setAvatarMenuOpen(false);
      setAvatarViewerOpen(false);
    } catch (err: unknown) {
      console.error('Avatar remove error:', err);
      if (err instanceof ApiError) {
        handleAuthFailure(err.status);
        setError(err.message || 'Failed to delete profile picture');
      } else {
        setError('Failed to delete profile picture');
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  // Filtered lists for the new UI
  const availableInterests = INTERESTS.filter(
    (interest) => !interests.includes(interest) && interest.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ratingFeedback =
    rating > 4.5 ? 'Excellent' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : 'Try to improve';
  const isHighReportRisk = totalReports > 10;

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-3 text-lg font-semibold">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className={isDark ? 'text-white' : 'text-slate-800'}>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>

      {/* LEFT PANEL - Identity & Settings */}
      <div className={`w-[380px] flex flex-col border-r shadow-sm z-10 ${isDark ? 'bg-[#0F172A] border-white/5' : 'bg-white border-slate-200'}`}>
        
        {/* Cover & Avatar Area */}
        <div className="relative">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          {/* MATH FIX: Changed h-40 to h-[188px] so the avatar top edge hits exactly 124px down */}
          <div className="h-[188px] bg-gradient-to-br from-blue-600 to-indigo-700" />
          <div className="absolute -bottom-16 w-full flex justify-center">
            <div className={`w-32 h-32 rounded-full p-1.5 shadow-xl relative ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
              <button
                type="button"
                onClick={() => {
                  if (!profile?.avatarUrl) {
                    avatarInputRef.current?.click();
                  }
                }}
                className={`w-full h-full rounded-full relative flex items-center justify-center group cursor-pointer overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={displayName || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  <User className={`w-12 h-12 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-xs font-bold">{profile?.avatarUrl ? 'Photo' : 'Set Photo'}</span>
                    </>
                  )}
                </div>
              </button>

              {profile?.avatarUrl && (
                <div ref={avatarMenuRef} className="absolute -right-2 top-2">
                  <button
                    type="button"
                    onClick={() => setAvatarMenuOpen((prev) => !prev)}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                      isDark
                        ? 'bg-slate-900/90 border-white/20 text-slate-200 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    aria-label="Avatar menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {avatarMenuOpen && (
                    <div
                      className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-30 overflow-hidden ${
                        isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarViewerOpen(true);
                          setAvatarMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${
                          isDark ? 'hover:bg-white/5 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        View profile picture
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          avatarInputRef.current?.click();
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${
                          isDark ? 'hover:bg-white/5 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <ImagePlus className="w-4 h-4" />
                        Change profile picture
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 ${
                          isDark ? 'hover:bg-red-500/10 text-red-300' : 'hover:bg-red-50 text-red-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete profile picture
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Info Form */}
        {/* MATH FIX: Changed pt-20 to pt-24 to maintain proper spacing below the lowered avatar */}
        <div className="flex-1 px-8 pt-24 space-y-8 overflow-y-auto">
          <div className="space-y-3">
            <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-4 py-3.5 rounded-xl text-base font-semibold outline-none border-2 transition-all
              ${isDark
                ? 'bg-[#1E293B] border-slate-700 text-white focus:border-blue-500 focus:bg-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white'
              }`}
              placeholder="Enter your name"
            />
          </div>
        </div>

        {/* Logout */}
        <div className="p-6 border-t border-inherit space-y-3">
          <button
            onClick={() => navigate('/homepage')}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors
            ${isDark
              ? 'border-blue-500/20 text-blue-300 hover:bg-blue-500/10'
              : 'border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200'
            }`}
          >
            Back to Home
          </button>

          <button
            onClick={handleLogout}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-colors
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

      {/* RIGHT PANEL - Content & Interests */}
      <div className="flex-1 flex flex-col p-10 overflow-y-auto relative">
        
        {/* Header & Global Actions */}
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Profile Overview
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all
            hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2
            ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-900 hover:bg-slate-800'}
            ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Toast Notifications */}
        {(error || success) && (
          <div className={`mb-6 rounded-xl p-4 text-sm font-medium flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-4
            ${error
              ? isDark ? 'bg-red-900/20 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200'
              : isDark ? 'bg-emerald-900/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {error ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            <span className="text-base">{error || success}</span>
          </div>
        )}

        {/* Rating And Reports Summary */}
        <div className={`p-8 rounded-3xl border mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6 ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`rounded-2xl border p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Star Rating
            </p>
            <div className={`text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {rating.toFixed(1)}<span className="text-3xl text-yellow-500 ml-2">★</span>
            </div>
            <p className={`mt-3 text-sm font-bold uppercase tracking-wider ${
              rating > 4.5
                ? 'text-emerald-500'
                : rating >= 4
                ? 'text-blue-500'
                : rating >= 3
                ? 'text-amber-500'
                : 'text-red-500'
            }`}>
              {ratingFeedback}
            </p>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <Flag className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Reports
              </p>
            </div>
            <div className={`mt-3 text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {totalReports}
            </div>
            <p className={`mt-3 text-sm ${isHighReportRisk ? 'text-red-500 font-semibold' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isHighReportRisk
                ? 'Warning: High chance of getting banned if this keeps increasing.'
                : 'Report count is currently within a safe range.'}
            </p>
          </div>
        </div>

        {/* Interests Section */}
        <div className="grid grid-cols-1 gap-8 flex-1">
          
          {/* Your Interests (Selected) */}
          <div className={`rounded-3xl border p-8 flex flex-col ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Your Interests</h3>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {interests.length} Selected
              </span>
            </div>
            
            {interests.length === 0 ? (
              <div className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-2xl ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                <p>No interests added yet. Discover some below!</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`group flex items-center gap-2 pl-4 pr-2 py-2.5 rounded-full border-2 transition-all hover:scale-105
                      ${isDark ? 'bg-blue-600/10 border-blue-500/50 text-blue-100 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400' 
                               : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-red-50 hover:border-red-200 hover:text-red-600'}`}
                  >
                    <span className="font-medium">{interest}</span>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors
                      ${isDark ? 'bg-blue-500/20 group-hover:bg-red-500/20' : 'bg-white group-hover:bg-red-100'}`}>
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Discover Interests (Unselected + Search) */}
          <div className={`rounded-3xl border p-8 ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Discover Interests</h3>
              
              {/* Search Bar */}
              <div className={`relative flex items-center w-64 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                <Search className="w-4 h-4 absolute left-3" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-colors
                    ${isDark ? 'bg-[#0F172A] border-slate-700 focus:border-slate-500 text-white' 
                             : 'bg-slate-50 border-slate-200 focus:border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
              {availableInterests.length === 0 ? (
                <p className={`w-full text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {searchQuery ? 'No matching interests found.' : 'You have selected all available interests!'}
                </p>
              ) : (
                availableInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:scale-105
                      ${isDark ? 'bg-[#0F172A] border-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-blue-300' 
                               : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}
                  >
                    <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                    <span className="font-medium">{interest}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {avatarViewerOpen && profile?.avatarUrl && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-6">
          <div className={`max-w-xl w-full rounded-2xl border p-5 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Profile Picture</h3>
              <button
                type="button"
                onClick={() => setAvatarViewerOpen(false)}
                className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Close
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <img src={profile.avatarUrl} alt={displayName || 'Profile'} className="w-full max-h-[70vh] object-contain bg-black/20" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}