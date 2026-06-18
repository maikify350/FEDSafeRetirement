import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:Ninalove$!2026@db.gqarlkfmpgaotbezpkbs.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function createTable() {
  await client.connect();
  try {
    const res = await client.query(`
      CREATE TABLE IF NOT EXISTS public.artwork_shortlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shortlist_id TEXT UNIQUE NOT NULL,
        selected_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      
      -- Add RLS policies to allow public read/write for now
      ALTER TABLE public.artwork_shortlists ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Allow public read" ON public.artwork_shortlists FOR SELECT USING (true);
      CREATE POLICY "Allow public insert" ON public.artwork_shortlists FOR INSERT WITH CHECK (true);
      CREATE POLICY "Allow public update" ON public.artwork_shortlists FOR UPDATE USING (true);
    `);
    console.log('Table created or already exists');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await client.end();
  }
}

createTable();
