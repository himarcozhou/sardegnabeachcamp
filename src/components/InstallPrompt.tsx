import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPrompt() {
  const { canInstall, hasNativePrompt, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("install_dismissed") === "1"
  );

  // Auto popup only when the browser fired the native prompt event.
  if (dismissed || !canInstall || !hasNativePrompt) return null;

  const dismiss = () => {
    setDismissed(true);
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
          await promptInstall();
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
