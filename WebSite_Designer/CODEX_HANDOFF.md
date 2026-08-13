# FedSafe Retirement — Artwork Review Site Codex Handoff

## Goal
Build a polished, client-facing artwork and music review microsite for FedSafe Retirement. The client should be able to browse numbered concepts, filter by section/tags, open details, copy prompts, and select favorites.

The microsite is intended to help the FedSafe client choose preferred AI-generated website images, short-video concepts, and Suno instrumental tracks.

## Recommended Stack
- Next.js
- React
- Tailwind CSS
- Static local data from `src/data/artworks.ts`
- LocalStorage for favorites/selections
- No backend required for MVP

## Client Selection Convention
The client should be able to respond with IDs such as:

```text
FS-001
FS-005
FS-017
MU-001
MU-006
```

## Required UX
1. Homepage overview explaining how to choose concepts.
2. Sectioned card gallery.
3. Search by ID, title, or keyword.
4. Filters for media type, section, appeal, audience/relatability, scenario, and diversity.
5. Select/favorite toggle persisted in localStorage.
6. Selected items panel with:
   - copy selected IDs
   - export JSON
   - export CSV
7. Detail modal showing:
   - large preview image when available
   - prompt text
   - use case
   - appeal tags
   - relatability tags
   - scenario tags
   - diversity tags
   - why people relate
   - copy prompt button
8. Prompt text should be collapsible on cards.

## Visual Design Direction
Use a premium financial-services presentation style: white/light background, navy/blue accents, warm gold accent option, clean typography, tasteful cards, rounded corners, subtle shadows, generous spacing, and strong section headers.

## Data Model
Use the included `src/data/artworks.ts` file.

```ts
export type ArtworkItem = {
  id: string;
  mediaType: "image" | "music";
  title: string;
  section: string;
  useCase: string;
  aspectRatio?: string | null;
  trackType?: string | null;
  appealTags: string[];
  relatabilityTags: string[];
  scenarioTags: string[];
  diversityTags: string[];
  whyPeopleRelate: string;
  prompt: string;
  thumbnail?: string;
};
```

## Asset Folder Convention
Drop generated images into:

```text
public/artworks/generated/
```

The data file already includes thumbnail paths for the six generated examples included in this package.

## Build Notes
- Use placeholder cards for artwork concepts that do not yet have generated image files.
- Display music concepts as cards without image thumbnails unless audio files are later added.
- Add a clear badge for media type: `Image` or `Suno Music`.
- Add a clear badge for section, such as `Hero`, `Federal Roles`, `Service & Honor`, etc.
- A good client-friendly button label is `Select for Review`, not just `Favorite`.

## Optional Enhancements
- Approved / Maybe / Not Now status buttons.
- Printable summary page.
- Dark/light mode toggle.
- Toast confirmation when a prompt or selected list is copied.
- Image upload/drop area for new generated versions.
- Simple compare mode for selected FS IDs.

## Prompt Data
The complete artwork and music prompt catalog is provided below and also in `src/data/artworks.ts` and `data/artworks.json`.


# Hero Images

## FS-001 — Homepage Hero Couple Reviewing Retirement Plans
**Media Type:** image  
**Use Case:** Main homepage hero  
**Aspect Ratio:** 16:9  
**Included Thumbnail:** `/artworks/generated/FS-001_homepage_hero_couple.png`  
**Appeal Tags:** Trustworthy, Reassuring, Hopeful, Warm, Clear, Professional  
**Relatability Tags:** Couples, Spouses, Federal Employees, Near-Retirees, Families  
**Scenario Tags:** Planning at Home, Reviewing Paperwork, Retirement Benefits, Family Legacy  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** Many near-retirees make these decisions together at home, sitting at a kitchen or dining table. This image makes retirement planning feel personal, manageable, and family-centered.

**Prompt:**

