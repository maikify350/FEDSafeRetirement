const PAT = 'sbp_edb5a6c6044368687551033d083a29327c4b96c9'
const PID = 'gqarlkfmpgaotbezpkbs'

async function run() {
  const sql = `
    ALTER TABLE fegli_rates ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
    ALTER TABLE irs_brackets ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
  `
  const res = await fetch(`https://api.supabase.com/v1/projects/${PID}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  console.log('Status:', res.status)
  console.log(await res.text())
}

run()
