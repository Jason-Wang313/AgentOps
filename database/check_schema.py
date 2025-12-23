from db import get_db_connection

conn = get_db_connection()
if conn:
    try:
        with conn.cursor() as cur:
            # Query the system catalog to get column names
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'agent_logs'
            """)
            columns = [row[0] for row in cur.fetchall()]
            print("\n📊 YOUR TABLE COLUMNS:")
            print("-----------------------")
            for col in columns:
                print(f"👉 {col}")
            print("-----------------------\n")
    except Exception as e:
        print(e)
    finally:
        conn.close()