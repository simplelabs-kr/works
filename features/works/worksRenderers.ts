// Cell renderers for the Works grid.
//
// HOT renderers run outside React's component context and can't close over
// component state directly. Historically this file (and its call sites in
// WorksGrid) solved that with a scattered set of module-level `let` variables
// (`onImageGallery`, `checkedRowsRefGlobal`, etc.) that the component wired
// up at mount and the renderers read at call time.
//
// That pattern is preserved here — same late-bound behavior — but collapsed
// into a single `rendererBridge` object. The component writes into it at
// mount and clears fields on unmount; renderers read from it. One object,
// one place to audit.
//
// IMPORTANT: these renderers are currently written for the Works grid's
// specific DOM conventions (sig-cache class names, CSS hooks like
// `data-select-col`, `.image-popout-wrapper`, etc.). They're moved here
// verbatim from WorksGrid.tsx to separate config from the grid shell; a
// later commit will promote the generic ones (checkbox/image/attachment/
// renderSelectBadge) into a shared DataGrid renderer module.

import type Handsontable from 'handsontable'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AttachmentItem, ImageItem, Row } from './worksTypes'

// ── Select column options (display → bg color map) ───────────────────────────
//
// At runtime these are hydrated from /api/field-options (Supabase
// `field_options` table) so the option catalog can be edited from the UI
// without a code change. The hardcoded map below is used as the initial
// value before the fetch resolves, and as the bg-color fallback when a DB
// row has `color IS NULL`. Consumers read through `getSelectColumnOptions()`
// so they always see the latest values after `setSelectColumnOptions()`
// runs on mount.

export type SelectOption = { value: string; bg: string }
export type SelectOptionsMap = Record<string, SelectOption[]>

const SELECT_COLUMN_OPTIONS_FALLBACK: SelectOptionsMap = {
  '사출_방식': [
    { value: 'RP', bg: '#EDE9FE' },
    { value: '왁스', bg: '#DBEAFE' },
  ],
  '작업_위치': [
    { value: '현장', bg: '#DCFCE7' },
    { value: '검수', bg: '#DBEAFE' },
    { value: '조립', bg: '#EDE9FE' },
    { value: '마무리 광', bg: '#FEF9C3' },
    { value: '조각', bg: '#FFEDD5' },
    { value: '도금', bg: '#FEF3C7' },
    { value: '각인', bg: '#FCE7F3' },
    { value: '광실', bg: '#F3F4F6' },
    { value: '세척/검수후재작업', bg: '#CCFBF1' },
    { value: '에폭시(연마)', bg: '#FEF2F2' },
    { value: '에폭시(일반)', bg: '#FEF2F2' },
    { value: '컷팅', bg: '#F3F4F6' },
    { value: '외부', bg: '#F1F5F9' },
    { value: '대기', bg: '#F9FAFB' },
    { value: '취소', bg: '#FEE2E2' },
    { value: '조립 대기 중', bg: '#EDE9FE' },
    { value: '유화', bg: '#F3F4F6' },
    { value: '초벌', bg: '#F3F4F6' },
  ],
}

let selectColumnOptions: SelectOptionsMap = SELECT_COLUMN_OPTIONS_FALLBACK

export function getSelectColumnOptions(): SelectOptionsMap {
  return selectColumnOptions
}

// FilterModal-shape: values only, no bg colors. Recomputed from whatever
// the current select catalog is.
export function getFilterSelectOptions(): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(selectColumnOptions).map(([k, v]) => [k, v.map(o => o.value)])
  )
}

