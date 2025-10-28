# Translation Inventory - English to Portuguese
## Comprehensive List of Files Requiring Translation

This document identifies all files in the Cortex Cash application that contain user-facing English text requiring translation to Portuguese (PT-BR).

---

## 1. CONFIGURATION & METADATA FILES

### `/app/layout.tsx`
**Type:** Root Layout Configuration  
**English Content:**
- `title: "Cortex Cash - Personal Finance Management"`
- `description: "Local-first personal finance app with smart classification and budgeting"`
- `lang="en"` (HTML attribute)

**Translation Priority:** HIGH - Affects SEO and browser metadata

---

## 2. PAGE COMPONENTS

### `/app/page.tsx`
**Type:** Main Dashboard Page  
**English Content:**
- Page heading: `"Dashboard"`
- Subheading: `"Your financial overview at a glance"`

**Translation Priority:** HIGH - Main user interface text

---

## 3. LAYOUT & NAVIGATION COMPONENTS

### `/components/dashboard-layout.tsx`
**Type:** Main Layout with Navigation Menu  
**English Content:**

#### Navigation Menu Items:
- `"Dashboard"` - Dashboard link
- `"Transactions"` - Transactions link
- `"Accounts"` - Accounts link
- `"Budgets"` - Budgets link
- `"Credit Cards"` - Credit cards link
- `"Import"` - Import data link
- `"Settings"` - Settings link

#### Sidebar Header:
- `"CORTEX"` - Brand name (keep as is)
- `"CASH"` - Brand name (keep as is)

#### UI Elements:
- `"AI Usage"` - AI usage label in sidebar footer
- `"Sync"` - Sync button in top bar

**Translation Priority:** HIGH - Core navigation and frequently visible UI elements

---

## 4. DASHBOARD FEATURE COMPONENTS

### `/components/overview-cards.tsx`
**Type:** Financial Overview Cards  
**English Content:**

#### Card Labels:
- `"Total Balance"` - Account balance card
- `"Monthly Income"` - Income card
- `"Monthly Expenses"` - Expenses card
- `"Credit Cards"` - Credit card balance card

#### Status Messages:
- `"Due in 5 days"` - Payment due notification

**Translation Priority:** HIGH - Key financial metrics visible on main dashboard

---

### `/components/recent-transactions.tsx`
**Type:** Transaction List Component  
**English Content:**

#### Section Headers:
- `"Recent Transactions"` - Section title
- `"Your latest financial activity"` - Section description

#### Sample Transaction Data (for demo/testing):
- Descriptions:
  - `"Whole Foods Market"`
  - `"Salary Deposit"`
  - `"Netflix Subscription"`
  - `"Gas Station"`
  - `"Freelance Project"`
  
- Categories:
  - `"Groceries"`
  - `"Income"`
  - `"Entertainment"`
  - `"Transportation"`

**Translation Priority:** HIGH - User-facing transaction display
**Note:** Categories should be translated; merchant names can remain as-is unless generic

---

### `/components/cash-flow-chart.tsx`
**Type:** Financial Chart Component  
**English Content:**

#### Chart Headers:
- `"Cash Flow"` - Chart title
- `"Income vs Expenses (Last 6 months)"` - Chart description

#### Chart Legend/Labels:
- `"Income"` - Income bar label
- `"Expenses"` - Expenses bar label

#### Month Abbreviations:
- `"Jan"`, `"Feb"`, `"Mar"`, `"Apr"`, `"May"`, `"Jun"`

**Translation Priority:** HIGH - Data visualization labels

---

### `/components/budget-overview.tsx`
**Type:** Budget Tracking Component  
**English Content:**

#### Section Headers:
- `"Budget Overview"` - Section title
- `"Current month spending"` - Section description

#### Budget Categories:
- `"Groceries"`
- `"Transportation"`
- `"Entertainment"`
- `"Utilities"`

**Translation Priority:** HIGH - Budget category labels

---

## 5. UI COMPONENT LIBRARY (No Direct Translation Needed)

The following files contain reusable UI components without hardcoded user-facing text:
- `/components/ui/button.tsx` - Generic button component
- `/components/ui/card.tsx` - Generic card component
- `/components/ui/badge.tsx` - Generic badge component
- `/components/ui/progress.tsx` - Generic progress bar component
- `/components/theme-provider.tsx` - Theme context provider

**Translation Priority:** N/A - No hardcoded text, styling only

---

## 6. STYLING & ASSETS

