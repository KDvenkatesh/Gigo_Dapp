import { useState } from 'react';
import { Download, X, Globe, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

function InstallGuideModal({ onClose }: { onClose: () => void }) {
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-sm rounded-2xl bg-[#0e1117] border border-white/10 p-5 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/20 p-1.5">
              <Download className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Install Gigo App</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {isIOS ? (
          <div className="space-y-3 text-sm text-white/70">
            <p className="text-white/90 font-medium">On iPhone / iPad:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Tap the <span className="text-white font-semibold">Share</span> button (□↑) at the bottom of Safari</li>
              <li>Scroll down and tap <span className="text-white font-semibold">"Add to Home Screen"</span></li>
              <li>Tap <span className="text-white font-semibold">Add</span> to confirm</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-emerald-300 text-xs">
                The app may already be installed, or your browser needs a moment to be ready.
                Try the steps below to install manually.
              </p>
            </div>
            <p className="text-white/90 font-medium">On Chrome / Edge:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Click the <span className="text-white font-semibold">⋮</span> menu in the top-right of your browser</li>
              <li>Select <span className="text-white font-semibold">"Install Gigo…"</span> or <span className="text-white font-semibold">"Add to Home Screen"</span></li>
              <li>Click <span className="text-white font-semibold">Install</span> to confirm</li>
            </ol>
            <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Works best in Chrome, Edge, or Brave
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function PWAInstallFooter() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Don't render if already running as installed PWA
  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="mt-auto shrink-0 border-t border-white/[0.06] bg-[#05060a] p-3 lg:hidden">
        <button
          onClick={handleInstallClick}
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
        >
          <Download className="h-4 w-4" />
          Install Gigo App
        </button>
      </div>

      {showGuide && <InstallGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}