// Replaces the catalog with a freshly-fetched one. Per-value bg color
// falls back to the hardcoded map when the DB row has no color set yet,
// so renderers keep their existing colors during the DB migration window.
// Fields that are absent in the incoming payload are preserved from the
// hardcoded fallback — avoids the dropdown going empty if the DB row for
// that field hasn't been seeded yet.
export function setSelectColumnOptions(incoming: SelectOptionsMap): void {
  const merged: SelectOptionsMap = {}
  for (const [field, values] of Object.entries(incoming)) {
    merged[field] = values.map(o => ({
      value: o.value,
      bg:
        o.bg ||
        SELECT_COLUMN_OPTIONS_FALLBACK[field]?.find(f => f.value === o.value)?.bg ||
        '',
    }))
  }
  for (const field of Object.keys(SELECT_COLUMN_OPTIONS_FALLBACK)) {
    if (!merged[field]) merged[field] = SELECT_COLUMN_OPTIONS_FALLBACK[field]
  }
  selectColumnOptions = merged
}

// ── Renderer bridge (late-bound component state for HOT callbacks) ───────────

export type RendererBridge = {
  onAttachmentUpload: ((rowIdx: number, files: FileList) => void) | null
  onAttachmentDelete: ((rowIdx: number, fileIdx: number) => void) | null
  onImageGallery: ((images: ImageItem[], startIdx: number) => void) | null
  // Supabase Storage image transform width — ≈ 2× thumb px for retina, updated
  // by WorksGrid whenever row height changes so thumbnails fetch at an
  // appropriate resolution per size. Defaults to the Short-row value so
  // initial renders (before first effect flush) already get a sensible size.
  imageThumbUrlWidth: number
  checkedRowsRef: MutableRefObject<Set<string>> | null
  lastCheckedRowRef: MutableRefObject<number | null> | null
  setSelectedRowIds: Dispatch<SetStateAction<Set<string>>> | null
  hotRef: MutableRefObject<Handsontable | null> | null
}

export const rendererBridge: RendererBridge = {
  onAttachmentUpload: null,
  onAttachmentDelete: null,
  onImageGallery: null,
  imageThumbUrlWidth: 48,
  checkedRowsRef: null,
  lastCheckedRowRef: null,
  setSelectedRowIds: null,
  hotRef: null,
}

export function resetRendererBridge() {
  rendererBridge.onAttachmentUpload = null
  rendererBridge.onAttachmentDelete = null
  rendererBridge.onImageGallery = null
  rendererBridge.imageThumbUrlWidth = 48
  rendererBridge.checkedRowsRef = null
  rendererBridge.lastCheckedRowRef = null
  rendererBridge.setSelectedRowIds = null
  rendererBridge.hotRef = null
}

