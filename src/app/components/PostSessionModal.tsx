import React, { useState } from 'react';
import { Star, AlertTriangle, X, Check, ThumbsUp, UserPlus } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function PostSessionModal() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const [reportMode, setReportMode] = useState(false);

  return (
    // MAIN CONTAINER: Full Screen Overlay
    <div className={`w-full h-full flex items-center justify-center relative overflow-hidden backdrop-blur-md z-50 font-sans transition-colors duration-500
        ${isDark ? 'bg-slate-950/90' : 'bg-slate-100/90'}`}>
      
      {/* --- BACKGROUND FX --- */}
      <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}
         style={{
             backgroundImage: `linear-gradient(0deg, transparent 24%, ${isDark ? '#FFF' : '#000'} 25%, ${isDark ? '#FFF' : '#000'} 26%, transparent 27%, transparent 74%, ${isDark ? '#FFF' : '#000'} 75%, ${isDark ? '#FFF' : '#000'} 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, ${isDark ? '#FFF' : '#000'} 25%, ${isDark ? '#FFF' : '#000'} 26%, transparent 27%, transparent 74%, ${isDark ? '#FFF' : '#000'} 75%, ${isDark ? '#FFF' : '#000'} 76%, transparent 77%, transparent)`,
             backgroundSize: '80px 80px'
         }}
      />

      {/* Large Ambient Glows */}
      <div className={`absolute top-0 left-0 w-[1000px] h-[1000px] rounded-full blur-[150px] pointer-events-none 
          ${isDark ? 'bg-blue-600/10 opacity-20' : 'bg-blue-300 opacity-20 mix-blend-multiply'}`} />
      <div className={`absolute bottom-0 right-0 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none 
          ${isDark ? 'bg-purple-600/10 opacity-20' : 'bg-cyan-300 opacity-20 mix-blend-multiply'}`} />

      {/* --- HERO MODAL CARD --- */}
      <div className={`relative z-10 w-[800px] rounded-[3rem] overflow-hidden border shadow-2xl transition-all duration-300 transform
          ${isDark 
            ? 'bg-[#0B1120] border-white/10 shadow-black/60' 
            : 'bg-white border-white shadow-slate-300/50'}`}>
        
        {/* Top Accent Line */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500"></div>

        {/* Close Button */}
        <button className={`absolute top-8 right-8 p-3 rounded-full transition-all duration-200
            ${isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900'}`}>
            <X className="w-6 h-6" />
        </button>

        <div className="px-16 py-14 text-center flex flex-col items-center">
            
            {/* Massive Icon */}
            <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center mb-10 shadow-xl border transform transition-transform hover:scale-105 duration-300
                ${isDark 
                    ? 'bg-gradient-to-br from-white/10 to-transparent border-white/10 text-blue-400 shadow-blue-900/20' 
                    : 'bg-gradient-to-br from-slate-50 to-white border-slate-100 text-blue-600 shadow-blue-100'}`}>
                <ThumbsUp className="w-14 h-14" />
            </div>

            {/* Typography Scaled Up */}
            <h2 className={`text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Session Ended
            </h2>
            <p className={`text-xl max-w-lg leading-relaxed mb-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                How was your conversation with <span className={`font-bold px-3 py-1 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}>User : LunarGhost</span>?
            </p>

            {/* Massive Stars */}
            <div className="flex justify-center gap-6 mb-12">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-125 active:scale-90 focus:outline-none p-2"
                    >
                        <Star className={`w-16 h-16 transition-all duration-300 filter drop-shadow-lg
                            ${star <= (hoveredRating || rating) 
                                ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                                : (isDark ? 'text-slate-800 fill-slate-800/50' : 'text-slate-200 fill-slate-50')
                            }`} 
                        />
                    </button>
                ))}
            </div>

            {/* Connection Button (Wider & Taller) */}
            <button
                onClick={() => setRequestSent(!requestSent)}
                className={`w-full max-w-md py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 mb-8 transition-all duration-300 border-2
                    ${requestSent
                        ? (isDark 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                        : (isDark
                            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:shadow-lg')
                    }`}
            >
                {requestSent ? (
                    <>
                        <div className={`p-1.5 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                            <Check className="w-5 h-5" />
                        </div>
                        <span>Connection Request Queued</span>
                    </>
                ) : (
                    <>
                        <UserPlus className="w-6 h-6" />
                        <span>Send Connection Request</span>
                    </>
                )}
            </button>

            {/* Bottom Actions */}
            <div className="w-full max-w-md space-y-5">
                {/* Submit Button */}
                <button className={`w-full py-5 rounded-2xl font-black text-xl text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                    ${isDark 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20' 
                        : 'bg-slate-900 hover:bg-slate-800 hover:shadow-2xl'}`}>
                    Submit Feedback
                </button>

                {/* Report Link */}
                <button 
                    onClick={() => setReportMode(!reportMode)}
                    className={`w-full py-2 font-bold text-sm transition-colors flex items-center justify-center gap-2 uppercase tracking-widest
                        ${isDark 
                            ? 'text-red-400/60 hover:text-red-400' 
                            : 'text-red-400 hover:text-red-600'}`}>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Report User</span>
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}