```text
Create a premium photorealistic hero image for a federal retirement planning website. Show a near-retirement couple, late 50s to early 60s, sitting at a kitchen or dining table reviewing retirement paperwork and a laptop together. They should look thoughtful, focused, and reassured, not stressed. The scene should feel warm, bright, and hopeful, with natural light coming through a window. Include tasteful papers, a notebook, a laptop, and coffee mugs, but no readable private data.

Cast authentically diverse federal employees and retirees, including White, Black, Latino, Asian, and multiracial individuals. Representation should feel natural and professional. Create a composition suitable for a homepage hero banner, with some clean negative space for website text. Premium website style, realistic, polished, trustworthy, and emotionally grounded.
```

## FS-002 — Service to Retirement Hero
**Media Type:** image  
**Use Case:** Alternate homepage hero  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Service, Dignified, Reflective, Hopeful, Confident  
**Relatability Tags:** Public Servants, Federal Employees, Near-Retirees, Civilian Professionals  
**Scenario Tags:** Transition into Retirement, Reviewing Paperwork, Service and Honor  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** Federal workers identify with moving from long-term service into the next chapter. It connects the benefits conversation to identity and earned service.

**Prompt:**

```text
Create a top-of-class photorealistic website hero image for a federal retirement planning company. Show a near-retirement federal employee in their late 50s transitioning from public service into retirement planning. The person is seated at home reviewing retirement documents with a laptop, looking calm, reflective, and prepared. The mood should communicate: “You served the country. Now protect the retirement you earned.”

The subject may be shown in tasteful professional attire or with subtle federal-service cues. Use soft natural lighting, warm tones, and an elegant, clean composition with room for website headline text. The casting should reflect the diversity of the U.S. federal workforce, including White, Black, Latino, Asian, and multiracial individuals. Avoid official logos and avoid visible confidential text.
```


# Federal Roles

## FS-003 — Air Force Officer and Spouse Reviewing Retirement Paperwork
**Media Type:** image  
**Use Case:** Military / federal role section  
**Aspect Ratio:** 16:9  
**Included Thumbnail:** `/artworks/generated/FS-003_air_force_officer_spouse.png`  
**Appeal Tags:** Military, Honor, Family-Oriented, Confident, Prepared  
**Relatability Tags:** Military Retirees, Spouses, Couples, Federal Employees  
**Scenario Tags:** Planning at Home, Reviewing Paperwork, Transition into Retirement, Service and Honor  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** Military families often make retirement decisions together. The uniform and spouse involvement make the planning process feel dignified and realistic.

**Prompt:**

```text
Create a premium photorealistic image for a federal retirement planning website. Show a near-retirement Air Force officer in dress uniform, late 50s to early 60s, seated at a dining table with their spouse reviewing retirement paperwork and a laptop. The officer should have tasteful medals and rank details that feel realistic, but do not emphasize exact official insignia. The spouse is engaged and supportive. The mood should be calm, prepared, and confident.

Use warm natural light, a polished home setting, and a professional composition suitable for a premium financial website. Create a believable, elegant, and emotionally grounded image. Cast authentically diverse subjects, including White, Black, Latino, Asian, and multiracial individuals. Avoid readable document text and avoid cheesy stock-photo expressions.
```

## FS-004 — Army Colonel Planning Retirement at Home
**Media Type:** image  
**Use Case:** Military retirement section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Leadership, Dignified, Retirement Readiness, Family-Oriented  
**Relatability Tags:** Military Retirees, Spouses, Senior Officers, Near-Retirees  
**Scenario Tags:** Planning at Home, Reviewing Paperwork, Transition into Retirement, Service and Honor  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** Senior officers and long-term service members want to see themselves represented with dignity, accomplishment, and family partnership.

**Prompt:**

