import React, { useState } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, LogIn, KeyRound, ArrowRight, ShieldCheck, Globe, Eye, EyeOff } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { buildApiUrl } from '@/services/config';
import { setAuthTokens } from '@/services/auth';

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

    const handleLogin = async () => {
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
            className={`w-full min-h-screen flex flex-col lg:flex-row overflow-hidden transition-colors duration-500 
            ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
        >
            {/* --- LEFT PANEL: IMMERSIVE VISUALS --- */}
            <div
                className={`relative w-full lg:flex-[1.4] flex flex-col justify-between overflow-hidden
                px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12 lg:p-16 xl:p-20
                ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}
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
                <div
                    className={`absolute top-10 left-[-60px] sm:top-1/4 sm:left-1/4 w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] lg:w-[700px] lg:h-[700px] xl:w-[800px] xl:h-[800px] rounded-full blur-[80px] sm:blur-[100px] lg:blur-[120px] mix-blend-screen pointer-events-none opacity-60
                    ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/30'}`}
                />
                <div
                    className={`absolute bottom-0 right-0 w-[220px] h-[220px] sm:w-[360px] sm:h-[360px] lg:w-[520px] lg:h-[520px] xl:w-[600px] xl:h-[600px] rounded-full blur-[80px] sm:blur-[90px] lg:blur-[100px] mix-blend-screen pointer-events-none opacity-60
                    ${isDark ? 'bg-purple-600/20' : 'bg-cyan-400/30'}`}
                />

                {/* Branding Content */}
                <div className="relative z-10">
                    <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center mb-5 sm:mb-6 lg:mb-8 shadow-2xl
                        ${isDark ? 'bg-blue-600 shadow-blue-500/20' : 'bg-white shadow-blue-200'}`}
                    >
                        <KeyRound className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${isDark ? 'text-white' : 'text-blue-600'}`} />
                    </div>

                    <h1
                        className={`text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-black tracking-tight mb-4 sm:mb-5 lg:mb-6 leading-[1.05] sm:leading-[1.1] ${
                            isDark ? 'text-white' : 'text-slate-900'
                        }`}
                    >
                        Secure Access
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                            Anywhere.
                        </span>
                    </h1>

                    <p className={`text-sm sm:text-base lg:text-lg xl:text-xl max-w-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Enter the anonymous network designed exclusively for the IIT Kanpur community.
                    </p>
                </div>

                {/* Footer Stats */}
                <div
                    className={`relative z-10 mt-8 lg:mt-12 flex flex-wrap gap-8 sm:gap-10 lg:gap-12 pt-6 sm:pt-8 lg:pt-10 border-t ${
                        isDark ? 'border-white/10' : 'border-slate-300'
                    }`}
                >
                    <div>
                        <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</div>
                        <div className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            Anonymity
                        </div>
                    </div>
                    <div>
                        <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>2.4k+</div>
                        <div className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            Active Users
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT PANEL: LOGIN FORM --- */}
            <div
                className={`w-full lg:flex-1 flex flex-col justify-center px-6 py-10 sm:px-8 sm:py-12 md:px-10 lg:px-16 xl:px-24 2xl:px-32 relative z-10 shadow-2xl
                ${isDark ? 'bg-slate-900' : 'bg-white'}`}
            >
                <div className="w-full max-w-md mx-auto space-y-8 sm:space-y-10">
                    {/* Form Header */}
                    <div>
                        <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Welcome Back
                        </h2>
                        <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Please enter your details to sign in.
                        </p>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className={`text-sm font-bold ml-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                IITK Email
                            </label>
                            <div className="relative group">
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="username@iitk.ac.in"
                                    className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-xl border-2 font-medium transition-all outline-none text-sm sm:text-base
                                        ${
                                            isDark
                                                ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1 gap-4">
                                <label className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Password
                                </label>
                                <button
                                    className="text-xs font-bold text-blue-500 hover:underline whitespace-nowrap"
                                    onClick={() => {
                                        navigate('/forgot');
                                    }}
                                >
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-xl border-2 font-medium transition-all outline-none text-sm sm:text-base
                                        ${
                                            isDark
                                                ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                                        }`}
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
                    </div>

                    {/* Actions */}
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={handleLogin}
                            disabled={loading}
                            className={`w-full group relative overflow-hidden rounded-xl px-4 py-3.5 sm:py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]
                            ${
                                isDark
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'
                            } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
                        >
                            <div className="flex items-center justify-center gap-2 font-bold text-base sm:text-lg text-white">
                                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>

                        {error && <p className="text-sm text-red-500 pt-2">{error}</p>}

                        <div className="relative flex items-center py-2">
                            <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                            <span className={`flex-shrink-0 mx-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Or
                            </span>
                            <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        New here?{' '}
                        <button
                            className="text-blue-500 font-bold hover:underline"
                            onClick={() => navigate("/register")}
                        >
                            Create an account
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}