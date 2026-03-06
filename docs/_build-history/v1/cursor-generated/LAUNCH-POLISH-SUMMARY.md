# Launch-Ready Polish Pass - Summary

## Completed Features

### A) Routing & Access Control ✅

**Files Created:**
- `supabase/migrations/create_invite_codes_table.sql` - Invite codes table with RLS
- `app/api/invite-codes/verify/route.ts` - Verify invite code endpoint
- `app/api/invite-codes/use/route.ts` - Use/increment invite code endpoint

**Files Modified:**
- `app/page.tsx` - Redirects authenticated users to `/home`, shows LandingPage for logged-out
- `app/home/page.tsx` - New authenticated home page (replaces old `/` behavior)
- `app/auth/signup/page.tsx` - Added invite code field and validation
- `app/components/Nav.tsx` - Updated INDEX logo link to `/home`

### B) Free-User Limits ✅

**Files Created:**
- `supabase/migrations/add_user_limits_to_profiles.sql` - Adds limit tracking fields to profiles
- `lib/limits.ts` - Limit checking and incrementing utilities

**Files Modified:**
- `app/api/import/process/route.ts` - Added import limit check
- `app/api/quick-import/route.ts` - Added import limit check
- `app/api/search/route.ts` - Added Ask Index limit check
- `app/api/tasks/create/route.ts` - Added meaning object limit check
- `app/api/highlights/create/route.ts` - Added meaning object limit check
- `app/api/decisions/create/route.ts` - Added meaning object limit check
- `app/api/followups/convert/route.ts` - Added meaning object limit check for all types
- `app/api/assets/create/route.ts` - Added asset limit check per project

**Limits Enforced:**
- Max imports per 24h: 3
- Max Ask Index queries per 24h: 15
- Max meaning objects (highlights/tasks/decisions) per 24h: 20
- Max project assets per project: 50

### C) Landing Page ✅

**Files Created:**
- `app/components/LandingPage.tsx` - Public landing page component

**Features:**
- Hero section with Playfair Display heading
- 3 bullet points
- Screenshot section placeholder
- Trust row ("Your data is not used for training...")
- Single CTA: "Sign In / Get Started"

### D) Onboarding (Alpha-Minimal) ✅

**Files Created:**
- `app/components/OnboardingSteps.tsx` - 6-step onboarding component

**Steps:**
1. Import a conversation
2. Create or assign to a project
3. Select text to save a highlight
4. Create a task or decision
5. Ask Index to resurface meaning
6. Generate your first Weekly Digest

**Storage:** localStorage (`index_onboarding_completed`)

### E) Analytics Markers ✅

**dataLayer Events Added:**
- `landing_view` - Fired on LandingPage mount
- `invite_code_used` - Fired when invite code is used during signup
- `import_start` - Fired when import is queued
- `import_complete` - Fired when quick import completes
- `ask_query` - Fired on Ask Index queries
- `highlight_created` - Fired when highlight is created
- `task_created` - Fired when task is created
- `decision_created` - Fired when decision is created

**Files Modified:**
- `app/components/LandingPage.tsx` - Added `landing_view` event
- `app/api/invite-codes/use/route.ts` - Added `invite_code_used` event
- `app/api/import/process/route.ts` - Added `import_start` event
- `app/api/quick-import/route.ts` - Added `import_complete` event
- `app/api/search/route.ts` - Added `ask_query` event
- `app/api/highlights/create/route.ts` - Added `highlight_created` event
- `app/api/tasks/create/route.ts` - Added `task_created` event
- `app/api/decisions/create/route.ts` - Added `decision_created` event

### G) Checklist Update ✅

**Files Modified:**
- `docs/checklist.md` - Added PHASE 8 with all launch-ready polish items

## Database Migrations Required

1. **Run in Supabase:**
   ```sql
   -- Create invite_codes table
   -- File: supabase/migrations/create_invite_codes_table.sql
   
   -- Add user limits to profiles
   -- File: supabase/migrations/add_user_limits_to_profiles.sql
   ```

2. **Create initial invite codes:**
   ```sql
   INSERT INTO invite_codes (code, max_uses, is_active)
   VALUES 
     ('ALPHA2024', 50, true),
     ('BETA2024', 100, true);
   ```

## Testing Checklist

- [ ] Test landing page renders for logged-out users
- [ ] Test authenticated users redirect from `/` to `/home`
- [ ] Test invite code validation in signup flow
- [ ] Test invite code usage incrementing
- [ ] Test import limit enforcement (3 per 24h)
- [ ] Test Ask Index limit enforcement (15 per 24h)
- [ ] Test meaning object limit enforcement (20 per 24h)
- [ ] Test asset limit enforcement (50 per project)
- [ ] Test limit reset after 24 hours
- [ ] Test onboarding steps component
- [ ] Test dataLayer events fire correctly
- [ ] Verify GTM receives events

## Notes

- Limit checks are server-side only (API routes)
- UI should respect 429 responses and show toast messages
- Limits reset automatically via database trigger when 24 hours pass
- Onboarding uses localStorage (client-side only)
- All analytics events use GTM dataLayer (no direct GA script)

