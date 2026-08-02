import { Shield, Lock, Rocket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const footerCards = [
  {
    icon: Lock,
    titleKey: 'footer_no_data_title',
    descKey: 'footer_no_data_desc'
  },
  {
    icon: Shield,
    titleKey: 'footer_safe_title',
    descKey: 'footer_safe_desc'
  },
  {
    icon: Rocket,
    titleKey: 'footer_update_title',
    descKey: 'footer_update_desc'
  }
]

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer id="about" className="w-full bg-background border-t border-border pt-12 pb-6 mt-10">
      <div className="max-w-5xl mx-auto px-6">
        
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {footerCards.map((card, idx) => {
            const Icon = card.icon
            return (
              <div key={idx} className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center hover:border-primary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-foreground text-sm mb-1">{t(card.titleKey)}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t(card.descKey)}</p>
              </div>
            )
          })}
        </div>

        <div className="text-center text-[10px] font-medium text-muted-foreground border-t border-border/50 pt-6">
          <p>© {new Date().getFullYear()} {t('footer_copyright')}</p>
          <p className="mt-1 opacity-70">{t('footer_subtitle')}</p>
        </div>
      </div>
    </footer>
  )
}