```text
Create a high-end photorealistic website image showing a near-retirement Army colonel and spouse reviewing retirement planning documents at home. The colonel is late 50s to early 60s, dignified and accomplished, wearing a formal military uniform with tasteful ribbons and medals. Both individuals look thoughtful, informed, and calm. A laptop and organized paperwork sit on the table, with no readable personal data.

The setting should be warm, clean, and upscale, with soft natural light and an emotionally reassuring tone. The image should feel like a premium editorial lifestyle photo, not a generic stock image. Use authentic diversity across White, Black, Latino, Asian, and multiracial casting.
```

## FS-005 — Postal-Style Federal Worker Reviewing Retirement Paperwork
**Media Type:** image  
**Use Case:** Replace weak USPS-style image  
**Aspect Ratio:** 16:9  
**Included Thumbnail:** `/artworks/generated/FS-005_postal_style_worker.png`  
**Appeal Tags:** Hardworking, Familiar, Public Service, Reflective, Dignified  
**Relatability Tags:** USPS-Style Workers, Federal Employees, Public Servants, Near-Retirees  
**Scenario Tags:** Service and Honor, Transition into Retirement, Reviewing Paperwork  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** USPS-style workers are highly recognizable to the federal audience. The end-of-route setting communicates decades of everyday service and earned retirement.

**Prompt:**

```text
Create a photorealistic, premium-quality website image of a near-retirement postal-style federal worker, late 50s to early 60s, seated beside or inside a generic white mail delivery vehicle at the end of the workday, reviewing paperwork on a clipboard or tablet. Use postal-style cues, but do not show official USPS logos or branding. The person should look calm, reflective, and experienced, as if planning the next chapter of life.

Use warm late-afternoon light, realistic vehicle details, and a visually appealing composition suitable for a website. The image should feel cinematic, honest, and emotionally strong. Cast diverse versions including White, Black, Latino, Asian, and multiracial subjects.
```

## FS-006 — Federal Judge Reviewing Retirement Documents
**Media Type:** image  
**Use Case:** Credibility / federal professions section  
**Aspect Ratio:** 16:9  
**Included Thumbnail:** `/artworks/generated/FS-006_federal_judge.png`  
**Appeal Tags:** Authority, Wisdom, Professional, Clear, Dignified  
**Relatability Tags:** Federal Judges, Civilian Professionals, Public Servants, Near-Retirees  
**Scenario Tags:** Reviewing Paperwork, Federal Training, Transition into Retirement  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It broadens the federal audience beyond military and postal workers, showing that FedSafe understands senior professional public servants too.

**Prompt:**

```text
Create a premium photorealistic image of a federal judge in their late 50s or early 60s seated in chambers or a law-office-style setting, reviewing retirement planning paperwork at a polished desk. The judge should look thoughtful, intelligent, and calm. Include subtle visual cues such as law books, a robe hanging in the background, elegant wood furnishings, and soft daylight through blinds. The composition should leave some negative space for website text.

The tone should be dignified, professional, and reassuring. Cast may be White, Black, Latino, Asian, or multiracial. Avoid visible court seals, avoid readable documents, and avoid exaggerated drama. Premium website style, realistic and refined.
```

## FS-007 — Federal Civilian Professional at Home Office
**Media Type:** image  
**Use Case:** General federal employee section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Professional, Calm, Relatable, Modern, Clear  
**Relatability Tags:** Civilian Professionals, Federal Employees, Agency Workforce, Near-Retirees  
**Scenario Tags:** Reviewing Paperwork, Planning at Home, Retirement Benefits  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** This fits the broadest audience: analysts, office staff, administrators, agency managers, and professionals who may not wear uniforms.

**Prompt:**

```text
Create a premium photorealistic image showing a near-retirement federal professional, late 50s to early 60s, seated at a desk or home office reviewing federal retirement planning paperwork and a laptop. The individual should look composed, thoughtful, and focused. The scene should include a clean desk, organized documents, natural window light, and a calm, modern environment.

The tone should communicate clarity, preparedness, and professional guidance. Use realistic casting that reflects the diversity of the U.S. federal workforce, including White, Black, Latino, Asian, and multiracial individuals. Avoid fear, panic, exaggerated stress, or overly staged stock-photo posing.
```


