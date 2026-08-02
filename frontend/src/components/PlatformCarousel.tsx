import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTranslation } from 'react-i18next'

const platforms = [
  { name: "YouTube", domain: "youtube.com" },
  { name: "TikTok", domain: "tiktok.com" },
  { name: "Facebook", domain: "facebook.com" },
  { name: "Instagram", domain: "instagram.com" },
  { name: "X (Twitter)", domain: "x.com" },
  { name: "Threads", domain: "threads.net" },
  { name: "Reddit", domain: "reddit.com" },
  { name: "Pinterest", domain: "pinterest.com" },
  { name: "Snapchat", domain: "snapchat.com" },
  { name: "Vimeo", domain: "vimeo.com" },
  { name: "Dailymotion", domain: "dailymotion.com" },
  { name: "Bilibili", domain: "bilibili.com" },
  { name: "Twitch", domain: "twitch.tv" },
  { name: "Kick", domain: "kick.com" },
  { name: "LinkedIn", domain: "linkedin.com" },
  { name: "SoundCloud", domain: "soundcloud.com" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "Mixcloud", domain: "mixcloud.com" },
  { name: "Tumblr", domain: "tumblr.com" },
  { name: "VK", domain: "vk.com" },
  { name: "OK", domain: "ok.ru" },
  { name: "Douyin", domain: "douyin.com" },
  { name: "Weibo", domain: "weibo.com" },
  { name: "Niconico", domain: "nicovideo.jp" },
  { name: "Rumble", domain: "rumble.com" },
  { name: "Odysee", domain: "odysee.com" },
  { name: "PeerTube", domain: "joinpeertube.org" },
  { name: "Telegram Video", domain: "telegram.org" }
]

export function PlatformCarousel() {
  const { t } = useTranslation()
  const [itemsPerPage, setItemsPerPage] = useState(5)

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 640) setItemsPerPage(2)
      else if (window.innerWidth < 1024) setItemsPerPage(3)
      else setItemsPerPage(5)
    }
    updateItemsPerPage()
    window.addEventListener('resize', updateItemsPerPage)
    return () => window.removeEventListener('resize', updateItemsPerPage)
  }, [])

  const pages = []
  for (let i = 0; i < platforms.length; i += itemsPerPage) {
    pages.push(platforms.slice(i, i + itemsPerPage))
  }

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })]
  )

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi])
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi])

  const onInit = useCallback((emblaApi: any) => {
    setScrollSnaps(emblaApi.scrollSnapList())
  }, [])

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    onInit(emblaApi)
    onSelect(emblaApi)
    emblaApi.on('reInit', onInit)
    emblaApi.on('reInit', onSelect)
    emblaApi.on('select', onSelect)
  }, [emblaApi, onInit, onSelect])

  return (
    <section className="w-full py-10 bg-background">
      <div className="max-w-5xl mx-auto px-6 mb-8 text-center flex items-center justify-center gap-4">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border max-w-[80px]" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {t('carousel_title')}
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        </h2>
        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border max-w-[80px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-10">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex backface-hidden touch-pan-y">
            {pages.map((page, pageIdx) => (
              <div key={pageIdx} className="flex-[0_0_100%] min-w-0 px-2 sm:px-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                  {page.map((platform, idx) => (
                    <div 
                      key={idx}
                      className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-[1.25rem] bg-card border border-border shadow-sm text-xs sm:text-sm font-semibold text-foreground/80 hover:text-foreground hover:border-primary/50 hover:shadow-primary/20 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer select-none flex flex-col sm:flex-row items-center justify-center gap-2.5 text-center sm:text-left"
                    >
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${platform.domain}&sz=64`}
                        alt={platform.name}
                        className="w-6 h-6 sm:w-5 sm:h-5 rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <span className="truncate w-full">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <button
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-foreground hover:bg-card hover:text-primary transition-all z-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-foreground hover:bg-card hover:text-primary transition-all z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              index === selectedIndex 
                ? "bg-primary w-8" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
