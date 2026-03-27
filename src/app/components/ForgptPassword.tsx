import React, { useState, useEffect } from "react";
import { Lock, Sparkles, ArrowRight, RotateCcw, Mail, Loader2, Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from '@/services/config';
import { setAuthTokens } from '@/services/auth';
import { useGlobalCleanUp } from "../hooks/useGlobalCleanup";
import { ThemeToggle } from "./ThemeToggle";

export function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const otpValid = otp.length === 6;

  useEffect(() => {
    let score = 0;
    if (newPassword.length > 4) score++;
    if (newPassword.length > 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    setStrength(score);
  }, [newPassword]);

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  };

  const handleRequestOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return setError("Please enter your IITK email.");

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(buildApiUrl('/api/auth/forgot-password-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        setStep(2);
        setSuccessMsg("OTP sent to your email!");
      } else {
        setError(data?.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Network error. Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(buildApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: newPassword })
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        const token = data?.data?.accessToken;
        const refreshToken = data?.data?.refreshToken;
        if (token) setAuthTokens({ accessToken: token, refreshToken });

        setSuccessMsg("Password reset successfully! Redirecting...");
        setTimeout(() => navigate('/homepage'), 1500);
      } else {
        setError(data?.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Network error. Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(buildApiUrl('/api/auth/resend-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, isPasswordReset: true })
      });
      const data = await res.json().catch(() => null);
      if (res.ok) setSuccessMsg("OTP resent successfully!");
      else setError(data?.message || 'Failed to resend OTP.');
    } catch (err) {
      setError('Network error.');
    }
  };

  return (
    <div
      className={`w-full flex flex-col lg:flex-row h-[100dvh] overflow-y-auto lg:overflow-hidden transition-colors duration-500 no-scrollbar ${isDark ? "bg-slate-950" : "bg-white"}`}
    >
      <div className="absolute top-6 right-6 sm:top-8 sm:right-10 z-50">
        <ThemeToggle />
      </div>

      {/* --- LEFT PANEL: IMMERSIVE VISUALS --- */}
      <div
        // FIX: Centering for medium screens and height adjustments
        className={`relative w-full lg:flex-1 flex flex-col items-center text-center lg:items-start lg:text-left justify-center overflow-hidden shrink-0 
        min-h-[40dvh] sm:min-h-[50dvh] lg:min-h-0 lg:h-full
        px-6 pt-12 pb-10 sm:px-10 sm:py-16 md:px-12 lg:p-16 xl:p-20
        ${isDark ? "bg-[#020617]" : "bg-slate-50"}`}
      >
        <div
          className={`absolute inset-0 pointer-events-none ${isDark ? "opacity-20" : "opacity-40"}`}
          style={{
            backgroundImage: `radial-gradient(${isDark ? "#3b82f6" : "#94a3b8"} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-0 left-[-10%] sm:top-1/4 sm:left-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen opacity-60 ${isDark ? "bg-purple-600/20" : "bg-purple-400/30"}`} />
          <div className={`absolute bottom-0 right-[-10%] sm:bottom-1/4 sm:right-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen opacity-60 ${isDark ? "bg-blue-600/20" : "bg-blue-400/30"}`} />
        </div>

        <div className="relative z-10 flex flex-col items-center lg:items-start justify-center flex-1 lg:flex-none">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 shadow-2xl ${isDark ? "bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/30" : "bg-white shadow-blue-200"}`}>
            <Sparkles className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${isDark ? "text-white" : "text-blue-600"}`} />
          </div>

          <h1 className={`text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[1.05] mb-5 sm:mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
            Reset Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              Password.
            </span>
          </h1>

          <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-md lg:max-w-lg font-medium leading-relaxed mx-auto lg:mx-0 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            {step === 1
              ? "Enter your registered IITK email to receive a secure 6-digit password reset code."
              : "We've sent a 6-digit verification code to your email. Enter it below to secure your account."}
          </p>
        </div>
      </div>

      {/* --- RIGHT PANEL: FORM --- */}
      <div
        // FIX: flex-1 lg:flex-none added here
        className={`w-full flex-1 lg:flex-none lg:w-[480px] xl:w-[560px] flex flex-col shrink-0 lg:h-full lg:overflow-y-auto relative z-20 border-t lg:border-t-0 lg:border-l
        ${isDark ? "bg-slate-900/95 border-white/5 backdrop-blur-xl" : "bg-white border-slate-100 shadow-2xl"}`}
      >
        <div className="flex-grow shrink-0"></div>

        <div className="w-full max-w-sm lg:max-w-md mx-auto px-6 py-12 sm:px-12 sm:py-16 lg:p-12 xl:p-16 space-y-8 sm:space-y-10">

          {/* FIX: Header alignment */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {step === 1 ? "Forgot Password" : "Verify & Reset"}
            </h2>
            <p className={`text-sm sm:text-base font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {step === 1 ? "We'll send you an OTP to verify it's you." : "Enter the OTP and create a new password."}
            </p>
          </div>

          {/* Toast Messages */}
          <div className="space-y-3">
            {error && (
              <div className={`p-3 rounded-xl border font-semibold text-sm animate-in fade-in slide-in-from-top-2 ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
                {error}
              </div>
            )}
            {successMsg && (
              <div className={`p-3 rounded-xl border font-semibold text-sm animate-in fade-in slide-in-from-top-2 ${isDark ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
                {successMsg}
              </div>
            )}
          </div>

          <div className="space-y-5 sm:space-y-6">
            {/* STEP 1: EMAIL */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    IITK Email Address
                  </label>
                  <div className="relative group">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? "text-slate-500 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-500"}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@iitk.ac.in"
                      className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl border-2 font-medium transition-all outline-none text-sm sm:text-base focus:ring-4
                        ${isDark
                          ? "bg-[#0B1120] border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-600"
                          : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-400"
                        }`}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRequestOTP}
                  disabled={loading || !email}
                  className={`w-full group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:hover:scale-100 disabled:active:scale-100 mt-2
                    ${isDark ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-blue-500/20 hover:shadow-blue-500/40" : "bg-slate-900 shadow-slate-900/20 hover:shadow-slate-900/40"}
                    ${(loading || !email) ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <div className={`relative h-full w-full rounded-xl px-4 py-3.5 sm:py-4 flex items-center justify-center gap-2 transition-all ${isDark ? "bg-slate-900 group-hover:bg-opacity-80" : "bg-slate-900 text-white"}`}>
                    <span className="font-bold text-base sm:text-lg text-white">
                      {loading ? "Sending..." : "Send Reset OTP"}
                    </span>
                    {!loading && <ArrowRight className="w-5 h-5 text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />}
                  </div>
                </button>
              </div>
            )}

            {/* STEP 2: VERIFY & RESET */}
            {step === 2 && (
              <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    6-Digit OTP
                  </label>
                  <div className="relative group">
                    <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? "text-slate-500 group-focus-within:text-green-400" : "text-slate-400 group-focus-within:text-green-500"}`} />
                    <input
                      value={otp}
                      onChange={(e) => handleOtpChange(e.target.value)}
                      inputMode="numeric"
                      placeholder="••••••"
                      className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl border-2 font-bold tracking-[0.3em] sm:tracking-[0.4em] transition-all outline-none text-base sm:text-lg focus:ring-4
                        ${isDark
                          ? "bg-[#0B1120] border-slate-800 text-white focus:border-green-500 focus:ring-green-500/20 placeholder:text-slate-600 placeholder:tracking-normal"
                          : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-green-500 focus:ring-green-500/20 placeholder:text-slate-400 placeholder:tracking-normal"
                        }`}
                    />
                  </div>
                  <div className="flex items-center justify-between px-1 pt-1">
                    <span className={`text-[10px] sm:text-xs font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {otp.length}/6 digits
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:opacity-80 transition-opacity ${isDark ? "text-blue-400" : "text-blue-600"}`}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    New Password
                  </label>
                  <div className="relative group">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? "text-slate-500 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-500"}`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl border-2 font-medium transition-all outline-none text-sm sm:text-base focus:ring-4
                        ${isDark
                          ? "bg-[#0B1120] border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-600"
                          : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-400"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500
                        ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/5" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex gap-2 h-1.5 sm:h-2">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full transition-all duration-500
                          ${strength >= step
                            ? strength < 2
                              ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                              : strength < 4
                                ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                                : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                            : isDark
                              ? "bg-slate-800"
                              : "bg-slate-200"
                          }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs px-1 font-bold uppercase tracking-wide gap-4">
                    <span className={isDark ? "text-slate-500" : "text-slate-400"}>Strength</span>
                    <span
                      className={`whitespace-nowrap transition-colors duration-300 ${strength < 2 ? "text-red-500" : strength < 4 ? "text-yellow-500" : "text-green-500"
                        }`}
                    >
                      {strength === 0 ? "Too Weak" : strength < 2 ? "Weak" : strength < 4 ? "Medium" : "Strong"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={!otpValid || newPassword.length < 8 || loading}
                  className={`w-full mt-2 group relative overflow-hidden rounded-2xl px-5 py-4 sm:py-5 border-2 font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-lg active:scale-[0.98] disabled:active:scale-100 disabled:hover:scale-100
                  ${isDark
                      ? "bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600 hover:text-white shadow-green-900/20"
                      : "bg-green-50 border-green-500 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600 shadow-green-100"
                    } ${(!otpValid || newPassword.length < 8 || loading) ? "opacity-60 cursor-not-allowed border-transparent bg-slate-800 text-slate-500 shadow-none hover:bg-slate-800 hover:text-slate-500" : ""}`}
                >
                  {loading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin shrink-0" /> : <span>Verify & Reset Password</span>}
                  {!loading && <Check className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform group-hover:scale-110" />}
                </button>
              </div>
            )}

            {/* Back Actions */}
            <div className="pt-2 sm:pt-4">
              <button
                type="button"
                onClick={() => {
                  if (step === 2) {
                    setStep(1);
                    setOtp("");
                    setNewPassword("");
                    setError("");
                  } else {
                    navigate("/login");
                  }
                }}
                className={`w-full px-5 py-3.5 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-3 border-2 transition-all duration-300 text-sm sm:text-base
                  ${isDark ? "border-white/10 hover:bg-white/5 text-white" : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"}`}
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{step === 2 ? "Back to Email" : "Back to Login"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow shrink-0"></div>
      </div>
    </div>
  );
}