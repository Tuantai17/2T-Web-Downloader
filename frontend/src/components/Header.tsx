import { Download, Sparkles, Moon, Sun, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface HeaderProps {
  isProduction: boolean
  isDark: boolean
  toggleTheme: () => void
  scrollTo: (id: string) => void
}

export function Header({ isProduction, isDark, toggleTheme, scrollTo }: HeaderProps) {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith('vi') ? 'en' : 'vi'
    i18n.changeLanguage(nextLang)
  }

  return (
    <header className="border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Logo */}
        <div 
          onClick={() => scrollTo('top')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Download className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-primary via-secondary to-pink-500 bg-clip-text text-transparent">
              2T Downloader
            </h1>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">High Performance</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold text-muted-foreground">
            <button onClick={() => scrollTo('top')} className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> {t('download')}
            </button>
            <button onClick={() => scrollTo('about')} className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {t('about')}
            </button>
          </nav>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Mode Badge */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm uppercase tracking-wide",
              isProduction 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            )}>
              {isProduction ? 'PRODUCTION' : 'LOCAL'}
            </span>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="h-8 px-2.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center gap-1 text-[11px] font-bold shadow-sm"
              title="Change Language"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{i18n.language?.startsWith('vi') ? 'VI' : 'EN'}</span>
            </button>

            <button 
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
