I’ll update the app in four connected areas.

## 1. Beach Camp Sardegna theme

- Replace the current birthday/beach-volley welcome copy with a Sardegna beach camp concept in both Italian and English.
- Update the three welcome slide descriptions to focus on:
  - arrival at the resort and Sardinian beach atmosphere
  - beach camp days with sea, sand, people, and activities
  - shared evenings and transfers/logistics
- Replace the welcome page images with a Sardegna beach camp visual direction. I’ll use suitable beach/coastal imagery assets and keep them optimized for the current welcome layout.
- Change the global color palette in `src/index.css` from the current blue-heavy palette to a stylish sand/coast palette: warm sand backgrounds, off-white cards, deep sea/navy text, turquoise or Mediterranean blue accents, and warm sunset highlights.
- Preserve readability, dark mode compatibility, gradients, shadows, and the existing rounded/mobile-first visual style.

## 2. Re-add Secrets navigation and homepage cards

- Re-add the Secrets tab to the bottom navigation in `Layout`, using the existing `/secrets` route and the existing `Secrets` page.
- Keep the navigation compact enough for mobile by using five main tabs:
  - Home
  - Secrets
  - Passaggi
  - People
  - Profile
- Leave the Games page route in place, but it will no longer be a primary bottom tab unless needed later.
- Add a homepage stat card for the total visible secrets count, using the existing `get_public_secrets` backend function.
- Keep the existing participants and points cards, adjusting the grid layout so it looks balanced with three stats.

## 3. Highlight user points above the ranking table

- Add a highlighted “your points” strip/card directly above the leaderboard.
- It will show the logged-in user’s current points prominently, visually separated from the ranking list.
- Keep the leaderboard below it, sorted by points as it is today.
- Refresh the copy through the existing i18n dictionary where needed.

## 4. Add Passaggi ride coordination feature

### Database/backend
Create new backend tables with Row Level Security:

- `ride_posts`
  - driver user id
  - day/date
  - time
  - origin, default/resort-focused text
  - destination, default Cagliari Airport-focused text
  - available slots
  - optional notes
  - active/open status
  - timestamps

- `ride_requests`
  - ride post id
  - requester user id
  - luggage details
  - requested seats/people count
  - status: pending, accepted, rejected, cancelled
  - optional driver response note
  - timestamps

Access rules:
- Authenticated users can view open ride posts.
- Drivers can create, edit, and close their own ride posts.
- Authenticated users can request a ride on someone else’s post.
- Requesters can see their own requests.
- Drivers can see and accept/reject requests for their own ride posts.
- Admins can manage all records using the existing role system.

I’ll also add a public-safe read function if needed so the UI can display driver names/avatars without exposing private fields.

### UI
Add a new protected `/passaggi` page and bottom tab.

The page will include:
- A list of available ride posts from Resort to Cagliari Airport.
- A “Post a ride” action for people with cars.
- Ride post form fields:
  - day
  - time
  - slots/people available
  - optional notes
- Each ride card will show:
  - driver name/avatar
  - day and time
  - route: Resort → Cagliari Airport
  - available slots
  - notes if present
  - request status/actions
- “Ask for a ride” flow:
  - requester enters number of people/seats needed
  - requester enters luggage information
  - submit creates a pending request
- Driver management flow:
  - drivers see pending requests on their own rides
  - each request shows requester name, seats requested, and luggage details
  - driver can accept or reject after checking luggage/space
- Use toast messages and validation so empty/invalid fields are blocked before sending.

### i18n
- Add Italian and English labels for Passaggi, ride posting, request submission, luggage, slots, pending/accepted/rejected, and empty states.

## Files likely to change

- `src/index.css` for the sand/coast palette.
- `src/pages/Welcome.tsx` and welcome assets for the Sardegna theme.
- `src/components/Layout.tsx` for bottom navigation.
- `src/App.tsx` for the new `/passaggi` route.
- `src/pages/Home.tsx` for secrets count and highlighted user points.
- `src/lib/i18n.ts` for new labels/copy.
- New `src/pages/Passaggi.tsx` page.
- A backend migration for ride posts/requests, RLS policies, and any helper read function needed.

## Validation and security

- All forms will use client-side schema validation with length limits.
- Ride data will be protected by backend Row Level Security.
- Users will not be able to accept/reject requests unless they own the ride post or are admin.
- Users will not be able to create ride requests for their own ride post.
- No secrets or admin checks will be stored client-side.