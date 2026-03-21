import React, { useState } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, KeyRound, ArrowRight, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { buildApiUrl } from '@/services/config';
import { setAuthTokens } from '@/services/auth';
import { useGlobalCleanup } from '../hooks/useGlobalCleanup';

export function DedicatedLoginScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const colors = useThemeColors();
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isDark = theme === 'dark';

    const handleLogin = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await fetch(buildApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json().catch(() => null);

            if (res.ok) {
                const refreshToken = data?.data?.refreshToken || data?.refreshToken || null;

                const token =
                    data?.data?.accessToken ||
                    data?.token ||
                    data?.data?.token;

                if (!token) {
                    setError('Authentication token not received.');
                    setLoading(false);
                    return;
                }

                setAuthTokens({ accessToken: token, refreshToken });

                const fromState = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
                const nextFromQuery = new URLSearchParams(location.search).get('next');
                const nextPath = fromState || nextFromQuery || '/homepage';
                navigate(nextPath);
                return;
            } else {
                setError(data?.message || 'Login failed.');
            }
        } catch (err) {
            setError('Network error. Could not login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            // Fix 1: Changed `min-h` to `h-[100dvh]` and added `overflow-y-auto` 
            // This ensures the whole page scrolls on mobile regardless of parent containers
            className={`w-full flex flex-col lg:flex-row h-[100dvh] overflow-y-auto lg:overflow-hidden transition-colors duration-500 no-scrollbar ${
                isDark ? 'bg-slate-950' : 'bg-white'
            }`}
        >
            {/* --- LEFT PANEL: IMMERSIVE VISUALS --- */}
            <div
                className={`relative w-full lg:flex-1 flex flex-col justify-center lg:justify-between overflow-hidden shrink-0 min-h-[50dvh] lg:h-full
                px-6 py-10 sm:px-10 sm:py-12 md:px-12 lg:p-16 xl:p-20
                ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}
            >
                {/* Grid Pattern */}
                <div
                    className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-20' : 'opacity-40'}`}
                    style={{
                        backgroundImage: `radial-gradient(${isDark ? '#3b82f6' : '#94a3b8'} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* Ambient Orbs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className={`absolute top-0 left-[-10%] sm:top-1/4 sm:left-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen opacity-60
                        ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/30'}`}
                    />
                    <div
                        className={`absolute bottom-0 right-[-10%] sm:bottom-1/4 sm:right-1/4 w-64 h-64 sm:w-80 sm:h-80 lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] mix-blend-screen opacity-60
                        ${isDark ? 'bg-purple-600/20' : 'bg-cyan-400/30'}`}
                    />
                </div>

                {/* Branding Content */}
                <div className="relative z-10 flex flex-col justify-center flex-1 lg:flex-none">
                    <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 shadow-2xl
                        ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-blue-500/30' : 'bg-white shadow-blue-200'}`}
                    >
                        <KeyRound className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${isDark ? 'text-white' : 'text-blue-600'}`} />
                    </div>

                    <h1
                        className={`text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[1.05] mb-5 sm:mb-6 ${
                            isDark ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                        Secure Access
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                            Anywhere.
                        </span>
                    </h1>

                    <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-md lg:max-w-lg font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Enter the anonymous network designed exclusively for the IIT Kanpur community.
                    </p>
                </div>

                {/* Footer Stats */}
                <div
                    className={`relative z-10 mt-10 lg:mt-0 flex flex-wrap gap-8 sm:gap-10 lg:gap-12 p-5 sm:p-6 lg:p-8 rounded-3xl border backdrop-blur-md shadow-sm transition-all inline-flex w-fit
                    ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-slate-200'}`}
                >
                    <div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</div>
                        <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Anonymity
                        </div>
                    </div>
                    <div className={`w-px h-auto ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div>
                        <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>2.4k+</div>
                        <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Active Users
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT PANEL: LOGIN FORM --- */}
            <div
                className={`w-full lg:w-[480px] xl:w-[560px] flex flex-col shrink-0 lg:h-full lg:overflow-y-auto relative z-20 border-t lg:border-t-0 lg:border-l
                ${isDark ? 'bg-slate-900/95 border-white/5 backdrop-blur-xl' : 'bg-white border-slate-100 shadow-2xl'}`}
            >
                {/* Fix 2: Safe top flex spacer for vertical centering */}
                <div className="flex-grow shrink-0"></div>

                {/* Fix 3: Replaced `m-auto` with `mx-auto` so it doesn't push overflow off the top of the screen */}
                <div className="w-full max-w-sm lg:max-w-md mx-auto px-6 py-12 sm:px-12 sm:py-16 lg:p-12 xl:p-16 space-y-8 sm:space-y-10">
                    
                    {/* Form Header */}
                    <div className="space-y-2">
                        <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Welcome Back
                        </h2>
                        <p className={`text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Please enter your details to sign in.
                        </p>
                    </div>

                    {/* Error Toast */}
                    {error && (
                        <div className={`p-3 rounded-xl border font-semibold text-sm animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    {/* Inputs */}
                    <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                        <div className="space-y-2">
                            <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                IITK Email
                            </label>
                            <div className="relative group">
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="username@iitk.ac.in"
                                    className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl border-2 font-medium transition-all outline-none text-sm sm:text-base focus:ring-4
                                        ${isDark
                                            ? 'bg-[#0B1120] border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-600'
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-400'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1 gap-4">
                                <label className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Password
                                </label>
                                <button
                                    type="button"
                                    className={`text-xs font-bold transition-colors hover:underline whitespace-nowrap ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                    onClick={() => navigate('/forgot')}
                                >
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl border-2 font-medium transition-all outline-none text-sm sm:text-base focus:ring-4
                                        ${isDark
                                            ? 'bg-[#0B1120] border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-600'
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-400'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500
                                        ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:hover:scale-100 disabled:active:scale-100
                                ${isDark ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-blue-500/20 hover:shadow-blue-500/40' : 'bg-slate-900 shadow-slate-900/20 hover:shadow-slate-900/40'}
                                ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <div className={`relative h-full w-full rounded-xl px-4 py-3.5 sm:py-4 flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-900 group-hover:bg-opacity-80' : 'bg-slate-900 text-white'}`}>
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-white" />
                                    ) : (
                                        <>
                                            <span className="font-bold text-base sm:text-lg text-white">Sign In</span>
                                            <ArrowRight className="w-5 h-5 text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </form>

                    <div className="relative flex items-center py-2">
                        <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                        <span className={`flex-shrink-0 mx-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Or
                        </span>
                        <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                    </div>

                    {/* Footer */}
                    <div className="text-center space-y-4">
                        <p className={`text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            New here?{' '}
                            <button
                                type="button"
                                className={`font-bold transition-colors hover:underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                onClick={() => navigate("/register")}
                            >
                                Create an account
                            </button>
                        </p>
                    </div>
                </div>

                {/* Fix 4: Safe bottom flex spacer for vertical centering */}
                <div className="flex-grow shrink-0"></div>
            </div>
        </div>
    );
}