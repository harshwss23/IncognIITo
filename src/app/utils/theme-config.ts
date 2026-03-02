export const themeConfig = {
  dark: {
    // Backgrounds
    bgPrimary: 'bg-[#0F172A]',
    bgSecondary: 'bg-[#1E293B]',
    bgGradient: 'bg-gradient-to-b from-[#1E293B] to-[#0F172A]',
    bgGradientHorizontal: 'bg-gradient-to-r from-[#1E293B]/50 to-transparent',
    bgCard: 'bg-gradient-to-r from-white/5 to-white/[0.02]',
    bgCardActive: 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10',
    bgHover: 'hover:bg-white/5',
    
    // Borders
    borderPrimary: 'border-blue-500/20',
    borderSecondary: 'border-white/10',
    borderActive: 'border-cyan-500/50',
    borderHover: 'hover:border-blue-500/40',
    
    // Text
    textPrimary: 'text-white',
    textSecondary: 'text-white/70',
    textMuted: 'text-white/60',
    textAccent: 'text-blue-400',
    textAccentCyan: 'text-cyan-300',
    textAccentSecondary: 'text-blue-300/60',
    
    // Shadows
    shadowPrimary: 'shadow-2xl shadow-blue-500/20',
    shadowActive: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]',
    shadowGlow: 'shadow-[0_0_40px_rgba(59,130,246,0.5)]',
    shadowGlowHover: 'hover:shadow-[0_0_60px_rgba(59,130,246,0.8)]',
    
    // Special effects
    gridPattern: `
      linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px),
      linear-gradient(180deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px),
      linear-gradient(90deg, rgba(234, 179, 8, 0.3) 1px, transparent 1px),
      linear-gradient(180deg, rgba(234, 179, 8, 0.3) 1px, transparent 1px)
    `,
    gridOpacity: 'opacity-10',
  },
  light: {
    // Backgrounds
    bgPrimary: 'bg-gradient-to-br from-slate-50 to-blue-50',
    bgSecondary: 'bg-white',
    bgGradient: 'bg-gradient-to-b from-white to-blue-50',
    bgGradientHorizontal: 'bg-gradient-to-r from-blue-50/50 to-transparent',
    bgCard: 'bg-white',
    bgCardActive: 'bg-gradient-to-r from-cyan-100 to-blue-100',
    bgHover: 'hover:bg-blue-50',
    
    // Borders
    borderPrimary: 'border-blue-200',
    borderSecondary: 'border-slate-200',
    borderActive: 'border-cyan-400',
    borderHover: 'hover:border-blue-400',
    
    // Text
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-500',
    textAccent: 'text-blue-600',
    textAccentCyan: 'text-cyan-700',
    textAccentSecondary: 'text-blue-500',
    
    // Shadows
    shadowPrimary: 'shadow-2xl shadow-blue-200/50',
    shadowActive: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    shadowGlow: 'shadow-[0_0_30px_rgba(59,130,246,0.4)]',
    shadowGlowHover: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]',
    
    // Special effects
    gridPattern: `
      linear-gradient(90deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px),
      linear-gradient(180deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px),
      linear-gradient(180deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px)
    `,
    gridOpacity: 'opacity-30',
  }
};

export type ThemeColors = typeof themeConfig.dark;