// ── Attachment renderer ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function attachmentRenderer(_hot: any, td: HTMLTableCellElement, row: number, _col: number, _prop: any, value: any) {
  const items: AttachmentItem[] = Array.isArray(value) ? value.filter((v: any) => v?.url) : [] // eslint-disable-line @typescript-eslint/no-explicit-any
  // Sig-cache: skip DOM rebuild when the cell's visible content would be identical.
  // Click handlers close over `row` and the `fileIdx` of each chip, so the sig must
  // include row + url+name of every item.
  //
  // DOM verification is CRITICAL: HOT reuses td elements across columns during
  // virtualization. A td that was ours may later be used by the default text
  // renderer for a different column — which clears our wrapper but leaves our
  // __attSig intact. If we skipped rebuild on the next match, the user would
  // see the other column's stale text in this cell. So before trusting the sig
  // we require our `.attachment-popout-wrapper` to still be the first child.
  const sig = `${row}|${row === 0 ? 1 : 0}|${items.map(i => `${i.url}\u0001${i.name}`).join('\u0002')}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  const firstEl = td.firstElementChild as HTMLElement | null
  const domIsOurs = !!firstEl && firstEl.classList.contains('attachment-popout-wrapper')
  if (domIsOurs && anyTd.__attSig === sig) return
  anyTd.__attSig = sig

  td.innerHTML = ''
  td.style.padding = '0'

  const wrapper = document.createElement('div')
  wrapper.className = 'attachment-popout-wrapper'
  if (row === 0) wrapper.classList.add('is-first-row')

  if (items.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'attachment-empty'
    const clipIcon = document.createElement('span')
    clipIcon.style.fontSize = '13px'
    clipIcon.textContent = '\u{1F4CE}'
    const label = document.createElement('span')
    label.style.cssText = 'font-size:11px;color:#9CA3AF;'
    label.textContent = '파일 추가'
    empty.appendChild(clipIcon)
    empty.appendChild(label)
    empty.onclick = (e) => {
      e.stopPropagation()
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = () => { if (input.files?.length) rendererBridge.onAttachmentUpload?.(row, input.files) }
      input.click()
    }
    wrapper.appendChild(empty)
  } else {
    items.forEach((item, i) => {
      const chip = document.createElement('a')
      chip.className = 'attachment-chip'
      chip.href = item.url
      chip.target = '_blank'
      chip.rel = 'noopener noreferrer'
      chip.title = item.name
      chip.onclick = (e) => e.stopPropagation()
      const clipSpan = document.createElement('span')
      clipSpan.style.fontSize = '11px'
      clipSpan.textContent = '\u{1F4CE}'
      chip.appendChild(clipSpan)
      const nameEl = document.createElement('span')
      nameEl.className = 'attachment-name'
      nameEl.textContent = item.name
      chip.appendChild(nameEl)
      // Delete button
      const delBtn = document.createElement('span')
      delBtn.className = 'attachment-del'
      delBtn.textContent = '\u00D7'
      delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); rendererBridge.onAttachmentDelete?.(row, i) }
      chip.appendChild(delBtn)
      wrapper.appendChild(chip)
    })
    const addBtn = document.createElement('div')
    addBtn.className = 'attachment-add-btn'
    addBtn.textContent = '+'
    addBtn.onclick = (e) => {
      e.stopPropagation()
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = () => { if (input.files?.length) rendererBridge.onAttachmentUpload?.(row, input.files) }
      input.click()
    }
    wrapper.appendChild(addBtn)
  }

  td.ondragover = (e) => { e.preventDefault(); wrapper.classList.add('drag-over') }
  td.ondragleave = () => { wrapper.classList.remove('drag-over') }
  td.ondrop = (e) => {
    e.preventDefault()
    wrapper.classList.remove('drag-over')
    if (e.dataTransfer?.files?.length) rendererBridge.onAttachmentUpload?.(row, e.dataTransfer.files)
  }

  td.appendChild(wrapper)
}

// ── Image renderer ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function imageRenderer(_hot: any, td: HTMLTableCellElement, row: number, _col: number, _prop: any, value: any) {
  const imgs: ImageItem[] = Array.isArray(value) ? value.filter((v: any) => v?.url) : [] // eslint-disable-line @typescript-eslint/no-explicit-any
  // Sig-cache with DOM verification (see attachmentRenderer for rationale).
  // HOT can reuse a td across different columns during virtualization — the
  // sig alone is not enough; we also verify `.image-popout-wrapper` is still
  // the td's first child. If it's gone, another renderer has touched this td
  // and we must rebuild to avoid showing stale content from another column.
  const sig = `${row === 0 ? 1 : 0}|${rendererBridge.imageThumbUrlWidth}|${imgs.map(i => i.url).join('\u0001')}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  const firstEl = td.firstElementChild as HTMLElement | null
  const domIsOurs = !!firstEl && firstEl.classList.contains('image-popout-wrapper')

  if (imgs.length === 0) {
    // Empty state: always clear. We cannot reliably detect stale text nodes
    // (firstElementChild ignores them), and the work is trivial.
    anyTd.__imgSig = ''
    td.innerHTML = ''
    td.classList.add('htDimmed')
    td.style.padding = '0'
    return
  }

  if (domIsOurs && anyTd.__imgSig === sig) return
  anyTd.__imgSig = sig

  td.innerHTML = ''
  td.classList.add('htDimmed')
  td.style.padding = '0'

  const wrapper = document.createElement('div')
  wrapper.className = 'image-popout-wrapper'
  if (row === 0) wrapper.classList.add('is-first-row')

  imgs.forEach((item, i) => {
    const img = document.createElement('img')
    img.className = 'image-thumb'
    img.src = item.url.includes('supabase.co/storage')
      ? item.url + `?width=${rendererBridge.imageThumbUrlWidth}&quality=70`
      : item.url
    img.onclick = (e) => {
      if (!td.classList.contains('current')) return
      e.stopPropagation()
      rendererBridge.onImageGallery?.(imgs, i)
    }
    wrapper.appendChild(img)
  })

  td.appendChild(wrapper)
}

