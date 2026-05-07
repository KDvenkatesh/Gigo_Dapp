import { useState, useEffect } from 'react';

// Shared state for the prompt so multiple components can access it
let sharedDeferredPrompt: any = null;
let listeners: Array<(prompt: any) => void> = [];

const setSharedPrompt = (prompt: any) => {
  sharedDeferredPrompt = prompt;
  listeners.forEach((listener) => listener(prompt));
};

// Only add the listener once
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setSharedPrompt(e);
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(sharedDeferredPrompt);

  useEffect(() => {
    const handlePromptChange = (prompt: any) => {
      setDeferredPrompt(prompt);
    };

    listeners.push(handlePromptChange);
    return () => {
      listeners = listeners.filter((l) => l !== handlePromptChange);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setSharedPrompt(null);
  };

  return { canInstall: !!deferredPrompt, install };
}
