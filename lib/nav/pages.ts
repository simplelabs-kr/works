// Page registry — single source of truth for the LNB page list, Cmd+K
// palette entries, and active-page highlighting. When a new page comes
// online (e.g. 제품관리), flip its status to 'active' and set href; the
// GNB/LNB/CmdK consumers will pick it up automatically.

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
}

// Order here = visual order in the LNB.
export const WORKS_PAGES: PageDef[] = [
  { key: 'production', label: '생산관리', href: '/works/production', status: 'active' },
  { key: 'packaging',  label: '포장/출고', href: null, status: 'coming-soon' },
  { key: 'products',   label: '제품 관리', href: '/works/products', status: 'active' },
]

export const TRASH_PAGE: PageDef = {
  key: 'trash',
  label: '휴지통',
  href: '/works/trash',
  status: 'active',
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

// Map a page_key (as stored in user_view_presets / user_view_settings)
// to its navigable href. Used by applyPreset to route to the preset's
// owning page, and by the Command Palette to label preset rows.
export function resolvePageHrefForKey(pageKey: string): string | null {
  if (pageKey === TRASH_PAGE.key || pageKey === 'works-trash') return TRASH_PAGE.href
  for (const p of WORKS_PAGES) {
    if (p.key === pageKey && p.href) return p.href
  }
  // worksPageConfig.pageKey is 'works' (legacy) → treat as production.
  if (pageKey === 'works') return '/works/production'
  // productsPageConfig.pageKey is 'products' — already handled by the
  // WORKS_PAGES loop above, no extra alias needed.
  return null
}

export function resolvePageLabelForKey(pageKey: string): string {
  if (pageKey === TRASH_PAGE.key || pageKey === 'works-trash') return TRASH_PAGE.label
  for (const p of WORKS_PAGES) {
    if (p.key === pageKey) return p.label
  }
  if (pageKey === 'works') return '생산관리'
  return pageKey
}