# Planning / Guidance

## FS-008 — Couple Reviewing Benefits and Elections
**Media Type:** image  
**Use Case:** Benefits / elections section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Decision-Making, Couple, Clarity, Benefits, Reassuring  
**Relatability Tags:** Couples, Spouses, Federal Employees, Near-Retirees  
**Scenario Tags:** Retirement Benefits, Reviewing Paperwork, Planning at Home  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** This is one of the most universal moments in retirement planning: comparing options, dates, forms, and tradeoffs with a spouse or partner.

**Prompt:**

```text
Create a premium photorealistic image of a near-retirement couple reviewing federal benefits paperwork and a laptop at home. The couple is late 50s to early 60s and appears focused, attentive, and reassured. The setting should be a bright kitchen or dining area with clean natural light, tasteful documents, and a calm professional atmosphere.

This image should communicate decision-making, benefit elections, retirement timing, and thoughtful preparation. Use authentic diversity across White, Black, Latino, Asian, and multiracial couples. Avoid readable document text and avoid overly dramatic expressions.
```

## FS-009 — Trusted Advisor Consultation
**Media Type:** image  
**Use Case:** Consultation section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Trustworthy, Guidance, Educational, Supportive, Professional  
**Relatability Tags:** Federal Employees, Couples, Spouses, Near-Retirees  
**Scenario Tags:** Consultation, Retirement Benefits, Reviewing Paperwork  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It shows FedSafe as an expert guide, not just a website. Clients can imagine asking questions and receiving clear help.

**Prompt:**

```text
Create a high-end photorealistic consultation scene for a federal retirement planning website. Show a trusted retirement consultant meeting with a near-retirement federal employee or couple in a modern office or home-office setting. The consultant is professional, warm, and attentive. The clients are engaged, asking questions, and looking reassured. Use tasteful paperwork, a laptop or tablet, and a clean, upscale environment.

The image should feel trustworthy, educational, and emotionally supportive. Show authentic diversity across White, Black, Latino, Asian, and multiracial individuals. No readable private data, no exaggerated sales vibe, and no awkward stock-photo posing.
```

## FS-010 — Clarity Before Retirement
**Media Type:** image  
**Use Case:** Clarity / planning philosophy section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Reflective, Understanding, Control, Confidence, Calm  
**Relatability Tags:** Federal Employees, Near-Retirees, Civilian Professionals  
**Scenario Tags:** Retirement Benefits, Reviewing Paperwork, Transition into Retirement  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** Many people experience a quiet moment before making big decisions. This makes FedSafe feel like the path from uncertainty to control.

**Prompt:**

```text
Create a premium photorealistic image showing a near-retirement federal employee pausing to thoughtfully review retirement options. The person should look reflective, intelligent, and calm, seated with paperwork and a laptop in a softly lit home or office setting. The tone should suggest clarity, preparation, and confidence rather than confusion.

Use warm, natural light and a refined composition suitable for a premium retirement planning website. Cast versions across White, Black, Latino, Asian, and multiracial individuals. Avoid making the person look too old, frail, or distressed.
```


# Concern to Clarity

## FS-011 — Concerned Individual Reviewing Paperwork
**Media Type:** image  
**Use Case:** Problem-awareness section  
**Aspect Ratio:** 16:9  
**Included Thumbnail:** `/artworks/generated/FS-011_concerned_individual.png`  
**Appeal Tags:** Concern, Realistic, Solvable Problem, Emotional Truth, Supportive  
**Relatability Tags:** Federal Employees, Near-Retirees, Civilian Professionals  
**Scenario Tags:** Concern to Clarity, Reviewing Paperwork, Retirement Benefits  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** This is the emotional starting point for many clients: not panic, but a realistic sense that benefits decisions are complicated and consequences matter.

**Prompt:**

