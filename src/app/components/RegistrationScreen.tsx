import React, { useState, useEffect } from 'react';
import { Mail, Lock, Sparkles, ArrowRight, Check, ShieldCheck, Globe, UserPlus } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { buildApiUrl } from '@/services/config';
import { useNavigate } from 'react-router-dom';
import { useGlobalCleanup } from '../hooks/useGlobalCleanup';
import { ThemeToggle } from './ThemeToggle';

export function RegistrationScreen() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!email) {
      setError('Please enter your IITK email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/auth/request-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || 'Failed to send OTP.');
        return;
      }

      setOtpSent(true);
    } catch (err) {
      setError('Network error. Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!email || !otp || !password) {
      setError('Email, password and OTP are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        const success =
          data === true ||
          data?.success === true ||
          data?.verified === true ||
          data?.status === 'ok';

        if (success) {
          window.location.assign('/login');
          return;
        }
        setError(data?.message || 'Verification failed.');
      } else {
        setError(data?.message || 'Verification failed.');
      }
    } catch (err) {
      setError('Network error. Could not verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let score = 0;
    if (password.length > 4) score++;
    if (password.length > 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    setStrength(score);
  }, [password]);

  return (
    <div
      // FIX 1: Changed to min-h-[100dvh] for mobile so keyboard doesn't squish layout, exact h-[100dvh] on desktop
      className={`w-full flex flex-col lg:flex-row min-h-[100dvh] lg:h-[100dvh] overflow-y-auto lg:overflow-hidden transition-colors duration-500 no-scrollbar ${
        isDark ? 'bg-[#020617]' : 'bg-slate-50' // Unified mobile background to match left panel
      }`}
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-10 z-50">
        <ThemeToggle />
      </div>

      {/* --- LEFT PANEL: IMMERSIVE VISUALS --- */}
      <div
        // FIX 2: Removed min-h-[50dvh]. Let it size naturally on mobile, with extra bottom padding for the overlap.
        className={`relative w-full lg:flex-1 flex flex-col justify-center lg:justify-between overflow-hidden shrink-0 
        px-6 pt-12 pb-16 sm:px-10 sm:py-16 md:px-12 lg:p-16 xl:p-20 lg:h-full
        ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}
      >
        {/* Grid Pattern */}
        <div
          className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-20' : 'opacity-40'}`}
          style={{
            backgroundImage: `radial-gradient(${isDark ? '#3b82f6' : '#94a3b8'} 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Ambient Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className={`absolute top-0 left-[-10%] sm:top-1/4 sm:left-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen opacity-60
              ${isDark ? 'bg-purple-600/20' : 'bg-purple-400/30'}`}
          />
          <div
            className={`absolute bottom-0 right-[-10%] sm:bottom-1/4 sm:right-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen opacity-60
              ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/30'}`}
          />
        </div>

        {/* Branding Content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 lg:flex-none">
          <div
            className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 shadow-2xl
            ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/30' : 'bg-white shadow-blue-200'}`}
          >
            <Sparkles className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${isDark ? 'text-white' : 'text-blue-600'}`} />
          </div>

          <h1
            className={`text-4xl sm:text-6xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[1.05] mb-4 sm:mb-6 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Create Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              Ghost Identity.
            </span>
          </h1>

          <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-md lg:max-w-lg font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Join the exclusive, anonymous network for IIT Kanpur students. No logs. No traces.
          </p>
        </div>

        {/* Feature Highlights - Hidden on very small screens to save space */}
        <div
          className={`relative z-10 mt-8 lg:mt-0 hidden sm:flex flex-wrap gap-6 sm:gap-8 lg:gap-12 p-5 sm:p-6 lg:p-8 rounded-3xl border backdrop-blur-md shadow-sm transition-all w-fit
            ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-slate-200'}`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>IITK Only</div>
              <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Verified Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: REGISTRATION FORM --- */}
      <div
        // FIX 3: Added flex-1 on mobile. Added -mt-8 and rounded-t-[2.5rem] to create a cool overlapping bottom-sheet effect.
        className={`w-full flex-1 lg:w-[480px] xl:w-[560px] flex flex-col shrink-0 lg:h-full min-h-0 lg:overflow-y-auto relative z-20 
        -mt-8 lg:mt-0 rounded-t-[2.5rem] lg:rounded-none border-t lg:border-t-0 lg:border-l shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-none
        ${isDark ? 'bg-slate-900/95 border-white/10 backdrop-blur-xl' : 'bg-white border-slate-100'}`}
      >
        {/* Mobile drag-handle indicator (purely visual) */}
        <div className="w-full flex justify-center pt-4 pb-2 lg:hidden">
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-300'}`}></div>
        </div>

        <div className="flex-grow shrink-0 hidden lg:block"></div>

        <div className="w-full max-w-sm sm:max-w-md lg:max-w-md mx-auto px-6 pb-12 pt-4 sm:px-12 sm:py-16 lg:p-12 xl:p-16 space-y-8 sm:space-y-10">
          
          {/* Form Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Get Started
            </h2>
            <p className={`text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Verify your student status to begin.
            </p>
          </div>

          {/* Inputs */}
          <div className="space-y-5 sm:space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                IITK Email Address
              </label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@iitk.ac.in"
                  className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl border-2 font-medium transition-all outline-none text-sm sm:text-base focus:ring-4
                    ${
                      isDark
                        ? 'bg-[#0B1120] border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-400'
                    }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {email.includes('@iitk.ac.in') && <Check className="w-5 h-5 text-green-500 animate-in zoom-in" />}
                </div>
              </div>
              <p className={`text-[10px] sm:text-xs pl-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Restricted to @iitk.ac.in domains only.
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Create Password
              </label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl border-2 font-medium transition-all outline-none text-sm sm:text-base focus:ring-4
                    ${
                      isDark
                        ? 'bg-[#0B1120] border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-400'
                    }`}
                />
              </div>
            </div>

            {/* Password Strength Meter */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2 h-1.5 sm:h-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 rounded-full transition-all duration-500
                      ${
                        strength >= step
                          ? strength < 2
                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                            : strength < 4
                            ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                            : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                          : isDark
                          ? 'bg-slate-800'
                          : 'bg-slate-200'
                      }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs px-1 font-bold uppercase tracking-wide gap-4">
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Strength</span>
                <span
                  className={`whitespace-nowrap transition-colors duration-300 ${
                    strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-500' : 'text-green-500'
                  }`}
                >
                  {strength === 0 ? 'Too Weak' : strength < 2 ? 'Weak' : strength < 4 ? 'Medium' : 'Strong'}
                </span>
              </div>
            </div>

            {/* OTP Input (Expands when OTP sent) */}
            {otpSent && (
              <div className="space-y-2 animate-in slide-in-from-top-4 fade-in duration-500">
                <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Enter OTP
                </label>
                <div className="relative group">
                  <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-green-400' : 'text-slate-400 group-focus-within:text-green-500'}`} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl border-2 font-bold tracking-widest transition-all outline-none text-sm sm:text-base focus:ring-4
                      ${
                        isDark
                          ? 'bg-[#0B1120] border-slate-800 text-white focus:border-green-500 focus:ring-green-500/20 placeholder:text-slate-600 placeholder:tracking-normal'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-green-500 focus:ring-green-500/20 placeholder:text-slate-400 placeholder:tracking-normal'
                      }`}
                  />
                </div>
                <p className={`text-[10px] sm:text-xs pl-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Enter the verification code sent to your IITK email.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'} text-xs sm:text-sm font-semibold animate-in fade-in`}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className={`w-full group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg
                ${isDark ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-blue-500/20 hover:shadow-blue-500/40' : 'bg-slate-900 shadow-slate-900/20 hover:shadow-slate-900/40'}
                ${loading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <div
                className={`relative h-full w-full rounded-xl px-4 py-3.5 sm:py-4 flex items-center justify-center gap-2 transition-all
                  ${isDark ? 'bg-slate-900 group-hover:bg-opacity-80' : 'bg-slate-900 text-white'}`}
              >
                <span className="font-bold text-base sm:text-lg text-white">
                  {loading ? 'Sending...' : otpSent ? 'Resend Verification OTP' : 'Send Verification OTP'}
                </span>
                {!loading && <ArrowRight className="w-5 h-5 text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />}
              </div>
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className={`w-full group relative overflow-hidden rounded-2xl px-5 py-4 sm:py-5 border-2 font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-lg
                ${
                  isDark
                    ? 'bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600 hover:text-white shadow-green-900/20'
                    : 'bg-green-50 border-green-500 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600 shadow-green-100'
                } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                <span>{loading ? 'Verifying...' : 'Verify OTP & Register'}</span>
                {!loading && <Check className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform group-hover:scale-110" />}
              </button>
            )}

            <div className="relative flex items-center py-4">
              <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
              <span className={`flex-shrink-0 mx-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Already a member?
              </span>
              <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className={`w-full px-5 py-3.5 sm:py-5 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 border-2 transition-all duration-300
                ${
                  isDark
                    ? 'border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                }`}
            >
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span>Login to Account</span>
            </button>
          </div>

          {/* Footer */}
          <p className={`text-center text-xs sm:text-sm leading-relaxed px-2 pt-2 pb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            By registering, you accept our <span className={`underline cursor-pointer transition-colors ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}>Terms</span> &{' '}
            <span className={`underline cursor-pointer transition-colors ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}>Privacy Policy</span>.
          </p>
        </div>

        <div className="flex-grow shrink-0 hidden lg:block"></div>
      </div>
    </div>
  );
}