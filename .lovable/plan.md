## Goal

Today, users can only install the app when the browser fires the auto `beforeinstallprompt` popup (and once dismissed, it never returns). We want a **permanent way to install the app** at any time.

## Key behaviors (apply to all options)

- Capture the `beforeinstallprompt` event globally and store it (instead of consuming it once in the popup).
- Detect when the app is already installed (`display-mode: standalone` or `navigator.standalone` on iOS) → hide the install entry point completely.
- On iOS Safari (no `beforeinstallprompt` support), the button opens a small modal with step-by-step instructions: "Tap Share → Add to Home Screen", with a screenshot/icon hint.
- Fully translated (IT/EN) via `i18n.ts`.
- The auto popup (`InstallPrompt.tsx`) stays as-is for first-time users, but the new entry point is always available even after dismissal.

## UI/UX options

Pick one (or combine A + C, which is my recommendation).

### Option A — Install button in the Profile page ⭐ recommended

Add a clean row in the Profile page (near Language / Dark mode), e.g.:

```text
┌────────────────────────────────────────────┐
│ 📲  Install app              [ Install ]   │
│     Add to home screen for faster access   │
└────────────────────────────────────────────┘
```

- Pros: discoverable, fits existing settings pattern, doesn't add header clutter.
- Cons: requires user to open Profile to find it.

### Option B — Small download icon in the header

Add a `Download` icon button next to the bell + language toggle in `Layout.tsx` header. Tapping it triggers `prompt()` (or opens the iOS instructions modal). Hidden once installed.

- Pros: always visible on every page, one tap.
- Cons: header is already dense (title + bell + lang); adding a 3rd icon may feel busy on small screens.

### Option C — Banner card on the Home page

A dismissible (per-session, not forever) gradient card at the top of `Home.tsx`:

```text
┌────────────────────────────────────────────┐
│ 📲  Install BVCamp Sardegna             ✕  │
│     Faster access, works offline           │
│                              [ Install ]   │
└────────────────────────────────────────────┘
```

- Pros: high visibility for new users, matches `gradient-festive` brand.
- Cons: takes vertical space on Home; feels redundant with the auto popup.

### Option D — Add to the welcome carousel (4th slide)

A dedicated final slide in `Welcome.tsx` titled "Install the app" with a big install CTA before "Start".

- Pros: integrated into onboarding flow.
- Cons: only seen once; doesn't help returning users who skipped install.

## My recommendation

**Option A (Profile row) + Option C (Home banner, dismissible per session)**:
- A guarantees the action is always findable in settings.
- C maximises conversion for new/returning users without being as aggressive as the bottom popup.
- Both auto-hide once the app is installed.

If you want the lightest touch, go with **A only**.

## Technical details

1. **New `useInstallPrompt` hook** (`src/hooks/useInstallPrompt.ts`):
   - Listens to `beforeinstallprompt` once at app level, stores the event in a module-level singleton + React state so multiple components can read it.
   - Exposes `{ canInstall, isInstalled, isIOS, promptInstall() }`.
   - Listens to the `appinstalled` event to flip `isInstalled`.

2. **Refactor `InstallPrompt.tsx`** to use the hook (so the auto popup and any new buttons share the same captured event).

3. **New `InstallButton` component** with two variants: `row` (Profile) and `card` (Home banner). Renders nothing if `isInstalled`. On iOS, opens a `<Dialog>` with Share→Add to Home Screen instructions.

4. **i18n keys** to add: `installApp`, `installAppDesc`, `install`, `iosInstallTitle`, `iosInstallStep1`, `iosInstallStep2`, `iosInstallStep3`, `appInstalled`.

5. **Wire-up**:
   - Option A: insert `<InstallButton variant="row" />` in `Profile.tsx` settings section.
   - Option C: insert `<InstallButton variant="card" />` at top of `Home.tsx`, with a `sessionStorage` dismiss key (`install_card_dismissed_session`).

6. No changes to `manifest.json`, `sw.js`, or version (still 1.1 — this is a UX addition, bump to 1.2 if you'd like, just say the word).

## Please confirm

Which option(s) would you like? **A**, **B**, **C**, **D**, **A+C** (my pick), or something else?
