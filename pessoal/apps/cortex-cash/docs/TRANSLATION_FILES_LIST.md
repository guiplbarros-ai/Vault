# Translation Files List - Quick Reference

## Files Requiring Translation (Priority Order)

### HIGH PRIORITY - User-Facing Content

1. **`/app/layout.tsx`**
   - Metadata: title, description
   - HTML lang attribute

2. **`/app/page.tsx`**
   - Page heading and subheading

3. **`/components/dashboard-layout.tsx`**
   - Navigation menu items (7 items)
   - Sidebar footer text
   - Sync button

4. **`/components/overview-cards.tsx`**
   - Financial metric card labels (4 cards)
   - Status messages

5. **`/components/recent-transactions.tsx`**
   - Section title and description
   - Transaction categories (5 categories)
   - Sample transaction descriptions

6. **`/components/cash-flow-chart.tsx`**
   - Chart title and description
   - Chart legend labels
   - Month abbreviations (6 months)

7. **`/components/budget-overview.tsx`**
   - Section title and description
   - Budget category labels (4 categories)

### LOW PRIORITY - No User-Facing Content

- `/components/ui/button.tsx` - No hardcoded text
- `/components/ui/card.tsx` - No hardcoded text
- `/components/ui/badge.tsx` - No hardcoded text
- `/components/ui/progress.tsx` - No hardcoded text
- `/components/theme-provider.tsx` - No hardcoded text
- `/app/globals.css` - Only CSS comments
- `/lib/utils.ts` - Utility functions only
- Configuration files - Build/dev tools only

---

## Total Translation Count

- **7 files** require code changes for translation
- **~85 words/phrases** to translate
- **0 existing i18n infrastructure** (needs to be built)

---

## Recommendation

Focus on the 7 HIGH PRIORITY files above. All contain user-facing English text that will be visible to end users. Implement an i18n solution (next-intl recommended) before starting translation work.
