import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LangToggle } from "@/components/LangToggle";
import { cn } from "@/lib/utils";
import welcome1 from "@/assets/welcome-1.jpg";
import welcome2 from "@/assets/welcome-2.jpg";
import welcome3 from "@/assets/welcome-3.jpg";

const WELCOME_KEY = "welcome_seen";

export function hasSeenWelcome() {
  return localStorage.getItem(WELCOME_KEY) === "1";
}

export default function Welcome() {
  const { lang } = useT();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const slides = [
    {
      image: welcome1,
      title: lang === "it" ? "Beach Volley Camp in Sardegna 🌊🏐" : "Beach Volley Camp in Sardegna 🌊🏐",
      desc:
        lang === "it"
          ? "Un camp di beach volley tra rocce rosa, sabbia bianca e mare turchese. La nostra base sull'isola ti aspetta."
          : "A beach volley camp among pink rocks, white sand and turquoise sea. Our island base is waiting for you.",
    },
    {
      image: welcome2,
      title: lang === "it" ? "Partite e mare 🏐🏖️" : "Matches and sea 🏐🏖️",
      desc:
        lang === "it"
          ? "Allenamenti, tornei amichevoli, tuffi e relax sotto l'ombrellone. Vivi le calette più belle insieme al gruppo."
          : "Trainings, friendly tournaments, swims and chill under the umbrella. Enjoy the best coves with the group.",
    },
    {
      image: welcome3,
      title: lang === "it" ? "Tramonti e cene insieme 🌅" : "Sunsets and dinners together 🌅",
      desc:
        lang === "it"
          ? "La sera ci ritroviamo a tavola sulla spiaggia: buon cibo, brindisi e luci sospese sopra il mare."
          : "Evenings at a long table on the beach: good food, toasts and string lights above the sea.",
    },
  ];

  const finish = () => {
    localStorage.setItem(WELCOME_KEY, "1");
    nav("/onboarding");
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= slides.length) return;
    setStep(i);
  };

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else finish();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const dx = touchDeltaX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goTo(step + 1);
      else goTo(step - 1);
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div
        className="flex items-center justify-end px-5 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <LangToggle size="sm" />
      </div>

      {/* Swipeable slides */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              className="min-w-full h-full flex flex-col items-center px-8 pt-6"
            >
              <div className="w-full max-w-sm flex-1 flex items-center justify-center">
                <img
                  src={s.image}
                  alt={s.title}
                  width={832}
                  height={1024}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="w-full h-full object-contain max-h-[50vh] rounded-2xl"
                />
              </div>

              <div className="w-full max-w-sm text-center mt-6 mb-2">
                <h1 className="text-3xl font-extrabold mb-3 text-foreground">
                  {s.title}
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-8 pt-4 space-y-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 3.5rem)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={finish}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-smooth px-4 py-2"
          >
            {lang === "it" ? "Salta" : "Skip"}
          </button>
          <span
            className="text-sm font-semibold text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {step + 1}/{slides.length}
          </span>
          <Button
            onClick={next}
            className="gradient-festive text-white border-0 hover:opacity-90 h-12 px-7 rounded-xl font-bold shadow-soft"
          >
            {step < slides.length - 1
              ? lang === "it" ? "Avanti" : "Next"
              : lang === "it" ? "Inizia" : "Start"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex justify-center items-center gap-2.5 py-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === step ? "w-10 bg-primary" : "w-2.5 bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
