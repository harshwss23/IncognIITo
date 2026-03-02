import React, { useState } from 'react';
import { Lock, Mail, LogIn, KeyRound, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';

export function DedicatedLoginScreen() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  const isDark = theme === 'dark';

    // Login handler
    const handleLogin = async () => {
        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json().catch(() => null);

            if (res.ok) {
                const success = data === true || data?.success === true || data?.token || data?.accessToken;
                if (success) {
                    window.location.href = 'http://localhost:5173/homepage';
                    return;
                }
                setError(data?.message || 'Login failed.');
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
    // MAIN CONTAINER: Full Screen Split Layout
    <div className={`w-full h-full flex overflow-hidden transition-colors duration-500 
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* --- LEFT PANEL: IMMERSIVE VISUALS (60% Width) --- */}
      <div className={`relative flex-[1.4] hidden lg:flex flex-col justify-between p-20 overflow-hidden
         ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}>
         
         {/* 1. Grid Pattern (Applied only to left panel) */}
         <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-20' : 'opacity-40'}`}
            style={{
                backgroundImage: `radial-gradient(${isDark ? '#3b82f6' : '#94a3b8'} 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
            }}
         />

         {/* 2. Ambient Orbs (Scaled up for Desktop) */}
         <div className={`absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-screen pointer-events-none opacity-60
             ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/30'}`} />
         <div className={`absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] mix-blend-screen pointer-events-none opacity-60
             ${isDark ? 'bg-purple-600/20' : 'bg-cyan-400/30'}`} />

         {/* Branding Content */}
         <div className="relative z-10">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl
                ${isDark ? 'bg-blue-600 shadow-blue-500/20' : 'bg-white shadow-blue-200'}`}>
                <KeyRound className={`w-10 h-10 ${isDark ? 'text-white' : 'text-blue-600'}`} />
            </div>
            
            <h1 className={`text-7xl font-black tracking-tight mb-6 leading-[1.1] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Secure Access<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                    Anywhere.
                </span>
            </h1>
            <p className={`text-xl max-w-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Enter the anonymous network designed exclusively for the IIT Kanpur community.
            </p>
         </div>

         {/* Footer Stats */}
         <div className={`relative z-10 flex gap-12 pt-10 border-t ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
             <div>
                 <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</div>
                 <div className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Anonymity</div>
             </div>
             <div>
                 <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>2.4k+</div>
                 <div className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Active Users</div>
             </div>
         </div>
      </div>

      {/* --- RIGHT PANEL: LOGIN FORM (40% Width) --- */}
      <div className={`flex-1 flex flex-col justify-center px-16 lg:px-24 xl:px-32 relative z-10 shadow-2xl
          ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        
        <div className="w-full max-w-md mx-auto space-y-10">
            
            {/* Form Header */}
            <div>
                <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Welcome Back
                </h2>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Please enter your details to sign in.
                </p>
            </div>

            {/* Inputs */}
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className={`text-sm font-bold ml-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>IITK Email</label>
                    <div className="relative group">
                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="username@iitk.ac.in"
                            className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 font-medium transition-all outline-none
                                ${isDark 
                                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                                }`}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                        <button className="text-xs font-bold text-blue-500 hover:underline">Forgot?</button>
                    </div>
                    <div className="relative group">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 font-medium transition-all outline-none
                                ${isDark 
                                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                                }`}
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]
                    ${isDark 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20' 
                        : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'
                    } ${loading ? 'opacity-70 pointer-events-none' : ''}`}
                >
                    <div className="flex items-center justify-center gap-2 font-bold text-lg text-white">
                        <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                {error && (
                    <p className="text-sm text-red-500 pt-2">{error}</p>
                )}

                <div className="relative flex items-center py-2">
                    <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                    <span className={`flex-shrink-0 mx-4 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Or</span>
                    <div className={`flex-grow border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}></div>
                </div>
            </div>

            {/* Footer */}
            <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                New here? <button className="text-blue-500 font-bold hover:underline">Create an account</button>
            </p>

        </div>
      </div>

    </div>
  );
}