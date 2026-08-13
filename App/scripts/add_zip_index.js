const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Ninalove$!2026@db.gqarlkfmpgaotbezpkbs.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to Database.');
  
  console.log('Creating idx_leads_facility_zip_prefix...');
  await client.query('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_facility_zip_prefix ON public.leads (facility_zip_code text_pattern_ops);');
  
  console.log('Creating idx_leads_personal_zip_prefix...');
  await client.query('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_personal_zip_prefix ON public.leads (personal_zip text_pattern_ops);');
  
  console.log('Indexes created successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Error creating indexes:', err);
  client.end();
});
