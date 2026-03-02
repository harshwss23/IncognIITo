import React, { useState, useRef } from 'react';
import { Mail, KeyRound } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function OTPVerificationScreen() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div
      className={`w-[550px] h-[900px] ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]'
          : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
      } rounded-3xl border ${colors.borderPrimary} ${colors.shadowPrimary}
      flex items-center justify-center p-8 relative overflow-hidden`}
    >
      {/* Animated background orbs */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 ${
          theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-400/15'
        } rounded-full blur-3xl animate-pulse`}
      />
      <div
        className={`absolute bottom-1/3 left-1/2 -translate-x-1/2 w-64 h-64 ${
          theme === 'dark' ? 'bg-purple-500/15' : 'bg-purple-400/10'
        } rounded-full blur-3xl animate-pulse`}
        style={{ animationDelay: '1.5s' }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl
            bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-500
            ${
              theme === 'dark'
                ? 'shadow-[0_0_50px_rgba(59,130,246,0.6)]'
                : 'shadow-[0_0_35px_rgba(59,130,246,0.5)]'
            } animate-pulse`}
          >
            <KeyRound className="w-12 h-12 text-white" />
          </div>

          <div className="space-y-3">
            <h2 className={`text-5xl font-black ${colors.textPrimary}`}>
              Forgot Password
            </h2>

            <div
              className={`flex items-center justify-center gap-2 ${
                theme === 'dark'
                  ? 'text-blue-300/80'
                  : 'text-blue-600/80'
              }`}
            >
              <Mail className="w-5 h-5" />
              <p className="text-sm font-medium">
                Reset code sent to your IITK email
              </p>
            </div>

            <p
              className={`${
                theme === 'dark' ? 'text-white/50' : 'text-slate-500'
              } text-sm`}
            >
              Enter the 6-digit code to reset your password
            </p>
          </div>
        </div>

        {/* OTP Inputs */}
        <div className="space-y-6">
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-16 h-20 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-blue-500/30 text-white focus:bg-white/10 focus:shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                } border-2 rounded-2xl text-center text-3xl font-bold
                focus:outline-none focus:border-blue-500 transition-all duration-300 backdrop-blur-xl`}
              />
            ))}
          </div>

          <div className="text-center">
            <p
              className={`${
                theme === 'dark'
                  ? 'text-blue-300/60'
                  : 'text-blue-600/60'
              } text-sm`}
            >
              Code expires in{' '}
              <span className="text-blue-400 font-bold">02:45</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            className={`w-full group relative overflow-hidden rounded-2xl
            bg-gradient-to-r from-green-600 via-blue-600 to-green-600
            bg-size-200 p-5 text-white font-bold text-xl
            ${
              theme === 'dark'
                ? 'shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:shadow-[0_0_60px_rgba(34,197,94,0.6)]'
                : 'shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_45px_rgba(34,197,94,0.5)]'
            }
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-white/30 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="relative">Verify & Reset Password</span>
          </button>

          <div className="text-center">
            <button className="text-blue-400 hover:text-blue-300 font-semibold text-sm hover:underline transition-colors inline-flex items-center gap-2 group">
              <span>Didn’t get the code?</span>
              <span className="text-white/60 group-hover:text-blue-300">
                Resend Code
              </span>
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div
          className={`${
            theme === 'dark'
              ? 'bg-white/5 border-white/20'
              : 'bg-blue-50 border-blue-200'
          } backdrop-blur-xl border rounded-2xl p-4`}
        >
          <p
            className={`${
              theme === 'dark'
                ? 'text-white/60'
                : 'text-slate-600'
            } text-xs text-center leading-relaxed`}
          >
            🔐 Password reset is secure and time-limited. Never share your OTP
            with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
