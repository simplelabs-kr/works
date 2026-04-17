import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/requireUser";

// 지난 1년 ~ 앞으로 3년치 공휴일만 조회. 출고예정일 계산은 실제로 이 범위 내에서만 수행됨.
const YEARS_PAST = 1;
const YEARS_FUTURE = 3;

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const now = new Date();
  const fromYear = now.getFullYear() - YEARS_PAST;
  const toYear = now.getFullYear() + YEARS_FUTURE;
  const fromDate = `${fromYear}-01-01`;
  const toDate = `${toYear}-12-31`;

  const { data, error } = await supabaseAdmin
    .from("holidays")
    .select("date")
    .gte("date", fromDate)
    .lte("date", toDate)
    .limit(2000);

  if (error) {
    console.error("[holidays] supabase error:", error.message);
    return NextResponse.json({ error: "공휴일 조회에 실패했습니다" }, { status: 500 });
  }

  const dates = (data ?? []).map((row: { date: string }) => row.date.slice(0, 10));
  return NextResponse.json(
    { dates },
    {
      headers: {
        // 공휴일 데이터는 거의 변하지 않음. 브라우저/엣지 캐시 모두 활용.
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
