 For the "WATCH: WHO WE ARE" CTA, please develop a video similar to the one you created for Instagram and use this script:

“Who We Are” Homepage Video Script
Approx. 60 seconds

[Opening Visual]
FedSafe logo. Federal and postal employees in a workshop or education setting.

On-Camera / Voiceover:
In federal retirement, a CONFIDENT answer is not the same thing as a CORRECT one.

There are a lot of people who CLAIM to understand federal benefits. Some do. Some DO NOT.

These decisions usually come in stages. Are you ELIGIBLE? When SHOULD you retire? What will your annuity LOOK like? What happens with SURVIVOR benefits, federal HEALTH benefits, the Thrift SAVINGS Plan, and the RETIREMENT APPLICATION itself?

At every step, the SOURCE of your information matters.

THAT is why FedSafe Retirement exists.

We help federal and postal employees UNDERSTAND the decisions in front of them BEFORE they make the choices they may not be able to easily undo.

Our work STARTS with education. We help employees understand the RULES, the DEADLINES, the paperwork, and the DECISION points that can affect their retirement. We show them what to VERIFY, what to DOCUMENT, and WHAT QUESTIONS to ask before they act.

FedSafe Retirement is a SAM.gov REGISTERED FEDERAL CONTRACTOR providing federal retirement education, retirement application guidance, and workforce retirement training for federal and postal employees and agencies.

We do not use CONFUSION as a sales tool.
We do not RUSH PEOPLE toward decisions.
We help federal and postal employees SLOW DOWN, understand what is IN FRONT of them, and MOVE FORWARD with better information.

[Closing Visual]
FedSafe logo with SAM.gov badge secondary.

On-screen text only:
FedSafe Retirement
Federal Retirement Education • Retirement Application Guidance • Workforce Retirement Training

FOR THE VISUAL ARC:
Start with service:
Federal building, postal route, office desk, badge, coworkers, years of routine, quiet professionalism.

Then move into transition:
The employee starts facing retirement decisions — eligibility, timing, annuity, survivor benefits, health benefits, TSP, application process.

Then show FedSafe:
Not on a stage. Not selling. More like calm, capable guides helping organize the path.

Then close with confidence:
The employee has a clearer plan, fewer unknowns, and a sense that their future is being handled with the same seriousness as their service.

This theme lets viewers feel:

Your career mattered.
This transition matters.
The details matter.
FedSafe understands all three.

---

## Refined Production Cut

### Tone
Calm authority. Serious, precise, and reassuring. The video should feel like FedSafe is taking a complicated transition and placing it into order.

### Visual Rhythm
Open with institutional trust, move into the pressure of retirement decisions, then resolve into FedSafe as the steady guide.

### On-Screen Narrative

1. **Federal retirement deserves correct answers.**
   A confident answer is not always a correct one.

2. **The source matters.**
   Eligibility. Timing. Annuity. Survivor benefits. Health benefits. TSP. Application paperwork.

3. **Every decision has a consequence.**
   Some choices can be difficult to undo.

4. **That is why FedSafe Retirement exists.**
   We help federal and postal employees understand the decisions in front of them before they act.

5. **Education comes first.**
   Rules. Deadlines. Documents. Decision points. Questions to ask. Details to verify.

6. **SAM.gov registered federal contractor.**
   Federal retirement education. Retirement application guidance. Workforce retirement training.

7. **No confusion as a sales tool.**
   No rushing people toward decisions.

8. **Slow down. Verify. Move forward.**
   Better information. Clearer next steps. A retirement transition handled with seriousness.

9. **FedSafe Retirement**
   Federal Retirement Education • Retirement Application Guidance • Workforce Retirement Training

---

## Production Notes - Current Build

### Voice Talent

Main narration uses **Drew** from ElevenLabs.

- Voice ID: `MZoSIADKupTWpjTR8Ovt`
- Use: primary "Who We Are" narration from the opening through the SAM.gov contractor section, plus the final closing line
- Output files:
  - `C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public\who-eleven-main.mp3`
  - `C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public\who-eleven-closing-male.mp3`
- Voice settings used: stability `0.55`, similarity boost `0.86`, style `0.22`

Partner introductions use **Carol** from ElevenLabs.

- Voice ID: `tnSpp4vdxKPjI9w0GnoV`
- Use: partner-intro section
- Output file: `C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public\who-eleven-partners-female.mp3`
- Voice settings used:
  - Partner intro: stability `0.56`, similarity boost `0.84`, style `0.24`

### How Audio Was Generated

The audio was generated through the ElevenLabs Text to Speech API. The API key was read from `C:\WIP\FEDSafeRetirement_App\App\.env` using the `ELEVENLABS_TTS_STT_APIKEY` environment variable. The key value is intentionally not stored in this document.

### Music Mix

The background music bed is `C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public\who-background.mp3`.

Current Remotion mix:

- Opening music volume: `0.07`
- Middle music volume: `0.06`
- Closing music volume: `0.05`
- Drew narration volume: `1.65`
- Carol partner-intro volume: `1.65`
- Drew closing volume: `1.65`

### Visual Build

The Remotion composition is:

- Source: `C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\src\WhoWeAreVideo.tsx`
- Composition ID: `WhoWeAreVideo`
- Size: `1920x1080`
- Frame rate: `30fps`
- Duration: `106 seconds`

The video uses the FedSafe logo and SAM.gov accreditation shield from the website assets. The top lockup shows the FedSafe logo with the SAM.gov badge beside it throughout the main video. The SAM.gov badge glows and subtly pulses only from `0:42` to `0:52`, then both logos continue without the pulse. Brand imprints display **FED** in red and **SAFE RETIREMENT** in blue to match the logo treatment. The partner section begins at roughly `1:14`, closing starts at roughly `1:34`, and Drew returns for the final closing line.

### Render And Website Placement

Render from:

```powershell
cd C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel
npx remotion render src/index.tsx WhoWeAreVideo out/fedsafe-who-we-are-homepage-video.mp4 --codec=h264 --pixel-format=yuv420p
```

After rendering, remux the MP4 with fast-start metadata so website visitors can scrub the native video timeline smoothly:

```powershell
cd C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel
.\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe -y -i out\fedsafe-who-we-are-homepage-video.mp4 -c copy -movflags +faststart out\fedsafe-who-we-are-homepage-video-faststart.mp4
Move-Item out\fedsafe-who-we-are-homepage-video-faststart.mp4 out\fedsafe-who-we-are-homepage-video.mp4 -Force
```

Copy the final render to the website video asset path:

```powershell
Copy-Item C:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-who-we-are-homepage-video.mp4 C:\WIP\FEDSafeRetirement\WebSite\New\assets\videos\fedsafe-who-we-are-homepage-video.mp4 -Force
```

Then rebuild the static site:

```powershell
cd C:\WIP\FEDSafeRetirement\WebSite
node vercel-build.mjs
```
