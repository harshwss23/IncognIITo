import React from 'react';
import { LogIn, Mail, Fingerprint, Shield, Users, ArrowRight } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function LandingAuthPortal() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    // MAIN CONTAINER: w-full h-full (Desktop Split Layout)
    <div className={`w-full h-full flex overflow-hidden transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
      
      {/* --- LEFT PANEL: Branding & Visuals (60% Width) --- */}
      <div className={`relative flex-1 hidden lg:flex flex-col justify-between p-16 overflow-hidden
        ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
        
        {/* Background Pattern */}
        <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-30' : 'opacity-60'}`}
             style={{
                 backgroundImage: `linear-gradient(${isDark ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px), linear-gradient(to right, ${isDark ? '#1e293b' : '#cbd5e1'} 1px, transparent 1px)`,
                 backgroundSize: '40px 40px'
             }}
        />
        
        {/* Glowing Orbs (Ambient) */}
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[128px] pointer-events-none mix-blend-screen
            ${isDark ? 'bg-blue-600/20' : 'bg-blue-300/40'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[128px] pointer-events-none mix-blend-screen
            ${isDark ? 'bg-purple-600/20' : 'bg-cyan-300/40'}`} />

        {/* Brand Header */}
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <div className={`h-px w-12 ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
                <span className={`text-sm font-bold tracking-[0.2em] uppercase ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    IITK Exclusive Network
                </span>
            </div>
            <h1 className={`text-8xl font-black tracking-tighter leading-[0.9] mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Incogn<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">IIT</span>o
            </h1>
            <p className={`text-xl max-w-md font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Connect anonymously. Share authentically. <br/>
                The only video networking platform designed exclusively for the IIT Kanpur community.
            </p>
        </div>

        {/* Live Stats Ticker */}
        <div className={`relative z-10 flex gap-12 p-8 rounded-3xl border backdrop-blur-md
            ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-slate-200 shadow-xl'}`}>
            
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>1,240+</div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Active Students</div>
                </div>
            </div>

            <div className={`w-px h-auto ${isDark ? 'bg-white/10' : 'bg-slate-300'}`}></div>

            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Anonymity</div>
                </div>
            </div>
        </div>

      </div>

      {/* --- RIGHT PANEL: Auth Actions (40% Width) --- */}
      <div className={`w-full lg:w-[480px] flex items-center justify-center p-12 relative z-20 border-l
          ${isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-100 shadow-2xl'}`}>
          
          <div className="w-full max-w-sm space-y-10">
              
              {/* Header */}
              <div className="text-center space-y-2">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 
                      ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'bg-slate-900 shadow-xl'}`}>
                      <Fingerprint className="w-8 h-8 text-white" />
                  </div>
                  <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Portal Access</h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Authenticate to enter the network</p>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                  {/* SSO Button */}
                  <button className={`group relative w-full overflow-hidden rounded-xl p-1 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                      ${isDark ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-slate-900'}`}>
                      <div className={`relative h-full w-full rounded-lg px-6 py-4 flex items-center justify-center gap-3 transition-all
                          ${isDark ? 'bg-[#0f172a] group-hover:bg-opacity-90' : 'bg-slate-900 text-white'}`}>
                          <LogIn className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-white'}`} />
                          <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-white'}`}>Login with Email</span>
                          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                  </button>

                  {/* Email Button */}
                  <button className={`w-full rounded-xl px-6 py-4 border-2 font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:bg-opacity-50
                      ${isDark 
                        ? 'border-white/10 text-white hover:bg-white/10' 
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}>
                      <Mail className="w-5 h-5" />
                      <span>Register with Email</span>
                  </button>
              </div>

              {/* Terms */}
              <p className={`text-center text-xs leading-relaxed px-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  By entering, you agree to our <span className="underline cursor-pointer hover:text-blue-500">Zero-Log Policy</span> and <span className="underline cursor-pointer hover:text-blue-500">Community Guidelines</span>.
              </p>

          </div>
      </div>
      
    </div>
  );
}