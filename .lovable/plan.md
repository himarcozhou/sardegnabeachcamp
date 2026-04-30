## Modifica StatCards in Home

In `src/pages/Home.tsx`:

1. Rimuovere la card "Segreti oggi" (`secretsToday`) e il relativo fetch da Supabase.
2. Sostituirla con una card "I tuoi punti" che mostra `profile?.points ?? 0`, usando l'icona `Trophy` (già importata).
3. Aggiungere la chiave i18n `yourPoints` in `src/lib/i18n.ts`:
   - IT: "I tuoi punti"
   - EN: "Your points"
4. Rimuovere import `MessageSquareLock` solo dalla stat (rimane usato per il bottone Hero "addSecret").

La griglia 2 colonne resta invariata: `Partecipanti` + `I tuoi punti`.