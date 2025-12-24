# Tags & Themes Hidden from UI

## Summary
Tags and Themes are now kept as an internal signal layer only. They are no longer exposed in the user-facing UI to reduce clutter and maintain clarity.

## Files Updated

### UI Components Removed/Hidden

1. **`app/conversations/[id]/page.tsx`**
   - Removed tag chips display from conversation detail page
   - Tags are still fetched and stored (for internal use) but not displayed

2. **`app/projects/[id]/components/OverviewTab.tsx`**
   - Removed `ProjectThemes` component import and usage
   - Added comment noting themes are internal only

3. **`app/projects/[id]/page.tsx`**
   - Removed `GenerateThemesButton` import and usage from project header
   - Removed button from project header UI

4. **`app/components/MindMapPreview.tsx`**
   - Component now returns `null` (hidden)
   - Themes and tags sections removed from display

5. **`app/components/MagicHomeScreen.tsx`**
   - Removed `MindMapPreview` import and component usage
   - Added comment noting it's hidden

6. **`app/digests/components/DigestList.tsx`**
   - Removed "Top Themes" section from digest list display

7. **`app/digests/[id]/components/DigestDetailClient.tsx`**
   - Removed "Top Themes" section from digest detail page

8. **`app/toolbelt/page.tsx`**
   - Updated description to remove mention of "themes"

## Files Kept (Internal Use Only)

The following files remain in the codebase but are not called from user-facing UI:

- `app/projects/[id]/components/ProjectThemes.tsx` - Component exists but not used
- `app/projects/[id]/components/GenerateThemesButton.tsx` - Component exists but not used
- `app/api/themes/generate/route.ts` - API route exists (for future automation/labs)
- `app/api/projects/[id]/themes/route.ts` - API route exists (for future use)
- `app/api/themes/week/route.ts` - API route exists (for future use)

## Data Generation

- **Tags**: Still auto-generated on import (via `app/api/import/process/route.ts`)
- **Themes**: Schema and storage remain, but no user-triggered generation in UI
- Both can be used internally for:
  - Search weighting (future)
  - Context compiler weighting (future)
  - Visualization (future)

## Test Checklist

- [ ] Import conversations → Tags should still be generated in background
- [ ] Conversation detail page → No tag chips visible
- [ ] Project Overview tab → No themes section visible
- [ ] Project header → No "Generate Themes" button visible
- [ ] Home screen → No "Mind Map" section visible
- [ ] Digest list → No "Top Themes" section visible
- [ ] Digest detail → No "Top Themes" section visible
- [ ] Toolbelt page → Description doesn't mention themes
- [ ] Core flows unaffected:
  - [ ] Projects page loads
  - [ ] Conversations page loads
  - [ ] Highlights/Tasks/Decisions still work
  - [ ] Ask Index still works
  - [ ] Start Chat still works

## Notes

- Theme generation API routes remain available for future automation (e.g., cron jobs)
- Tag generation continues automatically during import
- All data structures remain intact for future use
- No database migrations needed

