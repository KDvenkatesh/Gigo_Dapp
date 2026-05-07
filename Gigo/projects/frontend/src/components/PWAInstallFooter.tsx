import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallFooter() {
  const { canInstall, install } = usePWAInstall();

  const handleInstallClick = () => {
    if (canInstall) {
      install();
    } else {
      alert("PWA installation is not supported by your current browser, or the app is already installed.");
    }
  };

  return (
    <div className="mt-auto shrink-0 border-t border-white/[0.06] bg-[#05060a] p-3 lg:hidden">
      <button
        onClick={handleInstallClick}
        className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
      >
        <Download className="h-4 w-4" />
        Install Gigo App
      </button>
    </div>
  );
}
