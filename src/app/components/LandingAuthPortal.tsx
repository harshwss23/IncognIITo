import React from 'react';
import { LogIn, Mail, Fingerprint, Shield, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useGlobalCleanup } from '../hooks/useGlobalCleanup';

export function LandingAuthPortal() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  return (
    <div
      // Main container handles the global scroll for mobile, locks on desktop
      className={`w-full h-[100dvh] overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row transition-colors duration-500 no-scrollbar ${
        isDark ? 'bg-slate-950' : 'bg-white'
      }`}
    >
      {/* --- LEFT PANEL: Branding & Visuals --- */}
      <div
        className={`relative w-full lg:flex-1 flex flex-col justify-center lg:justify-between overflow-hidden shrink-0 min-h-[50dvh] lg:h-full
        px-6 py-12 sm:px-10 sm:py-16 md:px-12 lg:p-16 xl:p-20
        ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}
      >
        {/* Background Pattern */}
        <div
          className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-30' : 'opacity-60'}`}
          style={{
            backgroundImage: `linear-gradient(${isDark ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px), linear-gradient(to right, ${isDark ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glowing Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className={`absolute top-0 left-[-10%] sm:top-1/4 sm:left-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen
              ${isDark ? 'bg-blue-600/20' : 'bg-blue-300/40'}`}
          />
          <div
            className={`absolute bottom-0 right-[-10%] sm:bottom-1/4 sm:right-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen
              ${isDark ? 'bg-purple-600/20' : 'bg-cyan-300/40'}`}
          />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex flex-col justify-center flex-1 lg:flex-none">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className={`h-[2px] w-8 sm:w-12 rounded-full ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
            <span
              className={`text-[10px] sm:text-xs lg:text-sm font-bold tracking-[0.2em] uppercase ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              IITK&apos;s Exclusive Network
            </span>
          </div>

          <h1
            className={`text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[1.05] mb-5 sm:mb-6 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Incogn
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
              IIT
            </span>
            o
          </h1>

          <p
            className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-md lg:max-w-lg font-medium leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Connect anonymously. Share authentically. <br className="hidden sm:block" />
            The only video networking platform designed exclusively for the IIT Kanpur community.
          </p>
        </div>

        {/* Live Stats Ticker */}
        <div
          className={`relative z-10 mt-10 lg:mt-0 flex flex-col sm:flex-row gap-4 sm:gap-6 lg:gap-12 p-5 sm:p-6 lg:p-8 rounded-3xl border backdrop-blur-md shadow-sm transition-all
            ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-slate-200'}`}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                1,240+
              </div>
              <div
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Active Students
              </div>
            </div>
          </div>

          <div className={`hidden sm:block w-px h-auto ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>

          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
              }`}
            >
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                100%
              </div>
              <div
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Anonymity
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: Auth Actions --- */}
      <div
        className={`w-full lg:w-[480px] xl:w-[560px] flex flex-col shrink-0 lg:h-full lg:overflow-y-auto relative z-20 border-t lg:border-t-0 lg:border-l
          ${isDark ? 'bg-slate-900/95 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-100 shadow-2xl'}`}
      >
        {/* Fix: Safe top flex spacer for vertical centering */}
        <div className="flex-grow shrink-0"></div>

        {/* Fix: Replaced m-auto with mx-auto to prevent clipping */}
        <div className="w-full max-w-sm lg:max-w-md mx-auto px-6 py-12 sm:px-12 sm:py-16 lg:p-12 xl:p-16 space-y-8 sm:space-y-10">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 sm:mb-8
                ${
                  isDark
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-[0_0_40px_rgba(59,130,246,0.3)]'
                    : 'bg-slate-900 shadow-xl'
                }`}
            >
              <Fingerprint className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Portal Access
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Authenticate to enter the network
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4 sm:space-y-5">
            <button
              onClick={() => navigate('/login')}
              className={`group relative w-full overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg
                ${isDark ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-blue-500/20 hover:shadow-blue-500/40' : 'bg-slate-900 shadow-slate-900/20 hover:shadow-slate-900/40'}`}
            >
              <div
                className={`relative h-full w-full rounded-xl px-5 py-4 sm:py-5 flex items-center justify-center gap-3 transition-all
                  ${isDark ? 'bg-slate-900 group-hover:bg-opacity-80' : 'bg-slate-900 text-white'}`}
              >
                <LogIn className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform group-hover:-translate-x-1 ${isDark ? 'text-blue-400' : 'text-white'}`} />
                <span className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-white'}`}>
                  Login with Email
                </span>
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 text-white" />
              </div>
            </button>

            <button
              onClick={() => navigate('/register')}
              className={`w-full rounded-2xl px-5 py-4 sm:py-5 border-2 font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-300
                ${
                  isDark
                    ? 'border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                }`}
            >
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span>Register with Email</span>
            </button>
          </div>

          {/* Terms */}
          <p
            className={`text-center text-xs sm:text-sm leading-relaxed pt-4 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            By entering, you agree to our{' '}
            <span className={`underline cursor-pointer transition-colors ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}>Zero-Log Policy</span> and{' '}
            <span className={`underline cursor-pointer transition-colors ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}>Community Guidelines</span>.
          </p>
        </div>

        {/* Fix: Safe bottom flex spacer for vertical centering */}
        <div className="flex-grow shrink-0"></div>
      </div>
    </div>
  );
}