// ── No. column renderer (row number + selection checkbox) ────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function noColRenderer(_hot: any, td: HTMLTableCellElement, row: number) {
  // Get row data to determine checked state. getSourceDataAtRow is O(1) —
  // avoid getSourceData()[row] which would force the full array.
  const rowData = (_hot as any).getSourceDataAtRow?.(row) as Row | undefined // eslint-disable-line @typescript-eslint/no-explicit-any
  const rowId = rowData?.id
  const isChecked = rowId && rendererBridge.checkedRowsRef?.current.has(rowId)

  // Sig-cache + DOM verification. Sig alone is unsafe: HOT can reuse a td
  // across different columns during virtualization, in which case another
  // renderer overwrites our DOM while __noSig still persists. We require
  // our marker class to still be the td's first child before trusting it.
  const sig = `${row}|${rowId ?? ''}|${isChecked ? '1' : '0'}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  const firstEl = td.firstElementChild as HTMLElement | null
  const domIsOurs = !!firstEl && firstEl.classList.contains('no-col-wrapper')
  if (domIsOurs && anyTd.__noSig === sig) return
  anyTd.__noSig = sig

  td.innerHTML = ''
  td.style.backgroundColor = '#F8FAFC'
  td.style.borderRight = '1px solid #E2E8F0'
  td.style.padding = '0'
  // No hardcoded height — global CSS (.handsontable td) drives height via --grid-row-h.
  // Setting explicit height here was the root cause of the "fixed No. column drift" bug.
  td.style.overflow = 'hidden'

  const wrapper = document.createElement('div')
  wrapper.className = 'no-col-wrapper'
  wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:4px;width:100%;height:100%;'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'row-select-checkbox'
  checkbox.checked = !!isChecked
  checkbox.style.cssText = 'width:13px;height:13px;margin:0;padding:0;cursor:pointer;flex-shrink:0;'
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation()
    if (!rowId) return

    // 단일 선택/해제만 처리 (shift+클릭은 beforeOnCellMouseDown에서 처리)
    if (checkbox.checked) {
      rendererBridge.checkedRowsRef?.current.add(rowId)
    } else {
      rendererBridge.checkedRowsRef?.current.delete(rowId)
      // 체크 해제 시 즉시 DOM 업데이트
      checkbox.checked = false
    }

    // lastChecked 업데이트
    if (rendererBridge.lastCheckedRowRef) {
      rendererBridge.lastCheckedRowRef.current = row
    }

    // selectedRowIds state 동기화
    if (rendererBridge.checkedRowsRef && rendererBridge.setSelectedRowIds) {
      rendererBridge.setSelectedRowIds(new Set(rendererBridge.checkedRowsRef.current))
    }
  })

  const num = document.createElement('span')
  num.textContent = String(row + 1)
  num.style.cssText = 'font-size:11px;color:#94A3B8;flex-shrink:0;'

  wrapper.appendChild(checkbox)
  wrapper.appendChild(num)
  td.appendChild(wrapper)
}

// ── Common select badge renderer ─────────────────────────────────────────────

export function renderSelectBadge(td: HTMLTableCellElement, value: string, bg: string, editable = false) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '0 8px'
  td.style.position = 'relative'
  if (editable) {
    td.dataset.selectCol = 'true'
  } else {
    delete td.dataset.selectCol
  }
  if (!value) return
  const badge = document.createElement('span')
  badge.textContent = value
  badge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;min-width:40px;padding:2px 8px;border-radius:9999px;font-size:13px;font-weight:500;line-height:normal;background:${bg || '#F3F4F6'};color:#111827;white-space:nowrap;`
  td.appendChild(badge)
}

