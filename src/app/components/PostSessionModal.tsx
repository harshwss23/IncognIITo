import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, AlertTriangle, X, Check, ThumbsUp, UserPlus, Loader2 } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { fetchJsonWithAuth } from '@/services/auth';
import { submitSessionRating } from '@/services/user';
import { useGlobalCleanUp } from '../hooks/useGlobalCleanup';
import { ThemeToggle } from "./ThemeToggle";

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

let toastCounter = 0;

export function PostSessionModal() {
    const colors = useThemeColors();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    // Fallback if URL param is weirdly cased in your setup
    const { roomId, roomid } = useParams<{ roomId?: string, roomid?: string }>();
    const activeRoomId = roomId || roomid;

    // Rating states
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Connection request states
    const [requestSent, setRequestSent] = useState(false);
    const [connectionExists, setConnectionExists] = useState(false);
    const [sendingRequest, setSendingRequest] = useState(false);

    // Report states
    const [reportMode, setReportMode] = useState(false);
    const [reportState, setReportState] = useState<'idle' | 'submitting' | 'success' | 'error' | 'duplicate'>('idle');

    // Participant details
    const [targetId, setTargetId] = useState<number | null>(null);
    const [targetName, setTargetName] = useState<string>("Loading...");
    const [reportReason, setReportReason] = useState<string>("");

    // Toast notifications
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = ++toastCounter;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };

    // Fetch session details
    useEffect(() => {
        if (!activeRoomId) {
            setTargetName("Unknown Session");
            return;
        }

        fetchJsonWithAuth(`/api/match/session/${activeRoomId}`)
            .then((data: any) => {
                if (data.success) {
                    setTargetId(data.partnerId || data.them?.id);
                    setTargetName(data.partnerName || data.them?.username || 'Anonymous User');
                }
            })
            .catch((err: any) => {
                console.error("Failed to fetch session details", err);
                setTargetName("Unknown User");
            });
    }, [activeRoomId]);

    const handleSendConnectionRequest = async () => {
        if (!targetId || sendingRequest || requestSent || connectionExists) return;

        setSendingRequest(true);
        try {
            await fetchJsonWithAuth('/api/requests/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId: targetId }),
            });
            setRequestSent(true);
            showToast(`Connection request sent to ${targetName}! 🎉`, 'success');
        } catch (err: any) {
            const status = err?.status || err?.statusCode;
            if (status === 409) {
                setConnectionExists(true);
                showToast('A connection with this user already exists.', 'info');
            } else {
                showToast(err.message || 'Failed to send connection request.', 'error');
            }
        } finally {
            setSendingRequest(false);
        }
    };

    const handleSubmitRating = async () => {
        if (!activeRoomId) {
            setError('Missing session identifier.');
            return;
        }
        if (rating < 1 || rating > 5) {
            setError('Select a rating between 1 and 5.');
            return;
        }

        try {
            setError(null);
            setSubmitting(true);
            await submitSessionRating(activeRoomId, rating);
            setSubmitted(true);
        } catch (err: any) {
            if (err?.status === 409) {
                setError('You already submitted a rating for this session.');
            } else {
                setError('Failed to submit rating. Please retry.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleReportUser = async () => {
        if (!targetId || reportState === 'submitting' || reportState === 'success') return;

        setReportState('submitting');
        const reason = reportReason.trim() || "Inappropriate behavior in live session";

        try {
            await fetchJsonWithAuth("/api/users/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetId, reason }),
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

    const connBtnLabel = () => {
        if (connectionExists) return 'Connection Exists';
        if (requestSent) return 'Request Sent';
        if (sendingRequest) return 'Sending...';
        return 'Send Connection Request';
    };

    const connBtnIcon = () => {
        if (sendingRequest) return <Loader2 className="w-5 h-5 animate-spin" />;
        if (requestSent || connectionExists) return <Check className="w-5 h-5" />;
        return <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />;
    };

    const connBtnColors = () => {
        if (requestSent)
            return isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
        if (connectionExists)
            return isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700';
        return isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-slate-50';
    };

    return (
        /* ✅ FIXED: Outer container handles overflow-y properly */
        <div className={`fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden transition-colors duration-500
            ${isDark ? 'bg-slate-950/90' : 'bg-slate-200/60'}`}>

            {/* ✅ FIXED: Theme Toggle is now fixed to the viewport, not the scrolling container */}
            <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[200]">
                <ThemeToggle />
            </div>

            {/* Toast Notifications */}
            <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-6 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold pointer-events-auto
                            animate-in slide-in-from-top-5 sm:slide-in-from-right-5 fade-in duration-300
                            ${toast.type === 'success'
                                ? isDark
                                    ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-300 shadow-emerald-900/40'
                                    : 'bg-emerald-50/95 border-emerald-200 text-emerald-800 shadow-emerald-100'
                                : toast.type === 'error'
                                    ? isDark
                                        ? 'bg-red-900/90 border-red-500/30 text-red-300 shadow-red-900/40'
                                        : 'bg-red-50/95 border-red-200 text-red-800 shadow-red-100'
                                    : isDark
                                        ? 'bg-blue-900/90 border-blue-500/30 text-blue-300 shadow-blue-900/40'
                                        : 'bg-blue-50/95 border-blue-200 text-blue-800 shadow-blue-100'
                            }`}
                    >
                        <span className="text-lg shrink-0">
                            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* Background FX Grid (fixed to viewport) */}
            <div className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}
                style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, ${isDark ? '#FFF' : '#334155'} 25%, ${isDark ? '#FFF' : '#334155'} 26%, transparent 27%, transparent 74%, ${isDark ? '#FFF' : '#334155'} 75%, ${isDark ? '#FFF' : '#334155'} 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, ${isDark ? '#FFF' : '#334155'} 25%, ${isDark ? '#FFF' : '#334155'} 26%, transparent 27%, transparent 74%, ${isDark ? '#FFF' : '#334155'} 75%, ${isDark ? '#FFF' : '#334155'} 76%, transparent 77%, transparent)`,
                    backgroundSize: '80px 80px'
                }}
            />

            {/* ✅ FIXED: Flex wrapper to center content while allowing top/bottom scrolling room */}
            <div className="flex min-h-full items-center justify-center p-4 py-20 sm:p-6 sm:py-24">

                {/* Main Modal Card */}
                <div className={`relative w-full max-w-2xl rounded-3xl sm:rounded-[3rem] overflow-hidden border transition-all duration-500
                    ${isDark
                        ? 'bg-[#0B1120] border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                        : 'bg-white/95 backdrop-blur-3xl border-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]'}`}>

                    <div className="h-1.5 sm:h-2 w-full bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500"></div>

                    <button
                        onClick={() => navigate('/homepage')}
                        className={`absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8 p-2 sm:p-3 rounded-full transition-all duration-200 z-20
                        ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700'}`}>
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <div className="px-5 py-8 sm:px-12 sm:py-14 md:px-16 md:py-16 text-center flex flex-col items-center">

                        <div className={`w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-6 sm:mb-8 shadow-xl border transform transition-transform hover:scale-105 duration-300 shrink-0
                            ${isDark
                                ? 'bg-gradient-to-br from-white/10 to-transparent text-blue-400 border-white/10'
                                : 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border-blue-100 shadow-blue-900/5'}`}>
                            <ThumbsUp className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14" />
                        </div>

                        <h2 className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 sm:mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Session Ended
                        </h2>
                        <p className={`text-sm sm:text-lg md:text-xl max-w-lg leading-relaxed mb-6 sm:mb-10 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            How was your conversation with <span className={`font-bold px-2 py-1 rounded-lg break-words ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}>{targetName}</span>?
                        </p>

                        {/* Rating Stars */}
                        <div className="flex justify-center gap-1 sm:gap-4 md:gap-6 mb-8 sm:mb-10 w-full max-w-sm mx-auto flex-nowrap">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="transition-transform hover:scale-110 sm:hover:scale-125 active:scale-95 p-1 sm:p-2 outline-none"
                                >
                                    <Star className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 transition-all duration-300 filter drop-shadow-md sm:drop-shadow-lg
                                        ${star <= (hoveredRating || rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : (isDark ? 'text-slate-800 fill-slate-800/50' : 'text-slate-200 fill-slate-100')
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Connection Request */}
                        <button
                            onClick={handleSendConnectionRequest}
                            disabled={sendingRequest || requestSent || connectionExists}
                            className={`w-full max-w-sm py-4 sm:py-5 rounded-2xl font-bold text-sm sm:text-lg flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 transition-all duration-300 border-2 shadow-sm hover:shadow-md active:scale-[0.98]
                                ${connBtnColors()}
                                ${(requestSent || connectionExists) ? 'cursor-default hover:scale-100' : ''}
                                ${sendingRequest ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {connBtnIcon()}
                            <span className="truncate px-1 sm:px-2">{connBtnLabel()}</span>
                        </button>

                        <div className="w-full max-w-md mx-auto">
                            {reportMode ? (
                                <div className={`p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border relative overflow-hidden text-left mt-2 shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95 fill-mode-forwards
                                    ${isDark ? 'bg-[#0F172A] border-red-500/20 shadow-red-900/10' : 'bg-red-50 border-red-200 shadow-red-200/50'}`}>

                                    {reportState === 'success' ? (
                                        <div className="flex flex-col items-center justify-center py-4 sm:py-6 text-center animate-in fade-in zoom-in duration-500">
                                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                                <Check className="w-6 h-6 sm:w-8 sm:h-8" />
                                            </div>
                                            <h4 className={`font-black text-xl sm:text-2xl mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Report Submitted</h4>
                                            <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                You will no longer match with <b className={isDark ? "text-white break-words" : "text-black break-words"}>{targetName}</b>.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="absolute -top-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 bg-red-500/20 rounded-full blur-[40px] sm:blur-[50px] pointer-events-none"></div>
                                            <h4 className={`font-black text-base sm:text-xl mb-2 flex items-center gap-2 sm:gap-3 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse shrink-0" />
                                                <span>Report User</span>
                                            </h4>
                                            <p className={`text-xs sm:text-sm mb-4 sm:mb-5 leading-relaxed font-medium ${isDark ? 'text-red-300/80' : 'text-red-800'}`}>
                                                Reporting will block further matches with <b className={isDark ? "text-white break-words" : "text-slate-900 break-words"}>{targetName}</b>.
                                            </p>
                                            <textarea
                                                rows={3}
                                                placeholder="Tell us what happened (optional)..."
                                                value={reportReason}
                                                onChange={(e) => setReportReason(e.target.value)}
                                                className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm outline-none border-2 focus:ring-4 focus:ring-red-500/20 transition-all resize-none shadow-inner mb-3 sm:mb-4 min-h-[80px]
                                                    ${isDark
                                                        ? 'bg-[#0B1120] border-white/5 text-white placeholder-red-300/30 focus:border-red-500/50'
                                                        : 'bg-white border-red-200 text-slate-900 placeholder-red-300 focus:border-red-400'}`}
                                            />

                                            {reportState === 'duplicate' && <p className="text-[10px] sm:text-xs font-bold mb-3 text-yellow-500">Already reported.</p>}
                                            {reportState === 'error' && <p className="text-[10px] sm:text-xs font-bold mb-3 text-red-500">Error submitting report.</p>}

                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                                <button
                                                    onClick={handleReportUser}
                                                    disabled={reportState === 'submitting'}
                                                    className={`flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-white text-sm sm:text-base transition-all shadow-lg sm:hover:shadow-xl sm:hover:-translate-y-0.5 active:translate-y-0
                                                        ${isDark ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-600/20' : 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/30'}
                                                        ${reportState === 'submitting' ? 'opacity-70 cursor-not-allowed scale-95' : ''}`}>
                                                    {reportState === 'submitting' ? 'Submitting...' : 'Block & Report'}
                                                </button>
                                                <button
                                                    onClick={() => { setReportMode(false); setReportState('idle'); }}
                                                    className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all border-2
                                                        ${isDark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-white bg-slate-50'}`}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3 sm:space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                    <button
                                        onClick={handleSubmitRating}
                                        disabled={submitting || submitted}
                                        className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-base sm:text-xl text-white shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                                        ${(submitting || submitted)
                                                ? 'bg-slate-500 cursor-not-allowed hover:scale-100 active:scale-100'
                                                : isDark
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-900/40'
                                                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'}`}
                                    >
                                        {submitted ? 'Feedback Submitted ✓' : submitting ? 'Submitting...' : 'Submit Feedback'}
                                    </button>

                                    {error && <p className={`text-xs sm:text-sm text-center font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>}

                                    <button
                                        onClick={() => setReportMode(true)}
                                        className={`w-full py-3 sm:py-4 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 uppercase tracking-widest rounded-xl sm:rounded-2xl
                                            ${isDark ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/5' : 'text-red-500/80 hover:text-red-600 hover:bg-red-50'}`}>
                                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span>Report User</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}