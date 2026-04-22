// Page registry — single source of truth for the LNB page list, Cmd+K
// palette entries, active-page highlighting, and view (preset) scoping.
//
// Structural contract
//   - `key` — URL slug. Used by resolveActivePage(pathname) to identify
//     the current page from the URL.
//   - `href` — navigable URL. Only meaningful when status === 'active'.
//   - `presetKey` — the value stored in `user_view_presets.page_key` for
//     views owned by this page. LNB filters favorites / 공유뷰 / 내뷰
//     to `preset.page_key === activePage.presetKey`; DataGrid scopes
//     view persistence under the same key. Multiple URL pages may share
//     a presetKey (e.g. an order-items page and its trash variant each
//     use separate presetKeys so their saved views don't cross-pollute).
//
// Adding a new page is one edit here — supply a unique `presetKey` and
// the LNB / Cmd+K / view plumbing pick it up without further wiring.

export type PageStatus = 'active' | 'coming-soon'

export type PageDef = {
  // URL-safe identifier. Used as the key for user_view_presets scoping
  // once named views land (commit 7), so keep stable.
  key: string
  label: string
  // href is only meaningful when status === 'active'. For 'coming-soon'
  // pages the LNB renders a disabled entry and Cmd+K treats them as
  // non-navigable.
  href: string | null
  status: PageStatus
  // Preset scope. `null` means "this page has no saved-view feature" —
  // LNB shows the 공유뷰 / 내뷰 sections as unavailable. Active pages
  // must supply a unique non-null presetKey.
  presetKey: string | null
}

// Order here = visual order in the LNB.
//
// `order-items` keeps its legacy presetKey 'works' so presets saved
// before the URL rename (when the page was /works/production) stay
// attached without a DB migration.
export const WORKS_PAGES: PageDef[] = [
  { key: 'order-items', label: '생산관리', href: '/works/order-items', status: 'active', presetKey: 'works' },
  { key: 'packaging',   label: '포장/출고', href: null, status: 'coming-soon', presetKey: null },
  { key: 'products',    label: '제품 관리', href: '/works/products', status: 'active', presetKey: 'products' },
  { key: 'repairs',     label: '수선',      href: '/works/repairs',  status: 'active', presetKey: 'repairs' },
  { key: 'rentals',     label: '대여',      href: '/works/rentals',  status: 'active', presetKey: 'rentals' },
  { key: 'refunds',     label: '환불',      href: '/works/refunds',  status: 'active', presetKey: 'refunds' },
]

export const TRASH_PAGE: PageDef = {
  key: 'trash',
  label: '휴지통',
  href: '/works/trash',
  status: 'active',
  presetKey: 'works-trash',
}

// Default landing page when the user hits /works directly. Kept as a
// function (not a constant) so consumers can't accidentally treat it
// as an always-valid href — the lookup still goes through resolveActivePage.
export function getDefaultWorksPage(): PageDef {
  const first = WORKS_PAGES.find(p => p.status === 'active' && p.href)
  // WORKS_PAGES is authored in this file; the `!` is safe — we always
  // ship with at least one active page.
  return first!
}

// Resolve which page the user is currently on from the pathname. Returns
// null for any unrecognized path — callers should fall back to "no
// active highlight" rather than crash.
export function resolveActivePage(pathname: string): PageDef | null {
  if (pathname.startsWith('/works/trash')) return TRASH_PAGE
  for (const p of WORKS_PAGES) {
    if (p.href && pathname.startsWith(p.href)) return p
  }
  return null
}

// Pages list that presets can belong to — includes trash. Iterated by
// resolvePageHrefForKey / resolvePageLabelForKey so new active pages
// automatically participate.
const ALL_SCOPED_PAGES: PageDef[] = [...WORKS_PAGES, TRASH_PAGE]

// Map a preset's page_key (as stored in user_view_presets) to its
// navigable href. Used by applyPreset to route to the preset's owning
// page, and by the Command Palette to label preset rows.
export function resolvePageHrefForKey(presetKey: string): string | null {
  for (const p of ALL_SCOPED_PAGES) {
    if (p.presetKey === presetKey && p.href) return p.href
  }
  return null
}

export function resolvePageLabelForKey(presetKey: string): string {
  for (const p of ALL_SCOPED_PAGES) {
    if (p.presetKey === presetKey) return p.label
  }
  return presetKey
}
