import React, { useState, useEffect } from "react";
import { Lock, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

export function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [strength, setStrength] = useState(0);

  const otpValid = otp.length === 6;

  useEffect(() => {
    let score = 0;
    if (newPassword.length > 4) score++;
    if (newPassword.length > 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    setStrength(score);
  }, [newPassword]);

  const handleOtpChange = (value) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <div
      className={`w-full min-h-screen flex overflow-hidden transition-colors duration-500
      ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {/* LEFT PANEL */}
      <div
        className={`relative flex-[1.35] hidden lg:flex flex-col justify-center px-20 py-16
        ${isDark ? "bg-[#020617]" : "bg-slate-100"}`}
      >
        {/* subtle grid */}
        <div
          className={`absolute inset-0 pointer-events-none ${isDark ? "opacity-20" : "opacity-40"}`}
          style={{
            backgroundImage: `radial-gradient(${isDark ? "#3b82f6" : "#94a3b8"} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* orbs */}
        <div
          className={`absolute top-0 left-0 w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-screen pointer-events-none opacity-50
          ${isDark ? "bg-purple-600/20" : "bg-purple-400/30"}`}
        />
        <div
          className={`absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] mix-blend-screen pointer-events-none opacity-50
          ${isDark ? "bg-blue-600/20" : "bg-blue-400/30"}`}
        />

        <div className="relative z-10 max-w-xl">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-10 shadow-2xl
            ${isDark ? "bg-gradient-to-br from-blue-600 to-purple-600" : "bg-white"}`}
          >
            <Sparkles className={`w-10 h-10 ${isDark ? "text-white" : "text-blue-600"}`} />
          </div>

          <h1
            className={`text-7xl font-black tracking-tight leading-[1.05] mb-8
            ${isDark ? "text-white" : "text-slate-900"}`}
          >
            Reset Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              Password
            </span>
          </h1>

          <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-xl leading-relaxed`}>
            A 6-digit verification code has been sent to your registered IITK email.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className={`flex-1 relative z-10 shadow-2xl
        ${isDark ? "bg-slate-900" : "bg-white"}`}
      >
        {/* IMPORTANT: min-h-screen + py prevents cut */}
        <div className="min-h-screen flex items-center justify-center px-10 sm:px-14 lg:px-16 py-14 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-10">
              <h2 className={`text-4xl font-extrabold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                Verify & Reset
              </h2>
              <p className={`${isDark ? "text-slate-400" : "text-slate-500"} text-base`}>
                Enter the OTP and create a new password.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-8">
              {/* OTP */}
              <div className="space-y-3">
                <label className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  6-Digit OTP
                </label>

                <input
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  inputMode="numeric"
                  placeholder="••••••"
                  className={`w-full py-4 px-4 rounded-2xl border-2 outline-none text-center
                    tracking-[0.45em] font-extrabold text-lg transition-all
                    ${isDark
                      ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"}`}
                />

                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? "text-slate-500" : "text-slate-400"}>
                    {otp.length}/6 digits
                  </span>
                  <button
                    type="button"
                    className={`font-bold underline underline-offset-4 transition-opacity hover:opacity-80
                      ${isDark ? "text-slate-300" : "text-slate-700"}`}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-3">
                <label className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  New Password
                </label>

                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none font-medium transition-all
                      ${isDark
                        ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"}`}
                  />
                </div>
              </div>

              {/* Strength meter */}
              <div className="space-y-3">
                <div className="flex gap-3 h-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300
                        ${
                          strength >= i
                            ? strength < 2
                              ? "bg-red-500"
                              : strength < 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                            : isDark
                            ? "bg-slate-800"
                            : "bg-slate-200"
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Reset button */}
              <button
                disabled={!otpValid || newPassword.length < 8}
                className={`w-full group relative overflow-hidden rounded-2xl p-4 transition-all duration-300
                  hover:scale-[1.01] active:scale-[0.99]
                  disabled:hover:scale-100 disabled:active:scale-100
                  ${
                    !otpValid || newPassword.length < 8
                      ? isDark
                        ? "bg-slate-800 text-white/60 cursor-not-allowed"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : isDark
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20"
                      : "bg-slate-900 text-white shadow-xl hover:bg-slate-800"
                  }`}
              >
                <div className="flex items-center justify-center gap-2 font-extrabold text-base text-white">
                  <span>Reset Password</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Back to login */}
              <button
                type="button"
                className={`w-full p-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 border-2 transition-all
                  ${isDark ? "border-white/10 hover:bg-white/5 text-white" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
              >
                <RotateCcw className="w-5 h-5" />
                <span>Back to Login</span>
              </button>
            </div>

            {/* Footer hint */}
            <p className={`text-center text-xs mt-10 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              If you didn’t receive an OTP, check Spam or click <span className="underline cursor-pointer">Resend OTP</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
