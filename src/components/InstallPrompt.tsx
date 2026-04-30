import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("install_dismissed") === "1") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !evt) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("install_dismissed", "1");
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 max-w-md mx-auto p-3 rounded-2xl gradient-festive text-white shadow-glow flex items-center gap-3">
      <Download className="h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm font-medium">Install this app</div>
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          await evt.prompt();
          dismiss();
        }}
      >
        Install
      </Button>
      <button onClick={dismiss} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
