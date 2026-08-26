import type { VideoRecord } from '@/views/videos/VideoEditDialog'

// ============================================================
// EXPERIMENTAL: Original dev/test videos (pre-Script Library V2)
// Tagged video_source: 'experimental' — hidden by default in grid
// ============================================================
export const EXPERIMENTAL_VIDEOS: VideoRecord[] = [
  {
    id: 'vid-01-postal-retirement',
    title: 'Postal Employee Retirement & PSHB Transition Guide',
    format: 'short', generation_mode: 'motion', video_model: 'remotion-kinetic', duration_sec: 45,
    script: 'Are you a postal employee planning your retirement? Between the new Postal Service Health Benefits Program, Medicare Part B requirements, and FERS supplement rules, postal retirement has its own unique playbook. We help USPS carriers and clerks protect their pension and health benefits. Visit FedSafe Retirement dot com to schedule your postal retirement review.',
    ai_directive: 'Visual: Mail carrier walking at sunset, transition to PSHB document review, highlight Medicare Part B requirement badge. Pacing: 45s brisk.',
    cta_text: 'Call (774) 273-8473 | FedSafeRetirement.com', cta_on_every_frame: true,
    tts_engine: 'elevenlabs', voice_id: 'GGRMgbKfr7QscdcrvWga', voice_name: 'Kai', tempo: 1.00,
    status: 'ready',
    video_url: 'https://gqarlkfmpgaotbezpkbs.supabase.co/storage/v1/object/public/videos/01_Video_Postal_Retirement_Reel.mp4',
    audio_url: null, thumbnail_url: null,
    hyperframes: [
      { id: 'hf-01-1', order: 1, timestamp_start: 0, timestamp_end: 11.2, text_segment: 'Are you a postal employee planning your retirement?', visual_prompt: 'USPS postal carrier delivering mail at golden hour', transition: 'fade', camera_motion: 'push_forward' },
      { id: 'hf-01-2', order: 2, timestamp_start: 11.2, timestamp_end: 24.5, text_segment: 'Between the new Postal Service Health Benefits Program...', visual_prompt: 'PSHB plan comparison document with checkmarks', transition: 'slide_left', camera_motion: 'pan_slow_right' },
      { id: 'hf-01-3', order: 3, timestamp_start: 24.5, timestamp_end: 35.0, text_segment: 'We help USPS carriers and clerks protect their pension and health benefits.', visual_prompt: 'FedSafe advisor consulting with postal couple', transition: 'zoom_in', camera_motion: 'static' },
      { id: 'hf-01-4', order: 4, timestamp_start: 35.0, timestamp_end: 45.0, text_segment: 'Visit FedSafe Retirement dot com to schedule your postal retirement review.', visual_prompt: 'FedSafe shield logo and SAM.gov verified badge', transition: 'dissolve', camera_motion: 'orbit' },
    ],
    continuity_references: [], media_assets: [],
    metadata: { gdrive_file: '01_Video_Postal_Retirement_Reel.mp4', audience: 'USPS Carriers, Clerks, Handlers' },
    video_source: 'experimental', is_deleted: false,
    cre_dt: '2026-06-28T10:00:00Z', cre_by: 'Mike Zaino', mod_dt: '2026-06-28T10:00:00Z', mod_by: 'Mike Zaino', version_no: 1,
  },
  {
    id: 'vid-02-fegli-shock',
    title: 'FEGLI Option B Age-65 Rate Shock Alert',
    format: 'short', generation_mode: 'motion', video_model: 'remotion-kinetic', duration_sec: 35,
    script: 'Attention federal employees over fifty: Your FEGLI Option B life insurance premiums double every five years, and at age sixty-five, the cost jumps by over five hundred percent. Thousands of retirees are forced to drop coverage when they need it most. Discover private alternatives before the rate hike hits. Visit FedSafe Retirement dot com today.',
    ai_directive: 'Visual: Red alert rate shock graph, comparison chart between FEGLI age brackets vs fixed private term. Pacing: urgent.',
    cta_text: 'Call 771-FEDSAFE | FedSafeRetirement.com', cta_on_every_frame: true,
    tts_engine: 'elevenlabs', voice_id: 'JSWO6cw2AyFE324d5kEr', voice_name: 'Carolyn', tempo: 1.00,
    status: 'ready',
    video_url: 'https://gqarlkfmpgaotbezpkbs.supabase.co/storage/v1/object/public/videos/02_Video_FEGLI_Shock_Alert_Reel.mp4',
    audio_url: null, thumbnail_url: null, hyperframes: [], continuity_references: [], media_assets: [],
    metadata: { gdrive_file: '02_Video_FEGLI_Shock_Alert_Reel.mp4', audience: 'Federal & Postal Employees 60+' },
    video_source: 'experimental', is_deleted: false,
    cre_dt: '2026-06-28T10:05:00Z', cre_by: 'Mike Zaino', mod_dt: '2026-06-28T10:05:00Z', mod_by: 'Mike Zaino', version_no: 1,
  },
  {
    id: 'vid-exp-fers-supplement',
    title: '[EXP] FERS Special Annuity Supplement Bridge Payment',
    format: 'short', generation_mode: 'motion', video_model: 'remotion-kinetic', duration_sec: 30,
    script: 'Are you retiring under FERS before age sixty-two? You might qualify for the FERS Special Annuity Supplement, a bridge payment worth thousands before Social Security begins.',
    ai_directive: '', cta_text: 'Call (774) 273-8473 | FedSafeRetirement.com', cta_on_every_frame: false,
    tts_engine: 'elevenlabs', voice_id: 'GGRMgbKfr7QscdcrvWga', voice_name: 'Kai', tempo: 1.00,
    status: 'draft', video_url: null, audio_url: null, thumbnail_url: null,
    hyperframes: [], continuity_references: [], media_assets: [], metadata: {},
    video_source: 'experimental', is_deleted: false,
    cre_dt: '2026-06-28T10:10:00Z', cre_by: 'System', mod_dt: '2026-06-28T10:10:00Z', mod_by: 'System', version_no: 1,
  },
]

// ============================================================
// Helper — builds a standard VideoRecord for a Library V2 script
// ============================================================
const BATCH_NAMES: Record<number, string> = {
  1: 'Core Traps & High-Engagement Topics',
  2: 'ORA / Online Retirement Application',
  3: 'FERS Pension, Eligibility & Retirement Dates',
  4: 'FEGLI, Survivor Benefits, FEHB & Medicare',
  5: 'TSP, Social Security, SRS & Income Timing',
  6: 'Rule Changes, Benefits Transition & Agency/HR',
}

// Voice rotation by batch using approved voices
const BATCH_VOICES: Record<number, { id: string; name: string }> = {
  1: { id: 'GGRMgbKfr7QscdcrvWga', name: 'Kai' },      // Dynamic, clear male — Core Traps
  2: { id: 'UXrpoYalpW5MpGiFHq3z', name: 'Brock' },    // Confident, authoritative male — ORA Process
  3: { id: 'Gfpl8Yo74Is0W6cPUWWT', name: 'Max' },      // Deep, trusted male — FERS/Pension
  4: { id: 'JSWO6cw2AyFE324d5kEr', name: 'Carolyn' },  // Reassuring, polished female — Insurance/Health
  5: { id: 'dtVZnErhiiosqofxDzSH', name: 'Havoc' },    // Strong, commanding male — TSP/Income
  6: { id: 'dXtC3XhB9GtPusIpNtQx', name: 'Hale' },     // Articulate, professional male — Agency/HR/Rules
}

type ScriptInput = {
  no: number
  batch: number
  title: string
  lenMin: number
  lenMax: number
  script: string
  spokenCta: string
  onscreen: string
  endScreen: string
  broll: string
  leadCapture: string
  ctaType: 'direct_review' | 'lead_magnet' | 'website_traffic' | 'agency'
  ctaText?: string
  platforms?: string[]
}

