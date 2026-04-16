import psycopg2, socket

# Force IPv4
original_getaddrinfo = socket.getaddrinfo
def getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    return original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = getaddrinfo_ipv4

try:
    conn = psycopg2.connect(
        host='db.gqarlkfmpgaotbezpkbs.supabase.co',
        port=5432,
        database='postgres',
        user='postgres',
        password='Ninalove$!2026'
    )
    print('Connected!')
    cur = conn.cursor()

    # Read the migration SQL
    with open('scripts/lead_funnel_migration.sql', 'r') as f:
        sql = f.read()

    cur.execute(sql)
    conn.commit()
    print('Migration executed successfully!')

    # Verify table exists
    cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_name = 'lead_funnel'")
    print('Table exists:', cur.fetchone()[0] > 0)

    cur.close()
    conn.close()
    print('DONE')
except Exception as e:
    print(f'Error: {e}')
