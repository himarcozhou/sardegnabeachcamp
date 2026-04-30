import { useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useT } from "@/lib/i18n";

interface Props {
  variant?: "row" | "card";
  onDismiss?: () => void;
}

export function InstallButton({ variant = "row", onDismiss }: Props) {
  const { t } = useT();
  const { canInstall, isIOS, hasNativePrompt, promptInstall } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else if (isIOS) {
      setIosOpen(true);
    }
  };

  const IosDialog = (
    <Dialog open={iosOpen} onOpenChange={setIosOpen}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("iosInstallTitle")}</DialogTitle>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">1</span>
            <span className="flex-1 pt-0.5 flex items-center gap-1.5 flex-wrap">
              {t("iosInstallStep1")} <Share className="h-4 w-4 text-primary" />
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">2</span>
            <span className="flex-1 pt-0.5 flex items-center gap-1.5 flex-wrap">
              {t("iosInstallStep2")} <Plus className="h-4 w-4 text-primary" />
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">3</span>
            <span className="flex-1 pt-0.5">{t("iosInstallStep3")}</span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );

  if (variant === "card") {
    return (
      <>
        <section className="relative rounded-2xl gradient-festive text-white p-4 shadow-glow flex items-center gap-3 animate-fade-in">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <div className="font-extrabold leading-tight">{t("installApp")}</div>
            <div className="text-xs opacity-90 mt-0.5">{t("installAppDesc")}</div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClick}
            className="rounded-full font-bold shrink-0"
          >
            {t("install")}
          </Button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-smooth"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </section>
        {IosDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Download className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">{t("installApp")}</div>
            <div className="text-xs text-muted-foreground">{t("installAppDesc")}</div>
          </div>
        </div>
        <Button size="sm" onClick={handleClick} className="rounded-full font-bold shrink-0 gradient-festive text-white border-0">
          {t("install")}
        </Button>
      </div>
      {IosDialog}
    </>
  );
}
