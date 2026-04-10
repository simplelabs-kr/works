import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// ── Filter support ────────────────────────────────────────────────────────────

interface FilterCondition {
  id: string
  logic: 'AND' | 'OR'
  columnKey: string
  operator: string
  value: string | boolean | null
}

// Row의 columnKey → 실제 DB 컬럼 경로 (null = 서버 필터 불가, 클라이언트 처리)
const FILTER_COL_MAP: Record<string, string | null> = {
  '제품명_코드':     'products.제품명',
  '발주일':          'orders.발주일',
  '생산시작일':      'orders.생산시작일',
  '데드라인':        '데드라인',
  '수량':            '수량',
  '발주_수량':       'orders.수량',
  '호수':            'orders.호수',
  '고객명':          'orders.고객명',
  '디자이너_노트':   '디자이너_노트',
  '중량':            '중량',
  '검수':            '검수',
  '기타_옵션':       'orders.기타_옵션',
  '각인_내용':       'orders.각인_내용',
  '각인_폰트':       'orders.각인_폰트',
  '기본_공임':       'products.기본_공임',
  '공임_조정액':     'orders.공임_조정액',
  '확정_공임':       'orders.확정_공임',
  '작업_위치':       '작업_위치',
  '검수_유의':       'products.검수_유의',
  '도금_색상':       'orders.도금_색상',
  '사출_방식':       '사출_방식',
  '주물_후_수량':    '주물_후_수량',
  '포장':            '포장',
  'rp_출력_시작':    'rp_출력_시작',
  '왁스_파트_전달':  '왁스_파트_전달',
  // 계산 컬럼 – 서버 필터 불가
  '시세_g당':        null,
  '소재비':          null,
  '허용_중량_범위':  null,
  '중량_검토':       null,
  '순금_중량':       null,
  '출고예정일':      null,
  '발주_현황':       null,
  '원부자재':        null,
  '번들_명칭':       null,
  'metals.name':     null,
  'metals.purity':   null,
  '가다번호':        null,
  '가다_위치':       null,
}

