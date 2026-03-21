import React, { useState, useRef } from 'react';
import { Mail, KeyRound } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useGlobalCleanup } from '../hooks/useGlobalCleanup';

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
    // FIX 1: Changed to flex-col and removed items-center/justify-center to prevent top-clipping
    <div
      className={`min-h-[100dvh] w-full flex flex-col p-4 sm:p-8 transition-colors duration-500 overflow-y-auto no-scrollbar ${
        theme === 'dark' ? 'bg-[#020617]' : 'bg-slate-50'
      }`}
    >
      {/* FIX 2: Safe top flex spacer for vertical centering */}
      <div className="flex-grow shrink-0"></div>

      {/* FIX 3: Replaced my-auto with mx-auto shrink-0 to ensure safe scrolling */}
      <div
        className={`w-full max-w-[550px] min-h-[600px] sm:min-h-[800px] mx-auto shrink-0 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] border-white/10 shadow-2xl shadow-black/50'
            : 'bg-gradient-to-br from-white via-blue-50/50 to-white border-slate-200 shadow-xl shadow-blue-900/5'
        } rounded-[2rem] sm:rounded-[2.5rem] border
        flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden`}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          <div
            className={`absolute top-[20%] left-1/2 -translate-x-1/2 w-64 h-64 sm:w-96 sm:h-96 ${
              theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-400/15'
            } rounded-full blur-[80px] sm:blur-[100px] animate-pulse mix-blend-screen`}
          />
          <div
            className={`absolute bottom-[20%] left-1/2 -translate-x-1/2 w-48 h-48 sm:w-64 sm:h-64 ${
              theme === 'dark' ? 'bg-purple-500/15' : 'bg-purple-400/10'
            } rounded-full blur-[60px] sm:blur-[80px] animate-pulse mix-blend-screen`}
            style={{ animationDelay: '1.5s' }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-md space-y-10 sm:space-y-12 py-8">
          {/* Header */}
          <div className="text-center space-y-5 sm:space-y-6">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem]
              bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-500
              ${
                theme === 'dark'
                  ? 'shadow-[0_0_50px_rgba(59,130,246,0.4)]'
                  : 'shadow-[0_0_35px_rgba(59,130,246,0.4)]'
              }`}
            >
              <KeyRound className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>

            <div className="space-y-3">
              <h2
                className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                Forgot Password
              </h2>

              <div
                className={`flex items-center justify-center gap-2 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                <p className="text-sm sm:text-base font-semibold">
                  Reset code sent to your IITK email
                </p>
              </div>

              <p
                className={`${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                } text-xs sm:text-sm font-medium`}
              >
                Enter the 6-digit code to reset your password
              </p>
            </div>
          </div>

          {/* OTP Inputs */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex justify-between sm:justify-center gap-2 sm:gap-3">
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
                  className={`w-12 h-14 sm:w-14 sm:h-16 md:w-16 md:h-20 ${
                    theme === 'dark'
                      ? 'bg-slate-900/50 border-white/10 text-white focus:bg-slate-800 focus:border-blue-500 focus:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                      : 'bg-white border-slate-200 text-slate-900 focus:bg-blue-50/50 focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                  } border-2 rounded-xl sm:rounded-2xl text-center text-2xl sm:text-3xl font-bold
                  focus:outline-none transition-all duration-300 backdrop-blur-xl shadow-sm`}
                />
              ))}
            </div>

            <div className="text-center">
              <p
                className={`${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                } text-sm font-medium`}
              >
                Code expires in{' '}
                <span className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-bold`}>
                  02:45
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-5">
            <button
              className={`w-full group relative overflow-hidden rounded-2xl
              bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600
              p-4 sm:p-5 text-white font-bold text-lg sm:text-xl
              ${
                theme === 'dark'
                  ? 'shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)]'
                  : 'shadow-[0_10px_25px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)]'
              }
              transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative">Verify & Reset Password</span>
            </button>

            <div className="text-center">
              <button
                className={`text-sm font-semibold transition-colors inline-flex items-center gap-2 group
                ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <span>Didn’t get the code?</span>
                <span className={`${theme === 'dark' ? 'text-blue-400 group-hover:text-blue-300' : 'text-blue-600 group-hover:text-blue-700'} underline decoration-2 underline-offset-4`}>
                  Resend Code
                </span>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div
            className={`${
              theme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-blue-50/80 border-blue-100'
            } backdrop-blur-xl border rounded-2xl p-4 sm:p-5`}
          >
            <p
              className={`${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              } text-xs sm:text-sm text-center leading-relaxed font-medium`}
            >
              <span className="inline-block mr-1">🔐</span> Password reset is secure and time-limited. Never share your OTP
              with anyone.
            </p>
          </div>
        </div>
      </div>
      
      {/* FIX 4: Safe bottom flex spacer for vertical centering */}
      <div className="flex-grow shrink-0"></div>
    </div>
  );
}