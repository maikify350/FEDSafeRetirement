#!/usr/bin/env bun
/**
 * cleanup-explainers.ts
 * Deletes stale audio files from the Supabase Explainers bucket.
 * Run once after renaming XxxView → XxxList and XxxEditDrawer → XxxEdit.
 */

const CORP_URL         = 'https://otsodapoddxqtfbeovcl.supabase.co'
const CORP_PROJECT_REF = 'otsodapoddxqtfbeovcl'
const MGMT_TOKEN       = 'sbp_4fedaa7f49c22526450e6eb5f2f6a15fad922b78'
const BUCKET           = 'Explainers'

const STALE = [
  // old View names (replaced by List names)
  'ClientsView.mp3', 'RequestsView.mp3', 'QuotesView.mp3',
  'JobsView.mp3', 'InvoicesView.mp3', 'VendorsView.mp3', 'PurchaseOrdersView.mp3',
  // old EditDrawer names (replaced by Edit names)
  'ClientEditDrawer.mp3', 'RequestEditDrawer.mp3', 'QuoteEditDrawer.mp3',
  'JobEditDrawer.mp3', 'InvoiceEditDrawer.mp3', 'VendorEditDrawer.mp3', 'POEditDrawer.mp3',
]

async function getServiceKey(): Promise<string> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${CORP_PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${MGMT_TOKEN}` },
  })
  const keys = await res.json() as { name: string; api_key: string }[]
  return keys.find(k => k.name === 'service_role')!.api_key
}

async function deleteFiles(serviceKey: string) {
  const res = await fetch(`${CORP_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: {
      Authorization:  `Bearer ${serviceKey}`,
      apikey:         serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: STALE }),
  })
  const body = await res.json()
  return { status: res.status, body }
}

async function main() {
  console.log('🔑  Fetching service_role key...')
  const key = await getServiceKey()
  console.log('🗑   Deleting stale files from bucket...')
  const { status, body } = await deleteFiles(key)
  if (status >= 200 && status < 300) {
    console.log(`✅  Deleted ${STALE.length} stale files (${status})`)
  } else {
    console.warn(`⚠   Status ${status}:`, JSON.stringify(body))
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
