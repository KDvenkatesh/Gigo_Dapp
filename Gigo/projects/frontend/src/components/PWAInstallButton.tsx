import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({ className }: { className?: string }) {
  const { canInstall, install } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition ${className || ''}`}
    >
      <Download className="h-4 w-4" />
      Install Gigo App
    </button>
  );
}
