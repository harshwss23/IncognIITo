import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative group overflow-hidden rounded-2xl px-6 py-3 font-bold text-sm
        transition-all duration-300 hover:scale-[1.05] active:scale-[0.98]
        ${theme === 'dark' 
          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]' 
          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_20px_rgba(251,146,60,0.4)] hover:shadow-[0_0_30px_rgba(251,146,60,0.6)]'
        }
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
      <div className="relative flex items-center gap-2">
        {theme === 'dark' ? (
          <>
            <Sun className="w-5 h-5" />
            <span>LIGHT MODE</span>
          </>
        ) : (
          <>
            <Moon className="w-5 h-5" />
            <span>DARK MODE</span>
          </>
        )}
      </div>
    </button>
  );
}
