import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader, AlertCircle } from 'lucide-react';
import { useThemeColors } from '@/app/hooks/useThemeColors';
import { useTheme } from '@/app/contexts/ThemeContext';
import { buildApiUrl } from '@/services/config';
import { socket } from '@/services/socket';

export function MatchingBuffer() {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch initial status when component mounts
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const res = await fetch(buildApiUrl('/api/match/status'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || 'Failed to check status');
          setLoading(false);
          return;
        }

        if (data.status === 'waiting') {
          setQueueSize(data.queueSize || 0);
          setQueuePosition(Math.max(1, (data.queueSize || 0)));
          setLoading(false);
        } else if (data.status === 'matched') {
          // Already matched, redirect to room
          navigate(`/live/${data.roomId}`);
        } else {
          setError('Unexpected status');
          setLoading(false);
        }
      } catch (err) {
        console.error('Status check error:', err);
        setError('Failed to connect to server');
        setLoading(false);
      }
    };

    checkStatus();
  }, [navigate]);

  // Poll status every 2 seconds
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

        const data = await res.json();

        if (data.success) {
          if (data.status === 'waiting') {
            setQueueSize(data.queueSize || 0);
            setQueuePosition(Math.max(1, (data.queueSize || 0)));
          } else if (data.status === 'matched') {
            // Will be redirected by socket listener, but as backup:
            navigate(`/live/${data.roomId}`);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [loading, error, navigate]);

  // Listen for matched event from socket
  useEffect(() => {
    const handleMatched = (payload: { roomId: string; matchScore: number }) => {
      console.log('Matched event received:', payload);
      navigate(`/live/${payload.roomId}`);
    };

    socket.on('matched', handleMatched);

    return () => {
      socket.off('matched', handleMatched);
    };
  }, [navigate]);

  // Handle cancel - leave queue
  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const res = await fetch(buildApiUrl('/api/match/leave'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        navigate('/');
      } else {
        setError(data.message || 'Failed to leave queue');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError('Failed to cancel matching');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Initializing matchmaking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`max-w-md rounded-3xl border p-8 ${isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Error</h3>
          </div>
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex overflow-hidden transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Background glow */}
        <div className={`absolute top-0 right-0 w-[650px] h-[650px] rounded-full blur-[110px] opacity-20 pointer-events-none transition-colors ${isDark ? 'bg-blue-600/20' : 'bg-blue-200/50'}`} />

        {/* Content */}
        <div className="flex flex-col items-center justify-center flex-1 px-8 z-10">
          <div className={`max-w-md rounded-3xl border p-12 text-center ${isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}>
            {/* Animated Loader */}
            <div className="flex justify-center mb-8">
              <div className="relative w-20 h-20">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin"></div>

                {/* Inner dots */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className={`text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Finding Your Match
            </h2>

            {/* Description */}
            <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              We're searching for someone with shared interests to connect with you.
            </p>

            {/* Queue Position Card */}
            <div className={`rounded-2xl border p-6 mb-8 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Position in Queue
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className={`text-5xl font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {queuePosition}
                </div>
                <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  of <span className="font-bold">{Math.max(queuePosition, queueSize)}</span> waiting
                </div>
              </div>
            </div>

            {/* Status Messages */}
            <div className="space-y-2 mb-8">
              <p className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                ✓ Interests: Loaded
              </p>
              <p className={`text-xs font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                ⟳ Matching algorithm: Running
              </p>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                • Checking compatibility: Every 500ms
              </p>
            </div>

            {/* Tip */}
            <p className={`text-xs mb-8 italic ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              💡 Tip: Better interest matches = faster connection
            </p>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                isDark
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                  : 'bg-red-50 hover:bg-red-100 text-red-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <X className="w-4 h-4" />
              {isCancelling ? 'Leaving...' : 'Cancel Matching'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
