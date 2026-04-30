import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useT } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Instagram, Search, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PP {
  id: string;
  name: string;
  surname: string;
  instagram_tag: string | null;
  avatar_url: string | null;
  points: number;
  three_facts: { text: string }[] | null;
}

interface GuessState {
  guessed_index: number;
  was_correct: boolean;
  lie_index: number;
}

export default function People() {
  const { t } = useT();
  const { isAdmin, user, profile, refreshProfile } = useApp();
  const [list, setList] = useState<PP[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<PP | null>(null);
  const [adminLies, setAdminLies] = useState<Record<string, number>>({});
  const [guesses, setGuesses] = useState<Record<string, GuessState>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadList = () =>
    supabase.rpc("get_public_profiles").then(({ data }) => setList((data as any) || []));

  useEffect(() => {
    loadList();
    supabase.rpc("get_my_lie_guesses").then(({ data }) => {
      const m: Record<string, GuessState> = {};
      (data || []).forEach((g: any) => {
        m[g.target_id] = {
          guessed_index: g.guessed_index,
          was_correct: g.was_correct,
          lie_index: typeof g.lie_index === "number" ? g.lie_index : -1,
        };
      });
      setGuesses(m);
    });
    if (isAdmin) {
      supabase
        .from("profiles")
        .select("id,three_facts")
        .then(({ data }) => {
          const map: Record<string, number> = {};
          (data || []).forEach((p: any) => {
            if (Array.isArray(p.three_facts)) {
              const idx = p.three_facts.findIndex((f: any) => f.is_lie);
              if (idx >= 0) map[p.id] = idx;
            }
          });
          setAdminLies(map);
        });
    }
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p) => `${p.name} ${p.surname}`.toLowerCase().includes(s));
  }, [list, q]);

  const isSelf = open && user && open.id === user.id;
  const existingGuess = open ? guesses[open.id] : undefined;

  // Determine which fact is the lie for the open dialog (if known)
  const revealedLieIndex: number = (() => {
    if (!open) return -1;
    if (isSelf && profile?.three_facts) {
      const i = profile.three_facts.findIndex((f) => f.is_lie);
      return i;
    }
    if (isAdmin && adminLies[open.id] !== undefined) return adminLies[open.id];
    if (existingGuess && existingGuess.lie_index >= 0) return existingGuess.lie_index;
    return -1;
  })();

  const submitGuess = async (idx: number) => {
    if (!open || !user) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("guess_lie", {
      _target_id: open.id,
      _guessed_index: idx,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const res = data as any;
    if (res?.already) {
      toast.error(t("alreadyGuessed"));
    } else if (res?.correct) {
      toast.success(t("correctGuess"));
    } else {
      toast.error(t("wrongGuess"));
    }
    setGuesses((prev) => ({
      ...prev,
      [open.id]: {
        guessed_index: res.guessed_index,
        was_correct: res.correct,
        lie_index: res.lie_index,
      },
    }));
    if (res?.correct) loadList();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPeople")}
          className="pl-9 rounded-full"
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center text-center shadow-card hover:shadow-glow transition-smooth"
          >
            <Avatar name={p.name} surname={p.surname} url={p.avatar_url} size={56} />
            <div className="text-xs font-bold mt-2 truncate w-full">{p.name}</div>
            <div className="text-[10px] text-muted-foreground truncate w-full">{p.surname}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">{t("noPeople")}</div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {open?.name} {open?.surname}
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <Avatar name={open.name} surname={open.surname} url={open.avatar_url} size={96} />
                <div className="text-sm">
                  <span className="font-bold text-primary">{open.points}</span>
                  <span className="text-muted-foreground"> {t("points")}</span>
                </div>
                {open.instagram_tag && (
                  <a
                    href={`https://instagram.com/${open.instagram_tag}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Instagram className="h-4 w-4" /> @{open.instagram_tag}
                  </a>
                )}
              </div>

              {open.three_facts && open.three_facts.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-2">{t("threeFactsTitle")}</h4>

                  {!isSelf && !isAdmin && !existingGuess && (
                    <p className="text-xs text-muted-foreground mb-2">{t("guessLiePrompt")}</p>
                  )}

                  <ul className="space-y-2">
                    {open.three_facts.map((f, i) => {
                      const isLie = revealedLieIndex === i;
                      const isMyPick = existingGuess?.guessed_index === i;
                      const canGuess =
                        !isSelf && !isAdmin && !existingGuess && user && profile?.onboarded;

                      const baseClasses =
                        "rounded-xl p-3 text-sm flex items-center justify-between gap-2 transition-smooth";
                      const stateClasses = isLie
                        ? "bg-accent/20 border-2 border-accent"
                        : isMyPick && existingGuess && !existingGuess.was_correct
                        ? "bg-destructive/10 border-2 border-destructive"
                        : "bg-muted border-2 border-transparent";

                      const content = (
                        <>
                          <span className="text-left flex-1">{f.text}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {isMyPick && existingGuess?.was_correct && (
                              <Check className="h-4 w-4 text-accent" />
                            )}
                            {isMyPick && existingGuess && !existingGuess.was_correct && (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                            {isLie && (
                              <span className="text-xs font-bold text-accent whitespace-nowrap">
                                🤥 {t("theLie")}
                              </span>
                            )}
                          </span>
                        </>
                      );

                      return (
                        <li key={i}>
                          {canGuess ? (
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => submitGuess(i)}
                              className={`${baseClasses} ${stateClasses} w-full hover:bg-primary/10 hover:border-primary disabled:opacity-50`}
                            >
                              {content}
                            </button>
                          ) : (
                            <div className={`${baseClasses} ${stateClasses}`}>{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {existingGuess && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {existingGuess.was_correct ? t("correctGuess") : t("wrongGuess")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
