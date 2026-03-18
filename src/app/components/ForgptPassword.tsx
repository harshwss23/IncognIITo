import React, { useState, useEffect } from "react";
import { Lock, Sparkles, ArrowRight, RotateCcw, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from '@/services/config';
import { setAuthTokens } from '@/services/auth';

export function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  
  // States
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);
  
  // API States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const otpValid = otp.length === 6;

  // Password Strength logic (Matched with Registration Screen)
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

  // --- API INTEGRATIONS ---

  // Step 1: Send OTP
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

  // Step 2: Verify OTP & Reset Password
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

  // Resend OTP
  const handleResendOTP = async () => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(buildApiUrl('/api/auth/resend-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Passing isPasswordReset flag to backend
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
    <div className={`w-full min-h-screen flex overflow-hidden transition-colors duration-500 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
      {/* LEFT PANEL */}
      <div className={`relative flex-[1.35] hidden lg:flex flex-col justify-center px-20 py-16 ${isDark ? "bg-[#020617]" : "bg-slate-100"}`}>
        <div className={`absolute inset-0 pointer-events-none ${isDark ? "opacity-20" : "opacity-40"}`}
          style={{
            backgroundImage: `radial-gradient(${isDark ? "#3b82f6" : "#94a3b8"} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className={`absolute top-0 left-0 w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-screen pointer-events-none opacity-50 ${isDark ? "bg-purple-600/20" : "bg-purple-400/30"}`} />
        <div className={`absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] mix-blend-screen pointer-events-none opacity-50 ${isDark ? "bg-blue-600/20" : "bg-blue-400/30"}`} />

        <div className="relative z-10 max-w-xl">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-10 shadow-2xl ${isDark ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-white"}`}>
            <Sparkles className={`w-10 h-10 ${isDark ? "text-white" : "text-blue-600"}`} />
          </div>
          <h1 className={`text-7xl font-black tracking-tight leading-[1.05] mb-8 ${isDark ? "text-white" : "text-slate-900"}`}>
            Reset Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              Password
            </span>
          </h1>
          <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-xl leading-relaxed`}>
            {step === 1 
              ? "Enter your registered IITK email to receive a secure password reset link." 
              : "A 6-digit verification code has been sent to your registered IITK email."}
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={`flex-1 relative z-10 shadow-2xl ${isDark ? "bg-slate-900" : "bg-white"}`}>
        <div className="min-h-screen flex items-center justify-center px-10 sm:px-14 lg:px-16 py-14 overflow-y-auto">
          <div className="w-full max-w-md">
            
            {/* Header */}
            <div className="mb-8">
              <h2 className={`text-4xl font-extrabold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                {step === 1 ? "Forgot Password" : "Verify & Reset"}
              </h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-base`}>
                {step === 1 ? "We'll send you an OTP to verify it's you." : "Enter the OTP and create a new password."}
              </p>
            </div>

            {/* Error / Success Messages */}
            {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{error}</div>}
            {successMsg && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium">{successMsg}</div>}

            {/* Form */}
            <div className="space-y-6">
              
              {/* --- STEP 1: EMAIL INPUT --- */}
              {step === 1 && (
                <div className="space-y-3">
                  <label className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>IITK Email</label>
                  <div className="relative group">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@iitk.ac.in"
                      className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 font-medium transition-all outline-none
                        ${isDark ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"}`}
                    />
                  </div>
                  <button
                    onClick={handleRequestOTP}
                    disabled={loading || !email}
                    className={`w-full mt-4 relative overflow-hidden rounded-2xl p-4 transition-all duration-300 font-bold text-white
                      ${loading || !email ? (isDark ? "bg-slate-800 text-white/60" : "bg-slate-200 text-slate-500") : (isDark ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-slate-900 hover:bg-slate-800")}`}
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Send Reset OTP"}
                  </button>
                </div>
              )}

              {/* --- STEP 2: OTP & PASSWORD --- */}
              {step === 2 && (
                <>
                  <div className="space-y-3">
                    <label className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>6-Digit OTP</label>
                    <input
                      value={otp}
                      onChange={(e) => handleOtpChange(e.target.value)}
                      inputMode="numeric"
                      placeholder="••••••"
                      className={`w-full py-4 px-4 rounded-2xl border-2 outline-none text-center tracking-[0.45em] font-extrabold text-lg transition-all
                        ${isDark ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"}`}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>{otp.length}/6 digits</span>
                      <button type="button" onClick={handleResendOTP} className={`font-bold underline underline-offset-4 transition-opacity hover:opacity-80 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Resend OTP
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>New Password</label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className={`w-full pl-12 pr-12 py-4 rounded-2xl border-2 outline-none font-medium transition-all
                          ${isDark ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors outline-none focus:ring-2 focus:ring-blue-500
                          ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                        ) : (
                            <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 🔥 UPDATED PASSWORD STRENGTH METER 🔥 */}
                  <div className="space-y-2 pt-1">
                      <div className="flex gap-2 h-1.5">
                          {[1, 2, 3, 4].map((step) => (
                              <div key={step} className={`flex-1 rounded-full transition-all duration-300
                                  ${strength >= step 
                                      ? (strength < 2 ? 'bg-red-500' : strength < 4 ? 'bg-yellow-500' : 'bg-green-500') 
                                      : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`} 
                              />
                          ))}
                      </div>
                      <div className="flex justify-between text-xs px-1 font-medium">
                          <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Password Strength</span>
                          <span className={`
                              ${strength < 2 ? 'text-red-500' : strength < 4 ? 'text-yellow-500' : 'text-green-500'}
                          `}>
                              {strength === 0 ? 'Too Weak' : strength < 2 ? 'Weak' : strength < 4 ? 'Medium' : 'Strong'}
                          </span>
                      </div>
                  </div>

                  <button
                    onClick={handleResetPassword}
                    disabled={!otpValid || newPassword.length < 8 || loading}
                    className={`w-full group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100 disabled:active:scale-100
                      ${!otpValid || newPassword.length < 8 || loading
                        ? (isDark ? "bg-slate-800 text-white/60 cursor-not-allowed" : "bg-slate-200 text-slate-500 cursor-not-allowed")
                        : (isDark ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20" : "bg-slate-900 text-white shadow-xl hover:bg-slate-800")}`}
                  >
                    <div className="flex items-center justify-center gap-2 font-extrabold text-base text-white">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Reset Password</span>}
                      {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </div>
                  </button>
                </>
              )}

              {/* Back to login */}
              <button
                type="button"
                onClick={() => {
                  if (step === 2) setStep(1); 
                  else navigate("/login");    
                }}
                className={`w-full p-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 border-2 transition-all mt-4
                  ${isDark ? "border-white/10 hover:bg-white/5 text-white" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
              >
                <RotateCcw className="w-5 h-5" />
                <span>{step === 2 ? "Back to Email" : "Back to Login"}</span>
              </button>

            </div>
            
            {/* Footer hint */}
            {step === 2 && (
              <p className={`text-center text-xs mt-10 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                If you didn’t receive an OTP, check Spam or click <span onClick={handleResendOTP} className="underline cursor-pointer">Resend OTP</span>.
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}