// ── Purchase status renderer ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function purchaseStatusRenderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  td.innerHTML = ''
  td.style.verticalAlign = 'middle'
  td.style.padding = '0 8px'
  td.classList.add('htDimmed')
  if (!value) return
  const dotColor: Record<string, string> = {
    '발주 필요': '#EF4444',
    '수령 필요': '#F97316',
    '수령 완료': '#22C55E',
  }
  const color = dotColor[value]
  if (!color) return
  const wrap = document.createElement('span')
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;line-height:normal;'
  const dot = document.createElement('span')
  dot.style.cssText = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0;`
  const text = document.createElement('span')
  text.textContent = value
  text.style.cssText = 'font-size:13px;color:#111827;white-space:nowrap;'
  wrap.appendChild(dot)
  wrap.appendChild(text)
  td.appendChild(wrap)
}

// ── Custom checkbox renderer ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkboxRenderer(hot: any, td: HTMLTableCellElement, row: number, col: number, _prop: any, value: boolean) {
  // Sig-cache + DOM verification. The click handler closes over row/col, so the
  // sig includes both. But sig alone is unsafe — HOT may reuse a td across
  // different columns during virtualization; the default text renderer for the
  // other column clears our DOM while __cbSig still persists, then a later
  // match would paint stale blank checkboxes over real text. We verify our
  // marker class is still the td's first child before trusting the sig.
  const checked = value === true
  const sig = `${row}|${col}|${checked ? '1' : '0'}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyTd = td as any
  const firstEl = td.firstElementChild as HTMLElement | null
  const domIsOurs = !!firstEl && firstEl.classList.contains('checkbox-wrapper')
  if (domIsOurs && anyTd.__cbSig === sig) return
  anyTd.__cbSig = sig

  td.innerHTML = ''
  // CRITICAL: assign (not `+=`) — the `+=` operator grew the style attribute
  // unboundedly on every scroll-triggered re-render, which thrashed style recalc
  // after a few seconds of scrolling.
  td.style.cssText = 'padding:0;overflow:hidden;cursor:default;'
  td.style.textAlign = 'center'
  td.style.verticalAlign = 'middle'
  td.style.lineHeight = '0'

  td.onmouseenter = null
  td.onmouseleave = null
  td.onclick = null

  // Outer container: fills the td completely, flex-centers the hit target.
  // height:100% tracks --grid-row-h so the checkbox stays centered at any row height.
  const outer = document.createElement('div')
  outer.className = 'checkbox-wrapper'
  outer.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;'

  // Hit target: fixed 24×24, shows hover background, contains the checkmark
  const box = document.createElement('span')
  box.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex-shrink:0;border-radius:4px;transition:background 0.1s;cursor:pointer;'

  if (checked) {
    box.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="1.5,6 5.5,10 12.5,1.5" stroke="#2D7FF9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }

  box.onmouseenter = () => { box.style.border = '1.5px solid #D1D5DB' }
  box.onmouseleave = () => { box.style.border = 'none' }

  box.onclick = (e) => {
    e.stopPropagation()
    // Respect readOnly (e.g. trash view sets every cell readOnly). The
    // cells hook overrides per-column `readOnly:false` in that case, so
    // checking cell meta is the authoritative gate.
    const meta = hot.getCellMeta(row, col)
    if (meta?.readOnly) return
    const currentVal = hot.getDataAtCell(row, col)
    hot.setDataAtCell(row, col, currentVal !== true, 'checkboxClick')
  }

  outer.appendChild(box)
  td.appendChild(outer)
}

// ── Select-column renderers (사출_방식 / 작업_위치) ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function 사출방식Renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  const bg = selectColumnOptions['사출_방식']?.find(o => o.value === value)?.bg ?? ''
  renderSelectBadge(td, value, bg, true)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function 작업위치Renderer(_hot: any, td: HTMLTableCellElement, _row: any, _col: any, _prop: any, value: string) {
  const bg = selectColumnOptions['작업_위치']?.find(o => o.value === value)?.bg ?? ''
  renderSelectBadge(td, value, bg, true)
}