function makeLibraryVideo(s: ScriptInput): VideoRecord {
  const voice = BATCH_VOICES[s.batch]
  const dur = Math.round((s.lenMin + s.lenMax) / 2)

  return {
    id: `lib-v2-${String(s.no).padStart(2, '0')}`,
    title: s.title,
    format: 'short',
    generation_mode: 'static',
    video_model: 'remotion-kinetic',
    duration_sec: dur,
    script: s.script,
    ai_directive: '',
    broll_notes: s.broll,
    cta_text: s.ctaText ?? 'Call (774) 273-8473 | FedSafeRetirement.com',
    cta_on_every_frame: false,
    tts_engine: 'elevenlabs',
    voice_id: voice.id,
    voice_name: voice.name,
    tempo: 1.00,
    status: 'draft',
    video_url: null,
    audio_url: null,
    thumbnail_url: null,
    hyperframes: [],
    continuity_references: [],
    media_assets: [],
    metadata: {},
    // Script Library V2 fields
    script_no: s.no,
    batch_no: s.batch,
    batch_name: BATCH_NAMES[s.batch],
    target_length_min: s.lenMin,
    target_length_max: s.lenMax,
    spoken_cta: s.spokenCta,
    onscreen_structure: s.onscreen,
    end_screen_text: s.endScreen,
    lead_capture_destination: s.leadCapture,
    cta_type: s.ctaType,
    platforms: s.platforms ?? ['facebook', 'instagram', 'tiktok', 'youtube_shorts'],
    video_source: 'library_v2',
    is_deleted: false,
    cre_dt: '2026-08-26T00:00:00Z',
    cre_by: 'Mike Zaino',
    mod_dt: '2026-08-26T00:00:00Z',
    mod_by: 'Mike Zaino',
    version_no: 1,
  }
}

