# Missing Images — Generation Queue

Six artwork cards currently show the branded placeholder because they were previously
pointing to another artwork's image (a duplicate). The prompts below — and the matching
`.PROMPT.txt` files in `public/artworks/generated/` — are ready to feed into any
AI image generator (Midjourney, Ideogram, DALL-E, Flux, etc.).

Once you generate an image:
1. Save it as the filename shown under each entry.
2. Drop the file into `public/artworks/generated/`.
3. Update the matching `thumbnail` field in `src/data/artworks.ts`.

---

## FS-009 — Remote Retirement Guidance Call
**Section:** Planning / Guidance  
**File to save:** `public/artworks/generated/FS-009_remote_guidance_call.png`  
**artworks.ts line to update:** set `"thumbnail": "/artworks/generated/FS-009_remote_guidance_call.png"`

**Prompt:**
Create a high-end photorealistic image for a federal retirement planning website showing a near-retirement federal employee, preferably a middle-aged woman, receiving remote guidance from home. She should be seated in a comfortable living room or home office chair with retirement paperwork nearby while speaking on the phone or looking at a laptop with a blurred video-call window. The scene should feel focused, reassured, and realistic, not like an in-person office consultation.

Use tasteful papers, a notebook, and a laptop or smartphone, but no readable private data. The mood should feel trustworthy, educational, and emotionally supportive. Show authentic diversity across White, Black, Latino, Asian, and multiracial individuals. Avoid any conference-table consultation vibe, avoid exaggerated stock-photo posing, and avoid making the setup look like a call center.

---

## FS-029 — Remote Retirement Guidance by Phone
**Section:** Planning / Guidance  
**File to save:** `public/artworks/generated/FS-029_remote_guidance_by_phone.png`  
**artworks.ts line to update:** set `"thumbnail": "/artworks/generated/FS-029_remote_guidance_by_phone.png"`

**Prompt:**
Create a premium photorealistic image for a federal retirement planning website showing a near-retirement federal employee, preferably a middle-aged woman, receiving guidance by phone from home. She should be seated on a sofa, armchair, or other comfortable living-room seating with retirement paperwork, a notebook, and a laptop or tablet nearby. The scene should feel focused, realistic, and reassuring, not like an office consultation.

Use warm natural light, tasteful home decor, and believable body language. The image should communicate that FedSafe helps clients remotely with important retirement choices. Avoid any in-person advisor in the frame, avoid a call-center headset look, and avoid readable personal data.

---

## FS-030 — Zoom Review With Spouse at Home
**Section:** Planning / Guidance  
**File to save:** `public/artworks/generated/FS-030_zoom_review_with_spouse.png`  
**artworks.ts line to update:** set `"thumbnail": "/artworks/generated/FS-030_zoom_review_with_spouse.png"`

**Prompt:**
Create a premium photorealistic image for a federal retirement planning website showing a near-retirement couple seated together on a sofa or in a living room during a Zoom-style retirement review. Make the woman visually prominent in the composition. Show a laptop open with a small blurred video-call window and retirement notes or folders on a coffee table nearby. The couple should look engaged, thoughtful, and supported.

The scene should feel realistic, modern, and trustworthy, with warm home lighting and relaxed but polished clothing. Avoid any in-person advisor in the room, avoid readable screen text, and avoid a stiff corporate-video-call aesthetic.

---

## FS-031 — Woman Reviewing Retirement Choices With Family
**Section:** Family / Legacy  
**File to save:** `public/artworks/generated/FS-031_woman_reviewing_with_family.png`  
**artworks.ts line to update:** set `"thumbnail": "/artworks/generated/FS-031_woman_reviewing_with_family.png"`

**Prompt:**
Create a premium photorealistic image for a federal retirement planning website showing a near-retirement woman seated with family members in a living room while reviewing retirement choices. Include a spouse and an adult daughter or adult son nearby, with papers or a folder on a coffee table rather than everyone sitting at a desk. The scene should feel thoughtful, warm, and realistic.

Use natural home lighting, believable family body language, and a composition that emphasizes shared decision-making and long-term planning. Avoid cheesy smiles, avoid readable document text, and keep the tone emotionally grounded and premium.

---

## FS-032 — Worried Woman Holding Her Head Over Retirement Choices
**Section:** Concern to Clarity  
**File to save:** `public/artworks/generated/FS-032_worried_woman_holding_head.png`  
**artworks.ts line to update:** set `"thumbnail": "/artworks/generated/FS-032_worried_woman_holding_head.png"`

**Prompt:**
Create a premium photorealistic image of a near-retirement woman at home, seated on a sofa or armchair, holding her temple or forehead while looking at retirement paperwork. The papers can be on a coffee table, ottoman, or in her hands, but avoid another desk or dining-table setup. Her expression should show realistic concern and mental strain, not panic.

Use soft natural light, a believable living-room setting, and an emotionally honest mood. This image should communicate that retirement choices feel high-stakes and complex, but still solvable with guidance. Avoid melodrama, readable personal data, and exaggerated posing.

---

## FS-033 — Couple Facing a Once-in-a-Lifetime Decision
**Section:** Concern to Clarity  
**File to save:** `public/artworks/generated/FS-033_couple_facing_big_decision.png`  
**artworks.ts line to update:** set `"thumbnail": "/artworks/generated/FS-033_couple_facing_big_decision.png"`

**Prompt:**
Create a premium photorealistic image of a near-retirement couple at home facing an important retirement decision together. Place them on a sofa or in a living room setting with benefit papers nearby. One person, preferably the woman, should look worried and may have a hand near the forehead or temple while the spouse offers quiet support. Avoid another desk-centered or one-on-one office composition.

The mood should be emotionally honest, serious, and supportive rather than hopeless. Use warm natural light, realistic clothing, and believable home details. Avoid melodrama, readable personal information, and exaggerated stock-photo expressions.

---

## How to wire in a finished image

```ts
// src/data/artworks.ts — find the matching ID and update thumbnail:
{
  "id": "FS-009",
  ...
  "thumbnail": "/artworks/generated/FS-009_remote_guidance_call.png"
}
```

Drop the image into `public/artworks/generated/` and the gallery picks it up immediately on next build/reload.