```text
Create a photorealistic, premium-quality image of a near-retirement federal employee reviewing bills, retirement paperwork, or benefit documents at a desk or kitchen table. The person should look concerned and thoughtful, but not panicked or overwhelmed. Show a realistic expression of mild stress or uncertainty, with a hand near the temple or forehead, while looking at paperwork and a laptop.

The environment should be clean, modern, and believable, with natural indoor lighting and a calm, supportive mood. This is for a federal retirement planning website, so the image should communicate concern that can be solved with expert guidance. Use diverse casting including White, Black, Latino, Asian, and multiracial individuals. No readable personal data, no melodrama, and no exaggerated despair.
```

## FS-012 — Concerned Couple Solving It Together
**Media Type:** image  
**Use Case:** Emotional transition section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Partnership, Realism, Support, Problem-Solving, Reassuring  
**Relatability Tags:** Couples, Spouses, Federal Employees, Near-Retirees  
**Scenario Tags:** Concern to Clarity, Planning at Home, Reviewing Paperwork  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** Couples often face retirement uncertainty together. The image emphasizes teamwork rather than fear.

**Prompt:**

```text
Create a premium photorealistic image of a near-retirement couple seated at a dining table with a laptop, calculator, and paperwork. They are reviewing financial or retirement-related documents and look mildly concerned, serious, and focused, but still calm and realistic. Their body language should show partnership and problem-solving rather than panic.

The style should be warm, realistic, and emotionally grounded, appropriate for a high-end retirement planning website. Use natural diversity across White, Black, Latino, Asian, and multiracial couples. Avoid overly dramatic gestures and avoid making the scene look like generic stock photography.
```


# Family / Legacy

## FS-013 — Grandparent and Grandchild
**Media Type:** image  
**Use Case:** Legacy / family section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Legacy, Family-Oriented, Love, Peace of Mind, Warm  
**Relatability Tags:** Grandparents, Families, Federal Employees, Near-Retirees  
**Scenario Tags:** Family Legacy, Life After Retirement  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It connects retirement planning to what matters emotionally: family, legacy, time, and security for the people they love.

**Prompt:**

```text
Create a premium photorealistic image for a federal retirement planning website showing a near-retirement grandparent in their late 50s or early 60s spending quality time with a grandchild. The scene should feel warm, loving, and natural — such as reading together on a couch, walking outdoors, or sharing a quiet moment at home. The expression should communicate peace of mind, family legacy, and the purpose behind retirement planning.

Use soft natural light, tasteful home decor, and a polished editorial style. Cast diverse subjects including White, Black, Latino, Asian, and multiracial families. Avoid making the grandparent appear too elderly. The image should feel genuine, not overly posed.
```

## FS-014 — Couple Enjoying the Next Chapter
**Media Type:** image  
**Use Case:** Post-planning / outcomes section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Hopeful, Confident, Calm, Togetherness, Aspirational  
**Relatability Tags:** Couples, Spouses, Families, Near-Retirees  
**Scenario Tags:** Life After Retirement, Family Legacy, Transition into Retirement  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It shows the desired emotional outcome after planning is done well: calm, confidence, and the ability to enjoy the next chapter.

**Prompt:**

```text
Create a premium photorealistic image of a near-retirement couple in their late 50s to early 60s enjoying a peaceful, hopeful moment together at home or outdoors. They may be smiling at each other near a laptop after reviewing retirement plans, or simply enjoying a calm conversation that suggests confidence about the future. The mood should be warm, reassuring, and aspirational.

This image is for a premium federal retirement planning website and should communicate peace of mind, partnership, and the rewards of good planning. Show authentic diversity across White, Black, Latino, Asian, and multiracial couples. Keep the look elegant, natural, and emotionally believable.
```


# Workshops / Training

