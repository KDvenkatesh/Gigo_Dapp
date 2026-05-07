import { useState, useEffect } from 'react';

// Shared state for the prompt so multiple components can access it
let sharedDeferredPrompt: any = null;
let listeners: Array<(prompt: any) => void> = [];

const setSharedPrompt = (prompt: any) => {
  sharedDeferredPrompt = prompt;
  listeners.forEach((listener) => listener(prompt));
};

// Only add the listener once at module level to catch early events
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setSharedPrompt(e);
  });

  // Clear prompt when app is installed
  window.addEventListener('appinstalled', () => {
    setSharedPrompt(null);
    console.log('Gigo PWA was installed successfully!');
  });
}

/** Returns true if the app is already running as an installed PWA */
const isRunningAsPWA = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true);

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(sharedDeferredPrompt);
  const [installed, setInstalled] = useState(isRunningAsPWA());

  useEffect(() => {
    // Sync with shared prompt (catches late-fired events)
    const handlePromptChange = (prompt: any) => {
      setDeferredPrompt(prompt);
    };
    listeners.push(handlePromptChange);

    // Re-check standalone mode (e.g. after navigation)
    const mq = window.matchMedia('(display-mode: standalone)');
    const handleMQChange = (e: MediaQueryListEvent) => setInstalled(e.matches);
    mq.addEventListener('change', handleMQChange);

    return () => {
      listeners = listeners.filter((l) => l !== handlePromptChange);
      mq.removeEventListener('change', handleMQChange);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    if (outcome === 'accepted') setInstalled(true);
    setSharedPrompt(null);
    return outcome === 'accepted';
  };

  return {
    canInstall: !!deferredPrompt && !installed,
    isInstalled: installed,
    install,
  };
}
