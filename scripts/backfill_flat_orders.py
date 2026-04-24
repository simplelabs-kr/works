import psycopg2, os

conn = psycopg2.connect(
    host="aws-1-ap-northeast-1.pooler.supabase.com",
    port=5432, dbname="postgres",
    user="postgres.bgetwkymzydhfwrbrbip",
    password=os.environ["SUPABASE_DB_PASSWORD"]
)
conn.autocommit = False
cur = conn.cursor()

cur.execute("SELECT id FROM orders ORDER BY created_at, id")
ids = [row[0] for row in cur.fetchall()]
print(f"총 {len(ids)}건 백필 시작", flush=True)

batch_size = 5000
for i in range(0, len(ids), batch_size):
    for bid in ids[i:i+batch_size]:
        cur.execute("SELECT sync_flat_order(%s)", (str(bid),))
    conn.commit()
    print(f"{min(i+batch_size, len(ids))}/{len(ids)} 완료", flush=True)

cur.execute("SELECT COUNT(*) FROM flat_orders")
print(f"완료: {cur.fetchone()[0]}건", flush=True)
cur.close()
conn.close()
