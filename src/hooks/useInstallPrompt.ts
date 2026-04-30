import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Module-level singleton so multiple components share the same captured event.
let cachedEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    cachedEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l(cachedEvent));
  });
  window.addEventListener("appinstalled", () => {
    cachedEvent = null;
    listeners.forEach((l) => l(null));
  });
}

function detectInstalled() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  // @ts-ignore iOS Safari
  const iosStandalone = !!window.navigator.standalone;
  return !!standalone || iosStandalone;
}

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // iPadOS 13+ reports as Mac; detect via touch
  const isIPadOS = ua.includes("Mac") && "ontouchend" in document;
  return isIOS || isIPadOS;
}

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(cachedEvent);
  const [isInstalled, setIsInstalled] = useState(detectInstalled());

  useEffect(() => {
    const listener = (e: BeforeInstallPromptEvent | null) => {
      setEvt(e);
      if (!e) setIsInstalled(detectInstalled());
    };
    listeners.add(listener);
    setEvt(cachedEvent);
    setIsInstalled(detectInstalled());
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const isIOS = detectIOS();
  const canInstall = !isInstalled && (!!evt || isIOS);

  const promptInstall = async () => {
    if (!evt) return "unavailable" as const;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") {
      cachedEvent = null;
      listeners.forEach((l) => l(null));
    }
    return choice.outcome;
  };

  return { canInstall, isInstalled, isIOS, hasNativePrompt: !!evt, promptInstall };
}
