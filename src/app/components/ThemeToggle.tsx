import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';

export function ThemeToggle() {
    // Tumhare context se theme aur usko change karne ka function extract karo
    const { theme, toggleTheme } = useTheme(); 
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            className={`p-2.5 rounded-xl transition-all duration-300 active:scale-90 ${
                isDark 
                    ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700 shadow-[0_0_15px_rgba(250,204,21,0.1)]' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
        >
            {/* Smooth transition ke sath icon change hoga */}
            <div className="relative w-5 h-5 flex items-center justify-center">
                <Sun 
                    className={`absolute transition-all duration-300 ${
                        isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                    }`} 
                />
                <Moon 
                    className={`absolute transition-all duration-300 ${
                        isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                    }`} 
                />
            </div>
        </button>
    );
}