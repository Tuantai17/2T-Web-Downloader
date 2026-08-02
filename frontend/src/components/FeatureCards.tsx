import { Zap, Shield, MonitorPlay, Music2, Laptop } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

const features = [
  {
    icon: Zap,
    titleKey: 'feature_speed_title',
    descKey: 'feature_speed_desc'
  },
  {
    icon: Shield,
    titleKey: 'feature_safe_title',
    descKey: 'feature_safe_desc'
  },
  {
    icon: MonitorPlay,
    titleKey: 'feature_quality_title',
    descKey: 'feature_quality_desc'
  },
  {
    icon: Music2,
    titleKey: 'feature_audio_title',
    descKey: 'feature_audio_desc'
  },
  {
    icon: Laptop,
    titleKey: 'feature_multi_title',
    descKey: 'feature_multi_desc'
  }
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
}

export function FeatureCards() {
  const { t } = useTranslation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section className="w-full bg-background py-10">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div 
          ref={ref}
          variants={container}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <motion.div 
                key={idx}
                variants={item}
                className="group relative flex flex-col items-center text-center p-4 bg-card border border-border rounded-2xl hover:border-primary/50 transition-colors duration-300"
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
                
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5" />
                </div>
                
                <h3 className="text-[13px] font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{t(feature.titleKey)}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
