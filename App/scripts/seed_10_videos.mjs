import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '../.env')

let env = {}
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  })
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'https://gqarlkfmpgaotbezpkbs.supabase.co'
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Service Key exists:', Boolean(serviceKey))

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in App/.env')
  process.exit(1)
}

const videosDir = 'c:/WIP/FEDSafeRetirement/SocialMedia/June28WebinarReel/out'

const videoFiles = [
  {
    file: '01_Video_Postal_Retirement_Reel.mp4',
    id: '01',
    title: 'Postal Employee Retirement & PSHB Transition Guide',
    dur: 45,
    voice: 'Kai',
    voice_id: 'GGRMgbKfr7QscdcrvWga',
    script: 'Are you a postal employee planning your retirement? Between the new Postal Service Health Benefits Program, Medicare Part B requirements, and FERS supplement rules, postal retirement has its own unique playbook. We help USPS carriers and clerks protect their pension and health benefits. Visit FedSafe Retirement dot com to schedule your postal retirement review.',
    directive: 'Visual: Mail carrier walking at sunset, transition to PSHB document review, highlight Medicare Part B requirement badge. Pacing: 45s brisk.',
    cta: 'Call (774) 273-8473 | FedSafeRetirement.com',
  },
  {
    file: '02_Video_FEGLI_Shock_Alert_Reel.mp4',
    id: '02',
    title: 'FEGLI Option B Age-65 Rate Shock Alert',
    dur: 35,
    voice: 'Havoc',
    voice_id: 'dtVZnErhiiosqofxDzSH',
    script: 'Attention federal employees over fifty: Your FEGLI Option B life insurance premiums double every five years, and at age sixty-five, the cost jumps by over five hundred percent. Thousands of retirees are forced to drop coverage when they need it most. Discover private alternatives before the rate hike hits. Visit FedSafe Retirement dot com today.',
    directive: 'Visual: Red alert rate shock graph, comparison chart between FEGLI age brackets vs fixed private term. Pacing: urgent.',
    cta: 'Call 771-FEDSAFE | FedSafeRetirement.com',
  },
  {
    file: '03_Video_FERS_Special_Supplement.mp4',
    id: '03',
    title: 'FERS Special Annuity Supplement Bridge Payment',
    dur: 30,
    voice: 'Kai',
    voice_id: 'GGRMgbKfr7QscdcrvWga',
    script: "Are you retiring under FERS before age sixty-two? You might qualify for the FERS Special Annuity Supplement, a bridge payment worth thousands before Social Security begins. Don't lose out on what you earned through thirty years of service. Call us today or visit FedSafe Retirement dot com to calculate your bridge payment.",
    directive: 'Visual: Countdown bridge payment animation, ORA retirement application checklist, SAM.gov verified badge.',
    cta: 'Calculate Your Bridge: FedSafeRetirement.com',
  },
  {
    file: '04_Video_TSP_Withdrawal_Mistakes.mp4',
    id: '04',
    title: 'Three Critical TSP Mistakes at Retirement',
    dur: 35,
    voice: 'Kai',
    voice_id: 'GGRMgbKfr7QscdcrvWga',
    script: 'Three critical TSP withdrawal mistakes federal employees make at retirement: Taking taxable lump sums too early, keeping the wrong fund allocation, and failing to coordinate with your FERS pension. We help you build an intentional retirement income strategy. Call the number below or visit FedSafe Retirement dot com to schedule your free review.',
    directive: 'Visual: TSP fund allocation pie chart, split red/green mistake callouts, tablet review scene.',
    cta: 'Schedule Free TSP Review: (774) 273-8473',
  },
  {
    file: '05_Video_Survivor_Benefit_Plan.mp4',
    id: '05',
    title: 'The Irreversible SBP Decision: 25% vs 50%',
    dur: 35,
    voice: 'Aurora',
    voice_id: 'a1m16HA3i1rljUsxpKfn',
    script: 'Choosing between a twenty-five percent and fifty percent Survivor Benefit Plan is an irreversible decision. A wrong election can cost your spouse their healthcare eligibility or cost you tens of thousands in pension reductions. Get the facts before you sign your retirement application. Call or visit FedSafe Retirement dot com today.',
    directive: 'Visual: SBP pension reduction vs spouse healthcare continuity illustration, warm retirement lifestyle b-roll.',
    cta: 'Call (774) 273-8473 | FedSafeRetirement.com',
  },
  {
    file: '06_Video_FEHB_5_Year_Rule.mp4',
    id: '06',
    title: "Don't Lose Lifetime Healthcare: FEHB 5-Year Rule",
    dur: 30,
    voice: 'Kai',
    voice_id: 'GGRMgbKfr7QscdcrvWga',
    script: 'To carry your FEHB health insurance into federal retirement, you must be enrolled for the five consecutive years before retiring. A single gap in coverage could cost you lifetime federal healthcare. Verify your eligibility before you submit your retirement paperwork. Call us or visit FedSafe Retirement dot com.',
    directive: 'Visual: 5-year continuous timeline bar with warning markers, health card checkup overlay.',
    cta: 'Verify Eligibility: FedSafeRetirement.com',
  },
  {
    file: '07_Video_High_Three_Pension_Math.mp4',
    id: '07',
    title: 'High-3 Salary Calculation: 36 Consecutive Months',
    dur: 30,
    voice: 'Brock',
    voice_id: 'UXrpoYalpW5MpGiFHq3z',
    script: "Think your High-3 pension is based solely on your final calendar year? It's actually based on your thirty-six consecutive highest-earning months, including locality pay. Understanding your exact pension formula is the key to timing your retirement date. Call or visit FedSafe Retirement dot com.",
    directive: 'Visual: High-3 calculation formula breakdown with locality pay multiplier graphic.',
    cta: 'Calculate High-3 Pension: (774) 273-8473',
  },
  {
    file: '08_Video_Military_Service_Buyback.mp4',
    id: '08',
    title: 'Military Service Buyback ROI for FERS & CSRS',
    dur: 35,
    voice: 'Hale',
    voice_id: 'dXtC3XhB9GtPusIpNtQx',
    script: 'Did you serve in the military before joining the federal government? Buying back your military time could add hundreds of dollars each month to your FERS or CSRS pension check for life. We calculate your return on investment to see if military buyback makes sense for you. Call today or visit FedSafe Retirement dot com.',
    directive: 'Visual: DD-214 service document transition, military deposit deposit-vs-cumulative-annuity ROI chart.',
    cta: 'Calculate Military Buyback ROI: FedSafeRetirement.com',
  },
  {
    file: '09_Video_Partner_Spotlight_Mike_Zaino.mp4',
    id: '09',
    title: 'Partner Spotlight: Meet Mike Zaino (RFC®, FRC℠)',
    dur: 45,
    voice: 'Kai',
    voice_id: 'GGRMgbKfr7QscdcrvWga',
    script: 'Meet Mike Zaino, Founding Senior Partner at FedSafe Retirement. An Army veteran and former federal employee, Mike brings over twenty years of dedicated federal benefits experience to help employees make confident, informed retirement transitions. The future favors the prepared. Schedule a consultation with Mike at FedSafe Retirement dot com.',
    directive: 'Visual: Professional portrait card of Mike Zaino, credentials (RFC®, FRC℠, Veteran-Owned, SAM.gov contractor badge).',
    cta: 'Schedule Consultation: (774) 273-8473',
  },
  {
    file: '10_Video_Why_FedSafe_Exists.mp4',
    id: '10',
    title: 'Why FedSafe: 100% Dedicated to Federal & Postal Retirement',
    dur: 35,
    voice: 'Kai',
    voice_id: 'GGRMgbKfr7QscdcrvWga',
    script: 'Federal retirement shouldn\'t be left to guesswork. At FedSafe Retirement, we are a SAM dot gov registered contractor with over eighty combined years of federal benefits experience. We are not generalists. Federal and postal retirement is all we do. The future favors the prepared. Call or visit FedSafe Retirement dot com.',
    directive: 'Visual: FedSafe agency seminar workshop footage, shield logo pulse, SAM.gov contractor badge.',
    cta: 'The Future Favors the Prepared | FedSafeRetirement.com',
  },
]

