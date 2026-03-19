import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, AlertTriangle, X, Check, ThumbsUp, UserPlus } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { fetchJsonWithAuth } from '@/services/auth';

export function PostSessionModal() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { roomid } = useParams<{ roomid: string }>();
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [reportState, setReportState] = useState<'idle' | 'submitting' | 'success' | 'error' | 'duplicate'>('idle');

  // Participant states
  const [targetId, setTargetId] = useState<number | null>(null);
  const [targetName, setTargetName] = useState<string>("Loading...");
  const [reportReason, setReportReason] = useState<string>("");

  useEffect(() => {
    if (!roomid) return;
    fetchJsonWithAuth(`/api/match/session/${roomid}`)
      .then((data: any) => {
        if (data.success) {
          setTargetId(data.partnerId);
          setTargetName(data.partnerName || 'Anonymous User');
        }
      })
      .catch((err: any) => {
        console.error("Failed to fetch session details", err);
        setTargetName("Unknown User");
      });
  }, [roomid]);

  const handleReportUser = async () => {
    if (!targetId || reportState === 'submitting' || reportState === 'success') return;
    
    setReportState('submitting');
    // Default reason if empty
    const reason = reportReason.trim() || "Inappropriate behavior in live session";

    try {
      await fetchJsonWithAuth("/api/users/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId,
          reason,
        }),
      });
      setReportState('success');
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes('already reported')) {
         setReportState('duplicate');
      } else {
         setReportState('error');
      }
    }
  };

  return (
    <div className={`w-full h-full flex items-center justify-center relative overflow-hidden backdrop-blur-md z-50 font-sans transition-colors duration-500
        ${isDark ? 'bg-slate-950/90' : 'bg-slate-100/90'}`}>
      
      {/* Background FX */}
      <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}
         style={{
             backgroundImage: `linear-gradient(0deg, transparent 24%, ${isDark ? '#FFF' : '#000'} 25%, ${isDark ? '#FFF' : '#000'} 26%, transparent 27%, transparent 74%, ${isDark ? '#FFF' : '#000'} 75%, ${isDark ? '#FFF' : '#000'} 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, ${isDark ? '#FFF' : '#000'} 25%, ${isDark ? '#FFF' : '#000'} 26%, transparent 27%, transparent 74%, ${isDark ? '#FFF' : '#000'} 75%, ${isDark ? '#FFF' : '#000'} 76%, transparent 77%, transparent)`,
             backgroundSize: '80px 80px'
         }}
      />

      <div className={`relative z-10 w-[800px] rounded-[3rem] overflow-hidden border shadow-2xl transition-all duration-300 transform
          ${isDark ? 'bg-[#0B1120] border-white/10 shadow-black/60' : 'bg-white border-white shadow-slate-300/50'}`}>
        
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500"></div>

        {/* Close Button - Navigates Home */}
        <button 
            onClick={() => navigate('/homepage')}
            className={`absolute top-8 right-8 p-3 rounded-full transition-all duration-200
            ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/50' : 'bg-slate-100 hover:bg-slate-200 text-slate-400'}`}>
            <X className="w-6 h-6" />
        </button>

        <div className="px-16 py-14 text-center flex flex-col items-center">
            
            <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center mb-10 shadow-xl border transform transition-transform hover:scale-105 duration-300
                ${isDark ? 'bg-gradient-to-br from-white/10 text-blue-400 border-white/10' : 'bg-gradient-to-br from-slate-50 text-blue-600 border-slate-100'}`}>
                <ThumbsUp className="w-14 h-14" />
            </div>

            <h2 className={`text-5xl font-black tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Session Ended
            </h2>
            <p className={`text-xl max-w-lg leading-relaxed mb-12 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                How was your conversation with <span className={`font-bold px-3 py-1 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}>{targetName}</span>?
            </p>

            <div className="flex justify-center gap-6 mb-12">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-125 active:scale-90 p-2"
                    >
                        <Star className={`w-16 h-16 transition-all duration-300 filter drop-shadow-lg
                            ${star <= (hoveredRating || rating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : (isDark ? 'text-slate-800 fill-slate-800/50' : 'text-slate-200 fill-slate-50')
                            }`} 
                        />
                    </button>
                ))}
            </div>

            <button
                onClick={() => setRequestSent(!requestSent)}
                className={`w-full max-w-md py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 mb-8 transition-all duration-300 border-2
                    ${requestSent
                        ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                        : (isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400')
                    }`}
            >
                {requestSent ? <><Check className="w-5 h-5" /><span>Connection Request Queued</span></> : <><UserPlus className="w-6 h-6" /><span>Send Connection Request</span></>}
            </button>

            <div className="w-full max-w-md">
                {reportMode ? (
                    <div className={`p-8 rounded-[2rem] border relative overflow-hidden text-left mt-2 shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95 fill-mode-forwards
                        ${isDark ? 'bg-[#0F172A] border-red-500/20 shadow-red-900/10' : 'bg-red-50/90 border-red-200 shadow-red-200/50'}`}>
                        
                        {reportState === 'success' ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-500">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                    <Check className="w-8 h-8" />
                                </div>
                                <h4 className={`font-black text-2xl mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Report Submitted</h4>
                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    You will no longer match with <b className={isDark ? "text-white" : "text-black"}>{targetName}</b>.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Red ambient glow */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none"></div>

                                <h4 className={`font-black text-xl mb-2 flex items-center gap-3 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                    <AlertTriangle className="w-6 h-6 animate-pulse" /> 
                                    <span>Report User</span>
                                </h4>
                                
                                <p className={`text-sm mb-5 leading-relaxed font-medium ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                                    You will no longer match with <b className={isDark ? "text-white" : "text-slate-900"}>{targetName}</b>. Admins will review their behavior.
                                </p>
                                
                                <div className="relative mb-5">
                                    <textarea 
                                        rows={3}
                                        placeholder="Tell us what happened (optional)..."
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className={`w-full px-5 py-4 rounded-2xl text-sm outline-none border-2 focus:ring-4 focus:ring-red-500/20 transition-all resize-none shadow-inner
                                            ${isDark 
                                                ? 'bg-[#0B1120] border-white/5 text-white placeholder-red-300/30 focus:border-red-500/50' 
                                                : 'bg-white border-red-200 text-slate-900 placeholder-red-300 focus:border-red-400'}`}
                                    />
                                </div>

                                {reportState === 'duplicate' && (
                                    <p className={`text-sm font-bold mb-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                        You have already reported this user!
                                    </p>
                                )}
                                {reportState === 'error' && (
                                    <p className={`text-sm font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                        An error occurred. Please try again.
                                    </p>
                                )}
                                
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleReportUser}
                                        disabled={reportState === 'submitting'}
                                        className={`flex-[2] py-4 rounded-2xl font-black text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0
                                            ${isDark ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-600/20' : 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/30'}
                                            ${reportState === 'submitting' ? 'opacity-70 cursor-not-allowed scale-95' : ''}`}>
                                        {reportState === 'submitting' ? 'Submitting...' : 'Block & Report'}
                                    </button>
                                    <button 
                                        onClick={() => { setReportMode(false); setReportState('idle'); }}
                                        className={`flex-1 py-4 rounded-2xl font-bold transition-all border-2
                                            ${isDark ? 'border-white/10 text-white/50 hover:bg-white/5 hover:text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'}`}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 fill-mode-forwards">
                        {/* Submit Button */}
                        <button className={`w-full py-5 rounded-2xl font-black text-xl text-white shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                            ${isDark 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20' 
                                : 'bg-slate-900 hover:bg-slate-800 hover:shadow-2xl'}`}>
                            Submit Feedback
                        </button>

                        {/* Report Link */}
                        <button 
                            onClick={() => setReportMode(true)}
                            className={`w-full py-4 font-bold text-sm transition-colors flex items-center justify-center gap-2 uppercase tracking-widest rounded-2xl hover:bg-red-500/5
                                ${isDark 
                                    ? 'text-red-400/60 hover:text-red-400' 
                                    : 'text-red-400 hover:text-red-600'}`}>
                            <AlertTriangle className="w-5 h-5" />
                            <span>Report User</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}