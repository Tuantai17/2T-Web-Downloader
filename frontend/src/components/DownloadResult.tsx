import { Clock, Film, Download, Music, RefreshCw, CheckCircle2, AlertCircle, X, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { API_BASE } from '../config'

export interface FormatOption {
  format_id: string
  label: string
  quality_category: string
  resolution: string
  ext: string
  url?: string
  vcodec?: string
  acodec?: string
  fps?: number
  filesize_approx?: number
  is_audio: boolean
}

export interface ExtractData {
  id: string
  title: string
  thumbnail?: string
  duration?: number
  platform?: string
  extractor?: string
  formats: FormatOption[]
}

export interface DownloadProgress {
  task_id: string
  status: string
  stage: string
  progress: number
  speed: number
  eta: number
  downloaded_bytes: number
  total_bytes: number
  filename?: string
  error_message?: string
}

interface DownloadResultProps {
  data: ExtractData
  selectedFormat: string
  setSelectedFormat: (val: string) => void
  audioOnly: boolean
  setAudioOnly: (val: boolean) => void
  onDownload: () => void
  isDownloading: boolean
  progress: DownloadProgress | null
  onHideProgress: () => void
}

const formatSpeed = (bytesPerSec: number) => {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s'
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

const formatETA = (seconds: number) => {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function ProgressCard({ progress, onHide }: { progress: DownloadProgress; onHide: () => void }) {
  const { t } = useTranslation()
  const { status, stage, progress: pct, speed, eta, filename, error_message } = progress

  useEffect(() => {
    if (status === 'COMPLETED') {
      const timer = setTimeout(onHide, 10000)
      return () => clearTimeout(timer)
    }
  }, [status, onHide])

  const [downloading, setDownloading] = useState(false)
  useEffect(() => {
    if (status === 'COMPLETED' && filename && !downloading) {
      setDownloading(true)
      fetch(`${API_BASE}/api/downloads/${encodeURIComponent(filename)}`)
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        })
        .catch(console.error)
    }
  }, [status, filename, downloading])

  const isError = status === 'FAILED' || status === 'CANCELLED'
  const isDone = status === 'COMPLETED'
  const isActive = !isError && !isDone

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "mt-6 border rounded-2xl p-5 space-y-4 transition-colors duration-500 overflow-hidden",
        isDone ? 'bg-emerald-500/10 border-emerald-500/30' :
        isError ? 'bg-rose-500/10 border-rose-500/30' :
        'bg-card border-border shadow-inner'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isDone ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          ) : isError ? (
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}
          <span className={cn(
            "font-bold text-sm",
            isDone ? 'text-emerald-500 dark:text-emerald-400' : isError ? 'text-rose-500 dark:text-rose-400' : 'text-primary'
          )}>
            {isDone ? t('progress_completed') : isError ? error_message || 'Thất bại' : t('progress_downloading')}
          </span>
        </div>
        {isDone && (
          <button onClick={onHide} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isActive && (
        <div className="space-y-3">
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-y-2 text-sm text-muted-foreground font-mono">
            <span className="font-bold text-foreground">{pct.toFixed(1)}%</span>
            {speed > 0 && <span>{formatSpeed(speed)}</span>}
            {eta > 0 && <span>ETA {formatETA(eta)}</span>}
          </div>
          {stage && <p className="text-xs text-muted-foreground">{stage}</p>}
        </div>
      )}

      {isDone && (
        <div className="space-y-1 pt-2 border-t border-emerald-500/20">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{t('progress_saving')}</p>
          <p className="text-xs text-muted-foreground">
            {t('progress_saving_desc')}
          </p>
        </div>
      )}
    </motion.div>
  )
}

export function DownloadResult({
  data, selectedFormat, setSelectedFormat, audioOnly, setAudioOnly, onDownload, isDownloading, progress, onHideProgress
}: DownloadResultProps) {
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Find best preview URL
  const previewUrl = data.formats.find(f => !f.is_audio && f.url && f.ext === 'mp4')?.url 
                  || data.formats.find(f => f.url && !f.is_audio)?.url 
                  || data.formats[0]?.url
  
  // Format quality labels to match user request (e.g. 8K UHD, 4K UHD, 2K, 1080P, etc.)
  const getQualityDisplay = (f: FormatOption) => {
    if (f.is_audio) return `${f.quality_category} • ${f.ext.toUpperCase()}`
    
    // Parse height for standard labels
    let label = f.quality_category
    if (label.includes('8K')) label = '8K UHD'
    else if (label.includes('4K')) label = '4K UHD'
    else if (label.includes('1080')) label = '1080P'
    else if (label.includes('720')) label = '720P'
    else if (label.includes('480')) label = '480P'
    
    // Hide raw codecs, keep only standard resolution/ext
    return `${label} • ${f.resolution} • ${f.ext.toUpperCase()}`
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto px-6 pb-16"
    >
      <div className="bg-card border border-border rounded-[2rem] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle glass effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
          {/* Thumbnail */}
          <div className="relative w-full md:w-64 h-36 sm:h-44 bg-black rounded-2xl overflow-hidden shrink-0 border border-border shadow-sm group">
            {isPlaying && previewUrl ? (
              <video 
                src={previewUrl} 
                controls 
                autoPlay 
                {...{ referrerPolicy: "no-referrer" } as any}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <>
                {data.thumbnail ? (
                  <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                    <Film className="w-10 h-10" />
                  </div>
                )}
                
                {/* Play Overlay */}
                {previewUrl && (
                  <div 
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 ml-1" />
                    </div>
                  </div>
                )}
                
                {data.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md text-[10px] font-mono text-white rounded-md flex items-center gap-1 shadow-sm pointer-events-none">
                    <Clock className="w-3 h-3" />
                    {formatDuration(data.duration)}
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full shadow-lg pointer-events-none">
                  {data.platform || 'Web'}
                </span>
              </>
            )}
          </div>

          {/* Details & Controls */}
          <div className="flex-1 w-full space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug line-clamp-2">{data.title}</h3>
              <p className="text-xs text-muted-foreground">
                {data.extractor || data.platform || 'Unknown'} • {data.formats.length} {t('result_formats')}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  {t('result_quality')}
                </label>
                <div className="relative">
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full appearance-none bg-background text-foreground border border-border px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs font-semibold cursor-pointer shadow-sm transition-all"
                  >
                    <option value="auto">✨ Auto</option>
                    {data.formats.map((f, idx) => (
                      <option key={idx} value={f.format_id}>
                        {getQualityDisplay(f)}
                      </option>
                    ))}
                  </select>
                  {/* Custom select arrow */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 border border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={audioOnly}
                  onChange={(e) => setAudioOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <div className="w-5 h-5 rounded-md bg-secondary/10 flex items-center justify-center text-secondary">
                    <Music className="w-3 h-3" />
                  </div>
                  {t('result_audio_only')}
                </div>
              </label>
            </div>

            <button
              onClick={onDownload}
              disabled={isDownloading}
              className={cn(
                "w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl font-bold text-sm shadow-md shadow-primary/25 flex items-center justify-center gap-1.5 transition-all duration-300",
                isDownloading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]"
              )}
            >
              <Download className="w-4 h-4" />
              {isDownloading ? t('result_preparing') : t('result_download_now')}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {progress && (
            <ProgressCard progress={progress} onHide={onHideProgress} />
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