// ============================================================
// LIBRARY V2: Mike Zaino's 60 Priority Scripts
// Source: FedSafe Social Media Script Library V2 + Rollout Plan
// ============================================================
export const LIBRARY_V2_VIDEOS: VideoRecord[] = [

  // ── BATCH 1: Core Traps & High-Engagement Topics ──────────
  makeLibraryVideo({
    no: 1, batch: 1,
    title: 'Eligibility Is Not Affordability',
    lenMin: 30, lenMax: 40,
    script: "Just because you're eligible to retire from federal service doesn't automatically mean you're ready to retire. Eligibility answers one question: Can you retire? Affordability answers a very different question: What will retirement actually look like after taxes, deductions, health insurance, survivor benefits, TSP decisions, and income timing? Those are not the same thing. Before you pick a retirement date, make sure you understand your numbers, not just your eligibility.",
    spokenCta: 'Before you choose a retirement date, schedule a federal retirement readiness review.',
    onscreen: 'Opening: Eligible does not always mean ready. | Middle: Pension | TSP | FEHB | FEGLI | Survivor Benefits | Taxes | Final CTA: Know your numbers before you choose your date.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal & Postal Retirement Education',
    broll: 'Calendar date circled, employee reviewing a benefits packet, couple looking at a retirement worksheet, simple gross-to-net graphic.',
    leadCapture: 'Retirement Readiness Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 2, batch: 1,
    title: 'The Pension Estimate Trap',
    lenMin: 30, lenMax: 40,
    script: "A federal pension estimate is helpful, but it's not the full retirement picture. Your FERS annuity estimate may not show the full impact of survivor benefits, health insurance deductions, taxes, life insurance, Social Security timing, or how your TSP will be used. A lot of employees focus on the gross number, then get surprised by the net number. And that net number is what you'll actually have to live on. Before you retire, make sure you understand what you're likely to keep, not just what you're projected to receive.",
    spokenCta: 'Before you rely on a pension estimate, make sure you understand what your retirement income may actually look like.',
    onscreen: 'Opening: Gross pension is not the full picture. | Middle: Deductions change the number. | Final CTA: Request a FERS pension review.',
    endScreen: 'Know Your Pension Numbers | FedSafe Retirement | Registered Federal Contractor',
    broll: 'Pension estimate, calculator, gross-vs-net side-by-side, employee reviewing a retirement income worksheet.',
    leadCapture: 'FERS Pension Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 3, batch: 1,
    title: 'FEGLI Can Change Fast',
    lenMin: 25, lenMax: 35,
    script: "FEGLI can look simple while you're working, but the cost structure can look very different as you get older and move toward retirement. The question isn't just, \"Do I have life insurance?\" The better question is, \"Do I understand what this coverage may cost later, and whether it still fits my situation?\" That's where many federal employees get surprised. Before you retire, review your FEGLI options, your projected costs, and whether your current coverage still makes sense.",
    spokenCta: 'Before you carry FEGLI into retirement, review what it may cost and whether it still fits your situation.',
    onscreen: 'Opening: FEGLI can change fast. | Middle: Cost later matters. | Final CTA: Request a FEGLI cost analysis.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FEGLI Cost Education',
    broll: 'Life insurance folder, age milestone graphic, premium chart animation, employee comparing coverage choices.',
    leadCapture: 'FEGLI Cost Analysis landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 4, batch: 1,
    title: 'TSP Accumulation Is Not A Retirement Strategy',
    lenMin: 35, lenMax: 45,
    script: "During your career, the TSP is mostly about accumulation: saving, contributing, and building your balance. But retirement is different. Now the questions become: How will you use it? When will you withdraw? How will it coordinate with your pension, Social Security, taxes, and required income? A contribution strategy is not the same thing as a withdrawal strategy. And a large TSP balance doesn't automatically mean you have a retirement income plan. If you're within a few years of retirement, your TSP needs to be reviewed through a retirement-income lens.",
    spokenCta: 'Before retirement, make sure your TSP strategy covers withdrawals, taxes, income timing, and the rest of your benefits.',
    onscreen: 'Opening: Saving is one phase. Withdrawing is another. | Middle: TSP | Pension | Social Security | Taxes | Final CTA: Request a TSP distribution review.',
    endScreen: 'TSP Distribution Education | FedSafe Retirement | Registered Federal Contractor',
    broll: 'TSP dashboard blurred, bucket/timeline graphics, income arrows, couple reviewing monthly income plan.',
    leadCapture: 'TSP Distribution Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 5, batch: 1,
    title: 'Survivor Benefits Are Not A Small Checkbox',
    lenMin: 30, lenMax: 40,
    script: "For married federal employees, survivor benefits are not just another form question. That election can affect your spouse's future income, access to certain benefits, and your own monthly retirement income. In many cases, this is not the kind of decision you want to rush through at the end of the retirement process. Before you make a survivor benefit election, make sure you understand the trade-offs clearly. Because this decision can matter long after the paperwork is submitted.",
    spokenCta: 'Before you make a survivor benefit election, review how it could affect your spouse, your income, and your retirement plan.',
    onscreen: 'Opening: Survivor benefits are not a small checkbox. | Middle: Spouse | Income | Health Benefits | Retirement Pay | Final CTA: Schedule a survivor benefit review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Survivor Benefit Education',
    broll: 'Married couple reviewing documents, split screen spouse/employee, election form close-up, family photo.',
    leadCapture: 'Survivor Benefit Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 6, batch: 1,
    title: 'Health Benefits Do Not Stop Being Important At Retirement',
    lenMin: 30, lenMax: 40,
    script: "One of the biggest concerns federal employees have before retirement is health insurance. Can you keep FEHB? How does Medicare fit in? What happens to premiums? What changes when you move from employee to retiree status? Those questions shouldn't be answered at the last minute. Your health benefits are not a side issue. They're a major part of retirement security. And they need to be coordinated with the rest of your retirement plan.",
    spokenCta: 'Before you retire, make sure you understand how FEHB, Medicare, and your retirement deductions may work together.',
    onscreen: 'Opening: FEHB does not stop mattering at retirement. | Middle: FEHB + Medicare + Premiums + Deductions | Final CTA: Review your health benefits before you retire.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FEHB & Medicare Education',
    broll: 'FEHB card mockup, Medicare packet, retiree couple at kitchen table, coverage coordination graphic.',
    leadCapture: 'FEHB & Medicare Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 7, batch: 1,
    title: 'Social Security Timing Should Not Be A Guess',
    lenMin: 30, lenMax: 40,
    script: "For federal employees, Social Security timing shouldn't be looked at in isolation. It needs to be coordinated with your FERS pension, TSP withdrawals, taxes, income needs, and in some cases, the FERS Special Retirement Supplement. Claiming early, waiting, or delaying all have trade-offs. The right answer is not the same for everyone. And guessing can create problems you may not see until later.",
    spokenCta: 'Before you claim Social Security, review how that decision fits with your FERS pension, TSP, taxes, and retirement income.',
    onscreen: 'Opening: Social Security timing matters. | Middle: Pension | TSP | Taxes | Income Timing | Final CTA: Request a Social Security timing review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Social Security Timing Education',
    broll: 'Age 62/FRA/70 timeline, Social Security statement blurred, retirement income flow chart.',
    leadCapture: 'Social Security Timing Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 8, batch: 1,
    title: 'Beneficiaries Are Easy To Forget',
    lenMin: 25, lenMax: 35,
    script: "Here's a simple federal retirement mistake that's easy to overlook: outdated beneficiaries. Your TSP, FEGLI, unpaid compensation, and other federal benefits may have separate beneficiary designations. If those forms are outdated, your intentions may not match what's actually on file. And this is not something you want your family discovering after the fact. Before you retire, review your beneficiary designations and make sure they still reflect your wishes.",
    spokenCta: 'Before you retire, add beneficiary designations to your checklist and make sure your forms still match your wishes.',
    onscreen: 'Opening: Old beneficiary forms can create problems. | Middle: TSP | FEGLI | Unpaid Compensation | Final CTA: Download the federal retirement checklist.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Checklist',
    broll: 'File folder labeled beneficiaries, checklist, family photo, pen signing form.',
    leadCapture: 'Federal Retirement Checklist lead magnet',
    ctaType: 'lead_magnet',
  }),

  makeLibraryVideo({
    no: 9, batch: 1,
    title: 'Employee To Retiree Is A Real Transition',
    lenMin: 35, lenMax: 45,
    script: "Retiring from federal service is not just leaving a job. You're moving from active employee status to retiree status, what the federal system calls annuitant status. That transition can affect your pay timing, deductions, insurance, retirement income, and paperwork process. Some employees are surprised because they think retirement starts cleanly the day after they leave. But in reality, the transition can take time, and the details matter. You don't want to learn the process only after your paycheck has stopped.",
    spokenCta: 'Before your final day, review what changes when you move from active employee to retiree status.',
    onscreen: 'Opening: Employee to retiree is a real transition. | Middle: Pay | Deductions | Insurance | Paperwork | Final CTA: Know what changes before you retire.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Benefits Transition Education',
    broll: 'Employee badge on desk, timeline from final paycheck to interim payments, paperwork folder, retiree checklist.',
    leadCapture: 'Retirement Transition Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 10, batch: 1,
    title: 'Online Does Not Mean Simple',
    lenMin: 30, lenMax: 45,
    script: "The Online Retirement Application can make the process more convenient, but online doesn't always mean simple. By the time you start the application, you may already need answers about retirement timing, survivor benefits, FEHB, FEGLI, TSP decisions, and required documentation. The application should reflect a plan. It shouldn't create one. And it should not be where you first discover the decisions you should've reviewed months earlier.",
    spokenCta: 'Before you start the Online Retirement Application, know what to verify and what decisions should already be reviewed.',
    onscreen: 'Opening: Online does not mean simple. | Middle: Convenient does not always mean clear. | Final CTA: Know what to verify before you submit.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Online Retirement Application Guidance',
    broll: 'Laptop with blurred ORA screen, checklist, employee pausing before submit, documents beside keyboard.',
    leadCapture: 'ORA Guidance Request landing page',
    ctaType: 'direct_review',
  }),

  // ── BATCH 2: ORA / Online Retirement Application ──────────
  makeLibraryVideo({
    no: 11, batch: 2,
    title: 'The Application Is Not The Plan',
    lenMin: 35, lenMax: 45,
    script: "The Online Retirement Application is important, but it should not be the place where you start planning your retirement. By the time you begin that application, you should already understand your retirement date, your pension estimate, survivor benefit choices, FEHB, FEGLI, TSP decisions, and what documents may be needed. The application should reflect the plan. It should not create the plan. That's where a lot of federal employees get uncomfortable, because the system can expose questions they should've answered months earlier.",
    spokenCta: 'Before you start the Online Retirement Application, review the decisions that need to be made before you submit.',
    onscreen: 'Opening: The application is not the plan. | Middle: Retirement Date | Survivor Benefits | FEHB | FEGLI | TSP | Final CTA: Know what to verify before you submit.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Online Retirement Application Guidance',
    broll: 'Laptop with blurred application screen, checklist, calendar, document folder, employee reviewing paperwork.',
    leadCapture: 'ORA Guidance Request landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 12, batch: 2,
    title: 'Online Does Not Mean Automatic',
    lenMin: 30, lenMax: 40,
    script: "Just because the retirement application is online does not mean the process is automatic. You still need to know what you're choosing, what you're submitting, what applies to your situation, and what may happen after the application moves forward. A digital form can make the process more convenient. But convenience is not the same thing as clarity. Before you rely on the system to guide you, make sure you understand the decisions behind the screens.",
    spokenCta: 'Before you begin the Online Retirement Application, make sure you know what each major section means.',
    onscreen: 'Opening: Online does not mean automatic. | Middle: Convenient does not mean clear. | Final CTA: Understand the decisions behind the screens.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Education',
    broll: 'Cursor over online form, person pausing before submit, checklist overlay reading Verify First.',
    leadCapture: 'ORA Readiness Checklist lead magnet',
    ctaType: 'lead_magnet',
  }),

  makeLibraryVideo({
    no: 13, batch: 2,
    title: 'The Submit Button Matters',
    lenMin: 30, lenMax: 40,
    script: "In federal retirement, the submit button matters. Once information is submitted, the process starts moving, and some corrections may become more complicated than employees expect. That doesn't mean you should be afraid of the process. It means you should be prepared before you get there. Your retirement application should be reviewed with intention, not rushed because a date is getting close.",
    spokenCta: 'Before you hit submit, know what you\'re submitting and why it matters.',
    onscreen: 'Opening: Before you hit submit... | Middle: Review. Verify. Understand. | Final CTA: Don\'t rush the retirement application.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Preparing Federal Employees Before They Submit',
    broll: 'Finger hovering over submit, calendar deadline, green checks on application readiness list.',
    leadCapture: 'Pre-Submission ORA Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 14, batch: 2,
    title: 'ORA Can Reveal Gaps',
    lenMin: 35, lenMax: 45,
    script: "The Online Retirement Application can reveal gaps in your retirement planning. Maybe you're not sure about your survivor benefit election. Maybe you don't fully understand how FEHB continues into retirement. Maybe you haven't reviewed FEGLI costs, TSP withdrawal plans, or your expected income timing. The application may ask the question. But it may not give you the explanation you need to feel confident answering it. That's why the planning needs to happen before the application.",
    spokenCta: 'Before ORA exposes a question you\'re not ready for, review the major decisions ahead of time.',
    onscreen: 'Opening: ORA can reveal gaps. | Middle: Survivor Benefits | FEHB | FEGLI | TSP | Income Timing | Final CTA: Plan before the application.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Plain-English Federal Retirement Education',
    broll: 'Question marks over benefit icons, employee looking at laptop, checklist filling in missing items.',
    leadCapture: 'Federal Retirement Readiness Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 15, batch: 2,
    title: "Don't Let ORA Be Your First Real Review",
    lenMin: 30, lenMax: 45,
    script: "The first time you seriously review your retirement decisions should not be inside the Online Retirement Application. That's too late in the process for many employees. Your retirement date, pension calculation, survivor benefit choice, insurance decisions, TSP strategy, and income timing should all be reviewed before you're working through the application. ORA is part of the process. It should not be the first time the process feels real.",
    spokenCta: 'Before ORA becomes real, get your retirement decisions reviewed.',
    onscreen: 'Opening: Don\'t wait until ORA. | Middle: Review first. Apply second. | Final CTA: Request a retirement readiness review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal & Postal Retirement Education',
    broll: 'Timeline: Review → Decide → Apply → Retire, employee comparing documents, laptop application blurred.',
    leadCapture: 'Retirement Readiness Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 16, batch: 2,
    title: 'ORA Is A Process, Not Just A Website',
    lenMin: 30, lenMax: 40,
    script: "The Online Retirement Application is not just a website. It's part of a larger retirement process that includes your agency, your records, your benefit elections, your retirement date, and eventually the transition into retiree status. That's why employees need to understand more than where to click. They need to understand what the clicks mean. If you're within a few years of retirement, ORA should be on your radar before you're under pressure to submit.",
    spokenCta: 'Start learning the process before you\'re under pressure to complete it.',
    onscreen: 'Opening: ORA is more than a website. | Middle: Records | Elections | Timing | Transition | Final CTA: Understand the process before you submit.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Online Retirement Application Education',
    broll: 'Flowchart from employee to agency to processing to retiree status, laptop, file folder, calendar.',
    leadCapture: 'ORA Process Guide landing page',
    ctaType: 'website_traffic',
  }),

  makeLibraryVideo({
    no: 17, batch: 2,
    title: 'Retirement Dates And ORA Are Connected',
    lenMin: 35, lenMax: 45,
    script: "Your retirement date is not just a date on a calendar. It can affect your final paycheck, leave payout, benefit timing, pension start date, and how smoothly your retirement application moves through the process. That's why you don't want to pick a date in isolation and figure everything else out later. The Online Retirement Application should match the timing strategy you've already reviewed. Before you choose the date, understand what the date affects.",
    spokenCta: 'Before you select a retirement date, review how that date connects to the rest of your benefits.',
    onscreen: 'Opening: Your retirement date matters. | Middle: Pay | Leave | Pension | Benefits | Application Timing | Final CTA: Choose your date with clarity.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Timing Education',
    broll: 'Calendar date highlighted, final pay/leave/pension timeline, employee comparing date options.',
    leadCapture: 'Retirement Date Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 18, batch: 2,
    title: "ORA Won't Explain Every Trade-Off",
    lenMin: 30, lenMax: 40,
    script: "The Online Retirement Application may collect your choices, but it may not fully explain every trade-off behind those choices. That matters. Survivor benefits can affect your income and your spouse's future protection. FEHB and Medicare decisions can affect your health coverage planning. FEGLI can affect your retirement deductions. TSP decisions can affect income and taxes. A form can record an election. But you still need to understand the election.",
    spokenCta: 'Before you make retirement elections, make sure you understand the trade-offs behind them.',
    onscreen: 'Opening: ORA records choices. | Middle: You still need to understand them. | Final CTA: Review the trade-offs before you submit.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Decision Education',
    broll: 'Election form graphic, choice/impact split screen, icons for survivor/FEHB/FEGLI/TSP.',
    leadCapture: 'Federal Benefit Election Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 19, batch: 2,
    title: 'The ORA Conversation Should Start Earlier',
    lenMin: 30, lenMax: 40,
    script: "If you're one to three years from retirement, it's not too early to start understanding the Online Retirement Application. That does not mean you're applying today. It means you're learning what decisions are coming, what documents may matter, and what questions you'll want answered before the process starts. The employees who feel more confident near retirement usually didn't wait until the last minute. They started getting clarity earlier.",
    spokenCta: 'If you\'re within three years of retirement, start learning what the application process may require.',
    onscreen: 'Opening: One to three years out? | Middle: It\'s not too early to understand ORA. | Final CTA: Get clarity before the deadline.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Education Before The Application',
    broll: 'Three-year countdown graphic, questions checklist, employee watching guide or reviewing documents.',
    leadCapture: '3-Year Retirement Readiness Checklist landing page',
    ctaType: 'lead_magnet',
  }),

  makeLibraryVideo({
    no: 20, batch: 2,
    title: 'Your Application Should Match Your Retirement Strategy',
    lenMin: 35, lenMax: 45,
    script: "Your Online Retirement Application should match your retirement strategy. That means your retirement date, survivor benefit decision, insurance choices, TSP plan, Social Security timing, and income expectations should all be working together. Too many employees treat the application like an administrative task. But retirement is not just paperwork. It's a benefits transition. And the paperwork should reflect decisions you already understand.",
    spokenCta: 'Before you submit your retirement application, make sure your paperwork matches your plan.',
    onscreen: 'Opening: Does your application match your plan? | Middle: Date | Pension | Insurance | TSP | Survivor Benefits | Income | Final CTA: Review before you submit.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Helping Employees Prepare For Retirement',
    broll: 'Puzzle pieces labeled date, pension, insurance, TSP, survivor, income; application screen; checklist.',
    leadCapture: 'ORA + Retirement Strategy Review landing page',
    ctaType: 'direct_review',
  }),

  // ── BATCH 3: FERS Pension, Eligibility & Retirement Dates ──
  makeLibraryVideo({
    no: 21, batch: 3,
    title: 'Your MRA Is Only One Piece',
    lenMin: 30, lenMax: 40,
    script: "Your Minimum Retirement Age is important, but it is only one piece of the retirement decision. You still need to understand your years of service, pension calculation, health benefits, survivor elections, TSP strategy, Social Security timing, and income needs. Too many employees hear, \"You're eligible,\" and treat that like the finish line. But eligibility is the starting point for the real retirement review. Before you make plans around a date, make sure the numbers support it.",
    spokenCta: 'Before you build plans around your MRA, review the rest of your retirement picture.',
    onscreen: 'Opening: MRA is not the whole decision. | Middle: Eligibility is only the starting point. | Final CTA: Review your retirement readiness.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Readiness Education',
    broll: 'Age milestone graphic, service years timeline, employee reviewing estimate and calendar.',
    leadCapture: 'Retirement Readiness Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 22, batch: 3,
    title: 'The Date You Retire Can Change More Than You Think',
    lenMin: 35, lenMax: 45,
    script: "Your retirement date can affect more than when you stop working. It can affect your final paycheck, leave payout, benefit timing, retirement processing, pension start date, and the way your income transition feels. That is why the date should not be picked because it sounds convenient. It should be reviewed because it affects multiple moving parts. Before you choose a final day, understand what that date actually touches.",
    spokenCta: 'Before you select your final day, review how that date connects to your benefits and income timing.',
    onscreen: 'Opening: Your retirement date matters. | Middle: Pay | Leave | Pension | Processing | Timing | Final CTA: Choose your date with clarity.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Timing Guidance',
    broll: 'Calendar with multiple dates, timeline of final paycheck/leave/pension, planning worksheet.',
    leadCapture: 'Retirement Date Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 23, batch: 3,
    title: 'The High-3 Is Easy To Misunderstand',
    lenMin: 30, lenMax: 40,
    script: "Your FERS pension is connected to your High-3 average salary, but that does not mean employees always understand how it works. Some confuse current pay with High-3. Some forget locality pay may be part of the calculation. Some focus on the formula and miss how service time and retirement age can affect the final number. The pension formula matters, but the assumptions behind it matter too.",
    spokenCta: 'Before you rely on a pension estimate, make sure the inputs behind the estimate make sense.',
    onscreen: 'Opening: High-3 can be misunderstood. | Middle: Salary | Service | Age | Formula | Final CTA: Request a FERS pension review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FERS Pension Education',
    broll: 'Salary history timeline, calculator, formula graphic, employee reviewing estimate.',
    leadCapture: 'FERS Pension Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 24, batch: 3,
    title: 'The 1.1 Percent Assumption',
    lenMin: 35, lenMax: 45,
    script: "Some FERS employees hear about the 1.1 percent pension factor and assume it automatically applies to them. It does not. Whether that higher factor applies depends on specific age and service requirements. That is why pension planning should not be based on hallway advice or a half-remembered rule. A small formula difference can create a meaningful difference over a long retirement. Before you estimate your pension, verify which calculation applies to your situation.",
    spokenCta: 'Before you rely on the 1.1 percent factor, verify whether you actually qualify for it.',
    onscreen: 'Opening: Does the 1.1% factor apply to you? | Middle: Age + Service + Formula | Final CTA: Verify your FERS calculation.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FERS Calculation Education',
    broll: 'Formula animation, 1.0% vs 1.1% comparison, service-year timeline, calculator.',
    leadCapture: 'FERS Pension Calculation Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 25, batch: 3,
    title: 'Sick Leave Helps, But Not The Way Some Think',
    lenMin: 30, lenMax: 40,
    script: "Unused sick leave can help your FERS pension calculation, but it does not usually work the way employees assume. It can add service credit for the pension calculation. But it does not make you eligible to retire earlier. That difference matters. If you're counting on sick leave to solve an eligibility issue, you may be building your plan on the wrong assumption.",
    spokenCta: 'Before you factor sick leave into your retirement plan, understand what it can and cannot do.',
    onscreen: 'Opening: Sick leave helps, but know how. | Middle: Pension credit is not eligibility. | Final CTA: Review your retirement eligibility and estimate.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Education',
    broll: 'Sick leave balance, service credit graphic, eligibility checklist, calendar.',
    leadCapture: 'Eligibility & Pension Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 26, batch: 3,
    title: 'Annual Leave Is A Transition Asset',
    lenMin: 30, lenMax: 40,
    script: "Annual leave is not just something you burn down before retirement. For many federal employees, the lump-sum annual leave payout can become an important transition asset. It may help bridge the gap between final pay, interim retirement payments, and your long-term retirement income. But it should be planned intentionally. Before you retire, understand how leave fits into your cash-flow transition.",
    spokenCta: 'Before your final day, review how annual leave may fit into your retirement transition.',
    onscreen: 'Opening: Annual leave can help the transition. | Middle: Final Pay | Leave Payout | Interim Pay | Income Timing | Final CTA: Plan the transition before you retire.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Transition Education',
    broll: 'Leave balance statement, bridge graphic, paycheck timeline, employee reviewing cash-flow worksheet.',
    leadCapture: 'Retirement Transition Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 27, batch: 3,
    title: 'The Retirement Estimate Is Only As Good As The Records',
    lenMin: 30, lenMax: 40,
    script: "A retirement estimate can only be as reliable as the records behind it. Service dates, deposits, redeposits, military time, part-time service, and prior federal service can all affect the final picture. That is why you do not want to discover a records issue late in the retirement process. If something in your history is unusual, get clarity before the application clock is running.",
    spokenCta: 'Before retirement gets close, review whether your service history and records match your expectations.',
    onscreen: 'Opening: Your estimate depends on your records. | Middle: Service Dates | Buyback | Prior Service | Part-Time | Final CTA: Review your records early.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Records Education',
    broll: 'Service history folder, magnifying glass over timeline, documents, employee reviewing SF-style forms.',
    leadCapture: 'Service History Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 28, batch: 3,
    title: 'Retiring At 57 Is Not The Same For Everyone',
    lenMin: 30, lenMax: 40,
    script: "Two employees can both be age 57 and have very different retirement options. Years of service, retirement system, special provisions, MRA rules, and income needs can all change the answer. That is why age alone does not tell the whole story. You need to know whether you are eligible, what your pension may look like, and whether the retirement is actually affordable. The number that matters is not just your age. It is the full retirement picture.",
    spokenCta: 'Before you assume age 57 means you are ready, review eligibility, income, and benefit timing together.',
    onscreen: 'Opening: Age alone does not answer retirement readiness. | Middle: Age | Service | Pension | Income | Benefits | Final CTA: Know the full picture.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Readiness Education',
    broll: 'Two employee profiles side-by-side, age 57 graphic, service years timeline, calculator.',
    leadCapture: 'Retirement Readiness Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 29, batch: 3,
    title: 'The Best Retirement Date Is Not Always The Soonest Date',
    lenMin: 30, lenMax: 40,
    script: "When employees get close to eligibility, it is easy to focus on the soonest possible retirement date. But the soonest date is not always the best date. A different date may affect leave payout, pension timing, income transition, insurance deductions, or how prepared you feel going into the application process. The goal is not to retire as soon as possible. The goal is to retire with clarity.",
    spokenCta: 'Before you lock in the soonest date, compare what different retirement dates may change.',
    onscreen: 'Opening: Soonest does not always mean best. | Middle: Compare dates before you decide. | Final CTA: Choose your retirement date with clarity.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Date Planning',
    broll: 'Calendar comparison, multiple date options, decision tree, employee with checklist.',
    leadCapture: 'Retirement Date Comparison landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 30, batch: 3,
    title: "Know Your Numbers Before You Tell Everyone Your Date",
    lenMin: 30, lenMax: 40,
    script: "A lot of federal employees pick a retirement date in their mind long before they have reviewed the numbers. Then the date becomes emotional. They tell coworkers, family, and supervisors, and now changing it feels harder. But the date should follow the analysis, not the other way around. Before you announce your retirement plans, understand your pension, deductions, insurance, TSP, and income timing.",
    spokenCta: 'Before you tell everyone your retirement date, make sure the numbers support it.',
    onscreen: 'Opening: Do the math before the announcement. | Middle: Pension | Deductions | Insurance | TSP | Income Timing | Final CTA: Know your numbers first.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Know Your Numbers Review',
    broll: 'Employee looking at calendar, family conversation, calculator, retirement income worksheet.',
    leadCapture: 'Know Your Numbers Review landing page',
    ctaType: 'direct_review',
  }),

  // ── BATCH 4: FEGLI, Survivor Benefits, FEHB & Medicare ────
  makeLibraryVideo({
    no: 31, batch: 4,
    title: 'FEGLI Option B Can Surprise People',
    lenMin: 30, lenMax: 40,
    script: "FEGLI Option B can feel affordable earlier in your career, but the cost can look very different as you get older. That does not mean it is bad. It means it needs to be reviewed. The mistake is assuming coverage that made sense years ago still fits your retirement situation today. Before you carry coverage into retirement, understand the future cost, the reduction choices, and what role that insurance is supposed to play.",
    spokenCta: 'Before retirement, review your FEGLI coverage and future costs instead of assuming the old election still fits.',
    onscreen: 'Opening: Option B can surprise people. | Middle: Cost | Coverage | Reductions | Retirement | Final CTA: Request a FEGLI cost review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FEGLI Education',
    broll: 'FEGLI election form, premium chart, age bands graphic, employee comparing coverage options.',
    leadCapture: 'FEGLI Option B Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 32, batch: 4,
    title: 'Life Insurance In Retirement Is A Different Question',
    lenMin: 30, lenMax: 40,
    script: "Life insurance while you are working and life insurance in retirement are not always the same question. While you are working, coverage may protect income, debt, family obligations, or children at home. In retirement, the purpose may change. That is why the question should not be, \"Do I have FEGLI?\" The better question is, \"What am I trying to protect, and what will this cost me later?\"",
    spokenCta: 'Before you retire, review what your life insurance is meant to protect and what it may cost later.',
    onscreen: 'Opening: Retirement changes the life insurance question. | Middle: Purpose + Cost + Coverage | Final CTA: Review FEGLI before you retire.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Insurance Education',
    broll: 'Family photos, mortgage papers, FEGLI documents, retiree budget worksheet.',
    leadCapture: 'Life Insurance In Retirement Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 33, batch: 4,
    title: 'The Survivor Benefit And FEHB Connection',
    lenMin: 35, lenMax: 45,
    script: "For married federal employees, survivor benefits are not just about replacing income. They can also connect to whether a surviving spouse may continue certain health benefits. That is a big deal. A survivor election can reduce your monthly pension, but it may also protect your spouse in ways employees do not always fully understand. This is not a decision to skim over during paperwork. Before you elect, know how the survivor benefit and health coverage pieces fit together.",
    spokenCta: 'Before you make a survivor election, review how it may affect income and health benefits for your spouse.',
    onscreen: 'Opening: Survivor benefits and FEHB can be connected. | Middle: Spouse | Income | Health Benefits | Final CTA: Review before you elect.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Survivor Benefit Education',
    broll: 'Couple reviewing health/pension docs, survivor election form, benefit connection graphic.',
    leadCapture: 'Survivor Benefit & FEHB Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 34, batch: 4,
    title: 'Do Not Make The Survivor Election Alone',
    lenMin: 30, lenMax: 40,
    script: "A survivor benefit election affects more than the federal employee. It can affect a spouse's future income, health coverage planning, and financial security after the employee passes away. That is why this should not be treated like a private checkbox decision. For married employees, this is a household decision. Before the paperwork is submitted, both spouses should understand what is being chosen and what is being given up.",
    spokenCta: 'Before making a survivor benefit election, make sure both spouses understand the decision.',
    onscreen: 'Opening: This is a household decision. | Middle: Income | Health Coverage | Spouse Protection | Final CTA: Schedule a survivor benefit review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Spousal Retirement Education',
    broll: 'Couple at kitchen table, two coffee cups, documents between spouses, checkbox/election graphic.',
    leadCapture: 'Spousal Survivor Benefit Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 35, batch: 4,
    title: 'FEHB Can Continue, But The Rules Matter',
    lenMin: 30, lenMax: 40,
    script: "Many federal employees have heard they can keep FEHB in retirement. But the rules matter. You need to understand eligibility, timing, premiums, Medicare coordination, and what changes when you move from payroll deductions to retirement deductions. Do not just assume health benefits will be handled automatically. Before you retire, verify how FEHB fits into your retirement transition.",
    spokenCta: 'Before retirement, verify how FEHB may continue and what changes once you retire.',
    onscreen: 'Opening: FEHB can continue, but rules matter. | Middle: Eligibility | Premiums | Medicare | Retirement Deductions | Final CTA: Review FEHB before retirement.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FEHB Retirement Education',
    broll: 'FEHB card, payroll-to-retirement deduction graphic, Medicare packet, health checklist.',
    leadCapture: 'FEHB Retirement Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 36, batch: 4,
    title: 'Medicare Is Not A One-Size-Fits-All Decision',
    lenMin: 30, lenMax: 40,
    script: "Medicare decisions can feel confusing for federal retirees because FEHB may still be part of the picture. Some employees assume Medicare replaces FEHB. Others assume they do not need to think about Medicare at all. Both assumptions can create confusion. The real question is how Medicare and FEHB may coordinate for your situation, your spouse, your costs, and your coverage needs.",
    spokenCta: 'Before you turn 65 or retire near Medicare age, review how Medicare and FEHB may work together.',
    onscreen: 'Opening: Medicare and FEHB need coordination. | Middle: Costs | Coverage | Timing | Spouse | Final CTA: Request a FEHB and Medicare review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FEHB & Medicare Education',
    broll: 'Medicare card, FEHB plan brochure, coordination diagram, retired couple reviewing choices.',
    leadCapture: 'FEHB & Medicare Coordination landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 37, batch: 4,
    title: 'Dental And Vision Are Part Of The Conversation Too',
    lenMin: 25, lenMax: 35,
    script: "Federal employees often focus on the big retirement decisions: pension, TSP, FEHB, and Social Security. But dental and vision coverage can still matter in retirement. The point is not that every benefit is complicated. The point is that retirement changes the way you need to review your benefits. Before you retire, make sure you know what continues, what changes, and what needs a separate decision.",
    spokenCta: 'Before retirement, include dental and vision in your benefit transition checklist.',
    onscreen: 'Opening: Do not overlook dental and vision. | Middle: What continues? What changes? | Final CTA: Review your benefit transition.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Benefits Transition Education',
    broll: 'Checklist with dental/vision line items, benefits folder, retiree coverage grid.',
    leadCapture: 'Benefits Transition Checklist lead magnet',
    ctaType: 'lead_magnet',
  }),

  makeLibraryVideo({
    no: 38, batch: 4,
    title: 'Insurance Deductions Can Change The Net Number',
    lenMin: 30, lenMax: 40,
    script: "Your gross pension estimate can look fine until you start subtracting retirement deductions. FEHB, FEGLI, survivor benefits, dental, vision, taxes, and other deductions can change what actually lands in your account. That is why net income matters more than the headline pension number. Before you retire, review the deductions that may follow you into retirement. The goal is not a bigger estimate. The goal is a clearer one.",
    spokenCta: 'Before you retire, review the deductions that may affect your net retirement income.',
    onscreen: 'Opening: Deductions change the number. | Middle: Gross pension vs. net retirement income | Final CTA: Know what you may actually keep.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Net Retirement Income Review',
    broll: 'Gross-to-net calculation, insurance icons, bank deposit animation, employee reviewing budget.',
    leadCapture: 'Net Retirement Income Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 39, batch: 4,
    title: 'The Coverage You Keep Should Have A Purpose',
    lenMin: 30, lenMax: 40,
    script: "When employees retire, it is tempting to keep every benefit exactly the way it was. That can feel safe. But every coverage decision should have a purpose. What is it protecting? What does it cost? Who depends on it? How long is it needed? If you cannot answer those questions, you may be carrying coverage by habit instead of by strategy.",
    spokenCta: 'Before retirement, review the purpose and cost of each insurance decision.',
    onscreen: 'Opening: Do not carry coverage by habit. | Middle: Purpose | Cost | Need | Timeframe | Final CTA: Review your insurance before retirement.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Insurance Review',
    broll: 'Coverage cards, checkboxes, cost/purpose grid, retiree couple reviewing options.',
    leadCapture: 'Federal Insurance Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 40, batch: 4,
    title: 'The Health Benefits Question Is Bigger Than Premiums',
    lenMin: 30, lenMax: 40,
    script: "When federal employees compare health benefits, they often focus on premiums. Premiums matter, but they are not the whole question. You also need to think about out-of-pocket exposure, prescriptions, Medicare coordination, spouse coverage, and how your health needs may change in retirement. The cheapest option is not automatically the best fit. Before you retire, review health benefits through the lens of retirement, not just payroll deductions.",
    spokenCta: 'Before you retire, review health benefits based on total fit, not just premium cost.',
    onscreen: 'Opening: Health benefits are bigger than premiums. | Middle: Premiums | Out-of-Pocket | Prescriptions | Medicare | Spouse | Final CTA: Review before you elect.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Health Benefits Education',
    broll: 'Premium comparison chart, prescription bottles, spouse coverage icon, retiree health plan worksheet.',
    leadCapture: 'Health Benefits Review landing page',
    ctaType: 'direct_review',
  }),

  // ── BATCH 5: TSP, Social Security, SRS & Income Timing ────
  makeLibraryVideo({
    no: 41, batch: 5,
    title: 'Your TSP Balance Is Not Your Retirement Paycheck',
    lenMin: 30, lenMax: 40,
    script: "A large TSP balance can feel reassuring. But your TSP balance is not the same thing as a retirement paycheck. The real question is how that money will be used, when withdrawals may start, how taxes may apply, and how it coordinates with pension and Social Security income. Accumulation is one skill. Distribution is a different one. Before you retire, turn the balance into a plan.",
    spokenCta: 'Before retirement, review how your TSP may become income, not just how much is in the account.',
    onscreen: 'Opening: Balance is not paycheck. | Middle: Withdrawals | Taxes | Pension | Social Security | Final CTA: Request a TSP income review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | TSP Distribution Education',
    broll: 'TSP balance changing to monthly income, account screen blurred, withdrawal timeline.',
    leadCapture: 'TSP Income Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 42, batch: 5,
    title: 'The TSP Withdrawal Decision Comes After The Saving Decision',
    lenMin: 30, lenMax: 40,
    script: "Most federal employees spend their careers deciding how much to contribute to the TSP. But near retirement, the question changes. Now you need to decide how withdrawals may work, which accounts to use first, how taxes fit in, and how much flexibility you need. The TSP does not stop being important when you retire. It becomes important in a different way.",
    spokenCta: 'Before retirement, review your TSP withdrawal plan, not just your contribution history.',
    onscreen: 'Opening: Contributions are not withdrawals. | Middle: Accounts | Taxes | Income | Flexibility | Final CTA: Build a TSP withdrawal strategy.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | TSP Withdrawal Strategy Education',
    broll: 'Contribution graphic flipping to withdrawal graphic, retiree budget, tax calendar.',
    leadCapture: 'TSP Withdrawal Strategy landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 43, batch: 5,
    title: 'Taxes Do Not Retire When You Do',
    lenMin: 25, lenMax: 35,
    script: "Federal retirement income can come from several places: pension, TSP, Social Security, and sometimes other savings. But taxes do not retire when you do. The timing of withdrawals, Social Security, Roth versus traditional money, and required income can all affect your tax picture. You do not need to become a tax expert. But you do need to understand that retirement income decisions can have tax consequences.",
    spokenCta: 'Before retirement, review how taxes may affect your pension, TSP, and Social Security income.',
    onscreen: 'Opening: Taxes do not retire when you do. | Middle: Pension | TSP | Social Security | Timing | Final CTA: Review your retirement income plan.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Income Education',
    broll: 'Tax folders, income source icons, timeline with withdrawal decisions, calculator.',
    leadCapture: 'Retirement Income Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 44, batch: 5,
    title: 'The FERS Supplement Is Often Misunderstood',
    lenMin: 30, lenMax: 40,
    script: "The FERS Special Retirement Supplement can be valuable, but it is also easy to misunderstand. Not every retiree gets it. It may be affected by work income. And it is not the same thing as Social Security. If you're planning to retire before Social Security starts, this benefit may be part of the income bridge. But it needs to be reviewed correctly before you build your plan around it.",
    spokenCta: 'Before you count on the FERS Supplement, review whether it may apply and how it fits your income plan.',
    onscreen: 'Opening: The FERS Supplement is not Social Security. | Middle: Eligibility | Earnings Test | Income Bridge | Final CTA: Review before you rely on it.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | FERS Supplement Education',
    broll: 'Bridge graphic from retirement to Social Security, eligibility checklist, income timeline.',
    leadCapture: 'FERS Supplement Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 45, batch: 5,
    title: 'Claiming Social Security Early Can Solve One Problem And Create Another',
    lenMin: 35, lenMax: 45,
    script: "Claiming Social Security early may create income sooner. But it can also reduce the monthly benefit you receive for the rest of your life. That does not mean claiming early is always wrong. It means the decision should be connected to your pension, TSP, taxes, health, spouse, and income needs. The problem is not claiming early. The problem is claiming without understanding the trade-offs.",
    spokenCta: 'Before you claim Social Security, review how the timing decision fits your full retirement picture.',
    onscreen: 'Opening: Early claiming has trade-offs. | Middle: Income Now vs. Income Later | Final CTA: Request a Social Security timing review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Social Security Timing Education',
    broll: 'Age timeline, benefit amount comparison, couple reviewing claiming options.',
    leadCapture: 'Social Security Timing Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 46, batch: 5,
    title: 'Roth And Traditional TSP Need A Retirement Lens',
    lenMin: 30, lenMax: 40,
    script: "Roth and traditional TSP decisions are not just contribution decisions. They can also affect how retirement income is taxed and where flexibility may come from later. Some employees put everything in one bucket without thinking about how that money may be used in retirement. The right mix is not the same for everyone. Before retirement, review your TSP through the lens of future withdrawals, not just today's contribution.",
    spokenCta: 'Before retirement, review how Roth and traditional TSP balances may support future income flexibility.',
    onscreen: 'Opening: TSP buckets matter. | Middle: Roth | Traditional | Taxes | Flexibility | Final CTA: Review your TSP strategy.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | TSP Tax-Planning Education',
    broll: 'Two-bucket visual, Roth/traditional labels, tax timeline, withdrawal flow chart.',
    leadCapture: 'TSP Roth/Traditional Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 47, batch: 5,
    title: 'Income Timing Can Make Or Break The First Retirement Year',
    lenMin: 30, lenMax: 40,
    script: "The first year of federal retirement can feel different than employees expect. Final pay, leave payout, interim payments, pension processing, TSP withdrawals, and Social Security timing may not all line up perfectly. That does not mean something is wrong. It means the transition needs to be planned. Before your last day, understand where income may come from and when it may arrive.",
    spokenCta: 'Before you retire, review your first-year income timing so the transition does not catch you off guard.',
    onscreen: 'Opening: The first year needs a plan. | Middle: Final Pay | Leave | Interim Pay | TSP | Social Security | Final CTA: Plan your income timing.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Income Transition Education',
    broll: 'First-year timeline, paycheck icons, calendar, cash-flow worksheet.',
    leadCapture: 'First-Year Retirement Income Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 48, batch: 5,
    title: 'Required Minimum Distributions Should Not Be A Surprise',
    lenMin: 30, lenMax: 40,
    script: "For many federal retirees, the TSP is not just money for today. It can also create decisions later, including required minimum distributions. That is why distribution planning should not wait until the last minute. The way you use your TSP in the early retirement years can affect flexibility later. Before retirement, think beyond the first withdrawal and understand the long-term path.",
    spokenCta: 'Before you retire, review how TSP withdrawals may affect both early retirement and later required distributions.',
    onscreen: 'Opening: Think beyond the first withdrawal. | Middle: TSP | Timing | Flexibility | RMDs | Final CTA: Build a long-term withdrawal plan.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | TSP Distribution Education',
    broll: 'Long-term retirement timeline, RMD alert icon, withdrawal path, age milestone graphic.',
    leadCapture: 'Long-Term TSP Distribution Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 49, batch: 5,
    title: 'Do Not Treat Every Account The Same',
    lenMin: 30, lenMax: 40,
    script: "Not every retirement account plays the same role. Your pension may provide steady income. Your TSP may provide flexibility. Roth money may provide tax flexibility. Cash may help during transition. Social Security may become part of the income floor. The trap is treating every account like one big pile of money. Retirement works better when each resource has a job.",
    spokenCta: 'Before retirement, review what job each income source is supposed to do.',
    onscreen: 'Opening: Every account needs a job. | Middle: Pension | TSP | Roth | Cash | Social Security | Final CTA: Build a coordinated income plan.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Retirement Income Coordination',
    broll: 'Buckets labeled pension, TSP, Roth, cash, Social Security; income map graphic.',
    leadCapture: 'Coordinated Retirement Income Review landing page',
    ctaType: 'direct_review',
  }),

  makeLibraryVideo({
    no: 50, batch: 5,
    title: 'The Retirement Income Plan Should Come Before The Retirement Party',
    lenMin: 30, lenMax: 40,
    script: "It is exciting to think about the retirement party, the final day, and what comes next. But the income plan needs to come first. How much will your pension actually pay? When will TSP withdrawals start? When will Social Security begin? What deductions will continue? Before you celebrate the date, make sure the income plan can support the life you're planning.",
    spokenCta: 'Before you set the party date, review the income plan behind the retirement date.',
    onscreen: 'Opening: Celebrate after you know the numbers. | Middle: Pension | TSP | Social Security | Deductions | Final CTA: Request a retirement income review.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Know Your Numbers Review',
    broll: 'Retirement party invitation next to calculator, income worksheet, calendar, couple planning.',
    leadCapture: 'Retirement Income Review landing page',
    ctaType: 'direct_review',
  }),

  // ── BATCH 6: Rule Changes, Benefits Transition & Agency/HR ─
  makeLibraryVideo({
    no: 51, batch: 6,
    title: 'Rules Change, Assumptions Get Old',
    lenMin: 30, lenMax: 40,
    script: "Federal benefits rules, contribution limits, insurance costs, tax rules, and application processes can change over time. That means advice you heard five or ten years ago may not be enough today. The danger is not just bad information. It is old information that sounds familiar. If you're within a few years of retirement, staying informed is not optional. It is part of protecting your retirement decision-making.",
    spokenCta: 'Stay current before retirement decisions become deadlines.',
    onscreen: 'Opening: Old advice can create new problems. | Middle: Rules | Costs | Limits | Process | Final CTA: Stay informed before you retire.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Current Federal Retirement Education',
    broll: 'Old memo vs updated checklist, news-style rule change graphic, employee reviewing updates.',
    leadCapture: 'Federal Retirement Updates Signup',
    ctaType: 'website_traffic',
    platforms: ['facebook', 'instagram', 'tiktok', 'youtube_shorts', 'linkedin'],
  }),

  makeLibraryVideo({
    no: 52, batch: 6,
    title: 'The Rules May Change, But The Need For Clarity Does Not',
    lenMin: 30, lenMax: 40,
    script: "Government rules can change. Agency processes can change. Benefit costs can change. But the need for clarity does not change. Federal employees still need to understand their pension, TSP, insurance, health benefits, survivor choices, and application process before they retire. The best defense against confusion is not guessing. It is staying educated before decisions become urgent.",
    spokenCta: 'Follow FedSafe for plain-English federal retirement education and updates.',
    onscreen: 'Opening: Rules can change. Clarity still matters. | Middle: Pension | TSP | FEHB | FEGLI | ORA | Final CTA: Follow for federal retirement education.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Retirement Updates',
    broll: 'Rule-change alert graphic, checklist, employee watching education video, benefits icons.',
    leadCapture: 'Federal Retirement Updates Signup',
    ctaType: 'website_traffic',
    platforms: ['facebook', 'instagram', 'tiktok', 'youtube_shorts', 'linkedin'],
  }),

  makeLibraryVideo({
    no: 53, batch: 6,
    title: 'Agencies Cannot Assume Employees Understand Retirement',
    lenMin: 35, lenMax: 45,
    script: "Federal employees may work for decades and still reach the final years before retirement with serious questions. When can I retire? What will my pension be? What happens to FEHB? How do survivor benefits work? What does the Online Retirement Application require? Agencies do not need employees guessing through these decisions alone. Structured retirement education can reduce confusion and help employees prepare earlier.",
    spokenCta: 'If your agency needs structured federal retirement education, FedSafe can help.',
    onscreen: 'Opening: Do your employees understand retirement? | Middle: Pension | FEHB | TSP | Survivor | ORA | Final CTA: Request agency retirement education.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Agency Workforce Retirement Education',
    broll: 'Agency briefing room, HR coordinator reviewing training calendar, employees in casual workshop.',
    leadCapture: 'Agency Briefing Request landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 54, batch: 6,
    title: 'Retirement Questions Can Drain HR Time',
    lenMin: 30, lenMax: 40,
    script: "As employees get close to retirement, the questions can pile up. Eligibility, pension estimates, insurance, TSP, survivor benefits, application timing, and paperwork all start coming at once. HR teams may be doing their best, but they are often stretched. A structured education program gives employees a clearer place to start. That can help reduce repeated questions and support a smoother transition.",
    spokenCta: 'For agencies that want clearer retirement education for employees, request a FedSafe briefing.',
    onscreen: 'Opening: Retirement questions pile up. | Middle: Eligibility | Insurance | TSP | Paperwork | Final CTA: Support employees before retirement pressure builds.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Workforce Retirement Education',
    broll: 'HR inbox with repeated questions, classroom briefing, FAQ board, employee handouts.',
    leadCapture: 'Agency Workforce Education landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 55, batch: 6,
    title: 'Retirement Education Is Workforce Readiness',
    lenMin: 30, lenMax: 40,
    script: "Retirement education is not just an employee benefit. It is part of workforce readiness. When employees understand retirement timing, benefits, paperwork, and transition issues earlier, agencies can plan better too. A retirement-ready workforce does not happen by accident. It happens when employees get clear information before decisions become urgent.",
    spokenCta: 'FedSafe provides structured retirement education for federal and postal workforces.',
    onscreen: 'Opening: Retirement education supports workforce readiness. | Middle: Employees prepare. Agencies plan. | Final CTA: Request an agency briefing.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal Workforce Education',
    broll: 'Workforce planning graphic, agency leadership meeting, employee education session.',
    leadCapture: 'Agency Briefing Request landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 56, batch: 6,
    title: 'The Five-Year Window Matters',
    lenMin: 30, lenMax: 40,
    script: "Employees who are within five years of retirement are entering the decision window. That does not mean every decision must be made today. It means the right questions should start now. Pension estimates, FEGLI costs, TSP strategy, survivor benefits, FEHB, Medicare, and application timing all deserve attention before the final year. Waiting until the last few months creates unnecessary pressure.",
    spokenCta: 'If your workforce has employees within five years of retirement, start the education process earlier.',
    onscreen: 'Opening: The five-year window matters. | Middle: Start learning before the final year. | Final CTA: Request workforce retirement education.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | 5-Year Retirement Readiness Education',
    broll: 'Five-year countdown, employee age/service profile, seminar/briefing room, checklist.',
    leadCapture: 'Agency 5-Year Readiness Program landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 57, batch: 6,
    title: 'Employees Need More Than A Packet',
    lenMin: 30, lenMax: 40,
    script: "A packet of retirement forms is not the same thing as retirement education. Forms collect information. Education helps employees understand what the information means. That difference matters when employees are making decisions about survivor benefits, insurance, income timing, and the retirement application process. Agencies can give employees a stronger start by pairing paperwork with plain-English education.",
    spokenCta: 'If your agency wants more than paperwork, request structured retirement education.',
    onscreen: 'Opening: Forms are not education. | Middle: Paperwork collects. Education explains. | Final CTA: Request an agency education briefing.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Plain-English Agency Briefings',
    broll: 'Stack of forms, educator pointing at simple benefits map, employees taking notes.',
    leadCapture: 'Agency Education Briefing landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 58, batch: 6,
    title: 'ORA Education Belongs Before The Final Months',
    lenMin: 30, lenMax: 40,
    script: "The Online Retirement Application should not be introduced only when employees are already under pressure to submit. By then, they may still have questions about dates, documents, elections, insurance, and income timing. Agencies can help by making ORA education part of the retirement readiness conversation earlier. Employees do not need to memorize the system. They need to understand what to prepare for before they get there.",
    spokenCta: 'Agencies can request ORA-focused retirement education for employees approaching retirement.',
    onscreen: 'Opening: ORA education should start earlier. | Middle: Dates | Documents | Elections | Timing | Final CTA: Request ORA workforce education.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Online Retirement Application Education For Agencies',
    broll: 'Agency training slide, ORA checklist, employees in small-group briefing, laptop screen blurred.',
    leadCapture: 'Agency ORA Education landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 59, batch: 6,
    title: 'A Retirement-Ready Employee Is A More Confident Employee',
    lenMin: 30, lenMax: 40,
    script: "Employees who understand their retirement decisions tend to approach the transition with more confidence. They are less likely to rely on rumors. They are less likely to wait until the last minute. And they are more likely to ask better questions before paperwork becomes urgent. That is the value of structured retirement education. It gives employees a clearer path before they have to make decisions.",
    spokenCta: 'For agencies that want employees to prepare earlier, FedSafe provides structured retirement education.',
    onscreen: 'Opening: Confidence comes from clarity. | Middle: Fewer rumors. Better questions. Earlier preparation. | Final CTA: Request agency workforce education.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Workforce Retirement Education',
    broll: 'Confident employees in briefing, question cards, retirement path graphic, agency coordinator.',
    leadCapture: 'Agency Workforce Education landing page',
    ctaType: 'agency',
    platforms: ['linkedin', 'facebook'],
  }),

  makeLibraryVideo({
    no: 60, batch: 6,
    title: 'The Goal Is Not More Information. It Is Better Understanding',
    lenMin: 35, lenMax: 45,
    script: "Federal employees do not need more random retirement information thrown at them. They need better understanding. They need to know how pension, TSP, FEHB, FEGLI, survivor benefits, Social Security, and the Online Retirement Application fit together. That is what makes retirement education valuable. Not noise. Not fear. Not generic financial talk. Clear, federal-specific guidance before decisions become difficult to change.",
    spokenCta: 'Visit FedSafeRetirement.com or request a one-on-one federal retirement review.',
    onscreen: 'Opening: More information is not always better. | Middle: Better understanding is the goal. | Final CTA: Get federal-specific retirement clarity.',
    endScreen: 'FedSafe Retirement | Registered Federal Contractor | Federal & Postal Retirement Education',
    broll: 'Information overload graphic shifting into clean benefits map, FedSafe-style end card, employee review session.',
    leadCapture: 'Retirement Review or Website Traffic landing page',
    ctaType: 'website_traffic',
    ctaText: 'Visit FedSafeRetirement.com | Schedule Your Free Review',
    platforms: ['facebook', 'instagram', 'tiktok', 'youtube_shorts', 'linkedin'],
  }),
]

// ============================================================
// DEFAULT export: Library V2 first (priority), then experimental
// The grid uses video_source filter pills to separate them
// ============================================================
export const DEFAULT_PREGENERATED_VIDEOS: VideoRecord[] = [
  ...LIBRARY_V2_VIDEOS,
  ...EXPERIMENTAL_VIDEOS,
]
