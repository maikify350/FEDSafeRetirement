/**
 * Default Video Production Rules and Brand Bible guidelines
 * Source: Mike Zaino — FedSafe Social Media Script Library V2 & Rollout Plan
 */

export interface BrandGuidelineItem {
  key: string
  label: string
  sort_order: number
  value_text: string
  mod_dt?: string
}

export const DEFAULT_BRAND_GUIDELINES: BrandGuidelineItem[] = [
  {
    key: 'production_rules',
    label: 'Production Rules',
    sort_order: 1,
    value_text: `1. Use a plain-English educator voice. The goal is to make federal employees feel smarter and more prepared, not pressured.
2. Use contractions in voiceover. These are spoken scripts, not articles.
3. Bolded words in the voiceover mark emphasis for the reader. They are not on-screen bolding instructions unless the editor chooses to mirror them.
4. Do not read the registered-federal-contractor line every time. Use it primarily as end-screen credibility text.
5. Mention FedSafe as a helpful education resource, not as the hero of the video. The employee problem should come first.
6. Use "retiree" first. Teach "annuitant" only when useful: "retiree status, what the federal system calls annuitant status."
7. Avoid suits and corporate-looking stock footage. Use casual, credible, age-appropriate federal/postal employee visuals.
8. Do not use USPS, OPM, TSP, Medicare, Social Security, or agency logos in a way that implies endorsement or affiliation.
9. Core Positioning: Federal retirement is not one decision. It is a series of connected, time-sensitive decisions. Scripts are designed to create engagement, build following, drive website traffic, capture leads, and book one-on-one retirement reviews without sounding salesy.`,
  },
  {
    key: 'cta_system',
    label: 'CTA System',
    sort_order: 2,
    value_text: `DIRECT REVIEW CTA
Use when: The script identifies a planning gap or decision risk.
Examples: "Request a retirement readiness review"; "Schedule a TSP distribution review."

LEAD MAGNET CTA
Use when: The topic is checklist-oriented or early-stage.
Examples: "Download the federal retirement checklist"; "Get the ORA readiness checklist."

WEBSITE TRAFFIC CTA
Use when: The script is broad education or awareness.
Examples: "Visit FedSafeRetirement.com for more federal retirement education."

AGENCY CTA
Use when: The script is intended for HR, workforce, contracting, or agency leadership.
Examples: "Request a workforce retirement education briefing."`,
  },
  {
    key: 'rollout_plan',
    label: 'Social Media Rollout Plan',
    sort_order: 3,
    value_text: `RECOMMENDED CADENCE
Start with 4 short-form videos per week for the first 30 days. Move to 5 per week after the production workflow is smooth and the team can maintain quality. Quality and consistency matter more than flooding the platforms.

WEEKLY POSTING MIX
Monday: Core Trap / Know Your Numbers — High engagement; broad employee relevance.
Tuesday: ORA / Application Process — FedSafe positioning lane; publish at least once per week.
Wednesday: TSP / FEGLI / FERS / FEHB Topic — Educational depth; drives issue-specific landing pages.
Thursday: Checklist / Soft Lead Magnet — Lower-friction lead capture; good for retargeting audiences.
Friday: Agency/HR or Rule Change Rotation — Run every other week at first; more on LinkedIn.

90-DAY LAUNCH RHYTHM
Days 1–30: Publish 4 videos per week. Test hooks, watch completion rate, saves, comments, landing page clicks, and appointment conversions.
Days 31–60: Move to 5 videos per week if quality is stable. Begin retargeting video viewers and website visitors with checklist and review offers.
Days 61–90: Identify the top 10–15 scripts by engagement and conversion. Recut winners with alternate hooks, different visuals, or different CTAs.
Every week: publish at least one ORA-focused video. This is the strongest differentiation lane and should become a recognizable FedSafe topic.`,
  },
  {
    key: 'platform_guidance',
    label: 'Platform Guidance',
    sort_order: 4,
    value_text: `FACEBOOK
3–5 short-form videos per week, plus periodic still-image posts or article links. Strong platform for older federal/postal audiences and retargeting.

INSTAGRAM REELS
4–5 Reels per week once production is smooth. Use captions, bold on-screen hooks, and simple text overlays.

TIKTOK
3–5 videos per week. Keep most videos in the 25–40 second range. Prioritize the hook in the first 3–6 seconds and do not make the content feel like a polished financial commercial.

YOUTUBE SHORTS
3–5 Shorts per week. YouTube allows longer Shorts, but FedSafe should keep most videos under 45 seconds unless the topic needs more explanation.

LINKEDIN
2–3 posts per week. Use more agency/HR, workforce education, registered contractor, and ORA process content here.`,
  },
  {
    key: 'visual_rules',
    label: 'Visual Rules',
    sort_order: 5,
    value_text: `1. Use 9:16 vertical format first. Adapt to square only if needed.
2. Use large captions and high-contrast text. Many viewers watch without sound.
3. Avoid using government seals, agency logos, USPS logos, OPM marks, TSP logos, Medicare logos, or anything that implies affiliation.
4. Keep attire casual and credible: polos, button-ups without ties, sweaters, khakis, office casual. Avoid suits as the default look.
5. Show older workers and mixed-gender, mixed-race audiences. Avoid overly young stock models.
6. Use FedSafe branding lightly: end card, lower third, or CTA screen. Do not make every video look like an ad.`,
  },
  {
    key: 'forbidden_language',
    label: 'Forbidden / Use-With-Care Language',
    sort_order: 6,
    value_text: `AVOID ENTIRELY
guarantee, risk-free, no-brainer, secret, loophole, official government program, OPM-approved, USPS-approved, we work for the government, free money, beat the system, don't trust HR

USE WITH CARE
maximize, expert, advisor, mistake, loss, penalty, best, always, never

PREFERRED ALTERNATIVES
understand, verify, review, compare, coordinate, know your numbers, plain-English federal retirement education, before deadlines lock in, before decisions become difficult to change`,
  },
  {
    key: 'broll_library',
    label: 'B-Roll Asset Library',
    sort_order: 7,
    value_text: `CORE EMPLOYEE VISUALS
Employees age 50–65 reviewing benefits, documents, calendars, laptops, checklists, and family planning materials.

ORA VISUALS
Blurred online form screens, cursor hovering over submit, checklist beside laptop, document folder, timeline from review to submit.

FERS VISUALS
Pension estimate, High-3 graphic, service timeline, calculator, retirement date calendar.

TSP VISUALS
TSP account blurred, contribution-to-withdrawal transition, income buckets, tax timing, Roth/traditional split.

INSURANCE VISUALS
FEGLI forms, premium charts, health benefit brochures, Medicare materials, survivor election graphics.

AGENCY VISUALS
Casual agency classroom, HR/workforce coordinator, employees in small-group briefing, training calendar, no formal suits.

GRAPHIC TEMPLATES
Gross vs net, employee to retiree transition, review-decide-apply-retire timeline, benefits puzzle pieces, checklist overlays.`,
  },
  {
    key: 'measurement_dashboard',
    label: 'Measurement Dashboard',
    sort_order: 8,
    value_text: `3-SECOND HOLD / HOOK RETENTION
Shows whether the opening line works. Rewrite hooks below baseline.

COMPLETION RATE
Shows whether the script holds attention. Shorten or tighten scripts with weak completion.

SAVES AND SHARES
Signals practical value. Turn high-save topics into checklists, carousels, or lead magnets.

COMMENTS AND QUESTIONS
Shows topics generating real confusion. Create reply videos and FAQs from repeated questions.

LANDING PAGE CONVERSION
Measures lead capture quality. Refine CTA wording, page promise, and form friction.

APPOINTMENTS BOOKED
Measures business impact. Boost top-converting content and retarget video viewers.`,
  },
]
