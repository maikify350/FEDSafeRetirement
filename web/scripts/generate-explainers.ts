#!/usr/bin/env bun
/**
 * generate-explainers.ts
 *
 * Generates MP3 audio explainers for all main JobMaster web views
 * using Eleven Labs TTS, then uploads them to Supabase storage
 * bucket "Explainers" in the JobMaster_Corp project.
 *
 * Usage (PowerShell):
 *   bun run scripts/generate-explainers.ts
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────
const ELEVEN_LABS_KEY   = 'sk_66a39688c0237afe3fe4535be0a3c24dcf6be2cfcbcb4de8'
const CORP_URL          = 'https://otsodapoddxqtfbeovcl.supabase.co'
const CORP_PROJECT_REF  = 'otsodapoddxqtfbeovcl'
const MGMT_TOKEN        = 'sbp_4fedaa7f49c22526450e6eb5f2f6a15fad922b78'
const ANON_KEY          = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90c29kYXBvZGR4cXRmYmVvdmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDY0NTAsImV4cCI6MjA4NTk4MjQ1MH0.YSSHYFlBifVnYfyL7TtjZRhTvL2Qy8FjGVyJKgffaBw'
const BUCKET            = 'Explainers'

// ─── Voice config ─────────────────────────────────────────────────────────────
// Rachel – warm, clear, professional
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const MODEL_ID = 'eleven_turbo_v2_5'

// ─── Explainer scripts ────────────────────────────────────────────────────────
const EXPLAINERS = [
  {
    file: 'DashboardView.mp3',
    text: `Welcome to the JobMaster Dashboard. This is your command center for field service operations. At a glance you can see key metrics: total clients, open requests, active jobs, and outstanding invoices. The Quick Add buttons at the top let you instantly create a new client, request, quote, job, or invoice. The activity feed shows the latest updates across your business in real time.`,
  },
  {
    file: 'CalendarView.mp3',
    text: `This is the Calendar view. It shows all your scheduled jobs across Month, Week, and Day views. Switch views using the buttons in the top right of the calendar toolbar. Each job appears as a color-coded bar: blue for scheduled, purple for in progress, amber for on hold, green for completed, and gray for cancelled. Use the Status and Priority filter pills above the calendar to narrow down which jobs are displayed. Use the month and year dropdowns to jump quickly to any time period.`,
  },
  {
    file: 'ClientList.mp3',

    text: `Welcome to the Clients list. All JobMaster list screens share the same powerful grid. Use the search bar to instantly filter by any visible field — name, company, email, or phone. Click any column header to sort; click again to reverse. Each column header has a filter icon for advanced conditions: contains, equals, starts with, date ranges, and more. Combine conditions with AND or OR logic for precise results. Use the Columns button in the toolbar to show or hide any field, and drag column headers to reorder them. Toggle between a table view and a card view with the layout switcher. At the bottom, set how many rows show per page. All of your layout choices — view mode, visible columns, column order, and page size — are saved automatically and will be there the next time you open this screen. Click Export to download the current filtered and sorted list as a CSV file. On this screen the key fields are client name, company, contact email, phone, billing address, customer type, and account status.`,
  },
  {
    file: 'RequestList.mp3',
    text: `Welcome to the Requests list. Like all JobMaster list screens, this grid gives you full control over how you view your data. Use the search bar to filter by title, client name, status, or assigned technician. Click any column header to sort; use the column filter for advanced AND or OR conditions. The Columns button lets you show or hide fields, and you can drag columns to reorder them. Toggle between table and card layout using the view switcher. Your layout preferences — view mode, columns, order, and page size — persist across sessions so the grid is always set up the way you like it. The pagination controls at the bottom set how many rows appear per page, and Export saves the current view as a CSV. Key fields on this screen include request title, linked client, status, priority, assessment date, and assigned technician.`,
  },
  {
    file: 'QuoteList.mp3',
    text: `Welcome to the Quotes list. This screen uses the same shared grid as all JobMaster list views. Search by quote number, client, title, or status. Sort and filter any column — filter by status such as draft, sent, accepted, declined, or expired; or filter by total amount and date range. The Columns button lets you toggle visibility for fields like expiry date, payment terms, or tax code. Drag columns to reorder, and switch between table and card layout at any time. Your view preferences are saved automatically and persist between sessions. Set your preferred rows per page at the bottom. Export downloads the filtered and sorted list as a CSV. The summary row at the bottom of the table shows aggregate totals for the visible set.`,
  },
  {
    file: 'JobList.mp3',
    text: `Welcome to the Jobs list. This is the central operations grid, and like all JobMaster lists it has a fully consistent set of tools. Use the search bar to find jobs by number, title, client, or assigned technician. Sort by any column — scheduled date and status are especially useful for planning your day. Column filters let you narrow by status: Scheduled, In Progress, On Hold, Completed, or Cancelled; and by priority: Low, Normal, High, or Urgent. Toggle between table and card view, and use the Columns button to show or hide fields like needed-by date, completed date, or tax code. Your layout choices persist across sessions so you never have to reset your preferences. Adjust rows per page at the bottom and use Export to download a CSV of the current view.`,
  },
  {
    file: 'InvoiceList.mp3',
    text: `Welcome to the Invoices list. Like all JobMaster list screens, this grid lets you slice and search your data however you need. Use the search bar to find invoices by number, client, or title. Sort by amount, status, issue date, or due date. Column filters let you isolate overdue invoices, filter by payment status — draft, sent, paid, partial, or overdue — or show only invoices above a certain amount. The Columns button controls which fields are visible. Toggle between table and card view; your preference is saved for next time. The summary row at the bottom shows totals for the current filtered view. Export downloads the filtered list as a CSV, great for sharing with your bookkeeper or accountant.`,
  },
  {
    file: 'VendorList.mp3',
    text: `Welcome to the Vendors list. All JobMaster list screens share the same grid engine. Search by company name, contact person, email, or phone. Sort by any column and use column filters to isolate active vendors, show only 1099 contractors, or narrow by state or payment terms. The Columns button lets you toggle fields like website, notes, or tax status. Drag columns to reorder, and switch between table and card view. All layout preferences persist across sessions. Set your preferred page size at the bottom and use Export to download a CSV. Key fields on this screen are company name, primary contact, phone, email, payment terms, 1099 status, and active status.`,
  },
  {
    file: 'PurchaseOrderList.mp3',
    text: `Welcome to the Purchase Orders list. This screen shares the same powerful grid as all JobMaster list views. Search by P O number, vendor name, or title. Sort by expected delivery date, status, or total amount. Use column filters to show only draft orders, filter by vendor, or narrow by date range. Toggle between table and card view and use the Columns button to show or hide fields like tracking number, freight amount, issue person, or vendor reference number. Your layout choices persist across sessions. Set rows per page at the bottom and click Export to download a CSV of the current view. Statuses include Draft, Issued, Partial Received, Received Complete, and Cancelled.`,
  },
  // ── Edit Panels ───────────────────────────────────────────────────────────────
  {
    file: 'GalleryView.mp3',
    text: `This is the Gallery view. It displays all photos and documents associated with your jobs, clients, and sites in a visual grid. Use the filter controls to narrow down by entity type or date range. Click any image to open the full preview with details about which job or client it belongs to. You can upload new photos directly from this view or from within any job or client record.`,
  },
  {
    file: 'ClientEdit.mp3',
    text: `You have opened the Client edit panel. The form is organized into sections. The Basic Info section covers name prefix and suffix, first and last name, company name, and a toggle to use the company name as the display name instead of the personal name. You can set the customer type, their role, and the lead source that brought them in. The Contact section has their web address, phone, and email. The Billing section sets their payment terms, credit status, and default tax code. The Address section captures their full billing address. Finally, there are two notes fields: one for general notes visible to your team, and one for internal-only notes. Hit Save when done or Cancel to discard changes.`,
  },
  {
    file: 'RequestEdit.mp3',
    text: `You have opened the Service Request edit panel. At the top you will find the request title and a free-text description of the work needed. Below that, link the request to an existing client using the Client dropdown. In the Status and Assignment section, choose the current status from your configured status list, set an assessment or site-visit date, and assign a technician from the Assigned To dropdown. The Property Location section lets you record the service address: property name, street, city, state, and zip code — which may differ from the client's billing address. At the bottom, add internal notes for your team and a customer-facing message. Save your changes or Cancel to exit.`,
  },
  {
    file: 'QuoteEdit.mp3',
    text: `You have opened the Quote edit panel. Start with the quote title and a description of the work being estimated. Set the status — Draft keeps it internal, Sent marks it as delivered to the client, and Accepted or Declined close the loop. Link the quote to a client using the Client dropdown. In the Dates section, set the issue date and the expiry date so clients know how long the estimate is valid. Under Financial, assign a tax code to apply the correct tax rate and set payment terms. The notes field is for any additional terms or comments you want included. Once the client accepts, you can convert this quote directly into a job. Save or Cancel when done.`,
  },
  {
    file: 'JobEdit.mp3',
    text: `You have opened the Job edit panel. The Job Details section has the title, a full description of the work, the current status — Scheduled, In Progress, On Hold, or Completed — and the priority level from Low to Urgent. In the Client and Assignment section, link the job to a client and assign a technician from the dropdown. The Dates section has three date fields: Scheduled Date for when the work is planned, Needed By for the client's deadline, and Completed At which is filled in when the job is done. Under Financial, assign a tax code. The Notes section has two fields: one for notes visible to your techs in the field, and one for internal administration notes. Hit Save to commit your changes.`,
  },
  {
    file: 'InvoiceEdit.mp3',
    text: `You have opened the Invoice edit panel. Set the invoice title and a brief description. The Status field tracks the billing lifecycle: Draft while you are building it, Sent once delivered to the client, Paid when settled in full, Partial if only part has been received, or Overdue if the due date has passed. Link the invoice to a client, then set the issue date and due date. When payment arrives, set the Paid At date and enter the Amount Paid — the system tracks the outstanding balance automatically. Under Financial, assign a tax code and payment terms. The notes field is for any billing notes or terms you want the client to see. Save your changes or Cancel to exit.`,
  },
  {
    file: 'VendorEdit.mp3',
    text: `You have opened the Vendor edit panel. The Company section captures the vendor's company name, primary contact name, and website URL. The Contact section holds their phone number and email address. The Address section records their street, city, state, and zip code for billing and correspondence. Under Settings, set the payment terms you have agreed on with this vendor. There are two checkboxes: Inactive marks the vendor as no longer in use without deleting their record, and the 1099 checkbox flags them as an independent contractor for tax reporting. The Notes field is for any internal information about this vendor. All linked purchase orders for this vendor can be viewed from their record as well. Save or Cancel when finished.`,
  },
  {
    file: 'POEdit.mp3',
    text: `You have opened the Purchase Order edit panel. Give the P O a title and set its status: Draft while you are preparing it, Issued once sent to the vendor, Partial Received when some items have arrived, Received Complete when everything is in, or Cancelled if the order is no longer needed. Link the P O to a vendor using the Vendor dropdown. In the Dates section, set the issue date, an internal due date, and the expected delivery date the vendor has committed to. The Details section has fields for the person who issued the order, the vendor's own reference number for cross-referencing their system, and a tracking number for shipments. You can also record any freight or shipping charges. The Notes field is for internal comments. Save your changes or Cancel to exit.`,
  },
  {
    file: 'TeamList.mp3',
    text: `Welcome to the Teams list. Like all JobMaster list screens, this grid shares the same powerful set of tools. Use the search bar to instantly find team members by name, email, or phone. Click any column header to sort; click again to reverse. Use column filters to narrow by role or status — for example, show only active technicians or only administrators. The Columns button lets you show or hide any field, and you can drag column headers into your preferred order. Toggle between a table view and a card view using the layout switcher in the toolbar. All of your layout choices — view mode, visible columns, column order, and page size — are saved automatically and will be there the next time you open this screen. The key fields on this screen are name, email, phone, role, and status.`,
  },
  {
    file: 'TeamEdit.mp3',
    text: `You have opened the Team Member edit panel. At the top, enter the member's first and last name. Use the Role dropdown to assign their function — for example Technician, Dispatcher, or Administrator. The Status field lets you mark them as Active, Inactive, or On Leave. In the Contact section, enter their email address and phone number. Under Portal Access, the Can Log In dropdown controls whether this person receives an invitation to sign in to the JobMaster web or mobile portal. The Notes field is for general information your team can see, and the Internal Notes field is for private administrative comments not visible to the team member. Save your changes or Cancel to exit.`,
  },
  {
    file: 'SolutionList.mp3',
    text: `Welcome to the Solutions list. Solutions are your knowledge base — a searchable library of common questions and answers that your team can reference or share with customers. Like all JobMaster list screens, this grid shares the same powerful set of tools. Use the search bar to instantly find solutions by topic or answer text. Click any column header to sort; click again to reverse. Use column filters to narrow by visibility — for example, show only items currently visible to customers, or show hidden draft entries. The Columns button lets you show or hide any field, and you can drag column headers into your preferred order. All of your layout choices — visible columns, column order, and page size — are saved automatically and will be there the next time you open this screen. Double-click any row to open the edit panel. Click New Solution to add a fresh entry to the knowledge base.`,
  },
  {
    file: 'SolutionEdit.mp3',
    text: `You have opened the Solution edit panel. A solution is a topic-and-answer pair in your knowledge base. In the Content section, enter the Topic — this is the question or subject heading — and then write the full Answer or explanation in the text area below. The Visibility section has a single toggle: Hide from users. When switched on, this solution is marked Hidden and will only be visible to administrators. Hidden solutions are useful for drafting entries before they are ready to share, or for internal reference answers that should not appear in the customer-facing knowledge base. If this solution already has comments from team members, they will appear in a read-only Comments section at the bottom of the panel. Click Save to publish your changes or Cancel to exit without saving.`,
  },
]

// ─── Eleven Labs TTS ──────────────────────────────────────────────────────────
async function generateAudio(text: string): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   ELEVEN_LABS_KEY,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
    }),
  })
  if (!res.ok) throw new Error(`Eleven Labs ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

// ─── Supabase Management API — create bucket ──────────────────────────────────
async function ensureBucket() {
  // Check via management API
  const checkRes = await fetch(`https://api.supabase.com/v1/projects/${CORP_PROJECT_REF}/storage/buckets`, {
    headers: { Authorization: `Bearer ${MGMT_TOKEN}` },
  })
  if (checkRes.ok) {
    const buckets = await checkRes.json() as { name: string }[]
    if (buckets.some(b => b.name === BUCKET)) {
      console.log(`✓ Bucket "${BUCKET}" already exists`)
      return
    }
  }

  // Try creating via management API
  const create = await fetch(`https://api.supabase.com/v1/projects/${CORP_PROJECT_REF}/storage/buckets`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${MGMT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })

  if (create.ok) {
    console.log(`✓ Created bucket "${BUCKET}" (public)`)
    return
  }

  // Fallback: try storage API directly with anon key
  const fallback = await fetch(`${CORP_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${ANON_KEY}`,
      apikey:         ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  if (!fallback.ok) {
    const errText = await fallback.text()
    // Bucket may already exist — treat 409 as OK
    if (errText.includes('already exists') || fallback.status === 409) {
      console.log(`✓ Bucket "${BUCKET}" already exists`)
      return
    }
    throw new Error(`Bucket creation failed: ${errText}`)
  }
  console.log(`✓ Created bucket "${BUCKET}" via storage API`)
}

// ─── Get service_role key via Management API ─────────────────────────────────
async function getServiceRoleKey(): Promise<string> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${CORP_PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${MGMT_TOKEN}` },
  })
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`)
  const keys = await res.json() as { name: string; api_key: string }[]
  const svc = keys.find(k => k.name === 'service_role')
  if (!svc) throw new Error('service_role key not found in Management API response')
  console.log('✓ Fetched service_role key')
  return svc.api_key
}

// ─── Supabase storage upload ──────────────────────────────────────────────────
async function upload(file: string, data: Buffer, serviceKey: string) {
  const res = await fetch(`${CORP_URL}/storage/v1/object/${BUCKET}/${file}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${serviceKey}`,
      apikey:         serviceKey,
      'Content-Type': 'audio/mpeg',
      'x-upsert':     'true',
    },
    body: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upload failed for ${file} (${res.status}): ${err}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const OUT_DIR = path.join(__dirname, 'explainer-audio')

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  console.log('\n🔑  Fetching service_role key...')
  const serviceKey = await getServiceRoleKey()

  console.log('\n🎙  Checking Supabase bucket...')
  await ensureBucket()

  for (const { file, text } of EXPLAINERS) {
    const localPath = path.join(OUT_DIR, file)

    if (!existsSync(localPath)) {
      console.log(`\n🔊  Generating ${file}...`)
      const audio = await generateAudio(text)
      writeFileSync(localPath, audio)
      console.log(`    Saved → ${localPath}`)
    } else {
      console.log(`\n⏭  ${file} — using cached local file`)
    }

    console.log(`    Uploading to Supabase...`)
    await upload(file, readFileSync(localPath), serviceKey)
    console.log(`✅  ${file} → ${CORP_URL}/storage/v1/object/public/${BUCKET}/${file}`)
  }

  console.log('\n🎉  All 20 explainers ready!')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
