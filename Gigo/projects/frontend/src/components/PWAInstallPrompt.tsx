import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallPrompt({ isMainPage = false }: { isMainPage?: boolean }) {
  const { canInstall, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(true);

  if (!canInstall || !showPrompt || !isMainPage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[100] sm:left-auto sm:right-6 sm:w-80 lg:hidden"
      >
        <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Install Gigo App</h3>
                <p className="mt-1 text-xs text-white/50">Add to your home screen for a better experience.</p>
              </div>
            </div>
            <button onClick={() => setShowPrompt(false)} className="text-white/30 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={install}
              className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-white/90 transition"
            >
              Install Now
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
