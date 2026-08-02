import { Download, Sparkles, X, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface HeroProps {
  url: string
  setUrl: (val: string) => void
  onAnalyze: () => void
  analyzing: boolean
}

export function Hero({ url, setUrl, onAnalyze, analyzing }: HeroProps) {
  const { t } = useTranslation()

  return (
    <section id="top" className="relative w-full overflow-hidden bg-background py-16 md:py-24">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 text-center space-y-6">
        
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            {t('title_main')} <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{t('title_sub')}</span>
            <Sparkles className="inline-block ml-2 w-6 h-6 text-secondary animate-pulse" />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto font-medium">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-3xl mx-auto mt-8 relative group"
        >
          {/* Animated border gradient */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-pink-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          
          <div className="relative flex flex-col sm:flex-row bg-card border border-border p-1.5 rounded-3xl shadow-2xl items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder={t('placeholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-6 py-4 h-12 text-sm focus:outline-none focus:ring-0"
              />
              {url && (
                <button 
                  onClick={() => setUrl('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={onAnalyze}
              disabled={analyzing || !url.trim()}
              className="w-full sm:w-auto px-6 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {analyzing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> {t('btn_analyze')}</>
              ) : (
                <><Download className="w-4 h-4" /> {t('btn_download')}</>
              )}
            </button>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