function getDateRange(operator: string): [string, string] | null {
  const now = new Date()
  const pad = (d: Date) => d.toISOString().slice(0, 10)
  const add = (d: Date, days: number) => { const r = new Date(d); r.setDate(r.getDate() + days); return r }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = today.getDay() // 0=Sun
  const monday = add(today, dow === 0 ? -6 : 1 - dow)

  switch (operator) {
    case 'is_today':      return [pad(today), pad(add(today, 1))]
    case 'is_yesterday':  return [pad(add(today, -1)), pad(today)]
    case 'is_this_week':  return [pad(monday), pad(add(monday, 7))]
    case 'is_last_week':  return [pad(add(monday, -7)), pad(monday)]
    case 'is_this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return [pad(s), pad(e)]
    }
    case 'is_last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 1)
      return [pad(s), pad(e)]
    }
    default: return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyOneCond(query: any, cond: FilterCondition, dbCol: string): any {
  const strVal = String(cond.value ?? '')
  switch (cond.operator) {
    case 'contains':        return query.ilike(dbCol, `%${strVal}%`)
    case 'not_contains':    return query.not(dbCol, 'ilike', `%${strVal}%`)
    case 'is':              return query.eq(dbCol, strVal)
    case 'is_not':          return query.neq(dbCol, strVal)
    case 'is_empty':        return query.or(`${dbCol}.is.null,${dbCol}.eq.`)
    case 'is_not_empty':    return query.not(dbCol, 'is', null)
    case 'eq':              return query.eq(dbCol, Number(strVal))
    case 'neq':             return query.neq(dbCol, Number(strVal))
    case 'gt':              return query.gt(dbCol, Number(strVal))
    case 'gte':             return query.gte(dbCol, Number(strVal))
    case 'lt':              return query.lt(dbCol, Number(strVal))
    case 'lte':             return query.lte(dbCol, Number(strVal))
    case 'is_before':       return query.lt(dbCol, strVal)
    case 'is_after':        return query.gt(dbCol, strVal)
    case 'is_on_or_before': return query.lte(dbCol, strVal)
    case 'is_on_or_after':  return query.gte(dbCol, strVal)
    case 'is_checked':      return query.eq(dbCol, true)
    case 'is_unchecked':    return query.or(`${dbCol}.eq.false,${dbCol}.is.null`)
    case 'is_today': case 'is_yesterday': case 'is_this_week':
    case 'is_last_week': case 'is_this_month': case 'is_last_month': {
      const range = getDateRange(cond.operator)
      if (!range) return query
      return query.gte(dbCol, range[0]).lt(dbCol, range[1])
    }
    default: return query
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFiltersToQuery(query: any, conditions: FilterCondition[]): any {
  // 서버 필터 가능한 조건만 추출
  const mappable = conditions.filter(c => FILTER_COL_MAP[c.columnKey] != null)
  if (!mappable.length) return query

  // AND/OR 그룹 분리 (클라이언트 로직과 동일)
  const groups: FilterCondition[][] = []
  let cur: FilterCondition[] = []
  for (let i = 0; i < mappable.length; i++) {
    if (i > 0 && mappable[i].logic === 'OR' && cur.length > 0) {
      groups.push(cur); cur = []
    }
    cur.push(mappable[i])
  }
  if (cur.length) groups.push(cur)

  if (groups.length === 1) {
    // AND 조건만 → 체이닝
    for (const cond of groups[0]) {
      const dbCol = FILTER_COL_MAP[cond.columnKey]!
      query = applyOneCond(query, cond, dbCol)
    }
  } else {
    // OR 그룹 → PostgREST .or() 문자열 구성
    const toPostgrest = (cond: FilterCondition, dbCol: string): string | null => {
      const v = String(cond.value ?? '').replace(/[,()]/g, '')
      switch (cond.operator) {
        case 'contains':        return `${dbCol}.ilike.*${v}*`
        case 'not_contains':    return `${dbCol}.not.ilike.*${v}*`
        case 'is':              return `${dbCol}.eq.${v}`
        case 'is_not':          return `${dbCol}.neq.${v}`
        case 'is_empty':        return `${dbCol}.is.null`
        case 'is_not_empty':    return `${dbCol}.not.is.null`
        case 'eq': case 'is_before': case 'is_after':
        case 'is_on_or_before': case 'is_on_or_after':
          return `${dbCol}.${cond.operator.replace('is_before','lt').replace('is_after','gt').replace('is_on_or_before','lte').replace('is_on_or_after','gte').replace('eq','eq')}.${v}`
        case 'neq':   return `${dbCol}.neq.${v}`
        case 'gt':    return `${dbCol}.gt.${v}`
        case 'gte':   return `${dbCol}.gte.${v}`
        case 'lt':    return `${dbCol}.lt.${v}`
        case 'lte':   return `${dbCol}.lte.${v}`
        case 'is_checked':   return `${dbCol}.eq.true`
        case 'is_unchecked': return `${dbCol}.eq.false`
        default: return null
      }
    }

    const orParts = groups.map(group => {
      const parts = group
        .map(c => toPostgrest(c, FILTER_COL_MAP[c.columnKey]!))
        .filter(Boolean) as string[]
      if (parts.length === 0) return null
      if (parts.length === 1) return parts[0]
      return `and(${parts.join(',')})`
    }).filter(Boolean) as string[]

    if (orParts.length > 0) {
      query = query.or(orParts.join(','))
    }
  }

  return query
}

const SELECT = `
  id,
  updated_at,
  고유_번호,
  수량,
  중량,
  데드라인,
  출고일,
  발송일,
  중단_취소,
  검수,
  포장,
  출고,
  작업_위치,
  주물_후_수량,
  rp_출력_시작,
  왁스_파트_전달,
  디자이너_노트,
  사출_방식,
  bundle_id,
  metal_price_id,
  order_id,
  orders!order_items_order_id_fkey(
    brand_id,
    product_id,
    수량,
    발주일,
    생산시작일,
    소재,
    metal_id,
    고객명,
    각인_내용,
    각인_폰트,
    기타_옵션,
    호수,
    확정_공임,
    공임_조정액,
    회차,
    도금_색상,
    체인_길이,
    체인_두께,
    brands!orders_brand_id_fkey(name),
    products!orders_product_id_fkey(제품명, 제작_소요일),
    metals!orders_metal_id_fkey(name, purity)
  ),
  metal_prices!order_items_metal_price_id_fkey(price_per_gram),
  products!order_items_product_id_direct_fkey(
    제품명,
    제작_소요일,
    기준_중량,
    기본_공임,
    검수_유의,
    product_molds!product_molds_product_id_fkey(
      molds!product_molds_mold_id_fkey(
        가다번호,
        mold_positions!molds_mold_position_id_fkey(보관함_위치)
      )
    )
  ),
  bundles!order_items_bundle_id_fkey(번들_고유번호),
  purchases!purchases_order_item_id_fkey(
    이름,
    구분,
    발주,
    수령,
    재고_사용,
    material_id,
    materials!purchases_material_id_fkey(품목명)
  )
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offset  = Number(searchParams.get("offset") ?? 0);
  const sortCol = searchParams.get("sortCol") || "발주일";
  const sortDir = searchParams.get("sortDir") || "desc";

  // Parse filter conditions from WorksGrid
  let filters: FilterCondition[] = []
  try {
    const fp = searchParams.get("filters")
    if (fp) filters = JSON.parse(fp)
  } catch { /* ignore malformed JSON */ }

  // 발주일은 orders 테이블 컬럼 → embedded 정렬 사용
  const dbSortCol = sortCol === "발주일" ? "orders.발주일" : sortCol;

  // Build base query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataQuery = (supabaseAdmin as any)
    .from("order_items")
    .select(SELECT)
    .not("중단_취소", "is", true)

  dataQuery = applyFiltersToQuery(dataQuery, filters)
  dataQuery = dataQuery
    .order(dbSortCol, { ascending: sortDir === "asc" })
    .range(offset, offset + 99)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await dataQuery as { data: AnyRecord[]; error: any }

  if (error) {
    console.error("[order-items] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count (offset === 0일 때만)
  let totalCount: number | undefined;
  if (offset === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQuery = (supabaseAdmin as any)
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .not("중단_취소", "is", true)
    countQuery = applyFiltersToQuery(countQuery, filters)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await countQuery as { count: number | null; error: any }
    if (!countError) totalCount = count ?? 0;
  }

  return NextResponse.json({ data: data ?? [], totalCount });
}
