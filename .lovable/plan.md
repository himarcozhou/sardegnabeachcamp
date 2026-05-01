# Admin Panel — Mobile-First Redesign

## Problem

Even though horizontal scroll is gone, the panel still looks cramped/zoomed:
- It opens inside a Dialog that occupies most of the screen but keeps its own padding + an internal scrollbar, leaving very little room for content.
- Both Announcements (form + list) and Users (full list) are stacked in the same scroll view, making everything feel dense.
- Inputs and buttons are full-height, forcing controls to wrap and look oversized next to small text.

## Goal

A clean, native-feeling admin surface on mobile:
- Uses the full viewport with safe edges, not a tight modal.
- Splits the two unrelated jobs (announcements vs users) into tabs so each screen breathes.
- Compact, balanced rows; no horizontal scroll; no zoomed-in feel.

## UX Design

### Container
Replace the Dialog wrapper with a **bottom Sheet** (shadcn `Sheet`, `side="bottom"`) that:
- Takes `h-[92vh]` on mobile, capped at `max-w-2xl` and centered on desktop.
- Has a sticky header (title + close) and a sticky tab bar so list content scrolls under them.
- Body uses `px-4 pb-6` only — no nested rounded card eating horizontal space.

### Tabs
Two tabs at the top of the sheet body using shadcn `Tabs`:

```text
┌─────────────────────────────┐
│  Pannello Admin         X   │
├─────────────────────────────┤
│  [ Annunci ]  [ Utenti ]    │
├─────────────────────────────┤
│  ...tab content...          │
└─────────────────────────────┘
```

### Annunci tab
- **Compose card** at top: Title input, Content textarea (rows=3), Priority (small w-20) + Publish button on one row. Wrapped in a single subtle `bg-muted/50 rounded-2xl p-3` card.
- **List below**: each announcement is a flat row — title (bold, truncated), 1-line content preview, small priority chip, ghost trash icon on the right. No nested borders inside borders.
- Empty state: centered muted text + small megaphone icon.

### Utenti tab
- **Search field** at top (filter by name/surname) — makes a long list usable.
- **Sort dropdown** (points desc / name) — small, secondary.
- **User row** redesigned as a single compact line:
  - Avatar (28px) + name (truncate, flex-1)
  - Points shown as a small chip on the right
  - Tap row → opens an inline expansion (or a tiny popover) with: points number input, Save button, Delete (destructive ghost) button.
  - "(tu)" badge replaced with a subtle primary ring on the avatar.
- This removes the always-visible input + 2 buttons per row, which is what makes the current list feel zoomed in.

### Visual polish
- Section labels: `text-xs font-bold uppercase tracking-wider text-muted-foreground`.
- All controls `h-9` for consistency; icons `h-4 w-4`.
- Use existing tokens only (`bg-muted`, `bg-card`, `border-border`, `text-primary`, `gradient-festive`). No new colors.

## Technical Plan

**Files to edit**
- `src/pages/Profile.tsx` — swap the admin `Dialog` for a `Sheet` (`side="bottom"`).
- `src/components/AdminPanel.tsx` — restructure into `Tabs` with two `TabsContent` panels; extract `AnnouncementsTab` and `UsersTab` as local components inside the same file for clarity.

**New UI primitives used** (all already in `src/components/ui/`)
- `sheet.tsx`, `tabs.tsx`, `input.tsx`, `button.tsx`, `textarea.tsx`, `label.tsx`.

**User row interaction**
- Local `expandedId` state in `UsersTab`. Clicking a row toggles expansion which renders the points editor + delete button beneath the row in the same card. Only one row expanded at a time.

**Search/sort**
- Client-side filter on the already-loaded `users` array (no extra queries). Default sort: points desc (matches current behaviour).

**Translations**
- Add keys: `search`, `sortByPoints`, `sortByName`, `noResults` (it/en) in `src/lib/i18n.ts` if missing. Reuse existing keys for everything else.

**No backend changes** — same Supabase calls (`profiles`, `announcements`, `delete-user` edge function).

## Out of scope
- Pagination of users (current load is fine for the camp size).
- Reordering announcements via drag.
- Editing existing announcements (only create + delete, as today).