## FS-015 — Federal Retirement Workshop
**Media Type:** image  
**Use Case:** Seminar / training section  
**Aspect Ratio:** 16:9  
**Included Thumbnail:** `/artworks/generated/FS-015_federal_workshop.png`  
**Appeal Tags:** Educational, Community, Trustworthy, Expertise, Empowering  
**Relatability Tags:** Seminar Attendees, Agency Workforce, Federal Employees, Military Retirees, USPS-Style Workers  
**Scenario Tags:** Workshop, Federal Training, Retirement Benefits  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It reflects a core FedSafe service: educating federal employees before irreversible decisions are made.

**Prompt:**

```text
Create a premium photorealistic image of a federal retirement planning workshop or seminar in a bright, modern training room. A confident presenter stands at the front speaking to a diverse audience of federal employees approaching retirement. The audience should include a natural mix of White, Black, Latino, Asian, and multiracial attendees, with both men and women represented. Include varied federal-role cues such as military, postal-style, healthcare, office, and professional civilian workers.

The room should feel clean, modern, and educational, with a presentation screen showing blurred charts or simple visual shapes but no readable text. The mood should be informative, engaging, and trustworthy. Suitable for a premium website promoting educational seminars and retirement workshops.
```

## FS-016 — Lunch-and-Learn / Agency Training
**Media Type:** image  
**Use Case:** Agency training section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Learning, Supportive, Guidance, Workforce Education, Approachable  
**Relatability Tags:** Agency Workforce, Seminar Attendees, Federal Employees, Public Servants  
**Scenario Tags:** Workshop, Federal Training, Retirement Benefits  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It signals that FedSafe serves both individuals and agencies, including HR-style training and workforce education.

**Prompt:**

```text
Create a premium photorealistic image of a federal retirement lunch-and-learn or employee benefits training session. Show a professional presenter speaking to a small group of attentive federal employees in a conference room. The attendees should reflect the diversity of the U.S. federal workforce, including White, Black, Latino, Asian, and multiracial individuals. Some may be in business attire, some in professional uniforms, and some in casual federal workplace attire.

Use clean lighting, polished composition, and realistic body language. The overall mood should be educational, professional, and approachable. Avoid any visible government seals or readable text on the presentation screen.
```


# Service & Honor

## FS-017 — Saluting the Flag
**Media Type:** image  
**Use Case:** Patriotic / service-to-retirement section  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Patriotic, Service, Honor, Pride, Dignified, Inspirational  
**Relatability Tags:** Public Servants, Military Retirees, Federal Employees, Near-Retirees  
**Scenario Tags:** Service and Honor, Patriotic Imagery, Transition into Retirement  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It creates emotional connection with federal and military audiences while keeping the message respectful and nonpolitical.

**Prompt:**

```text
Create a premium photorealistic patriotic image for a federal retirement planning website. Show a near-retirement federal employee or military service member, late 50s to early 60s, standing outdoors at sunrise or sunset and saluting the American flag. The tone should be respectful, calm, and honorable — not political. The subject should look dignified, reflective, and strong, symbolizing years of public service and the transition into retirement.

Use warm golden light, subtle wind movement in clothing and flag, and a cinematic composition suitable for a website hero section. Create diverse versions featuring White, Black, Latino, Asian, and multiracial subjects. Avoid official logos and avoid overly dramatic patriotic clichés.
```

## FS-018 — Watching a Military Ship Sail Off
**Media Type:** image  
**Use Case:** Emotional transition / hero alternative  
**Aspect Ratio:** 16:9  
**Appeal Tags:** Reflective, Service, Transition, Next Chapter, Hopeful  
**Relatability Tags:** Military Retirees, Public Servants, Federal Employees, Near-Retirees  
**Scenario Tags:** Service and Honor, Patriotic Imagery, Transition into Retirement  
**Diversity Tags:** White, Black, Latino, Asian, Multiracial, Mixed Group  
**Why People Relate:** It symbolizes the close of a service chapter and the beginning of retirement in a cinematic, memorable way.

**Prompt:**