### `/app/globals.css`
**Type:** Global Styles  
**English Content:**
- CSS comments: `"Cortex Pixel Teal Theme - Dark finance app with pixel art aesthetic"`
- CSS comments: `"Custom scrollbar for dark theme"`
- CSS comments: `"Pixel art aesthetic helpers"`
- CSS comments: `"Smooth transitions"`

**Translation Priority:** LOW - Developer comments only

### `/public/` Directory
Contains image assets (logos, placeholders) - no text translation needed

---

## 7. BUILD CONFIGURATION (No Translation Needed)

The following files contain build configuration without user-facing text:
- `/next.config.mjs` - Next.js configuration
- `/postcss.config.mjs` - PostCSS configuration
- `/tsconfig.json` - TypeScript configuration
- `/package.json` - Package dependencies
- `/lib/utils.ts` - Utility functions

**Translation Priority:** N/A - Configuration files only

---

## 8. TRANSLATION CATEGORIES SUMMARY

### **Category A - Critical (Must Translate)**
1. Page metadata and SEO (`/app/layout.tsx`)
2. Navigation menu (`/components/dashboard-layout.tsx`)
3. Dashboard headings (`/app/page.tsx`)
4. Financial metrics cards (`/components/overview-cards.tsx`)
5. Transaction section (`/components/recent-transactions.tsx`)
6. Budget categories (`/components/budget-overview.tsx`)
7. Chart labels (`/components/cash-flow-chart.tsx`)

### **Category B - Important (Should Translate)**
8. Button labels (Sync, etc.)
9. Status messages (Due dates, percentages)
10. Month abbreviations

### **Category C - Optional (Nice to Have)**
11. Code comments in CSS files
12. README documentation

---

## 9. TRANSLATION IMPLEMENTATION STRATEGY

### Option 1: i18n Library (Recommended for Scalability)
Install and configure `next-intl` or `next-i18next`:
```bash
npm install next-intl
```

Create translation files:
- `/locales/en/common.json`
- `/locales/pt-BR/common.json`

### Option 2: Simple Constants File (Quick Start)
Create `/lib/translations.ts`:
```typescript
export const translations = {
  en: { ... },
  'pt-BR': { ... }
}
```

### Option 3: Direct Replacement (Not Recommended)
Directly replace English strings with Portuguese - loses flexibility for multi-language support.

---

## 10. CURRENT I18N STATUS

**Status:** ❌ No internationalization system currently implemented

**Evidence:**
- No `/locales/` or `/i18n/` directories found
- No i18n configuration in `next.config.mjs`
- HTML lang attribute hardcoded to `"en"`
- All text strings are hardcoded in components
- No i18n libraries in `package.json`

**Recommendation:** Implement a proper i18n solution before translation to support future language additions.

---

## 11. FILES REQUIRING CODE CHANGES

All files in Category A above will need code modifications to:
1. Extract hardcoded strings to translation keys
2. Import translation hooks/utilities
3. Replace static strings with dynamic translation lookups
4. Update HTML lang attribute to be dynamic

---

## 12. ESTIMATED TRANSLATION WORD COUNT

Approximate word count for English text requiring translation:
- Navigation & UI labels: ~25 words
- Dashboard headings & descriptions: ~15 words
- Financial metrics: ~20 words
- Transaction categories: ~10 words
- Chart labels: ~15 words
- **Total: ~85 words/phrases**

---

## 13. SAMPLE TRANSLATIONS (PT-BR)

Quick reference for common terms:

| English | Portuguese (PT-BR) |
|---------|-------------------|
| Dashboard | Painel / Dashboard |
| Transactions | Transações |
| Accounts | Contas |
| Budgets | Orçamentos |
| Credit Cards | Cartões de Crédito |
| Import | Importar |
| Settings | Configurações |
| Total Balance | Saldo Total |
| Monthly Income | Receita Mensal |
| Monthly Expenses | Despesas Mensais |
| Recent Transactions | Transações Recentes |
| Cash Flow | Fluxo de Caixa |
| Budget Overview | Visão Geral do Orçamento |
| Groceries | Mercado |
| Transportation | Transporte |
| Entertainment | Entretenimento |
| Utilities | Utilidades |
| Income | Receita |
| Expenses | Despesas |
| Sync | Sincronizar |
| AI Usage | Uso de IA |

---

## 14. NEXT STEPS

1. ✅ Complete translation inventory (this document)
2. ⏳ Choose i18n implementation approach
3. ⏳ Set up translation infrastructure
4. ⏳ Create translation files (PT-BR)
5. ⏳ Refactor components to use translations
6. ⏳ Update metadata and configuration
7. ⏳ Test language switching functionality
8. ⏳ Add language selector UI component

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-28  
**Maintainer:** Development Team
