import psycopg2, os

conn = psycopg2.connect(
    host="aws-1-ap-northeast-1.pooler.supabase.com",
    port=5432, dbname="postgres",
    user="postgres.bgetwkymzydhfwrbrbip",
    password=os.environ["SUPABASE_DB_PASSWORD"]
)
conn.autocommit = False
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM orders")
total = cur.fetchone()[0]
print(f"총 {total}건 백필 시작", flush=True)

# 배치 단위로 서버사이드 집합 연산 — 개별 round-trip 대신 단일 쿼리에서
# sync_flat_order 를 집합 호출한다. ctid 기반 chunk 로 진행 상황 로그.
batch_size = 2000
offset = 0
while offset < total:
    cur.execute(
        """
        WITH batch AS (
          SELECT id FROM orders ORDER BY created_at, id OFFSET %s LIMIT %s
        )
        SELECT sync_flat_order(id) FROM batch
        """,
        (offset, batch_size),
    )
    conn.commit()
    offset += batch_size
    print(f"{min(offset, total)}/{total} 완료", flush=True)

cur.execute("SELECT COUNT(*) FROM flat_orders")
print(f"완료: {cur.fetchone()[0]}건", flush=True)
cur.close()
conn.close()
