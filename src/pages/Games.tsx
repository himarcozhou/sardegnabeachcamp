import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gamepad2 } from "lucide-react";

interface Game { id: string; title: string; description: string | null; icon: string | null; }

export default function Games() {
  const { t } = useT();
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState<Game | null>(null);

  useEffect(() => {
    supabase.from("games").select("id,title,description,icon").eq("is_active", true)
      .then(({ data }) => setGames((data as any) || []));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => setOpen(g)}
            className="rounded-2xl bg-card border border-border p-4 text-left shadow-card hover:shadow-glow hover:scale-[1.02] transition-smooth"
          >
            <div className="text-3xl mb-2">{g.icon || <Gamepad2 className="h-7 w-7 text-primary" />}</div>
            <div className="font-bold mb-1 text-sm">{g.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{g.description}</div>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{open?.icon}</span>
              {open?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🚧</div>
            <h3 className="font-bold text-lg mb-1">{t("comingSoon")}</h3>
            <p className="text-sm text-muted-foreground">{t("gameSoon")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
