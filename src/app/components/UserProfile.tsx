import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, X, LogOut, Camera, Plus, Loader2, AlertCircle, Check, Search, Flag, MoreVertical, Eye, Trash2, ImagePlus } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { ApiError, clearAuthTokens } from '@/services/auth';
import { getUserProfile, updateUserProfile, uploadAvatar, removeAvatar, UserProfile as UserProfileModel } from '@/services/user';
import { INTERESTS } from '@/app/constants/interests';
import { useGlobalCleanup } from '../hooks/useGlobalCleanup';

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

  const hasRatings = rating > 0;
  const ratingFeedback = !hasRatings
    ? 'Not rated yet'
    : rating > 4.5
    ? 'Excellent'
    : rating >= 4
    ? 'Good'
    : rating >= 3
    ? 'Average'
    : 'Try to improve';
  const isHighReportRisk = totalReports > 10;

  if (loading) {
    return (
      <div className={`w-full min-h-[100dvh] flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4 text-lg font-bold">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={isDark ? 'text-white' : 'text-slate-800'}>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    // FIX 1: Strict h-[100dvh] instead of min-h-[100dvh]
    <div className={`w-full h-[100dvh] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden transition-colors duration-500 no-scrollbar ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>

      {/* LEFT PANEL */}
      {/* FIX 2: Added min-h-0 to allow the flex child to scroll its overflow on desktop */}
      <div className={`w-full lg:w-[380px] xl:w-[420px] flex flex-col shrink-0 border-b lg:border-b-0 lg:border-r shadow-sm z-20 lg:h-full lg:overflow-y-auto min-h-0 no-scrollbar
        ${isDark ? 'bg-[#0F172A] border-white/5' : 'bg-white border-slate-200'}`}>
        
        {/* Cover & Avatar Area */}
        <div className="relative shrink-0">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          {/* Responsive cover height */}
          <div className="h-[140px] sm:h-[188px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
          
          {/* Responsive avatar positioning */}
          <div className="absolute -bottom-14 sm:-bottom-16 w-full flex justify-center">
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 shadow-2xl relative ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
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
                  <img src={profile.avatarUrl} alt={displayName || 'Profile'} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                ) : (
                  <User className={`w-10 h-10 sm:w-12 sm:h-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  {avatarUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">{profile?.avatarUrl ? 'Photo' : 'Set Photo'}</span>
                    </>
                  )}
                </div>
              </button>

              {profile?.avatarUrl && (
                <div ref={avatarMenuRef} className="absolute -right-1 sm:-right-2 top-2">
                  <button
                    type="button"
                    onClick={() => setAvatarMenuOpen((prev) => !prev)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-colors shadow-lg ${
                      isDark
                        ? 'bg-slate-800 border-white/20 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    aria-label="Avatar menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {avatarMenuOpen && (
                    <div
                      className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl z-[60] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 ${
                        isDark ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarViewerOpen(true);
                          setAvatarMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 transition-colors ${
                          isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Eye className="w-4 h-4 text-blue-500" />
                        View profile picture
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          avatarInputRef.current?.click();
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 transition-colors ${
                          isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <ImagePlus className="w-4 h-4 text-emerald-500" />
                        Change profile picture
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 transition-colors border-t ${
                          isDark ? 'hover:bg-red-500/10 text-red-400 border-white/5' : 'hover:bg-red-50 text-red-600 border-slate-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete picture
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Info Form */}
        <div className="px-6 sm:px-8 pt-20 sm:pt-24 pb-8 space-y-8 flex-1">
          <div className="space-y-3">
            <label className={`text-xs font-bold uppercase tracking-wider ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full px-5 py-4 rounded-2xl text-base font-bold outline-none border-2 transition-all focus:ring-4
              ${isDark
                ? 'bg-[#1E293B] border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
              placeholder="Enter your anonymous name"
            />
          </div>
        </div>

        {/* Action Buttons (Left Panel) */}
        <div className="p-6 sm:p-8 border-t border-inherit space-y-3 mt-auto shrink-0">
          <button
            onClick={() => navigate('/homepage')}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all hover:scale-[1.02] active:scale-[0.98]
            ${isDark
              ? 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10'
              : 'border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-200 bg-white'
            }`}
          >
            Back to Home
          </button>

          <button
            onClick={handleLogout}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all hover:scale-[1.02] active:scale-[0.98]
            ${isDark
              ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
              : 'border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 bg-white'
            }`}
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Content & Interests */}
      {/* FIX 3: Added min-h-0 here to ensure flex-1 doesn't scale infinitely */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-10 lg:overflow-y-auto min-h-0 relative z-10 no-scrollbar">
        
        {/* Header & Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 lg:mb-10 shrink-0">
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Profile Overview
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-white shadow-lg transition-all
            hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2
            ${isDark ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-900/40' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-slate-900/20'}
            ${saving ? 'opacity-70 cursor-not-allowed scale-100' : ''}`}
          >
            {saving ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Check className="w-5 h-5 sm:w-6 sm:h-6" />}
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>

        {/* Toast Notifications */}
        {(error || success) && (
          <div className={`mb-6 sm:mb-8 rounded-2xl p-4 sm:p-5 text-sm sm:text-base font-bold flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-4 shrink-0
            ${error
              ? isDark ? 'bg-red-900/20 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200'
              : isDark ? 'bg-emerald-900/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Check className="w-5 h-5 shrink-0" />}
            <span>{error || success}</span>
          </div>
        )}

        {/* Rating And Reports Summary */}
        <div className={`shrink-0 p-5 sm:p-6 lg:p-8 rounded-[2rem] border mb-8 lg:mb-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 ${isDark ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`rounded-2xl border p-5 sm:p-6 transition-colors ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 sm:mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Star Rating
            </p>
            <div className={`text-4xl sm:text-5xl font-black tracking-tight flex items-baseline ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {rating.toFixed(1)}<span className="text-2xl sm:text-3xl text-yellow-500 ml-2 -translate-y-1">★</span>
            </div>
            <p className={`mt-2 sm:mt-3 text-xs sm:text-sm font-bold uppercase tracking-wider ${
              !hasRatings
                ? isDark
                  ? 'text-slate-500'
                  : 'text-slate-400'
                : rating > 4.5
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

          <div className={`rounded-2xl border p-5 sm:p-6 transition-colors ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Flag className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Reports
              </p>
            </div>
            <div className={`text-4xl sm:text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {totalReports}
            </div>
            <p className={`mt-2 sm:mt-3 text-xs sm:text-sm font-semibold ${isHighReportRisk ? 'text-red-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {isHighReportRisk
                ? 'Warning: High chance of getting banned.'
                : 'Report count is within a safe range.'}
            </p>
          </div>
        </div>

        {/* Interests Section */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:gap-10 shrink-0 mb-8">
          
          {/* Your Interests (Selected) */}
          <div className={`rounded-[2rem] border p-6 sm:p-8 flex flex-col ${isDark ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Your Interests</h3>
              <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider px-3 sm:px-4 py-1.5 sm:py-2 rounded-full w-fit ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {interests.length} Selected
              </span>
            </div>
            
            {interests.length === 0 ? (
              <div className={`flex-1 flex flex-col items-center justify-center py-10 sm:py-16 border-2 border-dashed rounded-3xl ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                <p className="font-semibold text-sm sm:text-base">No interests added yet.</p>
                <p className="text-xs sm:text-sm mt-1">Discover and add tags below!</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`group flex items-center gap-2 pl-4 sm:pl-5 pr-2 py-2 sm:py-2.5 rounded-full border-2 transition-all hover:scale-[1.03] active:scale-[0.97]
                      ${isDark ? 'bg-blue-600/10 border-blue-500/30 text-blue-300 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400' 
                               : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-red-50 hover:border-red-200 hover:text-red-600'}`}
                  >
                    <span className="font-bold text-sm sm:text-base">{interest}</span>
                    <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors
                      ${isDark ? 'bg-blue-500/20 group-hover:bg-red-500/20' : 'bg-white group-hover:bg-red-100'}`}>
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Discover Interests (Unselected + Search) */}
          <div className={`rounded-[2rem] border p-6 sm:p-8 ${isDark ? 'bg-slate-900/50 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Discover Interests</h3>
              
              {/* Search Bar */}
              <div className={`relative flex items-center w-full sm:w-64 lg:w-72 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm sm:text-base font-medium outline-none border-2 transition-all focus:ring-4
                    ${isDark ? 'bg-[#0F172A] border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder:text-slate-500' 
                             : 'bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-500/20 text-slate-900 placeholder:text-slate-400 bg-white'}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-2.5 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              {availableInterests.length === 0 ? (
                <p className={`w-full text-center py-10 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {searchQuery ? 'No matching interests found.' : 'You have selected all available interests! 🎉'}
                </p>
              ) : (
                availableInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`group flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border transition-all hover:scale-[1.03] active:scale-[0.97]
                      ${isDark ? 'bg-[#0F172A] border-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-blue-300 hover:bg-blue-500/5' 
                               : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50'}`}
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50 group-hover:opacity-100" />
                    <span className="font-semibold text-sm sm:text-base">{interest}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Viewer Modal */}
      {avatarViewerOpen && profile?.avatarUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className={`max-w-xl w-full rounded-[2rem] border p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Profile Picture</h3>
              <button
                type="button"
                onClick={() => setAvatarViewerOpen(false)}
                className={`p-2.5 rounded-full transition-colors ${isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-inner">
              <img src={profile.avatarUrl} alt={displayName || 'Profile'} className="w-full max-h-[60vh] sm:max-h-[70vh] object-contain bg-black/40" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}