```text
Create a premium photorealistic image showing a near-retirement service member or federal employee standing on a pier or waterfront, watching and gently waving as a military-style ship sails into the distance. The person should appear reflective, proud, and hopeful. The scene should symbolize transition, service, and the next chapter of life.

Use cinematic golden-hour lighting, realistic water and sky, and a polished composition with emotional depth. Create diverse versions across White, Black, Latino, Asian, and multiracial subjects. Avoid exact official insignia, readable ship numbers, or overt war imagery. The tone should be elegant, patriotic, and reflective.
```


# Suno Music Concepts

## MU-001 — Federal Service to Retirement Theme
**Media Type:** music  
**Use Case:** Main brand / hero background music  
**Track Type:** Instrumental cinematic brand bed  
**Appeal Tags:** Service, Pride, Dignified, Transition, Confident  
**Relatability Tags:** Public Servants, Federal Employees, Military Retirees, USPS-Style Workers  
**Scenario Tags:** Service and Honor, Transition into Retirement, Patriotic Imagery  
**Why People Relate:** This is the primary sound of the brand: honorable, warm, and confident without sounding political or militaristic.

**Prompt:**

```text
Instrumental only. Cinematic inspirational background music about a long career of public service transitioning into a secure retirement. Warm piano foundation, soft orchestral strings, restrained French horn, subtle patriotic undertone, gentle percussion, elegant emotional build. Proud but humble. Honorable but not political. Suitable for federal employees, military retirees, postal workers, judges, healthcare workers, and public servants. No vocals, no lyrics, no marching band, no battle music, no political campaign sound.
```

## MU-002 — From Concern to Clarity
**Media Type:** music  
**Use Case:** Problem-to-solution videos  
**Track Type:** Instrumental emotional transition bed  
**Appeal Tags:** Uncertainty, Resolution, Reassuring, Clear, Hopeful  
**Relatability Tags:** Federal Employees, Near-Retirees, Couples, Spouses  
**Scenario Tags:** Concern to Clarity, Reviewing Paperwork, Retirement Benefits  
**Why People Relate:** It supports scenes where retirement confusion becomes confidence after guidance.

**Prompt:**

```text
Instrumental only. Soft cinematic background music that starts with gentle thoughtful piano and subtle ambient tension, then gradually resolves into a warm, hopeful, reassuring theme. Mood: uncertainty becoming clarity, retirement stress becoming confidence. Use soft strings, light piano, subtle pads, and minimal percussion. Suitable for videos of federal employees reviewing complex retirement paperwork and then feeling reassured. No vocals, no lyrics, no heavy drama.
```

## MU-003 — Saluting the Flag
**Media Type:** music  
**Use Case:** Patriotic service clip  
**Track Type:** Instrumental restrained patriotic cue  
**Appeal Tags:** Honor, Pride, Gratitude, Patriotic, Dignified  
**Relatability Tags:** Public Servants, Military Retirees, Federal Employees  
**Scenario Tags:** Service and Honor, Patriotic Imagery  
**Why People Relate:** It matches flag and service visuals with restraint, avoiding campaign-style music.

**Prompt:**

```text
Instrumental only, cinematic patriotic background music, respectful and restrained. Soft piano, warm strings, gentle brass swells, subtle snare texture very low in the mix, slow emotional build. Mood: honor, service, gratitude, pride, and a well-earned next chapter. Designed for a short video of a near-retirement federal employee saluting the American flag at sunrise. No vocals, no lyrics, no aggressive military march, no political campaign sound.
```

## MU-004 — Military Ship Sailing Away
**Media Type:** music  
**Use Case:** Transition / reflective service clip  
**Track Type:** Instrumental cinematic reflective cue  
**Appeal Tags:** Reflective, Legacy, Transition, Peaceful, Optimistic  
**Relatability Tags:** Military Retirees, Public Servants, Near-Retirees  
**Scenario Tags:** Service and Honor, Transition into Retirement  
**Why People Relate:** It feels like closing one honorable chapter and beginning the next, without sadness-heavy music.

**Prompt:**

