import { useState, useEffect } from 'react'
import { API_BASE } from './config'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { FeatureCards } from './components/FeatureCards'
import { PlatformCarousel } from './components/PlatformCarousel'
import { DownloadResult } from './components/DownloadResult'
import type { ExtractData, DownloadProgress } from './components/DownloadResult'
import { Footer } from './components/Footer'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from './lib/utils'
import { useTranslation } from 'react-i18next'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

function App() {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [extractData, setExtractData] = useState<ExtractData | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  
  const [selectedFormat, setSelectedFormat] = useState('auto')
  const [audioOnly, setAudioOnly] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  
  const [isProduction, setIsProduction] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  
  // Theme Management (Dark by default)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return true // default to dark
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)

  const scrollTo = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Toast
  const addToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  // Fetch settings on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(s => {
        setIsProduction(s.is_production)
      })
      .catch(() => addToast('error', t('toast_connect_failed')))
  }, [])

  // Analyze URL
  const handleAnalyze = async () => {
    if (!url.trim()) {
      addToast('warning', t('toast_enter_url'))
      return
    }
    setAnalyzing(true)
    setExtractData(null)
    setDownloadProgress(null)
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t('toast_analyze_failed'))
      }
      const data = await res.json()
      setExtractData(data)
      setSelectedFormat('auto')
      setAudioOnly(false)
    } catch (err: any) {
      addToast('error', err.message || t('toast_analyze_failed'))
    } finally {
      setAnalyzing(false)
    }
  }

  // Start download
  const handleStartDownload = async () => {
    if (!extractData) return
    setIsDownloading(true)
    setDownloadProgress(null)
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          format_id: selectedFormat === 'auto' ? null : selectedFormat,
          audio_only: audioOnly,
          title: extractData.title,
          thumbnail: extractData.thumbnail,
          platform: extractData.platform,
          duration: extractData.duration,
          resolution: selectedFormat,
        }),
      })
      if (!res.ok) throw new Error(t('toast_download_failed'))
      const { task_id } = await res.json()
      addToast('success', t('toast_processing'))

      // Poll progress
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`${API_BASE}/api/tasks/${task_id}`)
          if (!r.ok) { clearInterval(poll); setIsDownloading(false); return }
          const prog: DownloadProgress = await r.json()
          setDownloadProgress(prog)
          if (prog.status === 'COMPLETED') {
            clearInterval(poll)
            setIsDownloading(false)
            addToast('success', t('toast_success'))
          } else if (prog.status === 'FAILED' || prog.status === 'CANCELLED') {
            clearInterval(poll)
            setIsDownloading(false)
            if (prog.error_message) addToast('error', prog.error_message)
          }
        } catch {
          clearInterval(poll)
          setIsDownloading(false)
        }
      }, 1000)
    } catch (err: any) {
      addToast('error', err.message || t('toast_download_failed'))
      setIsDownloading(false)
    }
  }

  const handleHideProgress = () => setDownloadProgress(null)

  useEffect(() => {
    setDownloadProgress(null)
  }, [url, extractData])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative transition-colors duration-300">
      
      {/* Toast System */}
      <div className="fixed top-20 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-x-0",
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' :
              toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400' :
              toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400'
            )}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <span className="w-5 h-5 flex items-center justify-center text-lg">ℹ</span>}
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <Header 
        isProduction={isProduction} 
        isDark={isDark} 
        toggleTheme={toggleTheme} 
        scrollTo={scrollTo}
      />

      <main className="flex-1 w-full">
        <Hero 
          url={url} 
          setUrl={setUrl} 
          onAnalyze={handleAnalyze} 
          analyzing={analyzing} 
        />

        {extractData && (
          <DownloadResult 
            data={extractData}
            selectedFormat={selectedFormat}
            setSelectedFormat={setSelectedFormat}
            audioOnly={audioOnly}
            setAudioOnly={setAudioOnly}
            onDownload={handleStartDownload}
            isDownloading={isDownloading}
            progress={downloadProgress}
            onHideProgress={handleHideProgress}
          />
        )}

        <FeatureCards />
        
        <PlatformCarousel />
      </main>

      <Footer />
    </div>
  )
}

export default App
