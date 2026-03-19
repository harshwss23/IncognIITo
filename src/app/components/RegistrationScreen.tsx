import React, { useState, useEffect } from 'react';
import { Mail, Lock, Sparkles, ArrowRight, Check, ShieldCheck, Globe, UserPlus } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { buildApiUrl } from '@/services/config';
import { useNavigate } from 'react-router-dom';

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
      className={`w-full min-h-screen flex flex-col lg:flex-row overflow-hidden transition-colors duration-500 
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      {/* --- LEFT PANEL: IMMERSIVE VISUALS --- */}
      <div
        className={`relative w-full lg:flex-[1.4] flex flex-col justify-between overflow-hidden
        px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12 lg:p-16 xl:p-20
        ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}
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
        <div
          className={`absolute top-0 left-0 w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] lg:w-[700px] lg:h-[700px] xl:w-[800px] xl:h-[800px] rounded-full blur-[80px] sm:blur-[100px] lg:blur-[120px] mix-blend-screen pointer-events-none opacity-50
          ${isDark ? 'bg-purple-600/20' : 'bg-purple-400/30'}`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[220px] h-[220px] sm:w-[340px] sm:h-[340px] lg:w-[520px] lg:h-[520px] xl:w-[600px] xl:h-[600px] rounded-full blur-[70px] sm:blur-[90px] lg:blur-[100px] mix-blend-screen pointer-events-none opacity-50
          ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/30'}`}
        />

        {/* Branding Content */}
        <div className="relative z-10">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 shadow-2xl
            ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/30' : 'bg-white shadow-blue-200'}`}
          >
            <Sparkles className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${isDark ? 'text-white' : 'text-blue-600'}`} />
          </div>

          <h1
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-black tracking-tight mb-4 sm:mb-5 lg:mb-6 leading-[1.05] sm:leading-[1.1] ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Create Your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              Ghost Identity.
            </span>
          </h1>

          <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Join the exclusive, anonymous network for IIT Kanpur students. No logs. No traces.
          </p>
        </div>

        {/* Feature Highlights */}
        <div
          className={`relative z-10 mt-8 lg:mt-12 flex flex-wrap gap-6 sm:gap-8 lg:gap-12 pt-6 sm:pt-8 lg:pt-10 border-t ${
            isDark ? 'border-white/10' : 'border-slate-300'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
              <Globe className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <div className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>IITK Only</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Verified Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: REGISTRATION FORM --- */}
      <div
        className={`w-full lg:flex-1 flex flex-col justify-center px-6 py-10 sm:px-8 sm:py-12 md:px-10 lg:px-16 xl:px-24 2xl:px-32 relative z-10 shadow-2xl
        ${isDark ? 'bg-slate-900' : 'bg-white'}`}
      >
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Form Header */}
          <div>
            <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Get Started
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Verify your student status to begin.
            </p>
          </div>

          {/* Inputs */}
          <div className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className={`text-sm font-bold ml-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                IITK Email Address
              </label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@iitk.ac.in"
                  className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-xl border-2 font-medium transition-all outline-none text-sm sm:text-base
                    ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                    }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {email.includes('@iitk.ac.in') && <Check className="w-5 h-5 text-green-500" />}
                </div>
              </div>
              <p className={`text-xs pl-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Restricted to @iitk.ac.in domains only.
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className={`text-sm font-bold ml-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Create Password
              </label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-xl border-2 font-medium transition-all outline-none text-sm sm:text-base
                    ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                    }`}
                />
              </div>
            </div>

            {/* Password Strength Meter */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2 h-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 rounded-full transition-all duration-300
                      ${
                        strength >= step
                          ? strength < 2
                            ? 'bg-red-500'
                            : strength < 4
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : isDark
                          ? 'bg-slate-800'
                          : 'bg-slate-200'
                      }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs px-1 font-medium gap-4">
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Password Strength</span>
                <span
                  className={`whitespace-nowrap ${
                    strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-500' : 'text-green-500'
                  }`}
                >
                  {strength === 0 ? 'Too Weak' : strength < 2 ? 'Weak' : strength < 4 ? 'Medium' : 'Strong'}
                </span>
              </div>
            </div>

            {/* OTP Input */}
            {otpSent && (
              <div className="space-y-2">
                <label className={`text-sm font-bold ml-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Enter OTP
                </label>
                <div className="relative group">
                  <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-xl border-2 font-medium transition-all outline-none text-sm sm:text-base
                      ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                      }`}
                  />
                </div>
                <p className={`text-xs pl-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Enter the verification code sent to your IITK email.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4 pt-4">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className={`w-full group relative overflow-hidden rounded-xl px-4 py-3.5 sm:py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]
              ${
                isDark
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'
              } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <div className="flex items-center justify-center gap-2 font-bold text-base sm:text-lg text-white">
                <span>{loading ? 'Sending...' : 'Send Verification OTP'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className={`w-full mt-3 group relative overflow-hidden rounded-xl px-4 py-3.5 sm:py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]
                ${
                  isDark
                    ? 'bg-green-600 shadow-lg shadow-green-500/20 text-white'
                    : 'bg-green-600 text-white shadow-xl hover:bg-green-500'
                } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                <div className="flex items-center justify-center gap-2 font-bold text-base sm:text-lg text-white">
                  <span>{loading ? 'Verifying...' : 'Verify OTP & Register'}</span>
                  <Check className="w-5 h-5 transition-transform" />
                </div>
              </button>
            )}

            {error && <p className="text-sm text-red-500 pt-2">{error}</p>}

            <div className="relative flex items-center py-2">
              <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
              <span className={`flex-shrink-0 mx-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Already a member?
              </span>
              <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className={`w-full px-4 py-3.5 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-3 border-2 transition-all
                ${
                  isDark
                    ? 'border-white/10 hover:bg-white/5 text-white'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
            >
              <UserPlus className="w-5 h-5" />
              <span>Login to Account</span>
            </button>
          </div>

          {/* Footer */}
          <p className={`text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            By registering, you accept our <span className="underline cursor-pointer">Terms</span> &{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}