import { useState, useEffect } from 'react'

export default function InstallAppButton({ className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsInstalled(isStandalone)

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(ua)
    setIsIos(iosDevice)

    // Listen for beforeinstallprompt event (Chrome / Edge / Android)
    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for appinstalled event
    function handleAppInstalled() {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } else if (isIos) {
      setShowIosModal(true)
    } else {
      // Fallback hint for desktop/mobile browsers without prompt
      setShowIosModal(true)
    }
  }

  // If already installed, don't show the install button
  if (isInstalled) return null

  // Show if install prompt is ready OR on iOS
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install Deadline Buffer as a mobile or desktop app"
        className={`text-xs font-medium text-buffer hover:text-buffer/80 border border-buffer/25 hover:border-buffer/50 bg-buffer-soft px-2.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1.5 shadow-2xs ${className}`}
      >
        <span className="text-sm">📲</span>
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* iOS / General Add-to-Home-Screen Instructions Modal */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-ink/10 p-6 max-w-sm w-full shadow-xl space-y-4 animate-scale-in text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <h3 className="font-display font-bold text-base">Install Deadline Buffer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="text-graphite hover:text-ink text-sm p-1 rounded-lg hover:bg-paper"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-graphite leading-relaxed">
              Install Deadline Buffer to your device for instant offline access, calm start-by alerts, and a distraction-free full screen experience!
            </p>

            <div className="bg-paper rounded-2xl p-4 border border-ink/5 space-y-3 text-xs text-ink">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-buffer-soft text-buffer flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button <span className="inline-block px-1.5 py-0.5 rounded bg-white border border-ink/10 font-mono text-[10px]">⎋ Share</span> in your browser toolbar.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-buffer-soft text-buffer flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-white border border-ink/10 font-mono text-[10px]">⊞</span>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-buffer-soft text-buffer flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Launch directly from your home screen like a native mobile app!
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full bg-ink text-paper rounded-xl py-2.5 text-xs font-semibold hover:bg-ink-soft active:scale-95 transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