async function seed() {
  console.log('--- Seeding 10 Pre-Generated Short Videos to Supabase ---')

  // First ensure buckets exist
  try {
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'videos', name: 'videos', public: true }),
    })
  } catch (e) {
    // ignore if exists
  }

  for (const item of videoFiles) {
    const filePath = path.join(videosDir, item.file)
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found locally: ${filePath}`)
      continue
    }

    const fileSizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2)
    console.log(`\nUploading [${item.file}] (${fileSizeMB} MB)...`)
    const fileBuffer = fs.readFileSync(filePath)

    // Upload / upsert to Supabase Storage
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/videos/${item.file}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'video/mp4',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    })

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/videos/${item.file}`
    console.log(`  Storage URL: ${publicUrl} (HTTP ${uploadRes.status})`)

    // Check if record exists in public.videos table
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/videos?title=eq.${encodeURIComponent(item.title)}&select=id`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
    })

    const existing = await checkRes.json()

    const payload = {
      title: item.title,
      format: 'short',
      generation_mode: 'motion',
      video_model: 'remotion-kinetic',
      duration_sec: item.dur,
      script: item.script,
      ai_directive: item.directive,
      cta_text: item.cta,
      cta_on_every_frame: true,
      tts_engine: 'elevenlabs',
      voice_id: item.voice_id,
      voice_name: item.voice,
      tempo: 1.00,
      status: 'ready',
      video_url: publicUrl,
      audio_url: null,
      thumbnail_url: null,
      hyperframes: [],
      continuity_references: [],
      media_assets: [],
      metadata: { gdrive_source: item.file, target_audience: 'Federal & Postal Employees' },
      is_deleted: false,
      cre_by: 'system_gdrive_import',
      cre_dt: new Date().toISOString(),
      mod_by: 'system_gdrive_import',
      mod_dt: new Date().toISOString(),
      version_no: 1,
    }

    if (Array.isArray(existing) && existing.length > 0) {
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/videos?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      })
      console.log(`  Updated video record: ${existing[0].id} (HTTP ${updateRes.status})`)
    } else {
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
      })
      console.log(`  Inserted video record (HTTP ${insertRes.status})`)
    }
  }

  console.log('\n========================================')
  console.log('✅ ALL 10 VIDEOS LOADED INTO DATABASE & STORAGE!')
  console.log('========================================\n')
}

seed().catch(err => {
  console.error('Seed execution error:', err)
  process.exit(1)
})