```text
Instrumental only. Cinematic reflective music for a service member watching a military ship sail into the distance. Warm piano, soft cello, gentle orchestral strings, subtle oceanic ambient texture, slow hopeful progression. Mood: reflective, proud, peaceful, and optimistic. Feels like closing one honorable chapter and beginning the next. No vocals, no lyrics, no battle music, no sadness-heavy funeral tone.
```

## MU-005 — Federal Benefits Workshop
**Media Type:** music  
**Use Case:** Seminar / workshop promo  
**Track Type:** Instrumental corporate education bed  
**Appeal Tags:** Learning, Trustworthy, Professional, Confident, Empowering  
**Relatability Tags:** Seminar Attendees, Agency Workforce, Federal Employees  
**Scenario Tags:** Workshop, Federal Training, Retirement Benefits  
**Why People Relate:** It gives seminar videos an organized, intelligent tone without sounding like a generic corporate jingle.

**Prompt:**

```text
Instrumental only. Professional educational background music for a federal retirement benefits workshop. Clean modern corporate style with warm piano, light marimba or muted plucks, subtle strings, soft percussion, and optimistic pacing. Mood: clear, organized, trustworthy, engaging, and empowering. Suitable for seminar, webinar, lunch-and-learn, or agency training videos. No vocals, no lyrics, no cheesy corporate jingle.
```

## MU-006 — Family Legacy Theme
**Media Type:** music  
**Use Case:** Family / grandkids / life after retirement  
**Track Type:** Instrumental warm family bed  
**Appeal Tags:** Love, Legacy, Security, Warm, Peace of Mind  
**Relatability Tags:** Grandparents, Families, Couples, Spouses  
**Scenario Tags:** Family Legacy, Life After Retirement  
**Why People Relate:** It supports the emotional reason people plan: family, stability, grandkids, and peace of mind.

**Prompt:**

```text
Instrumental only. Warm cinematic family background music for a retirement planning brand. Gentle piano, soft acoustic guitar, light strings, warm pads, delicate percussion. Mood: family, legacy, security, love, peace of mind, and the reason people plan for retirement. Suitable for scenes with grandparents, spouses, grandchildren, and home life. No vocals, no lyrics, no overly sentimental sadness.
```

## MU-007 — Postal Worker Retirement
**Media Type:** music  
**Use Case:** Postal-style worker video  
**Track Type:** Instrumental documentary lifestyle bed  
**Appeal Tags:** Humble Service, Warm, Reflective, Dignified, Peaceful  
**Relatability Tags:** USPS-Style Workers, Federal Employees, Public Servants  
**Scenario Tags:** Service and Honor, Transition into Retirement  
**Why People Relate:** It supports the hardworking, everyday public servant story with warmth and dignity.

**Prompt:**

```text
Instrumental only. Warm documentary-style background music for a postal employee nearing retirement after years of service. Gentle acoustic guitar, soft piano, light strings, relaxed tempo, subtle hopeful rhythm. Mood: hardworking, humble, reflective, proud, and peaceful. Suitable for a scene at the end of a delivery route. No vocals, no lyrics, no overly sentimental sadness.
```

## MU-008 — Federal Judge / Professional Retirement
**Media Type:** music  
**Use Case:** Judge / senior professional clip  
**Track Type:** Instrumental refined professional cue  
**Appeal Tags:** Authority, Wisdom, Calm, Professional, Dignified  
**Relatability Tags:** Federal Judges, Civilian Professionals, Public Servants  
**Scenario Tags:** Reviewing Paperwork, Transition into Retirement  
**Why People Relate:** It communicates authority, mature judgment, and credible decision-making.

**Prompt:**

```text
Instrumental only. Elegant professional cinematic background music for a federal judge or senior public servant reviewing retirement documents. Warm piano, low strings, subtle chamber music influence, refined and calm. Mood: wisdom, authority, reflection, confidence, and clarity. Premium, dignified, and understated. No vocals, no lyrics, no courtroom drama intensity.
```

