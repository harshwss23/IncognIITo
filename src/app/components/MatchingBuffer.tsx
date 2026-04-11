// ============================================================================
// FILE: src/components/MatchingBuffer.tsx
// PURPOSE: Handles the waiting state for matchmaking, handles queue polling,
//          and enforces ban-security redirects from the frontend using hard reloads.
// ============================================================================

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader, AlertCircle } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { buildApiUrl } from '@/services/config';
import { socket } from '@/services/socket';
import { useGlobalCleanUp } from '../hooks/useGlobalCleanup';
import { ThemeToggle } from "./ThemeToggle";

export function MatchingBuffer() {
  const { skipCleanup } = useGlobalCleanUp();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const isJoinedRef = useRef(false);

  // --- 1. INITIALIZATION: Check status and Auto-Join if needed ---
  useEffect(() => {
    const initMatchmaking = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        // Check current status
        const res = await fetch(buildApiUrl('/api/match/status'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // 🧱 INITIALIZATION BOUNCER (NUCLEAR OPTION) 🧱
        if (res.status === 403) {
          localStorage.removeItem('token');
          window.location.href = '/login'; // Hard redirect, bypasses React Router
          return;
        }

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'Failed to verify status');
          setLoading(false);
          return;
        }

        if (data.status === 'waiting') {
          setQueueSize(data.queueSize || 0);
          setQueuePosition(Math.max(1, data.queueSize || 0));
          setLoading(false);
        } else if (data.status === 'matched') {
          skipCleanup();
          navigate(`/live/${data.roomId}`);
        } else {
          // Status is 'idle' -> Join the queue
          const joinRes = await fetch(buildApiUrl('/api/match/join'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          // 🧱 JOIN BOUNCER (NUCLEAR OPTION) 🧱
          if (joinRes.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/login'; 
            return;
          }

          const joinData = await joinRes.json();

          if (joinData.success) {
            const finalCheck = await fetch(buildApiUrl('/api/match/status'), {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const finalData = await finalCheck.json();
            setQueueSize(finalData.queueSize || 0);
            setQueuePosition(Math.max(1, finalData.queueSize || 0));
            setLoading(false);
          } else {
            setError(joinData.message || 'Failed to join matchmaking queue');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Matchmaking init error:', err);
        setError('Failed to connect to server');
        setLoading(false);
      }
    };

    initMatchmaking();
  }, [navigate, skipCleanup]);

  // --- 2. POLLING: Update queue position while waiting ---
  useEffect(() => {
    if (loading || error) return;

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(buildApiUrl('/api/match/status'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // 🧱 POLLING KILL-SWITCH (NUCLEAR OPTION) 🧱
        if (res.status === 403) {
          console.warn("User banned mid-polling. Severing session.");
          clearInterval(pollInterval);
          localStorage.removeItem('token');
          window.location.href = '/login'; // Instantly rips the page away
          return;
        }

        const data = await res.json();

        if (data.success) {
          if (data.status === 'waiting') {
            setQueueSize(data.queueSize || 0);
            setQueuePosition(Math.max(1, data.queueSize || 0));
          } else if (data.status === 'matched') {
            skipCleanup();
            navigate(`/live/${data.roomId}`);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [loading, error, navigate, skipCleanup]);

  // --- 3. SOCKET: Real-time match notification ---
  useEffect(() => {
    const handleMatched = (payload: { roomId: string; matchScore: number }) => {
      skipCleanup();
      navigate(`/live/${payload.roomId}`);
    };

    socket.on('matched', handleMatched);
    return () => {
      socket.off('matched', handleMatched);
    };
  }, [navigate, skipCleanup]);

  // --- 4. ACTIONS: Leave Queue ---
  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(buildApiUrl('/api/match/leave'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        navigate('/homepage');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to leave queue');
      }
    } catch (err) {
      setError('Failed to cancel matching');
    } finally {
      setIsCancelling(false);
    }
  };

  // Rendering logic for Loading State
  if (loading) {
    return (
      <div className={`w-full h-[100dvh] flex items-center justify-center p-4 transition-colors duration-500 overflow-y-auto no-scrollbar ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-5 my-auto">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className={`absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500/50 border-b-blue-500/10 border-l-transparent animate-spin`} />
            <Loader className={`w-8 h-8 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <p className={`text-lg sm:text-xl font-bold tracking-tight animate-pulse ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Initializing matchmaking...
          </p>
        </div>
      </div>
    );
  }

  // Rendering logic for Error State
  if (error) {
    return (
      <div className={`w-full h-[100dvh] flex items-center justify-center p-4 transition-colors duration-500 overflow-y-auto no-scrollbar ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>
        <div className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl my-auto ${isDark ? 'bg-slate-900/80 border-white/10 shadow-black/50' : 'bg-white border-slate-200 shadow-blue-900/5'}`}>
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Connection Error</h3>
          </div>
          <p className={`text-sm sm:text-base mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
          <button
            onClick={() => navigate('/homepage')}
            className={`w-full py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold transition-all
              ${isDark ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Main Waiting State UI
  return (
    <div className={`w-full h-[100dvh] overflow-y-auto no-scrollbar flex flex-col p-4 sm:p-8 relative transition-colors duration-500 ${isDark ? 'bg-[#020617]' : 'bg-slate-50'}`}>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full blur-[80px] sm:blur-[120px] mix-blend-screen opacity-50 sm:opacity-30 transition-colors ${isDark ? 'bg-blue-600' : 'bg-blue-300'}`} />
        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full blur-[80px] sm:blur-[120px] mix-blend-screen opacity-50 sm:opacity-20 transition-colors ${isDark ? 'bg-purple-600' : 'bg-purple-300'}`} />
      </div>

      <div className="flex-grow shrink-0 flex items-center justify-center relative z-10 w-full">
        <div className={`w-full max-w-md my-auto rounded-[2rem] sm:rounded-[2.5rem] border p-8 sm:p-10 text-center shadow-2xl backdrop-blur-xl transition-all
          ${isDark ? 'bg-slate-900/60 border-white/10 shadow-black/50' : 'bg-white/80 border-slate-200 shadow-blue-900/5'}`}>

          <div className="flex flex-col items-center justify-center mb-8 sm:mb-10">
            <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 mb-6">
              <div className={`absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse ${isDark ? 'bg-blue-500' : 'bg-blue-400'}`} />
              <div className={`absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin`} style={{ animationDuration: '1.5s' }} />
              <div className={`absolute inset-2 rounded-full border-[3px] border-transparent border-b-cyan-400 animate-spin`} style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              <div className="relative flex gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-black mb-3 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Finding Your Match
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              We're searching for someone with shared interests to connect with you. Hang tight!
            </p>
          </div>

          <div className={`rounded-2xl border p-5 sm:p-6 mb-8 transition-colors ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Position in Queue
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <div className={`text-5xl sm:text-6xl font-black tracking-tighter ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                {queuePosition}
              </div>
              <div className={`text-sm sm:text-base font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                / <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{Math.max(queuePosition, queueSize)}</span> waiting
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-8 text-left bg-black/5 dark:bg-black/20 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Interests Loaded
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Matching algorithm running...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full border-2 border-slate-400"></div>
              <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Checking compatibility
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className={`w-full group flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold transition-all border
              ${isDark
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30'
                : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100 hover:border-red-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" />
            {isCancelling ? 'Leaving Queue...' : 'Cancel Matching'}
          </button>
        </div>
      </div>
      <div className="flex-grow shrink-0"></div>
    </div>
  );
}